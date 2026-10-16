# ARCHITECTURE.md — System Architecture & Blueprint

> **Project**: QUEST: Kentucky  
> **Purpose**: Technical specification detailing the Cloudflare Worker architecture, procedural graphics engine, spaced repetition system, and file budgeting.

---

## 1. Cloudflare Worker Target (`worker.js`)

### 1.1 The Copy-Paste Deployment Model
To ensure maximum ease of deployment and maintenance without requiring complex CI pipelines, QUEST: Kentucky is architected so that the complete operational application can be built into a single, self-contained `worker.js` file suitable for copy-pasting directly into the Cloudflare Workers Quick Edit browser editor.

### 1.2 Unified Worker Responsibilities
The `worker.js` script handles all three tiers of the application in a unified runtime:
1. **Frontend App Shell Delivery (`GET /`)**:
   - Returns the complete HTML document containing the inlined CSS, Canvas 2D engine, Svelte 5 / JS app bundle, and Web Manifest.
   - Includes standard HTTP caching headers (`Cache-Control: public, max-age=3600`) and security headers (`Content-Security-Policy`, `X-Content-Type-Options: nosniff`).
2. **REST API Endpoints (`/api/*`)**:
   - `/api/session`: Generates pseudonymous guest sessions.
   - `/api/questions/random`: Retrieves eligible questions without answer keys.
   - `/api/answers`: Evaluates student answers server-side, records attempt history, schedules spaced reviews, and returns explanations.
   - `/api/progress`: Fetches concept mastery percentages across the 5 KAAC subject realms.
3. **Real-Time Multiplayer Routing (`/ws`)**:
   - Upgrades incoming WebSocket requests and routes players into private room sessions (Co-op Dungeons or 1v1 Duels) using Cloudflare Durable Objects.

```
                    ┌──────────────────────────────────────────────┐
                    │       Cloudflare Edge Runtime (worker.js)    │
                    │                                              │
Client Request ────►│ 1. GET /         ──► Inlined HTML/JS Shell   │
                    │ 2. /api/*        ──► Answer Validation & SM2 │
                    │ 3. /ws (Upgrade) ──► WebSocket Co-Op Engine │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                             Cloudflare D1 / Durable Objects
                             - Concepts & Questions
                             - User Mastery & Ledger
```

---

## 2. File Length Budget (≤ 2,000 Lines per File)

To prevent unmaintainable code bloat, maintain high readability, and prevent context exhaustion in AI coding sessions:
- **Hard Rule**: No individual source or configuration file may exceed 2,000 lines of code.
- **Architectural Division**:
  - Source files are kept small and modular (300–800 lines each).
  - A simple build/bundling step (via esbuild, Vite, or a lightweight concatenator) compiles the modular sources into the deployable `worker.js`.
  - In development, source code is divided cleanly across:
    - `/src/client/` (Canvas 2D renderer, UI components, touch input, audio synth)
    - `/src/server/` (Worker handlers, answer validator, spaced repetition algorithm)
    - `/src/multiplayer/` (Durable Object room state machines, WebSocket protocols)
    - `/src/data/` (Curriculum metadata, procedural sprite matrices, question banks)

---

## 3. Procedural Graphics Engine ("All Code, No Actual Images")

### 3.1 Why Zero External Images?
1. **School Network Resilience**: School filters, firewalls, and proxy caches frequently block third-party image hosts and CDNs.
2. **Instant Zero-Latency Boot**: No HTTP asset requests means 0ms asset download delays; the game launches instantaneously even on 2G/3G mobile connections.
3. **Single-File Portability**: Enables `worker.js` to be self-contained without needing external R2 asset bucket links during initial setup.
4. **Crisp Pixel Art Scaling**: Algorithmic rendering at `320 × 240` logical resolution scales cleanly with nearest-neighbor interpolation to any screen size (Retina phones, 4K monitors, low-res Chromebooks).

### 3.2 Renderer Pipeline
- **Logical Grid**: The game world is based on a $16 \times 16$ pixel tile grid.
- **Offscreen Canvas Texture Atlas**: On app boot, procedural generators draw all terrain tiles, trees, stone blocks, and furniture onto a hidden $256 \times 256$ Canvas atlas.
- **Rendering Loop**: `requestAnimationFrame` blits visible tiles from the cached atlas to the main screen canvas, followed by entity sprites and particle layers.
- **Dynamic Particle System**: Spell effects, gold coin explosions, and damage numbers are computed via simple vector math ($x, y, vx, vy, \text{life}$).

---

## 4. Spaced Repetition Engine (Governor's Cup Retention)

Preparation for academic competition requires durable, long-term conceptual recall rather than short-term cramming.

### 4.1 Spaced Interval Progression
Concept mastery follows a deterministic review schedule:
- **Intervals**: 1 day $\to$ 3 days $\to$ 7 days $\to$ 14 days $\to$ 30 days.
- **Rules**:
  1. **Unassisted Correct**: If the player answers correctly on the first attempt without viewing an explanation, the concept interval advances to the next step.
  2. **Assisted Correct**: If the player required a hint or viewed an explanation before answering correctly, the attempt is flagged `assisted: true`. It awards XP but does NOT advance mastery interval.
  3. **Incorrect Attempt**: Immediately resets the concept interval to 1 day and schedules a related question from the same curriculum standard.
  4. **Multi-Question Verification**: Concept mastery is only awarded when a student correctly answers at least 3 distinct questions within that specific curriculum objective across separated days.

---

## 5. Child Safety & Privacy Architecture

- **Pseudonymous Authentication**: Every player session is assigned a client-generated UUID or secure random token stored in `localStorage`.
- **Predefined Emote Protocol**: Multiplayer sockets reject any message containing freeform text strings. Only recognized emote IDs (e.g., `EMOTE_CHEER`, `EMOTE_FOCUS`, `EMOTE_MATH_HELP`) are relayed to teammates.
- **Zero Third-Party Trackers**: No Google Analytics, Facebook Pixel, advertising SDKs, or tracking cookies. All telemetry is aggregate and educational only.
