// src/server/db.js — Relational Persistence Layer (D1 Compatible)
// Provides unified interface for Cloudflare D1 database bindings with in-memory fallback for local dev & testing.
// Parameterized SQL queries to prevent injection; zero PII storage.

import { createInitialMasteryRecord, calculateNextReview, getDueReviews } from '../data/spaced-repetition.js';
import {
  calculateQuestionReward,
  calculateLevelFromXp,
  xpForLevel,
  COSMETIC_CATALOG,
  STARTER_COMPANION,
  ECONOMY_CONFIG,
} from '../data/progression.js';
import { STARTER_QUESTS } from '../data/game-data.js';

function parseJsonArray(str) {
  try {
    return JSON.parse(str || '[]');
  } catch {
    return [];
  }
}

export class DatabaseAdapter {
  constructor(d1Binding = null) {
    this.d1 = d1Binding;
    // In-memory relational tables for local dev / testing fallback
    this.memory = {
      users: new Map(),
      attempts: new Map(),
      mastery: new Map(), // key: `${userId}:${conceptId}`
      idempotency: new Map(),
      progression: new Map(), // key: userId
      walletLedger: new Map(), // key: transactionId
      userInventory: new Map(), // key: `${userId}:${itemId}`
      userQuests: new Map(), // key: `${userId}:${questId}`
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
   * @returns {Promise<{ recorded: boolean, duplicate: boolean, attemptId: string }>}
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
        const existing = await this.d1.prepare('SELECT id FROM user_question_attempts WHERE idempotency_key = ?').bind(idempotencyKey).first();
        if (existing) {
          return { recorded: true, duplicate: true, attemptId: existing.id };
        }
      }

      await this.d1
        .prepare('INSERT INTO user_question_attempts (id, user_id, question_id, concept_id, selected_choice_id, is_correct, assisted, created_at, session_id, idempotency_key) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(id, userId, questionId, conceptId, selectedChoiceId, isCorrect ? 1 : 0, assisted ? 1 : 0, createdAt, sessionId, idempotencyKey)
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
      const row = await this.d1.prepare('SELECT * FROM user_concept_mastery WHERE user_id = ? AND concept_id = ?').bind(userId, conceptId).first();
      if (!row) {
        return createInitialMasteryRecord(userId, conceptId);
      }
      return {
        userId: row.user_id,
        conceptId: row.concept_id,
        stage: row.stage,
        intervalDays: row.interval_days,
        dueAt: row.due_at,
        consecutiveCorrect: row.consecutive_correct,
        distinctQuestionsCorrect: parseJsonArray(row.distinct_questions_correct),
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
        .prepare('INSERT INTO user_concept_mastery (user_id, concept_id, stage, interval_days, due_at, consecutive_correct, distinct_questions_correct, is_mastered, last_attempt_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT (user_id, concept_id) DO UPDATE SET stage = excluded.stage, interval_days = excluded.interval_days, due_at = excluded.due_at, consecutive_correct = excluded.consecutive_correct, distinct_questions_correct = excluded.distinct_questions_correct, is_mastered = excluded.is_mastered, last_attempt_at = excluded.last_attempt_at')
        .bind(record.userId, record.conceptId, record.stage, record.intervalDays, record.dueAt, record.consecutiveCorrect, distinctJson, record.isMastered ? 1 : 0, record.lastAttemptAt)
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
      const rows = await this.d1.prepare('SELECT * FROM user_concept_mastery WHERE user_id = ?').bind(userId).all();
      return (rows.results || []).map((row) => ({
        userId: row.user_id,
        conceptId: row.concept_id,
        stage: row.stage,
        intervalDays: row.interval_days,
        dueAt: row.due_at,
        consecutiveCorrect: row.consecutive_correct,
        distinctQuestionsCorrect: parseJsonArray(row.distinct_questions_correct),
        isMastered: Boolean(row.is_mastered),
        lastAttemptAt: row.last_attempt_at,
      }));
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
   * Counts prior correct attempts for this user on this question within a time window.
   * Used for anti-farming diminishing return calculations.
   */
  async getPriorCorrectAttemptsInWindow(userId, questionId, windowMs = ECONOMY_CONFIG.SAME_DAY_COOLDOWN_MS, now = Date.now()) {
    const cutoff = now - windowMs;

    if (this.d1) {
      const row = await this.d1
        .prepare('SELECT COUNT(*) as count FROM user_question_attempts WHERE user_id = ? AND question_id = ? AND is_correct = 1 AND created_at >= ?')
        .bind(userId, questionId, cutoff)
        .first();
      return row ? Number(row.count) : 0;
    }

    let count = 0;
    for (const attempt of this.memory.attempts.values()) {
      if (
        attempt.user_id === userId &&
        attempt.question_id === questionId &&
        attempt.is_correct === 1 &&
        attempt.created_at >= cutoff
      ) {
        count++;
      }
    }
    return count;
  }

  /**
   * Calculates wallet coin balance for a user from the ledger.
   */
  async getWalletBalance(userId) {
    if (this.d1) {
      const row = await this.d1.prepare('SELECT COALESCE(SUM(amount_delta), 0) as balance FROM wallet_ledger WHERE user_id = ?').bind(userId).first();
      return row ? Number(row.balance) : 0;
    }

    let balance = 0;
    let hasTransactions = false;
    for (const tx of this.memory.walletLedger.values()) {
      if (tx.user_id === userId) {
        hasTransactions = true;
        balance += tx.amount_delta;
      }
    }

    // Default starting balance of 50 coins for fresh profiles
    if (!hasTransactions) {
      const starterTxId = 'tx_start_' + userId;
      this.memory.walletLedger.set(starterTxId, {
        id: starterTxId,
        user_id: userId,
        amount_delta: 50,
        reason: 'starter_grant',
        idempotency_key: 'starter_' + userId,
        created_at: Date.now(),
      });
      return 50;
    }

    return balance;
  }

  /**
   * Adds an immutable ledger transaction with anti-negative balance constraint.
   */
  async addWalletTransaction(params) {
    const { userId, amountDelta, reason, idempotencyKey = null, now = Date.now() } = params;

    if (idempotencyKey) {
      if (this.d1) {
        const existing = await this.d1.prepare('SELECT id FROM wallet_ledger WHERE idempotency_key = ?').bind(idempotencyKey).first();
        if (existing) {
          const current = await this.getWalletBalance(userId);
          return { success: true, duplicate: true, currentBalance: current, transactionId: existing.id };
        }
      } else {
        for (const tx of this.memory.walletLedger.values()) {
          if (tx.idempotency_key === idempotencyKey) {
            const current = await this.getWalletBalance(userId);
            return { success: true, duplicate: true, currentBalance: current, transactionId: tx.id };
          }
        }
      }
    }

    const currentBalance = await this.getWalletBalance(userId);
    if (currentBalance + amountDelta < 0) {
      return { success: false, error: 'Insufficient funds: transaction would produce a negative balance', currentBalance };
    }

    const txId = 'tx_' + Math.random().toString(36).substring(2, 10);
    const newBalance = currentBalance + amountDelta;

    if (this.d1) {
      await this.d1
        .prepare('INSERT INTO wallet_ledger (id, user_id, amount_delta, reason, idempotency_key, created_at) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(txId, userId, amountDelta, reason, idempotencyKey, now)
        .run();
    } else {
      this.memory.walletLedger.set(txId, {
        id: txId,
        user_id: userId,
        amount_delta: amountDelta,
        reason,
        idempotency_key: idempotencyKey,
        created_at: now,
      });
    }

    return { success: true, duplicate: false, newBalance, transactionId: txId };
  }

  /**
   * Fetches user progression (XP, Level, Companion, and Coins).
   */
  async getProgression(userId) {
    const coins = await this.getWalletBalance(userId);
    let record = null;

    if (this.d1) {
      record = await this.d1.prepare('SELECT * FROM user_progression WHERE user_id = ?').bind(userId).first();
    } else {
      record = this.memory.progression.get(userId);
    }

    if (!record) {
      const now = Date.now();
      const initial = { user_id: userId, xp: 0, level: 1, equipped_companion_id: STARTER_COMPANION.id, updated_at: now };

      if (this.d1) {
        await this.d1
          .prepare('INSERT INTO user_progression (user_id, xp, level, equipped_companion_id, updated_at) VALUES (?, ?, ?, ?, ?)')
          .bind(userId, 0, 1, STARTER_COMPANION.id, now)
          .run();
      } else {
        this.memory.progression.set(userId, initial);
      }
      record = initial;
      await this.grantStarterCompanion(userId, now);
    }

    return {
      userId,
      xp: record.xp,
      level: record.level,
      coins,
      equippedCompanionId: record.equipped_companion_id,
      nextLevelXp: xpForLevel(record.level + 1),
    };
  }

  /**
   * Grants starter companion to user inventory if not already present.
   */
  async grantStarterCompanion(userId, now = Date.now()) {
    const companionId = STARTER_COMPANION.id;
    if (this.d1) {
      await this.d1
        .prepare('INSERT OR IGNORE INTO user_inventory (user_id, item_id, acquired_at, equipped) VALUES (?, ?, ?, 1)')
        .bind(userId, companionId, now)
        .run();
    } else {
      const key = `${userId}:${companionId}`;
      if (!this.memory.userInventory.has(key)) {
        this.memory.userInventory.set(key, { user_id: userId, item_id: companionId, acquired_at: now, equipped: 1 });
      }
    }
  }

  /**
   * Adds Adventure XP to user, recalculating level.
   */
  async addXp(userId, amount, now = Date.now()) {
    const progression = await this.getProgression(userId);
    const newXp = progression.xp + Math.max(0, amount);
    const newLevel = calculateLevelFromXp(newXp);
    const levelUp = newLevel > progression.level;

    if (this.d1) {
      await this.d1.prepare('UPDATE user_progression SET xp = ?, level = ?, updated_at = ? WHERE user_id = ?').bind(newXp, newLevel, now, userId).run();
    } else {
      this.memory.progression.set(userId, {
        user_id: userId,
        xp: newXp,
        level: newLevel,
        equipped_companion_id: progression.equippedCompanionId,
        updated_at: now,
      });
    }

    return { newXp, newLevel, levelUp };
  }

  /**
   * Fetches user inventory populated with cosmetic catalog details.
   */
  async getUserInventory(userId) {
    await this.grantStarterCompanion(userId);

    let rows = [];
    if (this.d1) {
      const res = await this.d1.prepare('SELECT * FROM user_inventory WHERE user_id = ?').bind(userId).all();
      rows = res.results || [];
    } else {
      for (const [key, item] of this.memory.userInventory.entries()) {
        if (key.startsWith(`${userId}:`)) {
          rows.push({ ...item });
        }
      }
    }

    return rows.map((row) => {
      const catalogItem = COSMETIC_CATALOG.find((c) => c.id === row.item_id) || {
        id: row.item_id,
        name: row.item_id,
        type: 'artifact',
        slot: 'relic',
        icon: 'trophy',
      };
      return {
        ...catalogItem,
        equipped: Boolean(row.equipped),
        acquiredAt: row.acquired_at,
      };
    });
  }

  /**
   * Equips or unequips an owned cosmetic item.
   */
  async equipItem(userId, itemId, slot) {
    const inventory = await this.getUserInventory(userId);
    const item = inventory.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, error: 'Item not owned in inventory' };
    }

    if (this.d1) {
      const sameSlotItems = inventory.filter((i) => i.slot === slot && i.equipped);
      for (const prev of sameSlotItems) {
        await this.d1.prepare('UPDATE user_inventory SET equipped = 0 WHERE user_id = ? AND item_id = ?').bind(userId, prev.id).run();
      }
      await this.d1.prepare('UPDATE user_inventory SET equipped = 1 WHERE user_id = ? AND item_id = ?').bind(userId, itemId).run();
      if (slot === 'companion') {
        await this.d1.prepare('UPDATE user_progression SET equipped_companion_id = ? WHERE user_id = ?').bind(itemId, userId).run();
      }
    } else {
      for (const [key, inv] of this.memory.userInventory.entries()) {
        if (key.startsWith(`${userId}:`)) {
          const cat = COSMETIC_CATALOG.find((c) => c.id === inv.item_id);
          if (cat && cat.slot === slot) {
            inv.equipped = 0;
          }
        }
      }
      const target = this.memory.userInventory.get(`${userId}:${itemId}`);
      if (target) target.equipped = 1;

      if (slot === 'companion') {
        const prog = this.memory.progression.get(userId);
        if (prog) prog.equipped_companion_id = itemId;
      }
    }

    return { success: true, equipped: true, itemId, slot };
  }

  /**
   * Purchases a cosmetic item from the catalog with in-game gold.
   */
  async purchaseCosmetic(params) {
    const { userId, itemId, idempotencyKey = null, now = Date.now() } = params;

    const catalogItem = COSMETIC_CATALOG.find((c) => c.id === itemId);
    if (!catalogItem) {
      return { success: false, error: 'Item not found in cosmetic catalog' };
    }

    const inventory = await this.getUserInventory(userId);
    if (inventory.some((i) => i.id === itemId)) {
      return { success: false, error: 'Item already owned in inventory' };
    }

    const txResult = await this.addWalletTransaction({
      userId,
      amountDelta: -catalogItem.cost,
      reason: 'purchase:' + itemId,
      idempotencyKey,
      now,
    });

    if (!txResult.success) {
      return { success: false, error: txResult.error || 'Insufficient coins' };
    }

    if (this.d1) {
      await this.d1.prepare('INSERT INTO user_inventory (user_id, item_id, acquired_at, equipped) VALUES (?, ?, ?, 0)').bind(userId, itemId, now).run();
    } else {
      this.memory.userInventory.set(`${userId}:${itemId}`, { user_id: userId, item_id: itemId, acquired_at: now, equipped: 0 });
    }

    return { success: true, purchasedItem: catalogItem, newBalance: txResult.newBalance };
  }

  /**
   * Claims quest completion rewards with strict idempotency and eligibility.
   */
  async claimQuestReward(params) {
    const { userId, questId, idempotencyKey = null, now = Date.now() } = params;

    const quest = STARTER_QUESTS.find((q) => q.id === questId);
    if (!quest) {
      return { success: false, error: 'Quest not found' };
    }

    if (this.d1) {
      const existing = await this.d1.prepare('SELECT claimed_at FROM user_quests WHERE user_id = ? AND quest_id = ?').bind(userId, questId).first();
      if (existing && existing.claimed_at) {
        return { success: false, error: 'Quest reward already claimed' };
      }
    } else {
      const existing = this.memory.userQuests.get(`${userId}:${questId}`);
      if (existing && existing.claimed_at) {
        return { success: false, error: 'Quest reward already claimed' };
      }
    }

    const xpResult = await this.addXp(userId, quest.rewardXp, now);
    const coinResult = await this.addWalletTransaction({
      userId,
      amountDelta: quest.rewardGold,
      reason: 'quest_reward:' + questId,
      idempotencyKey: idempotencyKey || `${userId}_${questId}_claim`,
      now,
    });

    if (this.d1) {
      await this.d1
        .prepare("INSERT INTO user_quests (user_id, quest_id, status, progress, claimed_at) VALUES (?, ?, 'completed', 'Completed', ?) ON CONFLICT (user_id, quest_id) DO UPDATE SET status = 'completed', claimed_at = excluded.claimed_at")
        .bind(userId, questId, now)
        .run();
    } else {
      this.memory.userQuests.set(`${userId}:${questId}`, { user_id: userId, quest_id: questId, status: 'completed', progress: 'Completed', claimed_at: now });
    }

    return {
      success: true,
      questId,
      rewardXp: quest.rewardXp,
      rewardGold: quest.rewardGold,
      xp: xpResult.newXp,
      level: xpResult.newLevel,
      levelUp: xpResult.levelUp,
      coins: coinResult.newBalance,
    };
  }

  /**
   * Evaluates and records a question answer, updating spaced repetition review, mastery,
   * and server-authoritative anti-farming XP/coin rewards in a single flow.
   */
  async processAnswerAttempt(params) {
    const { userId, question, selectedChoiceId, assisted = false, sessionId = null, idempotencyKey = null, now = Date.now() } = params;

    const isCorrect = selectedChoiceId === question.answerKey;
    const conceptId = Array.isArray(question.conceptIds) && question.conceptIds.length > 0 ? question.conceptIds[0] : 'general';

    // 0. Compute prior attempts before inserting current attempt
    const priorCount = await this.getPriorCorrectAttemptsInWindow(userId, question.id, ECONOMY_CONFIG.SAME_DAY_COOLDOWN_MS, now);

    // 1. Record Attempt History with idempotency
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
    const updatedMastery = calculateNextReview(currentMastery, { isCorrect, assisted, questionId: question.id }, now);

    // 3. Persist updated mastery
    await this.saveConceptMastery(updatedMastery);

    // 4. Server-authoritative anti-farming rewards (only on non-duplicate attempts)
    let reward = { xp: 0, coins: 0, reason: 'duplicate' };
    let progressionResult = null;

    if (!attemptResult.duplicate) {
      reward = calculateQuestionReward({ isCorrect, assisted, priorCorrectCount24h: priorCount });

      if (reward.xp > 0) {
        progressionResult = await this.addXp(userId, reward.xp, now);
      }
      if (reward.coins > 0) {
        await this.addWalletTransaction({ userId, amountDelta: reward.coins, reason: 'answer_reward:' + question.id, now });
      }
    }

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
      reward: {
        xp: reward.xp,
        coins: reward.coins,
        reason: reward.reason,
        level: progressionResult ? progressionResult.newLevel : undefined,
        levelUp: progressionResult ? progressionResult.levelUp : false,
      },
    };
  }
}
