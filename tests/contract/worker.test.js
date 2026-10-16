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
  assert.equal(data.phase, 2);
  assert.equal(data.mode, 'single-player-vertical-slice');
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
