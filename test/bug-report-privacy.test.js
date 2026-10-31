/**
 * P1-18 (Q9) — 버그 리포트 admin_note는 관리자 내부 전용
 * - 제보자 응답(POST 접수, GET /mine, GET /mine/:id)에 admin_note 필드가 없다 (SELECT·응답 모두)
 * - 관리자 응답(GET /api/bug-reports/:id)에는 그대로 있다
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const pusherPath = require.resolve(path.join(__dirname, '..', 'controllers', '_shared', 'pusher.js'));
require.cache[pusherPath] = { id: pusherPath, filename: pusherPath, loaded: true, exports: { trigger: async () => {} } };

const { TEST_JWT_SECRET, installDbMock, makeReq, makeRes, makeSql, signTestToken, withEnv } = require('./helpers/http-mocks');

const db = installDbMock();
const router = require('../api/index');

const USER_ID = 'efefefef-efef-4fef-8fef-efefefefefef';
const ENV = { JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined };

// DB가 admin_note를 돌려주더라도(쿼리 회귀) 제보자 응답에서는 빠져야 한다
const ROW = {
  id: 12, title: 't', description: 'd', severity: 'normal', status: 'open', cause: '원인', action_taken: '조치',
  page_url: '/x', created_at: '2026-10-31T00:00:00Z', updated_at: '2026-10-31T00:00:00Z',
  admin_note: 'DUMMY 내부 메모 — 제보자에게 보이면 안 됨',
};

async function call(method, url, role = 'user', body) {
  const calls = [];
  db.setSql(makeSql([
    {
      match: /SELECT id, username, email, role, is_active, must_change_password\s+FROM users/,
      rows: [{ id: USER_ID, username: 'reporter', email: 'r@x.test', role, is_active: true, must_change_password: false }],
    },
    { match: /COUNT\(\*\)::int AS count FROM bug_reports/, rows: [{ count: 0 }] },
    { match: /INSERT INTO bug_reports/, rows: [{ ...ROW, reporter_name: 'reporter', reporter_email: 'r@x.test', reporter_user_id: USER_ID }] },
    { match: /FROM bug_reports/, rows: [ROW] },
  ], calls));
  const res = makeRes();
  const origError = console.error;
  console.error = () => {};
  try {
    await withEnv(ENV, () => router(makeReq({
      method, url, body,
      cookies: { auth_token: signTestToken({ sub: USER_ID, role, mustChangePw: false }) },
    }), res));
  } finally {
    console.error = origError;
  }
  const selects = calls.filter((c) => /FROM bug_reports/.test(c.text) && !/COUNT/.test(c.text));
  return { res, selects };
}

test('GET /api/bug-reports/mine 응답에 admin_note가 없다', async () => {
  const r = await call('GET', '/api/bug-reports/mine');
  assert.equal(r.res.statusCode, 200);
  assert.equal(r.res.body.reports.length, 1);
  assert.equal('admin_note' in r.res.body.reports[0], false);
  assert.equal(r.res.body.reports[0].cause, '원인', '제보자 공개 답변(cause·action_taken)은 유지');
  assert.doesNotMatch(r.selects[0].text, /admin_note/, 'SELECT에서도 제외');
});

test('GET /api/bug-reports/mine/:id 응답에 admin_note가 없다', async () => {
  const r = await call('GET', '/api/bug-reports/mine/12');
  assert.equal(r.res.statusCode, 200);
  assert.equal('admin_note' in r.res.body.report, false);
  assert.equal(r.res.body.report.action_taken, '조치');
  assert.doesNotMatch(r.selects[0].text, /admin_note/);
});

test('POST /api/bug-reports 접수 응답에 admin_note가 없다', async () => {
  const r = await call('POST', '/api/bug-reports', 'user', { title: 't', description: 'd' });
  assert.equal(r.res.statusCode, 201);
  assert.equal('admin_note' in r.res.body.report, false);
  assert.equal(r.res.body.report.id, 12);
});

test('관리자 상세 조회에는 admin_note가 있다', async () => {
  const r = await call('GET', '/api/bug-reports/12', 'admin');
  assert.equal(r.res.statusCode, 200);
  assert.equal(r.res.body.report.admin_note, ROW.admin_note);
});
