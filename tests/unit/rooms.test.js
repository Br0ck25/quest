// tests/unit/rooms.test.js — Unit Tests for Multiplayer Co-op Room Engine
// Tests room lifecycle, 2-4 player capacity, lobby ready synchronization,
// authoritative boss combat, answer key secrecy, disconnect grace/host migration,
// child-safe preset emotes, and anti-brute-force rate limiting.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROOM_CONSTANTS,
  ROOM_STATES,
  PRESET_EMOTES,
  generateRoomCode,
  CoopRoom,
  RoomManager,
} from '../../src/server/rooms.js';
import { SYNTHETIC_QUESTIONS } from '../../src/data/questions.js';

test('generateRoomCode produces valid KY-XXXX format', () => {
  for (let i = 0; i < 20; i++) {
    const code = generateRoomCode();
    assert.match(code, /^KY-\d{4}$/, `Code ${code} should match KY-XXXX`);
  }
});

test('PRESET_EMOTES defines strictly child-safe, approved emotes', () => {
  assert.ok(Array.isArray(PRESET_EMOTES));
  assert.ok(PRESET_EMOTES.length >= 4);
  const ids = PRESET_EMOTES.map((e) => e.id);
  assert.ok(ids.includes('ready'));
  assert.ok(ids.includes('cheer'));
  assert.ok(ids.includes('gg'));

  for (const emote of PRESET_EMOTES) {
    assert.ok(typeof emote.id === 'string' && emote.id.length > 0);
    assert.ok(typeof emote.text === 'string' && emote.text.length > 0);
    assert.ok(typeof emote.icon === 'string' && emote.icon.length > 0);
  }
});

test('CoopRoom enforces 2-4 player capacity and lobby ready states', () => {
  const room = new CoopRoom('room_test_1', 'KY-1001', 'user_host', 'BluegrassLeader');

  // Initial state
  assert.equal(room.status, ROOM_STATES.LOBBY);
  assert.equal(room.participants.size, 1);
  assert.equal(room.canStart(), false, 'Cannot start with only 1 player');

  // Add 2nd player
  const p2 = room.addParticipant('user_2', 'CardinalScholar');
  assert.equal(p2.success, true);
  assert.equal(room.participants.size, 2);
  assert.equal(room.canStart(), false, 'Cannot start until 2nd player is ready');

  // Set player 2 ready
  room.setReady('user_2', true);
  assert.equal(room.canStart(), true, 'Can start when 2 players are both ready');

  // Add 3rd and 4th players
  const p3 = room.addParticipant('user_3', 'LimestoneRanger');
  const p4 = room.addParticipant('user_4', 'MammothSage');
  assert.equal(p3.success, true);
  assert.equal(p4.success, true);
  assert.equal(room.participants.size, 4);

  // Attempting to add 5th player is rejected
  const p5 = room.addParticipant('user_5', 'DerbyWizard');
  assert.equal(p5.success, false);
  assert.match(p5.error, /full/i);
});

test('CoopRoom starts encounter, synchronizes questions, and strips answer keys', () => {
  const room = new CoopRoom('room_test_2', 'KY-2002', 'host_1', 'HostHero');
  room.addParticipant('player_2', 'FriendHero');
  room.setReady('player_2', true);

  const startRes = room.startEncounter(SYNTHETIC_QUESTIONS);
  assert.equal(startRes.success, true);
  assert.equal(room.status, ROOM_STATES.ENCOUNTER);
  assert.ok(room.bossHp > 0);
  assert.ok(room.bossMaxHp > 0);

  // Client snapshot must never contain the answer key
  const snapshot = room.getSnapshot();
  assert.equal(snapshot.status, ROOM_STATES.ENCOUNTER);
  assert.ok(snapshot.question);
  assert.equal(typeof snapshot.question.prompt, 'string');
  assert.equal('answerKey' in snapshot.question, false, 'Client snapshot must NOT expose answerKey');
});

test('CoopRoom handles authoritative combat damage, scoring, and victory transition', () => {
  const room = new CoopRoom('room_test_3', 'KY-3003', 'host_1', 'HostHero');
  room.addParticipant('player_2', 'PlayerTwo');
  room.setReady('player_2', true);

  const q1 = SYNTHETIC_QUESTIONS[0];
  const q2 = SYNTHETIC_QUESTIONS[1];
  room.startEncounter([q1, q2]);

  const initialHp = room.bossHp;
  const initialHostScore = room.participants.get('host_1').score;

  // Correct answer damages boss and adds score
  const correctVerdict = room.submitAnswer('host_1', q1.answerKey, 'idem_01');
  assert.equal(correctVerdict.success, true);
  assert.equal(correctVerdict.isCorrect, true);
  assert.equal(correctVerdict.damageDealt, 25);
  assert.equal(room.bossHp, initialHp - 25);
  assert.equal(room.participants.get('host_1').score, initialHostScore + 100);

  // Idempotent duplicate answer submission blocked
  const dupVerdict = room.submitAnswer('host_1', q1.answerKey, 'idem_01');
  assert.equal(dupVerdict.success, false);
  assert.equal(dupVerdict.duplicate, true);

  // Player 2 submits answer to next question
  const finishVerdict = room.submitAnswer('player_2', q2.answerKey, 'idem_02');
  assert.equal(finishVerdict.success, true);
  assert.equal(finishVerdict.isCorrect, true);
  assert.equal(finishVerdict.encounterComplete, true);
  assert.equal(room.status, ROOM_STATES.VICTORY);
  assert.ok(room.completedAt > 0);
});

test('CoopRoom handles incorrect answer penalty and clamp', () => {
  const room = new CoopRoom('room_test_4', 'KY-4004', 'host_1', 'HostHero');
  room.addParticipant('player_2', 'PlayerTwo');
  room.setReady('player_2', true);

  const q1 = SYNTHETIC_QUESTIONS[0];
  room.startEncounter([q1]);

  const wrongChoice = q1.choices.find((c) => c.id !== q1.answerKey).id;
  const wrongVerdict = room.submitAnswer('host_1', wrongChoice, 'idem_wrong');

  assert.equal(wrongVerdict.success, true);
  assert.equal(wrongVerdict.isCorrect, false);
  assert.equal(wrongVerdict.damageDealt, 0);
  assert.equal(room.participants.get('host_1').score, 0, 'Score does not drop below zero');
  assert.ok(wrongVerdict.explanation.length > 0);
});

test('CoopRoom manages disconnect grace period and host migration', () => {
  const room = new CoopRoom('room_test_5', 'KY-5005', 'host_1', 'HostHero');
  room.addParticipant('player_2', 'PlayerTwo');

  assert.equal(room.hostId, 'host_1');

  // Host disconnects
  room.handleDisconnect('host_1');
  const hostP = room.participants.get('host_1');
  assert.equal(hostP.connected, false);
  assert.ok(hostP.disconnectedAt > 0);

  // Host migrated to player 2
  assert.equal(room.hostId, 'player_2', 'Host should migrate to remaining active participant');

  // Host reconnects
  const reconnectRes = room.addParticipant('host_1', 'HostHero');
  assert.equal(reconnectRes.success, true);
  assert.equal(reconnectRes.reconnected, true);
  assert.equal(room.participants.get('host_1').connected, true);
});

test('CoopRoom enforces preset emotes and rejects custom text for COPPA child privacy', () => {
  const room = new CoopRoom('room_test_6', 'KY-6006', 'host_1', 'HostHero');

  // Valid preset emote
  const validEmote = room.sendPresetEmote('host_1', 'cheer');
  assert.equal(validEmote.success, true);
  assert.equal(validEmote.broadcastData.emote.id, 'cheer');
  assert.equal(validEmote.broadcastData.handle, 'HostHero');

  // Invalid / arbitrary text emote rejected
  const invalidEmote = room.sendPresetEmote('host_1', 'custom_open_chat_message');
  assert.equal(invalidEmote.success, false);
  assert.match(invalidEmote.error, /invalid preset emote/i);
});

test('RoomManager handles room lifecycle, lookups, and anti-brute force rate limiting', () => {
  const manager = new RoomManager();

  const room = manager.createRoom('host_123', 'KentuckyHost');
  assert.ok(room.code.startsWith('KY-'));

  // Lookup existing room
  const found = manager.getRoom(room.code);
  assert.ok(found);
  assert.equal(found.code, room.code);

  // Rate limiter tracks failed guesses
  const clientKey = 'client_suspect_ip';

  // 4 failed attempts should be allowed
  for (let i = 0; i < 4; i++) {
    const res = manager.joinRoom('KY-0000', 'guesser', 'GuesserHandle', clientKey);
    assert.equal(res.success, false);
    assert.equal(res.rateLimited, undefined);
  }

  // 5th failed attempt records threshold
  const fifthRes = manager.joinRoom('KY-0000', 'guesser', 'GuesserHandle', clientKey);
  assert.equal(fifthRes.success, false);

  // 6th attempt is rate-limited
  const blockedRes = manager.joinRoom('KY-0000', 'guesser', 'GuesserHandle', clientKey);
  assert.equal(blockedRes.success, false);
  assert.equal(blockedRes.rateLimited, true);
  assert.match(blockedRes.error, /too many failed/i);
});
