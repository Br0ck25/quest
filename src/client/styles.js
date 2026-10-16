// src/client/styles.js — Responsive Game Shell Stylesheet
// 100% compliant with approved color palette, mobile-first touch layout, and accessibility standards.

import { PALETTE } from '../data/constants.js';

export const GAME_CSS = `
:root {
  --color-bg-dark: ${PALETTE.BG_DARK};
  --color-surface: ${PALETTE.SURFACE};
  --color-surface-elevated: ${PALETTE.SURFACE_ELEVATED};
  --color-surface-accent: ${PALETTE.SURFACE_ACCENT};
  --color-border-subtle: ${PALETTE.BORDER_SUBTLE};
  --color-border-focus: ${PALETTE.BORDER_FOCUS};
  --color-parchment: ${PALETTE.PARCHMENT};
  --color-parchment-border: ${PALETTE.PARCHMENT_BORDER};
  --color-text-primary: ${PALETTE.TEXT_PRIMARY};
  --color-text-secondary: ${PALETTE.TEXT_SECONDARY};
  --color-text-dark: ${PALETTE.TEXT_DARK};
  --color-success: ${PALETTE.SUCCESS};
  --color-warning: ${PALETTE.WARNING};
  --color-error: ${PALETTE.ERROR};
  --color-gold: ${PALETTE.GOLD};

  --color-subject-math: ${PALETTE.MATH};
  --color-subject-science: ${PALETTE.SCIENCE};
  --color-subject-social: ${PALETTE.SOCIAL_STUDIES};
  --color-subject-lang: ${PALETTE.LANGUAGE_ARTS};
  --color-subject-arts: ${PALETTE.ARTS_HUMANITIES};

  --font-ui: ui-rounded, "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --font-mono: ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}

*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  -webkit-tap-highlight-color: transparent;
}

html, body {
  width: 100%;
  height: 100%;
  overflow: hidden;
  background-color: var(--color-bg-dark);
  color: var(--color-text-primary);
  font-family: var(--font-ui);
  user-select: none;
  -webkit-user-select: none;
}

#app-root {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

/* Header & HUD */
.game-hud {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: var(--color-surface);
  border-bottom: 2px solid var(--color-border-subtle);
  z-index: 20;
  min-height: 52px;
}

.hud-player {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: var(--color-surface-elevated);
  border: 1px solid var(--color-border-focus);
}

.hud-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.player-handle {
  font-size: 14px;
  font-weight: 700;
  color: var(--color-text-primary);
  letter-spacing: 0.2px;
}

.player-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.level-badge {
  background-color: var(--color-surface-elevated);
  padding: 1px 5px;
  border-radius: 4px;
  font-family: var(--font-mono);
  font-weight: 600;
  color: var(--color-border-focus);
}

.hp-bar-container {
  width: 50px;
  height: 6px;
  background-color: var(--color-bg-dark);
  border-radius: 3px;
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
}

.hp-bar-fill {
  height: 100%;
  background-color: var(--color-success);
  transition: width 0.3s ease;
}

.gold-counter {
  display: flex;
  align-items: center;
  gap: 3px;
  color: var(--color-gold);
  font-family: var(--font-mono);
  font-weight: 600;
}

.hud-nav {
  display: flex;
  align-items: center;
  gap: 6px;
}

.hud-btn {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  padding: 4px 6px;
  background-color: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-family: var(--font-ui);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}

.hud-btn:hover {
  background-color: var(--color-surface-elevated);
  color: var(--color-text-primary);
}

.hud-btn:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.btn-label {
  font-size: 10px;
  font-weight: 600;
  margin-top: 2px;
}

/* Canvas Viewport */
.canvas-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  background-color: var(--color-bg-dark);
  overflow: hidden;
}

#game-canvas {
  display: block;
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
}

/* Modal Overlay Panels */
.panel-container {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 40;
}

.panel-container[hidden] {
  display: none !important;
}

.panel-card {
  width: 100%;
  max-width: 540px;
  max-height: 90vh;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border-subtle);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.6);
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background-color: var(--color-surface-elevated);
  border-bottom: 1px solid var(--color-border-subtle);
}

.panel-title {
  font-size: 16px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.panel-close-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 48px;
  min-height: 48px;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 6px;
}

.panel-close-btn:hover {
  background-color: var(--color-surface-accent);
  color: var(--color-text-primary);
}

.panel-close-btn:focus-visible {
  outline: 2px solid var(--color-border-focus);
}

.panel-body {
  padding: 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Map Grid */
.map-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.realm-card {
  background-color: var(--color-surface-elevated);
  padding: 10px 14px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.realm-title {
  font-size: 14px;
  font-weight: 700;
}

.realm-subject, .realm-boss {
  font-size: 12px;
  color: var(--color-text-secondary);
}

/* Quests List */
.quests-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quest-card {
  background-color: var(--color-surface-elevated);
  padding: 12px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quest-card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.quest-title {
  font-size: 14px;
  font-weight: 700;
}

.quest-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: var(--font-mono);
}

.status-active {
  background-color: rgba(56, 189, 248, 0.2);
  color: var(--color-border-focus);
  border: 1px solid var(--color-border-focus);
}

.status-available {
  background-color: rgba(148, 163, 184, 0.2);
  color: var(--color-text-secondary);
}

.status-completed {
  background-color: rgba(16, 185, 129, 0.2);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.quest-desc {
  font-size: 12px;
  color: var(--color-text-secondary);
}

.quest-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
  margin-top: 4px;
  padding-top: 4px;
  border-top: 1px solid var(--color-surface-accent);
}

.quest-progress {
  color: var(--color-text-secondary);
}

.quest-rewards {
  color: var(--color-gold);
  font-family: var(--font-mono);
  font-weight: 600;
}

/* Inventory Grid */
.inventory-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: var(--color-surface-elevated);
  padding: 10px 14px;
  border-radius: 8px;
}

.item-icon-box {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  background-color: var(--color-surface);
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 13px;
  font-weight: 700;
}

.item-type {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.item-desc {
  font-size: 11px;
  color: var(--color-text-secondary);
}

/* Settings Form */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.settings-group {
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  padding: 12px 14px;
}

.settings-legend {
  padding: 0 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--color-border-focus);
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 0;
}

.setting-label {
  font-size: 13px;
  display: flex;
  flex-direction: column;
}

.setting-subtext {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.btn-toggle {
  min-width: 48px;
  min-height: 48px;
  padding: 6px 14px;
  background-color: var(--color-surface-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: 6px;
  color: var(--color-text-primary);
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
}

.btn-toggle.active {
  border-color: var(--color-success);
}

.btn-toggle.muted {
  border-color: var(--color-error);
}

.btn-secondary {
  min-width: 48px;
  min-height: 48px;
  padding: 6px 14px;
  background-color: var(--color-surface-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-secondary:hover {
  background-color: var(--color-surface-accent);
}

/* Interaction Banner */
.interaction-banner {
  position: absolute;
  top: 64px;
  left: 50%;
  transform: translateX(-50%);
  background-color: var(--color-surface);
  border: 2px solid var(--color-border-focus);
  padding: 10px 18px;
  border-radius: 8px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4);
  z-index: 30;
  max-width: 90%;
  text-align: center;
  font-size: 13px;
  font-weight: 600;
}

.interaction-banner[hidden] {
  display: none !important;
}

/* Encounter & Combat Dialog */
.encounter-modal {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.encounter-enemy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: var(--color-surface-elevated);
  padding: 10px 14px;
  border-radius: 8px;
  border-left: 4px solid var(--color-subject-science);
}

.enemy-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.enemy-name {
  font-size: 14px;
  font-weight: 700;
}

.enemy-hp-track {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-error);
}

.enemy-hp-bar {
  width: 70px;
  height: 8px;
  background-color: var(--color-bg-dark);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--color-border-subtle);
}

.enemy-hp-fill {
  height: 100%;
  background-color: var(--color-error);
  transition: width 0.25s ease;
}

.question-card-prompt {
  font-size: 14px;
  line-height: 1.45;
  color: var(--color-text-primary);
  background-color: var(--color-surface-elevated);
  padding: 14px;
  border-radius: 8px;
  border: 1px solid var(--color-border-subtle);
}

.choices-list {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.choice-btn {
  display: flex;
  align-items: center;
  min-height: 48px;
  padding: 10px 14px;
  background-color: var(--color-surface-elevated);
  border: 2px solid var(--color-border-subtle);
  border-radius: 8px;
  color: var(--color-text-primary);
  font-size: 13px;
  font-family: var(--font-ui);
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s, background-color 0.15s;
}

.choice-btn:hover {
  border-color: var(--color-border-focus);
}

.choice-btn:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

.choice-key {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-right: 10px;
  border-radius: 4px;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border-focus);
  color: var(--color-border-focus);
  font-family: var(--font-mono);
  font-weight: 700;
  font-size: 11px;
}

.choice-btn.selected-correct {
  border-color: var(--color-success);
  background-color: rgba(16, 185, 129, 0.15);
}

.choice-btn.selected-incorrect {
  border-color: var(--color-error);
  background-color: rgba(239, 68, 68, 0.15);
}

.feedback-card {
  padding: 12px 14px;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.feedback-correct {
  background-color: rgba(16, 185, 129, 0.12);
  border: 1px solid var(--color-success);
}

.feedback-incorrect {
  background-color: rgba(239, 68, 68, 0.12);
  border: 1px solid var(--color-error);
}

.feedback-title {
  font-size: 13px;
  font-weight: 700;
}

.feedback-text {
  font-size: 12px;
  line-height: 1.4;
  color: var(--color-text-primary);
}

.feedback-action-btn {
  min-height: 48px;
  padding: 8px 16px;
  background-color: var(--color-border-focus);
  color: var(--color-bg-dark);
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  align-self: flex-end;
}

.victory-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  padding: 16px;
}

.victory-icon {
  margin-bottom: 4px;
}

.victory-title {
  font-size: 18px;
  font-weight: 800;
  color: var(--color-gold);
}

.victory-desc {
  font-size: 13px;
  color: var(--color-text-secondary);
  line-height: 1.45;
}

.victory-rewards {
  display: flex;
  gap: 16px;
  padding: 10px 18px;
  border-radius: 8px;
  background-color: var(--color-surface-elevated);
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-gold);
}

/* Touch Controls Overlay */
.touch-controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 150px;
  pointer-events: none;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 16px 12px 16px;
  z-index: 25;
}

.virtual-dpad {
  pointer-events: auto;
  position: relative;
  width: 132px;
  height: 132px;
  touch-action: none;
}

.dpad-btn {
  position: absolute;
  width: 48px;
  height: 48px;
  background-color: rgba(30, 41, 59, 0.75);
  border: 2px solid var(--color-border-subtle);
  border-radius: 8px;
  cursor: pointer;
  touch-action: none;
}

.dpad-btn[data-active="true"] {
  background-color: var(--color-border-focus);
}

.dpad-up { top: 0; left: 42px; border-radius: 8px 8px 2px 2px; }
.dpad-down { bottom: 0; left: 42px; border-radius: 2px 2px 8px 8px; }
.dpad-left { top: 42px; left: 0; border-radius: 8px 2px 2px 8px; }
.dpad-right { top: 42px; right: 0; border-radius: 2px 8px 8px 2px; }
.dpad-center {
  top: 42px;
  left: 42px;
  width: 48px;
  height: 48px;
  background-color: rgba(15, 23, 42, 0.85);
  border: none;
  pointer-events: none;
}

.virtual-actions {
  pointer-events: auto;
  display: flex;
  align-items: center;
  gap: 12px;
  touch-action: none;
}

.action-btn {
  width: 56px;
  height: 56px;
  min-width: 48px;
  min-height: 48px;
  border-radius: 50%;
  border: 2px solid var(--color-border-subtle);
  background-color: rgba(30, 41, 59, 0.85);
  color: var(--color-text-primary);
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  touch-action: none;
}

.action-btn[data-active="true"] {
  background-color: var(--color-border-focus);
  color: var(--color-bg-dark);
}

.btn-act {
  border-color: var(--color-success);
}

.btn-menu {
  border-color: var(--color-warning);
}

/* Accessibility & Usability Enhancements (WCAG AA) */
*:focus-visible,
button:focus-visible,
[tabindex]:focus-visible {
  outline: 3px solid var(--color-border-focus) !important;
  outline-offset: 3px !important;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* Text Scaling */
.text-scale-normal {
  font-size: 14px;
}
.text-scale-large {
  font-size: 16px;
}
.text-scale-large .player-handle { font-size: 16px; }
.text-scale-large .btn-label { font-size: 13px; }
.text-scale-large .choice-text { font-size: 15px; }
.text-scale-large .question-card-prompt { font-size: 16px; }
.text-scale-large .feedback-text { font-size: 14px; }
.text-scale-large .quest-desc { font-size: 14px; }
.text-scale-large .item-desc { font-size: 13px; }

.text-scale-xlarge {
  font-size: 18px;
}
.text-scale-xlarge .player-handle { font-size: 18px; }
.text-scale-xlarge .btn-label { font-size: 14px; }
.text-scale-xlarge .choice-text { font-size: 17px; }
.text-scale-xlarge .question-card-prompt { font-size: 18px; }
.text-scale-xlarge .feedback-text { font-size: 16px; }
.text-scale-xlarge .quest-desc { font-size: 16px; }
.text-scale-xlarge .item-desc { font-size: 15px; }

/* High Contrast Mode */
.high-contrast {
  --color-border-subtle: #94A3B8;
  --color-surface-elevated: #1E293B;
}
.high-contrast .choice-btn,
.high-contrast .realm-card,
.high-contrast .quest-card,
.high-contrast .item-card,
.high-contrast .panel-card {
  border-width: 3px !important;
}
.high-contrast .choice-key {
  border-width: 2px !important;
  font-weight: 900 !important;
}

/* Reduced Motion (System & App-level) */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

.reduced-motion *,
.reduced-motion *::before,
.reduced-motion *::after {
  animation-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.001ms !important;
}

/* Accommodations, Scale Buttons, Non-Color Cues */
.untimed-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 12px;
  border-radius: 6px;
  background-color: var(--color-surface-elevated);
  border: 1px solid var(--color-border-focus);
  font-size: 12px;
  color: var(--color-border-focus);
}

.scale-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.btn-scale {
  min-height: 48px;
  min-width: 48px;
  padding: 8px 14px;
  border-radius: 6px;
  border: 2px solid var(--color-border-subtle);
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.15s ease;
}

.btn-scale.active {
  border-color: var(--color-border-focus);
  background-color: var(--color-surface-elevated);
  color: var(--color-text-primary);
}

.item-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.item-equipped-badge {
  font-size: 10px;
  font-weight: 700;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--color-border-subtle);
  color: var(--color-text-secondary);
}

.item-equipped-badge.is-equipped {
  border-color: var(--color-success);
  color: var(--color-success);
  background-color: rgba(16, 185, 129, 0.12);
}

.feedback-status-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.feedback-badge {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 800;
  padding: 2px 8px;
  border-radius: 4px;
  letter-spacing: 0.5px;
}

.feedback-badge.badge-correct {
  background-color: rgba(16, 185, 129, 0.2);
  color: var(--color-success);
  border: 1px solid var(--color-success);
}

.feedback-badge.badge-incorrect {
  background-color: rgba(239, 68, 68, 0.2);
  color: var(--color-error);
  border: 1px solid var(--color-error);
}

.hp-text {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 700;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

/* Responsive Viewports */
@media (max-width: 480px) {
  .game-hud {
    padding: 6px 8px;
  }
  .hud-meta {
    gap: 1px;
  }
  .hud-btn {
    padding: 4px 6px;
    min-width: 48px;
  }
  .btn-label {
    display: none;
  }
  .panel-card {
    width: 96%;
    max-height: 90vh;
  }
}

@media (min-width: 768px) {
  .panel-card {
    max-width: 680px;
  }
}
`;
