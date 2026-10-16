# QUEST: Kentucky

> **Responsive Browser RPG for Middle Grades (Grades 6–8) preparing for KAAC Governor's Cup Academic Competition.**

[![Tests](https://img.shields.io/badge/tests-115%20passing-brightgreen)](#testing)
[![Phase](https://img.shields.io/badge/phase-6%20multiplayer%20co--op-blue)](#phase-6-multiplayer-co-op-rooms-websockets--authoritative-boss-combat)
[![Cloudflare Workers](https://img.shields.io/badge/deployment-Cloudflare%20Workers-orange)](#deployment)

---

## 1. Quick Start

### Prerequisites
- Node.js 18+ (uses native test runner `node --test`)

### Commands
```bash
# Install dependencies (zero production runtime dependencies required)
npm install

# Build standalone Cloudflare Worker artifact (worker.js)
npm run build

# Run unit and contract test suites
npm test

# Start local preview server simulating Cloudflare Worker edge runtime
npm run dev
```

Visit `http://localhost:8787` in any desktop browser, mobile phone, tablet, or school Chromebook.

---

## 2. Controls & Gameplay Guide

### Movement & Exploration
| Action | Keyboard Controls | Touch Controls |
| :--- | :--- | :--- |
| **Move Up** | `W` or `ArrowUp` | Tap / Hold Virtual D-Pad **▲** |
| **Move Down** | `S` or `ArrowDown` | Tap / Hold Virtual D-Pad **▼** |
| **Move Left** | `A` or `ArrowLeft` | Tap / Hold Virtual D-Pad **◀** |
| **Move Right** | `D` or `ArrowRight` | Tap / Hold Virtual D-Pad **▶** |
| **Interact / Action** | `Enter` or `Space` | Tap **[ACT]** button (bottom right) |
| **Open / Close Menu** | `Escape` or `M` | Tap **[MENU]** button or HUD nav tabs |

---

## 3. Phase 2 Vertical Slice Walkthrough

1. **Starter Village (Berea Crossroads Hub)**:
   - Walk up to the **Elder Sage of Berea** at `col 10, row 5` and press `[ACT]` or click to interact.
   - Read the dialogue and click **"Accept Quest & Explore"** to activate the starter quest *"Flora of the Verdant Wilds"*.
   - Examine any of the 5 Governor's Cup Shrines (Math, Science, Social Studies, Language Arts, Arts & Humanities) around the crossroads.
2. **Wilderness Route (Red River Trail)**:
   - Walk along the cobblestone path north through the forest gate (`col 9-10, row 0`) to transition onto the Red River Trail.
   - Follow the winding trail north past the blue river and pine trees.
3. **The Verdant Sanctuary (5-Encounter Dungeon)**:
   - Step through the northern dungeon entrance (`row 0`) into the stone chambers.
   - **Encounter 1**: Approach the *Bramble Sproutling* (`[ACT]`). Solve the Science question on photosynthesis.
   - **Encounter 2**: Head into the left wing and engage the *Cipher Wisp* (`[ACT]`). Solve the Math equation.
   - **Encounter 3**: Head into the right wing and challenge the *Pioneer Sentry* (`[ACT]`). Answer the Kentucky History question.
   - **Encounter 4**: Approach the inner hall and challenge the *Archival Specter* (`[ACT]`). Identify the literary personification.
   - **Encounter 5 (Boss Battle)**: Step into the north sanctuary gate to face the *Overgrown Guardian*. Answer 2 consecutive curriculum challenges to break its stone armor!
4. **Quest Completion & Rewards**:
   - Defeating the boss triggers a victory fanfare, updates quest status to `COMPLETED`, awards `+150 XP` and `+50 Gold`, and unlocks the rare relic *"Guardian's Living Bloom"*.
   - View your new relic in the **Items** inventory panel!
5. **No Soft Locks / Safe Recovery**:
   - If player HP reaches 0 from incorrect answers, the Elder Sage's ward automatically returns the player to Berea Crossroads Hub with full health restored to try again.

---

## 4. Phase 3: Question Schema, Rights Gate & Validation Workflow

Phase 3 introduces rigorous provenance validation, rights enforcement, duplicate detection, and secure server-authoritative answer delivery:

### Strict 14-Field Question Schema
Every question conforms to the Governor's Cup Middle Grades specification:
- `id`: Stable alphanumeric identifier (e.g. `syn_sci_001`).
- `subject`: One of the 5 Governor's Cup subjects (`math`, `science`, `social_studies`, `language_arts`, `arts_humanities`).
- `conceptIds`: Array of specific curriculum taxonomy nodes.
- `gradeBand`: Target competition division (`6-8`, `4-5`, `6`).
- `prompt`: Question prompt text (minimum 10 characters).
- `choices`: Array of at least 2 (standard 4) choices with unique IDs and non-empty text.
- `answerKey`: Must strictly match a valid choice ID.
- `explanation`: Educational feedback and rationale.
- `difficulty`: Integer rating (1–5).
- `source` / `provenance`: Origin metadata (`type`, `author`/`reference`, `rightsStatus`).
- `rightsStatus`: `'approved'` | `'pending'` | `'rejected'` | `'in_review'`.
- `reviewStatus`: `'draft'` | `'in_review'` | `'verified'` | `'approved'` | `'rejected'` | `'retired'`.
- `version`: Positive integer version counter.
- `active`: Boolean active serving status.

### Non-Negotiable Rights Gate
Questions cannot be active or delivered to players unless `rightsStatus === 'approved'`. Revoking rights or retiring an item automatically deactivates the question and excludes it from public delivery and answer scoring.

### Duplicate Detection Review Aid
To aid human content reviewers, `detectDuplicates` normalizes prompts, computes token-level Jaccard similarity, and flags both exact duplicates and high-similarity items without making unilateral legal judgments.

### Secure Answer Delivery Endpoints
- `GET /api/questions`: Delivers public questions with **Answer Key Secrecy** enforced (`sanitizeQuestionForClient` strips `answerKey`). Only active, rights-approved items are served.
- `POST /api/questions/validate`: Pre-import validation and duplicate analysis endpoint.
- `POST /api/questions/import`: Authorized content reviewer import endpoint (enforces `X-Reviewer-Role: reviewer` or `content_admin`).
- `POST /api/answers`: Authoritative evaluation requiring valid session, active/approved question status, valid choice ID, and idempotency protection (`idempotencyKey`).

---

## 5. Phase 4: D1 Persistence, Attempt History & Spaced Repetition

Phase 4 establishes persistent relational tracking, tamper-resistant attempt audits, and deterministic spaced repetition mastery:

### Cloudflare D1 Relational Schema (`migrations/0001_initial_schema.sql`)
- `users`: Pseudonymous player profiles (`id`, `handle`, `role`, timestamps).
- `concepts`: Canonical curriculum nodes mapped to Governor's Cup subjects and grade bands.
- `questions`: Question metadata, provenance, and rights status.
- `user_question_attempts`: Server-authoritative audit log of every question interaction with timestamps, duration, assistance flags, and idempotency protection.
- `user_concept_mastery`: Spaced repetition state tracking review interval stages (0–5), next due timestamps, and multi-question verification.
- `wallet_ledger` & `user_inventory`: Persistent guest/player economy and inventory assets.

### Deterministic 5-Stage Spaced Repetition Algorithm (`src/data/spaced-repetition.js`)
- **Interval Progression**: Reviews advance through `[1, 3, 7, 14, 30]` day intervals on unassisted correct answers.
- **Mastery Verification**: Requires answering $\ge 3$ distinct questions correctly on separate calendar dates and reaching stage $\ge 4$ before certifying concept mastery.
- **Assistance Penalty**: Assisted correct answers (`assisted: true`) preserve the current interval without advancing stage.
- **Mistake Reset**: Any incorrect answer resets the concept interval stage to 0 (1-day review) to reinforce fundamentals.

### Progress & Spaced Repetition API Endpoints
- `GET /api/progress`: Returns aggregate mastery percentages across all 5 Governor's Cup subjects, total mastered concepts, and active due review counts.
- `GET /api/review/due`: Queries concepts currently due for review and serves matching sanitized questions.
- `POST /api/answers`: Atomic attempt processing that records audit logs, updates spaced repetition schedules, awards XP/Gold, and returns updated mastery stage.

---

## 6. Phase 5: Progression, Cosmetic Rewards & Anti-Farming Controls

Phase 5 establishes server-authoritative level curves, non-pay-to-win cosmetic economy, starter companion, and anti-farming diminishing returns:

### Progression Engine & Level Curves (`src/data/progression.js`)
- **Adventure XP vs Concept Mastery**: Player levels reflect adventure milestones and quest completions, while curriculum mastery remains strictly tracked in spaced repetition records.
- **Quadratic Level Curve**: Cumulative threshold formula $50 \times (L - 1) \times L$ (Level 1: 0 XP, Level 2: 100 XP, Level 3: 300 XP, Level 4: 600 XP, Level 5: 1000 XP) capped at Level 50.
- **Starter Companion**: Procedural *Kentucky Cardinal Fledgling* (`companion_cardinal`, state bird of Kentucky) granted automatically to every young adventurer.

### Child-Safe Cosmetic Economy & Anti-Farming Protections
- **Strict Non-Negotiables**: Zero real-money microtransactions, zero loot boxes, zero pay-to-win stat advantages, zero trading (100% COPPA/FERPA compliant).
- **Anti-Farming Diminishing Returns**:
  - 1st correct answer in 24h: 100% reward (15 XP / 5 coins unassisted; 5 XP / 1 coin assisted).
  - 2nd correct answer in 24h: 50% reward (8 XP / 2 coins unassisted; 2 XP / 0 coins assisted).
  - 3rd+ repeated correct answer in 24h: minimal XP clamp (1 XP, 0 coins) preventing automated grinding.
- **Anti-Negative Balance Constraint**: Transactions that would produce negative balances are rejected.
- **Idempotent Rewards**: Duplicate attempts or double quest claim submissions are cached without duplicate rewards.

### Phase 5 API Endpoints
- `GET /api/progression`: Server-authoritative level, XP, coins, and equipped companion.
- `GET /api/inventory`: Owned equipment, companion, and cosmetic catalog with prices.
- `POST /api/inventory/equip`: Equip / unequip owned items.
- `POST /api/inventory/buy`: Purchase cosmetic items using earned in-game coins.
- `POST /api/quests/claim`: Server-authoritative, idempotent quest reward claiming.

---

## 7. Phase 6: Multiplayer Co-op Rooms, WebSockets & Authoritative Boss Combat

Phase 6 implements synchronized multiplayer co-op encounters with private room codes, edge WebSockets, and COPPA child-safety safeguards:

### Private Room Codes & Capacity (`src/server/rooms.js`)
- **Child-Friendly Room Codes**: Uppercase private codes formatted as `KY-XXXX` (e.g. `KY-4819`).
- **2–4 Player Capacity**: Strict room boundary enforcing minimum 2 and maximum 4 concurrent players.
- **Lobby Ready Checks**: Host starts ready; encounter can only start once all participants toggle ready.
- **Anti-Brute Force Rate Limiting**: Max 5 failed room code guesses per 5 minutes per client session (returns HTTP `429 Too Many Requests`).

### Authoritative Boss Combat & Question Synchronization
- **Boss Encounter**: *Overgrown Colossus of the Wilds* with HP dynamically scaled to question volume.
- **Answer Key Secrecy**: Clients receive sanitized questions stripped of `answerKey`. Correct answers deal 25 damage to the boss and award points (+100); wrong answers apply non-negative score penalties (-20).
- **Synchronized Turn Advancement**: When any participant answers, all players advance to the next sanitized question.
- **Victory & Rewards**: Felling the boss triggers a synchronized victory transition and grants XP and coin rewards.

### Child Privacy & Preset Emotes (Zero PII)
- **Zero Open Chat**: No free-text input or voice channels.
- **Preset Emotes Only**: 6 child-safe preset emotes (`ready`, `cheer`, `thinking`, `focus`, `high_five`, `gg`).

### Disconnect Grace Period & Host Migration
- **45-Second Disconnect Grace**: Disconnected players retain their score and can seamlessly reconnect.
- **Automatic Host Migration**: If the host disconnects, the next active participant is automatically promoted to host.

### Phase 6 API Endpoints
- `POST /api/rooms/create`: Create private co-op lobby (`{ hostId, hostHandle }`).
- `POST /api/rooms/join`: Join private room with code and handle (rate-limited).
- `POST /api/rooms/ready`: Toggle participant ready state.
- `POST /api/rooms/start`: Host initiates co-op boss encounter.
- `POST /api/rooms/answer`: Submit answer, damage boss, and update team score.
- `POST /api/rooms/emote`: Broadcast child-safe preset emote.
- `GET /api/rooms/status`: Retrieve full room state snapshot.
- `GET /api/rooms/emotes`: Query catalog of approved preset emotes.
- `GET /api/rooms/ws`: Cloudflare Workers WebSocket connection for real-time edge sync.

---

## 8. Architecture Principles

- **Zero External Raster Images**: 100% procedural Canvas 2D sprites & inline SVG icons.
- **Zero External Audio Files**: Synthesized procedural Web Audio API sound effects.
- **Strict File Budget**: Every source file and compiled artifact is ≤ 2,000 lines.
- **Edge Deployment Target**: Cloudflare Worker script (`worker.js`) compiled from `src/`.
- **COPPA/FERPA Compliance**: Child-safe pseudonymous adventurer handles with zero PII and no open text/voice chat.


