# GOVERNANCE.md — Rule Hierarchy & Precedence

> **Project**: QUEST: Kentucky  
> **Authority**: This document defines the definitive hierarchy of rules for development, architectural design, and code maintenance. All AI agents, contributors, and automated tooling must strictly comply.

---

## 1. Governance Precedence Order

When requirements or preferences conflict, resolve them strictly in descending order of precedence:

```
┌────────────────────────────────────────────────────────┐
│ 1. Safety, Privacy & Child Protection (HIGHEST)        │
│    - COPPA / FERPA Compliance, Zero PII, Safe Chat     │
├────────────────────────────────────────────────────────┤
│ 2. PWA Compliance (PWA.md)                             │
│    - Offline resilience, service worker, installable   │
├────────────────────────────────────────────────────────┤
│ 3. HTML Living Standard (HTML_LIVING_STANDARD.md)      │
│    - Semantic WHATWG HTML, valid syntax, accessibility │
├────────────────────────────────────────────────────────┤
│ 4. Design System & Palette (DESIGN_SYSTEM.md)          │
│    - All-code graphics (0 images), mobile-first touch  │
├────────────────────────────────────────────────────────┤
│ 5. Technical Constraints & File Size Budget            │
│    - Single-file Cloudflare Worker (worker.js)         │
│    - Max 2,000 lines of code per individual file       │
├────────────────────────────────────────────────────────┤
│ 6. Svelte 5 & Component Modernization Rules            │
│    - Runes ($state, $derived, $props, $effect)         │
├────────────────────────────────────────────────────────┤
│ 7. Code Formatting & Style (LOWEST)                    │
└────────────────────────────────────────────────────────┘
```

---

## 2. Rule Explanations & Conflict Resolution

### Level 1: Safety, Child Privacy & Legal Protection
- **Zero Personally Identifiable Information (PII)**: No student names, email addresses, phone numbers, school IDs, or location coordinates may be requested or stored.
- **No Open Social Interaction**: No open text chat or voice chat. Players communicate exclusively through predetermined tactical emote pings (e.g., "Ready!", "Help with Math!", "Great job!").
- **Server-Authoritative Answer Security**: The client must NEVER receive an answer key or solution flag prior to submission.
- **Copyright & Content Rights**: All study questions must be either original creations aligned with the KAAC curriculum or items used with explicit written permission.

### Level 2: PWA Requirements ([`PWA.md`](file:///c:/Users/James/Downloads/Quest/PWA.md))
- Must run reliably in offline mode using service worker caching.
- Must remain installable on Android, iOS, Windows, and ChromeOS.
- Web app manifest and service worker configuration must never be broken by feature additions.

### Level 3: HTML Living Standard ([`HTML_LIVING_STANDARD.md`](file:///c:/Users/James/Downloads/Quest/HTML_LIVING_STANDARD.md))
- Compliant with WHATWG HTML Living Standard.
- Valid semantic HTML; no self-closing non-void elements (e.g., `<div />` is strictly forbidden).
- Accessibility attributes (`aria-*`, `role`, keyboard focus) take precedence over custom cosmetic hacks.

### Level 4: Design System ([`DESIGN_SYSTEM.md`](file:///c:/Users/James/Downloads/Quest/DESIGN_SYSTEM.md))
- **"All Code, No Actual Images"**: 0 raster image files allowed. All graphics must be procedural Canvas 2D or inline SVG.
- **Strict Color Tokens**: Only approved color tokens from `DESIGN_SYSTEM.md` may be used.
- **Mobile-First Layout**: Touch controls (D-Pad + Action buttons) must always be provided alongside keyboard controls. Minimum touch target is `48px × 48px`.

### Level 5: Technical Constraints & File Size Budget
- **Cloudflare Worker Target**: The application must bundle or compile into a self-contained `worker.js` script that can be copied and pasted directly into the Cloudflare Worker Quick Edit console.
- **Strict 2,000 Line Limit**: **No single file may exceed 2,000 lines of code**. If a file approaches 1,500 lines, it must be proactively modularized.

### Level 6: Svelte 5 & Architecture
- All new components must use Svelte 5 runes (`$state`, `$derived`, `$props`, `$effect`).
- Never introduce legacy Svelte 4 store patterns into new code.
- Store interoperability must be preserved where legacy stores exist.

---

## 3. Mandatory Stop Conditions

An AI agent or developer MUST STOP and request clarification before proceeding if:
1. A requested change would collect or expose personal data from a child.
2. A requested change requires adding raster image files (`.png`, `.jpg`, `.webp`) instead of procedural code graphics.
3. A file would exceed the 2,000 line code limit.
4. An answer key would be exposed to the client before submission.
5. The deployment workflow cannot be contained within the copy-pasteable `worker.js` specification.
6. A change violates PWA installability or offline operation.
