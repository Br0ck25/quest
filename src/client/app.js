// src/client/app.js — Core Game Client Orchestrator
// Connects Input, Game World, Canvas 2D Engine, Audio, and UI Overlay.

import { createDefaultPlayerProfile, generateAdventurerHandle } from '../data/game-data.js';
import { InputManager } from './input.js';
import { soundEngine } from './audio.js';
import { GameRenderer } from './renderer.js';
import { UIManager } from './ui.js';

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
    // Calculate available dimensions for canvas
    const container = this.canvas.parentElement || document.body;
    const width = container.clientWidth || window.innerWidth;
    const height = (container.clientHeight || window.innerHeight) * 0.65;
    this.renderer.handleResize(width, height);
  }

  tick(currentTime) {
    if (!this.running) return;

    const dt = Math.min((currentTime - this.lastTime) / 1000, 0.1); // Clamp to 100ms max
    this.lastTime = currentTime;

    // Handle [ACT] interact button trigger
    if (this.input.isJustPressed('action')) {
      if (this.renderer.activeInteraction) {
        soundEngine.playChime();
        this.ui.showInteractionBanner(
          `Examining ${this.renderer.activeInteraction.label}: Gateway to ${this.renderer.activeInteraction.subject.realm}.`
        );
      }
    }

    // Handle [MENU] button trigger
    if (this.input.isJustPressed('menu')) {
      if (this.ui.activeTab) {
        this.ui.closePanel();
      } else {
        this.ui.openTab('settings');
      }
    }

    // Update game physics and camera
    this.renderer.update(dt, this.input, Boolean(this.player.settings.reducedMotion));

    // Clear just-pressed buffer
    this.input.update();

    // Render frame
    this.renderer.render(currentTime);

    this.animationFrameId = requestAnimationFrame(this.tick);
  }
}
