// src/client/app.js — Core Game Client Orchestrator
// Connects Input, Multi-Zone World, Canvas 2D Engine, Audio, Encounters, and UI Overlay.

import { createDefaultPlayerProfile, generateAdventurerHandle } from '../data/game-data.js';
import { DUNGEON_ENCOUNTERS, SYNTHETIC_QUESTIONS } from '../data/questions.js';
import { InputManager } from './input.js';
import { soundEngine } from './audio.js';
import { GameRenderer } from './renderer.js';
import { UIManager } from './ui.js';
import { EncounterEngine } from './encounter.js';
import { PALETTE } from '../data/constants.js';

const STORAGE_KEY = 'quest_ky_guest_profile';

export class GameApp {
  constructor(canvasElement, uiRootElement) {
    this.canvas = canvasElement;
    this.uiRoot = uiRootElement;

    // Load local guest profile or create new
    this.player = this.loadProfile();

    // Initialize subsystems
    this.input = new InputManager();
    this.renderer = new GameRenderer(this.canvas);
    this.encounterEngine = new EncounterEngine(DUNGEON_ENCOUNTERS, SYNTHETIC_QUESTIONS);

    this.ui = new UIManager(this.uiRoot, this.player, {
      onSettingsChange: (settings) => this.saveProfile(),
      onRerollHandle: () => {
        const handle = generateAdventurerHandle();
        this.player.handle = handle;
        this.saveProfile();
        return handle;
      },
    });

    // Bind touch controls
    const touchElements = this.ui.getTouchElements();
    this.input.bindVirtualControls(touchElements);
    this.input.initKeyboard();

    // Apply audio preference
    if (this.player.settings.audioMuted) {
      soundEngine.toggleMute(true);
    }

    // Animation loop state
    this.lastTime = 0;
    this.animationFrameId = null;
    this.running = false;

    // Bind loop
    this.tick = this.tick.bind(this);
    this.onResize = this.onResize.bind(this);
  }

  loadProfile() {
    try {
      if (typeof localStorage !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          return JSON.parse(saved);
        }
      }
    } catch {
      // LocalStorage access restricted / private browsing fallback
    }
    return createDefaultPlayerProfile();
  }

  saveProfile() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.player));
      }
    } catch {
      // Ignore storage write error
    }
  }

  start() {
    if (this.running) return;
    this.running = true;

    // Setup resize listener
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', this.onResize);
      this.onResize();
    }

    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (typeof window !== 'undefined') {
      window.removeEventListener('resize', this.onResize);
    }
    this.input.destroy();
  }

  onResize() {
    if (!this.canvas || typeof window === 'undefined') return;
    const container = this.canvas.parentElement || document.body;
    const width = container.clientWidth || window.innerWidth;
    const height = (container.clientHeight || window.innerHeight) * 0.65;
    this.renderer.handleResize(width, height);
  }

  /**
   * Handles player interaction button trigger [ACT].
   */
  handleAction() {
    const interaction = this.renderer.activeInteraction;
    if (!interaction) return;

    if (interaction.type === 'npc') {
      this.ui.showNpcDialogueModal(interaction, () => {
        // Activate starter quest "Flora of the Verdant Wilds"
        const quest = this.player.quests.find(q => q.subjectId === 'science');
        if (quest && quest.status !== 'completed') {
          quest.status = 'active';
          quest.progress = 'Investigate the Verdant Sanctuary';
          this.saveProfile();
        }
        this.ui.showInteractionBanner('Quest Accepted: Take the northern trail to the Verdant Sanctuary!');
      });
      return;
    }

    if (interaction.type === 'shrine') {
      soundEngine.playChime();
      this.ui.showInteractionBanner(
        `Examining ${interaction.label}: Gateway to ${interaction.subject.realm}.`
      );
      return;
    }

    if (interaction.type === 'encounter') {
      this.startCombatEncounter(interaction);
    }
  }

  /**
   * Launches a turn-based combat encounter.
   */
  startCombatEncounter(interaction) {
    this.encounterEngine.startEncounter(interaction.index);
    const encounter = this.encounterEngine.activeEncounter;
    const question = this.encounterEngine.activeQuestion;

    this.ui.openEncounterModal(encounter, question, (choiceId) => {
      this.handleEncounterChoice(choiceId, interaction);
    });
  }

  /**
   * Processes player answer choice in encounter.
   */
  handleEncounterChoice(choiceId, interaction) {
    const result = this.encounterEngine.submitAnswer(choiceId);

    // Update player health in profile and HUD
    this.player.hp = Math.max(1, this.encounterEngine.playerHp);
    this.ui.updatePlayerStats(this.player);

    this.ui.showAnswerFeedback(result, () => {
      this.handleEncounterAdvance(result, interaction);
    });
  }

  /**
   * Advances encounter to next step, victory, or retry.
   */
  handleEncounterAdvance(result, interaction) {
    if (result.enemyDefeated) {
      interaction.defeated = true;
      this.ui.closePanel();

      if (this.encounterEngine.completed) {
        // Complete the quest and award rewards
        this.completeQuestAndReward();
      } else {
        soundEngine.playChime();
        this.ui.showInteractionBanner(`${interaction.label} overcome! Continue forward.`);
      }
      return;
    }

    if (result.playerDefeated) {
      // Safe recovery without soft locks: return to Hub
      this.ui.closePanel();
      soundEngine.playAlert();
      this.player.hp = this.player.maxHp;
      this.ui.updatePlayerStats(this.player);
      this.renderer.changeZone('hub', 152, 120);
      this.encounterEngine.retry();
      this.ui.showInteractionBanner('The Elder Sage’s ward returns you to Berea Crossroads to recover.');
      return;
    }

    // Next question for boss
    this.encounterEngine.advance();
    const encounter = this.encounterEngine.activeEncounter;
    const question = this.encounterEngine.activeQuestion;
    this.ui.openEncounterModal(encounter, question, (choiceId) => {
      this.handleEncounterChoice(choiceId, interaction);
    });
  }

  /**
   * Awards quest completion rewards upon defeating the boss.
   */
  completeQuestAndReward() {
    const quest = this.player.quests.find(q => q.subjectId === 'science');
    if (quest) {
      quest.status = 'completed';
      quest.progress = 'Sanctuary Restored (Completed)';
    }

    const rewardXp = 150;
    const rewardGold = 50;

    this.player.xp = (this.player.xp || 0) + rewardXp;
    this.player.gold += rewardGold;

    // Level up check
    if (this.player.xp >= 100) {
      this.player.level = Math.floor(this.player.xp / 100) + 1;
    }

    // Add unique completion relic to inventory
    const relic = {
      id: 'item_guardian_bloom',
      name: "Guardian's Living Bloom",
      type: 'artifact',
      slot: 'trophy',
      subject: 'Science',
      color: PALETTE.SCIENCE,
      icon: 'trophy',
      description: 'Awarded for restoring balance to the Overgrown Guardian in the Verdant Sanctuary.',
      equipped: false,
    };

    if (!this.player.inventory.some(i => i.id === relic.id)) {
      this.player.inventory.push(relic);
    }

    this.saveProfile();
    this.ui.updatePlayerStats(this.player);

    this.ui.showVictoryModal({ xp: rewardXp, gold: rewardGold }, () => {
      this.renderer.changeZone('hub', 152, 120);
    });
  }

  tick(currentTime) {
    if (!this.running) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    // Handle [ACT] interact button trigger
    if (this.input.isJustPressed('action') && !this.ui.activeTab) {
      this.handleAction();
    }

    // Handle [MENU] button trigger
    if (this.input.isJustPressed('menu')) {
      if (this.ui.activeTab && this.ui.activeTab !== 'encounter') {
        this.ui.closePanel();
      } else if (!this.ui.activeTab) {
        this.ui.openTab('settings');
      }
    }

    // Update game physics, collisions, zone transitions, and camera
    this.renderer.update(dt, this.input, Boolean(this.player.settings.reducedMotion));

    // Clear just-pressed buffer
    this.input.update();

    // Render frame
    this.renderer.render(currentTime);

    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}
