/**
 * P0b-09 — cleanup-audit Cron: CRON_SECRET 고정 시간 비교 + 실제 삭제 건수 반환
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { installDbMock, makeReq, makeRes, makeSql, withEnv } = require('./helpers/http-mocks');

const db = installDbMock();
const cleanupAudit = require('../controllers/cron/cleanup-audit');
const { safeEqual } = cleanupAudit;

// 테스트 전용 더미 값 (실제 비밀 아님)
const CRON = 'DUMMY-cron-secret-value';

async function run(headers, handlers = []) {
  const calls = [];
  db.setSql(makeSql(handlers, calls));
  const req = makeReq({ method: 'GET', url: '/api/cron/cleanup-audit', headers });
  const res = makeRes();
  await withEnv({ CRON_SECRET: CRON }, () => cleanupAudit(req, res));
  return { res, calls };
}

test('safeEqual: 같은 값만 true, 길이가 달라도 예외 없이 false', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', 'a'), false);
  assert.equal(safeEqual('한글', '한글'), true);
});

test('잘못된 시크릿·헤더 없음은 401 JSON, DB 쿼리 없음', async () => {
  for (const headers of [{}, { authorization: 'Bearer wrong' }, { authorization: `Bearer ${CRON}x` }]) {
    const { res, calls } = await run(headers);
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.error.code, 'AUTH_REQUIRED');
    assert.equal(calls.length, 0);
  }
});

test('CRON_SECRET 미설정이면 올바른 형식의 헤더여도 401', async () => {
  db.setSql(makeSql());
  const req = makeReq({ method: 'GET', url: '/api/cron/cleanup-audit', headers: { authorization: 'Bearer ' } });
  const res = makeRes();
  await withEnv({ CRON_SECRET: undefined }, () => cleanupAudit(req, res));
  assert.equal(res.statusCode, 401);
});

test('GET 외 메서드는 405', async () => {
  db.setSql(makeSql());
  const req = makeReq({ method: 'POST', url: '/api/cron/cleanup-audit', headers: { authorization: `Bearer ${CRON}` } });
  const res = makeRes();
  await withEnv({ CRON_SECRET: CRON }, () => cleanupAudit(req, res));
  assert.equal(res.statusCode, 405);
});

test('올바른 시크릿이면 CTE로 집계한 실제 삭제 건수를 반환한다', async () => {
  const { res, calls } = await run(
    { authorization: `Bearer ${CRON}` },
    [{ match: /DELETE FROM audit_logs/, rows: [{ deleted: 42 }] }],
  );
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body, { success: true, deleted: 42 });
  assert.equal(calls.length, 1);
  assert.match(calls[0].text, /RETURNING 1/);
  assert.match(calls[0].text, /COUNT\(\*\)::int AS deleted/);
});

test('삭제 대상이 없으면 deleted: 0', async () => {
  const { res } = await run(
    { authorization: `Bearer ${CRON}` },
    [{ match: /DELETE FROM audit_logs/, rows: [{ deleted: 0 }] }],
  );
  assert.equal(res.body.deleted, 0);
});
