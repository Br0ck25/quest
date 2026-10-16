// tests/unit/encounter.test.js — State Machine Tests for Turn-Based Combat & Encounters
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { EncounterEngine } from '../../src/client/encounter.js';
import { DUNGEON_ENCOUNTERS, SYNTHETIC_QUESTIONS } from '../../src/data/questions.js';

describe('EncounterEngine State Transitions & Combat Logic', () => {
  function createEngine() {
    return new EncounterEngine(DUNGEON_ENCOUNTERS, SYNTHETIC_QUESTIONS);
  }

  it('initializes in IDLE state at encounter 0', () => {
    const engine = createEngine();
    assert.strictEqual(engine.state, 'IDLE');
    assert.strictEqual(engine.currentEncounterIndex, 0);
    assert.strictEqual(engine.completed, false);
  });

  it('starts an encounter, transitions to QUESTION_ACTIVE, and strips answerKey from active question', () => {
    const engine = createEngine();
    const encounter = engine.startEncounter(0);

    assert.strictEqual(engine.state, 'QUESTION_ACTIVE');
    assert.strictEqual(encounter.name, 'Bramble Sproutling');
    assert.strictEqual(engine.enemyHp, 1);
    assert.ok(engine.activeQuestion);
    assert.strictEqual('answerKey' in engine.activeQuestion, false, 'Client question must not reveal answerKey');
  });

  it('evaluates correct answer: damages enemy and transitions to ENCOUNTER_VICTORY for 1-HP enemy', () => {
    const engine = createEngine();
    engine.startEncounter(0);

    // syn_sci_001 correct answer is 'b' (Chloroplast)
    const result = engine.submitAnswer('b');

    assert.strictEqual(result.correct, true);
    assert.strictEqual(engine.enemyHp, 0);
    assert.strictEqual(result.enemyDefeated, true);
    assert.strictEqual(engine.state, 'ENCOUNTER_VICTORY');
    assert.ok(result.explanation.includes('Chloroplasts'));
  });

  it('evaluates incorrect answer: damages player and provides feedback & explanation', () => {
    const engine = createEngine();
    engine.startEncounter(0);

    const initialPlayerHp = engine.playerHp;
    // syn_sci_001 wrong answer is 'a'
    const result = engine.submitAnswer('a');

    assert.strictEqual(result.correct, false);
    assert.strictEqual(engine.enemyHp, 1); // Enemy unharmed
    assert.strictEqual(result.enemyDefeated, false);
    assert.strictEqual(engine.playerHp, initialPlayerHp - 1);
    assert.strictEqual(engine.state, 'ANSWER_FEEDBACK');
    assert.ok(result.explanation.includes('Chloroplasts'));
  });

  it('handles multi-HP boss encounter requiring multiple correct answers', () => {
    const engine = createEngine();
    // Boss is encounter index 4
    engine.startEncounter(4);

    assert.strictEqual(engine.enemyHp, 2);
    assert.strictEqual(engine.activeEncounter.type, 'boss');

    // First question: syn_sci_003 (Karst limestone, 'b')
    const res1 = engine.submitAnswer('b');
    assert.strictEqual(res1.correct, true);
    assert.strictEqual(engine.enemyHp, 1);
    assert.strictEqual(res1.enemyDefeated, false);
    assert.strictEqual(engine.state, 'ANSWER_FEEDBACK');

    // Advance to next question for boss
    engine.advance();
    assert.strictEqual(engine.state, 'QUESTION_ACTIVE');

    // Second question: syn_sci_002 (unbalanced external force, 'a')
    const res2 = engine.submitAnswer('a');
    assert.strictEqual(res2.correct, true);
    assert.strictEqual(engine.enemyHp, 0);
    assert.strictEqual(res2.enemyDefeated, true);
    assert.strictEqual(engine.state, 'ENCOUNTER_VICTORY');
    assert.strictEqual(engine.completed, true);
  });

  it('prevents soft locks via safe retry when player HP drops to 0', () => {
    const engine = createEngine();
    engine.playerHp = 1;
    engine.startEncounter(0);

    // Wrong answer fells player
    const result = engine.submitAnswer('c');
    assert.strictEqual(result.correct, false);
    assert.strictEqual(engine.playerHp, 0);
    assert.strictEqual(result.playerDefeated, true);
    assert.strictEqual(engine.state, 'PLAYER_DEFEATED');

    // Retry heals player and resets current encounter
    engine.retry();
    assert.strictEqual(engine.playerHp, engine.maxPlayerHp);
    assert.strictEqual(engine.state, 'QUESTION_ACTIVE');
    assert.strictEqual(engine.enemyHp, engine.activeEncounter.maxHp);
  });
});
