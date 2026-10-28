/**
 * P0b-06 — request-history 저장 ID를 서버가 생성 (PK 충돌로 저장이 조용히 사라지던 문제)
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

const db = installDbMock();
const router = require('../api/index');

const USER_ID = 'ffffffff-ffff-4fff-8fff-ffffffffffff';
const userState = {
  match: /SELECT id, username, email, role, is_active, must_change_password\s+FROM users/,
  rows: [{ id: USER_ID, username: 'h', email: 'h@x.test', role: 'user', is_active: true, must_change_password: false }],
};

async function post(body, insertRows) {
  const calls = [];
  db.setSql(makeSql([userState, { match: /INSERT INTO api_request_history/, rows: insertRows }], calls));
  const res = makeRes();
  const origWarn = console.warn;
  const origError = console.error;
  console.warn = () => {};
  console.error = () => {};
  try {
    await withEnv(
      { JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined, NODE_ENV: 'development' },
      () => router(makeReq({
        method: 'POST',
        url: '/api/request-history',
        body,
        cookies: { auth_token: signTestToken({ sub: USER_ID, role: 'user', mustChangePw: false }) },
      }), res),
    );
  } finally {
    console.warn = origWarn;
    console.error = origError;
  }
  return { res, inserts: calls.filter((c) => /INSERT INTO api_request_history/.test(c.text)), calls };
}

const ENTRY = { name: '저장', endpointId: 'ep', method: 'GET', savedAt: 1700000000000 };

test('클라이언트 id는 무시하고 서버가 만든 20자 base64url id로 저장·응답한다', async () => {
  const { res, inserts } = await post({ ...ENTRY, id: '1700000000000' }, (call) => [{ id: call.values[0] }]);
  assert.equal(res.statusCode, 201);
  assert.equal(inserts.length, 1);
  const usedId = inserts[0].values[0];
  assert.notEqual(usedId, '1700000000000');
  assert.match(usedId, /^[A-Za-z0-9_-]{20}$/);
  assert.equal(res.body.id, usedId);
  assert.match(inserts[0].text, /RETURNING id/);
});

test('id 없이 보내도 저장된다 (id는 더 이상 필수가 아님)', async () => {
  const { res } = await post({ ...ENTRY }, (call) => [{ id: call.values[0] }]);
  assert.equal(res.statusCode, 201);
  assert.ok(res.body.id);
});

test('PK 충돌(0행)이면 새 id로 다시 시도한다', async () => {
  let n = 0;
  const { res, inserts } = await post({ ...ENTRY }, (call) => { n += 1; return n === 1 ? [] : [{ id: call.values[0] }]; });
  assert.equal(res.statusCode, 201);
  assert.equal(inserts.length, 2);
  assert.notEqual(inserts[0].values[0], inserts[1].values[0]);
  assert.equal(res.body.id, inserts[1].values[0]);
});

test('계속 0행이면 201로 위장하지 않고 500 DATABASE_ERROR', async () => {
  const { res, inserts, calls } = await post({ ...ENTRY }, []);
  assert.equal(res.statusCode, 500);
  assert.equal(res.body.error.code, 'DATABASE_ERROR');
  assert.equal(inserts.length, 3);
  assert.equal(calls.some((c) => /DELETE FROM api_request_history/.test(c.text)), false, '저장 실패 시 오래된 항목 정리도 하지 않음');
});

test('name이 없으면 400', async () => {
  const { res, inserts } = await post({ endpointId: 'ep' }, []);
  assert.equal(res.statusCode, 400);
  assert.equal(inserts.length, 0);
});
