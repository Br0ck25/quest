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

test('GameRenderer detects NPC Berea Sage interaction in Hub', () => {
  const renderer = new GameRenderer(null);
  const input = new InputManager();

  renderer.player.x = renderer.npc.col * renderer.tileSize;
  renderer.player.y = renderer.npc.row * renderer.tileSize;

  renderer.update(0.01, input);
  assert.ok(renderer.activeInteraction);
  assert.equal(renderer.activeInteraction.type, 'npc');
  assert.equal(renderer.activeInteraction.id, 'npc_sage');
});

test('GameRenderer transitions between Hub, Route, and Dungeon zones', () => {
  const renderer = new GameRenderer(null);
  assert.equal(renderer.currentZone, 'hub');

  // Transition to Route
  renderer.changeZone('route', 152, 220);
  assert.equal(renderer.currentZone, 'route');
  assert.equal(renderer.player.x, 152);
  assert.equal(renderer.player.y, 220);

  // Transition to Dungeon
  renderer.changeZone('dungeon', 152, 220);
  assert.equal(renderer.currentZone, 'dungeon');
  assert.equal(renderer.dungeonEntities.length, 5);
});

test('GameRenderer detects dungeon encounters in Dungeon zone', () => {
  const renderer = new GameRenderer(null);
  const input = new InputManager();

  renderer.changeZone('dungeon', 152, 220);

  // Move adjacent to first encounter (Bramble Sproutling at col 9, row 12)
  const enc0 = renderer.dungeonEntities[0];
  renderer.player.x = enc0.col * renderer.tileSize;
  renderer.player.y = enc0.row * renderer.tileSize;

  renderer.update(0.01, input);
  assert.ok(renderer.activeInteraction);
  assert.equal(renderer.activeInteraction.type, 'encounter');
  assert.equal(renderer.activeInteraction.id, 'enc_sproutling');
});
