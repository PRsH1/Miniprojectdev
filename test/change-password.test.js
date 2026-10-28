/**
 * P0b-02 — 비밀번호 변경: 현재 비밀번호 확인 + 다른 refresh 토큰 폐기
 * - 일반 변경은 currentPassword 필수, 틀리면 로그인 실패 카운터 증가
 * - must_change_password(임시 비밀번호) 상태는 currentPassword 없이 변경 가능
 * - 변경 후 현재 세션(쿠키의 refresh 토큰과 그 후속 토큰)을 뺀 나머지 refresh 토큰 폐기
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

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
const CURRENT = 'DUMMY-current-password';
const SALT = 'DUMMY-salt';
const STORED = `${SALT}:${crypto.scryptSync(CURRENT, SALT, 64).toString('hex')}`;
const USER_ID = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee';
const REFRESH = 'DUMMY-refresh-token-value';
const REFRESH_HASH = crypto.createHash('sha256').update(REFRESH).digest('hex');

function handlers({ mustChange = false, lockedUntil = null, failRows = [] } = {}) {
  return [
    {
      match: /SELECT id, username, email, role, is_active, must_change_password\s+FROM users/,
      rows: [{ id: USER_ID, username: 'tester', email: 't@x.test', role: 'user', is_active: true, must_change_password: mustChange }],
    },
    { match: /SELECT password_hash, locked_until/, rows: [{ password_hash: STORED, locked_until: lockedUntil }] },
    { match: /failed_login_count = CASE/, rows: failRows },
    { match: /UPDATE refresh_tokens/, rows: [{ id: 'r1' }, { id: 'r2' }] },
  ];
}

async function call({ method = 'POST', body, mustChange = false, lockedUntil = null, failRows = [] } = {}) {
  const calls = [];
  db.setSql(makeSql(handlers({ mustChange, lockedUntil, failRows }), calls));
  const req = makeReq({
    method,
    url: '/api/change-password',
    cookies: {
      auth_token: signTestToken({ sub: USER_ID, role: 'user', mustChangePw: mustChange }),
      refresh_token: REFRESH,
    },
    body,
  });
  const res = makeRes();
  const origWarn = console.warn;
  console.warn = () => {};
  try {
    await withEnv({ JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined, NODE_ENV: 'development' }, () => router(req, res));
  } finally {
    console.warn = origWarn;
  }
  const pwUpdate = calls.find((c) => /SET password_hash = /.test(c.text));
  const revoke = calls.find((c) => /UPDATE refresh_tokens/.test(c.text));
  const failCount = calls.filter((c) => /failed_login_count = CASE/.test(c.text)).length;
  return { res, calls, pwUpdate, revoke, failCount };
}

const NEW = 'DUMMY-new-password-1';

test('GET: 일반 사용자는 현재 비밀번호 필요, 임시 비밀번호 사용자는 불필요', async () => {
  assert.deepEqual((await call({ method: 'GET' })).res.body, { requiresCurrentPassword: true });
  assert.deepEqual((await call({ method: 'GET', mustChange: true })).res.body, { requiresCurrentPassword: false });
});

test('세션이 없으면 401 (jwt.verify 직접 사용 대신 requireRole)', async () => {
  db.setSql(makeSql([]));
  const res = makeRes();
  await withEnv({ JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined }, () => router(makeReq({ method: 'POST', url: '/api/change-password', body: {} }), res));
  assert.equal(res.statusCode, 401);
});

test('일반 변경: currentPassword가 없으면 400, 변경·폐기 없음', async () => {
  const r = await call({ body: { newPassword: NEW, confirmPassword: NEW } });
  assert.equal(r.res.statusCode, 400);
  assert.equal(r.res.body.error.code, 'VALIDATION_FAILED');
  assert.equal(r.pwUpdate, undefined);
  assert.equal(r.revoke, undefined);
});

test('일반 변경: 현재 비밀번호가 틀리면 400 + 로그인 실패 카운터 원자적 증가', async () => {
  const r = await call({ body: { currentPassword: 'wrong', newPassword: NEW, confirmPassword: NEW }, failRows: [{ id: USER_ID, failed_login_count: 1, locked_until: null }] });
  assert.equal(r.res.statusCode, 400);
  assert.match(r.res.body.error.message, /현재 비밀번호가 올바르지 않습니다/);
  assert.equal(r.failCount, 1);
  assert.equal(r.pwUpdate, undefined);
});

test('일반 변경: 잠긴 계정은 현재 비밀번호를 검증하지 않고 403', async () => {
  const r = await call({
    body: { currentPassword: CURRENT, newPassword: NEW, confirmPassword: NEW },
    lockedUntil: new Date(Date.now() + 60_000),
  });
  assert.equal(r.res.statusCode, 403);
  assert.equal(r.failCount, 0);
  assert.equal(r.pwUpdate, undefined);
});

test('일반 변경 성공: 비밀번호 갱신 후 현재 세션을 뺀 refresh 토큰만 폐기', async () => {
  const r = await call({ body: { currentPassword: CURRENT, newPassword: NEW, confirmPassword: NEW } });
  assert.equal(r.res.statusCode, 200);
  assert.equal(r.res.body.ok, true);
  assert.equal(r.res.body.revokedSessions, 2);
  assert.ok(r.pwUpdate);
  assert.match(r.pwUpdate.text, /must_change_password = false/);

  assert.ok(r.revoke, 'refresh 폐기 쿼리 실행');
  assert.match(r.revoke.text, /SET revoked_at = now\(\)/);
  assert.doesNotMatch(r.revoke.text, /replaced_by = /, 'replaced_by 없이 폐기 → grace 재인증 차단');
  assert.match(r.revoke.text, /token_hash IS DISTINCT FROM/);
  assert.match(r.revoke.text, /SELECT replaced_by FROM refresh_tokens/, '이번 요청에서 로테이션된 후속 토큰도 유지');
  assert.deepEqual(r.revoke.values, [USER_ID, REFRESH_HASH, REFRESH_HASH]);
  // 폐기는 비밀번호 갱신 이후
  assert.ok(r.calls.indexOf(r.revoke) > r.calls.indexOf(r.pwUpdate));
});

test('임시 비밀번호(must_change) 상태: currentPassword 없이 변경 가능', async () => {
  const r = await call({ body: { newPassword: NEW, confirmPassword: NEW }, mustChange: true });
  assert.equal(r.res.statusCode, 200);
  assert.ok(r.pwUpdate);
  assert.ok(r.revoke);
  assert.equal(r.failCount, 0);
});

test('새 비밀번호가 현재(임시) 비밀번호와 같으면 400', async () => {
  const r = await call({ body: { newPassword: CURRENT, confirmPassword: CURRENT }, mustChange: true });
  assert.equal(r.res.statusCode, 400);
  assert.match(r.res.body.error.message, /현재 비밀번호와 다른/);
  assert.equal(r.pwUpdate, undefined);
});

test('길이·확인 불일치 검증은 DB 비밀번호 조회 전에 400', async () => {
  for (const body of [
    { currentPassword: CURRENT, newPassword: 'short', confirmPassword: 'short' },
    { currentPassword: CURRENT, newPassword: 'p'.repeat(257), confirmPassword: 'p'.repeat(257) },
    { currentPassword: CURRENT, newPassword: NEW, confirmPassword: `${NEW}x` },
  ]) {
    const r = await call({ body });
    assert.equal(r.res.statusCode, 400);
    assert.equal(r.calls.some((c) => /SELECT password_hash/.test(c.text)), false);
  }
});
