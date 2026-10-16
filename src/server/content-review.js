// src/server/content-review.js — Admin Content Review Workflow
// Implements server-authoritative role enforcement, question inspection,
// rights gate verification, duplicate detection aids, corrections/versioning,
// and retirement from active student rotation.

import { validateQuestion, detectDuplicates } from '../data/question-schema.js';

export const ADMIN_ROLES = ['reviewer', 'content_admin', 'super_admin'];

/**
 * Checks if a role is authorized for admin content operations.
 * @param {string} role
 * @returns {boolean}
 */
export function isAuthorizedReviewer(role) {
  return typeof role === 'string' && ADMIN_ROLES.includes(role.toLowerCase());
}

/**
 * Service orchestrating question review, rights checking, versioning, and retirement.
 */
export class QuestionReviewService {
  constructor(catalog = [], db = null) {
    this.catalog = catalog;
    this.db = db;
    this.auditLogs = [];
    this.versions = new Map();
  }

  /**
   * Enforces server-side reviewer authorization.
   * @param {string} role
   */
  authorize(role) {
    if (!isAuthorizedReviewer(role)) {
      const err = new Error('Forbidden: Requires authorized reviewer role');
      err.status = 403;
      throw err;
    }
  }

  /**
   * Lists questions matching filters with duplicate warnings.
   * Only accessible to authorized reviewers.
   * @param {object} filters
   * @param {string} role
   * @returns {Array<object>}
   */
  listQuestions(filters = {}, role) {
    this.authorize(role);

    return this.catalog
      .filter((q) => {
        if (filters.subject && q.subject !== filters.subject) return false;
        if (filters.gradeBand && q.gradeBand !== filters.gradeBand) return false;
        if (filters.reviewStatus && q.reviewStatus !== filters.reviewStatus) return false;
        if (filters.rightsStatus && q.rightsStatus !== filters.rightsStatus) return false;
        if (filters.active !== undefined && Boolean(q.active) !== Boolean(filters.active)) return false;
        return true;
      })
      .map((q) => {
        const others = this.catalog.filter((other) => other.id !== q.id);
        const dupCheck = detectDuplicates(q, others);
        return {
          ...q,
          duplicateWarnings: dupCheck.warnings,
          versionCount: (this.versions.get(q.id) || []).length + 1,
        };
      });
  }

  /**
   * Retrieves full details for a single question including answer key and audit history.
   * @param {string} questionId
   * @param {string} role
   * @returns {object}
   */
  getQuestionDetails(questionId, role) {
    this.authorize(role);

    const question = this.catalog.find((q) => q.id === questionId);
    if (!question) {
      const err = new Error(`Question '${questionId}' not found`);
      err.status = 404;
      throw err;
    }

    const others = this.catalog.filter((other) => other.id !== question.id);
    const dupCheck = detectDuplicates(question, others);

    return {
      question,
      duplicateWarnings: dupCheck.warnings,
      auditHistory: this.getAuditHistory(questionId, role),
      versions: this.getVersions(questionId, role),
    };
  }

  /**
   * Approves a question for active rotation.
   * Enforces rights status check: unapproved rights cannot enter production.
   * @param {string} questionId
   * @param {{ reviewerId: string, note?: string }} options
   * @param {string} role
   * @returns {{ success: boolean, question: object }}
   */
  approveQuestion(questionId, { reviewerId = 'anonymous_reviewer', note = '' } = {}, role) {
    this.authorize(role);

    const question = this.catalog.find((q) => q.id === questionId);
    if (!question) {
      const err = new Error(`Question '${questionId}' not found`);
      err.status = 404;
      throw err;
    }

    // Rights Gate Enforcement
    const effectiveRights = question.rightsStatus || (question.source && question.source.rightsStatus);
    if (effectiveRights !== 'approved') {
      const err = new Error(`Cannot approve question '${questionId}': rights status is '${effectiveRights}', not 'approved'`);
      err.status = 400;
      throw err;
    }

    const prevState = {
      reviewStatus: question.reviewStatus,
      active: question.active,
      version: question.version,
    };

    question.reviewStatus = 'approved';
    question.active = true;
    question.reviewedAt = Date.now();
    question.reviewedBy = reviewerId;

    this.recordAudit({
      questionId,
      reviewerId,
      action: 'approve',
      previousState: prevState,
      newState: {
        reviewStatus: 'approved',
        active: true,
        version: question.version,
      },
      note: note || 'Approved by reviewer for active student rotation',
    });

    return { success: true, question };
  }

  /**
   * Rejects a question and removes it from active rotation.
   * @param {string} questionId
   * @param {{ reviewerId: string, reason?: string }} options
   * @param {string} role
   * @returns {{ success: boolean, question: object }}
   */
  rejectQuestion(questionId, { reviewerId = 'anonymous_reviewer', reason = '' } = {}, role) {
    this.authorize(role);

    const question = this.catalog.find((q) => q.id === questionId);
    if (!question) {
      const err = new Error(`Question '${questionId}' not found`);
      err.status = 404;
      throw err;
    }

    const prevState = {
      reviewStatus: question.reviewStatus,
      active: question.active,
      version: question.version,
    };

    question.reviewStatus = 'rejected';
    question.active = false;
    question.rejectedAt = Date.now();
    question.rejectedBy = reviewerId;
    question.rejectionReason = reason || 'Rejected during content review';

    this.recordAudit({
      questionId,
      reviewerId,
      action: 'reject',
      previousState: prevState,
      newState: {
        reviewStatus: 'rejected',
        active: false,
        version: question.version,
      },
      note: reason || 'Rejected by content reviewer',
    });

    return { success: true, question };
  }

  /**
   * Corrects a question, archives previous version, and bumps version.
   * @param {string} questionId
   * @param {object} updates
   * @param {{ reviewerId: string, note?: string }} options
   * @param {string} role
   * @returns {{ success: boolean, question: object, newVersion: number }}
   */
  correctQuestion(questionId, updates = {}, { reviewerId = 'anonymous_reviewer', note = '' } = {}, role) {
    this.authorize(role);

    const question = this.catalog.find((q) => q.id === questionId);
    if (!question) {
      const err = new Error(`Question '${questionId}' not found`);
      err.status = 404;
      throw err;
    }

    // Archive current snapshot
    this.saveVersionSnapshot(question, reviewerId);

    const prevState = {
      prompt: question.prompt,
      choices: question.choices,
      answerKey: question.answerKey,
      explanation: question.explanation,
      version: question.version,
    };

    // Candidate updated question
    const candidate = {
      ...question,
      ...updates,
      id: question.id, // ID must remain stable
      version: (question.version || 1) + 1,
      lastCorrectedAt: Date.now(),
      lastCorrectedBy: reviewerId,
    };

    // Validate candidate schema
    const validation = validateQuestion(candidate);
    if (!validation.valid) {
      const err = new Error(`Correction failed validation: ${validation.errors.join('; ')}`);
      err.status = 400;
      throw err;
    }

    // Apply updates to existing question reference
    Object.assign(question, candidate);

    this.recordAudit({
      questionId,
      reviewerId,
      action: 'correct',
      previousState: prevState,
      newState: {
        prompt: question.prompt,
        answerKey: question.answerKey,
        version: question.version,
      },
      note: note || `Corrected by ${reviewerId}; bumped to version ${question.version}`,
    });

    return { success: true, question, newVersion: question.version };
  }

  /**
   * Retires a question from active rotation while preserving ID and attempt audits.
   * @param {string} questionId
   * @param {{ reviewerId: string, reason?: string }} options
   * @param {string} role
   * @returns {{ success: boolean, question: object }}
   */
  retireQuestion(questionId, { reviewerId = 'anonymous_reviewer', reason = '' } = {}, role) {
    this.authorize(role);

    const question = this.catalog.find((q) => q.id === questionId);
    if (!question) {
      const err = new Error(`Question '${questionId}' not found`);
      err.status = 404;
      throw err;
    }

    const prevState = {
      reviewStatus: question.reviewStatus,
      active: question.active,
      version: question.version,
    };

    question.reviewStatus = 'retired';
    question.active = false;
    question.retiredAt = Date.now();
    question.retiredBy = reviewerId;
    question.retirementReason = reason || 'Retired from active curriculum rotation';

    this.recordAudit({
      questionId,
      reviewerId,
      action: 'retire',
      previousState: prevState,
      newState: {
        reviewStatus: 'retired',
        active: false,
        version: question.version,
      },
      note: reason || 'Question retired from active rotation',
    });

    return { success: true, question };
  }

  /**
   * Saves a historical version snapshot before edits.
   * @param {object} question
   * @param {string} reviewerId
   */
  saveVersionSnapshot(question, reviewerId) {
    const list = this.versions.get(question.id) || [];
    list.push({
      version: question.version || 1,
      snapshot: JSON.parse(JSON.stringify(question)),
      createdAt: Date.now(),
      createdBy: reviewerId,
    });
    this.versions.set(question.id, list);
  }

  /**
   * Retrieves version history for a question.
   * @param {string} questionId
   * @param {string} role
   * @returns {Array<object>}
   */
  getVersions(questionId, role) {
    this.authorize(role);
    return this.versions.get(questionId) || [];
  }

  /**
   * Records an immutable review audit log entry.
   * @param {object} record
   */
  recordAudit(record) {
    const entry = {
      id: `rev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      createdAt: Date.now(),
      ...record,
    };
    this.auditLogs.push(entry);
    return entry;
  }

  /**
   * Retrieves audit logs for a question.
   * @param {string} questionId
   * @param {string} role
   * @returns {Array<object>}
   */
  getAuditHistory(questionId, role) {
    this.authorize(role);
    return this.auditLogs.filter((log) => log.questionId === questionId);
  }
}
