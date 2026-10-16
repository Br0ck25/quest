// tests/contract/worker.test.js — Contract tests for Cloudflare Worker edge routes
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker.js';

test('Worker health route returns ok and phase status', async () => {
  const req = new Request('http://localhost/api/health');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');

  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.game, 'QUEST: Kentucky');
  assert.equal(data.gradeBand, '6-8');
  assert.equal(data.phase, 4);
  assert.equal(data.mode, 'd1-persistence-and-spaced-repetition');
});

test('Worker root returns semantic HTML with responsive canvas and UI root', async () => {
  const req = new Request('http://localhost/');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^text\/html/);

  const html = await res.text();
  assert.match(html, /<meta name="viewport" content="[^"]*user-scalable=no/i);
  assert.match(html, /<link rel="manifest" href="\/manifest.webmanifest">/i);
  assert.match(html, /<main id="app-root">/i);
  assert.match(html, /<canvas id="game-canvas"/i);
  assert.match(html, /<div id="ui-root"><\/div>/i);
  assert.match(html, /QUEST: Kentucky/i);
});

test('Worker serves valid PWA Web App Manifest with SVG icons', async () => {
  const req = new Request('http://localhost/manifest.webmanifest');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^application\/manifest\+json/);

  const manifest = await res.json();
  assert.equal(manifest.name, "QUEST: Kentucky — Governor's Cup RPG");
  assert.equal(manifest.short_name, 'QUEST: KY');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.theme_color, '#0F172A');
  assert.ok(Array.isArray(manifest.icons));
  assert.equal(manifest.icons.length, 2);
  assert.equal(manifest.icons[0].sizes, '192x192');
  assert.equal(manifest.icons[1].sizes, '512x512');
});

test('Worker serves PWA Service Worker script', async () => {
  const req = new Request('http://localhost/sw.js');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /^application\/javascript/);

  const swCode = await res.text();
  assert.match(swCode, /CACHE_NAME/);
  assert.match(swCode, /addEventListener\('install'/);
  assert.match(swCode, /addEventListener\('fetch'/);
});

test('Worker serves KAAC Subject Regions metadata', async () => {
  const req = new Request('http://localhost/api/regions');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(Array.isArray(data.regions));
  assert.equal(data.regions.length, 5);

  const subjects = data.regions.map(r => r.id);
  assert.ok(subjects.includes('math'));
  assert.ok(subjects.includes('science'));
  assert.ok(subjects.includes('social_studies'));
  assert.ok(subjects.includes('language_arts'));
  assert.ok(subjects.includes('arts_humanities'));
});

test('Worker serves Starter Quests endpoint (/api/quests)', async () => {
  const req = new Request('http://localhost/api/quests');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(Array.isArray(data.quests));
  assert.equal(data.quests.length, 5);
  assert.equal(data.quests[0].subjectId, 'math');
});

test('Worker serves single-player dungeon encounters without answer keys (/api/encounters)', async () => {
  const req = new Request('http://localhost/api/encounters');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.dungeon, 'The Verdant Sanctuary');
  assert.equal(data.encounters.length, 5);

  // Check answer key secrecy: no question in encounters contains answerKey
  for (const enc of data.encounters) {
    if (enc.question) {
      assert.strictEqual('answerKey' in enc.question, false, 'Client encounters payload must not leak answerKey');
      assert.ok(enc.question.choices.length === 4);
    }
  }
});

test('Worker validates answer submission authoritatively (/api/answers)', async () => {
  // Submit correct answer for syn_sci_001 ('b')
  const reqCorrect = new Request('http://localhost/api/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId: 'syn_sci_001', selectedChoiceId: 'b' }),
  });
  const resCorrect = await worker.fetch(reqCorrect, {}, {});
  assert.equal(resCorrect.status, 200);

  const dataCorrect = await resCorrect.json();
  assert.equal(dataCorrect.accepted, true);
  assert.equal(dataCorrect.correct, true);
  assert.ok(dataCorrect.explanation.includes('Chloroplasts'));

  // Submit incorrect answer for syn_sci_001 ('a')
  const reqWrong = new Request('http://localhost/api/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questionId: 'syn_sci_001', selectedChoiceId: 'a' }),
  });
  const resWrong = await worker.fetch(reqWrong, {}, {});
  const dataWrong = await resWrong.json();
  assert.equal(dataWrong.accepted, true);
  assert.equal(dataWrong.correct, false);
});

test('Worker issues pseudonymous guest session tokens', async () => {
  const req = new Request('http://localhost/api/session');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.guestId);
  assert.equal(data.gradeBand, '6-8');
  assert.equal(data.authenticated, false);
});

test('Worker delivers sanitized rights-approved public questions (/api/questions)', async () => {
  const req = new Request('http://localhost/api/questions?subject=science');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.count > 0);
  assert.equal(data.questions.length, data.count);

  for (const q of data.questions) {
    assert.equal(q.subject, 'science');
    assert.equal(q.active, true);
    assert.equal(q.rightsStatus, 'approved');
    assert.strictEqual('answerKey' in q, false, 'Public question payload MUST NOT leak answerKey');
  }
});

test('Worker validates staging questions and detects duplicates (/api/questions/validate)', async () => {
  const validCandidate = {
    id: 'staging_sci_099',
    subject: 'science',
    conceptIds: ['science.earth'],
    gradeBand: '6-8',
    prompt: 'What sedimentary rock is most commonly dissolved to form karst sinkholes?',
    choices: [
      { id: 'a', text: 'Limestone' },
      { id: 'b', text: 'Granite' },
      { id: 'c', text: 'Basalt' },
      { id: 'd', text: 'Shale' },
    ],
    answerKey: 'a',
    explanation: 'Limestone dissolves in acidic water forming caves and sinkholes.',
    difficulty: 2,
    source: { type: 'original', author: 'KY Geologist', rightsStatus: 'approved' },
    rightsStatus: 'approved',
    active: true,
  };

  const req = new Request('http://localhost/api/questions/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question: validCandidate }),
  });
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.valid, true);
  assert.equal(data.results[0].id, 'staging_sci_099');
});

test('Worker restricts question imports to authorized reviewer roles and enforces rights gate (/api/questions/import)', async () => {
  const testQuestion = {
    id: 'import_math_001',
    subject: 'math',
    conceptIds: ['math.algebra'],
    gradeBand: '6-8',
    prompt: 'What is the value of 2x + 5 when x = 4?',
    choices: [
      { id: 'a', text: '13' },
      { id: 'b', text: '14' },
      { id: 'c', text: '15' },
      { id: 'd', text: '16' },
    ],
    answerKey: 'a',
    explanation: '2(4) + 5 = 8 + 5 = 13.',
    difficulty: 1,
    source: { type: 'original', author: 'Math Coach', rightsStatus: 'approved' },
    rightsStatus: 'approved',
    active: true,
  };

  // 1. Unauthorized request without reviewer header should return 403 Forbidden
  const reqUnauth = new Request('http://localhost/api/questions/import', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ questions: [testQuestion] }),
  });
  const resUnauth = await worker.fetch(reqUnauth, {}, {});
  assert.equal(resUnauth.status, 403);

  // 2. Authorized request with X-Reviewer-Role: content_admin
  const reqAuth = new Request('http://localhost/api/questions/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Reviewer-Role': 'content_admin',
    },
    body: JSON.stringify({ questions: [testQuestion] }),
  });
  const resAuth = await worker.fetch(reqAuth, {}, {});
  assert.equal(resAuth.status, 200);

  const dataAuth = await resAuth.json();
  assert.equal(dataAuth.success, true);
  assert.equal(dataAuth.importedCount, 1);
});

test('Worker enforces idempotency on answer submissions (/api/answers)', async () => {
  const idempotencyKey = 'req_test_idem_001';
  const payload = {
    sessionId: 'test_session_guest_1',
    questionId: 'syn_sci_001',
    selectedChoiceId: 'b',
    idempotencyKey,
  };

  // First submission
  const req1 = new Request('http://localhost/api/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const res1 = await worker.fetch(req1, {}, {});
  assert.equal(res1.status, 200);
  const data1 = await res1.json();
  assert.equal(data1.accepted, true);
  assert.equal(data1.correct, true);

  // Second submission with exact same idempotencyKey should return cached response
  const req2 = new Request('http://localhost/api/answers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const res2 = await worker.fetch(req2, {}, {});
  assert.equal(res2.status, 200);
  const data2 = await res2.json();
  assert.deepEqual(data2, data1);
});

test('Worker serves student concept mastery progress (/api/progress)', async () => {
  const req = new Request('http://localhost/api/progress?userId=student_test_progress');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.userId, 'student_test_progress');
  assert.equal(typeof data.totalMastered, 'number');
  assert.equal(typeof data.activeDueCount, 'number');
  assert.ok(data.progress);
  assert.ok(data.progress.math);
  assert.ok(data.progress.science);
  assert.ok(data.progress.social_studies);
  assert.ok(data.progress.language_arts);
  assert.ok(data.progress.arts_humanities);
});

test('Worker serves spaced repetition due reviews endpoint (/api/review/due)', async () => {
  const req = new Request('http://localhost/api/review/due?userId=student_test_due');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.userId, 'student_test_due');
  assert.equal(typeof data.count, 'number');
  assert.ok(Array.isArray(data.dueConcepts));
  assert.ok(Array.isArray(data.eligibleQuestions));
});


