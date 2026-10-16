// tests/unit/security-audit.test.js — Security, Child Privacy & Anti-Tampering Audit Suite
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseAdapter } from '../../src/server/db.js';
import { SYNTHETIC_QUESTIONS, sanitizeQuestionForClient, DUNGEON_ENCOUNTERS } from '../../src/data/questions.js';
import {
  generateAdventurerHandle,
  createDefaultPlayerProfile,
  STARTER_QUESTS,
  STARTER_INVENTORY,
} from '../../src/data/game-data.js';
import { PRESET_EMOTES } from '../../src/server/rooms.js';
import { calculateQuestionReward, COSMETIC_CATALOG } from '../../src/data/progression.js';

describe('Security & Child Privacy Audit (COPPA / FERPA Compliance)', () => {
  test('Pseudonymous handles generate zero PII and follow strict pattern', () => {
    for (let i = 0; i < 50; i++) {
      const handle = generateAdventurerHandle();
      assert.match(handle, /^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/, 'Handle must follow [Prefix][Role][2Digits]');
      assert.ok(!handle.includes('@'), 'Handle must never contain email tokens');
      assert.ok(!handle.includes('http'), 'Handle must never contain URL strings');
    }
  });

  test('DatabaseAdapter.deleteUserData permanently purges all 7 relational tables for a user', async () => {
    const db = new DatabaseAdapter();
    const userId = 'student_coppa_test_user';

    // 1. Seed user state across all domains
    await db.getOrCreateUser({ id: userId, displayName: 'BluegrassExplorer42' });
    await db.recordAttempt({
      userId,
      questionId: 'syn_sci_001',
      conceptId: 'science.ecosystems.photosynthesis',
      selectedChoiceId: 'b',
      isCorrect: true,
      idempotencyKey: 'att_seed_01',
    });
    await db.saveConceptMastery({
      userId,
      conceptId: 'science.ecosystems.photosynthesis',
      stage: 2,
      intervalDays: 7,
      dueAt: Date.now() + 86400000,
      consecutiveCorrect: 2,
      distinctQuestionsCorrect: ['syn_sci_001'],
      isMastered: false,
      lastAttemptAt: Date.now(),
    });
    await db.addXp(userId, 200, Date.now());
    await db.addWalletTransaction({ userId, amountDelta: 100, reason: 'seed_coins' });
    const buyResult = await db.purchaseCosmetic({ userId, itemId: 'item_derby_cap', idempotencyKey: 'buy_seed_01' });
    assert.equal(buyResult.success, true);
    await db.claimQuestReward({ userId, questId: 'quest_science_01', idempotencyKey: 'quest_seed_01' });

    // Verify presence prior to purge
    const initialProgression = await db.getProgression(userId);
    assert.equal(initialProgression.xp, 320);
    const initialMastery = await db.getUserMasteryList(userId);
    assert.equal(initialMastery.length, 1);
    const initialInventory = await db.getUserInventory(userId);
    assert.ok(initialInventory.length >= 1);

    // 2. Execute COPPA / FERPA purge
    const purgeResult = await db.deleteUserData(userId);
    assert.equal(purgeResult.success, true);
    assert.equal(purgeResult.purged, true);

    // 3. Verify complete absence from all tables
    assert.equal(db.memory.users.has(userId), false);
    assert.equal(db.memory.progression.has(userId), false);

    // Verify attempts purged
    const remainingAttempts = [...db.memory.attempts.values()].filter((a) => a.userId === userId);
    assert.equal(remainingAttempts.length, 0);

    // Verify mastery purged
    const remainingMastery = [...db.memory.mastery.keys()].filter((k) => k.startsWith(`${userId}:`));
    assert.equal(remainingMastery.length, 0);

    // Verify wallet ledger purged
    const remainingLedger = [...db.memory.walletLedger.values()].filter((tx) => tx.userId === userId);
    assert.equal(remainingLedger.length, 0);

    // Verify inventory purged
    const remainingInventory = [...db.memory.userInventory.keys()].filter((k) => k.startsWith(`${userId}:`));
    assert.equal(remainingInventory.length, 0);

    // Verify quests purged
    const remainingQuests = [...db.memory.userQuests.keys()].filter((k) => k.startsWith(`${userId}:`));
    assert.equal(remainingQuests.length, 0);
  });

  test('Preset emotes strictly permit only child-safe preset IDs', () => {
    assert.ok(Array.isArray(PRESET_EMOTES));
    assert.ok(PRESET_EMOTES.length >= 6);
    const allowedIds = new Set(['ready', 'cheer', 'thinking', 'focus', 'high_five', 'gg']);

    for (const emote of PRESET_EMOTES) {
      assert.ok(allowedIds.has(emote.id), `Emote ID ${emote.id} must be in approved child-safe whitelist`);
      assert.ok(emote.text && typeof emote.text === 'string');
      assert.ok(emote.icon && typeof emote.icon === 'string');
    }
  });

  test('Answer Key Secrecy: Sanitization removes answerKey from client exposure', () => {
    for (const question of SYNTHETIC_QUESTIONS) {
      assert.ok(question.answerKey, 'Server question must define answerKey');
      const sanitized = sanitizeQuestionForClient(question);
      assert.equal(sanitized.answerKey, undefined, 'Sanitized question must NEVER include answerKey');
      assert.equal(sanitized.id, question.id);
      assert.equal(sanitized.prompt, question.prompt);
      assert.equal(sanitized.choices.length, question.choices.length);
    }
  });

  test('Dungeon encounters strip answer keys from client delivery', () => {
    for (const enc of DUNGEON_ENCOUNTERS) {
      assert.equal(enc.answerKey, undefined, 'Encounter record must not expose answerKey directly');
    }
  });

  test('Default player profile contains zero PII and starts with guest privileges', () => {
    const profile = createDefaultPlayerProfile();
    assert.equal(profile.gradeBand, '6-8');
    assert.ok(profile.gold >= 0);
    assert.ok(profile.level >= 1);
    assert.ok(!profile.email);
    assert.ok(!profile.realName);
    assert.ok(!profile.schoolId);
  });
});

describe('Anti-Farming & Economic Invariants', () => {
  test('Reward curve strictly limits repeated same-day answers', () => {
    // 1st attempt: full rewards
    const first = calculateQuestionReward({ isCorrect: true, assisted: false, priorCorrectCount24h: 0 });
    assert.equal(first.xp, 15);
    assert.equal(first.coins, 5);

    // 2nd attempt: diminished rewards
    const second = calculateQuestionReward({ isCorrect: true, assisted: false, priorCorrectCount24h: 1 });
    assert.equal(second.xp, 8);
    assert.equal(second.coins, 2);

    // 3rd+ attempt: anti-farming clamp (1 XP, 0 coins)
    const third = calculateQuestionReward({ isCorrect: true, assisted: false, priorCorrectCount24h: 2 });
    assert.equal(third.xp, 1);
    assert.equal(third.coins, 0);

    const fourth = calculateQuestionReward({ isCorrect: true, assisted: false, priorCorrectCount24h: 5 });
    assert.equal(fourth.xp, 1);
    assert.equal(fourth.coins, 0);
  });

  test('Assisted answers never award currency after first attempt and cap at 1 coin', () => {
    const assisted1 = calculateQuestionReward({ isCorrect: true, assisted: true, priorCorrectCount24h: 0 });
    assert.equal(assisted1.coins, 1);
    assert.equal(assisted1.xp, 5);

    const assisted2 = calculateQuestionReward({ isCorrect: true, assisted: true, priorCorrectCount24h: 1 });
    assert.equal(assisted2.coins, 0);
    assert.equal(assisted2.xp, 2);
  });

  test('Cosmetic catalog prices are positive and items belong to approved categories', () => {
    const approvedSlots = new Set(['companion', 'head', 'weapon', 'relic', 'trophy', 'armor']);
    for (const item of COSMETIC_CATALOG) {
      assert.ok(item.cost >= 0, `Item ${item.id} cost must be non-negative`);
      assert.ok(approvedSlots.has(item.slot), `Slot ${item.slot} must be in approved slots`);
      assert.ok(item.name && item.description);
    }
  });
});
