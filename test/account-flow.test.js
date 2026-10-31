/**
 * P1-13 — 계정 흐름
 * - 로그인: 승인 대기 가입 신청은 비밀번호가 신청 때와 일치할 때만 'pending' 안내 (계정 열거 완화 유지)
 * - 비밀번호 변경 성공 시 세션 재발급: refresh 로테이션 + auth_token(mustChangePw:false) 재서명
 * - 회원가입 중복 오류는 한글 메시지
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const {
  TEST_JWT_SECRET,
  installDbMock,
  makeReq,
  makeRes,
  makeSql,
  signTestToken,
  withEnv,
} = require('./helpers/http-mocks');

const db = installDbMock();
const router = require('../api/index');

// 테스트 전용 더미 비밀번호 (실제 비밀 아님)
const PASSWORD = 'DUMMY-signup-password';
const SALT = 'DUMMY-salt';
const HASH = `${SALT}:${crypto.scryptSync(PASSWORD, SALT, 64).toString('hex')}`;
const USER_ID = 'abababab-abab-4bab-8bab-abababababab';

const ENV = { JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined, NODE_ENV: 'development' };

function quiet(fn) {
  const origWarn = console.warn;
  const origError = console.error;
  console.warn = () => {};
  console.error = () => {};
  return Promise.resolve().then(fn).finally(() => {
    console.warn = origWarn;
    console.error = origError;
  });
}

// ─── 로그인: 승인 대기 안내 ─────────────────────────────────────

async function login({ user = null, pending = null, password = PASSWORD }) {
  const calls = [];
  db.setSql(makeSql([
    { match: /SELECT \* FROM users/, rows: user ? [user] : [] },
    { match: /FROM signup_requests sr/, rows: pending ? [pending] : [] },
    { match: /failed_login_count = CASE/, rows: [] },
  ], calls));
  const req = makeReq({ method: 'POST', url: '/api/login', body: { username: 'waiting', password } });
  const res = makeRes();
  await withEnv(ENV, () => router(req, res));
  const audits = calls.filter((c) => /INSERT INTO audit_logs/.test(c.text));
  return { res, calls, audits };
}

const shape = (r) => r.calls.map((c) => c.text.replace(/\s+/g, ' ').slice(0, 40));

test('가입 대기 + 신청 비밀번호 일치 → error=pending, 세션 발급 없음', async () => {
  const r = await login({ pending: { password_hash: HASH, recent_failures: 0 } });
  assert.equal(r.res.redirectedTo, '/auth/login.html?error=pending');
  assert.equal(r.res.headers['set-cookie'], undefined);
  assert.equal(r.audits.length, 1);
  assert.match(r.audits[0].values[6], /pending_approval/);
});

test('가입 대기 + 비밀번호 불일치 → 없는 계정과 같은 invalid·같은 쿼리 순서', async () => {
  const wrong = await login({ pending: { password_hash: HASH, recent_failures: 0 }, password: 'wrong' });
  const missing = await login({ password: 'wrong' });
  assert.equal(wrong.res.redirectedTo, '/auth/login.html?error=invalid');
  assert.equal(wrong.res.redirectedTo, missing.res.redirectedTo);
  assert.deepEqual(shape(wrong), shape(missing), '비밀번호 없이 가입 신청 존재 여부가 드러나지 않음');
});

test('가입 대기 조회는 users 조회와 함께 항상 실행된다 (계정이 있어도 같은 쿼리 순서)', async () => {
  const existing = await login({
    user: { id: USER_ID, username: 'waiting', role: 'user', is_active: true, must_change_password: false, failed_login_count: 0, locked_until: null, password_hash: HASH },
    password: 'wrong',
  });
  const missing = await login({ password: 'wrong' });
  assert.deepEqual(shape(existing), shape(missing));
  assert.ok(existing.calls.some((c) => /FROM signup_requests sr/.test(c.text)));
});

test('가입 대기 아이디의 최근 실패가 5회 이상이면 정답이어도 invalid (무제한 추측 오라클 차단)', async () => {
  const r = await login({ pending: { password_hash: HASH, recent_failures: 5 } });
  assert.equal(r.res.redirectedTo, '/auth/login.html?error=invalid');
  const q = r.calls.find((c) => /FROM signup_requests sr/.test(c.text));
  assert.match(q.text, /action = 'login_failed'/);
  assert.match(q.text, /<> 'pending_approval'/, '정답 안내 기록은 실패로 세지 않음');
});

test('계정이 있으면 가입 대기 신청은 무시한다 (users 기준 판정 유지)', async () => {
  const r = await login({
    user: { id: USER_ID, username: 'waiting', role: 'user', is_active: true, must_change_password: false, failed_login_count: 0, locked_until: null, password_hash: HASH },
    pending: { password_hash: HASH, recent_failures: 0 },
  });
  assert.equal(r.res.redirectedTo, '/');
});

test('가입 대기 조회가 실패해도 로그인은 계속된다', async () => {
  const calls = [];
  db.setSql(makeSql([
    { match: /SELECT \* FROM users/, rows: [] },
    { match: /FROM signup_requests sr/, rows: () => new Error('DUMMY db failure') },
  ], calls));
  const res = makeRes();
  await quiet(() => withEnv(ENV, () => router(makeReq({ method: 'POST', url: '/api/login', body: { username: 'x', password: 'y' } }), res)));
  assert.equal(res.redirectedTo, '/auth/login.html?error=invalid');
});

// ─── 비밀번호 변경: 세션 재발급 ────────────────────────────────

const CURRENT = 'DUMMY-current-password';
const STORED = `${SALT}:${crypto.scryptSync(CURRENT, SALT, 64).toString('hex')}`;
const NEW = 'DUMMY-new-password-1';
const REFRESH = 'DUMMY-refresh-token-value';
const REFRESH_HASH = crypto.createHash('sha256').update(REFRESH).digest('hex');

function cookieValue(setCookies, name) {
  const list = Array.isArray(setCookies) ? setCookies : (setCookies ? [setCookies] : []);
  const found = list.filter((c) => c.startsWith(`${name}=`));
  return found.map((c) => decodeURIComponent(c.slice(name.length + 1).split(';')[0]));
}

async function changePassword({ mustChange, authToken, body }) {
  const calls = [];
  db.setSql(makeSql([
    {
      match: /SELECT id, username, email, role, is_active, must_change_password\s+FROM users/,
      rows: [{ id: USER_ID, username: 'tester', email: 't@x.test', role: 'manager', is_active: true, must_change_password: mustChange }],
    },
    { match: /SELECT password_hash, locked_until/, rows: [{ password_hash: STORED, locked_until: null }] },
    // tryRefreshToken의 원자적 claim (CTE) — DB가 이미 must_change_password=false로 바뀐 상태를 돌려준다
    { match: /WITH claimed AS/, rows: [{ id: 'old-rt', user_id: USER_ID, role: 'manager', must_change_password: false, is_active: true }] },
    { match: /UPDATE refresh_tokens\s+SET revoked_at = now\(\)\s+WHERE user_id/, rows: [{ id: 'r1' }] },
  ], calls));
  const req = makeReq({
    method: 'POST',
    url: '/api/change-password',
    cookies: { auth_token: authToken, refresh_token: REFRESH },
    body,
  });
  const res = makeRes();
  await quiet(() => withEnv(ENV, () => router(req, res)));
  const claims = calls.filter((c) => /WITH claimed AS/.test(c.text));
  const revoke = calls.find((c) => /SET revoked_at = now\(\)\s+WHERE user_id/.test(c.text));
  return { res, calls, claims, revoke };
}

test('임시 비밀번호 변경 성공 → auth_token이 mustChangePw:false로 재서명되고 refresh가 로테이션된다', async () => {
  const r = await changePassword({
    mustChange: true,
    authToken: signTestToken({ sub: USER_ID, role: 'manager', mustChangePw: true }),
    body: { newPassword: NEW, confirmPassword: NEW },
  });
  assert.equal(r.res.statusCode, 200);
  const setCookie = r.res.headers['set-cookie'];
  const auth = cookieValue(setCookie, 'auth_token');
  const refresh = cookieValue(setCookie, 'refresh_token');
  assert.equal(auth.length, 1, 'auth_token 쿠키는 정확히 1개');
  assert.equal(refresh.length, 1, '새 refresh_token 쿠키 발급');
  assert.notEqual(refresh[0], REFRESH);
  const decoded = jwt.verify(auth[0], TEST_JWT_SECRET);
  assert.equal(decoded.sub, USER_ID);
  assert.equal(decoded.role, 'manager');
  assert.equal(decoded.mustChangePw, false);

  // 로테이션은 요청 쿠키의 refresh 토큰을 대상으로, 다른 세션 폐기 뒤에 실행된다
  assert.equal(r.claims.length, 1);
  assert.equal(r.claims[0].values.includes(REFRESH_HASH), true);
  assert.ok(r.calls.indexOf(r.claims[0]) > r.calls.indexOf(r.revoke));
});

test('액세스 토큰이 만료돼 같은 요청에서 이미 로테이션됐으면 다시 로테이션하지 않고 auth_token만 바꾼다', async () => {
  const expired = signTestToken({ sub: USER_ID, role: 'manager', mustChangePw: true }, { expiresIn: -10 });
  const r = await changePassword({ mustChange: true, authToken: expired, body: { newPassword: NEW, confirmPassword: NEW } });
  assert.equal(r.res.statusCode, 200);
  assert.equal(r.claims.length, 1, 'requireRole의 로테이션 1회뿐');
  const setCookie = r.res.headers['set-cookie'];
  assert.equal(cookieValue(setCookie, 'refresh_token').length, 1, 'requireRole이 발급한 refresh 쿠키 유지');
  const auth = cookieValue(setCookie, 'auth_token');
  assert.equal(auth.length, 1, '중복 auth_token 없이 하나만');
  assert.equal(jwt.verify(auth[0], TEST_JWT_SECRET).mustChangePw, false);
});

test('일반 변경 실패(현재 비밀번호 오류)에는 세션 쿠키를 새로 발급하지 않는다', async () => {
  const calls = [];
  db.setSql(makeSql([
    {
      match: /SELECT id, username, email, role, is_active, must_change_password\s+FROM users/,
      rows: [{ id: USER_ID, username: 'tester', email: 't@x.test', role: 'user', is_active: true, must_change_password: false }],
    },
    { match: /SELECT password_hash, locked_until/, rows: [{ password_hash: STORED, locked_until: null }] },
  ], calls));
  const res = makeRes();
  await quiet(() => withEnv(ENV, () => router(makeReq({
    method: 'POST',
    url: '/api/change-password',
    cookies: { auth_token: signTestToken({ sub: USER_ID, role: 'user', mustChangePw: false }), refresh_token: REFRESH },
    body: { currentPassword: 'wrong', newPassword: NEW, confirmPassword: NEW },
  }), res)));
  assert.equal(res.statusCode, 400);
  assert.equal(res.headers['set-cookie'], undefined);
  assert.equal(calls.some((c) => /WITH claimed AS/.test(c.text)), false);
});

// ─── 회원가입 중복 메시지 ─────────────────────────────────────

test('이미 있는 아이디로 가입 요청 → 409 + 한글 메시지(객체 구조 유지)', async () => {
  db.setSql(makeSql([
    { match: /COUNT\(\*\)::int AS count FROM audit_logs/, rows: [{ count: 0 }] },
    { match: /COUNT\(\*\)::int AS count FROM signup_requests/, rows: [{ count: 0 }] },
    { match: /SELECT id FROM users WHERE username/, rows: [{ id: USER_ID }] },
  ]));
  const res = makeRes();
  await withEnv(ENV, () => router(makeReq({
    method: 'POST',
    url: '/api/signup',
    headers: { 'x-forwarded-for': '203.0.113.5' },
    body: { username: 'taken', email: 'new@example.com', password: 'DUMMY-password-123' },
  }), res));
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  assert.equal(res.body.error.message, '이미 사용 중인 아이디입니다.');
});

test('이미 있는 이메일로 가입 요청 → 한글 메시지', async () => {
  db.setSql(makeSql([
    { match: /COUNT\(\*\)::int AS count FROM audit_logs/, rows: [{ count: 0 }] },
    { match: /COUNT\(\*\)::int AS count FROM signup_requests/, rows: [{ count: 0 }] },
    { match: /SELECT id FROM users WHERE email/, rows: [{ id: USER_ID }] },
  ]));
  const res = makeRes();
  await withEnv(ENV, () => router(makeReq({
    method: 'POST',
    url: '/api/signup',
    headers: { 'x-forwarded-for': '203.0.113.6' },
    body: { username: 'fresh', email: 'taken@example.com', password: 'DUMMY-password-123' },
  }), res));
  assert.equal(res.statusCode, 409);
  assert.equal(res.body.error.message, '이미 사용 중인 이메일입니다.');
});
