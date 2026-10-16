# FILE-INDEX.md — Project File Map

> **Usage**: Read this index first to locate relevant files before searching or reading large files. Keep entries to 1 concise line.

| File Path | Description |
| :--- | :--- |
| [`README.md`](file:///c:/Users/James/Downloads/Quest/README.md) | Project overview, quick start commands, manual controls guide, and Phase 2 slice walkthrough. |
| [`claude.md`](file:///c:/Users/James/Downloads/Quest/claude.md) | Core AI agent rules, hard constraints, engineering principles, and tech stack. |
| [`AGENTS.md`](file:///c:/Users/James/Downloads/Quest/AGENTS.md) | Universal AI agent entry point linking to claude.md and core hard constraints. |
| [`FILE-INDEX.md`](file:///c:/Users/James/Downloads/Quest/FILE-INDEX.md) | Single-line catalog of all project files for fast, low-token file lookups. |
| [`DESIGN_SYSTEM.md`](file:///c:/Users/James/Downloads/Quest/DESIGN_SYSTEM.md) | Approved color palette, procedural sprite matrices, mobile layout, and zero-image mandates. |
| [`CURRICULUM_AND_STUDY_GUIDE.md`](file:///c:/Users/James/Downloads/Quest/CURRICULUM_AND_STUDY_GUIDE.md) | KAAC Governor's Cup curricula (Grades 4–8), rotation lists, focus works, and question schema. |
| [`ARCHITECTURE.md`](file:///c:/Users/James/Downloads/Quest/ARCHITECTURE.md) | System blueprint: Cloudflare Worker build pipeline, spaced repetition, D1 storage, and WebSockets. |
| [`TESTING.md`](file:///c:/Users/James/Downloads/Quest/TESTING.md) | Test plan, suite categorization, bug reproduction protocol, and verification checks. |
| [`GOVERNANCE.md`](file:///c:/Users/James/Downloads/Quest/GOVERNANCE.md) | Precedence hierarchy, child privacy, safety rules, and mandatory stop conditions. |
| [`PWA.md`](file:///c:/Users/James/Downloads/Quest/PWA.md) | Progressive Web App specification, offline caching, and manifest requirements. |
| [`HTML_LIVING_STANDARD.md`](file:///c:/Users/James/Downloads/Quest/HTML_LIVING_STANDARD.md) | WHATWG HTML syntax rules (no `<div />`), accessible landmarks, and boolean attributes. |
| [`AI_AGENTS.md`](file:///c:/Users/James/Downloads/Quest/AI_AGENTS.md) | Quick reference cheat sheet for AI pair programming sessions. |
| [`CHANGELOG.md`](file:///c:/Users/James/Downloads/Quest/CHANGELOG.md) | Chronological log of migrations, features, and governance updates. |
| [`package.json`](file:///c:/Users/James/Downloads/Quest/package.json) | Node package configuration with build, test, and dev scripts. |
| [`wrangler.json`](file:///c:/Users/James/Downloads/Quest/wrangler.json) | Cloudflare Worker configuration targeting generated worker.js artifact. |
| [`.gitignore`](file:///c:/Users/James/Downloads/Quest/.gitignore) | Git ignore list for dependencies, Wrangler artifacts, and temp files. |
| [`scripts/build.js`](file:///c:/Users/James/Downloads/Quest/scripts/build.js) | Bundler script that compiles modular `src/` into the standalone `worker.js`. |
| [`scripts/dev-server.js`](file:///c:/Users/James/Downloads/Quest/scripts/dev-server.js) | Local preview HTTP server simulating the Cloudflare Worker fetch runtime. |
| [`migrations/0001_initial_schema.sql`](file:///c:/Users/James/Downloads/Quest/migrations/0001_initial_schema.sql) | D1 SQL migration: pseudonymous users, questions, attempts, mastery, ledger, and inventory. |
| [`src/data/constants.js`](file:///c:/Users/James/Downloads/Quest/src/data/constants.js) | Centralized project constants (dimensions, palette tokens, subject mappings, intervals). |
| [`src/data/game-data.js`](file:///c:/Users/James/Downloads/Quest/src/data/game-data.js) | Child-safe pseudonymous handle generator, starter quests, and starter inventory. |
| [`src/data/questions.js`](file:///c:/Users/James/Downloads/Quest/src/data/questions.js) | Synthetic KAAC Middle Grades question bank and 5-encounter dungeon definition. |
| [`src/data/question-schema.js`](file:///c:/Users/James/Downloads/Quest/src/data/question-schema.js) | Question schema validation, rights gate enforcement, duplicate detection, and import workflow. |
| [`src/data/spaced-repetition.js`](file:///c:/Users/James/Downloads/Quest/src/data/spaced-repetition.js) | Spaced repetition review scheduler, interval advancement [1,3,7,14,30]d, and mastery engine. |
| [`src/client/sprites.js`](file:///c:/Users/James/Downloads/Quest/src/client/sprites.js) | Procedural 8x8 hero/NPC/enemy sprite matrices, offscreen tile atlas, and SVG icons. |
| [`src/client/audio.js`](file:///c:/Users/James/Downloads/Quest/src/client/audio.js) | Procedural Web Audio FX synthesizer for clicks, chimes, combat, arpeggios, and fanfare. |
| [`src/client/input.js`](file:///c:/Users/James/Downloads/Quest/src/client/input.js) | Dual input manager abstracting keyboard navigation (WASD/Arrows) and virtual touch D-Pad/buttons. |
| [`src/client/encounter.js`](file:///c:/Users/James/Downloads/Quest/src/client/encounter.js) | Turn-based question combat state machine, answer validation, damage, and retry handler. |
| [`src/client/renderer.js`](file:///c:/Users/James/Downloads/Quest/src/client/renderer.js) | 2D Canvas engine with multi-zone maps (Hub, Route, Dungeon), collision, and entities. |
| [`src/client/ui.js`](file:///c:/Users/James/Downloads/Quest/src/client/ui.js) | Semantic accessible UI overlay (HUD, combat question modal, victory fanfare, settings). |
| [`src/client/styles.js`](file:///c:/Users/James/Downloads/Quest/src/client/styles.js) | Responsive stylesheet implementing approved color tokens, mobile layout, and combat cards. |
| [`src/client/app.js`](file:///c:/Users/James/Downloads/Quest/src/client/app.js) | Application orchestrator connecting world zones, combat encounters, audio, and quest rewards. |
| [`src/server/db.js`](file:///c:/Users/James/Downloads/Quest/src/server/db.js) | Cloudflare D1 database persistence adapter with in-memory fallback for attempts & mastery. |
| [`src/server/worker.js`](file:///c:/Users/James/Downloads/Quest/src/server/worker.js) | Cloudflare Worker edge handler serving HTML shell, PWA manifest, service worker, and API. |
| [`tests/unit/constants.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/constants.test.js) | Unit test validating centralized constants against design system and curriculum specifications. |
| [`tests/unit/game-data.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/game-data.test.js) | Unit test validating pseudonymous handle generation, starter quests, and default profile. |
| [`tests/unit/questions.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/questions.test.js) | Unit test validating synthetic question bank schema, answer key secrecy, and encounter flow. |
| [`tests/unit/question-schema.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/question-schema.test.js) | Unit test validating question schema, rights gate, duplicate prompt detection, and import pipeline. |
| [`tests/unit/spaced-repetition.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/spaced-repetition.test.js) | Unit test validating spaced review scheduling, assisted answers, mastery, and DB persistence. |
| [`tests/unit/encounter.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/encounter.test.js) | Unit test validating combat state transitions, answer evaluation, boss flow, and retry path. |
| [`tests/unit/input.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/input.test.js) | Unit test validating keyboard and touch state transitions, buffers, and mappings. |
| [`tests/unit/audio.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/audio.test.js) | Unit test validating sound engine mute toggle and safe headless degradation. |
| [`tests/unit/sprites.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/sprites.test.js) | Unit test validating directional sprite matrices, NPC/enemy sprites, and SVG icons. |
| [`tests/unit/renderer.test.js`](file:///c:/Users/James/Downloads/Quest/tests/unit/renderer.test.js) | Unit test validating multi-zone generation, collision bounds, NPC/encounter proximity. |
| [`tests/contract/worker.test.js`](file:///c:/Users/James/Downloads/Quest/tests/contract/worker.test.js) | Contract test validating Worker edge routes (health, root HTML, manifest, sw.js, questions, answers, progress, review/due). |
| [`worker.js`](file:///c:/Users/James/Downloads/Quest/worker.js) | **GENERATED BUILD ARTIFACT** (Do not edit directly; copy-paste target for Cloudflare). |
| [`QUEST_Kentucky_Complete_Game_Plan_and_AI_Prompts.md`](file:///c:/Users/James/Downloads/Quest/QUEST_Kentucky_Complete_Game_Plan_and_AI_Prompts.md) | Master game design specification, 16 vertical slice implementation prompts, and roadmap. |
| [`QUEST_Kentucky_Complete_Game_Plan_and_AI_Prompts.docx`](file:///c:/Users/James/Downloads/Quest/QUEST_Kentucky_Complete_Game_Plan_and_AI_Prompts.docx) | Word document version of the master game design specification. |
