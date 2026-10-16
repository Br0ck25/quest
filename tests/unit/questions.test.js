// tests/unit/questions.test.js — Validation of Synthetic Question Bank & Dungeon Encounters
import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  SYNTHETIC_QUESTIONS,
  DUNGEON_ENCOUNTERS,
  sanitizeQuestionForClient,
} from '../../src/data/questions.js';
import { TARGET_GRADE_BAND, SUBJECTS } from '../../src/data/constants.js';

describe('Synthetic Question Bank & Encounter Integrity', () => {
  it('contains questions across all 5 Governor Cup academic subjects', () => {
    const subjectsInBank = new Set(SYNTHETIC_QUESTIONS.map(q => q.subject));
    for (const key of Object.keys(SUBJECTS)) {
      const subjectId = SUBJECTS[key].id;
      assert.ok(subjectsInBank.has(subjectId), `Missing questions for subject ${subjectId}`);
    }
  });

  it('every question adheres strictly to schema specifications', () => {
    const seenIds = new Set();

    for (const q of SYNTHETIC_QUESTIONS) {
      // Unique ID
      assert.ok(!seenIds.has(q.id), `Duplicate question ID: ${q.id}`);
      seenIds.add(q.id);

      // Grade Band
      assert.strictEqual(q.gradeBand, TARGET_GRADE_BAND, `Question ${q.id} grade band mismatch`);

      // Prompt and choices
      assert.ok(typeof q.prompt === 'string' && q.prompt.length > 10, `Question ${q.id} has invalid prompt`);
      assert.ok(Array.isArray(q.choices) && q.choices.length === 4, `Question ${q.id} must have exactly 4 choices`);

      const choiceIds = new Set(q.choices.map(c => c.id));
      assert.ok(choiceIds.has('a') && choiceIds.has('b') && choiceIds.has('c') && choiceIds.has('d'), `Question ${q.id} must have choices a, b, c, d`);

      // Answer key matches a choice
      assert.ok(choiceIds.has(q.answerKey), `Question ${q.id} answerKey ${q.answerKey} not found in choices`);

      // Explanation
      assert.ok(typeof q.explanation === 'string' && q.explanation.length > 10, `Question ${q.id} missing explanation`);

      // Source and rights metadata
      assert.ok(q.source && q.source.type && q.source.license, `Question ${q.id} missing source or license`);
      assert.strictEqual(q.reviewStatus, 'approved', `Question ${q.id} must be approved`);
      assert.strictEqual(q.rightsStatus, 'approved', `Question ${q.id} must have approved rights`);
      assert.strictEqual(q.active, true, `Question ${q.id} must be active`);
    }
  });

  it('sanitizeQuestionForClient strips answerKey to enforce Answer Key Secrecy', () => {
    const rawQuestion = SYNTHETIC_QUESTIONS[0];
    assert.ok('answerKey' in rawQuestion);

    const clientPayload = sanitizeQuestionForClient(rawQuestion);
    assert.strictEqual('answerKey' in clientPayload, false, 'Client payload must NOT contain answerKey');
    assert.strictEqual(clientPayload.id, rawQuestion.id);
    assert.strictEqual(clientPayload.prompt, rawQuestion.prompt);
    assert.strictEqual(clientPayload.choices.length, 4);
  });

  it('DUNGEON_ENCOUNTERS defines 5 sequential encounters ending in a boss', () => {
    assert.strictEqual(DUNGEON_ENCOUNTERS.length, 5, 'Dungeon vertical slice must have 5 encounters');

    // First 4 are basic/elite, 5th is boss
    assert.strictEqual(DUNGEON_ENCOUNTERS[0].type, 'basic');
    assert.strictEqual(DUNGEON_ENCOUNTERS[4].type, 'boss');
    assert.strictEqual(DUNGEON_ENCOUNTERS[4].name.includes('Boss'), true);
    assert.ok(DUNGEON_ENCOUNTERS[4].hp >= 2, 'Boss must require multiple hits/questions');

    // All referenced questions exist in SYNTHETIC_QUESTIONS
    const allQuestionIds = new Set(SYNTHETIC_QUESTIONS.map(q => q.id));
    for (const enc of DUNGEON_ENCOUNTERS) {
      if (enc.questionId) {
        assert.ok(allQuestionIds.has(enc.questionId), `Encounter ${enc.id} references non-existent question ${enc.questionId}`);
      }
      if (enc.questionIds) {
        for (const qid of enc.questionIds) {
          assert.ok(allQuestionIds.has(qid), `Boss encounter references non-existent question ${qid}`);
        }
      }
    }
  });
});
