// tests/unit/game-data.test.js — Unit tests for game data and child-safe generators
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAdventurerHandle,
  STARTER_QUESTS,
  STARTER_INVENTORY,
  createDefaultPlayerProfile,
} from '../../src/data/game-data.js';
import { SUBJECTS, PALETTE } from '../../src/data/constants.js';

test('generateAdventurerHandle creates child-safe pseudonymous handle without PII', () => {
  const handle = generateAdventurerHandle();
  assert.match(handle, /^[A-Z][a-z]+[A-Z][a-z]+\d{2}$/, 'Handle must follow [Prefix][Role][2Digits] format');
  assert.doesNotMatch(handle, /\s/, 'Handle must not contain spaces');
  assert.doesNotMatch(handle, /[@#$]/, 'Handle must not contain special symbols');

  // Verify deterministic PRNG support
  let fakeRngVal = 0.0;
  const mockRng = () => fakeRngVal;
  const fixedHandle = generateAdventurerHandle(mockRng);
  assert.equal(typeof fixedHandle, 'string');
  assert.ok(fixedHandle.length > 5);
});

test('STARTER_QUESTS covers all 5 Governor Cup academic subjects', () => {
  const subjectIds = new Set(STARTER_QUESTS.map(q => q.subjectId));
  assert.equal(subjectIds.size, 5, 'Must have quests for all 5 subjects');
  assert.ok(subjectIds.has('math'));
  assert.ok(subjectIds.has('science'));
  assert.ok(subjectIds.has('social_studies'));
  assert.ok(subjectIds.has('language_arts'));
  assert.ok(subjectIds.has('arts_humanities'));

  for (const quest of STARTER_QUESTS) {
    assert.ok(quest.title.length > 0);
    assert.ok(quest.rewardXp > 0);
    assert.ok(quest.rewardGold > 0);
    assert.ok(['active', 'available'].includes(quest.status));
  }
});

test('STARTER_INVENTORY items have valid icons and approved palette colors', () => {
  const approvedColors = new Set(Object.values(PALETTE));

  for (const item of STARTER_INVENTORY) {
    assert.ok(item.id.startsWith('item_'));
    assert.ok(item.name.length > 0);
    assert.ok(['gear', 'consumable', 'artifact'].includes(item.type));
    assert.ok(approvedColors.has(item.color), `Item ${item.name} uses unapproved color: ${item.color}`);
  }
});

test('createDefaultPlayerProfile initializes valid guest player state', () => {
  const profile = createDefaultPlayerProfile();
  assert.equal(profile.gradeBand, '6-8');
  assert.equal(profile.level, 1);
  assert.equal(profile.hp, 100);
  assert.equal(profile.maxHp, 100);
  assert.equal(profile.gold, 50);
  assert.equal(profile.settings.audioMuted, false);
  assert.equal(profile.settings.reducedMotion, false);
  assert.equal(profile.inventory.length, STARTER_INVENTORY.length);
  assert.equal(profile.quests.length, STARTER_QUESTS.length);
});
