// tests/unit/sprites.test.js — Procedural Sprite Matrix & Icon Tests
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { HERO_SPRITES, NPC_SPRITES, ENEMY_SPRITES, getSvgIcon } from '../../src/client/sprites.js';

describe('Procedural Sprites & Icons', () => {
  it('HERO_SPRITES contains 4 directional 8x8 matrices', () => {
    const directions = ['down', 'up', 'left', 'right'];
    for (const dir of directions) {
      assert.ok(HERO_SPRITES[dir], `Missing direction ${dir}`);
      assert.strictEqual(HERO_SPRITES[dir].matrix.length, 8);
      for (const row of HERO_SPRITES[dir].matrix) {
        assert.strictEqual(row.length, 8);
      }
    }
  });

  it('NPC_SPRITES contains Sage 8x8 matrix', () => {
    assert.ok(NPC_SPRITES.sage);
    assert.strictEqual(NPC_SPRITES.sage.matrix.length, 8);
    for (const row of NPC_SPRITES.sage.matrix) {
      assert.strictEqual(row.length, 8);
    }
  });

  it('ENEMY_SPRITES contains basic enemies and boss matrices', () => {
    const enemies = ['sproutling', 'wisp', 'sentry', 'specter', 'boss'];
    for (const id of enemies) {
      assert.ok(ENEMY_SPRITES[id], `Missing enemy sprite: ${id}`);
      assert.strictEqual(ENEMY_SPRITES[id].matrix.length, 8);
      for (const row of ENEMY_SPRITES[id].matrix) {
        assert.strictEqual(row.length, 8);
      }
    }
  });

  it('getSvgIcon returns accessible inline SVG elements', () => {
    const icons = ['compass', 'quill', 'scroll', 'flask', 'sigil', 'map', 'quests', 'inventory', 'settings', 'sword', 'shield', 'trophy'];
    for (const icon of icons) {
      const svg = getSvgIcon(icon);
      assert.ok(svg.startsWith('<svg'), `Icon ${icon} did not return svg`);
      assert.ok(svg.includes('aria-hidden="true"'), `Icon ${icon} missing aria-hidden`);
      assert.ok(svg.endsWith('</svg>'), `Icon ${icon} did not close svg`);
    }
  });
});
