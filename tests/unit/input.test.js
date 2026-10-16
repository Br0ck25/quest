// tests/unit/input.test.js — Unit tests for dual input manager
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InputManager } from '../../src/client/input.js';

test('InputManager tracks keyboard directional actions and state transitions', () => {
  const input = new InputManager();

  // Initially nothing pressed
  assert.equal(input.isDown('up'), false);
  assert.equal(input.isJustPressed('up'), false);

  // Key Down ArrowUp
  input.onKeyDown({ code: 'ArrowUp', target: {} });
  assert.equal(input.isDown('up'), true);
  assert.equal(input.isJustPressed('up'), true);

  // After frame update, isDown remains true, but isJustPressed clears
  input.update();
  assert.equal(input.isDown('up'), true);
  assert.equal(input.isJustPressed('up'), false);

  // Key Up ArrowUp
  input.onKeyUp({ code: 'ArrowUp' });
  assert.equal(input.isDown('up'), false);
});

test('InputManager supports WASD navigation keys', () => {
  const input = new InputManager();

  input.onKeyDown({ code: 'KeyW', target: {} });
  assert.equal(input.isDown('up'), true);

  input.onKeyDown({ code: 'KeyA', target: {} });
  assert.equal(input.isDown('left'), true);

  input.onKeyDown({ code: 'KeyS', target: {} });
  assert.equal(input.isDown('down'), true);

  input.onKeyDown({ code: 'KeyD', target: {} });
  assert.equal(input.isDown('right'), true);
});

test('InputManager maps Space and Enter to action, Escape and KeyM to menu', () => {
  const input = new InputManager();

  input.onKeyDown({ code: 'Space', target: {} });
  assert.equal(input.isDown('action'), true);

  input.onKeyDown({ code: 'Escape', target: {} });
  assert.equal(input.isDown('menu'), true);
});

test('InputManager tracks programmatic touch action inputs', () => {
  const input = new InputManager();

  input.setTouchAction('action', true);
  assert.equal(input.isDown('action'), true);
  assert.equal(input.isJustPressed('action'), true);

  input.update();
  assert.equal(input.isDown('action'), true);
  assert.equal(input.isJustPressed('action'), false);

  input.setTouchAction('action', false);
  assert.equal(input.isDown('action'), false);
});
