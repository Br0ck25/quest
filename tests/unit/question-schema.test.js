// tests/unit/question-schema.test.js — Unit tests for Question Schema, Rights Gate, and Import Validation
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateQuestion,
  detectDuplicates,
  importQuestions,
  updateQuestionRights,
  normalizeText,
  computeSimilarity,
} from '../../src/data/question-schema.js';
import { SYNTHETIC_QUESTIONS } from '../../src/data/questions.js';

describe('Question Schema & Rights Gate Validation', () => {
  const sampleValidQuestion = {
    id: 'test_sci_001',
    subject: 'science',
    conceptIds: ['science.ecosystems.photosynthesis'],
    gradeBand: '6-8',
    prompt: 'During photosynthesis in plant cells, which organelle captures radiant light energy to synthesize glucose?',
    choices: [
      { id: 'a', text: 'Mitochondrion' },
      { id: 'b', text: 'Chloroplast' },
      { id: 'c', text: 'Ribosome' },
      { id: 'd', text: 'Endoplasmic reticulum' },
    ],
    answerKey: 'b',
    explanation: 'Chloroplasts contain chlorophyll, which absorbs sunlight to power sugar synthesis.',
    difficulty: 1,
    source: { type: 'synthetic', author: 'QUEST: KY Curriculum Team', license: 'CC-BY-4.0', rightsStatus: 'approved' },
    rightsStatus: 'approved',
    reviewStatus: 'approved',
    active: true,
    version: 1,
  };

  it('validates all existing synthetic curriculum questions cleanly', () => {
    for (const q of SYNTHETIC_QUESTIONS) {
      const res = validateQuestion(q);
      assert.equal(res.valid, true, `Question ${q.id} failed validation: ${res.errors.join(', ')}`);
      assert.equal(res.rightsStatus, 'approved');
    }
  });

  it('validates a conformant question with zero errors', () => {
    const res = validateQuestion(sampleValidQuestion);
    assert.equal(res.valid, true);
    assert.equal(res.errors.length, 0);
    assert.equal(res.rightsStatus, 'approved');
  });

  it('rejects question missing stable id or invalid id format', () => {
    const resNoId = validateQuestion({ ...sampleValidQuestion, id: '' });
    assert.equal(resNoId.valid, false);
    assert.ok(resNoId.errors.some((e) => e.includes('id must be')));

    const resBadChars = validateQuestion({ ...sampleValidQuestion, id: 'bad id with spaces!' });
    assert.equal(resBadChars.valid, false);
  });

  it('rejects invalid or unapproved subject area', () => {
    const res = validateQuestion({ ...sampleValidQuestion, subject: 'astrology' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('subject must be one of')));
  });

  it('rejects empty conceptIds', () => {
    const res = validateQuestion({ ...sampleValidQuestion, conceptIds: [] });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('conceptIds must be a non-empty array')));
  });

  it('rejects invalid gradeBand', () => {
    const res = validateQuestion({ ...sampleValidQuestion, gradeBand: 'high-school' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('gradeBand must be one of')));
  });

  it('rejects missing or too short prompt', () => {
    const res = validateQuestion({ ...sampleValidQuestion, prompt: 'Short?' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes('prompt must be a string with at least 10 characters')));
  });

  it('rejects fewer than 2 choices or duplicate choice ids', () => {
    const resTooFew = validateQuestion({
      ...sampleValidQuestion,
      choices: [{ id: 'a', text: 'Only one' }],
    });
    assert.equal(resTooFew.valid, false);

    const resDupChoice = validateQuestion({
      ...sampleValidQuestion,
      choices: [
        { id: 'a', text: 'Choice A' },
        { id: 'a', text: 'Choice A duplicate' },
      ],
    });
    assert.equal(resDupChoice.valid, false);
    assert.ok(resDupChoice.errors.some((e) => e.includes("Duplicate choice id 'a'")));
  });

  it('rejects answerKey that does not match any valid choice id', () => {
    const res = validateQuestion({ ...sampleValidQuestion, answerKey: 'z' });
    assert.equal(res.valid, false);
    assert.ok(res.errors.some((e) => e.includes("answerKey 'z' does not match any valid choice id")));
  });

  it('rejects missing source/provenance or unverified origin', () => {
    const resNoSource = validateQuestion({ ...sampleValidQuestion, source: null });
    assert.equal(resNoSource.valid, false);
    assert.ok(resNoSource.errors.some((e) => e.includes('source or provenance object is required')));

    const resNoAuthor = validateQuestion({
      ...sampleValidQuestion,
      source: { type: 'synthetic' },
    });
    assert.equal(resNoAuthor.valid, false);
    assert.ok(resNoAuthor.errors.some((e) => e.includes('source must identify an author')));
  });

  it('enforces Rights Gate: rejects active questions with unapproved rights status', () => {
    const resPendingActive = validateQuestion({
      ...sampleValidQuestion,
      rightsStatus: 'pending',
      active: true,
    });
    assert.equal(resPendingActive.valid, false);
    assert.ok(resPendingActive.errors.some((e) => e.includes('Rights Gate Violation')));

    const resRejectedActive = validateQuestion({
      ...sampleValidQuestion,
      rightsStatus: 'rejected',
      active: true,
    });
    assert.equal(resRejectedActive.valid, false);
    assert.ok(resRejectedActive.errors.some((e) => e.includes('Rights Gate Violation')));
  });

  it('allows pending questions to exist if inactive (staged for review)', () => {
    const resPendingInactive = validateQuestion({
      ...sampleValidQuestion,
      rightsStatus: 'pending',
      active: false,
    });
    assert.equal(resPendingInactive.valid, true);
    assert.equal(resPendingInactive.rightsStatus, 'pending');
  });
});

describe('Duplicate Detection Review Aid', () => {
  it('normalizes text by stripping punctuation and casing', () => {
    assert.equal(normalizeText('  What is... Newton\'s Law?! '), 'what is newtons law');
  });

  it('calculates token similarity accurately', () => {
    const textA = 'What is the capital of Kentucky?';
    const textB = 'What is the capital of Kentucky?';
    assert.equal(computeSimilarity(textA, textB), 1);

    const textC = 'What is the state capital of the commonwealth of Kentucky?';
    const sim = computeSimilarity(textA, textC);
    assert.ok(sim > 0.5 && sim < 1.0);

    const textD = 'Completely unrelated string about quantum mechanics';
    assert.equal(computeSimilarity(textA, textD), 0);
  });

  it('flags exact duplicate prompt warnings', () => {
    const existing = [
      { id: 'q_001', prompt: 'In 1792, Kentucky was admitted to the Union as which numbered state?' },
    ];
    const candidate = {
      id: 'q_candidate',
      prompt: 'In 1792, Kentucky was admitted to the Union as which numbered state?',
    };

    const result = detectDuplicates(candidate, existing);
    assert.equal(result.isDuplicateId, false);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0].similarity, 1.0);
    assert.equal(result.warnings[0].matchedQuestionId, 'q_001');
  });

  it('flags high semantic similarity warnings as a review aid', () => {
    const existing = [
      { id: 'q_001', prompt: 'What is the prime factorization of 72?' },
    ];
    const candidate = {
      id: 'q_candidate',
      prompt: 'Calculate the prime factorization of the number 72.',
    };

    const result = detectDuplicates(candidate, existing, 0.5);
    assert.ok(result.warnings.length >= 1);
    assert.equal(result.warnings[0].matchedQuestionId, 'q_001');
  });
});

describe('Staging & Import Workflow', () => {
  const sampleBatch = [
    {
      id: 'batch_math_001',
      subject: 'math',
      conceptIds: ['math.algebra'],
      gradeBand: '6-8',
      prompt: 'Solve for y in the equation 2y + 6 = 18.',
      choices: [
        { id: 'a', text: 'y = 4' },
        { id: 'b', text: 'y = 6' },
        { id: 'c', text: 'y = 8' },
        { id: 'd', text: 'y = 12' },
      ],
      answerKey: 'b',
      explanation: 'Subtract 6 from 18 to get 12, then divide by 2 to find y = 6.',
      difficulty: 1,
      source: { type: 'original', author: 'Dr. Jane Math', rightsStatus: 'approved' },
      rightsStatus: 'approved',
      active: true,
      version: 1,
    },
    {
      id: 'batch_sci_002',
      subject: 'science',
      conceptIds: ['science.earth'],
      gradeBand: '6-8',
      prompt: 'What sedimentary rock is most commonly dissolved to form karst sinkholes?',
      choices: [
        { id: 'a', text: 'Limestone' },
        { id: 'b', text: 'Sandstone' },
        { id: 'c', text: 'Shale' },
        { id: 'd', text: 'Basalt' },
      ],
      answerKey: 'a',
      explanation: 'Limestone consists primarily of calcium carbonate, which dissolves in weak carbonic acid.',
      difficulty: 2,
      source: { type: 'original', author: 'Dr. Karst Geologist', rightsStatus: 'approved' },
      rightsStatus: 'approved',
      active: true,
      version: 1,
    },
  ];

  it('successfully imports conformant batch into catalog', () => {
    const res = importQuestions(sampleBatch, []);
    assert.equal(res.success, true);
    assert.equal(res.imported.length, 2);
    assert.equal(res.rejected.length, 0);
  });

  it('rejects batch items with duplicate IDs within the same batch', () => {
    const dupBatch = [
      sampleBatch[0],
      { ...sampleBatch[1], id: sampleBatch[0].id },
    ];

    const res = importQuestions(dupBatch, []);
    assert.equal(res.success, false);
    assert.equal(res.imported.length, 1);
    assert.equal(res.rejected.length, 1);
    assert.ok(res.rejected[0].errors[0].includes('Duplicate question ID'));
  });

  it('rejects items with duplicate ID matching existing catalog', () => {
    const res = importQuestions([sampleBatch[0]], [sampleBatch[0]]);
    assert.equal(res.success, false);
    assert.equal(res.imported.length, 0);
    assert.equal(res.rejected.length, 1);
  });

  it('rejects items in batch that fail Rights Gate', () => {
    const unapprovedBatch = [
      {
        ...sampleBatch[0],
        id: 'unapproved_001',
        rightsStatus: 'pending',
        active: true,
      },
    ];

    const res = importQuestions(unapprovedBatch, []);
    assert.equal(res.success, false);
    assert.equal(res.rejected.length, 1);
    assert.ok(res.rejected[0].errors.some((e) => e.includes('Rights Gate Violation')));
  });

  it('updateQuestionRights updates status and deactivates revoked questions', () => {
    const activeQuestion = { ...sampleBatch[0] };
    assert.equal(activeQuestion.active, true);

    const revoked = updateQuestionRights(activeQuestion, 'rejected', 'ComplianceOfficer');
    assert.equal(revoked.rightsStatus, 'rejected');
    assert.equal(revoked.active, false);
    assert.equal(revoked.version, 2);
    assert.ok(revoked.reviewerNotes.includes('ComplianceOfficer'));
  });
});
