/**
 * P0-11 — requireRole: refresh 인지 + DB 현재 role/is_active 즉시 반영 + 자기/마지막 admin 보호
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const { parse } = require('cookie');

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
const { hasRole } = require('../controllers/_shared/roles');
const { requireRole } = require('../controllers/_shared/session');

const A_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const B_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function userRow(id, role, { active = true, mustChange = false } = {}) {
  return { id, username: `u-${id.slice(0, 4)}`, email: `${id.slice(0, 4)}@example.test`, role, is_active: active, must_change_password: mustChange };
}

/** loadUserState 쿼리(SELECT ... must_change_password FROM users WHERE id =)에 id별로 응답 */
function usersHandler(rowsById) {
  return {
    match: /SELECT id, username, email, role, is_active, must_change_password\s+FROM users/,
    rows: (call) => (rowsById[call.values[0]] ? [rowsById[call.values[0]]] : []),
  };
}

function cookieFor(id, role, extra = {}) {
  return { auth_token: signTestToken({ sub: id, role, mustChangePw: false, ...extra }) };
}

async function run(reqOptions, handlers) {
  const calls = [];
  db.setSql(makeSql(handlers, calls));
  const req = makeReq(reqOptions);
  const res = makeRes();
  await withEnv(
    { JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined, NODE_ENV: 'development' },
    () => router(req, res),
  );
  return { res, calls };
}

test('hasRole 계층: admin > manager > user, 알 수 없는 역할은 거부', () => {
  assert.equal(hasRole('admin', 'manager'), true);
  assert.equal(hasRole('manager', 'admin'), false);
  assert.equal(hasRole('user', 'user'), true);
  assert.equal(hasRole('ghost', 'user'), false);
  assert.equal(hasRole('admin', 'ghost'), false);
});

test('세션 없음 → 401 AUTH_REQUIRED', async () => {
  const { res } = await run({ url: '/api/admin/users' }, []);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error.code, 'AUTH_REQUIRED');
});

test('JWT는 admin이지만 DB에서 user로 강등됨 → 즉시 403', async () => {
  const { res } = await run(
    { url: '/api/admin/users', cookies: cookieFor(B_ID, 'admin') },
    [usersHandler({ [B_ID]: userRow(B_ID, 'user') })],
  );
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.error.code, 'FORBIDDEN');
});

test('DB에서 비활성화된 계정 → 401 (JWT 유효해도)', async () => {
  const { res } = await run(
    { url: '/api/credentials', cookies: cookieFor(B_ID, 'user') },
    [usersHandler({ [B_ID]: userRow(B_ID, 'user', { active: false }) })],
  );
  assert.equal(res.statusCode, 401);
});

test('auth_token 없이 refresh_token만 있어도 Admin API 200 + 새 쿠키 발급 (refresh 인지)', async () => {
  const { res } = await run(
    { url: '/api/admin/users', cookies: { refresh_token: 'valid-refresh' } },
    [
      // tryRefreshToken의 원자적 claim CTE
      { match: /WITH claimed AS/, rows: [{ id: 'rt-1', user_id: A_ID, role: 'admin', must_change_password: false, is_active: true }] },
      usersHandler({ [A_ID]: userRow(A_ID, 'admin') }),
      { match: /FROM users\s+ORDER BY created_at DESC/, rows: [userRow(A_ID, 'admin')] },
    ],
  );
  assert.equal(res.statusCode, 200);
  assert.ok(Array.isArray(res.body.users));
  const setCookies = res.headers['set-cookie'];
  assert.ok(Array.isArray(setCookies) && setCookies.some((c) => parse(c).auth_token));
});

test('만료된 auth_token + 유효한 refresh → 버그 제보 201 (제보 내용 유실 없음)', async () => {
  const expired = signTestToken(
    { sub: B_ID, role: 'user', mustChangePw: false, exp: Math.floor(Date.now() / 1000) - 60 },
    {},
  );
  const { res, calls } = await run(
    {
      method: 'POST',
      url: '/api/bug-reports',
      cookies: { auth_token: expired, refresh_token: 'valid-refresh' },
      body: { title: '제목', description: '설명', severity: 'normal' },
    },
    [
      { match: /WITH claimed AS/, rows: [{ id: 'rt-2', user_id: B_ID, role: 'user', must_change_password: false, is_active: true }] },
      usersHandler({ [B_ID]: userRow(B_ID, 'user') }),
      { match: /INSERT INTO bug_reports/, rows: [{ id: 7, title: '제목' }] },
      { match: /INSERT INTO notifications/, rows: [{ id: 1, type: 'bug_report', title: 't', body: 'b', created_at: new Date() }] },
      { match: /COUNT\(\*\)::int AS count/, rows: [{ count: 1 }] },
    ],
  );
  assert.equal(res.statusCode, 201);
  const insert = calls.find((c) => /INSERT INTO bug_reports/.test(c.text));
  assert.ok(insert, 'bug_reports INSERT 실행');
  // reporter 정보는 requireRole의 DB 조회 결과를 사용
  assert.ok(insert.values.includes(B_ID));
});

test('임시 비밀번호(must_change_password) 계정 → Admin API 403, 알림 조회는 허용', async () => {
  const handlers = [
    usersHandler({ [A_ID]: userRow(A_ID, 'admin', { mustChange: true }) }),
    { match: /FROM notifications/, rows: [{ unread_count: 0 }] },
  ];
  const admin = await run({ url: '/api/admin/users', cookies: cookieFor(A_ID, 'admin') }, handlers);
  assert.equal(admin.res.statusCode, 403);

  const notif = await run({ url: '/api/notifications', cookies: cookieFor(A_ID, 'admin') }, handlers);
  assert.equal(notif.res.statusCode, 200);
});

test('PUT 자기 자신 강등 → 400', async () => {
  const { res, calls } = await run(
    { method: 'PUT', url: `/api/admin/users/${A_ID}`, cookies: cookieFor(A_ID, 'admin'), body: { role: 'user' } },
    [
      usersHandler({ [A_ID]: userRow(A_ID, 'admin') }),
      { match: /SELECT id, role, is_active FROM users/, rows: [userRow(A_ID, 'admin')] },
      { match: /COUNT\(\*\) AS cnt/, rows: [{ cnt: '2' }] },
    ],
  );
  assert.equal(res.statusCode, 400);
  assert.equal(calls.some((c) => /UPDATE users SET role/.test(c.text)), false);
});

test('PUT 대문자 UUID로 자기 자신 강등 시도도 400', async () => {
  const { res } = await run(
    { method: 'PUT', url: `/api/admin/users/${A_ID.toUpperCase()}`, cookies: cookieFor(A_ID, 'admin'), body: { is_active: false } },
    [
      usersHandler({ [A_ID]: userRow(A_ID, 'admin') }),
      { match: /SELECT id, role, is_active FROM users/, rows: [userRow(A_ID, 'admin')] },
      { match: /COUNT\(\*\) AS cnt/, rows: [{ cnt: '2' }] },
    ],
  );
  assert.equal(res.statusCode, 400);
});

test('PUT 마지막 활성 admin 비활성화 → 400', async () => {
  const { res } = await run(
    { method: 'PUT', url: `/api/admin/users/${B_ID}`, cookies: cookieFor(A_ID, 'admin'), body: { is_active: false } },
    [
      usersHandler({ [A_ID]: userRow(A_ID, 'admin') }),
      { match: /SELECT id, role, is_active FROM users/, rows: [userRow(B_ID, 'admin')] },
      { match: /COUNT\(\*\) AS cnt/, rows: [{ cnt: '1' }] },
    ],
  );
  assert.equal(res.statusCode, 400);
});

test('PUT 다른 admin 강등 → 200 + 대상 refresh 토큰 폐기', async () => {
  const { res, calls } = await run(
    { method: 'PUT', url: `/api/admin/users/${B_ID}`, cookies: cookieFor(A_ID, 'admin'), body: { role: 'user' } },
    [
      usersHandler({ [A_ID]: userRow(A_ID, 'admin') }),
      { match: /SELECT id, role, is_active FROM users/, rows: [userRow(B_ID, 'admin')] },
      { match: /COUNT\(\*\) AS cnt/, rows: [{ cnt: '2' }] },
    ],
  );
  assert.equal(res.statusCode, 200);
  const revoke = calls.find((c) => /UPDATE refresh_tokens SET revoked_at = now\(\) WHERE user_id/.test(c.text));
  assert.ok(revoke, 'refresh 토큰 폐기 쿼리 실행');
  assert.equal(revoke.values[0], B_ID);
});

test('PUT 존재하지 않는 사용자 → 404', async () => {
  const { res } = await run(
    { method: 'PUT', url: `/api/admin/users/${B_ID}`, cookies: cookieFor(A_ID, 'admin'), body: { role: 'user' } },
    [usersHandler({ [A_ID]: userRow(A_ID, 'admin') })],
  );
  assert.equal(res.statusCode, 404);
});

test('pusher-auth: 강등된 전 admin은 admin 채널 구독 403', async () => {
  const { res } = await run(
    {
      method: 'POST',
      url: '/api/pusher/auth',
      cookies: cookieFor(B_ID, 'admin'),
      body: { socket_id: '1.2', channel_name: 'private-notifications-admin' },
    },
    [usersHandler({ [B_ID]: userRow(B_ID, 'user') })],
  );
  assert.equal(res.statusCode, 403);
});

test('/app/admin: JWT admin이어도 DB role이 user면 403, 비활성화면 로그인 리다이렉트', async () => {
  const pageRow = { path: '/app/admin', required_role: 'admin', file_path: 'private/Admin.html', is_active: true };
  const pageHandler = { match: /FROM protected_pages/, rows: [pageRow] };

  const demoted = await run(
    { url: '/app/admin', cookies: cookieFor(B_ID, 'admin') },
    [pageHandler, usersHandler({ [B_ID]: userRow(B_ID, 'user') })],
  );
  assert.equal(demoted.res.statusCode, 403);

  const inactive = await run(
    { url: '/app/admin', cookies: cookieFor(B_ID, 'admin') },
    [pageHandler, usersHandler({ [B_ID]: userRow(B_ID, 'admin', { active: false }) })],
  );
  assert.equal(inactive.res.statusCode, 302);
  assert.match(inactive.res.redirectedTo, /^\/auth\/login\.html\?next=/);
});

test('requireRole은 DB role로 보정된 사용자 객체를 반환', async () => {
  db.setSql(makeSql([usersHandler({ [B_ID]: userRow(B_ID, 'manager') })]));
  const req = makeReq({ url: '/api/x', cookies: cookieFor(B_ID, 'user') });
  const res = makeRes();
  const user = await withEnv({ JWT_SECRET: TEST_JWT_SECRET }, () => requireRole(req, res, 'manager'));
  assert.equal(user.role, 'manager');
  assert.equal(user.sub, B_ID);
  assert.equal(user.email, `${B_ID.slice(0, 4)}@example.test`);
});
