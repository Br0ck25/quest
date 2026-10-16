// tests/unit/constants.test.js — Unit test validating centralized constants
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIEWPORT, PALETTE, SUBJECTS, SPACED_REPETITION, TARGET_GRADE_BAND } from '../../src/data/constants.js';

test('Viewport defines valid logical resolution and touch targets', () => {
  assert.equal(VIEWPORT.LOGICAL_WIDTH, 320);
  assert.equal(VIEWPORT.LOGICAL_HEIGHT, 240);
  assert.equal(VIEWPORT.TILE_SIZE, 16);
  assert.ok(VIEWPORT.MIN_TOUCH_TARGET >= 48, 'Touch target must be >= 48px');
});

test('Approved palette contains all 5 KAAC academic subject colors', () => {
  assert.ok(PALETTE.MATH);
  assert.ok(PALETTE.SCIENCE);
  assert.ok(PALETTE.SOCIAL_STUDIES);
  assert.ok(PALETTE.LANGUAGE_ARTS);
  assert.ok(PALETTE.ARTS_HUMANITIES);
});

test('Subjects map correctly to fantasy realms and bosses', () => {
  assert.equal(SUBJECTS.MATH.realm, 'Cipher Caverns');
  assert.equal(SUBJECTS.SCIENCE.realm, 'Verdant Wilds');
  assert.equal(SUBJECTS.SOCIAL_STUDIES.realm, 'Kingdoms of Time');
  assert.equal(SUBJECTS.LANGUAGE_ARTS.realm, 'Whispering Archives');
  assert.equal(SUBJECTS.ARTS_HUMANITIES.realm, 'Gallery of Wonders');
});

test('Spaced repetition intervals are [1, 3, 7, 14, 30]', () => {
  assert.deepEqual(SPACED_REPETITION.INTERVALS_DAYS, [1, 3, 7, 14, 30]);
});

test('Target grade band is 6-8', () => {
  assert.equal(TARGET_GRADE_BAND, '6-8');
});
