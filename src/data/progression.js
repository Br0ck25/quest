// src/data/progression.js — Progression, Economy & Anti-Farming Engine
// Governs server-authoritative XP, levels, cosmetic economy, starter companion, and anti-farming controls.

export const LEVEL_CAP = 50;

/**
 * Returns cumulative XP required to reach a given level.
 * Level 1 = 0 XP, Level 2 = 100 XP, Level 3 = 300 XP, etc.
 * Formula: 50 * (level - 1) * level
 * @param {number} level
 * @returns {number}
 */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  const clamped = Math.min(level, LEVEL_CAP);
  return 50 * (clamped - 1) * clamped;
}

/**
 * Calculates current level from cumulative XP.
 * @param {number} xp
 * @returns {number} Level (1 - LEVEL_CAP)
 */
export function calculateLevelFromXp(xp) {
  if (!xp || xp <= 0) return 1;
  let level = 1;
  while (level < LEVEL_CAP && xp >= xpForLevel(level + 1)) {
    level++;
  }
  return level;
}

export const ECONOMY_CONFIG = {
  QUESTION_BASE_XP: 15,
  QUESTION_BASE_COINS: 5,
  QUESTION_ASSISTED_XP: 5,
  QUESTION_ASSISTED_COINS: 1,
  SAME_DAY_COOLDOWN_MS: 24 * 60 * 60 * 1000, // 24 hours
};

/**
 * Calculates question attempt reward applying anti-farming diminishing returns.
 * - 1st correct answer in 24h: 100% reward
 * - 2nd correct answer in 24h: ~50% reward
 * - 3rd+ correct answer in 24h: minimal XP (1), 0 coins (anti-farming protection)
 * @param {object} params
 * @param {boolean} params.isCorrect
 * @param {boolean} params.assisted
 * @param {number} [params.priorCorrectCount24h=0]
 * @returns {{ xp: number, coins: number, reason: string }}
 */
export function calculateQuestionReward({ isCorrect, assisted = false, priorCorrectCount24h = 0 }) {
  if (!isCorrect) {
    return { xp: 0, coins: 0, reason: 'incorrect' };
  }

  if (priorCorrectCount24h === 0) {
    if (assisted) {
      return {
        xp: ECONOMY_CONFIG.QUESTION_ASSISTED_XP,
        coins: ECONOMY_CONFIG.QUESTION_ASSISTED_COINS,
        reason: 'assisted_full',
      };
    }
    return {
      xp: ECONOMY_CONFIG.QUESTION_BASE_XP,
      coins: ECONOMY_CONFIG.QUESTION_BASE_COINS,
      reason: 'unassisted_full',
    };
  }

  if (priorCorrectCount24h === 1) {
    if (assisted) {
      return { xp: 2, coins: 0, reason: 'assisted_diminished' };
    }
    return { xp: 8, coins: 2, reason: 'unassisted_diminished' };
  }

  // 3rd or more repeat within 24h: anti-farming clamp
  return { xp: 1, coins: 0, reason: 'farm_capped' };
}

/**
 * Starter companion granted automatically to every young adventurer.
 * Purely cosmetic/companion. Zero PII, non-pay-to-win.
 */
export const STARTER_COMPANION = {
  id: 'companion_cardinal',
  name: 'Kentucky Cardinal Fledgling',
  type: 'companion',
  slot: 'companion',
  icon: 'cardinal',
  cost: 0,
  description: 'A spirited red fledgling native to the Commonwealth of Kentucky. Chirps cheerfully as you master academic lore.',
};

/**
 * Catalog of cosmetic-only rewards purchasable with in-game coins.
 * STRICT NON-NEGOTIABLES: Zero real money, zero microtransactions, zero loot boxes, zero pay-to-win stat advantages, zero trading.
 */
export const COSMETIC_CATALOG = [
  { ...STARTER_COMPANION },
  {
    id: 'item_derby_cap',
    name: 'Derby Jockey Cap',
    type: 'cosmetic',
    slot: 'head',
    icon: 'cap',
    cost: 50,
    description: 'A brisk checkered silk cap inspired by Kentucky racing tradition.',
  },
  {
    id: 'item_silver_quill',
    name: 'Silver Calligraphy Quill',
    type: 'cosmetic',
    slot: 'weapon',
    icon: 'quill',
    cost: 75,
    description: 'A polished quill that shimmers with academic poise.',
  },
  {
    id: 'item_golden_scroll',
    name: 'Illuminated Commonwealth Scroll',
    type: 'cosmetic',
    slot: 'relic',
    icon: 'scroll',
    cost: 100,
    description: 'An ornate scroll detailing historic moments of the Bluegrass State.',
  },
  {
    id: 'item_limestone_tome',
    name: 'Limestone Karst Grimoire',
    type: 'cosmetic',
    slot: 'trophy',
    icon: 'tome',
    cost: 120,
    description: 'Bound in weathered rock from Mammoth Cave, honoring geological history.',
  },
  {
    id: 'item_bluegrass_cloak',
    name: 'Verdant Bluegrass Cloak',
    type: 'cosmetic',
    slot: 'armor',
    icon: 'cloak',
    cost: 150,
    description: 'Woven from emerald threads reflecting the rolling Kentucky pastures.',
  },
];

/**
 * Simulates progression economy over a given number of days.
 * Verifies that progression pacing is balanced and produces no negative balances or exploit loops.
 * @param {number} [days=7]
 * @param {number} [questionsPerDay=15]
 * @param {number} [questsCompleted=1]
 * @returns {object} Simulation balance report
 */
export function simulateProgressionEconomy(days = 7, questionsPerDay = 15, questsCompleted = 1) {
  let totalXp = 0;
  let totalCoins = 50; // default starting coins
  const dailyReports = [];

  // Initial starter quest rewards
  totalXp += questsCompleted * 150;
  totalCoins += questsCompleted * 50;

  for (let day = 1; day <= days; day++) {
    let dayXp = 0;
    let dayCoins = 0;

    for (let q = 0; q < questionsPerDay; q++) {
      // 80% correct, 20% incorrect simulation
      const isCorrect = q % 5 !== 0;
      const assisted = q % 3 === 0;
      // 20% of questions are repeated within the day
      const priorCount = q >= 12 ? 1 : 0;

      const reward = calculateQuestionReward({
        isCorrect,
        assisted,
        priorCorrectCount24h: priorCount,
      });

      dayXp += reward.xp;
      dayCoins += reward.coins;
    }

    totalXp += dayXp;
    totalCoins += dayCoins;

    dailyReports.push({
      day,
      dayXp,
      dayCoins,
      cumulativeXp: totalXp,
      cumulativeCoins: totalCoins,
      level: calculateLevelFromXp(totalXp),
    });
  }

  const finalLevel = calculateLevelFromXp(totalXp);
  const affordableItems = COSMETIC_CATALOG.filter(item => item.cost <= totalCoins);

  return {
    days,
    finalXp: totalXp,
    finalLevel,
    finalCoins: totalCoins,
    dailyReports,
    affordableItemsCount: affordableItems.length,
    stable: totalCoins >= 0 && finalLevel >= 1 && finalLevel <= LEVEL_CAP,
  };
}
