import { SPACED_REPETITION, SUBJECTS } from './constants.js';

const DAY_MS = 86_400_000;
const INTERVALS = SPACED_REPETITION.INTERVALS_DAYS;
export const REQUIRED_DISTINCT_QUESTIONS = SPACED_REPETITION.VERIFICATION_MIN_COUNT;

/**
 * Creates a blank concept mastery record.
 * @param {string} userId
 * @param {string} conceptId
 * @param {number} [now=Date.now()]
 * @returns {object}
 */
export function createInitialMasteryRecord(userId, conceptId, now = Date.now()) {
  return {
    userId,
    conceptId,
    stage: 0,
    intervalDays: INTERVALS[0],
    dueAt: now,
    consecutiveCorrect: 0,
    distinctQuestionsCorrect: [],
    isMastered: false,
    lastAttemptAt: 0,
  };
}

/**
 * Calculates the next spaced review schedule and mastery status based on an attempt.
 *
 * Rules:
 * 1. Unassisted Correct: Advances interval stage (1 -> 3 -> 7 -> 14 -> 30 days).
 * 2. Assisted Correct: Awards credit for the session but DOES NOT advance mastery stage.
 * 3. Incorrect: Resets interval stage to 1 day and resets consecutive counter.
 * 4. Multi-Question Verification: Mastery requires at least 3 distinct questions answered correctly
 *    and reaching the top interval tier (30 days).
 *
 * @param {object} currentRecord Current concept mastery record (or null for new)
 * @param {object} attempt { isCorrect: boolean, assisted: boolean, questionId: string }
 * @param {number} [now=Date.now()]
 * @returns {object} Updated mastery record
 */
export function calculateNextReview(currentRecord, attempt, now = Date.now()) {
  const base = currentRecord ? { ...currentRecord } : createInitialMasteryRecord('', '', now);
  const { isCorrect, assisted = false, questionId } = attempt;

  const distinctSet = new Set(base.distinctQuestionsCorrect || []);

  if (isCorrect) {
    if (questionId) {
      distinctSet.add(questionId);
    }

    if (assisted) {
      // Assisted Correct: Marked assisted; do NOT advance mastery stage or interval
      base.lastAttemptAt = now;
      base.dueAt = now + base.intervalDays * DAY_MS;
      base.distinctQuestionsCorrect = Array.from(distinctSet);
      return base;
    }

    // Unassisted Correct: Advance to next spaced repetition interval tier
    const nextStage = Math.min(base.stage + 1, INTERVALS.length);
    const intervalDays = nextStage < INTERVALS.length
      ? INTERVALS[nextStage]
      : INTERVALS[INTERVALS.length - 1];

    const consecutive = (base.consecutiveCorrect || 0) + 1;
    const isMastered = distinctSet.size >= REQUIRED_DISTINCT_QUESTIONS && nextStage >= INTERVALS.length - 1;

    base.stage = nextStage;
    base.intervalDays = intervalDays;
    base.dueAt = now + intervalDays * DAY_MS;
    base.consecutiveCorrect = consecutive;
    base.distinctQuestionsCorrect = Array.from(distinctSet);
    base.isMastered = isMastered;
    base.lastAttemptAt = now;
  } else {
    // Incorrect: Reset interval to 1 day and reset consecutive counter
    base.stage = 0;
    base.intervalDays = INTERVALS[0];
    base.dueAt = now + INTERVALS[0] * DAY_MS;
    base.consecutiveCorrect = 0;
    base.isMastered = false;
    base.lastAttemptAt = now;
    base.distinctQuestionsCorrect = Array.from(distinctSet);
  }

  return base;
}

/**
 * Filters and returns concept mastery records that are currently due for spaced review.
 * @param {Array<object>} masteryRecords
 * @param {number} [now=Date.now()]
 * @returns {Array<object>} Records where dueAt <= now
 */
export function getDueReviews(masteryRecords = [], now = Date.now()) {
  if (!Array.isArray(masteryRecords)) return [];
  return masteryRecords
    .filter((record) => record && record.dueAt <= now)
    .sort((a, b) => a.dueAt - b.dueAt);
}

/**
 * Computes aggregate subject realm progress across curriculum concepts.
 * @param {Array<object>} masteryRecords
 * @param {Array<object>} allQuestions Catalog of active questions
 * @returns {object} Progress summary per subject realm
 */
export function computeSubjectProgress(masteryRecords = [], allQuestions = []) {
  const progress = {};
  for (const subjectKey of Object.keys(SUBJECTS)) {
    const sub = SUBJECTS[subjectKey];
    progress[sub.id] = {
      subjectId: sub.id,
      name: sub.name,
      realm: sub.realm,
      color: sub.color,
      totalConceptsEncountered: 0,
      masteredConcepts: 0,
      activeReviewsDue: 0,
    };
  }

  const conceptToSubject = new Map();
  for (const q of allQuestions) {
    if (q && q.subject && Array.isArray(q.conceptIds)) {
      for (const c of q.conceptIds) {
        if (!conceptToSubject.has(c)) {
          conceptToSubject.set(c, q.subject);
        }
      }
    }
  }

  const now = Date.now();
  for (const record of masteryRecords) {
    if (!record) continue;
    const subjectId = conceptToSubject.get(record.conceptId) || record.subjectId || 'science';
    if (!progress[subjectId]) continue;

    progress[subjectId].totalConceptsEncountered++;
    if (record.isMastered) {
      progress[subjectId].masteredConcepts++;
    }
    if (record.dueAt <= now) {
      progress[subjectId].activeReviewsDue++;
    }
  }

  return progress;
}
