/**
 * P0-12 — 라우터 일괄 예외 처리 + 입력 사전 검증
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const {
  TEST_JWT_SECRET,
  installDbMock,
  makeReq,
  makeRes,
  makeSql,
  signTestToken,
  withEnv,
} = require('./helpers/http-mocks');

// 컨트롤러 로드 전에 DB 목 설치
const db = installDbMock();

const router = require('../api/index');
const { isIsoDate, isPgIntId, isUuid, parsePositiveInt } = require('../controllers/_shared/validate');

const ADMIN_ID = '11111111-1111-4111-8111-111111111111';

// 활성 admin 계정 조회(requireRole)에 응답하는 기본 핸들러
function adminDbHandlers(extra = []) {
  return [
    {
      match: /FROM users/,
      rows: [{ id: ADMIN_ID, role: 'admin', is_active: true, must_change_password: false }],
    },
    ...extra,
  ];
}

function adminCookies() {
  return { auth_token: signTestToken({ sub: ADMIN_ID, role: 'admin', mustChangePw: false }) };
}

async function callRouter(reqOptions, sqlHandlers = []) {
  const calls = [];
  db.setSql(makeSql(sqlHandlers, calls));
  const req = makeReq(reqOptions);
  const res = makeRes();
  await withEnv({ JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined }, () => router(req, res));
  return { res, calls };
}

test('validate helpers — UUID / 양의 정수 / 날짜 / INTEGER id', () => {
  assert.equal(isUuid(ADMIN_ID), true);
  assert.equal(isUuid('abc'), false);
  assert.equal(isUuid(`${ADMIN_ID}x`), false);
  assert.equal(isUuid(undefined), false);

  assert.equal(parsePositiveInt(null, 1), 1);
  assert.equal(parsePositiveInt('', 1), 1);
  assert.equal(parsePositiveInt('3', 1), 3);
  assert.equal(parsePositiveInt('abc', 1), null);
  assert.equal(parsePositiveInt('0', 1), null);
  assert.equal(parsePositiveInt('-1', 1), null);
  assert.equal(parsePositiveInt('1.5', 1), null);
  assert.equal(parsePositiveInt('99', 1, 10), null);

  assert.equal(isIsoDate('2026-10-24'), true);
  assert.equal(isIsoDate('2026-02-30'), false);
  assert.equal(isIsoDate('2026/10/24'), false);
  assert.equal(isIsoDate("2026-10-24' OR 1=1"), false);

  assert.equal(isPgIntId('2147483647'), true);
  assert.equal(isPgIntId('2147483648'), false);
  assert.equal(isPgIntId('0'), false);
});

test('라우터: 컨트롤러 내부 예외는 Vercel 기본 500이 아니라 JSON INTERNAL_ERROR로 응답', async () => {
  const { res } = await withEnv({ CRON_SECRET: 'cron-test-value' }, () => callRouter(
    {
      url: '/api/cron/cleanup-audit',
      headers: { authorization: 'Bearer cron-test-value' },
    },
    [{ match: /DELETE FROM audit_logs/, rows: new Error('simulated DB failure') }],
  ));

  assert.equal(res.statusCode, 500);
  assert.match(String(res.headers['content-type']), /application\/json/);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
  // 내부 예외 메시지는 응답에 노출되지 않는다
  assert.doesNotMatch(JSON.stringify(res.body), /simulated DB failure/);
});

test('라우터: 과거 try/catch 밖이던 알림 API의 DB 예외도 JSON 500', async () => {
  const { res } = await callRouter(
    { url: '/api/notifications', cookies: adminCookies() },
    adminDbHandlers([{ match: /FROM notifications/, rows: new Error('boom') }]),
  );
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
});

test('GET /api/admin/audit-logs?page=abc → 400 VALIDATION_FAILED (DB 조회 없음)', async () => {
  const { res, calls } = await callRouter(
    { url: '/api/admin/audit-logs?page=abc', cookies: adminCookies() },
    adminDbHandlers(),
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  assert.equal(calls.some((c) => /audit_logs/.test(c.text)), false);
});

test('GET /api/admin/audit-logs?from=잘못된날짜 → 400', async () => {
  const { res } = await callRouter(
    { url: '/api/admin/audit-logs?from=2026-13-01', cookies: adminCookies() },
    adminDbHandlers(),
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
});

test('POST /api/admin/users/abc/unlock → 400 VALIDATION_FAILED', async () => {
  const { res, calls } = await callRouter(
    { method: 'POST', url: '/api/admin/users/abc/unlock', cookies: adminCookies() },
    adminDbHandlers(),
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  assert.equal(calls.some((c) => /UPDATE users/.test(c.text)), false);
});

test('관리자 하위 리소스의 잘못된 UUID → 400 (pages / signup-requests / ip-whitelist)', async () => {
  const cases = [
    { method: 'PUT', url: '/api/admin/pages/not-a-uuid', body: { is_active: true } },
    { method: 'DELETE', url: '/api/admin/pages/not-a-uuid' },
    { method: 'POST', url: '/api/admin/signup-requests/xyz/approve', body: { role: 'user' } },
    { method: 'POST', url: '/api/admin/password-reset-requests/xyz/resolve' },
    { method: 'PATCH', url: '/api/admin/ip-whitelist/rules/xyz', body: { label: 'a' } },
    { method: 'PUT', url: '/api/admin/ip-whitelist/scopes/xyz', body: { is_enabled: true } },
  ];
  for (const c of cases) {
    const { res } = await callRouter({ ...c, cookies: adminCookies() }, adminDbHandlers());
    assert.equal(res.statusCode, 400, `${c.method} ${c.url}`);
    assert.equal(res.body.error.code, 'VALIDATION_FAILED', `${c.method} ${c.url}`);
  }
});

test('GET /api/credentials/not-a-uuid → 400 JSON (500 아님)', async () => {
  const { res } = await callRouter(
    { url: '/api/credentials/not-a-uuid', cookies: adminCookies() },
    adminDbHandlers(),
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
});

test('DELETE /api/request-history/<21자 이상> → 400', async () => {
  const { res } = await callRouter(
    { method: 'DELETE', url: `/api/request-history/${'9'.repeat(21)}`, cookies: adminCookies() },
    adminDbHandlers(),
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
});

test('PATCH /api/notifications/<INTEGER 초과>/read → 404 (DB 예외 없음)', async () => {
  const { res, calls } = await callRouter(
    { method: 'PATCH', url: '/api/notifications/99999999999/read', cookies: adminCookies() },
    adminDbHandlers(),
  );
  assert.equal(res.statusCode, 404);
  assert.equal(calls.some((c) => /notifications/.test(c.text)), false);
});

test('알 수 없는 API 경로와 프로토타입 키는 404 JSON', async () => {
  for (const url of ['/api/does-not-exist', '/api/constructor', '/api/__proto__']) {
    const { res } = await callRouter({ url });
    assert.equal(res.statusCode, 404, url);
    assert.equal(res.body.error.code, 'RESOURCE_NOT_FOUND', url);
  }
});
