import { PALETTE, SUBJECTS, VIEWPORT } from '../data/constants.js';
import { STARTER_QUESTS } from '../data/game-data.js';
import { SYNTHETIC_QUESTIONS, DUNGEON_ENCOUNTERS, sanitizeQuestionForClient } from '../data/questions.js';
import { validateQuestion, detectDuplicates, importQuestions } from '../data/question-schema.js';
import { GAME_CSS } from '../client/styles.js';

// In-memory catalog and idempotency store for Cloudflare edge worker
const QUESTION_CATALOG = [...SYNTHETIC_QUESTIONS];
const IDEMPOTENCY_STORE = new Map();


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

    // Standard security headers
    const securityHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
    };

    // Health check endpoint (Phase 3)
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        game: 'QUEST: Kentucky',
        gradeBand: '6-8',
        phase: 3,
        mode: 'question-schema-and-rights-gate',
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders,
        },
      });
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
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600',
          ...securityHeaders,
        },
      });
    }

    // Staging Question Validation Endpoint (Pre-import Review Aid)
    if (url.pathname === '/api/questions/validate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const items = Array.isArray(body?.questions)
          ? body.questions
          : body?.question
            ? [body.question]
            : null;

        if (!items) {
          return new Response(JSON.stringify({ error: 'Payload must include question object or questions array' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...securityHeaders },
          });
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

        const allValid = results.every((r) => r.valid);
        return new Response(JSON.stringify({
          valid: allValid,
          results,
        }), {
          headers: { 'Content-Type': 'application/json', ...securityHeaders },
        });
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...securityHeaders },
        });
      }
    }

    // Authorized Content Reviewer Import Endpoint (Rights Gate Enforcement)
    if (url.pathname === '/api/questions/import' && request.method === 'POST') {
      const role = request.headers.get('x-reviewer-role');
      if (!role || (role !== 'reviewer' && role !== 'content_admin')) {
        return new Response(JSON.stringify({ error: 'Unauthorized: Content reviewer role required' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...securityHeaders },
        });
      }

      try {
        const body = await request.json();
        if (!body || !Array.isArray(body.questions)) {
          return new Response(JSON.stringify({ error: 'Payload must contain a questions array' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...securityHeaders },
          });
        }

        const result = importQuestions(body.questions, QUESTION_CATALOG);
        if (result.imported.length > 0) {
          QUESTION_CATALOG.push(...result.imported);
        }

        return new Response(JSON.stringify({
          success: result.success,
          importedCount: result.imported.length,
          rejectedCount: result.rejected.length,
          imported: result.imported.map(sanitizeQuestionForClient),
          rejected: result.rejected,
          warnings: result.warnings,
        }), {
          headers: { 'Content-Type': 'application/json', ...securityHeaders },
        });
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...securityHeaders },
        });
      }
    }

    // KAAC Subject Realms metadata endpoint
    if (url.pathname === '/api/regions') {
      return new Response(JSON.stringify({
        regions: Object.values(SUBJECTS),
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          ...securityHeaders,
        },
      });
    }

    // Starter Quests endpoint
    if (url.pathname === '/api/quests') {
      return new Response(JSON.stringify({
        quests: STARTER_QUESTS,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          ...securityHeaders,
        },
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
        return {
          ...enc,
          question,
        };
      });

      return new Response(JSON.stringify({
        dungeon: 'The Verdant Sanctuary',
        encounters: sanitizedEncounters,
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=3600',
          ...securityHeaders,
        },
      });
    }

    // Server-Authoritative Answer Validation endpoint with Rights Gate & Idempotency
    if (url.pathname === '/api/answers' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { questionId, selectedChoiceId, idempotencyKey } = body || {};

        if (idempotencyKey && IDEMPOTENCY_STORE.has(idempotencyKey)) {
          return new Response(JSON.stringify(IDEMPOTENCY_STORE.get(idempotencyKey)), {
            headers: { 'Content-Type': 'application/json', ...securityHeaders },
          });
        }

        const question = QUESTION_CATALOG.find((q) => q.id === questionId);
        if (!question) {
          return new Response(JSON.stringify({ error: 'Question not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...securityHeaders },
          });
        }

        // Rights gate check: item must be active and approved to be answerable
        if (!question.active || question.rightsStatus !== 'approved') {
          return new Response(JSON.stringify({ error: 'Question is not active or rights status is unapproved' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json', ...securityHeaders },
          });
        }

        const validChoice = Array.isArray(question.choices) && question.choices.some((c) => c.id === selectedChoiceId);
        if (!validChoice) {
          return new Response(JSON.stringify({ error: 'Invalid choice ID' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...securityHeaders },
          });
        }

        const isCorrect = selectedChoiceId === question.answerKey;
        const verdict = {
          accepted: true,
          correct: isCorrect,
          explanation: question.explanation,
          conceptReviewScheduled: true,
        };

        if (idempotencyKey) {
          IDEMPOTENCY_STORE.set(idempotencyKey, verdict);
        }

        return new Response(JSON.stringify(verdict), {
          headers: { 'Content-Type': 'application/json', ...securityHeaders },
        });
      } catch {
        return new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...securityHeaders },
        });
      }
    }

    // Session endpoint (pseudonymous child-safe guest session)
    if (url.pathname === '/api/session') {
      const guestId = (crypto && crypto.randomUUID) ? crypto.randomUUID() : 'guest_' + Math.random().toString(36).substring(2, 10);
      return new Response(JSON.stringify({
        guestId,
        gradeBand: '6-8',
        authenticated: false,
      }), {
        headers: {
          'Content-Type': 'application/json',
          ...securityHeaders,
        },
      });
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
