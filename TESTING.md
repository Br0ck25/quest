# TESTING.md — QUEST: Kentucky Testing Strategy & Guardrails

> **Philosophy**: **Tests check WHY, not just WHAT.**  
> A test must fail if business logic changes. Never write tests that merely assert trivial implementation details.

---

## 1. Non-Negotiable Testing Guardrails

1. **Never Skip or Loosen a Test or Guard to Get Green**:
   - If a test fails, fix the underlying code, not the test assertion.
   - If a guard or test itself is legitimately outdated or wrong due to a product change, fix the guard and document why in the commit/report.

2. **The Bug-Fix Protocol**:
   When fixing a bug:
   1. **Reproduce**: Write a minimal failing test that reproduces the bug.
   2. **Verify Failure**: Run the test to confirm it fails as expected.
   3. **Fix Root Cause**: Search callers, identify the shared cause, and fix it surgically without touching unrelated code.
   4. **Verify Green**: Confirm the test passes and existing tests remain green.

3. **Behavioral Testing**:
   - Tests must assert observable outcomes, state transitions, and security contracts:
     - *Spaced Repetition*: Does an assisted answer correctly prevent mastery advancement?
     - *Answer Secrecy*: Does the `/api/questions` endpoint strictly exclude `answerKey` and `explanation` from public client payloads?
     - *Score & Rewards*: Does submitting duplicate answers with the same idempotency key reject duplicate coin/XP awards?

---

## 2. Test Suite Categorization

```
tests/
├── unit/
│   ├── scheduler.test.js      # Spaced review intervals (1, 3, 7, 14, 30 days)
│   ├── scoring.test.js        # XP, coin calculation, and streak-free progression
│   ├── sprites.test.js        # Procedural sprite matrix integrity and palette bounds
│   └── audio.test.js          # Web Audio frequency and parameter math
├── protocol/
│   ├── room_state.test.js     # Co-op dungeon and 1v1 duel state transitions
│   └── messages.test.js       # WebSocket schema validation, rate limits, emote filters
└── contract/
    ├── api_answers.test.js    # Server-authoritative answer submission & reveal timing
    └── guest_session.test.js  # Guest session creation and local storage schemas
```

---

## 3. Running Tests

- Tests are fast, lightweight, and require zero heavy browser runners for logic verification.
- **Run command**:
  ```bash
  npm test
  # or using Node's built-in test runner:
  node --test tests/**/*.test.js
  ```
- All tests must pass before generating or updating the production `worker.js` artifact.

---

## 4. Accessibility & Target Device Verification Matrix

### 4.1 Automated Accessibility Verification (`tests/unit/accessibility.test.js`)
- **Luminance Contrast**: Automated WCAG 2.1 AA formula checks verifying that all foreground text tokens exceed 4.5:1 (normal text) and 7.0:1 (primary text) against dark surfaces (`#0F172A` and `#1E293B`).
- **Touch Target Integrity**: Minimum $48 \times 48\text{px}$ dimension checks on all virtual controls, choice buttons, and modal elements.
- **Focus Management**: Automated tests verifying focus trapping within modals, focus cycling on `Tab`/`Shift+Tab`, and focus return to `lastFocusedElement` on close.
- **Non-Color Indicators**: Verification of paired symbols (`✓`, `▶`, `○`, `✗`) and textual tags alongside color styling.

### 4.2 Target Device Form Factor Matrix
| Device Category | Benchmark Resolution | Input Modes | Layout Behavior |
| :--- | :--- | :--- | :--- |
| **Small Phone** | $360 \times 640\text{px}$ | Touch (Virtual D-Pad, $48\text{px}$ buttons) | Single-column HUD, auto-collapsed button text labels, full-width modal overlay. |
| **Large Phone** | $412 \times 915\text{px}$ | Touch (Virtual D-Pad, $56\text{px}$ action buttons) | Compact HUD, vertically stacked choices with ample spacing. |
| **Tablet** | $768 \times 1024\text{px}$ | Touch & Keyboard | 2-column grid for inventory and quest logs, comfortable modal margins. |
| **School Chromebook** | $1366 \times 768\text{px}$ | Keyboard (WASD, Arrows, 1–4, A–D) & Trackpad | Widescreen landscape layout, optimal 680px line length container, focus rings. |
| **Desktop / Laptop** | $1920 \times 1080\text{px}$ | Keyboard, Mouse, Trackpad | Centered game viewport, 1:1 crisp nearest-neighbor canvas rendering. |

### 4.3 Classroom Accommodations (IEP / Section 504)
- **Untimed Practice Mode**: Eliminates timer countdowns in solo questions, allowing students with IEP/504 accommodations to practice without anxiety.
- **Display Text Scaling**: In-game font scale settings (`Normal 100%`, `Large 125%`, `Extra Large 150%`) with fluid CSS scaling.
- **Reduced Motion**: Honored via both `@media (prefers-reduced-motion: reduce)` and the in-game Calm Mode setting.

### 4.4 Honest Limitations & Trade-Offs
1. **Procedural Canvas 2D Graphics**: Screen readers cannot inspect individual pixel art entities on the Canvas 2D element. To ensure complete accessibility, all critical game interactions, question prompts, dialogue, stats, and inventories are rendered in semantic HTML with ARIA live region announcements (`#sr-announcements`).
2. **Viewport Zooming in Standalone PWA**: The standalone PWA shell specifies `user-scalable=no` per `PWA.md` to prevent accidental zooming during rapid touch D-pad tapping. Font size adjustments are provided via the in-app Text Scaling setting (`Normal`, `Large`, `Extra Large`) in the accessible settings panel.

