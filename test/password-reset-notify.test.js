/**
 * P1-14 — 비밀번호 재설정 요청 시 관리자 알림
 * - 새 대기 요청을 만들었을 때만 notifications INSERT(type=password_reset_request, target_role=admin)
 *   + Pusher private-notifications-admin 'new-notification' 1회
 * - 이미 대기 요청이 있거나 없는 아이디면 알림 없음, 응답은 항상 같은 200
 * - 알림/Pusher 실패는 무시(요청은 성공)
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Pusher 목 — 컨트롤러가 로드되기 전에 require 캐시를 바꾼다
const triggers = [];
let triggerError = null;
const pusherPath = require.resolve(path.join(__dirname, '..', 'controllers', '_shared', 'pusher.js'));
require.cache[pusherPath] = {
  id: pusherPath,
  filename: pusherPath,
  loaded: true,
  exports: {
    trigger: async (channel, event, payload) => {
      if (triggerError) throw triggerError;
      triggers.push({ channel, event, payload });
    },
  },
};

const { TEST_JWT_SECRET, installDbMock, makeReq, makeRes, makeSql, withEnv } = require('./helpers/http-mocks');

const db = installDbMock();
const router = require('../api/index');

const USER_ID = 'cdcdcdcd-cdcd-4dcd-8dcd-cdcdcdcdcdcd';
const ENV = { JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined };

async function requestReset({ userExists = true, inserted = true, notifError = null } = {}) {
  triggers.length = 0;
  const calls = [];
  db.setSql(makeSql([
    { match: /SELECT id FROM users WHERE username/, rows: userExists ? [{ id: USER_ID }] : [] },
    { match: /INSERT INTO password_reset_requests/, rows: inserted ? [{ id: 'req-1' }] : [] },
    { match: /INSERT INTO notifications/, rows: () => notifError || [{ id: 77, type: 'password_reset_request', title: '비밀번호 재설정 요청', body: 'tester 님이 비밀번호 재설정을 요청했습니다.', created_at: '2026-10-31T00:00:00Z' }] },
    { match: /SELECT COUNT\(\*\)::int AS count\s+FROM notifications/, rows: [{ count: 3 }] },
  ], calls));
  const res = makeRes();
  const origError = console.error;
  console.error = () => {};
  try {
    await withEnv(ENV, () => router(makeReq({ method: 'POST', url: '/api/password-reset-request', body: { username: 'tester' } }), res));
  } finally {
    console.error = origError;
  }
  const notifInsert = calls.find((c) => /INSERT INTO notifications/.test(c.text));
  return { res, calls, notifInsert };
}

test('새 재설정 요청 → admin 알림 INSERT + Pusher new-notification 1회', async () => {
  const r = await requestReset();
  assert.equal(r.res.statusCode, 200);
  assert.equal(r.res.body.ok, true);
  assert.ok(r.notifInsert, '알림 INSERT 실행');
  assert.match(r.notifInsert.text, /'password_reset_request'/);
  assert.match(r.notifInsert.text, /'admin'/);
  assert.deepEqual(r.notifInsert.values, ['req-1', 'tester 님이 비밀번호 재설정을 요청했습니다.']);
  assert.equal(triggers.length, 1);
  assert.equal(triggers[0].channel, 'private-notifications-admin');
  assert.equal(triggers[0].event, 'new-notification');
  assert.equal(triggers[0].payload.type, 'password_reset_request');
  assert.equal(triggers[0].payload.unread_count, 3);
});

test('이미 대기 요청이 있으면 알림을 다시 만들지 않는다 (응답 동일)', async () => {
  const fresh = await requestReset();
  const dup = await requestReset({ inserted: false });
  assert.equal(dup.notifInsert, undefined);
  assert.equal(triggers.length, 0);
  assert.deepEqual(dup.res.body, fresh.res.body);
});

test('없는 아이디는 알림 없음 + 같은 응답 (열거 방지)', async () => {
  const fresh = await requestReset();
  const missing = await requestReset({ userExists: false });
  assert.equal(missing.notifInsert, undefined);
  assert.equal(triggers.length, 0);
  assert.equal(missing.res.statusCode, 200);
  assert.deepEqual(missing.res.body, fresh.res.body);
});

test('알림 INSERT·Pusher 실패는 무시하고 요청은 성공', async () => {
  const dbFail = await requestReset({ notifError: new Error('DUMMY notifications down') });
  assert.equal(dbFail.res.statusCode, 200);
  assert.equal(dbFail.res.body.ok, true);
  assert.equal(triggers.length, 0);

  triggerError = new Error('DUMMY pusher down');
  try {
    const pushFail = await requestReset();
    assert.equal(pushFail.res.statusCode, 200);
    assert.equal(pushFail.res.body.ok, true);
  } finally {
    triggerError = null;
  }
});
