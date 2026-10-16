// src/data/question-schema.js — Question Schema, Rights Gate & Validation Workflow
// Specification: Governor's Cup Middle Grades (Grades 6–8) Curriculum.
// Mandate: Strict rights gating, provenance tracking, duplicate detection, and answer secrecy.

import { SUBJECTS, TARGET_GRADE_BAND } from './constants.js';

export const VALID_RIGHTS_STATUSES = ['approved', 'pending', 'rejected', 'in_review'];
export const VALID_REVIEW_STATUSES = ['draft', 'in_review', 'verified', 'approved', 'rejected', 'retired'];
export const VALID_PROVENANCE_TYPES = ['original', 'synthetic', 'authorized', 'public_domain'];
export const VALID_GRADE_BANDS = [TARGET_GRADE_BAND, '4-5', '6'];

const VALID_SUBJECT_IDS = new Set(Object.values(SUBJECTS).map((s) => s.id));

/**
 * Normalizes text for comparison and duplicate detection.
 * Removes punctuation, normalizes whitespace, and converts to lowercase.
 * @param {string} text
 * @returns {string}
 */
export function normalizeText(text) {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates token-level Jaccard similarity between two texts.
 * Used as a duplicate detection review aid.
 * @param {string} textA
 * @param {string} textB
 * @returns {number} Value between 0.0 and 1.0
 */
export function computeSimilarity(textA, textB) {
  const normA = normalizeText(textA);
  const normB = normalizeText(textB);
  if (!normA || !normB) return 0;
  if (normA === normB) return 1;

  const tokensA = new Set(normA.split(' '));
  const tokensB = new Set(normB.split(' '));

  let intersection = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersection++;
  }

  const union = new Set([...tokensA, ...tokensB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Validates a single question object against the Governor's Cup Question Schema and Rights Gate.
 * @param {object} q Question object to validate
 * @returns {{ valid: boolean, errors: string[], rightsStatus: string }}
 */
export function validateQuestion(q) {
  const errors = [];
  if (!q || typeof q !== 'object') {
    return { valid: false, errors: ['Question must be a non-null object'], rightsStatus: 'rejected' };
  }

  // 1. Stable ID
  if (!q.id || typeof q.id !== 'string' || !/^[a-zA-Z0-9_-]{3,64}$/.test(q.id)) {
    errors.push('id must be an alphanumeric string (3-64 chars, including _ and -)');
  }

  // 2. Subject Area
  if (!q.subject || !VALID_SUBJECT_IDS.has(q.subject)) {
    errors.push(`subject must be one of: ${Array.from(VALID_SUBJECT_IDS).join(', ')}`);
  }

  // 3. Concept IDs
  if (!Array.isArray(q.conceptIds) || q.conceptIds.length === 0 || !q.conceptIds.every((c) => typeof c === 'string' && c.length > 0)) {
    errors.push('conceptIds must be a non-empty array of concept strings');
  }

  // 4. Grade Band
  if (!q.gradeBand || !VALID_GRADE_BANDS.includes(q.gradeBand)) {
    errors.push(`gradeBand must be one of: ${VALID_GRADE_BANDS.join(', ')}`);
  }

  // 5. Question Prompt
  if (!q.prompt || typeof q.prompt !== 'string' || q.prompt.trim().length < 10) {
    errors.push('prompt must be a string with at least 10 characters');
  }

  // 6. Choice IDs and Text
  if (!Array.isArray(q.choices) || q.choices.length < 2) {
    errors.push('choices must be an array of at least 2 choice objects');
  } else {
    const choiceIds = new Set();
    for (let i = 0; i < q.choices.length; i++) {
      const choice = q.choices[i];
      if (!choice || typeof choice !== 'object') {
        errors.push(`choices[${i}] must be an object`);
        continue;
      }
      if (!choice.id || typeof choice.id !== 'string') {
        errors.push(`choices[${i}].id must be a non-empty string`);
      } else if (choiceIds.has(choice.id)) {
        errors.push(`Duplicate choice id '${choice.id}' found`);
      } else {
        choiceIds.add(choice.id);
      }
      if (!choice.text || typeof choice.text !== 'string' || choice.text.trim().length === 0) {
        errors.push(`choices[${i}].text must be a non-empty string`);
      }
    }

    // 7. Answer Key Integrity
    if (!q.answerKey || typeof q.answerKey !== 'string') {
      errors.push('answerKey must be specified as a choice ID string');
    } else if (!choiceIds.has(q.answerKey)) {
      errors.push(`answerKey '${q.answerKey}' does not match any valid choice id`);
    }
  }

  // 8. Explanation
  if (!q.explanation || typeof q.explanation !== 'string' || q.explanation.trim().length < 5) {
    errors.push('explanation must be a descriptive string (minimum 5 characters)');
  }

  // 9. Difficulty
  if (typeof q.difficulty !== 'number' || !Number.isInteger(q.difficulty) || q.difficulty < 1 || q.difficulty > 5) {
    errors.push('difficulty must be an integer between 1 and 5');
  }

  // 10. Source & Provenance
  const source = q.source || q.provenance;
  if (!source || typeof source !== 'object') {
    errors.push('source or provenance object is required to verify item rights and origins');
  } else {
    if (!source.type || !VALID_PROVENANCE_TYPES.includes(source.type)) {
      errors.push(`source.type must be one of: ${VALID_PROVENANCE_TYPES.join(', ')}`);
    }
    const hasRef = Boolean(source.author || source.reference || source.curriculumReference);
    if (!hasRef) {
      errors.push('source must identify an author, reference, or curriculumReference');
    }
  }

  // 11. Rights Status & Rights Gate
  const rightsStatus = q.rightsStatus || (source && source.rightsStatus) || 'pending';
  if (!VALID_RIGHTS_STATUSES.includes(rightsStatus)) {
    errors.push(`rightsStatus must be one of: ${VALID_RIGHTS_STATUSES.join(', ')}`);
  }

  // 12. Reviewer Status
  const reviewStatus = q.reviewStatus || q.reviewerStatus || 'draft';
  if (!VALID_REVIEW_STATUSES.includes(reviewStatus)) {
    errors.push(`reviewStatus must be one of: ${VALID_REVIEW_STATUSES.join(', ')}`);
  }

  // 13. Version
  if (q.version !== undefined && (typeof q.version !== 'number' || !Number.isInteger(q.version) || q.version < 1)) {
    errors.push('version must be a positive integer >= 1');
  }

  // 14. Active Status & Rights Gate Enforcement
  const active = q.active !== undefined ? Boolean(q.active) : false;
  if (active && rightsStatus !== 'approved') {
    errors.push(`Rights Gate Violation: Question cannot be active when rightsStatus is '${rightsStatus}'. Only 'approved' items may be active.`);
  }

  return {
    valid: errors.length === 0,
    errors,
    rightsStatus,
  };
}

/**
 * Duplicate detection review aid. Checks a question against existing items in a catalog.
 * @param {object} question Target question
 * @param {Array<object>} catalog Existing catalog of questions
 * @param {number} threshold Similarity threshold (default: 0.75)
 * @returns {{ isDuplicateId: boolean, warnings: Array<{ matchedQuestionId: string, similarity: number, reason: string }> }}
 */
export function detectDuplicates(question, catalog = [], threshold = 0.75) {
  const warnings = [];
  let isDuplicateId = false;

  for (const existing of catalog) {
    if (!existing) continue;

    // Check duplicate ID
    if (existing.id === question.id) {
      isDuplicateId = true;
      continue;
    }

    // Exact or near-duplicate prompt check
    const similarity = computeSimilarity(question.prompt || '', existing.prompt || '');
    if (similarity >= 1.0) {
      warnings.push({
        matchedQuestionId: existing.id,
        similarity: 1.0,
        reason: 'Identical normalized prompt detected',
      });
    } else if (similarity >= threshold) {
      warnings.push({
        matchedQuestionId: existing.id,
        similarity: Math.round(similarity * 100) / 100,
        reason: `High semantic prompt similarity (${Math.round(similarity * 100)}%) with ${existing.id}`,
      });
    }
  }

  return { isDuplicateId, warnings };
}

/**
 * Validates and imports a batch of questions through the staging and rights gate pipeline.
 * @param {Array<object>} batch Array of candidate question objects
 * @param {Array<object>} existingCatalog Array of already active/staged questions
 * @returns {{ success: boolean, imported: Array<object>, rejected: Array<{ question: object, errors: string[] }>, warnings: Array<{ questionId: string, warnings: any[] }> }}
 */
export function importQuestions(batch, existingCatalog = []) {
  if (!Array.isArray(batch)) {
    return {
      success: false,
      imported: [],
      rejected: [{ question: batch, errors: ['Batch must be an array of questions'] }],
      warnings: [],
    };
  }

  const imported = [];
  const rejected = [];
  const warnings = [];
  const workingCatalog = [...existingCatalog];
  const seenBatchIds = new Set();

  for (const item of batch) {
    if (!item || typeof item !== 'object') {
      rejected.push({ question: item, errors: ['Question entry must be an object'] });
      continue;
    }

    // Duplicate ID in current batch
    if (seenBatchIds.has(item.id)) {
      rejected.push({
        question: item,
        errors: [`Duplicate question ID '${item.id}' detected within current import batch`],
      });
      continue;
    }
    seenBatchIds.add(item.id);

    // Schema and Rights Gate Validation
    const validation = validateQuestion(item);
    if (!validation.valid) {
      rejected.push({ question: item, errors: validation.errors });
      continue;
    }

    // Duplicate Detection against working catalog
    const dupCheck = detectDuplicates(item, workingCatalog);
    if (dupCheck.isDuplicateId) {
      rejected.push({
        question: item,
        errors: [`Duplicate question ID '${item.id}' already exists in active question catalog`],
      });
      continue;
    }

    if (dupCheck.warnings.length > 0) {
      warnings.push({
        questionId: item.id,
        warnings: dupCheck.warnings,
      });
    }

    // Item passed validation and rights gate
    const normalized = {
      ...item,
      rightsStatus: item.rightsStatus || (item.source && item.source.rightsStatus) || 'approved',
      reviewStatus: item.reviewStatus || 'approved',
      version: item.version || 1,
      active: item.active !== undefined ? Boolean(item.active) : true,
    };

    imported.push(normalized);
    workingCatalog.push(normalized);
  }

  return {
    success: rejected.length === 0,
    imported,
    rejected,
    warnings,
  };
}

/**
 * Transitions a question's rights status through the human review pipeline.
 * Enforces that retiring or revoking rights automatically revokes active serving status.
 * @param {object} question Target question
 * @param {string} newRightsStatus 'approved' | 'pending' | 'rejected' | 'in_review'
 * @param {string} reviewerHandle Pseudonymous reviewer identifier
 * @returns {object} Updated question record
 */
export function updateQuestionRights(question, newRightsStatus, reviewerHandle = 'Reviewer') {
  if (!VALID_RIGHTS_STATUSES.includes(newRightsStatus)) {
    throw new Error(`Invalid rights status '${newRightsStatus}'. Allowed: ${VALID_RIGHTS_STATUSES.join(', ')}`);
  }

  const updated = {
    ...question,
    rightsStatus: newRightsStatus,
    version: (question.version || 1) + 1,
    reviewerNotes: `Rights status updated to '${newRightsStatus}' by ${reviewerHandle} on ${new Date().toISOString()}`,
  };

  if (newRightsStatus !== 'approved') {
    updated.active = false;
  }

  return updated;
}
