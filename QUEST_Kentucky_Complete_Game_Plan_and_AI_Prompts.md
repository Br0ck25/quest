# QUEST: Kentucky — Complete Game Plan, Technical Specification, Roadmap & AI Prompts

**Version 1.0 · October 16, 2026**

Planning baseline for a multiplayer browser RPG that helps Kentucky students in grades 6–8 prepare for academic competition. Verify current KAAC materials/rules, legal permissions, repository state, and Cloudflare compatibility before implementation.

## How to use this document

Run Prompt 0 first and review its read-only audit. Then run one prompt at a time. Do not paste all prompts at once. The agent must preserve existing work and report actual test evidence.

## 1. Product vision and non-negotiables

QUEST: Kentucky is a responsive, 2D browser RPG for grades 6–8 that makes Governor’s Cup preparation feel like an adventure. Players explore a fantasy world, solve subject-based encounters, collect cosmetics and companions, and play cooperative dungeons or knowledge duels. A spaced-review engine brings back concepts over time to improve long-term retention.

Non-negotiables:
- Learning and delayed recall matter more than speed or grinding.
- Wrong answers produce helpful explanations and future practice, not humiliation.
- Multiplayer is part of the MVP: private 2–4 player co-op and private 1v1 duels.
- The server is authoritative for answer checking, room state, scoring, inventory, and rewards.
- Must work on desktop browsers, phones, tablets, and school Chromebooks.
- No open text/voice chat, pay-to-win, paid random loot, ads, or public matchmaking in MVP.
- Every question and asset must have provenance and approved usage rights.
- Keep personal data minimal; use pseudonymous display names.
- Build in tested vertical slices; do not generate a giant untested code dump.

## 2. Audience and player experience

Primary audience: students in grades 6–8 preparing for academic competition. Secondary audience: teachers, coaches, parents, and school groups.

Session goals:
- A 5–10 minute session should feel worthwhile.
- A longer session can include a dungeon, boss, and due reviews.
- Solo practice must remain useful; multiplayer should add teamwork, not block progress.
- First session: create a simple avatar, learn movement, finish a guaranteed starter quest, and unlock a companion.

Modes:
- Adventure: explore hub and quests.
- Co-op Expedition: 2–4 players complete a question-driven dungeon.
- Knowledge Duel: 1v1 balanced question match.
- Practice: focus on subject, topic, or due reviews.
- Teacher/classroom mode is a later phase, but data design should not prevent it.

## 3. World, subjects, quests, and art direction

Create five original fantasy regions corresponding to common Governor’s Cup subject areas. These are fictional game regions, not official KAAC names; verify the current official competition structure before labeling content.

- Verdant Wilds — Science: ecosystems, experiments, cause/effect puzzles. Example boss: Overgrown Guardian.
- Cipher Caverns — Mathematics: number locks, geometry routes, calculation challenges. Example boss: Number Golem.
- Kingdoms of Time — Social Studies: maps, historical mysteries, civilizations. Example boss: Chrono Warden.
- Whispering Archives — Language Arts: passage interpretation, vocabulary, grammar repairs. Example boss: Wordweaver.
- Gallery of Wonders — Arts & Humanities: art, music, mythology, architecture, cultural works. Example boss: Living Masterpiece.

World layout:
- Hub village with avatar, quest board, inventory, training area, party room creation, and subject portals.
- Short overworld route with interactable objects and safe tutorial.
- One compact dungeon containing 3–5 encounters, an optional treasure challenge, and a boss.
- A world map that previews locked regions without requiring a huge seamless world.
- Quests, enemy definitions, loot, dialogue, region metadata, and question sets are data-driven.

Quest types:
- Combat encounter: answer to attack, defend, heal, or charge an ability.
- Puzzle: answer questions to unlock a mechanism.
- Discovery: explore a landmark and answer a related question.
- Rescue/repair: restore an object or help an NPC by completing a challenge.
- Review quest: revisit concepts due for spaced practice.

Art direction: original 2D pixel-art or clean illustrated fantasy, consistent silhouettes, readable effects, responsive scaling. Use licensed or original assets only; do not imitate protected characters or distinctive commercial-game assets. Use placeholders during mechanics development.

## 4. Core gameplay and combat rules

Use a fixed logical tile/grid system for predictable collision and map authoring. Desktop controls: WASD/arrows, Enter/Space to interact, Escape for menu. Touch controls: on-screen directional pad plus interaction button. Menus and question UI must also support keyboard-only navigation.

MVP combat is turn-based question combat, not twitch-based real-time combat. This improves fairness across devices and network conditions.
1. Server chooses an eligible question using subject, topic, grade band, difficulty, rights/review status, prior exposure, and session rules.
2. Client displays prompt and choices but never receives the answer key before reveal.
3. Correct answer triggers an encounter effect.
4. Incorrect answer locks the attempt, then reveals the explanation at the appropriate moment.
5. An unanswered timeout is tracked separately from an incorrect response.
6. Co-op gives each player turns/contributions so one fast player cannot dominate.
7. Boss completion triggers server-calculated rewards and a recap.
8. Defeat means retry and learning recap; never delete progress or punish a missed day.

Fairness:
- Accuracy is primary. Any speed bonus is small and capped.
- Duel players answer independently; use comparable questions and shuffled choice order.
- Do not reveal the answer to one duelist while the other is still answering the same question.
- Provide untimed practice; timed competition is an optional mode.
- Initial tuning targets: party size 2–4; co-op dungeon 8–12 questions; duel 10 questions; configurable 20–30 second timed response window; starter enemy 3 successful team actions; boss 8–12 successful actions. These are playtest defaults, not final balance.

## 5. Progression and rewards

Progression tracks:
- Adventurer XP and levels for completing quests and participating.
- Mastery achievements based on spaced successful recall, not one lucky answer.
- Mostly cosmetic equipment and outfits in MVP.
- One starter companion whose cosmetic evolution reflects learning milestones.
- Exploration collectibles, lore, and map completion.

Economy rules:
- Coins awarded for quest completion and participation; correctness can add a small capped bonus.
- Repeating easy questions cannot generate unlimited rewards at the same rate as useful learning.
- Server-side reward calculation and an auditable wallet ledger.
- Idempotency keys and database constraints prevent duplicate rewards from retries.
- No trading, marketplace, paid items, ads, loot boxes, or pay-to-win stats in MVP.
- Reward learning without punishing absence. No streak-loss mechanic.

## 6. Learning engine and spaced repetition

Question-level history and concept-level mastery are separate. A student who memorizes one question has not necessarily mastered the underlying concept.

Each question should include: stable ID, subject, concept IDs, grade band, prompt, choice IDs/text, answer key, explanation, difficulty, source and rights metadata, reviewer status, version, and active/retired status. Associate alternate questions that test the same concept.

Suggested initial scheduler defaults after successful recall: 1, 3, 7, 14, and 30 days. Treat these as configurable hypotheses to evaluate, not scientifically guaranteed optimal intervals.
- Incorrect: show explanation and schedule a new/related question soon; shorten/reset the interval.
- Correct after seeing an explanation: mark assisted; do not count as full mastery.
- Correct on a later due review: advance to the next interval.
- Correct across separated days on varied questions: increase mastery confidence.
- Repeated error after a long gap: return to a shorter interval.
- Reported/ambiguous question: suspend it from active rotation pending review.

Track delayed accuracy at 1, 7, and 30 days, transfer to different questions testing the same concept, common misconceptions, voluntary return, and completion. Time-on-site alone is not proof of learning.

## 7. Multiplayer specification

MVP modes:
- Private-code co-op dungeon, 2–4 players.
- Private-code 1v1 knowledge duel.
- Solo practice that uses secure server APIs for persistent progress.

Room lifecycle:
1. Create a room with an unpredictable code/token, expiry, and rate limits.
2. Join only if the room exists, is open, and has capacity.
3. Ready phase confirms connected players and settings.
4. Active phase uses a server-authoritative state machine and server clock.
5. Reconnect uses a short-lived resume token and restores authoritative state.
6. A configurable disconnect grace period decides whether a player can resume or is marked disconnected.
7. Completion writes results/rewards idempotently and closes the room after a retention window.
8. Expired rooms are cleaned up.

Message families:
- Client→server: room.join, room.leave, player.ready, answer.submit, player.action, state.request, ping.
- Server→client: room.snapshot, room.playerJoined, room.playerLeft, question.start, answer.result, encounter.update, match.completed, error.

Validate message schema, size, rate, membership, sequence, and legal state transition. Use server time. Handle duplicate messages, stale messages, reconnects, simultaneous actions, host disconnects, and late submissions. Never trust client-supplied correctness, XP, coins, damage, timers, or final score. No open chat or global matchmaking in MVP.

## 8. UX, accessibility, child safety, and privacy

Responsive UX:
- Large touch targets, readable text, stable layouts, portrait/landscape support where practical.
- Keyboard navigation and visible focus for all menus, questions, settings, inventory, and room flows.
- Semantic DOM overlays for critical UI; Canvas must not be the only way to access questions or navigation.
- Adjustable text size where practical, contrast, text/icon status in addition to color, reduced motion, mute, and optional untimed practice.
- Test representative phones, tablets, laptops, and school Chromebooks.

Child safety/privacy:
- Pseudonymous display names; do not request full name, precise location, phone, or personal social handle.
- No open text or voice chat in MVP; preset emotes only.
- Private room codes must expire and be rate-limited.
- Minimize analytics, document retention/deletion, and avoid third-party behavioral advertising.
- Before public release, obtain qualified review of applicable child privacy, school use, consent, account deletion, and data retention obligations.
- Provide a way to report incorrect/unsafe content and clear parent/teacher-facing privacy information.

## 9. Technical architecture

Recommended starting architecture, subject to repository and current Cloudflare compatibility checks:
- Client: HTML/CSS plus JavaScript or TypeScript modules; Canvas 2D for world rendering and semantic DOM for UI.
- API: Cloudflare Worker for auth, content delivery, answer validation, progress, inventory, and room setup.
- Persistent relational data: Cloudflare D1.
- Real-time sessions: Durable Objects plus WebSockets for authoritative room state.
- Assets: R2 for versioned game art/audio and approved content imports.
- KV only for suitable cache/configuration; not authoritative player progress.
- Build/deploy: repository CI and current Wrangler tooling, verified from the actual project.

Architecture boundaries:
- Shared schemas/types define API and WebSocket contracts.
- Client state is a view of authoritative server state for multiplayer/rewards.
- Rendering must not contain answer keys, rights decisions, or reward authority.
- Content is versioned separately from code.
- Ordered migrations are committed and tested against disposable test databases.
- Secrets are environment bindings, never source-controlled.
- Start as a modular monolith; do not split into microservices without evidence of need.

## 10. Data model and API outline

Core entities (adapt after audit):
- users: id, pseudonymous display name, auth identity, created_at, status.
- concepts: id, subject, topic, description, curriculum references.
- questions: id, subject, concept IDs, grade band, prompt, choices, answer key, explanation, difficulty, status, version.
- question_sources: title, URL/reference, year, owner, terms/permission status, permission evidence.
- question_source_links: question ID, source ID, page/reference.
- user_question_attempts: user, question, concept, outcome, assisted flag, timestamp, session.
- user_concept_mastery: user, concept, interval, due_at, confidence, last result.
- inventory catalog and user_inventory.
- wallet_ledger: user, amount delta, reason, idempotency key, timestamp.
- rooms, matches, match_participants with expiry/state/result.
- Optional admin roles and content review history.

Proposed API groups (names can change if documented):
- Auth: guest/session/logout; exact design determined after security review.
- Profile: GET /api/me, PATCH /api/me/display-name, DELETE /api/me where supported by policy.
- Content: GET /api/regions, GET /api/quests, GET /api/practice/session.
- Answers: POST /api/answers; validates active session, choice ID, state, and idempotency.
- Progress: GET /api/progress, GET /api/review/due, POST /api/review/complete.
- Inventory: GET /api/inventory; claims only when server verifies eligibility.
- Rooms: POST /api/rooms, POST /api/rooms/join, POST /api/rooms/leave; live events over WebSockets.
- Admin content routes require server-side roles and must not expose unrevealed answer keys.
These are proposed contracts, not assumptions about existing files or deployment resources.

## 11. Question sourcing, legal rights, and quality workflow

Publicly accessible does not mean public domain or free to redistribute. Every imported item needs source, acquisition details, owner, year, terms reviewed, intended-use permission, and reviewer status. Use exact historical competition questions only when terms allow the planned online gameplay or written permission is obtained.

Import workflow:
1. Locate candidate source and record URL/file, year, subject, owner, and acquisition date.
2. Review terms/permission for the exact intended use: storing, adapting, and serving in a game.
3. Extract only when permitted; keep the original source reference.
4. Normalize prompt, choices, answer, explanation, concepts, grade band, difficulty, and provenance.
5. Flag OCR uncertainty, missing explanations, ambiguity, and potentially outdated facts.
6. Detect exact/near duplicates as a review aid, not a legal decision.
7. Independently verify answer key and explanation.
8. Human reviewer approves and publishes a versioned set; provide correction/takedown path.

AI may draft original questions based on curriculum objectives, but must not closely paraphrase copyrighted test items. A qualified reviewer verifies factual accuracy, age appropriateness, answer, explanation, and uniqueness. Questions with unknown rights status cannot enter production.

## 12. MVP and build roadmap

Phase 0 — Read-only repository/environment audit; document existing work, current commands, risks, and unknowns.
Phase 1 — Responsive shell, Canvas renderer, semantic UI, input, settings, placeholder world.
Phase 2 — Single-player vertical slice: hub, route, 3–5 encounter dungeon, boss, quest completion, synthetic test questions.
Phase 3 — Question schema, rights gate, import/validation workflow, secure answer delivery.
Phase 4 — D1/API persistence, attempt history, review scheduler, concept mastery.
Phase 5 — XP, levels, inventory, companion, reward ledger and anti-farming controls.
Phase 6 — Multiplayer co-op: room codes, WebSockets, authoritative state, reconnect, boss, rewards.
Phase 7 — 1v1 duels, balanced scoring, answer reveal policy.
Phase 8 — Accessibility, responsiveness, performance, audio/art polish.
Phase 9 — Admin content review workflow and verified original/authorized question set.
Phase 10 — Security/privacy review, automated tests, pilot, staging deployment, operations documentation.
Phase 11 — Expand regions, quests, question coverage, and teacher features based on evidence.

MVP exit: first quest is independently playable; 2–4 players can complete a private co-op dungeon; two players can finish a fair duel; due concepts reappear; progress survives reload; works on target devices; no answer key/reward forgery; every production question has approved rights, verified answers, and explanations.

## 13. Testing and definition of done

Required test layers:
- Unit: scheduler, scoring, reward ledger, validation, room transitions.
- Integration: API/database, auth/permissions, migrations, question delivery and answer submission.
- Multiplayer: joins/leaves, simultaneous answers, reconnect, duplicate/late messages, timeout, host disconnect.
- End-to-end: onboarding, quest, wrong-answer explanation, later review, saved progress, co-op, duel.
- Device: small phone, large phone, tablet, laptop, Chromebook viewport, keyboard-only.
- Security: answer-key leakage, IDOR, room-code guessing, rate limiting, reward forgery, session expiry.

Definition of done for each phase:
- Relevant automated tests pass; new behavior has tests.
- Existing tests and unrelated features remain intact.
- No secrets, student personal data, or unapproved copyrighted content are committed.
- Manual test instructions are documented.
- Local reproducible test or preview deployment is verified.
- Known limitations and rollback steps are documented.
- Do not claim a test/deployment passed unless actually run and inspected.

## 14. Deployment and operations

Environments:
- Local development with isolated test data.
- Preview/staging with separate database, bucket, and secrets from production.
- Production with migrations, monitoring, backup/restore, and rollback instructions.

Operational docs must explain setup, tests, migrations, content import/review, staging deploy, production deploy, rollback, backups, and incident response. Do not assume npm scripts or Cloudflare bindings exist; inspect the repository first. Use structured logs without answer keys, room secrets, or sensitive personal information.

Potential minimized analytics: quest_started/completed, question_presented/answered, explanation_viewed, review_due/completed, mastery_changed, room_created/joined/reconnected, match_completed, client_error, content_reported. Keep data minimal and aggregate where possible.

## 15. AI agent operating rules

- Read repository instructions, package manifests, tests, deployment configuration, and git status/diff before editing.
- Do not overwrite, revert, reformat, or delete work you did not create. Existing changes belong to the user/other agents.
- Begin with a read-only audit. Report files, commands, assumptions, risks, and unknowns.
- Never invent package scripts, binding names, IDs, secrets, deployment URLs, or test results.
- Make small vertical slices with tests; avoid broad rewrites.
- Keep modules focused; aim for under ~500 lines per module when practical, but do not split code pointlessly.
- Never commit secrets, production data, or unapproved content.
- Use original/licensed assets and track provenance.
- After each phase, report changed files, tests run/results, risks, and next step.
- If blocked by a genuinely essential decision, ask one concise question; otherwise choose a safe reversible default and document it.

## 16. Copy/paste AI implementation prompts

Use prompts in order, one at a time. Do not paste all prompts together. Review each result and its test evidence before proceeding. Never paste passwords or secrets into an AI prompt.

## PROMPT 0 — READ-ONLY REPOSITORY AUDIT

You are lead engineer for QUEST: Kentucky, a multiplayer browser-based 2D RPG for grades 6–8 that teaches concepts used in Kentucky Governor’s Cup preparation.

Perform a READ-ONLY audit. Do not edit, delete, reformat, generate, install dependencies, commit, or deploy anything.

Inspect repository instructions, git status and diff, package manifests, source tree, tests, build scripts, deployment config, Cloudflare bindings/migrations, assets, and current functionality. Preserve all user/other-agent changes.

Return: (1) what exists and works; (2) exact evidenced commands for local development/tests/build/deploy; (3) changes/files that must not be overwritten; (4) risks and missing foundations; (5) architecture mapped to the current repo; (6) phased plan with likely files, tests, and acceptance criteria; (7) licensing/privacy/security blockers. Mark unknowns clearly. Stop after the report.

## PROMPT 1 — SPECIFICATION AND ARCHITECTURE BASELINE

Using the approved master plan and audit, document the first vertical slice, module boundaries, shared types, database/migration strategy, local/staging/production environments, tests, and Cloudflare architecture. Do not build gameplay yet. Verify current dependencies/API use against repository evidence and official docs if web access is available. Do not invent bindings or credentials. Update only minimal relevant documentation. Preserve all work. Record decisions for rights-gated content, answer-key secrecy, authoritative multiplayer, pseudonymous profiles, no open chat, and no MVP monetization. Report files and tests.

## PROMPT 2 — RESPONSIVE GAME SHELL

Implement only the browser application shell: main menu, settings, avatar placeholder, region map placeholder, quest panel, inventory panel, Canvas renderer, keyboard/touch input abstraction, visible focus, audio mute, reduced-motion setting, and loading/error states. Use placeholder assets and synthetic data; no real KAAC questions. Keep renderer, UI, input, and data modules separate. No multiplayer or persistence yet. Test phone, tablet, laptop, and Chromebook viewports. Preserve unrelated changes. Report exact run/verification steps.

## PROMPT 3 — SINGLE-PLAYER VERTICAL SLICE

Implement one complete playable slice: starter village, short route, collision, interaction, one small dungeon with 3–5 encounters, basic enemy, boss, quest acceptance/completion, simple animation, sound toggle, win/retry path, and no soft locks. Use original placeholder assets or recorded licensed assets. Synthetic test questions only. Correct answers trigger encounter effects; wrong answers show feedback and an explanation. Do not build accounts, multiplayer, or persistent economy yet. Add state-transition tests and manual controls documentation. Do not claim playability unless run.

## PROMPT 4 — QUESTION SCHEMA AND RIGHTS GATE

Build question schema and staging/import validation. Required fields: stable ID, subject, concept IDs, grade band, prompt, choice IDs/text, answer key, explanation, difficulty, source/provenance, rights status, reviewer status, version, active status. Reject missing answer, invalid choices, duplicate IDs, missing provenance, or unapproved rights status. Add duplicate detection as a review aid, not legal judgment. Do not ingest or publish copyrighted PDFs unless intended use is permitted. Do not add real KAAC questions yet. Add human review and tests. Public question payloads must not expose answer keys.

## PROMPT 5 — SECURE API AND DATABASE

Implement persistent API/database using the approved architecture and ordered migrations. Add pseudonymous users/guest identity as decided, concepts, questions, sources, source links, attempts, mastery, inventory, wallet ledger, rooms/matches as needed. Implement server-side question selection and answer submission. The answer key stays server-side until reveal is permitted. Validate schemas, authorization, ownership, request size, rate limits, and idempotency. Use parameterized database access and safe errors. Do not invent production binding values. Test migrations, answer leakage, duplicate submissions, unauthorized access, and errors.

## PROMPT 6 — SPACED REPETITION

Implement deterministic, tested review scheduling with configurable initial intervals 1, 3, 7, 14, 30 days. These are starting hypotheses, not proven optimal values. Wrong answers shorten the interval. Correct answers after explanation are marked assisted and do not count as full mastery. Mastery requires correct responses across separated sessions/days and varied questions testing the same concept. Separate question attempts from concept mastery. Add due review selection and tests for date boundaries, repeated guesses, assisted answers, and delayed recall.

## PROMPT 7 — PROGRESSION AND REWARDS

Implement server-authoritative XP, levels, coins, cosmetic inventory, starter companion, quest completion rewards, and reward history. Keep adventure XP separate from concept mastery. Prevent easy-question farming; use idempotency keys and database constraints. Client never decides rewards. Test duplicate claims, concurrent requests, negative balances, invalid items, and persistence. No paid items, ads, loot boxes, trading, or pay-to-win. Keep economy constants in a documented config and add a balance simulation/report if practical.

## PROMPT 8 — MULTIPLAYER CO-OP

Implement private-code 2–4 player co-op with the approved Durable Object/WebSocket architecture (or documented decision). Add room create/join, ready state, authoritative encounter, question synchronization, co-op boss health, results, and server-issued rewards. Server controls membership, phase, timers, questions, answer validation, damage, completion, rewards. Validate all messages, rate-limit, expire rooms, avoid early answer-key exposure. Implement reconnect snapshots, disconnect grace period, host disconnect behavior, idempotent duplicate handling, stale message rejection, and cleanup. No open chat/public matchmaking. Test races, reconnect, simultaneous answers, malicious messages, and code guessing. Report local testing limitations honestly.

## PROMPT 9 — 1V1 KNOWLEDGE DUELS

Add private-code 1v1 duels. Players answer independently on comparable question sets; use same questions where practical and shuffle choice order per player. Reveal answers only after both answer or the round deadline. Accuracy is primary; speed is capped/tiebreaker. Provide a respectful post-match recap. Use server time, authoritative score, idempotent submissions, and reconnect support. Test ties, disconnects, late answers, duplicate messages, choice-order variation, and answer leakage. No global matchmaking or open chat.

## PROMPT 10 — ACCESSIBILITY AND DEVICE POLISH

Audit and improve keyboard/touch use across menus, inventory, questions, settings, rooms, and results. Use semantic DOM for critical UI; Canvas cannot be the only path. Ensure readable text, focus indicators, sufficient contrast, non-color-only feedback, adjustable text where practical, reduced motion, mute, and untimed practice. Test phone/tablet/laptop/Chromebook viewports and performance. Fix verified issues without unrelated rewrites. Add a manual matrix and tests for high-risk flows. Report limitations honestly.

## PROMPT 11 — ADMIN CONTENT REVIEW

Build a minimal secure content-review workflow. Authorized reviewers can inspect source/rights status, question, answer, explanation, tags, grade band, duplicate warnings, and review history; approve/reject/correct/retire/version items. Enforce roles server-side. Ordinary users cannot access admin routes or unrevealed answer keys. Do not scrape restricted content or publish unresolved rights. Start with small human-verified original/authorized question sets. Test roles, versioning, audit history, and retirement from active rotation.

## PROMPT 12 — SECURITY, PRIVACY, CHILD SAFETY

Review authentication, sessions, DB authorization, room codes, WebSockets, rate limits, answer-key secrecy, reward forgery, logs, analytics, dependencies, uploads, account deletion, retention, and secrets. Report verified issues and safe patches; do not make destructive changes without explaining. Fix high-risk issues with regression tests. Confirm MVP has no open text chat, ad tracking, unnecessary personal data, or public child profiles. Flag legal/privacy questions for qualified review; do not claim legal compliance based on code inspection alone.

## PROMPT 13 — TEST AND BALANCE RELEASE CANDIDATE

Run existing tests, type checks, lint, build, migrations, API, multiplayer, and end-to-end flows using actual repo scripts. Inspect package config first; never assume scripts. Test onboarding, quest, wrong-answer explanation, later review, saved progress, co-op, duel, reconnect, and mobile controls. Review pacing, readability, fairness, reward farming, performance, accessibility. Return exact results, failures, reproduction steps, and prioritized fixes. Do not report unrun tests as passed. Use no real student data.

## PROMPT 14 — STAGING DEPLOYMENT

Prepare staging only after checks pass. Verify actual Cloudflare configuration, bindings, migrations, environment separation, secrets, asset paths, WebSockets, and deployment commands from repo evidence. Never guess production IDs or deploy production without explicit approval. Document staging/local setup, migrations, seed data, logs, backup/restore, rollback, limitations. Run a staging smoke test and record revision and evidence. Use separate test resources/data.

## PROMPT 15 — PRIVATE PILOT AND RELEASE GATE

Create a private pilot checklist for a small, consented student/teacher group. Measure learning with 1/7/30-day delayed recall and alternate questions, usability, multiplayer reliability, content reports, privacy notices, deletion, and minimized analytics. Define go/no-go thresholds with the project owner before collecting data. Confirm every live question has verified answer/explanation/provenance/approved rights. No public launch until high-severity security, privacy, content, and reliability issues are resolved and qualified review addresses applicable obligations.

## PROMPT 16 — FINAL HANDOFF

Document architecture, folders, environment variable/binding names (never values), local setup, tests, migrations, content workflow, adding region/quest/enemy/item, question rights, multiplayer protocol, staging deployment, rollback, backup/restore, and known limits. List changes by phase, tests actually run, unresolved issues, and next work. Verify no accidental secrets, unapproved copyrighted content, generated artifacts, or unrelated changes. Do not add features or refactor unrelated code during handoff.

## 17. Launch checklist and unresolved decisions

Decisions recommended now:
- 2D Canvas world with semantic DOM UI.
- Workers API + D1 + Durable Objects/WebSockets + R2, with selective KV use, after compatibility checks.
- Private-code co-op for 2–4 and private 1v1 duels.
- No open chat, public matchmaking, monetization, trading, or paid random rewards in MVP.
- Server-side answer validation; no answer key before reveal.
- Configurable 1/3/7/14/30-day spaced review, evaluated with delayed recall.
- Rights-gated historical content; original human-reviewed questions fill gaps.

Resolve during audit/spec phase:
- Current repository/branch/prototype and existing uncommitted work.
- Guest-only first play versus optional accounts and account-upgrade flow.
- Cloudflare plan limits, environment names, and resource configuration.
- Final art style and asset sourcing workflow.
- Who is responsible for content accuracy and rights approval.
- Whether teacher dashboard is needed before or after pilot.

Go-live checklist:
- All live questions have approved rights, verified answers, explanations, and provenance.
- No known high-severity security issue; privacy review completed.
- Accessibility and target-device matrix passes.
- Reconnect, anti-cheat, and reward-idempotency tests pass.
- Migrations, backup/restore, and rollback tested.
- Monitoring, content correction/takedown, and support process exist.
- Pilot evidence indicates learning value and acceptable usability.

## Appendix A — Example question record

Illustrative original question; not a KAAC item. Keep answerKey server-side and omit it from client payloads until reveal.

{
  "id": "q_science_000001",
  "subject": "science",
  "conceptIds": ["ecosystems.food-webs"],
  "gradeBand": "6-8",
  "prompt": "Which statement best describes the role of decomposers in an ecosystem?",
  "choices": [
    {"id": "a", "text": "They return nutrients to the environment."},
    {"id": "b", "text": "They create sunlight."},
    {"id": "c", "text": "They stop energy from moving through food webs."},
    {"id": "d", "text": "They turn consumers into producers."}
  ],
  "answerKey": "a",
  "explanation": "Decomposers break down dead organisms and waste, returning nutrients to the environment.",
  "difficulty": 1,
  "source": {"type": "original", "reference": "project-authored", "rightsStatus": "approved"},
  "reviewStatus": "approved",
  "version": 1
}

## Appendix B — Example answer submission contract

POST /api/answers
{
  "sessionId": "opaque-session-id",
  "questionId": "q_science_000001",
  "selectedChoiceId": "a",
  "idempotencyKey": "unique-request-id"
}

Before reveal is permitted:
{"accepted": true, "status": "locked"}

After reveal is permitted:
{
  "accepted": true,
  "correct": true,
  "explanation": "Decomposers break down dead organisms and waste...",
  "conceptReviewScheduled": true
}

Exact response timing depends on solo/co-op/duel mode. The server enforces reveal policy.

## Appendix C — MVP success definition

- A new player can finish the first quest without developer help.
- 2–4 players can complete a private co-op dungeon reliably.
- Two players can finish a fair duel with no premature answer reveal.
- Missed concepts return later; assisted answers differ from delayed recall.
- Target phones and Chromebooks have readable questions and usable controls.
- Content pipeline blocks unapproved rights status and records provenance.
- Project can be built, tested, staged, rolled back, and maintained from documentation.
