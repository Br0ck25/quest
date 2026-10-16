// tests/unit/spaced-repetition.test.js — Unit tests for Spaced Repetition, Review Scheduling & Concept Mastery
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createInitialMasteryRecord,
  calculateNextReview,
  getDueReviews,
  computeSubjectProgress,
  REQUIRED_DISTINCT_QUESTIONS,
} from '../../src/data/spaced-repetition.js';
import { DatabaseAdapter } from '../../src/server/db.js';
import { SPACED_REPETITION, SUBJECTS } from '../../src/data/constants.js';

const DAY_MS = 86_400_000;
const INTERVALS = SPACED_REPETITION.INTERVALS_DAYS;

describe('Spaced Repetition Review Engine', () => {
  const mockNow = 1700000000000;

  it('creates default initial concept mastery record at stage 0', () => {
    const record = createInitialMasteryRecord('user_123', 'science.ecosystems.photosynthesis', mockNow);
    assert.equal(record.userId, 'user_123');
    assert.equal(record.conceptId, 'science.ecosystems.photosynthesis');
    assert.equal(record.stage, 0);
    assert.equal(record.intervalDays, 1);
    assert.equal(record.dueAt, mockNow);
    assert.equal(record.consecutiveCorrect, 0);
    assert.deepEqual(record.distinctQuestionsCorrect, []);
    assert.equal(record.isMastered, false);
  });

  it('advances review intervals sequentially on unassisted correct answers', () => {
    let record = createInitialMasteryRecord('user_1', 'math.algebra', mockNow);

    // Attempt 1: Unassisted Correct -> Stage 1 (3 days)
    record = calculateNextReview(record, { isCorrect: true, assisted: false, questionId: 'q_m_01' }, mockNow);
    assert.equal(record.stage, 1);
    assert.equal(record.intervalDays, INTERVALS[1]); // 3 days
    assert.equal(record.dueAt, mockNow + 3 * DAY_MS);
    assert.equal(record.consecutiveCorrect, 1);
    assert.deepEqual(record.distinctQuestionsCorrect, ['q_m_01']);
    assert.equal(record.isMastered, false);

    // Attempt 2: Unassisted Correct -> Stage 2 (7 days)
    const time2 = mockNow + 3 * DAY_MS;
    record = calculateNextReview(record, { isCorrect: true, assisted: false, questionId: 'q_m_02' }, time2);
    assert.equal(record.stage, 2);
    assert.equal(record.intervalDays, INTERVALS[2]); // 7 days
    assert.equal(record.dueAt, time2 + 7 * DAY_MS);
    assert.equal(record.consecutiveCorrect, 2);
    assert.deepEqual(record.distinctQuestionsCorrect, ['q_m_01', 'q_m_02']);
    assert.equal(record.isMastered, false);

    // Attempt 3: Unassisted Correct -> Stage 3 (14 days)
    const time3 = time2 + 7 * DAY_MS;
    record = calculateNextReview(record, { isCorrect: true, assisted: false, questionId: 'q_m_03' }, time3);
    assert.equal(record.stage, 3);
    assert.equal(record.intervalDays, INTERVALS[3]); // 14 days
    assert.equal(record.consecutiveCorrect, 3);
    assert.deepEqual(record.distinctQuestionsCorrect, ['q_m_01', 'q_m_02', 'q_m_03']);
    assert.equal(record.isMastered, false);

    // Attempt 4: Unassisted Correct -> Stage 4 (30 days) and fulfills multi-question requirement
    const time4 = time3 + 14 * DAY_MS;
    record = calculateNextReview(record, { isCorrect: true, assisted: false, questionId: 'q_m_04' }, time4);
    assert.equal(record.stage, 4);
    assert.equal(record.intervalDays, INTERVALS[4]); // 30 days
    assert.equal(record.consecutiveCorrect, 4);
    assert.equal(record.isMastered, true, 'Concept should be mastered when stage >= 4 and >= 3 distinct questions');
  });

  it('assisted correct answers do NOT advance mastery stage or increase intervals', () => {
    let record = createInitialMasteryRecord('user_1', 'science.karst', mockNow);

    // First attempt correct unassisted -> Stage 1
    record = calculateNextReview(record, { isCorrect: true, assisted: false, questionId: 'q_sci_1' }, mockNow);
    assert.equal(record.stage, 1);
    assert.equal(record.intervalDays, 3);

    // Second attempt correct but ASSISTED (viewed explanation or hint)
    const time2 = mockNow + 3 * DAY_MS;
    record = calculateNextReview(record, { isCorrect: true, assisted: true, questionId: 'q_sci_2' }, time2);
    assert.equal(record.stage, 1, 'Stage must not advance for assisted answers');
    assert.equal(record.intervalDays, 3, 'Interval must not increase for assisted answers');
    assert.equal(record.dueAt, time2 + 3 * DAY_MS);
    assert.equal(record.isMastered, false);
    assert.ok(record.distinctQuestionsCorrect.includes('q_sci_2'));
  });

  it('incorrect answers immediately reset interval to 1 day and reset consecutive streak', () => {
    let record = createInitialMasteryRecord('user_1', 'social_studies.ky', mockNow);

    // Advance to stage 3
    record = calculateNextReview(record, { isCorrect: true, assisted: false, questionId: 'q_ss_1' }, mockNow);
    record = calculateNextReview(record, { isCorrect: true, assisted: false, questionId: 'q_ss_2' }, mockNow + 3 * DAY_MS);
    assert.equal(record.stage, 2);
    assert.equal(record.consecutiveCorrect, 2);

    // Missed answer -> Reset to 1 day
    const failTime = mockNow + 10 * DAY_MS;
    record = calculateNextReview(record, { isCorrect: false, assisted: false, questionId: 'q_ss_3' }, failTime);
    assert.equal(record.stage, 0);
    assert.equal(record.intervalDays, 1);
    assert.equal(record.dueAt, failTime + 1 * DAY_MS);
    assert.equal(record.consecutiveCorrect, 0);
    assert.equal(record.isMastered, false);
  });

  it('multi-question verification prevents mastery on a single repeated question', () => {
    let record = createInitialMasteryRecord('user_1', 'lang.grammar', mockNow);

    // Answer the exact same question repeatedly through stage 4
    for (let i = 0; i < 4; i++) {
      record = calculateNextReview(record, { isCorrect: true, assisted: false, questionId: 'same_q_only' }, mockNow + i * DAY_MS);
    }
    assert.equal(record.stage, 4);
    assert.equal(record.distinctQuestionsCorrect.length, 1);
    assert.equal(record.isMastered, false, 'Mastery MUST NOT be awarded with fewer than 3 distinct questions');
  });

  it('getDueReviews returns overdue and currently due concept records', () => {
    const list = [
      { conceptId: 'c1', dueAt: mockNow - 1000 },
      { conceptId: 'c2', dueAt: mockNow },
      { conceptId: 'c3', dueAt: mockNow + 100000 },
    ];

    const due = getDueReviews(list, mockNow);
    assert.equal(due.length, 2);
    assert.equal(due[0].conceptId, 'c1');
    assert.equal(due[1].conceptId, 'c2');
  });

  it('computeSubjectProgress aggregates stats across all 5 Governor Cup realms', () => {
    const mockQuestions = [
      { subject: 'science', conceptIds: ['sci.photo'] },
      { subject: 'math', conceptIds: ['math.algebra'] },
    ];
    const mockMastery = [
      { conceptId: 'sci.photo', isMastered: true, dueAt: mockNow - 500 },
      { conceptId: 'math.algebra', isMastered: false, dueAt: mockNow + 50000 },
    ];

    const progress = computeSubjectProgress(mockMastery, mockQuestions);
    assert.ok(progress.science);
    assert.equal(progress.science.totalConceptsEncountered, 1);
    assert.equal(progress.science.masteredConcepts, 1);
    assert.ok(progress.science.activeReviewsDue >= 0);
    assert.equal(progress.math.totalConceptsEncountered, 1);
    assert.equal(progress.math.masteredConcepts, 0);
  });
});

describe('DatabaseAdapter Relational Persistence', () => {
  it('creates and retrieves pseudonymous guest users without PII', async () => {
    const db = new DatabaseAdapter();
    const user = await db.getOrCreateUser({ id: 'guest_test_01', displayName: 'DerbyScholar42' });

    assert.equal(user.id, 'guest_test_01');
    assert.equal(user.display_name, 'DerbyScholar42');
    assert.equal(user.is_guest, 1);
    assert.equal(user.status, 'active');

    // Subsequent retrieval returns existing
    const existing = await db.getOrCreateUser({ id: 'guest_test_01' });
    assert.equal(existing.display_name, 'DerbyScholar42');
  });

  it('records question attempts and enforces idempotency keys', async () => {
    const db = new DatabaseAdapter();
    const attempt = {
      userId: 'user_idem',
      questionId: 'q_01',
      conceptId: 'math.test',
      selectedChoiceId: 'b',
      isCorrect: true,
      idempotencyKey: 'idem_key_999',
    };

    const first = await db.recordAttempt(attempt);
    assert.equal(first.recorded, true);
    assert.equal(first.duplicate, false);

    // Exact duplicate attempt
    const second = await db.recordAttempt(attempt);
    assert.equal(second.recorded, true);
    assert.equal(second.duplicate, true);
    assert.equal(second.attemptId, first.attemptId);
  });

  it('processes answer attempt, records history, and updates concept review in one step', async () => {
    const db = new DatabaseAdapter();
    const question = {
      id: 'syn_sci_001',
      subject: 'science',
      conceptIds: ['science.ecosystems.photosynthesis'],
      answerKey: 'b',
      explanation: 'Chloroplasts absorb light.',
    };

    const verdict = await db.processAnswerAttempt({
      userId: 'student_1',
      question,
      selectedChoiceId: 'b',
      assisted: false,
    });

    assert.equal(verdict.accepted, true);
    assert.equal(verdict.correct, true);
    assert.equal(verdict.conceptReviewScheduled, true);
    assert.equal(verdict.stage, 1);
    assert.equal(verdict.intervalDays, 3);
    assert.ok(verdict.nextReviewDueAt > Date.now());

    // Verify stored mastery in database
    const mastery = await db.getConceptMastery('student_1', 'science.ecosystems.photosynthesis');
    assert.equal(mastery.stage, 1);
    assert.equal(mastery.consecutiveCorrect, 1);
    assert.deepEqual(mastery.distinctQuestionsCorrect, ['syn_sci_001']);
  });
});
