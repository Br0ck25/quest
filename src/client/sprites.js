// src/client/sprites.js — Procedural Pixel Sprites & Vector Icons
// Zero raster assets: All graphics are encoded in pixel matrices or vector formulas.

import { PALETTE } from '../data/constants.js';

/**
 * 8x8 Procedural Hero Sprites by Direction.
 * Palette indices:
 * 0 = transparent
 * 1 = skin (#FEF3C7)
 * 2 = cloak / tunic (#2563EB)
 * 3 = boots / belt / eyes (#0F172A)
 * 4 = gold trim (#FBBF24)
 * 5 = highlight / hair (#D97706)
 */
export const HERO_SPRITES = {
  down: {
    palette: ['transparent', PALETTE.PARCHMENT, PALETTE.MATH, PALETTE.BG_DARK, PALETTE.GOLD, PALETTE.SOCIAL_STUDIES],
    matrix: [
      '05555550',
      '55111155',
      '51311315',
      '01111110',
      '02244220',
      '22244222',
      '02333320',
      '03000030',
    ],
  },
  up: {
    palette: ['transparent', PALETTE.PARCHMENT, PALETTE.MATH, PALETTE.BG_DARK, PALETTE.GOLD, PALETTE.SOCIAL_STUDIES],
    matrix: [
      '05555550',
      '55555555',
      '55555555',
      '01111110',
      '02244220',
      '22244222',
      '02333320',
      '03000030',
    ],
  },
  left: {
    palette: ['transparent', PALETTE.PARCHMENT, PALETTE.MATH, PALETTE.BG_DARK, PALETTE.GOLD, PALETTE.SOCIAL_STUDIES],
    matrix: [
      '05555500',
      '55111500',
      '51311500',
      '01111000',
      '02242200',
      '02242220',
      '02333000',
      '00303000',
    ],
  },
  right: {
    palette: ['transparent', PALETTE.PARCHMENT, PALETTE.MATH, PALETTE.BG_DARK, PALETTE.GOLD, PALETTE.SOCIAL_STUDIES],
    matrix: [
      '00555550',
      '00511155',
      '00511315',
      '00011110',
      '00224220',
      '02224220',
      '00033320',
      '00030300',
    ],
  },
};

/**
 * Draws a procedural pixel matrix sprite onto a canvas 2D context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} sprite
 * @param {number} destX
 * @param {number} destY
 * @param {number} [pixelScale=2]
 */
export function renderPixelSprite(ctx, sprite, destX, destY, pixelScale = 2) {
  if (!ctx || !sprite || !sprite.matrix) return;
  for (let row = 0; row < sprite.matrix.length; row++) {
    const line = sprite.matrix[row];
    for (let col = 0; col < line.length; col++) {
      const colorIndex = parseInt(line[col], 10);
      if (colorIndex > 0 && sprite.palette[colorIndex]) {
        ctx.fillStyle = sprite.palette[colorIndex];
        ctx.fillRect(
          Math.floor(destX + col * pixelScale),
          Math.floor(destY + row * pixelScale),
          pixelScale,
          pixelScale
        );
      }
    }
  }
}

/**
 * Generates an offscreen Canvas texture atlas containing 16x16 procedural terrain tiles.
 * Caches grass, paths, water, trees, and subject stone shrines.
 * @returns {HTMLCanvasElement|null}
 */
export function createTileAtlas() {
  if (typeof document === 'undefined') return null;

  const atlas = document.createElement('canvas');
  atlas.width = 128;
  atlas.height = 128;
  const ctx = atlas.getContext('2d');
  if (!ctx) return null;

  // 1. Grass Tile (Index 0: 0, 0)
  ctx.fillStyle = '#065F46'; // Dark Emerald base
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#059669'; // Emerald highlights
  ctx.fillRect(2, 2, 2, 4);
  ctx.fillRect(10, 3, 2, 5);
  ctx.fillRect(6, 9, 2, 4);
  ctx.fillRect(12, 11, 2, 3);
  ctx.fillStyle = '#10B981'; // Bright tip
  ctx.fillRect(2, 2, 2, 1);
  ctx.fillRect(10, 3, 2, 1);
  ctx.fillRect(6, 9, 2, 1);

  // 2. Cobblestone Path Tile (Index 1: 16, 0)
  ctx.fillStyle = '#334155'; // Slate 700 mortar
  ctx.fillRect(16, 0, 16, 16);
  ctx.fillStyle = '#475569'; // Slate 600 stone
  ctx.fillRect(17, 1, 6, 6);
  ctx.fillRect(25, 2, 6, 5);
  ctx.fillRect(18, 9, 6, 6);
  ctx.fillRect(26, 8, 5, 7);
  ctx.fillStyle = '#64748B'; // Slate 500 edge highlight
  ctx.fillRect(17, 1, 6, 1);
  ctx.fillRect(25, 2, 6, 1);
  ctx.fillRect(18, 9, 6, 1);

  // 3. Water Tile (Index 2: 32, 0)
  ctx.fillStyle = '#1E3A8A'; // Blue 900 base
  ctx.fillRect(32, 0, 16, 16);
  ctx.fillStyle = '#2563EB'; // Blue 600 wave
  ctx.fillRect(34, 4, 8, 2);
  ctx.fillRect(38, 10, 8, 2);
  ctx.fillStyle = '#38BDF8'; // Sky 400 sparkle
  ctx.fillRect(36, 4, 2, 1);
  ctx.fillRect(42, 10, 2, 1);

  // 4. Stone Wall / Dungeon Brick (Index 3: 48, 0)
  ctx.fillStyle = '#0F172A'; // Slate 900 mortar
  ctx.fillRect(48, 0, 16, 16);
  ctx.fillStyle = '#1E293B'; // Slate 800 brick
  ctx.fillRect(49, 1, 14, 6);
  ctx.fillRect(49, 9, 14, 6);
  ctx.fillStyle = '#334155'; // Slate 700 top highlight
  ctx.fillRect(49, 1, 14, 1);
  ctx.fillRect(49, 9, 14, 1);

  // 5. Tree Foliage (Index 4: 64, 0)
  ctx.fillStyle = '#064E3B'; // Deep green shadow
  ctx.fillRect(64, 0, 16, 16);
  ctx.fillStyle = '#059669'; // Emerald canopy
  ctx.fillRect(66, 2, 12, 12);
  ctx.fillStyle = '#10B981'; // Sunlight tip
  ctx.fillRect(68, 4, 4, 4);

  return atlas;
}

/**
 * Returns procedural inline SVG strings for UI icons without raster assets.
 * @param {string} iconName
 * @param {string} [color=PALETTE.TEXT_PRIMARY]
 * @param {number} [size=20]
 * @returns {string}
 */
export function getSvgIcon(iconName, color = PALETTE.TEXT_PRIMARY, size = 20) {
  const common = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;

  switch (iconName) {
    case 'compass':
      return `<svg ${common}><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" fill="${color}" fill-opacity="0.3"></polygon></svg>`;
    case 'quill':
      return `<svg ${common}><path d="M12 19l7-7 3 3-7 7-3-3z"></path><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18z"></path><path d="M2 2l7.586 7.586"></path><circle cx="11" cy="11" r="2"></circle></svg>`;
    case 'scroll':
      return `<svg ${common}><path d="M19 17h2a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h2"></path><path d="M15 21v-4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2z"></path></svg>`;
    case 'flask':
      return `<svg ${common}><path d="M9 3h6"></path><path d="M10 3v5l-4 7a2 2 0 0 0 1.7 3h8.6a2 2 0 0 0 1.7-3l-4-7V3"></path><path d="M8 14h8"></path></svg>`;
    case 'sigil':
      return `<svg ${common}><path d="M12 2l8 4.5v6c0 5-3.5 9.5-8 11-4.5-1.5-8-6-8-11v-6L12 2z"></path><circle cx="12" cy="11" r="3" fill="${color}" fill-opacity="0.4"></circle></svg>`;
    case 'map':
      return `<svg ${common}><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"></polygon><line x1="8" y1="2" x2="8" y2="18"></line><line x1="16" y1="6" x2="16" y2="22"></line></svg>`;
    case 'quests':
      return `<svg ${common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
    case 'inventory':
      return `<svg ${common}><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"></path><line x1="3" y1="6" x2="21" y2="6"></line><path d="M16 10a4 4 0 0 1-8 0"></path></svg>`;
    case 'settings':
      return `<svg ${common}><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`;
    case 'audio-on':
      return `<svg ${common}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
    case 'audio-off':
      return `<svg ${common}><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
    case 'close':
      return `<svg ${common}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    default:
      return `<svg ${common}><circle cx="12" cy="12" r="10"></circle></svg>`;
  }
}
