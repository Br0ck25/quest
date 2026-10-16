// tests/unit/sprites.test.js — Unit tests for procedural sprite matrices and SVG icons
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HERO_SPRITES, getSvgIcon } from '../../src/client/sprites.js';
import { PALETTE } from '../../src/data/constants.js';

test('HERO_SPRITES contains 4 directional 8x8 matrices', () => {
  const directions = ['down', 'up', 'left', 'right'];

  for (const dir of directions) {
    const sprite = HERO_SPRITES[dir];
    assert.ok(sprite, `Missing sprite for direction: ${dir}`);
    assert.ok(Array.isArray(sprite.matrix));
    assert.equal(sprite.matrix.length, 8, `${dir} sprite must have 8 rows`);

    for (const row of sprite.matrix) {
      assert.equal(row.length, 8, `${dir} row must have 8 columns`);
      for (let col = 0; col < row.length; col++) {
        const colorIdx = parseInt(row[col], 10);
        assert.ok(!isNaN(colorIdx));
        assert.ok(colorIdx < sprite.palette.length, `Palette index ${colorIdx} exceeds palette bounds`);
      }
    }
  }
});

test('getSvgIcon returns accessible inline SVG elements', () => {
  const iconNames = ['compass', 'quill', 'scroll', 'flask', 'sigil', 'map', 'quests', 'inventory', 'settings', 'audio-on', 'audio-off', 'close'];

  for (const name of iconNames) {
    const svg = getSvgIcon(name, PALETTE.TEXT_PRIMARY, 20);
    assert.match(svg, /^<svg/);
    assert.match(svg, /<\/svg>$/);
    assert.match(svg, /aria-hidden="true"/);
    assert.match(svg, /viewBox="0 0 24 24"/);
  }
});
