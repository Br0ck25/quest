# AGENTS.md — Universal AI Agent Entry Point

> **Attention All AI Agents & Assistants**:
> This repository operates under strict governance and technical constraints. Before taking any action or writing any code, you **MUST** read and adhere to:
>
> 1. **[`claude.md`](file:///c:/Users/James/Downloads/Quest/claude.md)**: Non-negotiable operating rules, hard constraints, and core engineering principles.
> 2. **[`FILE-INDEX.md`](file:///c:/Users/James/Downloads/Quest/FILE-INDEX.md)**: Single-line project catalog for low-token file lookups.
> 3. **[`GOVERNANCE.md`](file:///c:/Users/James/Downloads/Quest/GOVERNANCE.md)**: Precedence hierarchy and mandatory stop conditions.

---

## Non-Negotiable Quick Summary

1. **Max 2,000 Lines**: No file may ever exceed 2,000 lines of code.
2. **`worker.js` is a Generated Artifact**: **NEVER edit `worker.js` directly**. Edit source files in `src/`, then compile via `npm run build`.
3. **All Code, No Actual Images**: 0 external raster images (`.png`, `.jpg`, `.webp`). Visuals are 100% procedural Canvas 2D or inline SVG.
4. **Procedural Web Audio FX**: 0 audio files. Sound effects are synthesized via the browser's Web Audio API (`AudioContext`).
5. **Mobile-First**: Touch D-Pad and action buttons (minimum `48px × 48px`), alongside keyboard navigation.
6. **Child Privacy**: Zero PII, preset emotes only, no open text/voice chat.
7. **Reuse Existing Code First**: Always search the codebase and reuse existing helpers/constants before writing new code.
8. **Testing Integrity**: Tests check why, not just what. Never skip or loosen a test to get green. For bugs, write the reproduction test first.
