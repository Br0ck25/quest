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
  assert.equal(data.phase, 1);
  assert.equal(data.mode, 'guest-first');
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

test('Worker issues pseudonymous guest session tokens', async () => {
  const req = new Request('http://localhost/api/session');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.guestId);
  assert.equal(data.gradeBand, '6-8');
  assert.equal(data.authenticated, false);
});
