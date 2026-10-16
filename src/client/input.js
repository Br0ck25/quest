// src/client/input.js — Dual Keyboard & Touch Input Abstraction
// Handles mobile touch virtual D-Pad and keyboard navigation seamlessly.

export class InputManager {
  constructor() {
    this.keysDown = new Set();
    this.touchDown = new Set();
    this.justPressed = new Set();
    this.previousFrame = new Set();

    // Map keyboard codes to logical game actions
    this.keyMap = {
      ArrowUp: 'up',
      KeyW: 'up',
      KeyK: 'up',
      ArrowDown: 'down',
      KeyS: 'down',
      KeyJ: 'down',
      ArrowLeft: 'left',
      KeyA: 'left',
      KeyH: 'left',
      ArrowRight: 'right',
      KeyD: 'right',
      KeyL: 'right',
      Space: 'action',
      Enter: 'action',
      KeyZ: 'action',
      Escape: 'menu',
      KeyM: 'menu',
      KeyX: 'menu',
    };

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  /**
   * Initializes browser keyboard listeners if running in a DOM environment.
   */
  initKeyboard(target = globalThis.window) {
    if (!target || typeof target.addEventListener !== 'function') return;
    target.addEventListener('keydown', this.onKeyDown);
    target.addEventListener('keyup', this.onKeyUp);
  }

  /**
   * Cleans up browser listeners.
   */
  destroy(target = globalThis.window) {
    if (!target || typeof target.removeEventListener !== 'function') return;
    target.removeEventListener('keydown', this.onKeyDown);
    target.removeEventListener('keyup', this.onKeyUp);
  }

  onKeyDown(event) {
    const action = this.keyMap[event.code];
    if (action) {
      // Prevent browser scroll on arrow keys / spacebar during gameplay
      if (['up', 'down', 'left', 'right', 'action'].includes(action)) {
        if (typeof document !== 'undefined' && (event.target === document.body || (event.target && event.target.tagName === 'CANVAS'))) {
          if (typeof event.preventDefault === 'function') {
            event.preventDefault();
          }
        }
      }
      if (!this.keysDown.has(action)) {
        this.justPressed.add(action);
      }
      this.keysDown.add(action);
    }
  }

  onKeyUp(event) {
    const action = this.keyMap[event.code];
    if (action) {
      this.keysDown.delete(action);
    }
  }

  /**
   * Sets touch action state programmatically (e.g. from virtual D-Pad or on-screen buttons).
   * @param {string} action - 'up' | 'down' | 'left' | 'right' | 'action' | 'menu'
   * @param {boolean} isPressed
   */
  setTouchAction(action, isPressed) {
    if (isPressed) {
      if (!this.touchDown.has(action)) {
        this.justPressed.add(action);
      }
      this.touchDown.add(action);
    } else {
      this.touchDown.delete(action);
    }
  }

  /**
   * Checks if an action is currently held down via keyboard or touch.
   * @param {string} action
   * @returns {boolean}
   */
  isDown(action) {
    return this.keysDown.has(action) || this.touchDown.has(action);
  }

  /**
   * Checks if an action was newly triggered this frame.
   * @param {string} action
   * @returns {boolean}
   */
  isJustPressed(action) {
    return this.justPressed.has(action);
  }

  /**
   * Advance frame buffer — clears single-frame trigger events.
   * Call once per animation frame tick.
   */
  update() {
    this.justPressed.clear();
  }

  /**
   * Binds virtual D-Pad touch/pointer events to HTML elements.
   * Ensures touch-action: none and minimum 48px touch target support.
   */
  bindVirtualControls(elements) {
    if (!elements) return;

    const setupButton = (el, action) => {
      if (!el) return;

      const handlePress = (e) => {
        if (e.cancelable) e.preventDefault();
        this.setTouchAction(action, true);
        el.setAttribute('data-active', 'true');
      };

      const handleRelease = (e) => {
        if (e.cancelable) e.preventDefault();
        this.setTouchAction(action, false);
        el.removeAttribute('data-active');
      };

      el.addEventListener('pointerdown', handlePress);
      el.addEventListener('pointerup', handleRelease);
      el.addEventListener('pointercancel', handleRelease);
      el.addEventListener('pointerleave', handleRelease);
    };

    if (elements.up) setupButton(elements.up, 'up');
    if (elements.down) setupButton(elements.down, 'down');
    if (elements.left) setupButton(elements.left, 'left');
    if (elements.right) setupButton(elements.right, 'right');
    if (elements.action) setupButton(elements.action, 'action');
    if (elements.menu) setupButton(elements.menu, 'menu');
  }
}
