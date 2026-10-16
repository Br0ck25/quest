// src/client/ui.js — Semantic Accessible UI Overlay
// Follows WHATWG HTML Living Standard: explicit closing tags, type="button", WCAG AA contrast.

import { PALETTE, SUBJECTS, ACCESSIBILITY } from '../data/constants.js';
import { getSvgIcon } from './sprites.js';
import { soundEngine } from './audio.js';

export class UIManager {
  constructor(rootElement, playerProfile, callbacks = {}) {
    this.root = rootElement;
    this.player = playerProfile;
    this.callbacks = callbacks;
    this.activeTab = null;
    this.lastFocusedElement = null;
    this._encounterKeyHandler = null;

    this.render();
    this.bindEvents();
    this.applySettings();
  }

  applySettings() {
    if (!this.root) return;
    const s = this.player.settings || {};

    // Text scale: 'normal' | 'large' | 'xlarge'
    this.root.classList.remove('text-scale-normal', 'text-scale-large', 'text-scale-xlarge');
    this.root.classList.add(`text-scale-${s.textScale || 'normal'}`);

    // Reduced motion
    if (s.reducedMotion) {
      this.root.classList.add('reduced-motion');
    } else {
      this.root.classList.remove('reduced-motion');
    }

    // High contrast
    if (s.highContrast) {
      this.root.classList.add('high-contrast');
    } else {
      this.root.classList.remove('high-contrast');
    }

    // Untimed practice mode
    if (s.untimedPractice) {
      this.root.classList.add('untimed-mode');
    } else {
      this.root.classList.remove('untimed-mode');
    }
  }

  announce(message) {
    const sr = this.root.querySelector('#sr-announcements');
    if (sr) {
      sr.textContent = '';
      setTimeout(() => {
        sr.textContent = message;
      }, 50);
    }
  }

  render() {
    if (!this.root) return;

    this.root.innerHTML = `
      <div id="sr-announcements" class="sr-only" aria-live="polite" aria-atomic="true"></div>

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
                <div class="hp-bar-fill" id="hud-hp-bar" role="progressbar" aria-valuenow="${this.player.hp}" aria-valuemin="0" aria-valuemax="${this.player.maxHp}" style="width: ${(this.player.hp / this.player.maxHp) * 100}%"></div>
              </div>
              <span class="hp-text" id="hud-hp-text">HP ${this.player.hp}/${this.player.maxHp}</span>
              <span class="gold-counter">
                <span class="gold-icon" aria-hidden="true">${getSvgIcon('scroll', PALETTE.GOLD, 14)}</span>
                <span id="hud-gold">${this.player.gold} G</span>
              </span>
            </div>
          </div>
        </div>

        <nav class="hud-nav" aria-label="Game Navigation">
          <button type="button" class="hud-btn" data-tab="map" title="Regional Map" aria-expanded="false" aria-controls="panel-container">
            ${getSvgIcon('map', PALETTE.TEXT_PRIMARY, 18)}
            <span class="btn-label">Map</span>
          </button>
          <button type="button" class="hud-btn" data-tab="quests" title="Quest Log" aria-expanded="false" aria-controls="panel-container">
            ${getSvgIcon('quests', PALETTE.TEXT_PRIMARY, 18)}
            <span class="btn-label">Quests</span>
          </button>
          <button type="button" class="hud-btn" data-tab="inventory" title="Inventory" aria-expanded="false" aria-controls="panel-container">
            ${getSvgIcon('inventory', PALETTE.TEXT_PRIMARY, 18)}
            <span class="btn-label">Items</span>
          </button>
          <button type="button" class="hud-btn" data-tab="settings" title="Game Settings" aria-expanded="false" aria-controls="panel-container">
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

  trapFocus(event, container) {
    if (event.key !== 'Tab') return;
    const focusables = Array.from(
      container.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled])')
    );
    if (focusables.length === 0) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first || !container.contains(document.activeElement)) {
        event.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last || !container.contains(document.activeElement)) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  bindEvents() {
    if (!this.root) return;
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

    // Modal focus trap & Escape key handler
    const panelContainer = this.root.querySelector('#panel-container');
    if (panelContainer) {
      panelContainer.addEventListener('keydown', (e) => {
        this.trapFocus(e, panelContainer);
      });
    }

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

    this.lastFocusedElement = document.activeElement;
    this.activeTab = tab;
    const container = this.root.querySelector('#panel-container');
    const title = this.root.querySelector('#panel-title');
    const body = this.root.querySelector('#panel-body');

    if (!container || !title || !body) return;

    soundEngine.playAlert();
    container.removeAttribute('hidden');

    // Update aria-expanded on navigation buttons
    this.root.querySelectorAll('.hud-btn[data-tab]').forEach(btn => {
      const isTarget = btn.getAttribute('data-tab') === tab;
      btn.setAttribute('aria-expanded', isTarget ? 'true' : 'false');
    });

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

    this.announce(`Opened ${title.textContent}`);

    // Set initial focus to close button or first action
    const closeBtn = this.root.querySelector('#panel-close');
    if (closeBtn) {
      closeBtn.focus();
    }
  }

  closePanel() {
    if (this._encounterKeyHandler) {
      this.root.removeEventListener('keydown', this._encounterKeyHandler);
      this._encounterKeyHandler = null;
    }
    this.activeTab = null;
    const container = this.root.querySelector('#panel-container');
    if (container) {
      container.setAttribute('hidden', '');
    }

    // Reset aria-expanded states
    this.root.querySelectorAll('.hud-btn[data-tab]').forEach(btn => {
      btn.setAttribute('aria-expanded', 'false');
    });

    // Restore focus to triggering element
    if (this.lastFocusedElement && typeof this.lastFocusedElement.focus === 'function') {
      try {
        this.lastFocusedElement.focus();
      } catch {}
    }
  }

  updatePlayerStats(player) {
    this.player = player;
    const levelEl = this.root.querySelector('#hud-level');
    const hpBar = this.root.querySelector('#hud-hp-bar');
    const hpText = this.root.querySelector('#hud-hp-text');
    const goldEl = this.root.querySelector('#hud-gold');

    if (levelEl) levelEl.textContent = `LV ${player.level}`;
    if (hpBar) {
      const pct = Math.max(0, (player.hp / player.maxHp) * 100);
      hpBar.style.width = `${pct}%`;
      hpBar.setAttribute('aria-valuenow', String(player.hp));
      hpBar.parentElement?.setAttribute('title', `Health: ${player.hp}/${player.maxHp}`);
    }
    if (hpText) hpText.textContent = `HP ${player.hp}/${player.maxHp}`;
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
        ${this.player.quests.map(q => {
          const isDone = q.status === 'completed';
          const isActive = q.status === 'active' || q.status === 'in_progress';
          const statusBadge = isDone
            ? '✔ [COMPLETED]'
            : (isActive ? '▶ [IN PROGRESS]' : '○ [AVAILABLE]');
          return `
          <article class="quest-card" style="border-left: 4px solid ${q.color}">
            <header class="quest-card-header">
              <h3 class="quest-title">${this.escapeHtml(q.title)}</h3>
              <span class="quest-badge status-${q.status}">${statusBadge}</span>
            </header>
            <p class="quest-desc">${this.escapeHtml(q.description)}</p>
            <footer class="quest-footer">
              <span class="quest-progress">Progress: <strong>${this.escapeHtml(q.progress)}</strong></span>
              <span class="quest-rewards">+${q.rewardXp} XP · +${q.rewardGold} Gold</span>
            </footer>
          </article>
        `;
        }).join('')}
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
              <div class="item-header-row">
                <h3 class="item-name">${this.escapeHtml(item.name)}</h3>
                <span class="item-equipped-badge ${item.equipped ? 'is-equipped' : ''}">
                  ${item.equipped ? '✔ [EQUIPPED]' : '○ [IN PACK]'}
                </span>
              </div>
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
    const highContrast = Boolean(this.player.settings.highContrast);
    const untimedPractice = Boolean(this.player.settings.untimedPractice);
    const textScale = this.player.settings.textScale || 'normal';

    return `
      <div class="settings-form">
        <fieldset class="settings-group">
          <legend class="settings-legend">Text Size & Visual Scale</legend>
          <div class="setting-row">
            <label class="setting-label" id="label-text-scale">Display Text Size</label>
            <div class="scale-buttons" role="radiogroup" aria-labelledby="label-text-scale">
              <button type="button" class="btn-scale ${textScale === 'normal' ? 'active' : ''}" data-scale="normal" role="radio" aria-checked="${textScale === 'normal'}">
                Normal (100%)
              </button>
              <button type="button" class="btn-scale ${textScale === 'large' ? 'active' : ''}" data-scale="large" role="radio" aria-checked="${textScale === 'large'}">
                Large (125%)
              </button>
              <button type="button" class="btn-scale ${textScale === 'xlarge' ? 'active' : ''}" data-scale="xlarge" role="radio" aria-checked="${textScale === 'xlarge'}">
                Extra Large (150%)
              </button>
            </div>
          </div>
        </fieldset>

        <fieldset class="settings-group">
          <legend class="settings-legend">Pacing & Accommodations (IEP / 504)</legend>
          <div class="setting-row">
            <div class="setting-label">
              <span>Untimed Practice Mode</span>
              <small class="setting-subtext">Disables time pressure and timers for relaxed academic practice.</small>
            </div>
            <button type="button" id="toggle-untimed" class="btn-toggle ${untimedPractice ? 'active' : ''}">
              <span>${untimedPractice ? '✔ Enabled (Untimed Mode)' : 'Standard (Timed Practice)'}</span>
            </button>
          </div>
        </fieldset>

        <fieldset class="settings-group">
          <legend class="settings-legend">Motion & Contrast Accessibility</legend>
          <div class="setting-row">
            <label for="toggle-motion" class="setting-label">Reduced Motion (No Screen Shake)</label>
            <button type="button" id="toggle-motion" class="btn-toggle ${reducedMotion ? 'active' : ''}">
              <span>${reducedMotion ? '✔ Enabled (Calm Mode)' : 'Standard Motion'}</span>
            </button>
          </div>
          <div class="setting-row" style="margin-top: 10px;">
            <label for="toggle-contrast" class="setting-label">High Contrast Borders</label>
            <button type="button" id="toggle-contrast" class="btn-toggle ${highContrast ? 'active' : ''}">
              <span>${highContrast ? '✔ High Contrast On' : 'Standard Contrast'}</span>
            </button>
          </div>
        </fieldset>

        <fieldset class="settings-group">
          <legend class="settings-legend">Audio & Senses</legend>
          <div class="setting-row">
            <label for="toggle-audio" class="setting-label">Sound Effects (Procedural Audio)</label>
            <button type="button" id="toggle-audio" class="btn-toggle ${isMuted ? 'muted' : 'active'}">
              ${isMuted ? getSvgIcon('audio-off', PALETTE.ERROR, 16) : getSvgIcon('audio-on', PALETTE.SUCCESS, 16)}
              <span>${isMuted ? 'Muted (Visual Cues Active)' : 'Enabled (Sound Active)'}</span>
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
    // Text scale selection
    container.querySelectorAll('.btn-scale').forEach(btn => {
      btn.addEventListener('click', () => {
        const scale = btn.getAttribute('data-scale');
        this.player.settings.textScale = scale;
        this.applySettings();
        soundEngine.playClick();
        this.openTab('settings');
        if (this.callbacks.onSettingsChange) {
          this.callbacks.onSettingsChange(this.player.settings);
        }
      });
    });

    // Untimed practice mode
    const untimedBtn = container.querySelector('#toggle-untimed');
    if (untimedBtn) {
      untimedBtn.addEventListener('click', () => {
        this.player.settings.untimedPractice = !this.player.settings.untimedPractice;
        this.applySettings();
        soundEngine.playClick();
        this.openTab('settings');
        if (this.callbacks.onSettingsChange) {
          this.callbacks.onSettingsChange(this.player.settings);
        }
      });
    }

    // High contrast mode
    const contrastBtn = container.querySelector('#toggle-contrast');
    if (contrastBtn) {
      contrastBtn.addEventListener('click', () => {
        this.player.settings.highContrast = !this.player.settings.highContrast;
        this.applySettings();
        soundEngine.playClick();
        this.openTab('settings');
        if (this.callbacks.onSettingsChange) {
          this.callbacks.onSettingsChange(this.player.settings);
        }
      });
    }

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
        this.applySettings();
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
    this.lastFocusedElement = document.activeElement;
    this.activeTab = 'encounter';
    const container = this.root.querySelector('#panel-container');
    const title = this.root.querySelector('#panel-title');
    const body = this.root.querySelector('#panel-body');

    if (!container || !title || !body) return;

    soundEngine.playEncounterStart();
    container.removeAttribute('hidden');

    title.textContent = `Combat Encounter: ${encounter.name}`;

    const untimedNotice = this.player.settings.untimedPractice
      ? `<div class="untimed-notice" role="note" aria-label="Untimed practice accommodation">
           <span class="badge-icon" aria-hidden="true">⏳</span>
           <span><strong>Untimed Practice Mode</strong> — Take as much time as you need.</span>
         </div>`
      : '';

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

        ${untimedNotice}

        <section class="question-card-prompt" id="question-prompt">
          ${this.escapeHtml(question.prompt)}
        </section>

        <div class="choices-list" id="choices-container" role="radiogroup" aria-label="Question Choices (Press 1-4 or A-D to answer)">
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

    this.announce(`Question encounter: ${question.prompt}`);

    const choiceButtons = body.querySelectorAll('.choice-btn');
    choiceButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const choiceId = btn.getAttribute('data-choice');
        choiceButtons.forEach(b => (b.disabled = true));
        if (this._encounterKeyHandler) {
          this.root.removeEventListener('keydown', this._encounterKeyHandler);
          this._encounterKeyHandler = null;
        }
        if (onSelectChoice) {
          onSelectChoice(choiceId);
        }
      });
    });

    // Keyboard choice selection handler: 1-4 or A-D
    const onEncounterKey = (e) => {
      if (this.activeTab !== 'encounter') return;
      const key = e.key.toLowerCase();
      let targetChoice = null;
      if (key === '1' || key === 'a') targetChoice = 'a';
      else if (key === '2' || key === 'b') targetChoice = 'b';
      else if (key === '3' || key === 'c') targetChoice = 'c';
      else if (key === '4' || key === 'd') targetChoice = 'd';

      if (targetChoice) {
        const btn = body.querySelector(`.choice-btn[data-choice="${targetChoice}"]`);
        if (btn && !btn.disabled) {
          e.preventDefault();
          btn.click();
        }
      }
    };

    if (this._encounterKeyHandler) {
      this.root.removeEventListener('keydown', this._encounterKeyHandler);
    }
    this._encounterKeyHandler = onEncounterKey;
    this.root.addEventListener('keydown', onEncounterKey);

    // Initial focus on first choice
    if (choiceButtons.length > 0) {
      choiceButtons[0].focus();
    }
  }

  /**
   * Displays answer feedback and explanation card in the encounter modal.
   */
  showAnswerFeedback(result, onNext) {
    if (this._encounterKeyHandler) {
      this.root.removeEventListener('keydown', this._encounterKeyHandler);
      this._encounterKeyHandler = null;
    }

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

    const statusBadge = result.correct
      ? '<span class="feedback-badge badge-correct">✔ [CORRECT]</span>'
      : '<span class="feedback-badge badge-incorrect">✖ [INCORRECT — REVIEW SCHEDULED]</span>';

    feedbackSlot.innerHTML = `
      <aside class="feedback-card ${result.correct ? 'feedback-correct' : 'feedback-incorrect'}" role="alert">
        <div class="feedback-status-row">
          ${statusBadge}
          <h4 class="feedback-title">${result.correct ? 'Mastery Verified!' : 'Academic Review Feedback'}</h4>
        </div>
        <p class="feedback-text">${this.escapeHtml(result.explanation)}</p>
        <button type="button" class="feedback-action-btn" id="feedback-next-btn">
          ${result.enemyDefeated ? 'Claim Victory' : (result.playerDefeated ? 'Recover at Sanctuary' : 'Next Question')}
        </button>
      </aside>
    `;

    this.announce(result.correct ? `Correct! ${result.explanation}` : `Incorrect. ${result.explanation}`);

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
