// src/client/ui.js — Semantic Accessible UI Overlay
// Follows WHATWG HTML Living Standard: explicit closing tags, type="button", WCAG AA contrast.

import { PALETTE, SUBJECTS } from '../data/constants.js';
import { getSvgIcon } from './sprites.js';
import { soundEngine } from './audio.js';

export class UIManager {
  constructor(rootElement, playerProfile, callbacks = {}) {
    this.root = rootElement;
    this.player = playerProfile;
    this.callbacks = callbacks; // onSettingsChange, onInteraction, etc.
    this.activeTab = null; // 'map' | 'quests' | 'inventory' | 'settings' | null

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
              <span class="level-badge">LV ${this.player.level}</span>
              <div class="hp-bar-container" title="Health: ${this.player.hp}/${this.player.maxHp}">
                <div class="hp-bar-fill" style="width: ${(this.player.hp / this.player.maxHp) * 100}%"></div>
              </div>
              <span class="gold-counter">
                <span class="gold-icon" aria-hidden="true">${getSvgIcon('scroll', PALETTE.GOLD, 14)}</span>
                <span>${this.player.gold} G</span>
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
      if (e.key === 'Escape' && this.activeTab) {
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
