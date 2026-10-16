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
  assert.equal(data.phase, 9);
  assert.equal(data.mode, 'content-review');
  assert.equal(data.adminReview, true);
});

test('Worker accessibility route returns WCAG AA compliance metadata', async () => {
  const req = new Request('http://localhost/api/accessibility');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'application/json');

  const data = await res.json();
  assert.equal(data.minTouchTargetPx, 48);
  assert.equal(data.wcagStandard, 'WCAG 2.1 AA');
  assert.deepEqual(data.textScales, ['normal', 'large', 'xlarge']);
  assert.equal(data.untimedPractice, true);
  assert.equal(data.reducedMotion, true);
  assert.equal(data.highContrastMode, true);
  assert.equal(data.targetViewports.length, 5);
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

test('Worker serves player progression endpoint (/api/progression)', async () => {
  const req = new Request('http://localhost/api/progression?userId=player_prog_contract_test');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.userId, 'player_prog_contract_test');
  assert.equal(data.level, 1);
  assert.equal(data.xp, 0);
  assert.equal(data.coins, 50);
  assert.equal(data.equippedCompanionId, 'companion_cardinal');
  assert.equal(data.nextLevelXp, 100);
});

test('Worker serves inventory and cosmetic catalog (/api/inventory)', async () => {
  const req = new Request('http://localhost/api/inventory?userId=player_inv_contract_test');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.userId, 'player_inv_contract_test');
  assert.ok(Array.isArray(data.inventory));
  assert.ok(Array.isArray(data.cosmeticCatalog));
  assert.ok(data.inventory.some((i) => i.id === 'companion_cardinal'));
});

test('Worker equips cosmetic item (/api/inventory/equip)', async () => {
  const req = new Request('http://localhost/api/inventory/equip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'player_inv_contract_test',
      itemId: 'companion_cardinal',
      slot: 'companion',
    }),
  });
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.equipped, true);
});

test('Worker handles cosmetic purchase with gold (/api/inventory/buy)', async () => {
  // First give coins or buy an item within balance (e.g. item_derby_cap cost 50, starter gold is 50)
  const req = new Request('http://localhost/api/inventory/buy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId: 'player_buy_test_' + Math.random().toString(36).substring(2, 6),
      itemId: 'item_derby_cap',
      idempotencyKey: 'buy_key_' + Math.random().toString(36).substring(2, 8),
    }),
  });
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.purchasedItem.id, 'item_derby_cap');
  assert.equal(data.newBalance, 0); // 50 - 50 = 0
});

test('Worker claims quest completion reward idempotently (/api/quests/claim)', async () => {
  const userId = 'player_quest_claim_test_' + Math.random().toString(36).substring(2, 6);
  const req = new Request('http://localhost/api/quests/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      questId: 'quest_math_01',
      idempotencyKey: 'claim_key_' + Math.random().toString(36).substring(2, 8),
    }),
  });
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.equal(data.success, true);
  assert.equal(data.rewardXp, 150);
  assert.equal(data.rewardGold, 25);
  assert.equal(data.xp, 150);
  assert.equal(data.level, 2);
  assert.equal(data.coins, 75); // 50 + 25 = 75
});

test('Worker serves multiplayer preset emotes list (/api/rooms/emotes)', async () => {
  const req = new Request('http://localhost/api/rooms/emotes');
  const res = await worker.fetch(req, {}, {});
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(Array.isArray(data.emotes));
  assert.ok(data.emotes.some((e) => e.id === 'cheer'));
  assert.ok(data.emotes.some((e) => e.id === 'ready'));
});

test('Worker creates, joins, readies, and manages co-op room lifecycle', async () => {
  const hostId = 'player_host_' + Math.random().toString(36).substring(2, 6);
  const guestId = 'player_guest_' + Math.random().toString(36).substring(2, 6);

  // 1. Create Room
  const createReq = new Request('http://localhost/api/rooms/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostId, hostHandle: 'BluegrassHost' }),
  });
  const createRes = await worker.fetch(createReq, {}, {});
  assert.equal(createRes.status, 200);
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  assert.ok(createData.room.code.startsWith('KY-'));
  assert.equal(createData.room.status, 'LOBBY');
  assert.equal(createData.room.players.length, 1);

  const roomCode = createData.room.code;

  // 2. Join Room
  const joinReq = new Request('http://localhost/api/rooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: roomCode, userId: guestId, handle: 'CardinalAlly' }),
  });
  const joinRes = await worker.fetch(joinReq, {}, {});
  assert.equal(joinRes.status, 200);
  const joinData = await joinRes.json();
  assert.equal(joinData.success, true);
  assert.equal(joinData.room.players.length, 2);

  // 3. Guest toggles ready
  const readyReq = new Request('http://localhost/api/rooms/ready', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: roomCode, userId: guestId, ready: true }),
  });
  const readyRes = await worker.fetch(readyReq, {}, {});
  assert.equal(readyRes.status, 200);
  const readyData = await readyRes.json();
  assert.equal(readyData.success, true);
  const guestPlayer = readyData.room.players.find((p) => p.userId === guestId);
  assert.equal(guestPlayer.ready, true);

  // 4. Host starts encounter
  const startReq = new Request('http://localhost/api/rooms/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: roomCode, userId: hostId }),
  });
  const startRes = await worker.fetch(startReq, {}, {});
  assert.equal(startRes.status, 200);
  const startData = await startRes.json();
  assert.equal(startData.success, true);
  assert.equal(startData.room.status, 'ENCOUNTER');
  assert.ok(startData.room.question);
  assert.equal('answerKey' in startData.room.question, false, 'Answer key must not be exposed');

  // 5. Submit answer
  const answerReq = new Request('http://localhost/api/rooms/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: roomCode,
      userId: hostId,
      choiceId: startData.room.question.choices[0].id,
      idempotencyKey: 'idem_coop_' + Math.random().toString(36).substring(2, 8),
    }),
  });
  const answerRes = await worker.fetch(answerReq, {}, {});
  assert.equal(answerRes.status, 200);
  const answerData = await answerRes.json();
  assert.equal(answerData.success, true);
  assert.equal(typeof answerData.verdict.isCorrect, 'boolean');

  // 6. Send preset emote
  const emoteReq = new Request('http://localhost/api/rooms/emote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: roomCode, userId: guestId, emoteId: 'high_five' }),
  });
  const emoteRes = await worker.fetch(emoteReq, {}, {});
  assert.equal(emoteRes.status, 200);
  const emoteData = await emoteRes.json();
  assert.equal(emoteData.success, true);
  assert.equal(emoteData.broadcastData.emote.id, 'high_five');

  // 7. Get status
  const statusReq = new Request(`http://localhost/api/rooms/status?code=${roomCode}`);
  const statusRes = await worker.fetch(statusReq, {}, {});
  assert.equal(statusRes.status, 200);
  const statusData = await statusRes.json();
  assert.equal(statusData.success, true);
  assert.equal(statusData.room.code, roomCode);
});

test('Worker blocks brute force guessing of room codes with 429 status', async () => {
  const suspectIp = '198.51.100.' + Math.floor(Math.random() * 200);

  // 5 failed guesses
  for (let i = 0; i < 5; i++) {
    const req = new Request('http://localhost/api/rooms/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': suspectIp },
      body: JSON.stringify({ code: 'KY-0000', userId: 'suspect_user', handle: 'Suspect' }),
    });
    const res = await worker.fetch(req, {}, {});
    assert.equal(res.status, 400);
  }

  // 6th guess is rate limited with 429
  const blockedReq = new Request('http://localhost/api/rooms/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': suspectIp },
    body: JSON.stringify({ code: 'KY-0000', userId: 'suspect_user', handle: 'Suspect' }),
  });
  const blockedRes = await worker.fetch(blockedReq, {}, {});
  assert.equal(blockedRes.status, 429);
  const blockedData = await blockedRes.json();
  assert.equal(blockedData.rateLimited, true);
});

test('Worker handles 1v1 duel match lifecycle, delayed reveal, and post-match recap', async () => {
  const hostId = 'duel_host_' + Math.random().toString(36).substring(2, 6);
  const challengerId = 'duel_chal_' + Math.random().toString(36).substring(2, 6);

  // 1. Create Duel
  const createReq = new Request('http://localhost/api/duels/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hostId, hostHandle: 'HostScholar' }),
  });
  const createRes = await worker.fetch(createReq, {}, {});
  assert.equal(createRes.status, 200);
  const createData = await createRes.json();
  assert.equal(createData.success, true);
  assert.ok(createData.match.code.startsWith('DUEL-'));
  assert.equal(createData.match.status, 'LOBBY');

  const duelCode = createData.match.code;

  // 2. Join Duel
  const joinReq = new Request('http://localhost/api/duels/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: duelCode, userId: challengerId, handle: 'ChallengerScholar' }),
  });
  const joinRes = await worker.fetch(joinReq, {}, {});
  assert.equal(joinRes.status, 200);
  const joinData = await joinRes.json();
  assert.equal(joinData.success, true);
  assert.equal(joinData.match.player2.userId, challengerId);

  // 3. Challenger readies up
  const readyReq = new Request('http://localhost/api/duels/ready', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: duelCode, userId: challengerId, ready: true }),
  });
  const readyRes = await worker.fetch(readyReq, {}, {});
  assert.equal(readyRes.status, 200);

  // 4. Host starts duel
  const startReq = new Request('http://localhost/api/duels/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: duelCode, userId: hostId }),
  });
  const startRes = await worker.fetch(startReq, {}, {});
  assert.equal(startRes.status, 200);
  const startData = await startRes.json();
  assert.equal(startData.match.status, 'IN_PROGRESS');
  assert.ok(startData.match.question);
  assert.equal('answerKey' in startData.match.question, false, 'Client must not see answerKey');

  // 5. Host answers (waiting for opponent, answer key remains hidden)
  const hostChoice = startData.match.question.choices[0].id;
  const answer1Req = new Request('http://localhost/api/duels/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: duelCode,
      userId: hostId,
      choiceId: hostChoice,
      timeElapsedMs: 4000,
      idempotencyKey: 'idem_d1_' + Math.random().toString(36).substring(2, 8),
    }),
  });
  const answer1Res = await worker.fetch(answer1Req, {}, {});
  assert.equal(answer1Res.status, 200);
  const answer1Data = await answer1Res.json();
  assert.equal(answer1Data.verdict.bothSubmitted, false);
  assert.equal(answer1Data.verdict.waitingForOpponent, true);

  // 6. Challenger answers (triggers round evaluation and delayed reveal)
  // Retrieve challenger's choice order
  const chalStatusReq = new Request(`http://localhost/api/duels/status?code=${duelCode}&userId=${challengerId}`);
  const chalStatusRes = await worker.fetch(chalStatusReq, {}, {});
  const chalStatusData = await chalStatusRes.json();
  const chalChoice = chalStatusData.match.question.choices[0].id;

  const answer2Req = new Request('http://localhost/api/duels/answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: duelCode,
      userId: challengerId,
      choiceId: chalChoice,
      timeElapsedMs: 5000,
      idempotencyKey: 'idem_d2_' + Math.random().toString(36).substring(2, 8),
    }),
  });
  const answer2Res = await worker.fetch(answer2Req, {}, {});
  assert.equal(answer2Res.status, 200);
  const answer2Data = await answer2Res.json();
  assert.equal(answer2Data.verdict.bothSubmitted, true);
  assert.ok(answer2Data.verdict.roundResult);
  assert.equal(answer2Data.verdict.roundResult.revealed, true);

  // 7. Advance to next round
  const nextReq = new Request('http://localhost/api/duels/next-round', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: duelCode, userId: hostId }),
  });
  const nextRes = await worker.fetch(nextReq, {}, {});
  assert.equal(nextRes.status, 200);
  const nextData = await nextRes.json();
  assert.equal(nextData.success, true);

  // 8. Send emote
  const emoteReq = new Request('http://localhost/api/duels/emote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: duelCode, userId: hostId, emoteId: 'cheer' }),
  });
  const emoteRes = await worker.fetch(emoteReq, {}, {});
  assert.equal(emoteRes.status, 200);
  const emoteData = await emoteRes.json();
  assert.equal(emoteData.broadcastData.emote.id, 'cheer');

  // 9. Fetch recap
  const recapReq = new Request(`http://localhost/api/duels/recap?code=${duelCode}`);
  const recapRes = await worker.fetch(recapReq, {}, {});
  assert.equal(recapRes.status, 200);
  const recapData = await recapRes.json();
  assert.equal(recapData.success, true);
  assert.ok(recapData.recap.player1);
  assert.ok(recapData.recap.player2);
});

test('Worker blocks brute force guessing of duel codes with 429 status', async () => {
  const suspectIp = '198.51.101.' + Math.floor(Math.random() * 200);

  // 5 failed guesses
  for (let i = 0; i < 5; i++) {
    const req = new Request('http://localhost/api/duels/join', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': suspectIp },
      body: JSON.stringify({ code: 'DUEL-0000', userId: 'suspect_duelist', handle: 'Suspect' }),
    });
    const res = await worker.fetch(req, {}, {});
    assert.equal(res.status, 400);
  }

  // 6th guess is rate limited with 429
  const blockedReq = new Request('http://localhost/api/duels/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'cf-connecting-ip': suspectIp },
    body: JSON.stringify({ code: 'DUEL-0000', userId: 'suspect_duelist', handle: 'Suspect' }),
  });
  const blockedRes = await worker.fetch(blockedReq, {}, {});
  assert.equal(blockedRes.status, 429);
  const blockedData = await blockedRes.json();
  assert.equal(blockedData.rateLimited, true);
});

test('Worker enforces role-based access control on /api/admin/questions', async () => {
  // 1. Missing role returns 403
  const noRoleReq = new Request('http://localhost/api/admin/questions');
  const noRoleRes = await worker.fetch(noRoleReq, {}, {});
  assert.equal(noRoleRes.status, 403);
  const noRoleData = await noRoleRes.json();
  assert.match(noRoleData.error, /Forbidden: Requires authorized reviewer role/);

  // 2. Student role returns 403
  const studentReq = new Request('http://localhost/api/admin/questions', {
    headers: { 'x-reviewer-role': 'student' },
  });
  const studentRes = await worker.fetch(studentReq, {}, {});
  assert.equal(studentRes.status, 403);

  // 3. Authorized reviewer role succeeds with 200
  const reviewerReq = new Request('http://localhost/api/admin/questions', {
    headers: { 'x-reviewer-role': 'reviewer' },
  });
  const reviewerRes = await worker.fetch(reviewerReq, {}, {});
  assert.equal(reviewerRes.status, 200);
  const data = await reviewerRes.json();
  assert.ok(data.count > 0);
  assert.ok(Array.isArray(data.questions));
  // Reviewer can see answerKey
  assert.ok(data.questions[0].answerKey);
});

test('Worker maintains Answer Key Secrecy: public endpoints omit answerKey while admin endpoint provides it', async () => {
  // Public question delivery
  const publicReq = new Request('http://localhost/api/questions');
  const publicRes = await worker.fetch(publicReq, {}, {});
  const publicData = await publicRes.json();
  for (const q of publicData.questions) {
    assert.equal(q.answerKey, undefined, 'Public questions must NEVER leak answerKey');
  }

  // Admin question inspection
  const targetId = publicData.questions[0].id;
  const adminReq = new Request(`http://localhost/api/admin/questions/${targetId}`, {
    headers: { 'x-reviewer-role': 'content_admin' },
  });
  const adminRes = await worker.fetch(adminReq, {}, {});
  assert.equal(adminRes.status, 200);
  const adminData = await adminRes.json();
  assert.ok(adminData.question.answerKey, 'Authorized reviewer must receive full answerKey for verification');
  assert.ok(Array.isArray(adminData.duplicateWarnings));
});

test('Worker handles question review actions: approve, correct, and retire with audit trail', async () => {
  const targetId = 'syn_sci_001';

  // 1. Approve
  const approveReq = new Request(`http://localhost/api/admin/questions/${targetId}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-reviewer-role': 'reviewer', 'x-reviewer-id': 'rev_test' },
    body: JSON.stringify({ note: 'Passed KAAC review' }),
  });
  const approveRes = await worker.fetch(approveReq, {}, {});
  assert.equal(approveRes.status, 200);
  const approveData = await approveRes.json();
  assert.equal(approveData.success, true);
  assert.equal(approveData.question.reviewStatus, 'approved');

  // 2. Correct and bump version
  const correctReq = new Request(`http://localhost/api/admin/questions/${targetId}/correct`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-reviewer-role': 'content_admin', 'x-reviewer-id': 'rev_admin' },
    body: JSON.stringify({
      updates: { explanation: 'Updated explanation with complete mathematical derivation.' },
      note: 'Added proof steps',
    }),
  });
  const correctRes = await worker.fetch(correctReq, {}, {});
  assert.equal(correctRes.status, 200);
  const correctData = await correctRes.json();
  assert.equal(correctData.success, true);
  assert.ok(correctData.newVersion >= 2);

  // 3. Retire
  const retireReq = new Request(`http://localhost/api/admin/questions/${targetId}/retire`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-reviewer-role': 'super_admin', 'x-reviewer-id': 'rev_super' },
    body: JSON.stringify({ reason: 'Replaced with 2027 standard item' }),
  });
  const retireRes = await worker.fetch(retireReq, {}, {});
  assert.equal(retireRes.status, 200);
  const retireData = await retireRes.json();
  assert.equal(retireData.success, true);
  assert.equal(retireData.question.active, false);
  assert.equal(retireData.question.reviewStatus, 'retired');

  // 4. Retrieve audit history
  const historyReq = new Request(`http://localhost/api/admin/questions/${targetId}/history`, {
    headers: { 'x-reviewer-role': 'reviewer' },
  });
  const historyRes = await worker.fetch(historyReq, {}, {});
  assert.equal(historyRes.status, 200);
  const historyData = await historyRes.json();
  assert.ok(historyData.history.length >= 3);
  const actions = historyData.history.map((h) => h.action);
  assert.ok(actions.includes('approve'));
  assert.ok(actions.includes('correct'));
  assert.ok(actions.includes('retire'));
});





