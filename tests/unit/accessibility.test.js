// tests/unit/accessibility.test.js — Accessibility, contrast, device polish & accommodations tests
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PALETTE, VIEWPORT, ACCESSIBILITY } from '../../src/data/constants.js';
import { createDefaultPlayerProfile } from '../../src/data/game-data.js';
import { UIManager } from '../../src/client/ui.js';
import { GAME_CSS } from '../../src/client/styles.js';

// WCAG 2.1 relative luminance calculation
function calculateLuminance(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const [rl, gl, bl] = [r, g, b].map((v) =>
    v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function calculateContrastRatio(color1, color2) {
  const lum1 = calculateLuminance(color1);
  const lum2 = calculateLuminance(color2);
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  return (lighter + 0.05) / (darker + 0.05);
}

test('Accessibility Constants: Target viewports and minimum touch targets defined', () => {
  assert.equal(ACCESSIBILITY.MIN_TOUCH_TARGET_PX, 48);
  assert.equal(VIEWPORT.MIN_TOUCH_TARGET, 48);
  assert.deepEqual(Object.keys(ACCESSIBILITY.TEXT_SCALES), ['NORMAL', 'LARGE', 'XLARGE']);
  assert.equal(ACCESSIBILITY.TARGET_VIEWPORTS.length, 5);

  const viewportNames = ACCESSIBILITY.TARGET_VIEWPORTS.map((v) => v.name);
  assert.ok(viewportNames.includes('Small Phone'));
  assert.ok(viewportNames.includes('Large Phone'));
  assert.ok(viewportNames.includes('Tablet'));
  assert.ok(viewportNames.includes('Chromebook'));
  assert.ok(viewportNames.includes('Desktop'));
});

test('WCAG 2.1 AA Contrast: All text and accent colors exceed 4.5:1 on dark backgrounds', () => {
  const bgDark = PALETTE.BG_DARK;
  const surface = PALETTE.SURFACE;

  // Primary text must meet AAA (> 7.0:1)
  const primaryOnBg = calculateContrastRatio(PALETTE.TEXT_PRIMARY, bgDark);
  const primaryOnSurface = calculateContrastRatio(PALETTE.TEXT_PRIMARY, surface);
  assert.ok(primaryOnBg >= 7.0, `TEXT_PRIMARY on BG_DARK (${primaryOnBg.toFixed(2)}) must exceed 7.0:1`);
  assert.ok(primaryOnSurface >= 7.0, `TEXT_PRIMARY on SURFACE (${primaryOnSurface.toFixed(2)}) must exceed 7.0:1`);

  // Secondary text must meet AA (> 4.5:1)
  const secondaryOnBg = calculateContrastRatio(PALETTE.TEXT_SECONDARY, bgDark);
  const secondaryOnSurface = calculateContrastRatio(PALETTE.TEXT_SECONDARY, surface);
  assert.ok(secondaryOnBg >= 4.5, `TEXT_SECONDARY on BG_DARK (${secondaryOnBg.toFixed(2)}) must exceed 4.5:1`);
  assert.ok(secondaryOnSurface >= 4.5, `TEXT_SECONDARY on SURFACE (${secondaryOnSurface.toFixed(2)}) must exceed 4.5:1`);

  // Status & interactive indicators must meet AA (> 4.5:1)
  assert.ok(calculateContrastRatio(PALETTE.BORDER_FOCUS, bgDark) >= 4.5);
  assert.ok(calculateContrastRatio(PALETTE.GOLD, bgDark) >= 4.5);
  assert.ok(calculateContrastRatio(PALETTE.SUCCESS, bgDark) >= 4.5);
  assert.ok(calculateContrastRatio(PALETTE.ERROR, bgDark) >= 4.5);
  assert.ok(calculateContrastRatio(PALETTE.WARNING, bgDark) >= 4.5);
});

test('Non-color-only cues: Status indicators pair icons and semantic text labels', () => {
  const cues = ACCESSIBILITY.STATUS_CUES;
  assert.equal(cues.COMPLETED.icon, '✓');
  assert.equal(cues.COMPLETED.label, 'COMPLETED');
  assert.equal(cues.IN_PROGRESS.icon, '▶');
  assert.equal(cues.IN_PROGRESS.label, 'IN PROGRESS');
  assert.equal(cues.AVAILABLE.icon, '○');
  assert.equal(cues.AVAILABLE.label, 'AVAILABLE');
  assert.equal(cues.CORRECT.icon, '✓');
  assert.equal(cues.CORRECT.label, 'CORRECT');
  assert.equal(cues.INCORRECT.icon, '✗');
  assert.equal(cues.INCORRECT.label, 'REVIEW NEEDED');
});

test('Stylesheet Verification: Contains focus indicators, text scales, reduced-motion, and 48px hit areas', () => {
  assert.match(GAME_CSS, /\*:focus-visible/);
  assert.match(GAME_CSS, /outline:\s*3px solid/);
  assert.match(GAME_CSS, /\.sr-only/);
  assert.match(GAME_CSS, /\.text-scale-normal/);
  assert.match(GAME_CSS, /\.text-scale-large/);
  assert.match(GAME_CSS, /\.text-scale-xlarge/);
  assert.match(GAME_CSS, /\.high-contrast/);
  assert.match(GAME_CSS, /prefers-reduced-motion:\s*reduce/);
  assert.match(GAME_CSS, /\.reduced-motion/);
  assert.match(GAME_CSS, /\.untimed-notice/);

  // Verify minimum touch target 48px in CSS
  assert.match(GAME_CSS, /min-height:\s*48px/);
  assert.match(GAME_CSS, /min-width:\s*48px/);
});

test('UIManager Mock DOM: Renders ARIA landmarks, sr-only region, and text-scale classes', () => {
  const classListSet = new Set();
  const mockClassList = {
    add: (...classes) => classes.forEach((c) => classListSet.add(c)),
    remove: (...classes) => classes.forEach((c) => classListSet.delete(c)),
    contains: (c) => classListSet.has(c),
  };

  const elementsMap = new Map();
  const mockRoot = {
    innerHTML: '',
    classList: mockClassList,
    querySelector: (sel) => elementsMap.get(sel) || null,
    querySelectorAll: () => [],
    addEventListener: () => {},
    removeEventListener: () => {},
  };

  const profile = createDefaultPlayerProfile();
  profile.settings.textScale = 'large';
  profile.settings.untimedPractice = true;
  profile.settings.reducedMotion = true;
  profile.settings.highContrast = true;

  const ui = new UIManager(mockRoot, profile);

  // Check generated DOM string
  assert.match(mockRoot.innerHTML, /id="sr-announcements"/);
  assert.match(mockRoot.innerHTML, /aria-live="polite"/);
  assert.match(mockRoot.innerHTML, /role="banner"/);
  assert.match(mockRoot.innerHTML, /role="progressbar"/);
  assert.match(mockRoot.innerHTML, /id="hud-hp-text"/);
  assert.match(mockRoot.innerHTML, /aria-controls="panel-container"/);

  // Check settings classes applied to root
  assert.ok(mockClassList.contains('text-scale-large'));
  assert.ok(mockClassList.contains('untimed-mode'));
  assert.ok(mockClassList.contains('reduced-motion'));
  assert.ok(mockClassList.contains('high-contrast'));
});

test('UIManager Focus Trap & Keyboard Navigation helper logic', () => {
  const profile = createDefaultPlayerProfile();
  const ui = new UIManager(null, profile);

  // Test trapFocus cycling
  let defaultPrevented = false;
  let focusedElement = null;

  const firstBtn = { focus: () => { focusedElement = firstBtn; } };
  const lastBtn = { focus: () => { focusedElement = lastBtn; } };

  const mockContainer = {
    querySelectorAll: () => [firstBtn, lastBtn],
    contains: () => true,
  };

  // Tab on last element wraps to first
  globalThis.document = { activeElement: lastBtn };
  ui.trapFocus({
    key: 'Tab',
    shiftKey: false,
    preventDefault: () => { defaultPrevented = true; },
  }, mockContainer);

  assert.equal(defaultPrevented, true);
  assert.equal(focusedElement, firstBtn);

  // Shift+Tab on first element wraps to last
  defaultPrevented = false;
  globalThis.document = { activeElement: firstBtn };
  ui.trapFocus({
    key: 'Tab',
    shiftKey: true,
    preventDefault: () => { defaultPrevented = true; },
  }, mockContainer);

  assert.equal(defaultPrevented, true);
  assert.equal(focusedElement, lastBtn);
});
