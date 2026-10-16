// src/client/ui.js — Semantic Accessible UI Overlay
// Follows WHATWG HTML Living Standard: explicit closing tags, type="button", WCAG AA contrast.

import { PALETTE, SUBJECTS } from '../data/constants.js';
import { getSvgIcon } from './sprites.js';
import { soundEngine } from './audio.js';

export class UIManager {
  constructor(rootElement, playerProfile, callbacks = {}) {
    this.root = rootElement;
    this.player = playerProfile;
    this.callbacks = callbacks;
    this.activeTab = null;

    this.render();
    this.bindEvents();
  }

  render() {
    if (!this.root) return;

    this.root.innerHTML = `
      <header class="game-hud" role="banner">
        <div class="hud-player">
          <div class="avatar-badge" aria-hidden="true">
            <span class="avatar-icon">${getSvgIcon('sigil', PALETTE.BORDER_FOCUS, 22)}</span>
          </div>
          <div class="hud-meta">
            <div class="player-handle" id="hud-handle">${this.escapeHtml(this.player.handle)}</div>
            <div class="player-stats">
              <span class="level-badge" id="hud-level">LV ${this.player.level}</span>
              <div class="hp-bar-container" title="Health: ${this.player.hp}/${this.player.maxHp}">
                <div class="hp-bar-fill" id="hud-hp-bar" style="width: ${(this.player.hp / this.player.maxHp) * 100}%"></div>
              </div>
              <span class="gold-counter">
                <span class="gold-icon" aria-hidden="true">${getSvgIcon('scroll', PALETTE.GOLD, 14)}</span>
                <span id="hud-gold">${this.player.gold} G</span>
              </span>
            </div>
          </div>
        </div>

        <nav class="hud-nav" aria-label="Game Navigation">
          <button type="button" class="hud-btn" data-tab="map" title="Regional Map">
            ${getSvgIcon('map', PALETTE.TEXT_PRIMARY, 18)}
            <span class="btn-label">Map</span>
          </button>
          <button type="button" class="hud-btn" data-tab="quests" title="Quest Log">
            ${getSvgIcon('quests', PALETTE.TEXT_PRIMARY, 18)}
            <span class="btn-label">Quests</span>
          </button>
          <button type="button" class="hud-btn" data-tab="inventory" title="Inventory">
            ${getSvgIcon('inventory', PALETTE.TEXT_PRIMARY, 18)}
            <span class="btn-label">Items</span>
          </button>
          <button type="button" class="hud-btn" data-tab="settings" title="Game Settings">
            ${getSvgIcon('settings', PALETTE.TEXT_PRIMARY, 18)}
            <span class="btn-label">Settings</span>
          </button>
        </nav>
      </header>

      <!-- Active Overlay Panels (Modals) -->
      <div id="panel-container" class="panel-container" hidden>
        <section id="panel-content" class="panel-card" role="dialog" aria-modal="true" aria-labelledby="panel-title">
          <header class="panel-header">
            <h2 id="panel-title" class="panel-title">Menu</h2>
            <button type="button" class="panel-close-btn" id="panel-close" title="Close Panel" aria-label="Close Panel">
              ${getSvgIcon('close', PALETTE.TEXT_PRIMARY, 18)}
            </button>
          </header>
          <div id="panel-body" class="panel-body"></div>
        </section>
      </div>

      <!-- Dialogue / Interaction Banner -->
      <div id="interaction-banner" class="interaction-banner" role="status" aria-live="polite" hidden>
        <div class="interaction-content" id="interaction-text"></div>
      </div>

      <!-- Mobile On-Screen Virtual Controller -->
      <div class="touch-controls" id="touch-controls" aria-label="Virtual Touch Controller">
        <div class="virtual-dpad" aria-label="Directional Pad">
          <button type="button" class="dpad-btn dpad-up" id="btn-up" aria-label="Move Up"></button>
          <button type="button" class="dpad-btn dpad-left" id="btn-left" aria-label="Move Left"></button>
          <button type="button" class="dpad-btn dpad-center" aria-hidden="true" tabindex="-1"></button>
          <button type="button" class="dpad-btn dpad-right" id="btn-right" aria-label="Move Right"></button>
          <button type="button" class="dpad-btn dpad-down" id="btn-down" aria-label="Move Down"></button>
        </div>

        <div class="virtual-actions" aria-label="Action Buttons">
          <button type="button" class="action-btn btn-act" id="btn-act" aria-label="Action">ACT</button>
          <button type="button" class="action-btn btn-menu" id="btn-menu" aria-label="Menu">MENU</button>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // HUD tab buttons
    const navButtons = this.root.querySelectorAll('.hud-btn[data-tab]');
    navButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        soundEngine.playClick();
        const tab = btn.getAttribute('data-tab');
        this.openTab(tab);
      });
    });

    // Close panel button
    const closeBtn = this.root.querySelector('#panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        soundEngine.playClick();
        this.closePanel();
      });
    }

    // Close on escape key
    this.root.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeTab && this.activeTab !== 'encounter') {
        this.closePanel();
      }
    });

    // Virtual MENU button toggles settings or closes
    const virtualMenuBtn = this.root.querySelector('#btn-menu');
    if (virtualMenuBtn) {
      virtualMenuBtn.addEventListener('click', () => {
        if (this.activeTab) {
          this.closePanel();
        } else {
          this.openTab('settings');
        }
      });
    }
  }

  getTouchElements() {
    return {
      up: this.root.querySelector('#btn-up'),
      down: this.root.querySelector('#btn-down'),
      left: this.root.querySelector('#btn-left'),
      right: this.root.querySelector('#btn-right'),
      action: this.root.querySelector('#btn-act'),
      menu: this.root.querySelector('#btn-menu'),
    };
  }

  openTab(tab) {
    if (this.activeTab === tab) {
      this.closePanel();
      return;
    }

    this.activeTab = tab;
    const container = this.root.querySelector('#panel-container');
    const title = this.root.querySelector('#panel-title');
    const body = this.root.querySelector('#panel-body');

    if (!container || !title || !body) return;

    soundEngine.playAlert();
    container.removeAttribute('hidden');

    switch (tab) {
      case 'map':
        title.textContent = "Commonwealth Realms (Governor's Cup)";
        body.innerHTML = this.renderMapPanel();
        break;
      case 'quests':
        title.textContent = 'Curriculum Quests';
        body.innerHTML = this.renderQuestsPanel();
        break;
      case 'inventory':
        title.textContent = 'Scholar Inventory & Relics';
        body.innerHTML = this.renderInventoryPanel();
        break;
      case 'settings':
        title.textContent = 'Game Settings & Accessibility';
        body.innerHTML = this.renderSettingsPanel();
        this.bindSettingsEvents(body);
        break;
      default:
        this.closePanel();
        return;
    }
  }

  closePanel() {
    this.activeTab = null;
    const container = this.root.querySelector('#panel-container');
    if (container) {
      container.setAttribute('hidden', '');
    }
  }

  updatePlayerStats(player) {
    this.player = player;
    const levelEl = this.root.querySelector('#hud-level');
    const hpBar = this.root.querySelector('#hud-hp-bar');
    const goldEl = this.root.querySelector('#hud-gold');

    if (levelEl) levelEl.textContent = `LV ${player.level}`;
    if (hpBar) hpBar.style.width = `${Math.max(0, (player.hp / player.maxHp) * 100)}%`;
    if (goldEl) goldEl.textContent = `${player.gold} G`;
  }

  renderMapPanel() {
    const realms = Object.values(SUBJECTS);
    return `
      <div class="map-grid">
        ${realms.map(r => `
          <article class="realm-card" style="border-left: 4px solid ${r.color}">
            <h3 class="realm-title" style="color: ${r.color}">${this.escapeHtml(r.realm)}</h3>
            <p class="realm-subject">Subject: <strong>${this.escapeHtml(r.name)}</strong></p>
            <p class="realm-boss">Dungeon Boss: <em>${this.escapeHtml(r.boss)}</em></p>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderQuestsPanel() {
    return `
      <div class="quests-list">
        ${this.player.quests.map(q => `
          <article class="quest-card" style="border-left: 4px solid ${q.color}">
            <header class="quest-card-header">
              <h3 class="quest-title">${this.escapeHtml(q.title)}</h3>
              <span class="quest-badge status-${q.status}">${this.escapeHtml(q.status.toUpperCase())}</span>
            </header>
            <p class="quest-desc">${this.escapeHtml(q.description)}</p>
            <footer class="quest-footer">
              <span class="quest-progress">${this.escapeHtml(q.progress)}</span>
              <span class="quest-rewards">+${q.rewardXp} XP · +${q.rewardGold} Gold</span>
            </footer>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderInventoryPanel() {
    return `
      <div class="inventory-grid">
        ${this.player.inventory.map(item => `
          <article class="item-card">
            <div class="item-icon-box" style="border: 1px solid ${item.color}">
              ${getSvgIcon(item.icon, item.color, 24)}
            </div>
            <div class="item-details">
              <h3 class="item-name">${this.escapeHtml(item.name)}</h3>
              <span class="item-type">${this.escapeHtml(item.subject)} · ${this.escapeHtml(item.type)}</span>
              <p class="item-desc">${this.escapeHtml(item.description)}</p>
            </div>
          </article>
        `).join('')}
      </div>
    `;
  }

  renderSettingsPanel() {
    const isMuted = soundEngine.isMuted();
    const reducedMotion = Boolean(this.player.settings.reducedMotion);

    return `
      <div class="settings-form">
        <fieldset class="settings-group">
          <legend class="settings-legend">Audio & Senses</legend>
          <div class="setting-row">
            <label for="toggle-audio" class="setting-label">Sound Effects (Procedural FX)</label>
            <button type="button" id="toggle-audio" class="btn-toggle ${isMuted ? 'muted' : 'active'}">
              ${isMuted ? getSvgIcon('audio-off', PALETTE.ERROR, 16) : getSvgIcon('audio-on', PALETTE.SUCCESS, 16)}
              <span>${isMuted ? 'Muted' : 'Enabled'}</span>
            </button>
          </div>
        </fieldset>

        <fieldset class="settings-group">
          <legend class="settings-legend">Motion & Accessibility</legend>
          <div class="setting-row">
            <label for="toggle-motion" class="setting-label">Reduced Motion (No Screen Shake)</label>
            <button type="button" id="toggle-motion" class="btn-toggle ${reducedMotion ? 'active' : ''}">
              <span>${reducedMotion ? 'Enabled (Calm)' : 'Standard'}</span>
            </button>
          </div>
        </fieldset>

        <fieldset class="settings-group">
          <legend class="settings-legend">Child Privacy & Identity</legend>
          <div class="setting-row">
            <div class="setting-label">
              <span>Adventurer Handle</span>
              <small class="setting-subtext">Zero PII. Randomly generated.</small>
            </div>
            <button type="button" id="btn-reroll-name" class="btn-secondary">
              Reroll Name
            </button>
          </div>
        </fieldset>
      </div>
    `;
  }

  bindSettingsEvents(container) {
    const audioBtn = container.querySelector('#toggle-audio');
    if (audioBtn) {
      audioBtn.addEventListener('click', () => {
        const isMuted = soundEngine.toggleMute();
        this.player.settings.audioMuted = isMuted;
        soundEngine.playClick();
        this.openTab('settings');
        if (this.callbacks.onSettingsChange) {
          this.callbacks.onSettingsChange(this.player.settings);
        }
      });
    }

    const motionBtn = container.querySelector('#toggle-motion');
    if (motionBtn) {
      motionBtn.addEventListener('click', () => {
        this.player.settings.reducedMotion = !this.player.settings.reducedMotion;
        soundEngine.playClick();
        this.openTab('settings');
        if (this.callbacks.onSettingsChange) {
          this.callbacks.onSettingsChange(this.player.settings);
        }
      });
    }

    const rerollBtn = container.querySelector('#btn-reroll-name');
    if (rerollBtn) {
      rerollBtn.addEventListener('click', () => {
        soundEngine.playChime();
        if (this.callbacks.onRerollHandle) {
          const newHandle = this.callbacks.onRerollHandle();
          this.player.handle = newHandle;
          const hudHandle = this.root.querySelector('#hud-handle');
          if (hudHandle) hudHandle.textContent = newHandle;
          this.openTab('settings');
        }
      });
    }
  }

  /**
   * Opens the turn-based encounter question modal.
   * @param {object} encounter
   * @param {object} question (sanitized without answerKey)
   * @param {(choiceId: string) => void} onSelectChoice
   */
  openEncounterModal(encounter, question, onSelectChoice) {
    this.activeTab = 'encounter';
    const container = this.root.querySelector('#panel-container');
    const title = this.root.querySelector('#panel-title');
    const body = this.root.querySelector('#panel-body');

    if (!container || !title || !body) return;

    soundEngine.playEncounterStart();
    container.removeAttribute('hidden');

    title.textContent = `Combat Encounter: ${encounter.name}`;

    body.innerHTML = `
      <div class="encounter-modal">
        <header class="encounter-enemy-header">
          <div class="enemy-info">
            <span class="enemy-name">${this.escapeHtml(encounter.name)}</span>
            <small class="enemy-type">${this.escapeHtml(encounter.type.toUpperCase())} · ${this.escapeHtml(encounter.subjectId)}</small>
          </div>
          <div class="enemy-hp-track">
            <span>HP</span>
            <div class="enemy-hp-bar">
              <div class="enemy-hp-fill" id="enemy-hp-fill" style="width: 100%"></div>
            </div>
          </div>
        </header>

        <section class="question-card-prompt" id="question-prompt">
          ${this.escapeHtml(question.prompt)}
        </section>

        <div class="choices-list" id="choices-container" role="radiogroup" aria-label="Question Choices">
          ${question.choices.map(c => `
            <button type="button" class="choice-btn" data-choice="${c.id}" role="radio" aria-checked="false">
              <span class="choice-key">${c.id.toUpperCase()}</span>
              <span class="choice-text">${this.escapeHtml(c.text)}</span>
            </button>
          `).join('')}
        </div>

        <div id="encounter-feedback-slot"></div>
      </div>
    `;

    const choiceButtons = body.querySelectorAll('.choice-btn');
    choiceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const choiceId = btn.getAttribute('data-choice');
        choiceButtons.forEach(b => (b.disabled = true));
        if (onSelectChoice) {
          onSelectChoice(choiceId);
        }
      });
    });
  }

  /**
   * Displays answer feedback and explanation card in the encounter modal.
   */
  showAnswerFeedback(result, onNext) {
    const body = this.root.querySelector('#panel-body');
    const feedbackSlot = this.root.querySelector('#encounter-feedback-slot');
    if (!feedbackSlot) return;

    if (result.correct) {
      soundEngine.playCorrect();
    } else {
      soundEngine.playWrong();
    }

    const enemyHpFill = this.root.querySelector('#enemy-hp-fill');
    if (enemyHpFill && result.enemyHp !== undefined) {
      enemyHpFill.style.width = `${Math.max(0, result.enemyHp * 50)}%`;
    }

    feedbackSlot.innerHTML = `
      <aside class="feedback-card ${result.correct ? 'feedback-correct' : 'feedback-incorrect'}">
        <h4 class="feedback-title">${result.correct ? '✔ Correct Answer!' : '✖ Academic Review Feedback'}</h4>
        <p class="feedback-text">${this.escapeHtml(result.explanation)}</p>
        <button type="button" class="feedback-action-btn" id="feedback-next-btn">
          ${result.enemyDefeated ? 'Claim Victory' : (result.playerDefeated ? 'Recover at Sanctuary' : 'Next Question')}
        </button>
      </aside>
    `;

    const nextBtn = feedbackSlot.querySelector('#feedback-next-btn');
    if (nextBtn) {
      nextBtn.focus();
      nextBtn.addEventListener('click', () => {
        soundEngine.playClick();
        if (onNext) onNext();
      });
    }
  }

  /**
   * Displays the Victory Celebration modal upon defeating the boss.
   */
  showVictoryModal(rewards, onDone) {
    this.activeTab = 'victory';
    const container = this.root.querySelector('#panel-container');
    const title = this.root.querySelector('#panel-title');
    const body = this.root.querySelector('#panel-body');

    if (!container || !title || !body) return;

    soundEngine.playFanfare();
    container.removeAttribute('hidden');
    title.textContent = 'Quest Complete!';

    body.innerHTML = `
      <article class="victory-card">
        <div class="victory-icon">${getSvgIcon('trophy', PALETTE.GOLD, 48)}</div>
        <h3 class="victory-title">The Verdant Sanctuary Restored!</h3>
        <p class="victory-desc">
          You answered every Governor's Cup question with precision, pacifying the Overgrown Guardian and restoring academic balance to Kentucky!
        </p>
        <div class="victory-rewards">
          <span>+${rewards.xp || 150} XP</span>
          <span>+${rewards.gold || 50} Gold</span>
        </div>
        <button type="button" class="feedback-action-btn" id="victory-done-btn">Return to Crossroads</button>
      </article>
    `;

    const doneBtn = body.querySelector('#victory-done-btn');
    if (doneBtn) {
      doneBtn.focus();
      doneBtn.addEventListener('click', () => {
        this.closePanel();
        if (onDone) onDone();
      });
    }
  }

  /**
   * Shows NPC dialogue modal (e.g. Elder Sage of Berea).
   */
  showNpcDialogueModal(npc, onAcceptQuest) {
    this.activeTab = 'npc';
    const container = this.root.querySelector('#panel-container');
    const title = this.root.querySelector('#panel-title');
    const body = this.root.querySelector('#panel-body');

    if (!container || !title || !body) return;

    soundEngine.playChime();
    container.removeAttribute('hidden');
    title.textContent = npc.name;

    body.innerHTML = `
      <article class="quest-card">
        <p class="quest-desc" style="font-size: 14px; line-height: 1.5;">${this.escapeHtml(npc.dialogue)}</p>
        <footer class="quest-footer" style="margin-top: 12px;">
          <button type="button" class="btn-secondary" id="npc-accept-btn">Accept Quest & Explore</button>
        </footer>
      </article>
    `;

    const acceptBtn = body.querySelector('#npc-accept-btn');
    if (acceptBtn) {
      acceptBtn.focus();
      acceptBtn.addEventListener('click', () => {
        this.closePanel();
        if (onAcceptQuest) onAcceptQuest();
      });
    }
  }

  showInteractionBanner(text) {
    const banner = this.root.querySelector('#interaction-banner');
    const content = this.root.querySelector('#interaction-text');
    if (!banner || !content) return;

    content.textContent = text;
    banner.removeAttribute('hidden');
  }

  hideInteractionBanner() {
    const banner = this.root.querySelector('#interaction-banner');
    if (banner) {
      banner.setAttribute('hidden', '');
    }
  }

  escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
