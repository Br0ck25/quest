// tests/unit/content-review.test.js — Unit tests for Admin Content Review Workflow
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QuestionReviewService,
  isAuthorizedReviewer,
  ADMIN_ROLES,
} from '../../src/server/content-review.js';
import { SYNTHETIC_QUESTIONS } from '../../src/data/questions.js';

function createSampleCatalog() {
  return [
    {
      id: 'q_test_sci_01',
      subject: 'science',
      conceptIds: ['cells.organelles'],
      gradeBand: '6-8',
      prompt: 'What organelle is known as the powerhouse of the cell?',
      choices: [
        { id: 'a', text: 'Mitochondria' },
        { id: 'b', text: 'Ribosome' },
        { id: 'c', text: 'Nucleus' },
        { id: 'd', text: 'Vacuole' },
      ],
      answerKey: 'a',
      explanation: 'Mitochondria generate most of the chemical energy needed to power cellular reactions.',
      difficulty: 1,
      source: { type: 'original', reference: 'project-authored', rightsStatus: 'approved' },
      rightsStatus: 'approved',
      reviewStatus: 'in_review',
      version: 1,
      active: 0,
    },
    {
      id: 'q_test_unapproved_rights',
      subject: 'math',
      conceptIds: ['algebra.linear-equations'],
      gradeBand: '6-8',
      prompt: 'Solve for x in the equation 2x + 4 = 12.',
      choices: [
        { id: 'a', text: 'x = 4' },
        { id: 'b', text: 'x = 3' },
        { id: 'c', text: 'x = 8' },
        { id: 'd', text: 'x = 2' },
      ],
      answerKey: 'a',
      explanation: 'Subtract 4 from both sides: 2x = 8; then divide by 2: x = 4.',
      difficulty: 1,
      source: { type: 'synthetic', reference: 'unverified-source', rightsStatus: 'pending' },
      rightsStatus: 'pending',
      reviewStatus: 'draft',
      version: 1,
      active: 0,
    },
  ];
}

test('isAuthorizedReviewer validates administrative roles strictly', () => {
  assert.equal(isAuthorizedReviewer('reviewer'), true);
  assert.equal(isAuthorizedReviewer('content_admin'), true);
  assert.equal(isAuthorizedReviewer('super_admin'), true);
  assert.equal(isAuthorizedReviewer('REVIEWER'), true, 'Case-insensitive');

  assert.equal(isAuthorizedReviewer('student'), false);
  assert.equal(isAuthorizedReviewer('guest'), false);
  assert.equal(isAuthorizedReviewer(null), false);
  assert.equal(isAuthorizedReviewer(''), false);
  assert.equal(isAuthorizedReviewer(undefined), false);
});

test('QuestionReviewService enforces server-side role check on all actions', () => {
  const service = new QuestionReviewService(createSampleCatalog());

  assert.throws(() => service.listQuestions({}, 'student'), {
    message: /Forbidden: Requires authorized reviewer role/,
  });
  assert.throws(() => service.getQuestionDetails('q_test_sci_01', 'guest'), {
    message: /Forbidden: Requires authorized reviewer role/,
  });
  assert.throws(() => service.approveQuestion('q_test_sci_01', {}, 'player'), {
    message: /Forbidden: Requires authorized reviewer role/,
  });
  assert.throws(() => service.rejectQuestion('q_test_sci_01', {}, null), {
    message: /Forbidden: Requires authorized reviewer role/,
  });
  assert.throws(() => service.correctQuestion('q_test_sci_01', {}, {}, ''), {
    message: /Forbidden: Requires authorized reviewer role/,
  });
  assert.throws(() => service.retireQuestion('q_test_sci_01', {}, 'unauthorized'), {
    message: /Forbidden: Requires authorized reviewer role/,
  });
});

test('QuestionReviewService.listQuestions returns questions with duplicate warnings to authorized reviewer', () => {
  const catalog = createSampleCatalog();
  // Add near-duplicate question
  catalog.push({
    ...catalog[0],
    id: 'q_test_sci_dup',
    prompt: 'What organelle is known as the powerhouse of a cell?',
    version: 1,
  });

  const service = new QuestionReviewService(catalog);
  const results = service.listQuestions({}, 'reviewer');

  assert.equal(results.length, 3);
  const dupQuestion = results.find((q) => q.id === 'q_test_sci_dup');
  assert.ok(dupQuestion.duplicateWarnings.length > 0, 'Must flag duplicate warning as review aid');

  // Filter test
  const mathOnly = service.listQuestions({ subject: 'math' }, 'content_admin');
  assert.equal(mathOnly.length, 1);
  assert.equal(mathOnly[0].id, 'q_test_unapproved_rights');
});

test('QuestionReviewService.approveQuestion enforces Rights Gate and activates question', () => {
  const service = new QuestionReviewService(createSampleCatalog());

  // 1. Cannot approve question with unapproved rights
  assert.throws(
    () => service.approveQuestion('q_test_unapproved_rights', { reviewerId: 'rev_alice' }, 'reviewer'),
    { message: /rights status is 'pending', not 'approved'/ }
  );

  // 2. Approved question transitions reviewStatus to 'approved' and active = true
  const res = service.approveQuestion('q_test_sci_01', { reviewerId: 'rev_alice', note: 'KAAC standard verified' }, 'reviewer');
  assert.equal(res.success, true);
  assert.equal(res.question.reviewStatus, 'approved');
  assert.equal(res.question.active, true);
  assert.equal(res.question.reviewedBy, 'rev_alice');
  assert.ok(res.question.reviewedAt > 0);

  // Audit history recorded
  const history = service.getAuditHistory('q_test_sci_01', 'reviewer');
  assert.equal(history.length, 1);
  assert.equal(history[0].action, 'approve');
  assert.equal(history[0].reviewerId, 'rev_alice');
});

test('QuestionReviewService.rejectQuestion deactivates question and records reason', () => {
  const service = new QuestionReviewService(createSampleCatalog());

  const res = service.rejectQuestion(
    'q_test_sci_01',
    { reviewerId: 'rev_bob', reason: 'Factual inaccuracy in prompt' },
    'content_admin'
  );

  assert.equal(res.success, true);
  assert.equal(res.question.reviewStatus, 'rejected');
  assert.equal(res.question.active, false);
  assert.equal(res.question.rejectionReason, 'Factual inaccuracy in prompt');

  const history = service.getAuditHistory('q_test_sci_01', 'content_admin');
  assert.equal(history.length, 1);
  assert.equal(history[0].action, 'reject');
});

test('QuestionReviewService.correctQuestion creates version snapshot, bumps version, and validates schema', () => {
  const service = new QuestionReviewService(createSampleCatalog());

  // 1. Valid correction
  const res = service.correctQuestion(
    'q_test_sci_01',
    {
      prompt: 'Which cellular organelle is responsible for generating the majority of cellular ATP?',
      explanation: 'Mitochondria generate ATP via oxidative phosphorylation.',
    },
    { reviewerId: 'rev_carol', note: 'Clarified scientific phrasing' },
    'super_admin'
  );

  assert.equal(res.success, true);
  assert.equal(res.newVersion, 2);
  assert.equal(res.question.version, 2);
  assert.equal(res.question.lastCorrectedBy, 'rev_carol');
  assert.match(res.question.prompt, /ATP/);

  // Version history preserves version 1 snapshot
  const versions = service.getVersions('q_test_sci_01', 'super_admin');
  assert.equal(versions.length, 1);
  assert.equal(versions[0].version, 1);
  assert.match(versions[0].snapshot.prompt, /powerhouse/);

  // 2. Invalid correction rejected by validation
  assert.throws(
    () => service.correctQuestion('q_test_sci_01', { choices: [] }, { reviewerId: 'rev_carol' }, 'super_admin'),
    { message: /Correction failed validation/ }
  );
});

test('QuestionReviewService.retireQuestion deactivates question while preserving data for audit integrity', () => {
  const service = new QuestionReviewService(createSampleCatalog());

  const res = service.retireQuestion(
    'q_test_sci_01',
    { reviewerId: 'rev_dana', reason: 'Curriculum rotation updated for 2027 season' },
    'content_admin'
  );

  assert.equal(res.success, true);
  assert.equal(res.question.reviewStatus, 'retired');
  assert.equal(res.question.active, false);
  assert.equal(res.question.retirementReason, 'Curriculum rotation updated for 2027 season');

  // Verify it can still be fetched in detail for past student audit trails
  const details = service.getQuestionDetails('q_test_sci_01', 'content_admin');
  assert.equal(details.question.id, 'q_test_sci_01');
  assert.equal(details.question.active, false);
  assert.equal(details.question.reviewStatus, 'retired');
});
