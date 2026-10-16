# PILOT_RUNBOOK.md — Private Pilot Protocol & Release Gate

> **QUEST: Kentucky — Private Pilot Study Protocol, Efficacy Metrics, and Public Launch Go/No-Go Gate.**

---

## 1. Pilot Study Overview & Objectives

The primary objective of the private pilot is to empirically validate:
1. **Pedagogical Efficacy**: Measuring long-term memory consolidation using 1-day, 7-day, 14-day, and 30-day delayed recall across KAAC Governor's Cup subjects.
2. **Student Ergonomics & Usability**: Verifying that middle school students (Grades 6–8) can independently navigate combat encounters, quests, and spaced repetition reviews on school Chromebooks and mobile devices without teacher technical intervention.
3. **Multiplayer Reliability**: Confirming stable 2–4 player co-op encounters and 1v1 duels over school Wi-Fi networks with $< 1\%$ dropped connections.
4. **Child Safety Compliance**: 100% adherence to COPPA/FERPA mandates with zero PII exposure and strictly moderated preset communication.

---

## 2. Pilot Cohort Parameters

- **Target Audience**: Middle School Students (Grades 6–8) in Kentucky preparing for Governor's Cup Academic Competition.
- **Cohort Size**: 2–3 pilot classrooms (approx. 30–60 students total) with teacher/coach supervision.
- **Devices Tested**:
  - School Chromebooks (ChromeOS, $1366 \times 768\text{px}$)
  - Desktop Browsers (Chrome, Edge, Firefox, Safari)
  - Mobile Phones & Tablets ($360\text{px}$ to $1024\text{px}$)
- **Consent & Privacy**:
  - Passive parental consent & institutional agreement via pilot school district.
  - 100% guest-first access without student email, phone, or name registration.
  - Zero third-party ad tracking, external analytics, or behavioral cookies.

---

## 3. Learning Measurement & Delayed Recall Protocol

QUEST: Kentucky implements an authoritative 5-stage Leitner spaced repetition review engine ([`src/data/spaced-repetition.js`](file:///c:/Users/James/Downloads/Quest/src/data/spaced-repetition.js)):

| Stage | Interval | Verification Method | Efficacy Criteria |
| :--- | :--- | :--- | :--- |
| **Stage 1** | 1 Day | Prompt same concept with alternate distractor choice order | $\ge 80\%$ accuracy on next-day recall |
| **Stage 2** | 3 Days | Variant question testing same KAAC curriculum code | $\ge 75\%$ accuracy |
| **Stage 3** | 7 Days | Delayed recall encounter during wilderness route | $\ge 75\%$ accuracy |
| **Stage 4** | 14 Days | Boss encounter or 1v1 duel round integration | $\ge 70\%$ accuracy |
| **Stage 5** | 30 Days | Mastery confirmation test; unassisted correct answer locks concept | $\ge 70\%$ sustained retention |

### Distinguishing Assisted vs. Unassisted Learning
- If a student answers incorrectly and reads the pedagogical explanation before retrying, the answer is flagged as `assisted: true`.
- **Governance Invariant**: Assisted answers do **NOT** advance mastery stage or increase spaced repetition intervals. Only unassisted delayed recall answers prove concept mastery.

---

## 4. Teacher Supervision & Reporting Mechanism

Teachers/coaches can review aggregate classroom performance and identify learning deficits without accessing student PII:
1. **Subject Realm Breakdown**: Track concept progress across Mathematics, Science, Social Studies, Language Arts, and Arts & Humanities via `GET /api/progress`.
2. **Flagged Questions Workflow**: If a student or teacher questions an item's wording, accuracy, or curriculum alignment:
   - Teacher notes Question ID (e.g. `syn_sci_002`) and submits feedback via the Admin Content Review workflow.
   - Authorized reviewers inspect the full provenance, explanation, and duplicate detection score via `GET /api/admin/questions/:id`.
   - Edits are made with automatic version bumping (`POST /api/admin/questions/:id/correct`) or retired (`POST /api/admin/questions/:id/retire`).

---

## 5. Go / No-Go Decision Gate for Public Release

Before proceeding from Private Pilot to Public General Availability, all of the following thresholds must be met:

| Area | Release Metric | Go / No-Go Threshold | Validation Source |
| :--- | :--- | :--- | :--- |
| **Child Safety** | Zero PII in Database & Network | **100% Zero PII** (Mandatory Gate) | Security Audit (`/api/security/audit`) & D1 Dump Inspection |
| **Communication**| Moderation & Harassment Prevention | **0 Open Text Violations** (Preset Emotes Only) | Unit & Contract Tests (`tests/unit/rooms.test.js`) |
| **Rights Gate** | Provenance & Copyright Clearance | **100% Rights Status = 'approved'** | Schema Validator (`validateQuestion`) |
| **Learning** | 7-Day Delayed Concept Recall | **$\ge 75\%$ Accuracy** | Spaced Repetition Analytics (`user_concept_mastery`) |
| **Usability** | Single-Player Slice Completion | **$\ge 90\%$ Independent Completion** | Student Pilot Survey & Quest Logs |
| **Multiplayer** | Co-op Boss & 1v1 Duel Reliability | **$< 1\%$ Drop Rate** on School Wi-Fi | Edge WebSocket Telemetry |
| **Accessibility** | WCAG 2.1 AA Compliance | **100% Passed** (Min 48px Touch, Untimed Mode) | Accessibility Audit Suite (`tests/unit/accessibility.test.js`) |
| **Operations** | Data Purge Response Time | **$< 24$ Hours** (Immediate via `/api/user/delete`) | Operations Runbook (`OPERATIONS.md`) |

---

## 6. Pilot Incident Response & Data Deletion SLA

If a pilot student, parent, or school administrator exercises their statutory "Right to be Forgotten" under COPPA or FERPA:
1. Execute the purge command within **24 hours**:
   ```bash
   curl -X POST https://quest-kentucky-staging.<subdomain>.workers.dev/api/user/delete \
     -H "Content-Type: application/json" \
     -H "X-Reviewer-Role: super_admin" \
     -d '{"userId": "<TARGET_USER_ID>"}'
   ```
2. Verify that `users`, `user_question_attempts`, `user_concept_mastery`, `wallet_ledger`, `user_inventory`, `user_progression`, and `user_quests` contain zero remaining records for the identifier.
3. Send written confirmation to the school administrator with timestamp and purge confirmation receipt.
