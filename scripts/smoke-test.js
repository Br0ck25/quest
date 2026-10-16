// scripts/smoke-test.js — Production & Staging Pre-Flight Smoke Test Suite
// Validates all critical edge endpoints and security policies against the compiled worker.js artifact.

import worker from '../worker.js';

const PASSED = '✔';
const FAILED = '✖';

let totalChecks = 0;
let passedChecks = 0;
let failedChecks = 0;

function assert(condition, message) {
  totalChecks++;
  if (condition) {
    passedChecks++;
    console.log(`  ${PASSED} ${message}`);
  } else {
    failedChecks++;
    console.error(`  ${FAILED} FAILED: ${message}`);
  }
}

async function runSmokeTests() {
  console.log('\n=============================================================');
  console.log(' QUEST: Kentucky — Pre-Flight Staging & Production Smoke Test');
  console.log('=============================================================\n');

  const env = {};
  const ctx = {};

  // 1. Health & Release Candidate Verification
  console.log('[1/7] Health, Version & Runtime Metadata');
  {
    const res = await worker.fetch(new Request('http://localhost/api/health'), env, ctx);
    assert(res.status === 200, 'Health endpoint responds with HTTP 200');
    const data = await res.json();
    assert(data.status === 'ok', 'Health status is "ok"');
    assert(data.gradeBand === '6-8', 'Target grade band is Middle Grades 6-8');
    assert(data.phase >= 10, 'Phase is Release Candidate (Phase 10+)');
    assert(data.securityAudit === 'passed', 'Security audit status is "passed"');
  }

  // 2. Application Shell & PWA Offline Assets
  console.log('\n[2/7] Application Shell & PWA Assets');
  {
    const htmlRes = await worker.fetch(new Request('http://localhost/'), env, ctx);
    assert(htmlRes.status === 200, 'Root route delivers HTML shell');
    assert(htmlRes.headers.get('content-type')?.includes('text/html'), 'Content-Type is text/html');
    const html = await htmlRes.text();
    assert(html.includes('id="game-canvas"'), 'HTML contains #game-canvas element');
    assert(html.includes('id="ui-root"'), 'HTML contains #ui-root accessible DOM element');

    const manifestRes = await worker.fetch(new Request('http://localhost/manifest.webmanifest'), env, ctx);
    assert(manifestRes.status === 200, 'Web App Manifest delivers HTTP 200');
    const manifest = await manifestRes.json();
    assert(manifest.display === 'standalone', 'PWA display mode is standalone');
    assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, 'Manifest contains SVG icon entries');

    const swRes = await worker.fetch(new Request('http://localhost/sw.js'), env, ctx);
    assert(swRes.status === 200, 'Service Worker script delivers HTTP 200');
    assert(swRes.headers.get('content-type')?.includes('javascript'), 'SW Content-Type is javascript');
  }

  // 3. Security Headers, Permissions-Policy & Anti-DoS Guards
  console.log('\n[3/7] Security Headers & Anti-Tampering Guards');
  {
    const auditRes = await worker.fetch(new Request('http://localhost/api/security/audit'), env, ctx);
    assert(auditRes.status === 200, 'Security audit endpoint delivers HTTP 200');
    assert(auditRes.headers.get('x-content-type-options') === 'nosniff', 'X-Content-Type-Options: nosniff present');
    assert(auditRes.headers.get('x-frame-options') === 'DENY', 'X-Frame-Options: DENY present');
    assert(auditRes.headers.get('content-security-policy')?.includes("default-src 'self'"), 'Strict Content-Security-Policy present');
    assert(auditRes.headers.get('permissions-policy')?.includes('camera=(), microphone=(), geolocation=()'), 'Permissions-Policy blocks camera, mic, geolocation');

    const auditData = await auditRes.json();
    assert(auditData.coppaCompliant === true, 'COPPA compliance verified');
    assert(auditData.zeroPii === true, 'Zero PII architecture verified');
    assert(auditData.noOpenChat === true, 'No open text chat verified');

    // Anti-DoS payload limit test (> 64KB rejected with HTTP 413)
    const largeReq = new Request('http://localhost/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'content-length': '70000' },
      body: JSON.stringify({ data: 'x'.repeat(100) }),
    });
    const largeRes = await worker.fetch(largeReq, env, ctx);
    assert(largeRes.status === 413, 'Oversized payload rejected with HTTP 413 Payload Too Large');

    // Session IDOR tampering test
    const idorReq = new Request('http://localhost/api/inventory/buy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-guest-id': 'student_auth_1' },
      body: JSON.stringify({ userId: 'student_target_2', itemId: 'item_derby_cap' }),
    });
    const idorRes = await worker.fetch(idorReq, env, ctx);
    assert(idorRes.status === 403, 'Session IDOR user mismatch rejected with HTTP 403 Forbidden');
  }

  // 4. Curriculum Content & Answer Key Secrecy
  console.log('\n[4/7] Curriculum Content & Answer Key Secrecy');
  {
    const qRes = await worker.fetch(new Request('http://localhost/api/questions'), env, ctx);
    assert(qRes.status === 200, 'Public questions endpoint delivers HTTP 200');
    const qData = await qRes.json();
    assert(qData.count > 0 && Array.isArray(qData.questions), 'Questions catalog contains verified items');
    assert(qData.questions.every((q) => q.answerKey === undefined), 'All public questions strip answerKey (Answer Key Secrecy)');

    const encRes = await worker.fetch(new Request('http://localhost/api/encounters'), env, ctx);
    assert(encRes.status === 200, 'Dungeon encounters endpoint delivers HTTP 200');
    const encData = await encRes.json();
    assert(encData.encounters.length === 5, 'Dungeon defines 5 encounters ending in boss');
    assert(encData.encounters.every((e) => !e.question || e.question.answerKey === undefined), 'Dungeon encounters strip answerKey');
  }

  // 5. Game Systems: Quests, Regions & Accessibility
  console.log('\n[5/7] Quests, Realms & Accessibility Accommodations');
  {
    const rRes = await worker.fetch(new Request('http://localhost/api/regions'), env, ctx);
    assert(rRes.status === 200, 'Regions metadata delivers HTTP 200');
    const rData = await rRes.json();
    assert(rData.regions.length === 5, 'All 5 Governor Cup academic realms present');

    const questRes = await worker.fetch(new Request('http://localhost/api/quests'), env, ctx);
    assert(questRes.status === 200, 'Starter quests delivers HTTP 200');
    const questData = await questRes.json();
    assert(questData.quests.length === 5, '5 starter quests available covering all subjects');

    const a11yRes = await worker.fetch(new Request('http://localhost/api/accessibility'), env, ctx);
    assert(a11yRes.status === 200, 'Accessibility endpoint delivers HTTP 200');
    const a11yData = await a11yRes.json();
    assert(a11yData.wcagStandard === 'WCAG 2.1 AA', 'Accessibility standard is WCAG 2.1 AA');
    assert(a11yData.minTouchTargetPx === 48, 'Minimum touch target is 48px');
    assert(a11yData.untimedPractice === true, 'Untimed practice mode supported');
  }

  // 6. Multiplayer Co-Op & 1v1 Duels
  console.log('\n[6/7] Multiplayer Co-Op & 1v1 Duel Engines');
  {
    const emotesRes = await worker.fetch(new Request('http://localhost/api/rooms/emotes'), env, ctx);
    assert(emotesRes.status === 200, 'Emotes catalog delivers HTTP 200');
    const emotesData = await emotesRes.json();
    assert(emotesData.emotes.length >= 6, 'Preset emotes catalog available');

    const roomReq = new Request('http://localhost/api/rooms/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: 'host_smoke_test', hostHandle: 'BluegrassScholar99' }),
    });
    const roomRes = await worker.fetch(roomReq, env, ctx);
    assert(roomRes.status === 200, 'Co-op room creation succeeds');
    const roomData = await roomRes.json();
    assert(roomData.room.code.startsWith('KY-'), 'Room code follows KY-XXXX format');

    const duelReq = new Request('http://localhost/api/duels/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostId: 'duel_smoke_test', hostHandle: 'CumberlandPioneer88' }),
    });
    const duelRes = await worker.fetch(duelReq, env, ctx);
    assert(duelRes.status === 200, '1v1 duel match creation succeeds');
    const duelData = await duelRes.json();
    assert(duelData.match.code.startsWith('DUEL-'), 'Duel code follows DUEL-XXXX format');
  }

  // 7. Student Persistence, Anti-Farming & Data Purge (COPPA)
  console.log('\n[7/7] Spaced Repetition, Anti-Farming & COPPA Data Purge');
  {
    const smokeUser = 'smoke_test_student_user';

    // Submit answer
    const ansReq = new Request('http://localhost/api/answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-guest-id': smokeUser },
      body: JSON.stringify({
        userId: smokeUser,
        questionId: 'syn_sci_002',
        selectedChoiceId: 'a',
        idempotencyKey: 'smoke_ans_key_01',
      }),
    });
    const ansRes = await worker.fetch(ansReq, env, ctx);
    assert(ansRes.status === 200, 'Answer evaluation succeeds');
    const ansData = await ansRes.json();
    assert(ansData.correct === true, 'Answer evaluated correctly');
    assert(ansData.reward.xp === 15, 'Anti-farming 1st attempt awards 15 XP');
    assert(ansData.reward.coins === 5, 'Anti-farming 1st attempt awards 5 coins');

    // Spaced repetition review due
    const reviewRes = await worker.fetch(new Request(`http://localhost/api/review/due?userId=${smokeUser}`), env, ctx);
    assert(reviewRes.status === 200, 'Due reviews query succeeds');

    // Progression
    const progRes = await worker.fetch(new Request(`http://localhost/api/progression?userId=${smokeUser}`), env, ctx);
    assert(progRes.status === 200, 'Progression query succeeds');

    // COPPA User Data Deletion / Purge
    const purgeReq = new Request('http://localhost/api/user/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-guest-id': smokeUser },
      body: JSON.stringify({ userId: smokeUser }),
    });
    const purgeRes = await worker.fetch(purgeReq, env, ctx);
    assert(purgeRes.status === 200, 'COPPA user data purge succeeds');
    const purgeData = await purgeRes.json();
    assert(purgeData.purged === true, 'All relational records purged');
  }

  console.log('\n-------------------------------------------------------------');
  console.log(`Smoke Test Summary: ${passedChecks} / ${totalChecks} checks passed (${failedChecks} failures).`);
  console.log('-------------------------------------------------------------\n');

  if (failedChecks > 0) {
    process.exit(1);
  } else {
    console.log('✔ All staging pre-flight checks PASSED. System ready for deployment.\n');
  }
}

runSmokeTests().catch((err) => {
  console.error('Fatal Smoke Test Error:', err);
  process.exit(1);
});
