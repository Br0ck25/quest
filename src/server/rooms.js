// src/server/rooms.js — Authoritative Multiplayer Co-op Room Engine
// Manages private-code rooms (2-4 players), WebSocket synchronization, authoritative combat,
// question synchronization, answer key secrecy, preset-only emotes, and anti-brute-force rate limiting.

import { sanitizeQuestionForClient } from '../data/questions.js';

export const ROOM_CONSTANTS = {
  MIN_PLAYERS: 2,
  MAX_PLAYERS: 4,
  ROOM_TTL_MS: 60 * 60 * 1000, // 1 hour expiration
  DISCONNECT_GRACE_MS: 45 * 1000, // 45 seconds to reconnect
  RATE_LIMIT_MAX_GUESSES: 5,
  RATE_LIMIT_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
};

export const PRESET_EMOTES = [
  { id: 'ready', text: 'Ready to battle!', icon: 'shield' },
  { id: 'cheer', text: 'Great job team!', icon: 'trophy' },
  { id: 'thinking', text: 'Pondering this rune...', icon: 'scroll' },
  { id: 'focus', text: 'Focus on the boss!', icon: 'sword' },
  { id: 'high_five', text: 'High five!', icon: 'cardinal' },
  { id: 'gg', text: 'Good game!', icon: 'trophy' },
];

export const ROOM_STATES = {
  LOBBY: 'LOBBY',
  ENCOUNTER: 'ENCOUNTER',
  VICTORY: 'VICTORY',
  DEFEATED: 'DEFEATED',
  EXPIRED: 'EXPIRED',
};

/**
 * Generates an uppercase child-friendly private room code (e.g. "KY-4829").
 * @returns {string}
 */
export function generateRoomCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `KY-${num}`;
}

export class CoopRoom {
  constructor(id, code, hostId, hostHandle) {
    this.id = id;
    this.code = code;
    this.hostId = hostId;
    this.status = ROOM_STATES.LOBBY;
    this.createdAt = Date.now();
    this.expiresAt = this.createdAt + ROOM_CONSTANTS.ROOM_TTL_MS;
    this.participants = new Map(); // userId -> { userId, handle, ready, score, connected, ws, disconnectedAt }
    this.processedAnswers = new Set(); // idempotency keys / `${userId}:${questionId}`
    this.questionList = [];
    this.currentQuestionIdx = 0;
    this.bossMaxHp = 100;
    this.bossHp = 100;
    this.bossName = 'Overgrown Colossus';
    this.completedAt = null;

    // Add host initially
    this.addParticipant(hostId, hostHandle);
  }

  isExpired(now = Date.now()) {
    return now >= this.expiresAt || this.status === ROOM_STATES.EXPIRED;
  }

  addParticipant(userId, handle, ws = null) {
    if (this.participants.size >= ROOM_CONSTANTS.MAX_PLAYERS && !this.participants.has(userId)) {
      return { success: false, error: 'Room is full (max 4 players)' };
    }
    if (this.status !== ROOM_STATES.LOBBY && !this.participants.has(userId)) {
      return { success: false, error: 'Encounter already in progress' };
    }

    const existing = this.participants.get(userId);
    if (existing) {
      // Reconnect
      existing.connected = true;
      existing.disconnectedAt = null;
      if (ws) existing.ws = ws;
      return { success: true, reconnected: true, player: existing };
    }

    const player = {
      userId,
      handle,
      ready: userId === this.hostId, // Host starts ready
      score: 0,
      questionsCorrect: 0,
      connected: true,
      ws,
      disconnectedAt: null,
    };

    this.participants.set(userId, player);
    return { success: true, reconnected: false, player };
  }

  setPlayerWs(userId, ws) {
    const p = this.participants.get(userId);
    if (p) {
      p.ws = ws;
      p.connected = true;
      p.disconnectedAt = null;
    }
  }

  handleDisconnect(userId, now = Date.now()) {
    const p = this.participants.get(userId);
    if (p) {
      p.connected = false;
      p.disconnectedAt = now;
      p.ws = null;
    }

    // Host migration if host disconnected
    if (userId === this.hostId) {
      const activeMember = Array.from(this.participants.values()).find((m) => m.connected && m.userId !== userId);
      if (activeMember) {
        this.hostId = activeMember.userId;
      }
    }
  }

  removeParticipant(userId) {
    this.participants.delete(userId);
    if (userId === this.hostId && this.participants.size > 0) {
      const nextHost = Array.from(this.participants.values())[0];
      this.hostId = nextHost.userId;
    }
  }

  setReady(userId, ready = true) {
    const p = this.participants.get(userId);
    if (p) {
      p.ready = Boolean(ready);
      return true;
    }
    return false;
  }

  canStart() {
    if (this.participants.size < ROOM_CONSTANTS.MIN_PLAYERS) return false;
    for (const p of this.participants.values()) {
      if (!p.ready) return false;
    }
    return true;
  }

  startEncounter(questions) {
    if (this.participants.size < ROOM_CONSTANTS.MIN_PLAYERS) {
      return { success: false, error: `Need at least ${ROOM_CONSTANTS.MIN_PLAYERS} players to start co-op` };
    }
    this.status = ROOM_STATES.ENCOUNTER;
    this.questionList = questions.slice(0, 5);
    this.currentQuestionIdx = 0;
    this.bossMaxHp = this.questionList.length * 25;
    this.bossHp = this.bossMaxHp;
    this.bossName = 'Overgrown Colossus of the Wilds';

    return {
      success: true,
      status: this.status,
      boss: { name: this.bossName, hp: this.bossHp, maxHp: this.bossMaxHp },
      question: this.getCurrentSanitizedQuestion(),
    };
  }

  getCurrentSecretQuestion() {
    if (this.currentQuestionIdx < this.questionList.length) {
      return this.questionList[this.currentQuestionIdx];
    }
    return null;
  }

  getCurrentSanitizedQuestion() {
    const q = this.getCurrentSecretQuestion();
    return q ? sanitizeQuestionForClient(q) : null;
  }

  submitAnswer(userId, choiceId, idempotencyKey = null) {
    if (this.status !== ROOM_STATES.ENCOUNTER) {
      return { success: false, error: 'Encounter is not active' };
    }

    const p = this.participants.get(userId);
    if (!p) {
      return { success: false, error: 'Participant not in room' };
    }

    const currentQ = this.getCurrentSecretQuestion();
    if (!currentQ) {
      return { success: false, error: 'No active question' };
    }

    const dedupKey = idempotencyKey || `${userId}:${currentQ.id}`;
    if (this.processedAnswers.has(dedupKey)) {
      return { success: false, error: 'Answer already recorded for this question', duplicate: true };
    }
    this.processedAnswers.add(dedupKey);

    const isCorrect = choiceId === currentQ.answerKey;
    let damageDealt = 0;

    if (isCorrect) {
      damageDealt = 25;
      this.bossHp = Math.max(0, this.bossHp - damageDealt);
      p.score += 100;
      p.questionsCorrect += 1;
    } else {
      p.score = Math.max(0, p.score - 20);
    }

    const bossDefeated = this.bossHp <= 0;
    let encounterComplete = false;

    if (bossDefeated) {
      this.status = ROOM_STATES.VICTORY;
      this.completedAt = Date.now();
      encounterComplete = true;
    } else {
      // Advance question
      this.currentQuestionIdx++;
      if (this.currentQuestionIdx >= this.questionList.length) {
        this.status = this.bossHp <= 0 ? ROOM_STATES.VICTORY : ROOM_STATES.DEFEATED;
        this.completedAt = Date.now();
        encounterComplete = true;
      }
    }

    return {
      success: true,
      isCorrect,
      explanation: currentQ.explanation,
      damageDealt,
      bossHp: this.bossHp,
      bossMaxHp: this.bossMaxHp,
      status: this.status,
      encounterComplete,
      nextQuestion: encounterComplete ? null : this.getCurrentSanitizedQuestion(),
    };
  }

  sendPresetEmote(userId, emoteId) {
    const p = this.participants.get(userId);
    if (!p) return { success: false, error: 'User not in room' };

    const emote = PRESET_EMOTES.find((e) => e.id === emoteId);
    if (!emote) return { success: false, error: 'Invalid preset emote' };

    return {
      success: true,
      broadcastData: {
        type: 'EMOTE',
        userId,
        handle: p.handle,
        emote,
        timestamp: Date.now(),
      },
    };
  }

  broadcast(message) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    for (const p of this.participants.values()) {
      if (p.connected && p.ws && typeof p.ws.send === 'function') {
        try {
          p.ws.send(payload);
        } catch {
          // ignore closed socket errors
        }
      }
    }
  }

  broadcastSnapshot(type = 'ROOM_UPDATE') {
    this.broadcast({ type, snapshot: this.getSnapshot() });
  }

  getSnapshot() {
    const players = Array.from(this.participants.values()).map((p) => ({
      userId: p.userId,
      handle: p.handle,
      ready: p.ready,
      score: p.score,
      questionsCorrect: p.questionsCorrect,
      connected: p.connected,
      isHost: p.userId === this.hostId,
    }));

    return {
      roomId: this.id,
      code: this.code,
      hostId: this.hostId,
      status: this.status,
      players,
      boss: {
        name: this.bossName,
        hp: this.bossHp,
        maxHp: this.bossMaxHp,
      },
      question: this.status === ROOM_STATES.ENCOUNTER ? this.getCurrentSanitizedQuestion() : null,
      questionIndex: this.currentQuestionIdx,
      totalQuestions: this.questionList.length,
    };
  }
}

export class RoomManager {
  constructor() {
    this.rooms = new Map(); // code -> CoopRoom
    this.rateLimiter = new Map(); // sessionKey -> { failedCount, resetAt }
  }

  checkRateLimit(clientKey, now = Date.now()) {
    const record = this.rateLimiter.get(clientKey);
    if (!record) return { allowed: true };
    if (now > record.resetAt) {
      this.rateLimiter.delete(clientKey);
      return { allowed: true };
    }
    if (record.failedCount >= ROOM_CONSTANTS.RATE_LIMIT_MAX_GUESSES) {
      return { allowed: false, retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000) };
    }
    return { allowed: true };
  }

  recordFailedGuess(clientKey, now = Date.now()) {
    const record = this.rateLimiter.get(clientKey) || {
      failedCount: 0,
      resetAt: now + ROOM_CONSTANTS.RATE_LIMIT_WINDOW_MS,
    };
    record.failedCount++;
    this.rateLimiter.set(clientKey, record);
    return record.failedCount;
  }

  createRoom(hostId, hostHandle) {
    let code = generateRoomCode();
    let attempts = 0;
    while (this.rooms.has(code) && attempts < 10) {
      code = generateRoomCode();
      attempts++;
    }

    const roomId = 'room_' + Math.random().toString(36).substring(2, 10);
    const room = new CoopRoom(roomId, code, hostId, hostHandle);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    if (!code) return null;
    const cleanCode = code.toUpperCase().trim();
    const room = this.rooms.get(cleanCode);
    if (room && room.isExpired()) {
      this.rooms.delete(cleanCode);
      return null;
    }
    return room;
  }

  joinRoom(code, userId, handle, clientKey = userId) {
    const rateCheck = this.checkRateLimit(clientKey);
    if (!rateCheck.allowed) {
      return { success: false, error: `Too many failed room attempts. Try again in ${rateCheck.retryAfterSeconds}s`, rateLimited: true };
    }

    const room = this.getRoom(code);
    if (!room) {
      this.recordFailedGuess(clientKey);
      return { success: false, error: 'Room not found or expired' };
    }

    const result = room.addParticipant(userId, handle);
    if (!result.success) {
      return result;
    }

    return { success: true, room, snapshot: room.getSnapshot() };
  }

  cleanupExpiredRooms(now = Date.now()) {
    let cleaned = 0;
    for (const [code, room] of this.rooms.entries()) {
      if (room.isExpired(now)) {
        this.rooms.delete(code);
        cleaned++;
      }
    }
    return cleaned;
  }
}
