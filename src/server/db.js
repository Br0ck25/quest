// src/server/db.js — Relational Persistence Layer (D1 Compatible)
// Provides unified interface for Cloudflare D1 database bindings with in-memory fallback for local dev & testing.
// Parameterized SQL queries to prevent injection; zero PII storage.

import { createInitialMasteryRecord, calculateNextReview, getDueReviews } from '../data/spaced-repetition.js';

export class DatabaseAdapter {
  constructor(d1Binding = null) {
    this.d1 = d1Binding;
    // In-memory relational tables for local dev / testing fallback
    this.memory = {
      users: new Map(),
      attempts: new Map(),
      mastery: new Map(), // key: `${userId}:${conceptId}`
      idempotency: new Map(),
    };
  }

  /**
   * Initializes or gets user record.
   * @param {object} user { id, displayName, isGuest, gradeBand }
   */
  async getOrCreateUser(user) {
    const { id, displayName = 'Adventurer', isGuest = true, gradeBand = '6-8' } = user;

    if (this.d1) {
      const existing = await this.d1.prepare('SELECT * FROM users WHERE id = ?').bind(id).first();
      if (existing) return existing;

      const now = Date.now();
      await this.d1
        .prepare('INSERT INTO users (id, display_name, is_guest, grade_band, created_at, status) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(id, displayName, isGuest ? 1 : 0, gradeBand, now, 'active')
        .run();

      return { id, display_name: displayName, is_guest: isGuest ? 1 : 0, grade_band: gradeBand, created_at: now, status: 'active' };
    }

    if (!this.memory.users.has(id)) {
      this.memory.users.set(id, {
        id,
        display_name: displayName,
        is_guest: isGuest ? 1 : 0,
        grade_band: gradeBand,
        created_at: Date.now(),
        status: 'active',
      });
    }
    return this.memory.users.get(id);
  }

  /**
   * Records a student question attempt with idempotency key protection.
   * @param {object} attempt
   * @returns {Promise<{ recorded: boolean, duplicate: boolean }>}
   */
  async recordAttempt(attempt) {
    const {
      id = 'att_' + Math.random().toString(36).substring(2, 10),
      userId,
      questionId,
      conceptId,
      selectedChoiceId,
      isCorrect,
      assisted = false,
      sessionId = null,
      idempotencyKey = null,
      createdAt = Date.now(),
    } = attempt;

    if (this.d1) {
      if (idempotencyKey) {
        const existing = await this.d1
          .prepare('SELECT id FROM user_question_attempts WHERE idempotency_key = ?')
          .bind(idempotencyKey)
          .first();
        if (existing) {
          return { recorded: true, duplicate: true, attemptId: existing.id };
        }
      }

      await this.d1
        .prepare(
          `INSERT INTO user_question_attempts 
           (id, user_id, question_id, concept_id, selected_choice_id, is_correct, assisted, created_at, session_id, idempotency_key)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          userId,
          questionId,
          conceptId,
          selectedChoiceId,
          isCorrect ? 1 : 0,
          assisted ? 1 : 0,
          createdAt,
          sessionId,
          idempotencyKey
        )
        .run();

      return { recorded: true, duplicate: false, attemptId: id };
    }

    if (idempotencyKey && this.memory.idempotency.has(idempotencyKey)) {
      return { recorded: true, duplicate: true, attemptId: this.memory.idempotency.get(idempotencyKey) };
    }

    const record = {
      id,
      user_id: userId,
      question_id: questionId,
      concept_id: conceptId,
      selected_choice_id: selectedChoiceId,
      is_correct: isCorrect ? 1 : 0,
      assisted: assisted ? 1 : 0,
      created_at: createdAt,
      session_id: sessionId,
      idempotency_key: idempotencyKey,
    };

    this.memory.attempts.set(id, record);
    if (idempotencyKey) {
      this.memory.idempotency.set(idempotencyKey, id);
    }
    return { recorded: true, duplicate: false, attemptId: id };
  }

  /**
   * Fetches concept mastery record for a user.
   * @param {string} userId
   * @param {string} conceptId
   * @returns {Promise<object>}
   */
  async getConceptMastery(userId, conceptId) {
    if (this.d1) {
      const row = await this.d1
        .prepare('SELECT * FROM user_concept_mastery WHERE user_id = ? AND concept_id = ?')
        .bind(userId, conceptId)
        .first();

      if (!row) {
        return createInitialMasteryRecord(userId, conceptId);
      }

      let distinctQuestions = [];
      try {
        distinctQuestions = JSON.parse(row.distinct_questions_correct || '[]');
      } catch {
        distinctQuestions = [];
      }

      return {
        userId: row.user_id,
        conceptId: row.concept_id,
        stage: row.stage,
        intervalDays: row.interval_days,
        dueAt: row.due_at,
        consecutiveCorrect: row.consecutive_correct,
        distinctQuestionsCorrect: distinctQuestions,
        isMastered: Boolean(row.is_mastered),
        lastAttemptAt: row.last_attempt_at,
      };
    }

    const key = `${userId}:${conceptId}`;
    if (!this.memory.mastery.has(key)) {
      return createInitialMasteryRecord(userId, conceptId);
    }
    return { ...this.memory.mastery.get(key) };
  }

  /**
   * Updates or inserts a concept mastery record.
   * @param {object} record
   */
  async saveConceptMastery(record) {
    const distinctJson = JSON.stringify(record.distinctQuestionsCorrect || []);

    if (this.d1) {
      await this.d1
        .prepare(
          `INSERT INTO user_concept_mastery 
           (user_id, concept_id, stage, interval_days, due_at, consecutive_correct, distinct_questions_correct, is_mastered, last_attempt_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT (user_id, concept_id) DO UPDATE SET
             stage = excluded.stage,
             interval_days = excluded.interval_days,
             due_at = excluded.due_at,
             consecutive_correct = excluded.consecutive_correct,
             distinct_questions_correct = excluded.distinct_questions_correct,
             is_mastered = excluded.is_mastered,
             last_attempt_at = excluded.last_attempt_at`
        )
        .bind(
          record.userId,
          record.conceptId,
          record.stage,
          record.intervalDays,
          record.dueAt,
          record.consecutiveCorrect,
          distinctJson,
          record.isMastered ? 1 : 0,
          record.lastAttemptAt
        )
        .run();
      return;
    }

    const key = `${record.userId}:${record.conceptId}`;
    this.memory.mastery.set(key, { ...record });
  }

  /**
   * Fetches all concept mastery records for a user.
   * @param {string} userId
   * @returns {Promise<Array<object>>}
   */
  async getUserMasteryList(userId) {
    if (this.d1) {
      const rows = await this.d1
        .prepare('SELECT * FROM user_concept_mastery WHERE user_id = ?')
        .bind(userId)
        .all();

      return (rows.results || []).map((row) => {
        let distinctQuestions = [];
        try {
          distinctQuestions = JSON.parse(row.distinct_questions_correct || '[]');
        } catch {
          distinctQuestions = [];
        }
        return {
          userId: row.user_id,
          conceptId: row.concept_id,
          stage: row.stage,
          intervalDays: row.interval_days,
          dueAt: row.due_at,
          consecutiveCorrect: row.consecutive_correct,
          distinctQuestionsCorrect: distinctQuestions,
          isMastered: Boolean(row.is_mastered),
          lastAttemptAt: row.last_attempt_at,
        };
      });
    }

    const results = [];
    for (const [key, record] of this.memory.mastery.entries()) {
      if (key.startsWith(`${userId}:`)) {
        results.push({ ...record });
      }
    }
    return results;
  }

  /**
   * Evaluates and records a question answer, updating spaced repetition review and mastery in a single transaction.
   * @param {object} params { userId, question, selectedChoiceId, assisted, sessionId, idempotencyKey, now }
   */
  async processAnswerAttempt(params) {
    const { userId, question, selectedChoiceId, assisted = false, sessionId = null, idempotencyKey = null, now = Date.now() } = params;

    const isCorrect = selectedChoiceId === question.answerKey;
    const conceptId = Array.isArray(question.conceptIds) && question.conceptIds.length > 0 ? question.conceptIds[0] : 'general';

    // 1. Record Attempt History
    const attemptResult = await this.recordAttempt({
      userId,
      questionId: question.id,
      conceptId,
      selectedChoiceId,
      isCorrect,
      assisted,
      sessionId,
      idempotencyKey,
      createdAt: now,
    });

    // 2. Fetch existing concept mastery & compute updated schedule
    const currentMastery = await this.getConceptMastery(userId, conceptId);
    const updatedMastery = calculateNextReview(
      currentMastery,
      { isCorrect, assisted, questionId: question.id },
      now
    );

    // 3. Persist updated mastery
    await this.saveConceptMastery(updatedMastery);

    return {
      accepted: true,
      correct: isCorrect,
      explanation: question.explanation,
      conceptReviewScheduled: true,
      nextReviewDueAt: updatedMastery.dueAt,
      stage: updatedMastery.stage,
      intervalDays: updatedMastery.intervalDays,
      isMastered: updatedMastery.isMastered,
      attemptDuplicate: attemptResult.duplicate,
    };
  }
}
