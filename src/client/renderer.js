// src/client/renderer.js — 2D Canvas Procedural Game Engine
// Renders 320x240 retro world with crisp pixel scaling and offscreen tile atlas.

import { VIEWPORT, PALETTE, SUBJECTS } from '../data/constants.js';
import { HERO_SPRITES, renderPixelSprite, createTileAtlas } from './sprites.js';

export class GameRenderer {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = canvasElement ? canvasElement.getContext('2d') : null;
    this.atlas = null;

    // Viewport dimensions
    this.width = VIEWPORT.LOGICAL_WIDTH;
    this.height = VIEWPORT.LOGICAL_HEIGHT;
    this.tileSize = VIEWPORT.TILE_SIZE;

    // World map grid: 20 cols x 16 rows (320px x 256px world)
    this.cols = 20;
    this.rows = 16;
    this.worldWidth = this.cols * this.tileSize;
    this.worldHeight = this.rows * this.tileSize;

    // Camera
    this.camera = { x: 0, y: 0 };

    // Player state
    this.player = {
      x: 152, // Center of world
      y: 120,
      direction: 'down',
      speed: 80, // pixels per second
      width: 16,
      height: 16,
      moving: false,
    };

    // Shrines for the 5 KAAC Academic Subjects
    this.shrines = [
      { id: 'math', col: 3, row: 3, subject: SUBJECTS.MATH, label: 'Cipher Portal' },
      { id: 'science', col: 16, row: 3, subject: SUBJECTS.SCIENCE, label: 'Verdant Portal' },
      { id: 'social_studies', col: 3, row: 12, subject: SUBJECTS.SOCIAL_STUDIES, label: 'Time Portal' },
      { id: 'language_arts', col: 16, row: 12, subject: SUBJECTS.LANGUAGE_ARTS, label: 'Archive Portal' },
      { id: 'arts_humanities', col: 9, row: 2, subject: SUBJECTS.ARTS_HUMANITIES, label: 'Gallery Portal' },
    ];

    // Build starter map tile array (0=grass, 1=path, 2=water, 3=wall, 4=tree)
    this.map = this.generateMap();

    // Nearby interaction prompt
    this.activeInteraction = null;

    if (typeof document !== 'undefined') {
      this.atlas = createTileAtlas();
    }
  }

  generateMap() {
    const tiles = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        // Outer boundaries: trees
        if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
          row.push(4);
        }
        // Central crossroads path
        else if (r === 8 || c === 9 || c === 10) {
          row.push(1);
        }
        // Small decorative pond in lower corner
        else if (r >= 11 && r <= 13 && c >= 9 && c <= 11) {
          row.push(2);
        }
        // Grassy meadows
        else {
          row.push(0);
        }
      }
      tiles.push(row);
    }
    return tiles;
  }

  /**
   * Resizes canvas to match container while preserving crisp pixel ratio.
   */
  handleResize(containerWidth, containerHeight) {
    if (!this.canvas) return;

    // Calculate maximum integer or proportional scale that fits
    const scaleX = containerWidth / this.width;
    const scaleY = containerHeight / this.height;
    const scale = Math.max(1, Math.min(scaleX, scaleY));

    const displayWidth = Math.floor(this.width * scale);
    const displayHeight = Math.floor(this.height * scale);

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // Internal canvas resolution stays fixed at logical retro resolution
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  /**
   * Updates game logic: input polling, player movement, collisions, and camera.
   * @param {number} dt Delta time in seconds
   * @param {import('./input.js').InputManager} input
   * @param {boolean} reducedMotion
   */
  update(dt, input, reducedMotion = false) {
    if (!input) return;

    let dx = 0;
    let dy = 0;

    if (input.isDown('up')) {
      dy -= 1;
      this.player.direction = 'up';
    }
    if (input.isDown('down')) {
      dy += 1;
      this.player.direction = 'down';
    }
    if (input.isDown('left')) {
      dx -= 1;
      this.player.direction = 'left';
    }
    if (input.isDown('right')) {
      dx += 1;
      this.player.direction = 'right';
    }

    this.player.moving = dx !== 0 || dy !== 0;

    if (this.player.moving) {
      // Normalize diagonal vector
      const length = Math.hypot(dx, dy);
      const moveX = (dx / length) * this.player.speed * dt;
      const moveY = (dy / length) * this.player.speed * dt;

      // New candidate positions
      const newX = this.player.x + moveX;
      const newY = this.player.y + moveY;

      // Bounds checking (prevent moving outside world boundaries)
      const minX = this.tileSize;
      const maxX = this.worldWidth - this.tileSize - this.player.width;
      const minY = this.tileSize;
      const maxY = this.worldHeight - this.tileSize - this.player.height;

      this.player.x = Math.max(minX, Math.min(maxX, newX));
      this.player.y = Math.max(minY, Math.min(maxY, newY));
    }

    // Camera centering with clamping
    const targetCamX = this.player.x + this.player.width / 2 - this.width / 2;
    const targetCamY = this.player.y + this.player.height / 2 - this.height / 2;
    const maxCamX = Math.max(0, this.worldWidth - this.width);
    const maxCamY = Math.max(0, this.worldHeight - this.height);

    if (reducedMotion) {
      this.camera.x = Math.max(0, Math.min(maxCamX, targetCamX));
      this.camera.y = Math.max(0, Math.min(maxCamY, targetCamY));
    } else {
      this.camera.x += (Math.max(0, Math.min(maxCamX, targetCamX)) - this.camera.x) * 0.1;
      this.camera.y += (Math.max(0, Math.min(maxCamY, targetCamY)) - this.camera.y) * 0.1;
    }

    // Check interaction proximity with Subject Shrines
    this.activeInteraction = null;
    const pCenterX = this.player.x + this.player.width / 2;
    const pCenterY = this.player.y + this.player.height / 2;

    for (const shrine of this.shrines) {
      const sX = shrine.col * this.tileSize + this.tileSize / 2;
      const sY = shrine.row * this.tileSize + this.tileSize / 2;
      const dist = Math.hypot(pCenterX - sX, pCenterY - sY);

      if (dist < 26) {
        this.activeInteraction = shrine;
        break;
      }
    }
  }

  /**
   * Main rendering routine.
   * @param {number} time Current timestamp
   */
  render(time = 0) {
    if (!this.ctx) return;
    const ctx = this.ctx;

    // Clear background
    ctx.fillStyle = PALETTE.BG_DARK;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
    // Offset view by camera
    ctx.translate(-Math.floor(this.camera.x), -Math.floor(this.camera.y));

    // 1. Draw Tilemap
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const tileType = this.map[r][c];
        const destX = c * this.tileSize;
        const destY = r * this.tileSize;

        if (this.atlas) {
          const srcX = tileType * this.tileSize;
          ctx.drawImage(this.atlas, srcX, 0, 16, 16, destX, destY, 16, 16);
        } else {
          // Fallback solid tiles
          const fallbackColors = [PALETTE.SCIENCE, PALETTE.SURFACE_ELEVATED, PALETTE.MATH, PALETTE.SURFACE, PALETTE.BG_DARK];
          ctx.fillStyle = fallbackColors[tileType] || PALETTE.BG_DARK;
          ctx.fillRect(destX, destY, 16, 16);
        }
      }
    }

    // 2. Draw 5 KAAC Subject Shrines / Portals
    for (const shrine of this.shrines) {
      const sx = shrine.col * this.tileSize;
      const sy = shrine.row * this.tileSize;

      // Base pedestal
      ctx.fillStyle = PALETTE.SURFACE_ELEVATED;
      ctx.fillRect(sx, sy + 6, 16, 10);
      ctx.fillStyle = PALETTE.SURFACE_ACCENT;
      ctx.fillRect(sx + 2, sy + 4, 12, 2);

      // Glowing crystal / rune
      ctx.fillStyle = shrine.subject.color;
      ctx.fillRect(sx + 4, sy - 2, 8, 8);

      // Energy pulse
      const pulse = Math.sin(time / 250 + shrine.col) * 1.5;
      ctx.fillStyle = PALETTE.TEXT_PRIMARY;
      ctx.fillRect(sx + 6, sy + Math.floor(pulse), 4, 4);
    }

    // 3. Draw Player Character
    const sprite = HERO_SPRITES[this.player.direction] || HERO_SPRITES.down;
    renderPixelSprite(ctx, sprite, this.player.x, this.player.y, 2);

    // 4. Draw Interaction Prompt if near a shrine
    if (this.activeInteraction) {
      const promptX = Math.floor(this.player.x - 24);
      const promptY = Math.floor(this.player.y - 14);

      ctx.fillStyle = PALETTE.SURFACE;
      ctx.fillRect(promptX, promptY, 64, 12);
      ctx.strokeStyle = this.activeInteraction.subject.color;
      ctx.lineWidth = 1;
      ctx.strokeRect(promptX, promptY, 64, 12);

      ctx.fillStyle = PALETTE.TEXT_PRIMARY;
      ctx.font = '8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('[ACT] ' + this.activeInteraction.label.split(' ')[0], promptX + 32, promptY + 9);
    }

    ctx.restore();
  }
}
