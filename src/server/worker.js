import { PALETTE, SUBJECTS, VIEWPORT } from '../data/constants.js';
import { STARTER_QUESTS } from '../data/game-data.js';
import { SYNTHETIC_QUESTIONS, DUNGEON_ENCOUNTERS, sanitizeQuestionForClient } from '../data/questions.js';
import { validateQuestion, detectDuplicates, importQuestions } from '../data/question-schema.js';
import { computeSubjectProgress, getDueReviews } from '../data/spaced-repetition.js';
import { COSMETIC_CATALOG, STARTER_COMPANION } from '../data/progression.js';
import { DatabaseAdapter } from './db.js';
import { GAME_CSS } from '../client/styles.js';

// In-memory catalog, database adapter, and idempotency store for Cloudflare edge worker
const QUESTION_CATALOG = [...SYNTHETIC_QUESTIONS];
const IDEMPOTENCY_STORE = new Map();
const defaultDb = new DatabaseAdapter();

export function createManifest() {
  const svgIcon192 = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192" width="192" height="192"><rect width="192" height="192" rx="36" fill="${PALETTE.BG_DARK}"/><polygon points="96 28 156 64 156 128 96 164 36 128 36 64" fill="${PALETTE.SURFACE}" stroke="${PALETTE.BORDER_FOCUS}" stroke-width="8"/><circle cx="96" cy="96" r="32" fill="${PALETTE.MATH}"/><polygon points="96 74 114 108 78 108" fill="${PALETTE.GOLD}"/></svg>`;

  const svgIcon512 = `data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512"><rect width="512" height="512" rx="96" fill="${PALETTE.BG_DARK}"/><polygon points="256 74 416 170 416 342 256 438 96 342 96 170" fill="${PALETTE.SURFACE}" stroke="${PALETTE.BORDER_FOCUS}" stroke-width="20"/><circle cx="256" cy="256" r="86" fill="${PALETTE.MATH}"/><polygon points="256 196 304 290 208 290" fill="${PALETTE.GOLD}"/></svg>`;

  return {
    name: "QUEST: Kentucky — Governor's Cup RPG",
    short_name: "QUEST: KY",
    description: "Browser RPG for grades 6-8 preparing for Kentucky Governor's Cup competition",
    start_url: "/",
    display: "standalone",
    orientation: "any",
    theme_color: PALETTE.BG_DARK,
    background_color: PALETTE.BG_DARK,
    icons: [
      {
        src: svgIcon192,
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
      {
        src: svgIcon512,
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "any maskable",
      },
    ],
  };
}

export function createServiceWorker() {
  return `// Service Worker — Offline Shell & Asset Cache
const CACHE_NAME = 'quest-ky-shell-v1';
const SHELL_URLS = ['/', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Stale-While-Revalidate for app shell
  if (url.pathname === '/' || url.pathname === '/manifest.webmanifest') {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
          }
          return networkResponse;
        }).catch(() => cachedResponse);
        return cachedResponse || fetchPromise;
      })
    );
  }
});
`;
}

export function createHtmlShell(clientJsBundle = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="${PALETTE.BG_DARK}">
  <meta name="description" content="QUEST: Kentucky — Governor's Cup Middle Grades RPG">
  <link rel="manifest" href="/manifest.webmanifest">
  <title>QUEST: Kentucky — Governor's Cup RPG</title>
  <style>
${GAME_CSS}
  </style>
</head>
<body>
  <main id="app-root">
    <div id="ui-root"></div>
    <div role="region" aria-label="Kentucky World Viewport" class="canvas-container">
      <canvas id="game-canvas" width="${VIEWPORT.LOGICAL_WIDTH}" height="${VIEWPORT.LOGICAL_HEIGHT}"></canvas>
    </div>
  </main>

  <script type="module">
${clientJsBundle}

    // Register Service Worker for PWA offline operation
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(() => {});
      });
    }

    // Launch Application
    window.addEventListener('DOMContentLoaded', () => {
      const canvas = document.getElementById('game-canvas');
      const uiRoot = document.getElementById('ui-root');
      if (canvas && uiRoot && typeof GameApp !== 'undefined') {
        const app = new GameApp(canvas, uiRoot);
        app.start();
        window.__QUEST_APP__ = app;
      }
    });
  </script>
</body>
</html>`;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const db = env && env.DB ? new DatabaseAdapter(env.DB) : defaultDb;

    // Standard security headers
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...securityHeaders },
      });

    // Health check endpoint (Phase 5)
    if (url.pathname === '/api/health') {
      return json({ status: 'ok', game: 'QUEST: Kentucky', gradeBand: '6-8', phase: 5, mode: 'progression-and-rewards' });
    }

    // Public Question Delivery endpoint (Sanitized, Rights-Gated)
    if (url.pathname === '/api/questions' && request.method === 'GET') {
      const subjectFilter = url.searchParams.get('subject');
      const gradeBandFilter = url.searchParams.get('gradeBand');

      const approvedQuestions = QUESTION_CATALOG.filter((q) => {
        if (!q.active || q.rightsStatus !== 'approved') return false;
        if (subjectFilter && q.subject !== subjectFilter) return false;
        if (gradeBandFilter && q.gradeBand !== gradeBandFilter) return false;
        return true;
      });

      return new Response(JSON.stringify({
        count: approvedQuestions.length,
        questions: approvedQuestions.map(sanitizeQuestionForClient),
      }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=600', ...securityHeaders },
      });
    }

    // Staging Question Validation Endpoint (Pre-import Review Aid)
    if (url.pathname === '/api/questions/validate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const items = Array.isArray(body?.questions) ? body.questions : body?.question ? [body.question] : null;

        if (!items) {
          return json({ error: 'Payload must include question object or questions array' }, 400);
        }

        const results = items.map((item) => {
          const val = validateQuestion(item);
          const dup = detectDuplicates(item, QUESTION_CATALOG);
          return {
            id: item?.id || 'unknown',
            valid: val.valid,
            errors: val.errors,
            rightsStatus: val.rightsStatus,
            duplicateWarnings: dup.warnings,
          };
        });

        return json({
          valid: results.every((r) => r.valid),
          count: results.length,
          results,
        });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Authorized Content Reviewer Question Import Endpoint
    if (url.pathname === '/api/questions/import' && request.method === 'POST') {
      const role = request.headers.get('x-reviewer-role');
      if (!role || (role !== 'reviewer' && role !== 'content_admin')) {
        return json({ error: 'Unauthorized: Content reviewer role required' }, 403);
      }

      try {
        const body = await request.json();
        if (!body || !Array.isArray(body.questions)) {
          return json({ error: 'Payload must contain a questions array' }, 400);
        }

        const result = importQuestions(body.questions, QUESTION_CATALOG);
        if (result.imported.length > 0) {
          QUESTION_CATALOG.push(...result.imported);
        }

        return json({
          success: result.success,
          importedCount: result.imported.length,
          rejectedCount: result.rejected.length,
          imported: result.imported.map(sanitizeQuestionForClient),
          rejected: result.rejected,
          warnings: result.warnings,
        });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // KAAC Subject Realms metadata endpoint
    if (url.pathname === '/api/regions') {
      return new Response(JSON.stringify({ regions: Object.values(SUBJECTS) }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...securityHeaders },
      });
    }

    // Starter Quests endpoint
    if (url.pathname === '/api/quests') {
      return new Response(JSON.stringify({ quests: STARTER_QUESTS }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...securityHeaders },
      });
    }

    // Single-player dungeon encounters (sanitized without answer keys)
    if (url.pathname === '/api/encounters') {
      const questionMap = new Map(QUESTION_CATALOG.map((q) => [q.id, q]));
      const sanitizedEncounters = DUNGEON_ENCOUNTERS.map((enc) => {
        let question = null;
        if (enc.questionId) {
          question = sanitizeQuestionForClient(questionMap.get(enc.questionId));
        }
        return { ...enc, question };
      });

      return new Response(JSON.stringify({ dungeon: 'The Verdant Sanctuary', encounters: sanitizedEncounters }), {
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', ...securityHeaders },
      });
    }

    // Student Concept Mastery Progress endpoint across the 5 KAAC subject realms
    if (url.pathname === '/api/progress' && request.method === 'GET') {
      const userId = url.searchParams.get('userId') || request.headers.get('x-guest-id') || 'guest_default';
      const masteryList = await db.getUserMasteryList(userId);
      const progress = computeSubjectProgress(masteryList, QUESTION_CATALOG);
      const totalMastered = masteryList.filter((m) => m.isMastered).length;
      const activeDueCount = getDueReviews(masteryList, Date.now()).length;

      return json({ userId, totalMastered, activeDueCount, progress });
    }

    // Spaced Repetition Due Reviews endpoint
    if (url.pathname === '/api/review/due' && request.method === 'GET') {
      const userId = url.searchParams.get('userId') || request.headers.get('x-guest-id') || 'guest_default';
      const masteryList = await db.getUserMasteryList(userId);
      const dueRecords = getDueReviews(masteryList, Date.now());

      const dueConceptIds = new Set(dueRecords.map((r) => r.conceptId));
      const eligibleQuestions = QUESTION_CATALOG.filter((q) =>
        q.active &&
        q.rightsStatus === 'approved' &&
        Array.isArray(q.conceptIds) &&
        q.conceptIds.some((cid) => dueConceptIds.has(cid))
      );

      return json({
        userId,
        count: dueRecords.length,
        dueConcepts: dueRecords,
        eligibleQuestions: eligibleQuestions.map(sanitizeQuestionForClient),
      });
    }

    // Server-Authoritative User Progression Endpoint
    if (url.pathname === '/api/progression' && request.method === 'GET') {
      const userId = url.searchParams.get('userId') || request.headers.get('x-guest-id') || 'guest_default';
      const progression = await db.getProgression(userId);
      return json(progression);
    }

    // User Cosmetic Inventory & Shop Catalog Endpoint
    if (url.pathname === '/api/inventory' && request.method === 'GET') {
      const userId = url.searchParams.get('userId') || request.headers.get('x-guest-id') || 'guest_default';
      const inventory = await db.getUserInventory(userId);
      return json({ userId, inventory, cosmeticCatalog: COSMETIC_CATALOG });
    }

    // Equip / Unequip Cosmetic Item Endpoint
    if (url.pathname === '/api/inventory/equip' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { itemId, slot } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        if (!itemId || !slot) {
          return json({ error: 'itemId and slot are required' }, 400);
        }

        const result = await db.equipItem(userId, itemId, slot);
        if (!result.success) {
          return json({ error: result.error }, 400);
        }

        return json(result);
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Purchase Cosmetic Item Endpoint
    if (url.pathname === '/api/inventory/buy' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { itemId, idempotencyKey } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        if (!itemId) {
          return json({ error: 'itemId is required' }, 400);
        }

        const result = await db.purchaseCosmetic({ userId, itemId, idempotencyKey, now: Date.now() });
        if (!result.success) {
          return json({ error: result.error }, 400);
        }

        return json(result);
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Claim Quest Completion Reward Endpoint (Idempotent)
    if (url.pathname === '/api/quests/claim' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { questId, idempotencyKey } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        if (!questId) {
          return json({ error: 'questId is required' }, 400);
        }

        const result = await db.claimQuestReward({ userId, questId, idempotencyKey, now: Date.now() });
        if (!result.success) {
          return json({ error: result.error }, 400);
        }

        return json(result);
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Server-Authoritative Answer Validation endpoint with D1 Persistence & Spaced Repetition
    if (url.pathname === '/api/answers' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { questionId, selectedChoiceId, idempotencyKey, assisted } = body || {};

        if (idempotencyKey && IDEMPOTENCY_STORE.has(idempotencyKey)) {
          return json(IDEMPOTENCY_STORE.get(idempotencyKey));
        }

        const question = QUESTION_CATALOG.find((q) => q.id === questionId);
        if (!question) {
          return json({ error: 'Question not found' }, 404);
        }

        // Rights gate check: item must be active and approved to be answerable
        if (!question.active || question.rightsStatus !== 'approved') {
          return json({ error: 'Question is not active or rights status is unapproved' }, 403);
        }

        const validChoice = Array.isArray(question.choices) && question.choices.some((c) => c.id === selectedChoiceId);
        if (!validChoice) {
          return json({ error: 'Invalid choice ID' }, 400);
        }

        const userId = body?.userId || body?.sessionId || request.headers.get('x-guest-id') || 'guest_default';
        const verdict = await db.processAnswerAttempt({
          userId,
          question,
          selectedChoiceId,
          assisted: Boolean(assisted),
          sessionId: body?.sessionId || null,
          idempotencyKey,
          now: Date.now(),
        });

        if (idempotencyKey) {
          IDEMPOTENCY_STORE.set(idempotencyKey, verdict);
        }

        return json(verdict);
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Session endpoint (pseudonymous child-safe guest session)
    if (url.pathname === '/api/session') {
      const guestId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'guest_' + Math.random().toString(36).substring(2, 10);
      return json({ guestId, gradeBand: '6-8', authenticated: false });
    }

    // PWA Web App Manifest endpoint
    if (url.pathname === '/manifest.webmanifest' || url.pathname === '/manifest.json') {
      return new Response(JSON.stringify(createManifest()), {
        headers: {
          'Content-Type': 'application/manifest+json; charset=utf-8',
          'Cache-Control': 'public, max-age=86400',
          ...securityHeaders,
        },
      });
    }

    // PWA Service Worker endpoint
    if (url.pathname === '/sw.js') {
      return new Response(createServiceWorker(), {
        headers: {
          'Content-Type': 'application/javascript; charset=utf-8',
          'Cache-Control': 'no-cache',
          ...securityHeaders,
        },
      });
    }

    // Default: Root application HTML shell
    const html = createHtmlShell();
    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
        ...securityHeaders,
      },
    });
  },
};
