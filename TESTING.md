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
