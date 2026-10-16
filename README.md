# QUEST: Kentucky

> **Responsive Browser RPG for Middle Grades (Grades 6–8) preparing for KAAC Governor's Cup Academic Competition.**

[![Tests](https://img.shields.io/badge/tests-44%20passing-brightgreen)](#testing)
[![Phase](https://img.shields.io/badge/phase-2%20single--player%20slice-blue)](#phase-2-vertical-slice)
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

## 4. Architecture Principles

- **Zero External Raster Images**: 100% procedural Canvas 2D sprites & inline SVG icons.
- **Zero External Audio Files**: Synthesized procedural Web Audio API sound effects.
- **Strict File Budget**: Every source file and compiled artifact is ≤ 2,000 lines.
- **Edge Deployment Target**: Cloudflare Worker script (`worker.js`) compiled from `src/`.
- **COPPA/FERPA Compliance**: Child-safe pseudonymous adventurer handles with zero PII and no open text/voice chat.
