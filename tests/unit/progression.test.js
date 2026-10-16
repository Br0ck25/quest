// tests/unit/progression.test.js — Progression, Economy & Anti-Farming Unit Tests
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  xpForLevel,
  calculateLevelFromXp,
  calculateQuestionReward,
  COSMETIC_CATALOG,
  STARTER_COMPANION,
  simulateProgressionEconomy,
  LEVEL_CAP,
  ECONOMY_CONFIG,
} from '../../src/data/progression.js';
import { DatabaseAdapter } from '../../src/server/db.js';

describe('Level Curve & XP Progression', () => {
  test('xpForLevel calculates exact cumulative thresholds', () => {
    assert.equal(xpForLevel(1), 0);
    assert.equal(xpForLevel(2), 100);
    assert.equal(xpForLevel(3), 300);
    assert.equal(xpForLevel(4), 600);
    assert.equal(xpForLevel(5), 1000);
    assert.equal(xpForLevel(LEVEL_CAP), 50 * (LEVEL_CAP - 1) * LEVEL_CAP);
  });

  test('calculateLevelFromXp correctly maps XP to level', () => {
    assert.equal(calculateLevelFromXp(0), 1);
    assert.equal(calculateLevelFromXp(50), 1);
    assert.equal(calculateLevelFromXp(100), 2);
    assert.equal(calculateLevelFromXp(299), 2);
    assert.equal(calculateLevelFromXp(300), 3);
    assert.equal(calculateLevelFromXp(599), 3);
    assert.equal(calculateLevelFromXp(600), 4);
    assert.equal(calculateLevelFromXp(1000), 5);
  });

  test('handles edge cases gracefully without negative levels or overflow', () => {
    assert.equal(calculateLevelFromXp(-100), 1);
    assert.equal(calculateLevelFromXp(null), 1);
    assert.equal(calculateLevelFromXp(undefined), 1);
    assert.equal(calculateLevelFromXp(99999999), LEVEL_CAP);
  });
});

describe('Anti-Farming Question Reward Calculation', () => {
  test('unassisted correct awards full base XP and coins on 1st attempt', () => {
    const reward = calculateQuestionReward({ isCorrect: true, assisted: false, priorCorrectCount24h: 0 });
    assert.equal(reward.xp, 15);
    assert.equal(reward.coins, 5);
    assert.equal(reward.reason, 'unassisted_full');
  });

  test('assisted correct awards reduced XP and coins on 1st attempt', () => {
    const reward = calculateQuestionReward({ isCorrect: true, assisted: true, priorCorrectCount24h: 0 });
    assert.equal(reward.xp, 5);
    assert.equal(reward.coins, 1);
    assert.equal(reward.reason, 'assisted_full');
  });

  test('incorrect answers award 0 XP and 0 coins', () => {
    const reward = calculateQuestionReward({ isCorrect: false, assisted: false, priorCorrectCount24h: 0 });
    assert.equal(reward.xp, 0);
    assert.equal(reward.coins, 0);
    assert.equal(reward.reason, 'incorrect');
  });

  test('2nd correct answer within 24h yields diminished rewards', () => {
    const unassisted = calculateQuestionReward({ isCorrect: true, assisted: false, priorCorrectCount24h: 1 });
    assert.equal(unassisted.xp, 8);
    assert.equal(unassisted.coins, 2);
    assert.equal(unassisted.reason, 'unassisted_diminished');

    const assisted = calculateQuestionReward({ isCorrect: true, assisted: true, priorCorrectCount24h: 1 });
    assert.equal(assisted.xp, 2);
    assert.equal(assisted.coins, 0);
    assert.equal(assisted.reason, 'assisted_diminished');
  });

  test('3rd+ correct answer within 24h activates anti-farming clamp (1 XP, 0 coins)', () => {
    const reward = calculateQuestionReward({ isCorrect: true, assisted: false, priorCorrectCount24h: 2 });
    assert.equal(reward.xp, 1);
    assert.equal(reward.coins, 0);
    assert.equal(reward.reason, 'farm_capped');

    const reward10 = calculateQuestionReward({ isCorrect: true, assisted: false, priorCorrectCount24h: 10 });
    assert.equal(reward10.xp, 1);
    assert.equal(reward10.coins, 0);
    assert.equal(reward10.reason, 'farm_capped');
  });
});

describe('Cosmetic Catalog & Child-Safe Economy', () => {
  test('starter companion is included with zero cost', () => {
    const companion = COSMETIC_CATALOG.find(c => c.id === 'companion_cardinal');
    assert.ok(companion, 'Starter companion must exist in catalog');
    assert.equal(companion.cost, 0);
    assert.equal(companion.slot, 'companion');
  });

  test('all cosmetic items have valid slots, positive costs, and non-empty descriptions', () => {
    for (const item of COSMETIC_CATALOG) {
      assert.ok(item.id, 'Item must have id');
      assert.ok(item.name, 'Item must have name');
      assert.ok(item.slot, 'Item must specify equipment slot');
      assert.ok(item.cost >= 0, 'Cost must be non-negative');
      assert.ok(item.description, 'Item must have description');
    }
  });

  test('progression simulation confirms economic stability and no negative balance', () => {
    const sim = simulateProgressionEconomy(7, 15, 1);
    assert.ok(sim.stable);
    assert.ok(sim.finalCoins >= 50);
    assert.ok(sim.finalLevel >= 2);
    assert.ok(sim.affordableItemsCount >= 2, 'Player should be able to afford cosmetic items within a week');
  });
});

describe('DatabaseAdapter Progression, Wallet & Inventory Persistence', () => {
  test('initializes default progression with 50 coins and starter companion', async () => {
    const db = new DatabaseAdapter();
    const userId = 'user_test_init_' + Math.random().toString(36).substring(2, 6);

    const prog = await db.getProgression(userId);
    assert.equal(prog.userId, userId);
    assert.equal(prog.level, 1);
    assert.equal(prog.xp, 0);
    assert.equal(prog.coins, 50);
    assert.equal(prog.equippedCompanionId, 'companion_cardinal');

    const inventory = await db.getUserInventory(userId);
    const hasCompanion = inventory.some(i => i.id === 'companion_cardinal' && i.equipped);
    assert.ok(hasCompanion, 'Starter companion must be equipped in inventory');
  });

  test('addXp correctly increases XP and detects level ups', async () => {
    const db = new DatabaseAdapter();
    const userId = 'user_test_xp_' + Math.random().toString(36).substring(2, 6);

    const r1 = await db.addXp(userId, 50);
    assert.equal(r1.newXp, 50);
    assert.equal(r1.newLevel, 1);
    assert.equal(r1.levelUp, false);

    const r2 = await db.addXp(userId, 60); // 110 XP total -> Level 2
    assert.equal(r2.newXp, 110);
    assert.equal(r2.newLevel, 2);
    assert.equal(r2.levelUp, true);
  });

  test('wallet transactions reject negative balances and enforce idempotency', async () => {
    const db = new DatabaseAdapter();
    const userId = 'user_test_wallet_' + Math.random().toString(36).substring(2, 6);

    // Initial balance is 50
    const initialBalance = await db.getWalletBalance(userId);
    assert.equal(initialBalance, 50);

    // Attempting to deduct 100 coins should fail (would result in -50)
    const failTx = await db.addWalletTransaction({
      userId,
      amountDelta: -100,
      reason: 'expensive_purchase',
    });
    assert.equal(failTx.success, false);
    assert.match(failTx.error, /insufficient/i);
    assert.equal(await db.getWalletBalance(userId), 50);

    // Successful deduction of 30 coins
    const okTx = await db.addWalletTransaction({
      userId,
      amountDelta: -30,
      reason: 'fair_purchase',
      idempotencyKey: 'tx_key_01',
    });
    assert.equal(okTx.success, true);
    assert.equal(okTx.newBalance, 20);

    // Re-submitting same idempotency key returns cached result without double deducting
    const dupTx = await db.addWalletTransaction({
      userId,
      amountDelta: -30,
      reason: 'fair_purchase',
      idempotencyKey: 'tx_key_01',
    });
    assert.equal(dupTx.duplicate, true);
    assert.equal(await db.getWalletBalance(userId), 20);
  });

  test('cosmetic purchase, inventory verification, and equipment', async () => {
    const db = new DatabaseAdapter();
    const userId = 'user_test_shop_' + Math.random().toString(36).substring(2, 6);

    // Add gold to afford Derby Cap (50 coins)
    await db.addWalletTransaction({ userId, amountDelta: 50, reason: 'quest_bonus' });
    const balance = await db.getWalletBalance(userId);
    assert.equal(balance, 100);

    // Purchase Derby Jockey Cap (cost 50)
    const buyResult = await db.purchaseCosmetic({ userId, itemId: 'item_derby_cap' });
    assert.equal(buyResult.success, true);
    assert.equal(buyResult.newBalance, 50);

    // Verify item is now in inventory
    const inventory = await db.getUserInventory(userId);
    const cap = inventory.find(i => i.id === 'item_derby_cap');
    assert.ok(cap, 'Purchased cap must be present in inventory');
    assert.equal(cap.equipped, false);

    // Equip the cap
    const equipResult = await db.equipItem(userId, 'item_derby_cap', 'head');
    assert.equal(equipResult.success, true);
    assert.equal(equipResult.equipped, true);

    // Re-purchasing already owned item is rejected
    const dupBuy = await db.purchaseCosmetic({ userId, itemId: 'item_derby_cap' });
    assert.equal(dupBuy.success, false);
    assert.match(dupBuy.error, /already owned/i);
  });

  test('quest reward claims are idempotent and prevent double claiming', async () => {
    const db = new DatabaseAdapter();
    const userId = 'user_test_quest_' + Math.random().toString(36).substring(2, 6);

    const claim1 = await db.claimQuestReward({ userId, questId: 'quest_science_01' });
    assert.equal(claim1.success, true);
    assert.equal(claim1.rewardXp, 120);
    assert.equal(claim1.rewardGold, 20);
    assert.equal(claim1.level, 2); // 120 XP -> Level 2
    assert.equal(claim1.coins, 70); // 50 + 20

    // Attempting to claim again should fail
    const claim2 = await db.claimQuestReward({ userId, questId: 'quest_science_01' });
    assert.equal(claim2.success, false);
    assert.match(claim2.error, /already claimed/i);
  });

  test('processAnswerAttempt integrates server-authoritative anti-farming rewards', async () => {
    const db = new DatabaseAdapter();
    const userId = 'user_test_answer_rewards_' + Math.random().toString(36).substring(2, 6);
    const mockQuestion = {
      id: 'syn_test_q_01',
      answerKey: 'choice_b',
      conceptIds: ['sci_eco_01'],
      explanation: 'Photosynthesis converts sunlight into glucose.',
    };

    // 1st correct answer: full reward (15 XP, 5 coins)
    const v1 = await db.processAnswerAttempt({
      userId,
      question: mockQuestion,
      selectedChoiceId: 'choice_b',
      now: 1000000,
    });
    assert.equal(v1.correct, true);
    assert.equal(v1.reward.xp, 15);
    assert.equal(v1.reward.coins, 5);
    assert.equal(v1.reward.reason, 'unassisted_full');

    // 2nd correct answer on same question within same day: diminished reward (8 XP, 2 coins)
    const v2 = await db.processAnswerAttempt({
      userId,
      question: mockQuestion,
      selectedChoiceId: 'choice_b',
      now: 1005000,
    });
    assert.equal(v2.correct, true);
    assert.equal(v2.reward.xp, 8);
    assert.equal(v2.reward.coins, 2);
    assert.equal(v2.reward.reason, 'unassisted_diminished');

    // 3rd correct answer on same question within same day: anti-farming clamp (1 XP, 0 coins)
    const v3 = await db.processAnswerAttempt({
      userId,
      question: mockQuestion,
      selectedChoiceId: 'choice_b',
      now: 1010000,
    });
    assert.equal(v3.correct, true);
    assert.equal(v3.reward.xp, 1);
    assert.equal(v3.reward.coins, 0);
    assert.equal(v3.reward.reason, 'farm_capped');
  });
});
