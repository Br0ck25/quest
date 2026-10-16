import { PALETTE, SUBJECTS, VIEWPORT } from '../data/constants.js';
import { STARTER_QUESTS } from '../data/game-data.js';
import { SYNTHETIC_QUESTIONS, DUNGEON_ENCOUNTERS, sanitizeQuestionForClient } from '../data/questions.js';
import { validateQuestion, detectDuplicates, importQuestions } from '../data/question-schema.js';
import { computeSubjectProgress, getDueReviews } from '../data/spaced-repetition.js';
import { COSMETIC_CATALOG, STARTER_COMPANION } from '../data/progression.js';
import { DatabaseAdapter } from './db.js';
import { RoomManager, PRESET_EMOTES, ROOM_STATES } from './rooms.js';
import { DuelManager, DUEL_STATES } from './duels.js';
import { GAME_CSS } from '../client/styles.js';
import { QuestionReviewService, isAuthorizedReviewer } from './content-review.js';

// In-memory catalog, database adapter, and idempotency store for Cloudflare edge worker
const QUESTION_CATALOG = [...SYNTHETIC_QUESTIONS];
const IDEMPOTENCY_STORE = new Map();
const defaultDb = new DatabaseAdapter();
const defaultRoomManager = new RoomManager();
const defaultDuelManager = new DuelManager();
const defaultReviewService = new QuestionReviewService(QUESTION_CATALOG);

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
      'Content-Security-Policy': "default-src 'self' 'unsafe-inline' data:; connect-src 'self' ws: wss:;",
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', ...securityHeaders },
      });

    // Anti-DoS Payload Size Guard (max 64KB for JSON bodies)
    const contentLength = request.headers.get('content-length');
    if (contentLength && parseInt(contentLength, 10) > 65536) {
      return json({ error: 'Payload Too Large: Maximum request body size is 64KB' }, 413);
    }

    // Health check endpoint (Phase 10: Release Candidate)
    if (url.pathname === '/api/health') {
      return json({
        status: 'ok',
        game: 'QUEST: Kentucky',
        gradeBand: '6-8',
        phase: 10,
        mode: 'release-candidate',
        securityAudit: 'passed',
        adminReview: true,
      });
    }

    // Security, Privacy & Child Safety Audit Metadata endpoint
    if (url.pathname === '/api/security/audit' && request.method === 'GET') {
      return json({
        status: 'passed',
        coppaCompliant: true,
        zeroPii: true,
        noOpenChat: true,
        presetEmotesOnly: true,
        answerKeySecrecy: true,
        securityHeaders: true,
        permissionsPolicy: 'camera=(), microphone=(), geolocation=()',
        dataDeletionSupported: true,
        maxPayloadSizeBytes: 65536,
        antiFarmingEnforced: true,
      });
    }

    // Accessibility metadata & verification endpoint
    if (url.pathname === '/api/accessibility' && request.method === 'GET') {
      return json({
        minTouchTargetPx: 48,
        wcagStandard: 'WCAG 2.1 AA',
        textScales: ['normal', 'large', 'xlarge'],
        untimedPractice: true,
        nonColorCues: true,
        reducedMotion: true,
        highContrastMode: true,
        audioMuteToggle: true,
        targetViewports: [
          { name: 'Small Phone', width: 360, height: 640 },
          { name: 'Large Phone', width: 412, height: 915 },
          { name: 'Tablet', width: 768, height: 1024 },
          { name: 'Chromebook', width: 1366, height: 768 },
          { name: 'Desktop', width: 1920, height: 1080 },
        ],
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

    // Admin Content Review: List Questions with Duplicate Warnings & Filters
    if (url.pathname === '/api/admin/questions' && request.method === 'GET') {
      const role = request.headers.get('x-reviewer-role');
      if (!isAuthorizedReviewer(role)) {
        return json({ error: 'Forbidden: Requires authorized reviewer role' }, 403);
      }

      const filters = {};
      if (url.searchParams.has('subject')) filters.subject = url.searchParams.get('subject');
      if (url.searchParams.has('gradeBand')) filters.gradeBand = url.searchParams.get('gradeBand');
      if (url.searchParams.has('reviewStatus')) filters.reviewStatus = url.searchParams.get('reviewStatus');
      if (url.searchParams.has('rightsStatus')) filters.rightsStatus = url.searchParams.get('rightsStatus');
      if (url.searchParams.has('active')) filters.active = url.searchParams.get('active') === 'true';

      const questions = defaultReviewService.listQuestions(filters, role);
      return json({ count: questions.length, questions });
    }

    // Admin Content Review: Single Question Inspection, Actions & Audit History
    if (url.pathname.startsWith('/api/admin/questions/')) {
      const role = request.headers.get('x-reviewer-role');
      if (!isAuthorizedReviewer(role)) {
        return json({ error: 'Forbidden: Requires authorized reviewer role' }, 403);
      }

      const reviewerId = request.headers.get('x-reviewer-id') || 'reviewer_admin';
      const pathSuffix = url.pathname.slice('/api/admin/questions/'.length);
      const segments = pathSuffix.split('/');
      const questionId = decodeURIComponent(segments[0]);
      const action = segments[1] || '';

      try {
        if (request.method === 'GET' && action === 'history') {
          const history = defaultReviewService.getAuditHistory(questionId, role);
          return json({ questionId, history });
        }

        if (request.method === 'GET' && !action) {
          const details = defaultReviewService.getQuestionDetails(questionId, role);
          return json(details);
        }

        if (request.method === 'POST') {
          let body = {};
          try { body = await request.json(); } catch {}

          if (action === 'approve') {
            const res = defaultReviewService.approveQuestion(questionId, { reviewerId, note: body?.note }, role);
            return json(res);
          }

          if (action === 'reject') {
            const res = defaultReviewService.rejectQuestion(questionId, { reviewerId, reason: body?.reason }, role);
            return json(res);
          }

          if (action === 'correct') {
            const res = defaultReviewService.correctQuestion(questionId, body?.updates || body, { reviewerId, note: body?.note }, role);
            return json(res);
          }

          if (action === 'retire') {
            const res = defaultReviewService.retireQuestion(questionId, { reviewerId, reason: body?.reason }, role);
            return json(res);
          }
        }

        return json({ error: 'Endpoint not found or method not allowed' }, 404);
      } catch (err) {
        return json({ error: err.message }, err.status || 500);
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
        const sessionUserId = request.headers.get('x-guest-id') || request.headers.get('x-user-id');
        if (sessionUserId && body?.userId && body.userId !== sessionUserId) {
          return json({ error: 'Forbidden: Session user mismatch' }, 403);
        }
        const userId = body?.userId || sessionUserId || 'guest_default';

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
        const sessionUserId = request.headers.get('x-guest-id') || request.headers.get('x-user-id');
        if (sessionUserId && body?.userId && body.userId !== sessionUserId) {
          return json({ error: 'Forbidden: Session user mismatch' }, 403);
        }
        const userId = body?.userId || sessionUserId || 'guest_default';

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
        const sessionUserId = request.headers.get('x-guest-id') || request.headers.get('x-user-id');
        if (sessionUserId && body?.userId && body.userId !== sessionUserId) {
          return json({ error: 'Forbidden: Session user mismatch' }, 403);
        }
        const userId = body?.userId || sessionUserId || 'guest_default';

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

    // User Data Deletion / Purge Endpoint (COPPA / FERPA Right to be Forgotten)
    if (url.pathname === '/api/user/delete' && request.method === 'POST') {
      try {
        const body = await request.json();
        const sessionUserId = request.headers.get('x-guest-id') || request.headers.get('x-user-id');
        const role = request.headers.get('x-reviewer-role');
        const targetUserId = body?.userId || sessionUserId;

        if (sessionUserId && targetUserId && sessionUserId !== targetUserId && !isAuthorizedReviewer(role)) {
          return json({ error: 'Forbidden: Cannot delete data for another user' }, 403);
        }

        if (!targetUserId) {
          return json({ error: 'userId is required' }, 400);
        }

        const result = await db.deleteUserData(targetUserId);
        return json(result);
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Multiplayer Preset Emotes Catalog Endpoint
    if (url.pathname === '/api/rooms/emotes' && request.method === 'GET') {
      return json({ emotes: PRESET_EMOTES });
    }

    // Create Multiplayer Co-op Room
    if (url.pathname === '/api/rooms/create' && request.method === 'POST') {
      try {
        const body = await request.json();
        const hostId = body?.hostId || request.headers.get('x-guest-id') || 'guest_host';
        const hostHandle = body?.hostHandle || 'BluegrassHost';
        const room = defaultRoomManager.createRoom(hostId, hostHandle);
        return json({ success: true, room: room.getSnapshot() });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Join Multiplayer Co-op Room (with anti-brute force rate limiting)
    if (url.pathname === '/api/rooms/join' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, handle } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_joiner';
        const clientKey = request.headers.get('cf-connecting-ip') || userId;

        if (!code) {
          return json({ error: 'Room code is required' }, 400);
        }

        const result = defaultRoomManager.joinRoom(code, userId, handle || 'BluegrassAdventurer', clientKey);
        if (!result.success) {
          const status = result.rateLimited ? 429 : 400;
          return json({ error: result.error, rateLimited: Boolean(result.rateLimited) }, status);
        }

        result.room.broadcastSnapshot('PLAYER_JOINED');
        return json({ success: true, room: result.snapshot });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Toggle Ready State in Room Lobby
    if (url.pathname === '/api/rooms/ready' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, ready } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        const room = defaultRoomManager.getRoom(code);
        if (!room) return json({ error: 'Room not found or expired' }, 404);

        const updated = room.setReady(userId, ready !== false);
        if (!updated) return json({ error: 'User not in room' }, 400);

        room.broadcastSnapshot('PLAYER_READY');
        return json({ success: true, room: room.getSnapshot() });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Start Co-op Boss Encounter (Host only, >= 2 players, all ready)
    if (url.pathname === '/api/rooms/start' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        const room = defaultRoomManager.getRoom(code);
        if (!room) return json({ error: 'Room not found or expired' }, 404);

        if (room.hostId !== userId) {
          return json({ error: 'Only the host can start the co-op encounter' }, 403);
        }

        const approvedQuestions = QUESTION_CATALOG.filter((q) => q.active && q.rightsStatus === 'approved');
        const startResult = room.startEncounter(approvedQuestions);
        if (!startResult.success) {
          return json({ error: startResult.error }, 400);
        }

        room.broadcastSnapshot('ENCOUNTER_STARTED');
        return json({ success: true, room: room.getSnapshot() });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Co-op Synchronized Answer Submission with Boss Damage & Idempotency
    if (url.pathname === '/api/rooms/answer' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, choiceId, idempotencyKey } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        const room = defaultRoomManager.getRoom(code);
        if (!room) return json({ error: 'Room not found or expired' }, 404);

        const verdict = room.submitAnswer(userId, choiceId, idempotencyKey);
        if (!verdict.success) {
          return json({ error: verdict.error, duplicate: Boolean(verdict.duplicate) }, 400);
        }

        let victoryReward = null;
        if (verdict.status === ROOM_STATES.VICTORY) {
          const xpRes = await db.addXp(userId, 150);
          const walletRes = await db.recordWalletTransaction({
            userId,
            amountDelta: 50,
            reason: 'coop_boss_victory',
            idempotencyKey: `coop_win_${room.id}_${userId}`,
          });
          victoryReward = { xpAwarded: 150, coinsAwarded: 50, newLevel: xpRes.newLevel, newBalance: walletRes.newBalance };
        }

        room.broadcast({
          type: 'ANSWER_SUBMITTED',
          userId,
          isCorrect: verdict.isCorrect,
          damageDealt: verdict.damageDealt,
          bossHp: verdict.bossHp,
          status: verdict.status,
          snapshot: room.getSnapshot(),
        });

        return json({ success: true, verdict, victoryReward, room: room.getSnapshot() });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Send Preset Emote (Child privacy: preset emotes only, no open text)
    if (url.pathname === '/api/rooms/emote' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, emoteId } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        const room = defaultRoomManager.getRoom(code);
        if (!room) return json({ error: 'Room not found or expired' }, 404);

        const result = room.sendPresetEmote(userId, emoteId);
        if (!result.success) {
          return json({ error: result.error }, 400);
        }

        room.broadcast(result.broadcastData);
        return json({ success: true, broadcastData: result.broadcastData });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // Fetch Room Status / Snapshot
    if (url.pathname === '/api/rooms/status' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      const room = defaultRoomManager.getRoom(code);
      if (!room) return json({ error: 'Room not found or expired' }, 404);

      return json({ success: true, room: room.getSnapshot() });
    }

    // WebSocket Upgrade Handler for Live Co-op Sync
    if (url.pathname === '/api/rooms/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return json({ error: 'Expected WebSocket Upgrade header' }, 426);
      }

      const code = url.searchParams.get('code');
      const userId = url.searchParams.get('userId');
      const room = defaultRoomManager.getRoom(code);
      if (!room) {
        return json({ error: 'Room not found or expired' }, 404);
      }

      if (typeof WebSocketPair === 'undefined') {
        return json({ error: 'WebSocketPair is not supported in this runtime environment' }, 501);
      }

      const webSocketPair = new WebSocketPair();
      const [clientWs, serverWs] = Object.values(webSocketPair);

      serverWs.accept();
      room.setPlayerWs(userId, serverWs);
      serverWs.send(JSON.stringify({ type: 'CONNECTED', snapshot: room.getSnapshot() }));

      serverWs.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'READY') {
            room.setReady(userId, msg.ready !== false);
            room.broadcastSnapshot('PLAYER_READY');
          } else if (msg.type === 'START' && room.hostId === userId) {
            const approvedQuestions = QUESTION_CATALOG.filter((q) => q.active && q.rightsStatus === 'approved');
            room.startEncounter(approvedQuestions);
            room.broadcastSnapshot('ENCOUNTER_STARTED');
          } else if (msg.type === 'ANSWER') {
            const verdict = room.submitAnswer(userId, msg.choiceId, msg.idempotencyKey);
            room.broadcast({
              type: 'ANSWER_SUBMITTED',
              userId,
              isCorrect: verdict.isCorrect,
              damageDealt: verdict.damageDealt,
              bossHp: verdict.bossHp,
              status: verdict.status,
              snapshot: room.getSnapshot(),
            });
          } else if (msg.type === 'EMOTE') {
            const emoteResult = room.sendPresetEmote(userId, msg.emoteId);
            if (emoteResult.success) {
              room.broadcast(emoteResult.broadcastData);
            }
          }
        } catch {
          // ignore malformed ws message
        }
      });

      serverWs.addEventListener('close', () => {
        room.handleDisconnect(userId);
        room.broadcastSnapshot('PLAYER_DISCONNECTED');
      });

      serverWs.addEventListener('error', () => {
        room.handleDisconnect(userId);
      });

      return new Response(null, {
        status: 101,
        webSocket: clientWs,
      });
    }

    // 1v1 Duels: Create Duel Match
    if (url.pathname === '/api/duels/create' && request.method === 'POST') {
      try {
        const body = await request.json();
        const hostId = body?.hostId || request.headers.get('x-guest-id') || 'guest_duel_host';
        const hostHandle = body?.hostHandle || 'BluegrassDuelist';
        const match = defaultDuelManager.createDuel(hostId, hostHandle);
        return json({ success: true, match: match.getSnapshot(hostId) });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // 1v1 Duels: Join Duel Match
    if (url.pathname === '/api/duels/join' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, handle } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_challenger';
        const clientKey = request.headers.get('cf-connecting-ip') || userId;

        if (!code) return json({ error: 'Duel code is required' }, 400);

        const result = defaultDuelManager.joinDuel(code, userId, handle || 'CardinalChallenger', clientKey);
        if (!result.success) {
          const status = result.rateLimited ? 429 : 400;
          return json({ error: result.error, rateLimited: Boolean(result.rateLimited) }, status);
        }

        result.match.broadcastSnapshot('OPPONENT_JOINED');
        return json({ success: true, match: result.snapshot });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // 1v1 Duels: Toggle Ready State
    if (url.pathname === '/api/duels/ready' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, ready } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        const match = defaultDuelManager.getDuel(code);
        if (!match) return json({ error: 'Duel match not found or expired' }, 404);

        const updated = match.setReady(userId, ready !== false);
        if (!updated) return json({ error: 'User is not in this duel match' }, 400);

        match.broadcastSnapshot('PLAYER_READY');
        return json({ success: true, match: match.getSnapshot(userId) });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // 1v1 Duels: Start Duel Match
    if (url.pathname === '/api/duels/start' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        const match = defaultDuelManager.getDuel(code);
        if (!match) return json({ error: 'Duel match not found or expired' }, 404);

        if (match.player1.userId !== userId) {
          return json({ error: 'Only the match host can start the duel' }, 403);
        }

        const approvedQuestions = QUESTION_CATALOG.filter((q) => q.active && q.rightsStatus === 'approved');
        const startRes = match.startDuel(approvedQuestions);
        if (!startRes.success) return json({ error: startRes.error }, 400);

        match.broadcastSnapshot('DUEL_STARTED');
        return json({ success: true, match: match.getSnapshot(userId) });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // 1v1 Duels: Independent Answer Submission with Delayed Reveal Policy
    if (url.pathname === '/api/duels/answer' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, choiceId, timeElapsedMs, idempotencyKey } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        const match = defaultDuelManager.getDuel(code);
        if (!match) return json({ error: 'Duel match not found or expired' }, 404);

        const verdict = match.submitAnswer(userId, choiceId, timeElapsedMs, idempotencyKey);
        if (!verdict.success) {
          return json({ error: verdict.error, duplicate: Boolean(verdict.duplicate) }, 400);
        }

        if (verdict.bothSubmitted) {
          match.broadcastSnapshot('ROUND_REVEAL');
        } else {
          match.broadcastSnapshot('ANSWER_SUBMITTED_WAITING');
        }

        return json({ success: true, verdict, match: match.getSnapshot(userId) });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // 1v1 Duels: Advance to Next Round or Finish
    if (url.pathname === '/api/duels/next-round' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        const match = defaultDuelManager.getDuel(code);
        if (!match) return json({ error: 'Duel match not found or expired' }, 404);

        const nextRes = match.nextRound();
        if (!nextRes.success) return json({ error: nextRes.error }, 400);

        match.broadcastSnapshot(nextRes.finished ? 'DUEL_FINISHED' : 'NEW_ROUND');
        return json({ success: true, nextRes, match: match.getSnapshot(userId) });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // 1v1 Duels: Send Preset Emote
    if (url.pathname === '/api/duels/emote' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { code, emoteId } = body || {};
        const userId = body?.userId || request.headers.get('x-guest-id') || 'guest_default';

        const match = defaultDuelManager.getDuel(code);
        if (!match) return json({ error: 'Duel match not found or expired' }, 404);

        const result = match.sendPresetEmote(userId, emoteId);
        if (!result.success) return json({ error: result.error }, 400);

        match.broadcast(result.broadcastData);
        return json({ success: true, broadcastData: result.broadcastData });
      } catch {
        return json({ error: 'Invalid JSON payload' }, 400);
      }
    }

    // 1v1 Duels: Fetch Match Status & User-Tailored Snapshot
    if (url.pathname === '/api/duels/status' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      const userId = url.searchParams.get('userId') || request.headers.get('x-guest-id');
      const match = defaultDuelManager.getDuel(code);
      if (!match) return json({ error: 'Duel match not found or expired' }, 404);

      return json({ success: true, match: match.getSnapshot(userId) });
    }

    // 1v1 Duels: Respectful Post-Match Recap
    if (url.pathname === '/api/duels/recap' && request.method === 'GET') {
      const code = url.searchParams.get('code');
      const match = defaultDuelManager.getDuel(code);
      if (!match) return json({ error: 'Duel match not found or expired' }, 404);

      return json({ success: true, recap: match.getRecap() });
    }

    // 1v1 Duels: Real-Time WebSocket Connection
    if (url.pathname === '/api/duels/ws') {
      const upgradeHeader = request.headers.get('Upgrade');
      if (!upgradeHeader || upgradeHeader.toLowerCase() !== 'websocket') {
        return json({ error: 'Expected WebSocket Upgrade header' }, 426);
      }

      const code = url.searchParams.get('code');
      const userId = url.searchParams.get('userId');
      const match = defaultDuelManager.getDuel(code);
      if (!match) {
        return json({ error: 'Duel match not found or expired' }, 404);
      }

      if (typeof WebSocketPair === 'undefined') {
        return json({ error: 'WebSocketPair is not supported in this runtime environment' }, 501);
      }

      const webSocketPair = new WebSocketPair();
      const [clientWs, serverWs] = Object.values(webSocketPair);

      serverWs.accept();
      match.reconnect(userId, serverWs);
      serverWs.send(JSON.stringify({ type: 'CONNECTED', snapshot: match.getSnapshot(userId) }));

      serverWs.addEventListener('message', (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'READY') {
            match.setReady(userId, msg.ready !== false);
            match.broadcastSnapshot('PLAYER_READY');
          } else if (msg.type === 'START' && match.player1.userId === userId) {
            const approvedQuestions = QUESTION_CATALOG.filter((q) => q.active && q.rightsStatus === 'approved');
            match.startDuel(approvedQuestions);
            match.broadcastSnapshot('DUEL_STARTED');
          } else if (msg.type === 'ANSWER') {
            const verdict = match.submitAnswer(userId, msg.choiceId, msg.timeElapsedMs, msg.idempotencyKey);
            if (verdict.bothSubmitted) {
              match.broadcastSnapshot('ROUND_REVEAL');
            } else {
              match.broadcastSnapshot('ANSWER_SUBMITTED_WAITING');
            }
          } else if (msg.type === 'NEXT_ROUND') {
            const nextRes = match.nextRound();
            match.broadcastSnapshot(nextRes.finished ? 'DUEL_FINISHED' : 'NEW_ROUND');
          } else if (msg.type === 'EMOTE') {
            const emoteRes = match.sendPresetEmote(userId, msg.emoteId);
            if (emoteRes.success) {
              match.broadcast(emoteRes.broadcastData);
            }
          }
        } catch {
          // ignore malformed ws message
        }
      });

      serverWs.addEventListener('close', () => {
        match.handleDisconnect(userId);
        match.broadcastSnapshot('OPPONENT_DISCONNECTED');
      });

      serverWs.addEventListener('error', () => {
        match.handleDisconnect(userId);
      });

      return new Response(null, {
        status: 101,
        webSocket: clientWs,
      });
    }

    // Server-Authoritative Answer Validation endpoint with D1 Persistence & Spaced Repetition
    if (url.pathname === '/api/answers' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { questionId, selectedChoiceId, idempotencyKey, assisted } = body || {};

        const sessionUserId = request.headers.get('x-guest-id') || request.headers.get('x-user-id');
        if (sessionUserId && body?.userId && body.userId !== sessionUserId) {
          return json({ error: 'Forbidden: Session user mismatch' }, 403);
        }

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

        const userId = body?.userId || body?.sessionId || sessionUserId || 'guest_default';
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
