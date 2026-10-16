// tests/unit/renderer.test.js — Unit tests for Canvas 2D Game Renderer
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GameRenderer } from '../../src/client/renderer.js';
import { InputManager } from '../../src/client/input.js';

test('GameRenderer initializes world map and 5 KAAC shrines', () => {
  const renderer = new GameRenderer(null);

  assert.equal(renderer.cols, 20);
  assert.equal(renderer.rows, 16);
  assert.equal(renderer.shrines.length, 5);

  const shrineSubjects = new Set(renderer.shrines.map(s => s.id));
  assert.ok(shrineSubjects.has('math'));
  assert.ok(shrineSubjects.has('science'));
  assert.ok(shrineSubjects.has('social_studies'));
  assert.ok(shrineSubjects.has('language_arts'));
  assert.ok(shrineSubjects.has('arts_humanities'));
});

test('GameRenderer updates player movement and clamps to world boundaries', () => {
  const renderer = new GameRenderer(null);
  const input = new InputManager();

  const startX = renderer.player.x;
  const startY = renderer.player.y;

  // Move right
  input.setTouchAction('right', true);
  renderer.update(0.1, input);
  assert.ok(renderer.player.x > startX, 'Player X should increase when moving right');
  assert.equal(renderer.player.direction, 'right');

  // Push player beyond boundaries to verify collision clamping
  renderer.player.x = 9999;
  renderer.update(0.1, input);
  assert.ok(renderer.player.x <= renderer.worldWidth - renderer.tileSize - renderer.player.width);

  renderer.player.x = -500;
  input.setTouchAction('right', false);
  input.setTouchAction('left', true);
  renderer.update(0.1, input);
  assert.ok(renderer.player.x >= renderer.tileSize);
});

test('GameRenderer detects proximity interaction with subject shrines', () => {
  const renderer = new GameRenderer(null);
  const input = new InputManager();

  // Position player directly adjacent to the math shrine (col 3, row 3 -> 48px, 48px)
  const mathShrine = renderer.shrines.find(s => s.id === 'math');
  renderer.player.x = mathShrine.col * renderer.tileSize;
  renderer.player.y = mathShrine.row * renderer.tileSize;

  renderer.update(0.01, input);
  assert.ok(renderer.activeInteraction, 'Should detect nearby interaction');
  assert.equal(renderer.activeInteraction.id, 'math');

  // Move player far away
  renderer.player.x = 200;
  renderer.player.y = 200;
  renderer.update(0.01, input);
  assert.equal(renderer.activeInteraction, null, 'Interaction should clear when far away');
});
