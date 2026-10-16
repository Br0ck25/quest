# DESIGN_SYSTEM.md — QUEST: Kentucky Design System

> **Status**: Mandatory Governance Document  
> **Precedence**: Higher precedence than code style and framework preferences (see [`GOVERNANCE.md`](file:///c:/Users/James/Downloads/Quest/GOVERNANCE.md)).  
> **Core Directives**: **100% Code-Driven Visuals (Zero Image Files)** & **Mobile-First Responsive Layout**.

---

## 1. Core Visual Mandates

### 1.1 "All Code, No Actual Images" (Zero Raster Assets)
- **Forbidden**: `.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`, `.ico`, `.bmp` files or external asset URLs.
- **Required**: Every graphic element must be rendered programmatically in code:
  1. **Canvas 2D Procedural Graphics**:
     - Logical resolution: `320 × 240` or `384 × 216` pixel-grid rendered onto a responsive HTML5 `<canvas>` with `image-rendering: pixelated; crisp-edges`.
     - Tiles, walls, obstacles, chests, and character sprites generated via compact coordinate array matrices or procedural algorithmic drawing functions.
     - Particle FX (spell flashes, spark bursts, potion bubbles, level-up stars) generated in Canvas 2D math.
  2. **Inline Vector Graphics (SVG)**:
     - Icons for menus, hearts/health, badges, subject emblems, and inventory items rendered via lightweight inline `<svg>` elements.
  3. **CSS Vector Styling**:
     - Borders, parchment textures, cards, buttons, gradient badges, and dialog boxes styled entirely with CSS box shadows, borders, clip-paths, and gradients.

### 1.2 Mobile-First Responsive Design
- The user experience is designed from the smallest mobile device (360px width) upwards to tablets and Chromebooks.
- **Touch Input Zone**:
  - Minimum touch target size: **`48px × 48px`** (exceeds WCAG 2.5.5 target size).
  - Virtual 4-Way D-Pad on the lower-left for thumb control: Up, Down, Left, Right with `touch-action: none`.
  - Action buttons on the lower-right: **Action / Interact [A]** and **Menu / Pause [B]**.
- **Dual Controls**:
  - Touch: Virtual D-Pad and touch targets on mobile/tablet.
  - Keyboard: `WASD` / Arrow keys for navigation, `Enter` / `Space` for interaction, `Escape` for menus.
  - Full keyboard focusability on all semantic HTML interactive elements (`tabindex="0"`, `:focus-visible` styling).

---

## 2. Approved Color Palette

All colors used in CSS, SVGs, and Canvas 2D must strictly adhere to the approved tokens below. Do not invent arbitrary hex codes or color variables outside this specification.

### 2.1 Kentucky Governor's Cup Academic Subject Tokens

| Subject | Token Name | Hex Code | Purpose / Fantasy Region |
| :--- | :--- | :--- | :--- |
| **Mathematics** | `--color-subject-math` | `#2563EB` | Cipher Caverns (Deep Blue) |
| **Science** | `--color-subject-science` | `#059669` | Verdant Wilds (Emerald Green) |
| **Social Studies** | `--color-subject-social` | `#D97706` | Kingdoms of Time (Amber / Gold) |
| **Language Arts** | `--color-subject-lang` | `#7C3AED` | Whispering Archives (Royal Purple) |
| **Arts & Humanities** | `--color-subject-arts` | `#DB2777` | Gallery of Wonders (Vibrant Rose) |

### 2.2 Theme & World Palette (Fantasy RPG Aesthetics)

| Role | Token Name | Hex Code | Contrast / Usage |
| :--- | :--- | :--- | :--- |
| **Canvas Background** | `--color-bg-dark` | `#0F172A` | Slate 900 — Outer frame & night sky |
| **Surface Primary** | `--color-surface` | `#1E293B` | Slate 800 — Cards, modal backgrounds |
| **Surface Elevated** | `--color-surface-elevated` | `#334155` | Slate 700 — Dialog boxes, question panels |
| **Surface Accent** | `--color-surface-accent` | `#475569` | Slate 600 — Button default background |
| **Border Subtle** | `--color-border-subtle` | `#334155` | Slate 700 — Card borders |
| **Border Active** | `--color-border-focus` | `#38BDF8` | Sky 400 — Focused inputs and active buttons |
| **Parchment Surface** | `--color-parchment` | `#FEF3C7` | Amber 100 — Question card parchment mode |
| **Parchment Dark** | `--color-parchment-border`| `#D97706` | Amber 600 — Ancient scroll border |

### 2.3 Text & State Tokens

| Role | Token Name | Hex Code | Contrast / Usage |
| :--- | :--- | :--- | :--- |
| **Text Primary (Dark BG)** | `--color-text-primary` | `#F8FAFC` | Slate 50 (High contrast: > 12:1) |
| **Text Secondary** | `--color-text-secondary` | `#94A3B8` | Slate 400 (Readable metadata: > 4.5:1) |
| **Text Primary (Parchment)**| `--color-text-dark` | `#0F172A` | Slate 900 (High contrast on parchment) |
| **Feedback Success** | `--color-success` | `#10B981` | Emerald 500 — Correct answers, level-up |
| **Feedback Warning** | `--color-warning` | `#F59E0B` | Amber 500 — Timers, assisted answers |
| **Feedback Error / Danger**| `--color-error` | `#EF4444` | Red 500 — Wrong answers, boss damage |
| **XP & Gold Accent** | `--color-gold` | `#FBBF24` | Amber 400 — Coins, stars, XP bars |

---

## 3. Procedural Graphics Architecture

### 3.1 Pixel-Grid Matrix Specification
Character and monster sprites are encoded in compact string arrays or binary matrices where each character corresponds to an approved palette color index:
```javascript
// Example: 8x8 Procedural Hero Sprite (0 = transparent, 1 = skin, 2 = cloak, 3 = eyes/detail)
const SPRITE_HERO = {
  palette: ['transparent', '#FDE047', '#2563EB', '#0F172A'],
  matrix: [
    '00111100',
    '01111110',
    '01311310',
    '01111110',
    '02222220',
    '22222222',
    '22000022',
    '02000020'
  ]
};

export function renderPixelSprite(ctx, sprite, destX, destY, pixelScale = 2) {
  for (let row = 0; row < sprite.matrix.length; row++) {
    const line = sprite.matrix[row];
    for (let col = 0; col < line.length; col++) {
      const colorIndex = parseInt(line[col], 10);
      if (colorIndex > 0) {
        ctx.fillStyle = sprite.palette[colorIndex];
        ctx.fillRect(destX + col * pixelScale, destY + row * pixelScale, pixelScale, pixelScale);
      }
    }
  }
}
```

### 3.2 Procedural Tile Generation
- Tiles (grass, cobblestone, water, dungeon stone, book stacks, lab tables) are drawn with simple algorithmic noise and geometric tiling functions directly onto an offscreen canvas at startup and cached in memory.
- Dynamic animated water and torches use sine-wave color oscillations or tiny 2-frame procedural shifts.

---

## 4. Mobile Layout & Responsive Viewports

### 4.1 Viewport Breakpoints
- **Mobile (Base)**: `360px – 600px` (Portrait: Game canvas on top 55%, controls & dialogs on bottom 45%; Landscape: canvas centered with overlay thumb controls).
- **Tablet**: `601px – 1024px` (Enlarged canvas with side-panel quest/inventory sheet).
- **Desktop / Chromebook**: `1025px+` (Full-view canvas, floating semantic HUD, keyboard-optimized).

### 4.2 On-Screen Mobile Controller Specification
- **Position**: Floating fixed overlay anchored to the bottom corners with safe-area insets (`env(safe-area-inset-bottom)`).
- **Virtual D-Pad**:
  - Size: `130px × 130px` circular bounds with 4 directional sectors.
  - Center dead-zone: `30px`.
  - Visual feedback: Opacity shifts from `0.6` to `0.9` upon touch.
- **Action Buttons (A & B)**:
  - Diameter: `54px × 54px` each.
  - Spacing: `12px` apart in ergonomic thumb arc.
  - Distinct labels: "ACT" (Action) and "MENU".

### 4.3 Semantic Question Dialog
- Questions are rendered in an accessible HTML overlay over the Canvas, ensuring screen readers, text resizing, and keyboard navigation work flawlessly:
  - Container: `<dialog open>` or `<div role="region" aria-label="Question Challenge">`.
  - Text size: Minimum `16px` base (scales up to `20px` on tablets).
  - Choice buttons: Full-width touch cards, minimum height `48px`, `margin-bottom: 8px`.

---

## 5. Typography & Accessibility Standards

### 5.1 Typography
- Use system font stacks to eliminate network font downloads:
  - **Headings & Game UI**: `ui-rounded, "Nunito", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
  - **Code & Coordinate Stats**: `ui-monospace, "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace`
- Minimum body size: `16px` (never smaller than `14px` for minor tooltips).

### 5.2 Accessibility Checklist
- [x] High-contrast ratio: Text vs background always exceeds WCAG AA (4.5:1) and AAA (7:1 for main prompts).
- [x] Information never communicated by color alone (always combine color with icons/badges).
- [x] Motion-reduced mode: Respects `@media (prefers-reduced-motion: reduce)` by disabling screen shake and camera smoothing.
- [x] Screen-reader tested: All question prompts, answers, and combat outcomes announced via `aria-live="polite"` regions.
