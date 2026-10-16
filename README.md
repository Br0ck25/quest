# QUEST: Kentucky

> **Responsive Browser RPG for Middle Grades (Grades 6–8) preparing for KAAC Governor's Cup Academic Competition.**

[![Tests](https://img.shields.io/badge/tests-156%20passing-brightgreen)](#testing)
[![Phase](https://img.shields.io/badge/phase-11%20staging%20%26%20handoff-blue)](#phase-11-staging-deployment-operations-baseline--pilot-readiness)
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

# Run unit and contract test suites (156 tests passing)
npm test

# Run pre-flight staging & production smoke tests (52 automated checks)
npm run smoke

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

## 8. Phase 7: 1v1 Knowledge Duels, Balanced Scoring & Delayed Answer Reveals

Phase 7 implements private-code 1v1 head-to-head academic duels tailored for fair, sportsmanlike classroom competition:

### Private Match Creation & Choice Shuffling (`src/server/duels.js`)
- **Private Room Codes**: Child-friendly codes formatted as `DUEL-XXXX` (e.g. `DUEL-4829`).
- **Choice Shuffling per Player**: Choices are deterministically permuted per player using a hash of the question and player ID, preventing screen peeking / shoulder surfing in close classroom settings.
- **5-Round Curriculum Showcase**: Each duel features 5 sequential rounds covering all 5 Governor's Cup subjects (Math, Science, Social Studies, Language Arts, Arts & Humanities).

### Delayed Answer Reveal Policy & Answer Key Secrecy
- **No Early Answer Leakage**: Neither player sees the answer key or their opponent's choice while the round is active.
- **Synchronized Reveal**: Answers and explanations are revealed only after both players submit or when the 20-second round timer expires.

### Authoritative Balanced Scoring
- **Accuracy is Primary**: Correct answers award a base of 100 points. Incorrect answers award 0 points.
- **Speed Bonus as Capped Tiebreaker**: Correct answers earn an additional speed bonus capped at 10 points based on remaining time. An accurate player always beats a fast but inaccurate player (100 pts vs 0 pts).
- **Tie Resolution**: Ties are cleanly detected and celebrated as honorable scholar stalemates.

### Respectful Post-Match Recap & Disconnect Grace
- **Sportsmanlike Recap**: Comprehensive summary detailing winner, final scores, accuracy percentages, average response times, and round-by-round breakdown.
- **45s Reconnect Grace**: Disconnected players can re-enter their match without losing answers or exposing future questions.
- **Rate Limit Protection**: Blocks brute-force guessing of duel room codes (HTTP 429 after 5 failed attempts per 5 minutes).

### Phase 7 API Endpoints
- `POST /api/duels/create`: Create private 1v1 match (`{ hostId, hostHandle }`).
- `POST /api/duels/join`: Join duel match via code.
- `POST /api/duels/ready`: Toggle readiness state.
- `POST /api/duels/start`: Host initiates match.
- `POST /api/duels/answer`: Submit answer independently with delayed reveal check.
- `POST /api/duels/next-round`: Advance to next curriculum round.
- `POST /api/duels/emote`: Send preset emote.
- `GET /api/duels/status`: Fetch player-tailored match snapshot.
- `GET /api/duels/recap`: Retrieve post-match stats.
- `GET /api/duels/ws`: Real-time WebSocket connection for low-latency duel sync.

---

## 9. Phase 8: Accessibility, Usability & Device Polish (WCAG AA)

Phase 8 elevates QUEST: Kentucky to enterprise educational accessibility standards (WCAG 2.1 Level AA) across classrooms, IEP/504 accommodations, and multi-device school deployments:

### Multi-Modal Feedback & Non-Color-Only Indicators
- **Beyond Color Semantics**: Quest status, inventory equipment, combat feedback, and mastery states pair approved color tokens with explicit icons (`✓`, `▶`, `○`, `🔒`, `✗`) and textual tags (`[COMPLETED]`, `[IN PROGRESS]`, `[AVAILABLE]`, `[EQUIPPED]`, `[CORRECT]`, `[INCORRECT — REVIEW SCHEDULED]`).
- **Numerical Stat Display**: HUD health displays exact integer values (`HP 100/100`) alongside visual percentage bars, augmented with `role="progressbar"` and `aria-valuenow`.
- **WCAG AA Contrast Compliance**: Mathematically verified relative luminance contrast across all approved palette tokens on dark surfaces (`TEXT_PRIMARY`: 17.06:1, `TEXT_SECONDARY`: 6.96:1, `BORDER_FOCUS`: 8.33:1, `GOLD`: 10.69:1, `SUCCESS`: 7.04:1, `ERROR`: 4.74:1).

### Keyboard Navigation & Accessible Dialog Management
- **Question Encounter Shortcuts**: Press `1`–`4` or `A`–`D` (case-insensitive) to select choices during solo encounters and duels.
- **Accessible Focus Trap**: Active dialog overlays trap focus inside their boundary (`Tab` / `Shift+Tab` cycle), prevent backdrop leakage, and dismiss cleanly on `Escape`.
- **Focus Restoration**: Closing any panel or modal automatically returns browser focus to the triggering button (`lastFocusedElement`).
- **High-Visibility Focus Rings**: Unambiguous 3px solid sky-blue focus rings with 3px offset (`:focus-visible`).

### Classroom Pacing & Accommodations (IEP / Section 504)
- **Untimed Practice Mode**: Students with processing challenges or IEP accommodations can toggle Untimed Practice Mode in Settings, removing all countdown timers and anxiety triggers from solo encounters.
- **Display Text Scaling**: In-app typography selector supporting `Normal (100%)`, `Large (125%)`, and `Extra Large (150%)` text scaling without viewport overflow or layout distortion.
- **Reduced Motion (Calm Mode)**: System preference (`prefers-reduced-motion`) and in-game toggle eliminate camera shakes, pulses, and transitions for students sensitive to visual motion.
- **Audio Mute with Visual Fallback**: 1-click procedural audio mute toggle paired with persistent visual indicators and screen reader announcements (`#sr-announcements`).

### Target Viewports & Touch Ergonomics
- **Touch Hit Target Guarantee**: All clickable interactive targets (D-Pad, action buttons, menu tabs, choice cards, dialog buttons) meet or exceed the $48 \times 48\text{px}$ touch target threshold.
- **Device Form Factor Benchmarks**:
  - Small Phone: $360 \times 640\text{px}$ (compact single-column stack, auto-collapsing labels)
  - Large Phone: $412 \times 915\text{px}$ (comfortable one-handed reachability)
  - Tablet: $768 \times 1024\text{px}$ (responsive multi-column grids)
  - School Chromebook: $1366 \times 768\text{px}$ (horizontal widescreen layout, 680px optimal line length)
  - Desktop: $1920 \times 1080\text{px}$ (centered max-width container, nearest-neighbor pixel scaling)

### Phase 8 API Endpoints
- `GET /api/accessibility`: Delivers WCAG AA compliance metadata, supported text scales, accommodations, and target viewport matrices.

---

## 10. Phase 9: Admin Content Review Workflow & Verified Question Sets

Phase 9 establishes an authoritative, role-gated content review and lifecycle governance pipeline (`src/server/content-review.js`) ensuring that only vetted, rights-approved KAAC curriculum items reach students:

### Server-Authoritative Role Enforcement
- **Protected Roles**: Access strictly gated to authorized roles (`reviewer`, `content_admin`, `super_admin`) via `X-Reviewer-Role` request headers.
- **Ordinary User Isolation**: Unauthenticated users or student roles (`role: student`, `role: guest`) are rejected with `HTTP 403 Forbidden`.
- **Answer Key Secrecy**: While public endpoints (`/api/questions`) strip answer keys, authorized admin routes reveal full answer keys and explanations solely for pedagogical verification.

### Comprehensive Question Lifecycle Management
- **List & Inspection with Review Aids**: View questions filtered by subject, grade band, review status, and active state, augmented with real-time duplicate similarity warnings (`detectDuplicates`).
- **Rights Gate Enforcement**: The approval pipeline blocks questions whose rights status is `pending` or `rejected`. Questions cannot enter active rotation without explicit rights clearance.
- **Approval (`POST /api/admin/questions/:id/approve`)**: Sets `reviewStatus = 'approved'`, activates serving (`active = 1`), and records reviewer ID with timestamp.
- **Rejection (`POST /api/admin/questions/:id/reject`)**: Marks `reviewStatus = 'rejected'`, deactivates question (`active = 0`), and records rejection rationale.
- **Correction & Version Bumping (`POST /api/admin/questions/:id/correct`)**: Archives historical snapshots into `question_versions`, validates candidate schema, bumps version (`version + 1`), and updates question text without altering stable IDs.
- **Retirement from Active Rotation (`POST /api/admin/questions/:id/retire`)**: Sets `reviewStatus = 'retired'` and `active = 0`. Retired questions are removed from student rotations while preserving stable IDs and relational integrity for historical student attempt audits.
- **Immutable Audit Trail (`GET /api/admin/questions/:id/history`)**: Chronological audit trail tracking every reviewer ID, action, state delta, and review note.

### Phase 9 API Endpoints
- `GET /api/admin/questions`: List questions with duplicate warnings and status filters (role-gated).
- `GET /api/admin/questions/:id`: Fetch question details, answer key, and duplicate scores (role-gated).
- `POST /api/admin/questions/:id/approve`: Approve question for active rotation (role-gated).
- `POST /api/admin/questions/:id/reject`: Reject question and record rationale (role-gated).
- `POST /api/admin/questions/:id/correct`: Correct question, archive snapshot, and bump version (role-gated).
- `POST /api/admin/questions/:id/retire`: Retire question from active student rotation (role-gated).
- `GET /api/admin/questions/:id/history`: Retrieve chronological review audit history (role-gated).

---

## 11. Phase 10: Security, Privacy Review, Child Safety Audit & Release Candidate Baseline

Phase 10 audits the entire codebase for COPPA/FERPA compliance, anti-tampering, session authorization, and establishes the production release candidate baseline:

### Child Privacy & Zero PII Architecture (COPPA / FERPA Compliance)
- **Zero Personal Identifiable Information**: No student real names, email addresses, phone numbers, school IDs, or birthdays are ever requested, recorded, or stored in Cloudflare D1.
- **Child-Safe Handles**: User handles follow procedural pseudonymous templates (`[Prefix][Role][2Digits]`, e.g., `BluegrassExplorer42`).
- **No Open Text or Voice Communication**: Public/private text chat and voice communication are completely prohibited. Student interaction in co-op and duels is restricted exclusively to 6 approved preset emotes (`ready`, `cheer`, `thinking`, `focus`, `high_five`, `gg`).
- **Right to be Forgotten (`POST /api/user/delete`)**: Full data deletion endpoint allowing students, parents, or administrators to permanently purge all user records across all 7 relational tables (`user_question_attempts`, `user_concept_mastery`, `wallet_ledger`, `user_inventory`, `user_progression`, `user_quests`, `users`).

### Anti-Tampering & Edge Security Invariants
- **Session IDOR Protection**: User state modifications (`/api/inventory/buy`, `/api/inventory/equip`, `/api/quests/claim`, `/api/answers`, `/api/user/delete`) strictly verify that request payload user identities match the session credentials (`x-guest-id` / `x-user-id`).
- **Anti-DoS Payload Limiting**: Edge worker rejects oversized request bodies (> 64KB) with `HTTP 413 Payload Too Large` to prevent edge memory exhaustion.
- **Strict Security Headers & Device Permissions Guard**:
  - `Content-Security-Policy`: `default-src 'self' 'unsafe-inline' data:; connect-src 'self' ws: wss:;`
  - `Permissions-Policy`: `camera=(), microphone=(), geolocation=()` (strictly disallowing camera, microphone, and geolocation access).
  - `X-Content-Type-Options`: `nosniff`
  - `X-Frame-Options`: `DENY`
  - `Referrer-Policy`: `strict-origin-when-cross-origin`
- **Answer Key Secrecy**: Verification that no student-facing endpoint exposes `answerKey` prior to authorized post-submission evaluation.
- **Anti-Farming Economy Stability**: Diminishing returns clamp repeated attempts on the same question within 24 hours to 1 XP and 0 coins.

### Phase 10 API Endpoints
- `GET /api/health`: Delivers release candidate health snapshot (`phase: 10`, `mode: 'release-candidate'`, `securityAudit: 'passed'`).
- `GET /api/security/audit`: Delivers security, privacy, and child safety compliance metadata.
- `POST /api/user/delete`: Permanently purges user account and all relational audit records.

---

## 12. Phase 11: Staging Deployment, Operations Baseline & Pilot Readiness

Phase 11 establishes the operational runbook, private pilot measurement protocols, pre-flight smoke testing, and master architectural handoff:

### Cloudflare Staging & Operations Baseline ([`OPERATIONS.md`](file:///c:/Users/James/Downloads/Quest/OPERATIONS.md))
- **Environment Separation**: Clean isolation between Local, Staging (`quest_ky_staging_d1`), and Production (`quest_ky_production_d1`) defined in [`wrangler.json`](file:///c:/Users/James/Downloads/Quest/wrangler.json).
- **Automated Smoke Testing (`npm run smoke`)**: 52 automated pre-flight checks validating health, HTML shell, PWA manifest, service worker, security headers, curriculum catalogs, co-op, duels, anti-farming rewards, and data purge.
- **Backup & Recovery Protocol**: Documented D1 SQL export and recovery commands for safe database snapshotting prior to schema migrations.
- **Immediate Content Takedown**: Single-command retirement API allowing content admins to instantly withdraw disputed questions from active student rotation without code redeployment.
- **COPPA/FERPA Deletion SLA**: Statutory right-to-be-forgotten deletion workflow executed in $< 24$ hours via `/api/user/delete`.

### Private Pilot Study & Go/No-Go Gate ([`PILOT_RUNBOOK.md`](file:///c:/Users/James/Downloads/Quest/PILOT_RUNBOOK.md))
- **Cohort Parameters**: 30–60 middle school students across 2–3 Kentucky classrooms with teacher supervision.
- **Efficacy Measurement**: Empirical delayed recall tracking at 1, 3, 7, 14, and 30 days via Leitner spaced repetition.
- **Go / No-Go Decision Gate**:
  - Child Safety: 100% Zero PII and preset emotes only (no open chat).
  - Curriculum Rights: 100% Rights Status = 'approved'.
  - Delayed Recall: $\ge 75\%$ retention on 7-day recall across concepts.
  - Usability: $\ge 90\%$ independent completion of the single-player slice.
  - Multiplayer Reliability: $< 1\%$ drop rate on school Wi-Fi and Chromebooks.

### Developer & Architectural Handoff ([`HANDOFF.md`](file:///c:/Users/James/Downloads/Quest/HANDOFF.md))
- **Repository Architecture**: Complete file map, directory roles, and data flow from Canvas/DOM through Edge Worker to D1 SQLite.
- **Extension Recipes**: Step-by-step developer guides for adding new KAAC regions, questions, quests, and cosmetic inventory items.
- **Zero-Dependency Guarantee**: Pure Node.js standard library with 0 production runtime npm dependencies.

---

## 13. Architecture Principles

- **Zero External Raster Images**: 100% procedural Canvas 2D sprites & inline SVG icons.
- **Zero External Audio Files**: Synthesized procedural Web Audio API sound effects.
- **Strict File Budget**: Every source file and compiled artifact is ≤ 2,000 lines.
- **Edge Deployment Target**: Cloudflare Worker script (`worker.js`) compiled from `src/`.
- **COPPA/FERPA Compliance**: Child-safe pseudonymous adventurer handles with zero PII and no open text/voice chat.


