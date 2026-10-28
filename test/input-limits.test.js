/**
 * P0b-04 — signup / password-reset-request / bug-reports / request-history 입력 길이·건수 제한
 * 한도 초과는 DB에 닿기 전에 400 VALIDATION_FAILED로 응답해야 한다.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  TEST_JWT_SECRET,
  installDbMock,
  makeReq,
  makeRes,
  makeSql,
  signTestToken,
  withEnv,
} = require('./helpers/http-mocks');

// Pusher 실제 호출 차단
const pusherPath = require.resolve(path.join(__dirname, '..', 'controllers', '_shared', 'pusher.js'));
require.cache[pusherPath] = { id: pusherPath, filename: pusherPath, loaded: true, exports: { trigger: async () => {} } };

const db = installDbMock();
const router = require('../api/index');
const { INPUT_LIMITS, withinLength } = require('../controllers/_shared/input-limits');

const USER_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const userState = {
  match: /SELECT id, username, email, role, is_active, must_change_password\s+FROM users/,
  rows: [{ id: USER_ID, username: 'tester', email: 't@x.test', role: 'user', is_active: true, must_change_password: false }],
};
const authCookie = () => ({ auth_token: signTestToken({ sub: USER_ID, role: 'user', mustChangePw: false }) });

async function run(reqOptions, handlers = []) {
  const calls = [];
  db.setSql(makeSql(handlers, calls));
  const req = makeReq(reqOptions);
  const res = makeRes();
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    await withEnv(
      { JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined, NODE_ENV: 'development' },
      () => router(req, res),
    );
  } finally {
    console.warn = origWarn;
  }
  return { res, calls };
}

const writes = (calls) => calls.filter((c) => /\b(INSERT|UPDATE|DELETE)\b/.test(c.text));

test('withinLength: null/undefined는 통과, 문자열 길이 기준', () => {
  assert.equal(withinLength(undefined, 1), true);
  assert.equal(withinLength(null, 1), true);
  assert.equal(withinLength('ab', 2), true);
  assert.equal(withinLength('abc', 2), false);
});

// ── signup ─────────────────────────────────────────────
const signupBody = (over = {}) => ({ username: 'newuser', email: 'new@x.test', password: 'DUMMY-pass-1234', ...over });

test('signup: 아이디·이메일·비밀번호 길이 초과는 400, DB 접근 없음', async () => {
  for (const over of [
    { username: 'u'.repeat(INPUT_LIMITS.username + 1) },
    { email: `${'e'.repeat(INPUT_LIMITS.email)}@x.test` },
    { password: 'p'.repeat(INPUT_LIMITS.passwordMax + 1) },
  ]) {
    const { res, calls } = await run({ method: 'POST', url: '/api/signup', body: signupBody(over) });
    assert.equal(res.statusCode, 400, JSON.stringify(Object.keys(over)));
    assert.equal(res.body.error.code, 'VALIDATION_FAILED');
    assert.equal(calls.length, 0);
  }
});

test('signup: 이메일 형식·공백 포함 아이디·문자열이 아닌 값은 400', async () => {
  for (const over of [{ email: 'not-an-email' }, { username: 'a b' }, { username: ['arr'] }]) {
    const { res, calls } = await run({ method: 'POST', url: '/api/signup', body: signupBody(over) });
    assert.equal(res.statusCode, 400);
    assert.equal(calls.length, 0);
  }
});

test('signup: 같은 IP에서 1시간 한도에 도달하면 400, INSERT 없음', async () => {
  const { res, calls } = await run(
    { method: 'POST', url: '/api/signup', body: signupBody(), headers: { 'x-forwarded-for': '203.0.113.5' } },
    [
      { match: /FROM audit_logs/, rows: [{ count: INPUT_LIMITS.signupPerIpPerHour }] },
      { match: /FROM signup_requests WHERE status = 'pending'/, rows: [{ count: 0 }] },
    ],
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  assert.equal(writes(calls).length, 0);
  const ipQuery = calls.find((c) => /FROM audit_logs/.test(c.text));
  assert.deepEqual(ipQuery.values, ['203.0.113.5']);
});

test('signup: 승인 대기 전체 상한에 도달하면 400', async () => {
  const { res, calls } = await run(
    { method: 'POST', url: '/api/signup', body: signupBody() },
    [
      { match: /FROM audit_logs/, rows: [{ count: 0 }] },
      { match: /FROM signup_requests WHERE status = 'pending'/, rows: [{ count: INPUT_LIMITS.signupPendingMax }] },
    ],
  );
  assert.equal(res.statusCode, 400);
  assert.equal(writes(calls).length, 0);
});

test('signup: 한도 안이면 정상 접수(200)', async () => {
  const { res } = await run(
    { method: 'POST', url: '/api/signup', body: signupBody() },
    [
      { match: /FROM audit_logs/, rows: [{ count: 1 }] },
      { match: /COUNT\(\*\)::int AS count FROM signup_requests/, rows: [{ count: 3 }] },
      { match: /INSERT INTO signup_requests/, rows: [{ id: 'req-1' }] },
      { match: /INSERT INTO notifications/, rows: [{ id: 1 }] },
      { match: /FROM notifications/, rows: [{ count: 1 }] },
    ],
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.requestId, 'req-1');
});

// ── password-reset-request ─────────────────────────────
test('password-reset-request: 아이디 길이 초과는 400, DB 접근 없음', async () => {
  const { res, calls } = await run({
    method: 'POST', url: '/api/password-reset-request', body: { username: 'u'.repeat(INPUT_LIMITS.username + 1) },
  });
  assert.equal(res.statusCode, 400);
  assert.equal(calls.length, 0);
});

test('password-reset-request: 대기 중 요청이 있으면 새로 만들지 않고 같은 200 응답', async () => {
  const { res, calls } = await run(
    { method: 'POST', url: '/api/password-reset-request', body: { username: 'tester' } },
    [
      { match: /SELECT id FROM users/, rows: [{ id: USER_ID }] },
      { match: /INSERT INTO password_reset_requests/, rows: [] }, // NOT EXISTS → 0행
    ],
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  const insert = calls.find((c) => /INSERT INTO password_reset_requests/.test(c.text));
  assert.match(insert.text, /WHERE NOT EXISTS/);
  assert.match(insert.text, /status = 'pending'/);
  assert.equal(calls.some((c) => /INSERT INTO audit_logs/.test(c.text)), false);
});

// ── bug-reports ────────────────────────────────────────
test('bug-reports: 제목·설명·페이지 URL 길이 초과는 400, INSERT 없음', async () => {
  for (const over of [
    { title: 't'.repeat(INPUT_LIMITS.bugTitle + 1) },
    { description: 'd'.repeat(INPUT_LIMITS.bugDescription + 1) },
    { page_url: 'u'.repeat(INPUT_LIMITS.bugPageUrl + 1) },
  ]) {
    const { res, calls } = await run(
      { method: 'POST', url: '/api/bug-reports', cookies: authCookie(), body: { title: 't', description: 'd', ...over } },
      [userState],
    );
    assert.equal(res.statusCode, 400, JSON.stringify(Object.keys(over)));
    assert.equal(writes(calls).length, 0);
  }
});

test('bug-reports: 24시간 제보 한도에 도달하면 400, INSERT 없음', async () => {
  const { res, calls } = await run(
    { method: 'POST', url: '/api/bug-reports', cookies: authCookie(), body: { title: 't', description: 'd' } },
    [userState, { match: /FROM bug_reports\s+WHERE reporter_user_id/, rows: [{ count: INPUT_LIMITS.bugReportsPerUserPerDay }] }],
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  assert.equal(writes(calls).length, 0);
});

test('bug-reports: 관리자 답변 필드 길이 초과는 400, UPDATE 없음', async () => {
  const admin = { ...userState, rows: [{ ...userState.rows[0], role: 'admin' }] };
  const { res, calls } = await run(
    {
      method: 'POST', url: '/api/bug-reports/1/update',
      cookies: { auth_token: signTestToken({ sub: USER_ID, role: 'admin', mustChangePw: false }) },
      body: { cause: 'c'.repeat(INPUT_LIMITS.bugAdminText + 1) },
    },
    [admin],
  );
  assert.equal(res.statusCode, 400);
  assert.equal(writes(calls).length, 0);
});

// ── request-history ────────────────────────────────────
const entry = (over = {}) => ({ id: '1700000000000', name: 'n', method: 'GET', savedAt: 1700000000000, ...over });

test('request-history: 길이·항목 수·형식 위반은 400, INSERT 없음', async () => {
  for (const over of [
    { name: 'n'.repeat(INPUT_LIMITS.historyName + 1) },
    { body: 'b'.repeat(INPUT_LIMITS.historyBody + 1) },
    { url: 'u'.repeat(INPUT_LIMITS.historyUrl + 1) },
    { headers: Array.from({ length: INPUT_LIMITS.historyParamItems + 1 }, () => ({ key: 'k', value: 'v' })) },
    { queryParams: [{ key: 'k', value: 'v'.repeat(INPUT_LIMITS.historyParamsJson) }] },
    { pathParams: 'not-array' },
    { response: { big: 'r'.repeat(INPUT_LIMITS.historyResponseJson) } },
    { savedAt: 'yesterday' },
    { method: { x: 1 } },
  ]) {
    const { res, calls } = await run(
      { method: 'POST', url: '/api/request-history', cookies: authCookie(), body: entry(over) },
      [userState],
    );
    assert.equal(res.statusCode, 400, JSON.stringify(Object.keys(over)));
    assert.equal(res.body.error.code, 'VALIDATION_FAILED');
    assert.equal(writes(calls).length, 0);
  }
});
