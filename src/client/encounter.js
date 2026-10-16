// src/client/encounter.js — Turn-Based Question Combat State Machine
// Authoritative single-player encounter controller for dungeons and boss battles.

import { sanitizeQuestionForClient } from '../data/questions.js';

export class EncounterEngine {
  constructor(encounters = [], questionBank = []) {
    this.encounters = encounters;
    this.questionBank = questionBank;
    this.questionMap = new Map(questionBank.map(q => [q.id, q]));

    // State machine states: 'IDLE' | 'QUESTION_ACTIVE' | 'ANSWER_FEEDBACK' | 'ENCOUNTER_VICTORY' | 'PLAYER_DEFEATED'
    this.state = 'IDLE';

    this.currentEncounterIndex = 0;
    this.activeEncounter = null;
    this.activeQuestion = null;
    this.activeQuestionSecret = null; // Contains answerKey (kept internal)

    // Combat attributes
    this.maxPlayerHp = 3;
    this.playerHp = 3;
    this.enemyHp = 1;
    this.bossQuestionIndex = 0;

    // Tracking
    this.completed = false;
    this.lastResult = null;
  }

  /**
   * Starts a specific encounter by index or the current encounter.
   * @param {number} [index]
   * @returns {object} Active encounter definition
   */
  startEncounter(index = this.currentEncounterIndex) {
    if (index >= this.encounters.length) {
      this.state = 'IDLE';
      this.completed = true;
      return null;
    }

    this.currentEncounterIndex = index;
    this.activeEncounter = this.encounters[index];
    this.enemyHp = this.activeEncounter.hp;
    this.bossQuestionIndex = 0;

    this.prepareNextQuestion();
    this.state = 'QUESTION_ACTIVE';
    return this.activeEncounter;
  }

  /**
   * Loads the current question for this encounter step without exposing answerKey.
   */
  prepareNextQuestion() {
    let questionId = this.activeEncounter.questionId;
    if (this.activeEncounter.questionIds && Array.isArray(this.activeEncounter.questionIds)) {
      questionId = this.activeEncounter.questionIds[this.bossQuestionIndex] || this.activeEncounter.questionIds[0];
    }

    const fullQuestion = this.questionMap.get(questionId);
    if (!fullQuestion) {
      throw new Error(`Question ${questionId} not found in question bank`);
    }

    this.activeQuestionSecret = fullQuestion;
    this.activeQuestion = sanitizeQuestionForClient(fullQuestion);
  }

  /**
   * Submits a player's choice ('a', 'b', 'c', or 'd').
   * Evaluates correctness, updates HP, and returns result payload.
   * @param {string} choiceId
   */
  submitAnswer(choiceId) {
    if (this.state !== 'QUESTION_ACTIVE') {
      throw new Error(`Cannot submit answer while in state: ${this.state}`);
    }

    const isCorrect = choiceId === this.activeQuestionSecret.answerKey;
    const explanation = this.activeQuestionSecret.explanation;

    let enemyDefeated = false;
    let playerDefeated = false;

    if (isCorrect) {
      this.enemyHp = Math.max(0, this.enemyHp - 1);
      if (this.enemyHp === 0) {
        enemyDefeated = true;
        this.state = 'ENCOUNTER_VICTORY';
        if (this.activeEncounter.type === 'boss') {
          this.completed = true;
        }
      } else {
        this.bossQuestionIndex++;
        this.state = 'ANSWER_FEEDBACK';
      }
    } else {
      this.playerHp = Math.max(0, this.playerHp - 1);
      if (this.playerHp === 0) {
        playerDefeated = true;
        this.state = 'PLAYER_DEFEATED';
      } else {
        this.state = 'ANSWER_FEEDBACK';
      }
    }

    this.lastResult = {
      correct: isCorrect,
      explanation,
      enemyDefeated,
      playerDefeated,
      playerHp: this.playerHp,
      enemyHp: this.enemyHp,
    };

    return this.lastResult;
  }

  /**
   * Advances from feedback to next question or cleans up.
   */
  advance() {
    if (this.state === 'ANSWER_FEEDBACK') {
      this.prepareNextQuestion();
      this.state = 'QUESTION_ACTIVE';
      return true;
    }
    return false;
  }

  /**
   * Retries the current encounter upon defeat, preventing soft locks.
   */
  retry() {
    this.playerHp = this.maxPlayerHp;
    this.enemyHp = this.activeEncounter.maxHp;
    this.bossQuestionIndex = 0;
    this.prepareNextQuestion();
    this.state = 'QUESTION_ACTIVE';
  }

  /**
   * Advances to next dungeon encounter.
   */
  nextEncounter() {
    if (this.currentEncounterIndex + 1 < this.encounters.length) {
      return this.startEncounter(this.currentEncounterIndex + 1);
    }
    this.state = 'IDLE';
    this.completed = true;
    return null;
  }

  /**
   * Resets entire dungeon to initial state.
   */
  resetDungeon() {
    this.currentEncounterIndex = 0;
    this.activeEncounter = null;
    this.activeQuestion = null;
    this.activeQuestionSecret = null;
    this.playerHp = this.maxPlayerHp;
    this.enemyHp = 1;
    this.bossQuestionIndex = 0;
    this.state = 'IDLE';
    this.completed = false;
    this.lastResult = null;
  }
}
