# CHANGELOG.md — QUEST: Kentucky Project History

All notable migrations, architectural changes, and governance baseline updates will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — 2026-10-16

### Added
- **Project Operating Rules (`claude.md`)**:
  - Established hard constraint: file length strictly under 2,000 lines of code.
  - Specified target deployment: Cloudflare Workers copy-pasteable script (`worker.js`).
  - Set Initial Target Grade Level: Middle Grades (Grades 6–8).
  - Specified visual & audio mandate: "All code, no actual images" (100% procedural Canvas 2D/SVG/CSS) and procedural Web Audio API FX (0 external audio files).
  - Defined storage & account model: Cloudflare D1 for persistent accounts, with 100% guest-first playability without account creation.
  - Specified mobile-first UX requirement with on-screen touch D-Pad and dual keyboard input.
  - Established Build Artifact Isolation: `worker.js` is strictly a generated build artifact; source files in `src/` are the sole source of truth and must never be edited directly.
  - Integrated Core Engineering Principles: (1) Think Before Coding (ask only about product decisions, decide technical choices autonomously), (2) Simplicity First, (3) Surgical Changes (small root-cause fixes), (4) Goal-Driven Execution & Testing Integrity (never loosen guards to get green; write reproduction test first), (5) Finding Code Cheaply (token & context economy via `FILE-INDEX.md` and section offsets).
- **Testing Specification (`TESTING.md`)**:
  - Outlined behavioral testing philosophy ("Tests check why, not just what"), bug-fix protocol, and test suite structure.
- **File Index Catalog (`FILE-INDEX.md`)**:
  - Created single-line lookup catalog for cheap context navigation.
- **Design System Specification (`DESIGN_SYSTEM.md`)**:
  - Defined strict approved color palette with tokens for Kentucky academic subjects:
    - Mathematics (`#2563EB`)
    - Science (`#059669`)
    - Social Studies (`#D97706`)
    - Language Arts (`#7C3AED`)
    - Arts & Humanities (`#DB2777`)
  - Documented procedural pixel sprite matrix generator and canvas tile caching architecture.
  - Formulated mobile-first viewport breakpoints (360px base) and touch target standards (minimum `48px × 48px`).
- **Governance Hierarchy (`GOVERNANCE.md`)**:
  - Established precedence hierarchy: Safety & Child Privacy > PWA > HTML Living Standard > Design System > File Size & Worker Target > Svelte 5 > Code Style.
  - Outlined mandatory stop conditions.
- **PWA Specification (`PWA.md`)**:
  - Documented offline-first resilience for solo play and attempt queueing.
  - Defined Web App Manifest with code-generated SVG icons and Service Worker caching strategy.
- **HTML Standard Specification (`HTML_LIVING_STANDARD.md`)**:
  - Enforced WHATWG standards: prohibition of self-closing non-void tags (`<div />`), proper boolean attributes, and accessible semantic DOM structures.
- **AI Agent Quick Reference (`AI_AGENTS.md`)**:
  - Defined concise task checklist, common development scenarios, and stop conditions for AI assistants.
- **Curriculum & Study Guide (`CURRICULUM_AND_STUDY_GUIDE.md`)**:
  - Documented comprehensive Governor's Cup curricula across Elementary (Grades 4–5), Sixth Grade, and Middle Grades (Grades 6–8) sourced directly from official KAAC curriculum pages.
  - Included 2027–2029 official rotations for Famous Scientists, Authors, Cultural Representatives, and the 2027 Middle Grades Focus Work (*Animal Farm* by George Orwell).
  - Defined standard question data schema and fantasy world realm mapping.
- **System Architecture (`ARCHITECTURE.md`)**:
  - Detailed the unified `worker.js` model for Cloudflare edge execution.
  - Formalized the 5-stage spaced repetition review algorithm (1, 3, 7, 14, 30 days) and procedural rendering pipeline.
- **Project Scaffolding & Tooling**:
  - Created `package.json` with `build`, `test`, and `dev` scripts.
  - Created `.gitignore` ignoring dependencies, Wrangler artifacts, and temporary files.
  - Created zero-dependency bundler script (`scripts/build.js`) generating standalone `worker.js`.
  - Created local preview server (`scripts/dev-server.js`) simulating Worker fetch handling.
  - Established contract test suite (`tests/contract/worker.test.js`) passing cleanly via Node native runner.
  - Created centralized project constants (`src/data/constants.js`) and corresponding validation unit tests (`tests/unit/constants.test.js`).
  - Added strict "Reuse Existing Code First (Zero Duplicate Abstractions)" rule to `claude.md`.
  - Added `AGENTS.md` as universal AI entry point directing all tools to `claude.md`.
- **Phase 1: Responsive Game Shell**:
  - **Procedural Canvas 2D Engine (`src/client/renderer.js`)**:
    - 320×240 logical retro resolution with nearest-neighbor crisp scaling (`image-rendering: pixelated; crisp-edges`).
    - Procedural starter hub map with terrain tiling, collision bounds, camera centering, and 5 Governor's Cup subject shrines.
  - **Procedural Sprites & Vector Assets (`src/client/sprites.js`)**:
    - 8×8 procedural directional hero pixel matrices (down, up, left, right).
    - Offscreen 128×128 Canvas tile atlas caching procedural grass, cobblestone, water, and wall textures.
    - Zero external raster images: inline SVG icon generator for HUD and UI items.
  - **Procedural Web Audio FX (`src/client/audio.js`)**:
    - Web Audio API synthesizers for UI clicks, arpeggio chimes, footsteps, and modal alerts.
    - Sound mute toggle with graceful fallback in headless environments.
  - **Dual Input Abstraction (`src/client/input.js`)**:
    - Unified keyboard (WASD, Arrow keys, Enter/Space for ACT, Escape for MENU) and touch input.
    - Virtual 4-Way D-Pad and action buttons with WCAG-compliant touch targets (min 48×48px).
  - **Semantic Accessible UI Overlay (`src/client/ui.js` & `src/client/styles.js`)**:
    - Accessible HUD with pseudonymous avatar, level, health, gold, and navigation tabs.
    - Modal dialogs for Commonwealth Regions (5 KAAC realms), Quests log, Inventory, and Settings.
    - Reduced motion setting respecting `@media (prefers-reduced-motion: reduce)` by disabling camera smoothing.
    - 100% compliant with approved color palette from `DESIGN_SYSTEM.md` and WHATWG HTML Living Standard.
  - **Edge Worker & PWA Support (`src/server/worker.js` & `scripts/build.js`)**:
    - Endpoints for root HTML shell (`/`), PWA Web App Manifest (`/manifest.webmanifest`), and Service Worker (`/sw.js`).
    - Cloudflare Worker bundled copy-paste artifact (`worker.js`) strictly under 2,000 line limit (931 lines).
    - Expanded test coverage across unit and contract suites to 26 passing tests.
