/**
 * D-6 — 비밀번호 재설정 요청의 응답 시간으로 계정 존재가 드러나지 않아야 한다
 * - 있는 계정(INSERT·감사 로그·알림 INSERT·Pusher를 기다림)과 없는 계정(SELECT 1건)의 응답이
 *   모두 요청 시작부터 MIN_RESPONSE_MS 이상 걸리고, 둘의 차이가 작아야 한다
 * - 지연은 응답 전에 await한다(응답 후 남은 작업 없음 — 서버리스에서 끊기지 않게)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Pusher 목 — 실제 네트워크 대신 일정 지연을 준다 (있는 계정 경로가 더 오래 걸리는 상황 재현)
const PUSHER_DELAY_MS = 120;
const pusherPath = require.resolve(path.join(__dirname, '..', 'controllers', '_shared', 'pusher.js'));
require.cache[pusherPath] = {
  id: pusherPath,
  filename: pusherPath,
  loaded: true,
  exports: { trigger: () => new Promise((resolve) => setTimeout(resolve, PUSHER_DELAY_MS)) },
};

const { TEST_JWT_SECRET, installDbMock, makeReq, makeRes, makeSql, withEnv } = require('./helpers/http-mocks');

const db = installDbMock();
const router = require('../api/index');
const controller = require('../controllers/password-reset-request');

const USER_ID = 'efefefef-efef-4fef-8fef-efefefefefef';
const ENV = { JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined };

async function timedRequest({ userExists }) {
  db.setSql(makeSql([
    { match: /SELECT id FROM users WHERE username/, rows: userExists ? [{ id: USER_ID }] : [] },
    { match: /INSERT INTO password_reset_requests/, rows: [{ id: 'req-9' }] },
    { match: /INSERT INTO notifications/, rows: [{ id: 1, type: 'password_reset_request', title: 't', body: 'b', created_at: '2026-11-01T00:00:00Z' }] },
    { match: /SELECT COUNT\(\*\)::int AS count\s+FROM notifications/, rows: [{ count: 1 }] },
  ]));
  const res = makeRes();
  const origError = console.error;
  console.error = () => {};
  const started = Date.now();
  try {
    await withEnv(ENV, () => router(makeReq({ method: 'POST', url: '/api/password-reset-request', body: { username: 'timing-user' } }), res));
  } finally {
    console.error = origError;
  }
  return { res, elapsed: Date.now() - started };
}

test('MIN_RESPONSE_MS 기본값은 Pusher 왕복보다 넉넉하다 (500ms 이상)', () => {
  assert.ok(Number(controller.MIN_RESPONSE_MS) >= 500, `MIN_RESPONSE_MS=${controller.MIN_RESPONSE_MS}`);
});

test('있는 계정·없는 계정 응답 시간이 같은 최소 시간으로 맞춰진다', async () => {
  const original = controller.MIN_RESPONSE_MS;
  controller.MIN_RESPONSE_MS = 300; // 테스트 시간 단축 (Pusher 목 지연 120ms보다 크게)
  try {
    const existing = await timedRequest({ userExists: true });
    const missing = await timedRequest({ userExists: false });
    assert.equal(existing.res.statusCode, 200);
    assert.equal(missing.res.statusCode, 200);
    assert.deepEqual(existing.res.body, missing.res.body);
    assert.ok(existing.elapsed >= 295, `있는 계정 ${existing.elapsed}ms`);
    assert.ok(missing.elapsed >= 295, `없는 계정 ${missing.elapsed}ms`);
    assert.ok(Math.abs(existing.elapsed - missing.elapsed) < 60, `차이 ${existing.elapsed} vs ${missing.elapsed}`);
  } finally {
    controller.MIN_RESPONSE_MS = original;
  }
});

test('빈 아이디·이미 대기 요청이 있는 경우도 최소 시간을 채운다', async () => {
  const original = controller.MIN_RESPONSE_MS;
  controller.MIN_RESPONSE_MS = 200;
  try {
    db.setSql(makeSql([]));
    const res = makeRes();
    const started = Date.now();
    await withEnv(ENV, () => router(makeReq({ method: 'POST', url: '/api/password-reset-request', body: { username: '' } }), res));
    assert.equal(res.statusCode, 200);
    assert.ok(Date.now() - started >= 195);

    db.setSql(makeSql([
      { match: /SELECT id FROM users WHERE username/, rows: [{ id: USER_ID }] },
      { match: /INSERT INTO password_reset_requests/, rows: [] },
    ]));
    const res2 = makeRes();
    const started2 = Date.now();
    await withEnv(ENV, () => router(makeReq({ method: 'POST', url: '/api/password-reset-request', body: { username: 'timing-user' } }), res2));
    assert.equal(res2.statusCode, 200);
    assert.ok(Date.now() - started2 >= 195);
  } finally {
    controller.MIN_RESPONSE_MS = original;
  }
});
