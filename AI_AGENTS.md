# AI_AGENTS.md — Quick Reference Guide for AI Agents

> **Read this file first** before planning, modifying, or creating any code in QUEST: Kentucky.

---

## 1. Quick Checklist for Any Task

| Check | Requirement | Reference Document |
| :--- | :--- | :--- |
| **Max 2,000 Lines** | No file may exceed 2,000 lines of code. | [`claude.md`](file:///c:/Users/James/Downloads/Quest/claude.md) |
| **Zero Image Files** | All visuals must be code (Canvas 2D / inline SVG / CSS). | [`DESIGN_SYSTEM.md`](file:///c:/Users/James/Downloads/Quest/DESIGN_SYSTEM.md) |
| **Mobile First** | Touch D-Pad, touch buttons (≥48px), responsive layouts. | [`DESIGN_SYSTEM.md`](file:///c:/Users/James/Downloads/Quest/DESIGN_SYSTEM.md) |
| **Cloudflare Worker** | Architecture must compile to or support a copy-pasteable `worker.js`. | [`ARCHITECTURE.md`](file:///c:/Users/James/Downloads/Quest/ARCHITECTURE.md) |
| **Child Safety** | Zero PII, no open text/voice chat, preset emotes only. | [`GOVERNANCE.md`](file:///c:/Users/James/Downloads/Quest/GOVERNANCE.md) |
| **KAAC Content** | Study content strictly aligns with Governor's Cup curricula. | [`CURRICULUM_AND_STUDY_GUIDE.md`](file:///c:/Users/James/Downloads/Quest/CURRICULUM_AND_STUDY_GUIDE.md) |
| **PWA & Offline** | Offline-capable, service worker, valid manifest. | [`PWA.md`](file:///c:/Users/James/Downloads/Quest/PWA.md) |
| **Valid HTML** | WHATWG standard, no `<div />` self-closing non-void tags. | [`HTML_LIVING_STANDARD.md`](file:///c:/Users/James/Downloads/Quest/HTML_LIVING_STANDARD.md) |

---

## 2. Common Scenarios & How to Handle Them

### Scenario A: Adding a New Visual Asset (Enemy, NPC, Tile, Item)
- ❌ **Wrong**: Add an image import `import sword from './sword.png'` or reference an external CDN image.
- ✅ **Correct**: Define a pixel sprite matrix or write a Canvas 2D drawing function in `src/graphics/sprites.js` using approved palette colors from `DESIGN_SYSTEM.md`.

### Scenario B: Adding a New Question or Subject Encounter
- ❌ **Wrong**: Hardcode answers in client JavaScript or reveal correct answer flags in client payloads.
- ✅ **Correct**: Add the question to the server-side question registry with stable ID, subject, grade band, prompt, choices, answerKey (server only), explanation, and KAAC curriculum tag.

### Scenario C: Designing a UI Screen
- ❌ **Wrong**: Assume mouse/keyboard desktop width with tiny 24px buttons.
- ✅ **Correct**: Start at 360px viewport. Ensure large touch targets (minimum 48px), high contrast text (>4.5:1), and dual input support (touch D-pad + keyboard arrows).

### Scenario D: File Approaching 1,500 Lines
- ❌ **Wrong**: Keep piling code into the file until it hits or exceeds 2,000 lines.
- ✅ **Correct**: Proactively split into cohesive sub-modules (e.g., separate sprite definitions from canvas rendering loop, or question bank from answer validation).

---

## 3. Mandatory Stop Conditions
STOP and ask the user before proceeding if:
1. The user asks to collect student names, school names, emails, or personal data.
2. The user asks for open text messaging between players.
3. The solution requires external image assets.
4. The requested change would break single-file `worker.js` copy-pasteability.
5. The change requires violating PWA offline functionality.
