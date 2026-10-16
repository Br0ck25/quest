// tests/contract/worker.test.js — Baseline smoke test for generated worker
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../../worker.js';

test('Worker health route returns ok', async () => {
  const req = new Request('http://localhost/api/health');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(data.status, 'ok');
  assert.equal(data.game, 'QUEST: Kentucky');
});

test('Worker root returns HTML with viewport configuration', async () => {
  const req = new Request('http://localhost/');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<meta name="viewport"/i);
  assert.match(html, /QUEST: Kentucky/i);
});
