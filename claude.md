# CLAUDE.md — Agent & Project Operating Rules

> **Project**: QUEST: Kentucky  
> **Initial Target Focus**: Middle Grades (Grades 6–8) preparing for KAAC Governor's Cup competition  
> **Deployment Target**: Cloudflare Workers (`worker.js` generated copy-pasteable script)  
> **Architecture Principle**: All-code graphics & procedural Web Audio FX (0 external image or audio files), mobile-first responsive design, strict file length limits (≤ 2,000 lines of code per file).

---

## 1. Non-Negotiable Hard Constraints

1. **File Length Limit**:
   - **No file may exceed 2,000 lines of code**.
   - Keep modules modular and focused (ideally 300–800 lines). When approaching 1,500 lines, proactively split into cohesive sub-modules.

2. **`worker.js` Is a Generated Build Artifact — NEVER Edit Directly**:
   - **The source of truth is modular code in `src/`**.
   - **NEVER manually edit `worker.js`**. It is compiled and bundled from source files via the build script (`npm run build`).
   - Any direct manual edit to `worker.js` will be overwritten and cause source drift.

3. **Storage & Guest-First Playability**:
   - **Playable without an account**: The game must be 100% immediately playable as a guest using local browser persistence (`localStorage` / `IndexedDB`).
   - **Cloudflare D1 for Accounts**: Cloudflare D1 is utilized for persistent cloud accounts, profile migration, and multi-device cross-save, but account creation is never a prerequisite to play.

4. **All Code, No Actual Images & Procedural Web Audio FX**:
   - **ZERO external raster/image files** (`.png`, `.jpg`, `.jpeg`, `.webp`, `.gif`).
   - All visual assets (characters, enemies, map tiles, dungeon rooms, UI icons, badges, spells, particles) must be procedurally generated via Canvas 2D and inline SVG.
   - **ZERO external audio files** (`.mp3`, `.wav`, `.ogg`): All sound effects (chimes, hits, spells, fanfares, UI clicks) are synthesized dynamically in code via the browser's Web Audio API (`AudioContext`).

5. **Mobile-First Responsive Design**:
   - Design primarily for touchscreen devices (phones, tablets, and school Chromebooks).
   - On-screen touch D-Pad and large action buttons (minimum touch target: `48px × 48px`).
   - Dynamic viewport scaling supporting portrait and landscape modes.
   - Dual-input support: seamless touch controls and keyboard navigation (WASD, Arrow keys, Space, Enter, Escape).

6. **Child Safety & Privacy (COPPA / FERPA Compliance)**:
   - **No Personally Identifiable Information (PII)**: No real names, emails, phone numbers, or school IDs stored.
   - **Pseudonymous player profiles**: Randomly generated adventurer handles (e.g., "BluegrassWizard42").
   - **Zero Open Text/Voice Chat**: Multiplayer uses predefined tactical emotes/pings only.
   - **Private Rooms Only**: Co-op and 1v1 duels use short-lived, rate-limited room codes. No public matchmaking.

7. **Answer Key Secrecy & Server Authority**:
   - The client never receives answer keys or correct answers prior to submission.
   - The server validates answers, maintains combat state, calculates scores, and issues reward ledger entries.

---

## 2. Core Engineering Principles for AI

### 1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- **Ask only about product decisions**: If a request has two readings that change what the user sees or experiences, state your assumption or ask before building. Decide technical implementation details yourself and clearly state what you chose.

### 2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
- Ask yourself: *"Would a senior engineer say this is overcomplicated?"* If yes, simplify.

### 3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:
- **Reuse Existing Code First (Zero Duplicate Abstractions)**:
  - Always search the codebase for existing functions, helpers, math utilities, canvas drawing routines, or data types before writing new ones.
  - Never create parallel or duplicate implementations of existing logic (e.g., duplicate date formatters, canvas shapes, or validation logic).
  - If an existing helper does 80% of what is needed, extend or compose it; do not invent a second version.
  - Shared logic (schemas, constants, grade band types) must live in shared modules rather than being duplicated between client and server.
- **Small, root-cause fixes**: Search callers first, reuse existing helpers, fix the shared cause, and change nothing unrelated.
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
- **The test**: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution & Testing Integrity
Define success criteria. Loop until verified.

- **Tests check why, not just what**: A new test must fail if the business logic changes. Never write tests that merely assert trivial implementation details.
- **The Bug-Fix Protocol**: For any bug, write the minimal failing test first that reproduces it, verify the failure, fix the root cause, then make it pass.
- **Never skip or loosen a test or guard to get green**: If a guard is wrong or obsolete due to an intentional product change, fix the guard and say why in the report/commit.
- For multi-step tasks, state a brief plan:
  1. `[Step]` → verify: `[check]`
  2. `[Step]` → verify: `[check]`
  3. `[Step]` → verify: `[check]`

### 5. Finding Code Cheaply (Context & Token Economy)
Do not exhaust token budget on wasteful whole-file reads:
- **"Which file?"**: Read [`FILE-INDEX.md`](file:///c:/Users/James/Downloads/Quest/FILE-INDEX.md) first (5KB, one line per file) to pinpoint target files without directory scanning.
- **Large Docs (>30KB)**: Never read them whole. Inspect headings (`grep -n '^## ' <file>`) and read only the specific section range needed using line offsets.
- **Targeted Symbol Lookups**: Grep for function/type symbols directly before reading files.

---

## 3. Governance Hierarchy & Precedence

All changes must obey the governance hierarchy defined in [`GOVERNANCE.md`](file:///c:/Users/James/Downloads/Quest/GOVERNANCE.md):
1. **Safety & Child Privacy** (Strict non-negotiable)
2. **PWA Compliance** ([`PWA.md`](file:///c:/Users/James/Downloads/Quest/PWA.md))
3. **HTML Living Standard** ([`HTML_LIVING_STANDARD.md`](file:///c:/Users/James/Downloads/Quest/HTML_LIVING_STANDARD.md))
4. **Design System & Palette** ([`DESIGN_SYSTEM.md`](file:///c:/Users/James/Downloads/Quest/DESIGN_SYSTEM.md))
5. **Single-File Cloudflare Worker & Size Constraints** (≤ 2,000 lines per file; `worker.js` generated from `src/`)
6. **Code Architecture & Svelte 5 / Runes Standards**
7. **Code Formatting & Linting**

---

## 4. Tech Stack & Architecture Baseline

- **Initial Curriculum Focus**: KAAC Middle Grades (Grades 6–8) across all 5 subject areas (Math, Science, Social Studies, Language Arts, Arts & Humanities). Includes 2027 Focus Work (*Animal Farm*) and 2027 cultural rotation.
- **Source Code**: Modular sources under `src/` (client, server, data, audio, graphics) strictly ≤ 2,000 lines per file.
- **Build Output**: `worker.js` bundled via `npm run build`.
- **Testing**: Node's native test runner (`node --test tests/**/*.test.js`) or Vitest following [`TESTING.md`](file:///c:/Users/James/Downloads/Quest/TESTING.md).
- **Frontend Framework**: Svelte 5 (utilizing modern runes: `$state`, `$derived`, `$props`, `$effect`) or lightweight vanilla component shell compiled into inline assets.
- **Renderer**: High-performance Canvas 2D engine for procedural tilemaps, entities, and battle FX; semantic accessible HTML DOM for question dialogue and menus.
- **Audio Engine**: Synthesized 8-bit sound effects via Web Audio API (`AudioContext`).
- **Backend / Edge Runtime**: Cloudflare Worker runtime (Web Standards: `fetch`, `Request`, `Response`, `WebSocketPair`).
- **Data Persistence**:
  - Guest mode: Local `localStorage` / `IndexedDB` (no server setup needed to play immediately).
  - Cloud accounts: Cloudflare D1 relational database binding for account progression.
- **Multiplayer Engine**: Cloudflare Durable Objects / WebSockets with deterministic turn-based question encounters.
