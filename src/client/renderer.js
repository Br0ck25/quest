// src/client/renderer.js — 2D Canvas Procedural Game Engine
// Renders 320x240 retro world with crisp pixel scaling, multi-zone map, and procedural sprites.

import { VIEWPORT, PALETTE, SUBJECTS } from '../data/constants.js';
import { HERO_SPRITES, NPC_SPRITES, ENEMY_SPRITES, renderPixelSprite, createTileAtlas } from './sprites.js';

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

    // Active zone: 'hub' | 'route' | 'dungeon'
    this.currentZone = 'hub';

    // Shrines for the 5 KAAC Academic Subjects (in Hub)
    this.shrines = [
      { id: 'math', col: 3, row: 3, subject: SUBJECTS.MATH, label: 'Cipher Portal' },
      { id: 'science', col: 16, row: 3, subject: SUBJECTS.SCIENCE, label: 'Verdant Portal' },
      { id: 'social_studies', col: 3, row: 12, subject: SUBJECTS.SOCIAL_STUDIES, label: 'Time Portal' },
      { id: 'language_arts', col: 16, row: 12, subject: SUBJECTS.LANGUAGE_ARTS, label: 'Archive Portal' },
      { id: 'arts_humanities', col: 9, row: 2, subject: SUBJECTS.ARTS_HUMANITIES, label: 'Gallery Portal' },
    ];

    // NPC: Berea Sage in Hub
    this.npc = {
      id: 'npc_sage',
      name: 'Elder Sage of Berea',
      col: 10,
      row: 5,
      dialogue: 'Welcome, young Scholar! The Commonwealth realms are tested by ignorance. Take the northern trail to the Verdant Sanctuary to prove your knowledge!',
    };

    // Dungeon Encounters placed across the 5 chambers of the Verdant Sanctuary
    this.dungeonEntities = [
      { index: 0, id: 'enc_sproutling', col: 9, row: 12, sprite: 'sproutling', label: 'Bramble Sproutling', defeated: false },
      { index: 1, id: 'enc_cave_wisp', col: 5, row: 9, sprite: 'wisp', label: 'Cipher Wisp', defeated: false },
      { index: 2, id: 'enc_chrono_sentry', col: 14, row: 9, sprite: 'sentry', label: 'Pioneer Sentry', defeated: false },
      { index: 3, id: 'enc_word_specter', col: 9, row: 6, sprite: 'specter', label: 'Archival Specter', defeated: false },
      { index: 4, id: 'enc_boss_guardian', col: 9, row: 2, sprite: 'boss', label: 'Overgrown Guardian (Boss)', defeated: false },
    ];

    // Map generators
    this.maps = {
      hub: this.generateHubMap(),
      route: this.generateRouteMap(),
      dungeon: this.generateDungeonMap(),
    };

    this.map = this.maps.hub;

    // Nearby interaction prompt
    this.activeInteraction = null;

    if (typeof document !== 'undefined') {
      this.atlas = createTileAtlas();
    }
  }

  /**
   * Generates Starter Village / Crossroads Hub (20x16).
   * 0=grass, 1=path, 2=water, 3=wall, 4=trees
   */
  generateHubMap() {
    const tiles = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        // Boundary trees, except northern exit opening at c=9, 10
        if (r === 0 && (c === 9 || c === 10)) {
          row.push(1); // North exit opening to route
        } else if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
          row.push(4);
        } else if (r === 8 || c === 9 || c === 10) {
          row.push(1); // Central crossroads path
        } else if (r >= 11 && r <= 13 && c >= 9 && c <= 11) {
          row.push(2); // Decorative pond
        } else {
          row.push(0); // Grassy meadows
        }
      }
      tiles.push(row);
    }
    return tiles;
  }

  /**
   * Generates Route 1: Red River Trail (20x16).
   * Winding path north toward the dungeon entrance.
   */
  generateRouteMap() {
    const tiles = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        // Boundaries with north opening to dungeon and south opening to hub
        if ((r === 0 || r === this.rows - 1) && (c === 9 || c === 10)) {
          row.push(1);
        } else if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
          row.push(4);
        }
        // Winding river cutting across east side
        else if (c === 15 && r > 2 && r < 14) {
          row.push(2);
        }
        // Winding trail connecting south to north
        else if ((r >= 11 && (c === 9 || c === 10)) ||
                 (r >= 8 && r <= 10 && (c >= 6 && c <= 10)) ||
                 (r >= 5 && r <= 7 && (c >= 6 && c <= 13)) ||
                 (r <= 4 && (c === 9 || c === 10))) {
          row.push(1);
        } else {
          row.push(0);
        }
      }
      tiles.push(row);
    }
    return tiles;
  }

  /**
   * Generates The Verdant Sanctuary Dungeon (20x16).
   * 3=stone wall, 5=stone floor, 6=gateway, 1=path
   */
  generateDungeonMap() {
    const tiles = [];
    for (let r = 0; r < this.rows; r++) {
      const row = [];
      for (let c = 0; c < this.cols; c++) {
        // Outer stone walls, with southern exit opening
        if (r === this.rows - 1 && (c === 9 || c === 10)) {
          row.push(5);
        } else if (r === 0 || r === this.rows - 1 || c === 0 || c === this.cols - 1) {
          row.push(3);
        }
        // Boss chamber north boundary with gate opening
        else if (r === 4 && (c < 8 || c > 11)) {
          row.push(3);
        } else if (r === 4 && (c === 9 || c === 10)) {
          row.push(6); // Boss gateway
        }
        // Side chamber dividers
        else if ((c === 4 || c === 15) && (r >= 7 && r <= 11)) {
          row.push(3);
        } else {
          row.push(5); // Dungeon stone floor
        }
      }
      tiles.push(row);
    }
    return tiles;
  }

  /**
   * Changes the active zone and positions the player.
   * @param {'hub'|'route'|'dungeon'} zone
   * @param {number} startX
   * @param {number} startY
   */
  changeZone(zone, startX, startY) {
    if (!this.maps[zone]) return;
    this.currentZone = zone;
    this.map = this.maps[zone];
    this.player.x = startX;
    this.player.y = startY;
    this.camera.x = startX - this.width / 2;
    this.camera.y = startY - this.height / 2;
    this.activeInteraction = null;
  }

  /**
   * Checks if a tile is solid (impassable).
   * 2=water, 3=stone wall, 4=trees
   */
  isTileSolid(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) return true;
    const tile = this.map[row][col];
    return tile === 2 || tile === 3 || tile === 4;
  }

  /**
   * Resizes canvas to match container while preserving crisp pixel ratio.
   */
  handleResize(containerWidth, containerHeight) {
    if (!this.canvas) return;

    const scaleX = containerWidth / this.width;
    const scaleY = containerHeight / this.height;
    const scale = Math.max(1, Math.min(scaleX, scaleY));

    const displayWidth = Math.floor(this.width * scale);
    const displayHeight = Math.floor(this.height * scale);

    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    if (this.ctx) {
      this.ctx.imageSmoothingEnabled = false;
    }
  }

  /**
   * Updates game logic: input polling, player movement, collisions, transitions, and camera.
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
      const length = Math.hypot(dx, dy);
      const moveX = (dx / length) * this.player.speed * dt;
      const moveY = (dy / length) * this.player.speed * dt;

      const newX = this.player.x + moveX;
      const newY = this.player.y + moveY;

      // Check tile collision for bounding box
      const pW = this.player.width;
      const pH = this.player.height;

      // X-axis collision check
      const colLeft = Math.floor(newX / this.tileSize);
      const colRight = Math.floor((newX + pW - 1) / this.tileSize);
      const rowTopCurrent = Math.floor(this.player.y / this.tileSize);
      const rowBottomCurrent = Math.floor((this.player.y + pH - 1) / this.tileSize);

      const collisionX =
        this.isTileSolid(colLeft, rowTopCurrent) ||
        this.isTileSolid(colRight, rowTopCurrent) ||
        this.isTileSolid(colLeft, rowBottomCurrent) ||
        this.isTileSolid(colRight, rowBottomCurrent);

      if (!collisionX) {
        this.player.x = newX;
      }

      // Y-axis collision check
      const colLeftCurrent = Math.floor(this.player.x / this.tileSize);
      const colRightCurrent = Math.floor((this.player.x + pW - 1) / this.tileSize);
      const rowTop = Math.floor(newY / this.tileSize);
      const rowBottom = Math.floor((newY + pH - 1) / this.tileSize);

      const collisionY =
        this.isTileSolid(colLeftCurrent, rowTop) ||
        this.isTileSolid(colRightCurrent, rowTop) ||
        this.isTileSolid(colLeftCurrent, rowBottom) ||
        this.isTileSolid(colRightCurrent, rowBottom);

      if (!collisionY) {
        this.player.y = newY;
      }

      // World boundary clamping
      const minX = this.tileSize;
      const maxX = this.worldWidth - this.tileSize - this.player.width;
      const minY = 0; // Allow edge triggers
      const maxY = this.worldHeight - this.player.height;

      this.player.x = Math.max(minX, Math.min(maxX, this.player.x));
      this.player.y = Math.max(minY, Math.min(maxY, this.player.y));

      // Zone Transition Triggers
      this.checkZoneTransitions();
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

    // Check interaction proximity
    this.checkInteractions();
  }

  /**
   * Checks if player stepped on a zone boundary transition.
   */
  checkZoneTransitions() {
    const pCol = Math.floor((this.player.x + this.player.width / 2) / this.tileSize);
    const pRow = Math.floor((this.player.y + this.player.height / 2) / this.tileSize);

    // Hub -> Route (North edge at col 9-10)
    if (this.currentZone === 'hub' && pRow <= 0 && (pCol === 9 || pCol === 10)) {
      this.changeZone('route', 152, 220);
      return;
    }

    // Route -> Hub (South edge at col 9-10)
    if (this.currentZone === 'route' && pRow >= 15 && (pCol === 9 || pCol === 10)) {
      this.changeZone('hub', 152, 20);
      return;
    }

    // Route -> Dungeon (North edge at col 9-10)
    if (this.currentZone === 'route' && pRow <= 0 && (pCol === 9 || pCol === 10)) {
      this.changeZone('dungeon', 152, 220);
      return;
    }

    // Dungeon -> Route (South edge at col 9-10)
    if (this.currentZone === 'dungeon' && pRow >= 15 && (pCol === 9 || pCol === 10)) {
      this.changeZone('route', 152, 20);
      return;
    }
  }

  /**
   * Checks proximity to NPCs, Shrines, and Dungeon Encounters.
   */
  checkInteractions() {
    this.activeInteraction = null;
    const pCenterX = this.player.x + this.player.width / 2;
    const pCenterY = this.player.y + this.player.height / 2;

    // 1. Hub Shrines
    if (this.currentZone === 'hub') {
      for (const shrine of this.shrines) {
        const sX = shrine.col * this.tileSize + this.tileSize / 2;
        const sY = shrine.row * this.tileSize + this.tileSize / 2;
        if (Math.hypot(pCenterX - sX, pCenterY - sY) < 26) {
          this.activeInteraction = { ...shrine, type: 'shrine' };
          return;
        }
      }

      // Hub Sage NPC
      const npcX = this.npc.col * this.tileSize + this.tileSize / 2;
      const npcY = this.npc.row * this.tileSize + this.tileSize / 2;
      if (Math.hypot(pCenterX - npcX, pCenterY - npcY) < 26) {
        this.activeInteraction = { ...this.npc, type: 'npc', label: this.npc.name };
        return;
      }
    }

    // 2. Dungeon Encounters
    if (this.currentZone === 'dungeon') {
      for (const enc of this.dungeonEntities) {
        if (!enc.defeated) {
          const eX = enc.col * this.tileSize + this.tileSize / 2;
          const eY = enc.row * this.tileSize + this.tileSize / 2;
          if (Math.hypot(pCenterX - eX, pCenterY - eY) < 26) {
            this.activeInteraction = { ...enc, type: 'encounter' };
            return;
          }
        }
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

    ctx.fillStyle = PALETTE.BG_DARK;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.save();
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
          const fallbackColors = [
            PALETTE.SCIENCE, PALETTE.SURFACE_ELEVATED, PALETTE.MATH,
            PALETTE.SURFACE, PALETTE.BG_DARK, PALETTE.SURFACE, PALETTE.BORDER_FOCUS,
          ];
          ctx.fillStyle = fallbackColors[tileType] || PALETTE.BG_DARK;
          ctx.fillRect(destX, destY, 16, 16);
        }
      }
    }

    // 2. Zone-specific Entities
    if (this.currentZone === 'hub') {
      // 5 Shrines
      for (const shrine of this.shrines) {
        const sx = shrine.col * this.tileSize;
        const sy = shrine.row * this.tileSize;

        ctx.fillStyle = PALETTE.SURFACE_ELEVATED;
        ctx.fillRect(sx, sy + 6, 16, 10);
        ctx.fillStyle = PALETTE.SURFACE_ACCENT;
        ctx.fillRect(sx + 2, sy + 4, 12, 2);

        ctx.fillStyle = shrine.subject.color;
        ctx.fillRect(sx + 4, sy - 2, 8, 8);

        const pulse = Math.sin(time / 250 + shrine.col) * 1.5;
        ctx.fillStyle = PALETTE.TEXT_PRIMARY;
        ctx.fillRect(sx + 6, sy + Math.floor(pulse), 4, 4);
      }

      // Berea Sage NPC
      const nx = this.npc.col * this.tileSize;
      const ny = this.npc.row * this.tileSize;
      renderPixelSprite(ctx, NPC_SPRITES.sage, nx, ny, 2);
    }

    if (this.currentZone === 'dungeon') {
      // Draw 5 dungeon encounters
      for (const enc of this.dungeonEntities) {
        const ex = enc.col * this.tileSize;
        const ey = enc.row * this.tileSize;

        if (!enc.defeated) {
          const sprite = ENEMY_SPRITES[enc.sprite];
          if (sprite) {
            renderPixelSprite(ctx, sprite, ex, ey, 2);
          }
          // Glowing aura under enemy
          const glow = Math.sin(time / 200 + enc.index) * 2;
          ctx.fillStyle = enc.sprite === 'boss' ? PALETTE.GOLD : PALETTE.BORDER_FOCUS;
          ctx.fillRect(ex + 4, ey + 14, 8, 2);
        } else {
          // Cleared marker / defeated wildflower
          ctx.fillStyle = PALETTE.SUCCESS;
          ctx.fillRect(ex + 6, ey + 10, 4, 4);
        }
      }
    }

    // 3. Draw Player Character
    const sprite = HERO_SPRITES[this.player.direction] || HERO_SPRITES.down;
    renderPixelSprite(ctx, sprite, this.player.x, this.player.y, 2);

    // 4. Draw Interaction Prompt
    if (this.activeInteraction) {
      const promptX = Math.floor(this.player.x - 28);
      const promptY = Math.floor(this.player.y - 14);

      ctx.fillStyle = PALETTE.SURFACE;
      ctx.fillRect(promptX, promptY, 72, 12);
      ctx.strokeStyle = PALETTE.BORDER_FOCUS;
      ctx.lineWidth = 1;
      ctx.strokeRect(promptX, promptY, 72, 12);

      ctx.fillStyle = PALETTE.TEXT_PRIMARY;
      ctx.font = '8px system-ui, sans-serif';
      ctx.textAlign = 'center';
      const shortLabel = this.activeInteraction.label.split(' ')[0];
      ctx.fillText(`[ACT] ${shortLabel}`, promptX + 36, promptY + 9);
    }

    ctx.restore();
  }
}
