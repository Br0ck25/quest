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
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 48px;
  min-height: 48px;
  padding: 6px 10px;
  background-color: var(--color-surface-elevated);
  color: var(--color-text-primary);
  border: 1px solid var(--color-border-subtle);
  border-radius: 6px;
  font-family: var(--font-ui);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.15s, border-color 0.15s;
}

.hud-btn:hover {
  background-color: var(--color-surface-accent);
  border-color: var(--color-border-focus);
}

.hud-btn:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: 2px;
}

@media (max-width: 480px) {
  .btn-label {
    display: none;
  }
  .hud-btn {
    padding: 6px;
  }
}

/* Canvas Viewport */
.canvas-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg-dark);
  position: relative;
  overflow: hidden;
}

#game-canvas {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
  display: block;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
  background-color: #000;
}

/* Modals & Panels */
.panel-container {
  position: absolute;
  top: 52px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 50;
}

.panel-container[hidden] {
  display: none !important;
}

.panel-card {
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  background-color: var(--color-surface);
  border: 2px solid var(--color-border-focus);
  border-radius: 12px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
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
  min-width: 48px;
  min-height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  color: var(--color-text-secondary);
  cursor: pointer;
  border-radius: 6px;
}

.panel-close-btn:hover {
  color: var(--color-text-primary);
  background-color: var(--color-surface-accent);
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
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.realm-card {
  background-color: var(--color-surface-elevated);
  padding: 12px;
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.realm-title {
  font-size: 15px;
  font-weight: 700;
}

.realm-subject, .realm-boss {
  font-size: 13px;
  color: var(--color-text-secondary);
}

/* Quests */
.quests-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.quest-card {
  background-color: var(--color-surface-elevated);
  padding: 12px;
  border-radius: 6px;
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
  background-color: var(--color-success);
  color: var(--color-bg-dark);
}

.status-available {
  background-color: var(--color-surface-accent);
  color: var(--color-text-primary);
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
  color: var(--color-text-secondary);
}

.quest-rewards {
  color: var(--color-gold);
  font-weight: 600;
}

/* Inventory */
.inventory-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.item-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background-color: var(--color-surface-elevated);
  padding: 10px;
  border-radius: 6px;
}

.item-icon-box {
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background-color: var(--color-surface);
  flex-shrink: 0;
}

.item-details {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.item-name {
  font-size: 13px;
  font-weight: 700;
  color: var(--color-text-primary);
}

.item-type {
  font-size: 11px;
  color: var(--color-text-secondary);
  font-family: var(--font-mono);
}

.item-desc {
  font-size: 11px;
  color: var(--color-text-secondary);
}

/* Settings Form */
.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.settings-group {
  border: 1px solid var(--color-border-subtle);
  border-radius: 8px;
  padding: 12px;
}

.settings-legend {
  font-size: 12px;
  font-weight: 700;
  color: var(--color-border-focus);
  padding: 0 6px;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.setting-label {
  font-size: 13px;
  color: var(--color-text-primary);
  display: flex;
  flex-direction: column;
}

.setting-subtext {
  font-size: 11px;
  color: var(--color-text-secondary);
}

.btn-toggle {
  min-height: 48px;
  min-width: 110px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 12px;
  background-color: var(--color-surface-elevated);
  border: 1px solid var(--color-border-subtle);
  border-radius: 6px;
  color: var(--color-text-primary);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.btn-toggle.active {
  border-color: var(--color-success);
}

.btn-toggle.muted {
  border-color: var(--color-error);
}

.btn-toggle:focus-visible, .btn-secondary:focus-visible {
  outline: 2px solid var(--color-border-focus);
}

.btn-secondary {
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

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
`;
