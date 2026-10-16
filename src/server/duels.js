// src/server/duels.js — Authoritative 1v1 Knowledge Duel Engine
// Governs private 1v1 matches, independent answering, choice order shuffling per player,
// delayed answer reveals (only after both players submit or timeout), balanced scoring
// (accuracy primary, speed capped tiebreaker), respectful post-match recaps, and anti-brute force rate limiting.

import { sanitizeQuestionForClient } from '../data/questions.js';
import { PRESET_EMOTES } from './rooms.js';

export const DUEL_CONSTANTS = {
  TOTAL_ROUNDS: 5,
  ROUND_TIME_LIMIT_MS: 20 * 1000, // 20s per question
  MAX_SPEED_BONUS: 10,
  CORRECT_BASE_POINTS: 100,
  DISCONNECT_GRACE_MS: 45 * 1000,
  RATE_LIMIT_MAX_GUESSES: 5,
  RATE_LIMIT_WINDOW_MS: 5 * 60 * 1000,
  DUEL_TTL_MS: 60 * 60 * 1000, // 1 hour
};

export const DUEL_STATES = {
  LOBBY: 'LOBBY',
  IN_PROGRESS: 'IN_PROGRESS',
  ROUND_REVEAL: 'ROUND_REVEAL',
  FINISHED: 'FINISHED',
  ABANDONED: 'ABANDONED',
};

/**
 * Generates an uppercase child-friendly private duel code (e.g. "DUEL-4829").
 * @returns {string}
 */
export function generateDuelCode() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `DUEL-${num}`;
}

/**
 * Deterministically shuffles choices based on seed string (e.g. questionId + userId)
 * to prevent shoulder surfing / screen peeking in classroom 1v1 play.
 * @param {Array<{id: string, text: string}>} choices
 * @param {string} seedStr
 * @returns {Array<{id: string, text: string}>}
 */
export function shuffleChoicesForPlayer(choices, seedStr) {
  if (!Array.isArray(choices) || choices.length <= 1) return [...(choices || [])];
  const list = [...choices];

  // Simple deterministic hash
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = (hash << 5) - hash + seedStr.charCodeAt(i);
    hash |= 0;
  }

  // Fisher-Yates shuffle with seeded hash
  for (let i = list.length - 1; i > 0; i--) {
    hash = (hash * 9301 + 49297) % 233280;
    const rnd = Math.abs(hash) / 233280;
    const j = Math.floor(rnd * (i + 1));
    const temp = list[i];
    list[i] = list[j];
    list[j] = temp;
  }
  return list;
}

export class DuelMatch {
  constructor(id, code, player1Id, player1Handle) {
    this.id = id;
    this.code = code;
    this.status = DUEL_STATES.LOBBY;
    this.createdAt = Date.now();
    this.expiresAt = this.createdAt + DUEL_CONSTANTS.DUEL_TTL_MS;
    this.completedAt = null;
    this.winnerId = null;

    this.player1 = {
      userId: player1Id,
      handle: player1Handle,
      ready: true,
      score: 0,
      correctCount: 0,
      totalResponseTimeMs: 0,
      connected: true,
      disconnectedAt: null,
      ws: null,
    };

    this.player2 = null;

    this.questions = [];
    this.currentRoundIdx = 0;
    this.roundStartTime = null;
    this.roundSubmissions = new Map(); // roundIdx -> Map(userId -> { choiceId, timeMs, idempotencyKey, submittedAt })
    this.roundResults = []; // roundIdx -> { revealed: true, answerKey, explanation, p1Verdict, p2Verdict }
  }

  isExpired(now = Date.now()) {
    return now >= this.expiresAt || this.status === DUEL_STATES.ABANDONED;
  }

  addPlayer2(userId, handle, ws = null) {
    if (this.player2 && this.player2.userId !== userId) {
      return { success: false, error: 'Duel match is full (max 2 players)' };
    }
    if (this.status !== DUEL_STATES.LOBBY && (!this.player2 || this.player2.userId !== userId)) {
      return { success: false, error: 'Duel already in progress' };
    }

    if (this.player2 && this.player2.userId === userId) {
      // Reconnect player 2
      this.player2.connected = true;
      this.player2.disconnectedAt = null;
      if (ws) this.player2.ws = ws;
      return { success: true, reconnected: true, player: this.player2 };
    }

    this.player2 = {
      userId,
      handle,
      ready: false,
      score: 0,
      correctCount: 0,
      totalResponseTimeMs: 0,
      connected: true,
      disconnectedAt: null,
      ws,
    };

    return { success: true, reconnected: false, player: this.player2 };
  }

  setReady(userId, ready = true) {
    if (this.player1.userId === userId) {
      this.player1.ready = Boolean(ready);
      return true;
    }
    if (this.player2 && this.player2.userId === userId) {
      this.player2.ready = Boolean(ready);
      return true;
    }
    return false;
  }

  canStart() {
    return Boolean(
      this.player1 &&
      this.player2 &&
      this.player1.ready &&
      this.player2.ready &&
      this.status === DUEL_STATES.LOBBY
    );
  }

  startDuel(questionCatalog) {
    if (!this.canStart()) {
      return { success: false, error: 'Both players must be present and ready to start the duel' };
    }

    // Select 5 questions representing diverse KAAC subjects
    const subjects = ['math', 'science', 'social_studies', 'language_arts', 'arts_humanities'];
    const selected = [];

    for (const sub of subjects) {
      const match = questionCatalog.find((q) => q.active && q.rightsStatus === 'approved' && q.subject === sub);
      if (match) selected.push(match);
    }

    // If any subject missing, fill with other approved questions
    if (selected.length < DUEL_CONSTANTS.TOTAL_ROUNDS) {
      for (const q of questionCatalog) {
        if (selected.length >= DUEL_CONSTANTS.TOTAL_ROUNDS) break;
        if (q.active && q.rightsStatus === 'approved' && !selected.some((s) => s.id === q.id)) {
          selected.push(q);
        }
      }
    }

    this.questions = selected;
    this.currentRoundIdx = 0;
    this.status = DUEL_STATES.IN_PROGRESS;
    this.roundStartTime = Date.now();
    this.roundSubmissions.set(this.currentRoundIdx, new Map());

    return {
      success: true,
      status: this.status,
      roundIndex: this.currentRoundIdx,
      totalRounds: this.questions.length,
    };
  }

  getCurrentSecretQuestion() {
    if (this.currentRoundIdx < this.questions.length) {
      return this.questions[this.currentRoundIdx];
    }
    return null;
  }

  getSanitizedQuestionForPlayer(userId) {
    const q = this.getCurrentSecretQuestion();
    if (!q) return null;

    const sanitized = sanitizeQuestionForClient(q);
    const shuffledChoices = shuffleChoicesForPlayer(sanitized.choices, `${q.id}:${userId}`);

    return {
      ...sanitized,
      choices: shuffledChoices,
    };
  }

  submitAnswer(userId, choiceId, timeElapsedMs = null, idempotencyKey = null) {
    if (this.status !== DUEL_STATES.IN_PROGRESS) {
      return { success: false, error: 'Duel round is not currently in progress' };
    }

    const isP1 = this.player1.userId === userId;
    const isP2 = this.player2 && this.player2.userId === userId;

    if (!isP1 && !isP2) {
      return { success: false, error: 'User is not a participant in this duel match' };
    }

    const currentSubmissions = this.roundSubmissions.get(this.currentRoundIdx) || new Map();
    if (currentSubmissions.has(userId)) {
      return { success: false, error: 'Answer already submitted for this round', duplicate: true };
    }

    const now = Date.now();
    const elapsed = typeof timeElapsedMs === 'number' && timeElapsedMs >= 0
      ? Math.min(timeElapsedMs, DUEL_CONSTANTS.ROUND_TIME_LIMIT_MS)
      : Math.min(now - (this.roundStartTime || now), DUEL_CONSTANTS.ROUND_TIME_LIMIT_MS);

    const submission = {
      userId,
      choiceId,
      elapsedMs: elapsed,
      idempotencyKey: idempotencyKey || `${this.id}:${this.currentRoundIdx}:${userId}`,
      submittedAt: now,
    };

    currentSubmissions.set(userId, submission);
    this.roundSubmissions.set(this.currentRoundIdx, currentSubmissions);

    // Check if both players have submitted
    const bothSubmitted = currentSubmissions.size >= 2;

    if (bothSubmitted) {
      // Evaluate round and reveal answer to both players
      this.evaluateCurrentRound();
      return {
        success: true,
        bothSubmitted: true,
        roundComplete: true,
        roundResult: this.roundResults[this.currentRoundIdx],
      };
    }

    // Only 1 player has submitted: preserve answer secrecy! Opponent choice and answer key remain hidden.
    return {
      success: true,
      bothSubmitted: false,
      roundComplete: false,
      waitingForOpponent: true,
    };
  }

  evaluateCurrentRound() {
    const currentQ = this.getCurrentSecretQuestion();
    if (!currentQ) return;

    const currentSubmissions = this.roundSubmissions.get(this.currentRoundIdx) || new Map();
    const p1Sub = currentSubmissions.get(this.player1.userId);
    const p2Sub = this.player2 ? currentSubmissions.get(this.player2.userId) : null;

    // Accuracy is primary (100 pts), Speed is capped tiebreaker (max 10 pts)
    const calcScore = (sub) => {
      if (!sub) return { isCorrect: false, score: 0, speedBonus: 0 };
      const isCorrect = sub.choiceId === currentQ.answerKey;
      if (!isCorrect) return { isCorrect: false, score: 0, speedBonus: 0 };

      // Speed bonus only for correct answers
      const remainingTimeMs = Math.max(0, DUEL_CONSTANTS.ROUND_TIME_LIMIT_MS - sub.elapsedMs);
      const speedBonus = Math.min(
        DUEL_CONSTANTS.MAX_SPEED_BONUS,
        Math.floor((remainingTimeMs / DUEL_CONSTANTS.ROUND_TIME_LIMIT_MS) * DUEL_CONSTANTS.MAX_SPEED_BONUS)
      );

      return {
        isCorrect: true,
        score: DUEL_CONSTANTS.CORRECT_BASE_POINTS + speedBonus,
        speedBonus,
      };
    };

    const p1Result = calcScore(p1Sub);
    const p2Result = calcScore(p2Sub);

    this.player1.score += p1Result.score;
    if (p1Result.isCorrect) this.player1.correctCount++;
    if (p1Sub) this.player1.totalResponseTimeMs += p1Sub.elapsedMs;

    if (this.player2) {
      this.player2.score += p2Result.score;
      if (p2Result.isCorrect) this.player2.correctCount++;
      if (p2Sub) this.player2.totalResponseTimeMs += p2Sub.elapsedMs;
    }

    const roundResult = {
      roundIndex: this.currentRoundIdx,
      questionId: currentQ.id,
      prompt: currentQ.prompt,
      subject: currentQ.subject,
      answerKey: currentQ.answerKey,
      explanation: currentQ.explanation,
      revealed: true,
      player1: {
        userId: this.player1.userId,
        handle: this.player1.handle,
        choiceId: p1Sub ? p1Sub.choiceId : null,
        isCorrect: p1Result.isCorrect,
        scoreEarned: p1Result.score,
        speedBonus: p1Result.speedBonus,
        elapsedMs: p1Sub ? p1Sub.elapsedMs : DUEL_CONSTANTS.ROUND_TIME_LIMIT_MS,
        totalScore: this.player1.score,
      },
      player2: this.player2 ? {
        userId: this.player2.userId,
        handle: this.player2.handle,
        choiceId: p2Sub ? p2Sub.choiceId : null,
        isCorrect: p2Result.isCorrect,
        scoreEarned: p2Result.score,
        speedBonus: p2Result.speedBonus,
        elapsedMs: p2Sub ? p2Sub.elapsedMs : DUEL_CONSTANTS.ROUND_TIME_LIMIT_MS,
        totalScore: this.player2.score,
      } : null,
    };

    this.roundResults.push(roundResult);
    this.status = DUEL_STATES.ROUND_REVEAL;

    // Check if match finished
    if (this.currentRoundIdx + 1 >= this.questions.length) {
      this.status = DUEL_STATES.FINISHED;
      this.completedAt = Date.now();
      if (this.player1.score > (this.player2 ? this.player2.score : 0)) {
        this.winnerId = this.player1.userId;
      } else if (this.player2 && this.player2.score > this.player1.score) {
        this.winnerId = this.player2.userId;
      } else {
        this.winnerId = 'tie';
      }
    }
  }

  nextRound() {
    if (this.status !== DUEL_STATES.ROUND_REVEAL) {
      return { success: false, error: 'Round is not in reveal state' };
    }
    if (this.currentRoundIdx + 1 >= this.questions.length) {
      this.status = DUEL_STATES.FINISHED;
      return { success: true, finished: true, recap: this.getRecap() };
    }

    this.currentRoundIdx++;
    this.status = DUEL_STATES.IN_PROGRESS;
    this.roundStartTime = Date.now();
    this.roundSubmissions.set(this.currentRoundIdx, new Map());

    return {
      success: true,
      finished: false,
      roundIndex: this.currentRoundIdx,
      status: this.status,
    };
  }

  getRecap() {
    const p1AvgTime = this.player1.correctCount > 0
      ? Math.round(this.player1.totalResponseTimeMs / this.questions.length)
      : Math.round(this.player1.totalResponseTimeMs / (this.questions.length || 1));

    const p2AvgTime = this.player2 && this.questions.length > 0
      ? Math.round(this.player2.totalResponseTimeMs / this.questions.length)
      : 0;

    let outcomeTitle = 'Epic Battle!';
    if (this.winnerId === 'tie') {
      outcomeTitle = 'Stalemate! Honorable Tie between Scholars!';
    } else if (this.winnerId === this.player1.userId) {
      outcomeTitle = `${this.player1.handle} Victorious!`;
    } else if (this.player2 && this.winnerId === this.player2.userId) {
      outcomeTitle = `${this.player2.handle} Victorious!`;
    }

    return {
      matchId: this.id,
      code: this.code,
      status: this.status,
      winnerId: this.winnerId,
      outcomeTitle,
      totalRounds: this.questions.length,
      player1: {
        userId: this.player1.userId,
        handle: this.player1.handle,
        finalScore: this.player1.score,
        accuracyPercentage: Math.round((this.player1.correctCount / (this.questions.length || 1)) * 100),
        correctCount: this.player1.correctCount,
        avgTimeMs: p1AvgTime,
      },
      player2: this.player2 ? {
        userId: this.player2.userId,
        handle: this.player2.handle,
        finalScore: this.player2.score,
        accuracyPercentage: Math.round((this.player2.correctCount / (this.questions.length || 1)) * 100),
        correctCount: this.player2.correctCount,
        avgTimeMs: p2AvgTime,
      } : null,
      rounds: this.roundResults,
    };
  }

  handleDisconnect(userId, now = Date.now()) {
    if (this.player1.userId === userId) {
      this.player1.connected = false;
      this.player1.disconnectedAt = now;
      this.player1.ws = null;
    } else if (this.player2 && this.player2.userId === userId) {
      this.player2.connected = false;
      this.player2.disconnectedAt = now;
      this.player2.ws = null;
    }
  }

  reconnect(userId, ws = null) {
    if (this.player1.userId === userId) {
      this.player1.connected = true;
      this.player1.disconnectedAt = null;
      if (ws) this.player1.ws = ws;
      return true;
    }
    if (this.player2 && this.player2.userId === userId) {
      this.player2.connected = true;
      this.player2.disconnectedAt = null;
      if (ws) this.player2.ws = ws;
      return true;
    }
    return false;
  }

  sendPresetEmote(userId, emoteId) {
    const isP1 = this.player1.userId === userId;
    const isP2 = this.player2 && this.player2.userId === userId;
    if (!isP1 && !isP2) return { success: false, error: 'User not in duel' };

    const emote = PRESET_EMOTES.find((e) => e.id === emoteId);
    if (!emote) return { success: false, error: 'Invalid preset emote' };

    const handle = isP1 ? this.player1.handle : this.player2.handle;

    return {
      success: true,
      broadcastData: {
        type: 'DUEL_EMOTE',
        userId,
        handle,
        emote,
        timestamp: Date.now(),
      },
    };
  }

  broadcast(message) {
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    const clients = [this.player1, this.player2].filter((p) => p && p.connected && p.ws && typeof p.ws.send === 'function');
    for (const c of clients) {
      try {
        c.ws.send(payload);
      } catch {
        // ignore closed sockets
      }
    }
  }

  broadcastSnapshot(type = 'DUEL_UPDATE') {
    if (this.player1.connected && this.player1.ws) {
      try {
        this.player1.ws.send(JSON.stringify({ type, snapshot: this.getSnapshot(this.player1.userId) }));
      } catch { /* ignore */ }
    }
    if (this.player2 && this.player2.connected && this.player2.ws) {
      try {
        this.player2.ws.send(JSON.stringify({ type, snapshot: this.getSnapshot(this.player2.userId) }));
      } catch { /* ignore */ }
    }
  }

  getSnapshot(requestingUserId = null) {
    const currentSubmissions = this.roundSubmissions.get(this.currentRoundIdx) || new Map();
    const userSubmitted = requestingUserId ? currentSubmissions.has(requestingUserId) : false;

    // Check if question should be exposed
    let question = null;
    if (this.status === DUEL_STATES.IN_PROGRESS && requestingUserId) {
      question = this.getSanitizedQuestionForPlayer(requestingUserId);
    } else if (this.status === DUEL_STATES.ROUND_REVEAL) {
      question = this.roundResults[this.currentRoundIdx];
    }

    return {
      duelId: this.id,
      code: this.code,
      status: this.status,
      currentRound: this.currentRoundIdx + 1,
      totalRounds: this.questions.length,
      winnerId: this.winnerId,
      player1: {
        userId: this.player1.userId,
        handle: this.player1.handle,
        ready: this.player1.ready,
        score: this.player1.score,
        connected: this.player1.connected,
        hasSubmittedCurrentRound: currentSubmissions.has(this.player1.userId),
      },
      player2: this.player2 ? {
        userId: this.player2.userId,
        handle: this.player2.handle,
        ready: this.player2.ready,
        score: this.player2.score,
        connected: this.player2.connected,
        hasSubmittedCurrentRound: currentSubmissions.has(this.player2.userId),
      } : null,
      question,
      userHasSubmitted: userSubmitted,
      roundResult: this.status === DUEL_STATES.ROUND_REVEAL || this.status === DUEL_STATES.FINISHED
        ? this.roundResults[this.currentRoundIdx]
        : null,
    };
  }
}

export class DuelManager {
  constructor() {
    this.duels = new Map(); // code -> DuelMatch
    this.rateLimiter = new Map(); // clientKey -> { failedCount, resetAt }
  }

  checkRateLimit(clientKey, now = Date.now()) {
    const record = this.rateLimiter.get(clientKey);
    if (!record) return { allowed: true };
    if (now > record.resetAt) {
      this.rateLimiter.delete(clientKey);
      return { allowed: true };
    }
    if (record.failedCount >= DUEL_CONSTANTS.RATE_LIMIT_MAX_GUESSES) {
      return { allowed: false, retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000) };
    }
    return { allowed: true };
  }

  recordFailedGuess(clientKey, now = Date.now()) {
    const record = this.rateLimiter.get(clientKey) || {
      failedCount: 0,
      resetAt: now + DUEL_CONSTANTS.RATE_LIMIT_WINDOW_MS,
    };
    record.failedCount++;
    this.rateLimiter.set(clientKey, record);
    return record.failedCount;
  }

  createDuel(hostId, hostHandle) {
    let code = generateDuelCode();
    let attempts = 0;
    while (this.duels.has(code) && attempts < 10) {
      code = generateDuelCode();
      attempts++;
    }

    const duelId = 'duel_' + Math.random().toString(36).substring(2, 10);
    const match = new DuelMatch(duelId, code, hostId, hostHandle);
    this.duels.set(code, match);
    return match;
  }

  getDuel(code) {
    if (!code) return null;
    const cleanCode = code.toUpperCase().trim();
    const match = this.duels.get(cleanCode);
    if (match && match.isExpired()) {
      this.duels.delete(cleanCode);
      return null;
    }
    return match;
  }

  joinDuel(code, userId, handle, clientKey = userId) {
    const rateCheck = this.checkRateLimit(clientKey);
    if (!rateCheck.allowed) {
      return { success: false, error: `Too many failed room attempts. Try again in ${rateCheck.retryAfterSeconds}s`, rateLimited: true };
    }

    const match = this.getDuel(code);
    if (!match) {
      this.recordFailedGuess(clientKey);
      return { success: false, error: 'Duel match not found or expired' };
    }

    const res = match.addPlayer2(userId, handle);
    if (!res.success) {
      return res;
    }

    return { success: true, match, snapshot: match.getSnapshot(userId) };
  }

  cleanupExpired(now = Date.now()) {
    let cleaned = 0;
    for (const [code, match] of this.duels.entries()) {
      if (match.isExpired(now)) {
        this.duels.delete(code);
        cleaned++;
      }
    }
    return cleaned;
  }
}
