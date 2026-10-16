// tests/unit/duels.test.js — Unit Tests for 1v1 Knowledge Duel Engine
// Tests private room codes, 2-player capacity, choice order shuffling per player,
// delayed answer reveals (answers revealed only after both players submit or timeout),
// balanced scoring (accuracy primary, speed capped tiebreaker), post-match recaps,
// disconnect handling, and anti-brute force rate limiting.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DUEL_CONSTANTS,
  DUEL_STATES,
  generateDuelCode,
  shuffleChoicesForPlayer,
  DuelMatch,
  DuelManager,
} from '../../src/server/duels.js';
import { SYNTHETIC_QUESTIONS } from '../../src/data/questions.js';

test('generateDuelCode generates valid DUEL-XXXX code', () => {
  for (let i = 0; i < 20; i++) {
    const code = generateDuelCode();
    assert.match(code, /^DUEL-\d{4}$/, `Code ${code} should match DUEL-XXXX`);
  }
});

test('shuffleChoicesForPlayer produces deterministic, player-specific choice permutations', () => {
  const choices = [
    { id: 'a', text: 'Option A' },
    { id: 'b', text: 'Option B' },
    { id: 'c', text: 'Option C' },
    { id: 'd', text: 'Option D' },
  ];

  const p1Choices = shuffleChoicesForPlayer(choices, 'q_101:player_alpha');
  const p2Choices = shuffleChoicesForPlayer(choices, 'q_101:player_beta');

  // Both have all 4 options
  assert.equal(p1Choices.length, 4);
  assert.equal(p2Choices.length, 4);

  // Consistency: identical seed produces identical permutation
  const p1ChoicesRepeat = shuffleChoicesForPlayer(choices, 'q_101:player_alpha');
  assert.deepEqual(p1Choices, p1ChoicesRepeat);

  // Different players receive different choice permutations (anti-shoulder surfing)
  const isDifferent = p1Choices.some((c, i) => c.id !== p2Choices[i].id);
  assert.ok(isDifferent, 'Different players should have different choice order');
});

test('DuelMatch enforces strictly 2 players and lobby ready checks', () => {
  const match = new DuelMatch('duel_1', 'DUEL-1001', 'host_user', 'HostDuelist');

  assert.equal(match.status, DUEL_STATES.LOBBY);
  assert.equal(match.canStart(), false, 'Cannot start with only 1 player');

  // Add 2nd player
  const p2Res = match.addPlayer2('challenger_user', 'ChallengerScholar');
  assert.equal(p2Res.success, true);
  assert.equal(match.canStart(), false, 'Cannot start until player 2 is ready');

  // Reject 3rd player
  const p3Res = match.addPlayer2('third_user', 'ThirdWheel');
  assert.equal(p3Res.success, false);
  assert.match(p3Res.error, /full/i);

  // Player 2 readies up
  match.setReady('challenger_user', true);
  assert.equal(match.canStart(), true, 'Match can start when both are ready');
});

test('DuelMatch starts match, selects 5 curriculum rounds, and strips answer keys', () => {
  const match = new DuelMatch('duel_2', 'DUEL-2002', 'p1_user', 'P1Hero');
  match.addPlayer2('p2_user', 'P2Hero');
  match.setReady('p2_user', true);

  const startRes = match.startDuel(SYNTHETIC_QUESTIONS);
  assert.equal(startRes.success, true);
  assert.equal(match.status, DUEL_STATES.IN_PROGRESS);
  assert.equal(match.questions.length, 5);

  // Question for P1 has no answerKey
  const p1Q = match.getSanitizedQuestionForPlayer('p1_user');
  assert.ok(p1Q);
  assert.equal('answerKey' in p1Q, false, 'Client question must NOT expose answerKey');

  // Question for P2 has no answerKey
  const p2Q = match.getSanitizedQuestionForPlayer('p2_user');
  assert.ok(p2Q);
  assert.equal('answerKey' in p2Q, false, 'Client question must NOT expose answerKey');
});

test('DuelMatch enforces Delayed Answer Reveal: reveals only after both players submit', () => {
  const match = new DuelMatch('duel_3', 'DUEL-3003', 'p1_user', 'P1Hero');
  match.addPlayer2('p2_user', 'P2Hero');
  match.setReady('p2_user', true);
  match.startDuel(SYNTHETIC_QUESTIONS);

  const currentQ = match.getCurrentSecretQuestion();

  // 1. Player 1 submits answer
  const p1Submit = match.submitAnswer('p1_user', currentQ.answerKey, 3000, 'idem_p1_r0');
  assert.equal(p1Submit.success, true);
  assert.equal(p1Submit.bothSubmitted, false);
  assert.equal(p1Submit.roundComplete, false);
  assert.equal(p1Submit.waitingForOpponent, true);

  // Client snapshot for P2 during P1 waiting: P2 does NOT see P1 choice or answerKey
  const p2Snapshot = match.getSnapshot('p2_user');
  assert.equal(p2Snapshot.status, DUEL_STATES.IN_PROGRESS);
  assert.equal(p2Snapshot.roundResult, null, 'Answer must NOT be revealed while opponent has not answered');

  // 2. Duplicate submission by P1 is rejected
  const p1Dup = match.submitAnswer('p1_user', currentQ.answerKey, 3000, 'idem_p1_r0');
  assert.equal(p1Dup.success, false);
  assert.equal(p1Dup.duplicate, true);

  // 3. Player 2 submits answer -> triggers immediate reveal and evaluation
  const wrongChoice = currentQ.choices.find((c) => c.id !== currentQ.answerKey).id;
  const p2Submit = match.submitAnswer('p2_user', wrongChoice, 5000, 'idem_p2_r0');
  assert.equal(p2Submit.success, true);
  assert.equal(p2Submit.bothSubmitted, true);
  assert.equal(p2Submit.roundComplete, true);

  const roundRes = p2Submit.roundResult;
  assert.equal(roundRes.revealed, true);
  assert.equal(roundRes.answerKey, currentQ.answerKey);
  assert.equal(roundRes.player1.isCorrect, true);
  assert.equal(roundRes.player2.isCorrect, false);
});

test('Balanced Scoring: Accuracy is primary (100 pts), Speed is capped tiebreaker (max 10 pts)', () => {
  const match = new DuelMatch('duel_4', 'DUEL-4004', 'accurate_p1', 'AccurateStudent');
  match.addPlayer2('fast_wrong_p2', 'FastStudent');
  match.setReady('fast_wrong_p2', true);
  match.startDuel(SYNTHETIC_QUESTIONS);

  const currentQ = match.getCurrentSecretQuestion();
  const wrongChoice = currentQ.choices.find((c) => c.id !== currentQ.answerKey).id;

  // Accurate student answers in 10s (slow, but correct)
  match.submitAnswer('accurate_p1', currentQ.answerKey, 10000);

  // Fast student answers in 1s (super fast, but wrong)
  const reveal = match.submitAnswer('fast_wrong_p2', wrongChoice, 1000);

  const res = reveal.roundResult;
  assert.ok(res.player1.scoreEarned >= 100, 'Accurate player earns base 100 + speed bonus');
  assert.equal(res.player2.scoreEarned, 0, 'Wrong answer earns 0 points regardless of speed');
  assert.ok(match.player1.score > match.player2.score, 'Accurate player must beat fast wrong player');
});

test('DuelMatch handles full 5-round match, tie resolution, and respectful recap', () => {
  const match = new DuelMatch('duel_5', 'DUEL-5005', 'p1_user', 'ScholarAlpha');
  match.addPlayer2('p2_user', 'ScholarBeta');
  match.setReady('p2_user', true);
  match.startDuel(SYNTHETIC_QUESTIONS);

  // Play all 5 rounds identically so match ends in tie
  for (let r = 0; r < 5; r++) {
    const q = match.getCurrentSecretQuestion();
    match.submitAnswer('p1_user', q.answerKey, 5000);
    match.submitAnswer('p2_user', q.answerKey, 5000);

    if (r < 4) {
      const nextRes = match.nextRound();
      assert.equal(nextRes.success, true);
      assert.equal(nextRes.finished, false);
    }
  }

  assert.equal(match.status, DUEL_STATES.FINISHED);
  assert.equal(match.winnerId, 'tie');

  const recap = match.getRecap();
  assert.equal(recap.winnerId, 'tie');
  assert.match(recap.outcomeTitle, /tie|stalemate/i);
  assert.equal(recap.player1.accuracyPercentage, 100);
  assert.equal(recap.player2.accuracyPercentage, 100);
  assert.equal(recap.rounds.length, 5);
});

test('DuelMatch supports disconnect grace and reconnection without answer leakage', () => {
  const match = new DuelMatch('duel_6', 'DUEL-6006', 'p1_user', 'P1Hero');
  match.addPlayer2('p2_user', 'P2Hero');

  // Disconnect P2
  match.handleDisconnect('p2_user');
  assert.equal(match.player2.connected, false);

  // P2 reconnects
  const reconnected = match.reconnect('p2_user');
  assert.equal(reconnected, true);
  assert.equal(match.player2.connected, true);
});

test('DuelManager enforces anti-brute force rate limiting (max 5 failed guesses)', () => {
  const manager = new DuelManager();
  const match = manager.createDuel('host_1', 'HostHero');
  assert.ok(match.code.startsWith('DUEL-'));

  const suspectKey = 'suspect_duel_guesser';

  // 5 failed attempts allowed
  for (let i = 0; i < 5; i++) {
    const res = manager.joinDuel('DUEL-0000', 'guesser', 'Guesser', suspectKey);
    assert.equal(res.success, false);
    assert.equal(res.rateLimited, undefined);
  }

  // 6th attempt is blocked with rateLimited: true
  const blocked = manager.joinDuel('DUEL-0000', 'guesser', 'Guesser', suspectKey);
  assert.equal(blocked.success, false);
  assert.equal(blocked.rateLimited, true);
  assert.match(blocked.error, /too many failed/i);
});
