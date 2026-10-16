// tests/unit/audio.test.js — Unit tests for procedural Web Audio sound synthesizer
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SoundEngine } from '../../src/client/audio.js';

test('SoundEngine toggles mute state correctly', () => {
  const engine = new SoundEngine();
  assert.equal(engine.isMuted(), false);

  engine.toggleMute();
  assert.equal(engine.isMuted(), true);

  engine.toggleMute();
  assert.equal(engine.isMuted(), false);

  engine.toggleMute(true);
  assert.equal(engine.isMuted(), true);

  engine.toggleMute(false);
  assert.equal(engine.isMuted(), false);
});

test('SoundEngine plays sounds without throwing even when AudioContext is absent in Node runtime', () => {
  const engine = new SoundEngine();

  // In headless Node, Web Audio is unavailable; methods must degrade gracefully without uncaught exceptions
  assert.doesNotThrow(() => engine.playClick());
  assert.doesNotThrow(() => engine.playChime());
  assert.doesNotThrow(() => engine.playWalk());
  assert.doesNotThrow(() => engine.playAlert());
  assert.doesNotThrow(() => engine.playEncounterStart());
  assert.doesNotThrow(() => engine.playAttack());
  assert.doesNotThrow(() => engine.playCorrect());
  assert.doesNotThrow(() => engine.playWrong());
  assert.doesNotThrow(() => engine.playFanfare());

  // Muted calls should exit immediately
  engine.toggleMute(true);
  assert.doesNotThrow(() => engine.playClick());
  assert.doesNotThrow(() => engine.playChime());
  assert.doesNotThrow(() => engine.playEncounterStart());
  assert.doesNotThrow(() => engine.playFanfare());
});
