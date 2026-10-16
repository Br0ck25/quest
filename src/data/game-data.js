// src/data/game-data.js — Initial Game Data & Pseudonymous Generators
// Child privacy: Zero PII. Adventurer handles are procedurally generated.

import { SUBJECTS, PALETTE } from './constants.js';

const HANDLE_PREFIXES = [
  'Bluegrass', 'Cumberland', 'Berea', 'Derby', 'Cardinal',
  'Redriver', 'Limestone', 'Mammoth', 'Goldenrod', 'Paducah'
];

const HANDLE_ROLES = [
  'Wizard', 'Scholar', 'Ranger', 'Pioneer', 'Alchemist',
  'Chronologer', 'Sage', 'Navigator', 'Wordweaver', 'Guardian'
];

/**
 * Procedurally generates a child-safe pseudonymous adventurer handle.
 * Follows COPPA compliance: Zero PII, no real names or identifiers.
 * @param {() => number} [rng=Math.random]
 * @returns {string} e.g. "BluegrassWizard42"
 */
export function generateAdventurerHandle(rng = Math.random) {
  const prefix = HANDLE_PREFIXES[Math.floor(rng() * HANDLE_PREFIXES.length)];
  const role = HANDLE_ROLES[Math.floor(rng() * HANDLE_ROLES.length)];
  const num = Math.floor(rng() * 90) + 10;
  return `${prefix}${role}${num}`;
}

/**
 * Initial Starter Quests aligned with Governor's Cup subject realms.
 */
export const STARTER_QUESTS = [
  {
    id: 'quest_math_01',
    subjectId: 'math',
    title: "The Cipher's Enigma",
    realm: SUBJECTS.MATH.realm,
    color: SUBJECTS.MATH.color,
    description: 'Investigate strange numerical runes in the Cipher Caverns.',
    status: 'active',
    progress: '0 / 3 Runes Decoded',
    rewardXp: 150,
    rewardGold: 25,
  },
  {
    id: 'quest_science_01',
    subjectId: 'science',
    title: 'Flora of the Verdant Wilds',
    realm: SUBJECTS.SCIENCE.realm,
    color: SUBJECTS.SCIENCE.color,
    description: 'Catalog photosynthetic anomalies along the wild moss river.',
    status: 'available',
    progress: 'Not Started',
    rewardXp: 120,
    rewardGold: 20,
  },
  {
    id: 'quest_social_01',
    subjectId: 'social_studies',
    title: 'Echoes of the Commonwealth',
    realm: SUBJECTS.SOCIAL_STUDIES.realm,
    color: SUBJECTS.SOCIAL_STUDIES.color,
    description: 'Uncover ancient historical decrees inside the Chrono Archives.',
    status: 'available',
    progress: 'Not Started',
    rewardXp: 140,
    rewardGold: 30,
  },
  {
    id: 'quest_lang_01',
    subjectId: 'language_arts',
    title: 'The Whispering Tomes',
    realm: SUBJECTS.LANGUAGE_ARTS.realm,
    color: SUBJECTS.LANGUAGE_ARTS.color,
    description: 'Restore missing allegorical stanzas to the Great Library.',
    status: 'available',
    progress: 'Not Started',
    rewardXp: 130,
    rewardGold: 20,
  },
  {
    id: 'quest_arts_01',
    subjectId: 'arts_humanities',
    title: 'Harmony of the Spheres',
    realm: SUBJECTS.ARTS_HUMANITIES.realm,
    color: SUBJECTS.ARTS_HUMANITIES.color,
    description: 'Tune the resonant crystal bells in the Gallery of Wonders.',
    status: 'available',
    progress: 'Not Started',
    rewardXp: 160,
    rewardGold: 35,
  },
];

/**
 * Initial Starter Inventory items with procedural icon types and stats.
 */
export const STARTER_INVENTORY = [
  {
    id: 'item_compass',
    name: "Scholar's Compass",
    type: 'gear',
    slot: 'relic',
    subject: 'General',
    color: PALETTE.GOLD,
    icon: 'compass',
    description: 'Points toward undiscovered knowledge nodes across Kentucky.',
    equipped: true,
  },
  {
    id: 'item_quill',
    name: 'Novice Quill',
    type: 'gear',
    slot: 'weapon',
    subject: 'Language Arts',
    color: PALETTE.LANGUAGE_ARTS,
    icon: 'quill',
    description: 'Inscribes answers swiftly during speed buzzer rounds.',
    equipped: true,
  },
  {
    id: 'item_scroll',
    name: 'Parchment Scroll',
    type: 'consumable',
    slot: null,
    subject: 'Social Studies',
    color: PALETTE.PARCHMENT_BORDER,
    icon: 'scroll',
    description: 'Reveals one historical hint during an encounter.',
    equipped: false,
    quantity: 2,
  },
  {
    id: 'item_flask',
    name: 'Elixir of Focus',
    type: 'consumable',
    slot: null,
    subject: 'Science',
    color: PALETTE.SCIENCE,
    icon: 'flask',
    description: 'Restores 25 Energy points when facing challenging questions.',
    equipped: false,
    quantity: 3,
  },
  {
    id: 'item_sigil',
    name: "Governor's Sigil",
    type: 'artifact',
    slot: null,
    subject: 'General',
    color: PALETTE.BORDER_FOCUS,
    icon: 'sigil',
    description: 'Mark of an official contender for the Governor\'s Cup.',
    equipped: false,
    quantity: 1,
  },
];

/**
 * Creates a pristine default player profile.
 * Stored locally in localStorage for 100% guest-first playability.
 * @returns {object}
 */
export function createDefaultPlayerProfile() {
  return {
    handle: generateAdventurerHandle(),
    gradeBand: '6-8',
    level: 1,
    hp: 100,
    maxHp: 100,
    xp: 0,
    maxXp: 100,
    gold: 50,
    activeRealm: 'Cipher Caverns',
    inventory: STARTER_INVENTORY.map(item => ({ ...item })),
    quests: STARTER_QUESTS.map(q => ({ ...q })),
    settings: {
      audioMuted: false,
      reducedMotion: false,
      highContrast: false,
      textScale: 'normal',
      untimedPractice: false,
    },
  };
}
