/**
 * P0b-01 — 로그인 실패 카운터 원자적 증가 + 계정 열거 완화
 * - 실패 카운트는 단일 UPDATE(… + 1 … RETURNING)로만 올린다 (읽은 값을 써서 덮어쓰지 않음)
 * - 없는 아이디·틀린 비밀번호·잠김 계정(정답 포함)은 같은 쿼리 순서·같은 scrypt 횟수·같은 응답
 * - '잠김' 안내는 응답으로 주지 않는다(D-1). '비활성' 안내는 잠기지 않은 계정에서 비밀번호가 맞을 때만
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

// scrypt 호출 횟수 계측 — controllers/_shared/password.js가 로드되기 전에 감싼다
let scryptCalls = 0;
const realScrypt = crypto.scrypt;
crypto.scrypt = function countedScrypt(...args) {
  scryptCalls += 1;
  return realScrypt.apply(this, args);
};

const { TEST_JWT_SECRET, installDbMock, makeReq, makeRes, makeSql, withEnv } = require('./helpers/http-mocks');

const db = installDbMock();
const router = require('../api/index');

// 테스트 전용 더미 비밀번호 (실제 비밀 아님)
const PASSWORD = 'DUMMY-correct-password';
const SALT = 'DUMMY-salt';
const HASH = `${SALT}:${crypto.scryptSync(PASSWORD, SALT, 64).toString('hex')}`;
const USER_ID = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';

function userRow(over = {}) {
  return {
    id: USER_ID, username: 'tester', role: 'user', is_active: true, must_change_password: false,
    failed_login_count: 0, locked_until: null, password_hash: HASH, ...over,
  };
}

async function login({ user, password = PASSWORD, updateRows = [] }) {
  const calls = [];
  db.setSql(makeSql([
    { match: /SELECT \* FROM users/, rows: user ? [user] : [] },
    { match: /UPDATE users SET\s+failed_login_count = CASE/, rows: updateRows },
  ], calls));
  const req = makeReq({ method: 'POST', url: '/api/login', body: { username: 'tester', password } });
  const res = makeRes();
  scryptCalls = 0;
  await withEnv({ JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined, NODE_ENV: 'development' }, () => router(req, res));
  const failUpdate = calls.filter((c) => /failed_login_count = CASE/.test(c.text));
  const audits = calls.filter((c) => /INSERT INTO audit_logs/.test(c.text)).map((c) => c.values[2]);
  return { res, calls, failUpdate, audits, scrypt: scryptCalls };
}

const future = () => new Date(Date.now() + 10 * 60 * 1000);
const past = () => new Date(Date.now() - 10 * 60 * 1000);

test('실패 카운터는 원자적 UPDATE 한 번으로 증가한다 (읽은 값으로 덮어쓰지 않음)', async () => {
  const { res, failUpdate, calls } = await login({ user: userRow({ failed_login_count: 3 }), password: 'wrong' });
  assert.equal(res.redirectedTo, '/auth/login.html?error=invalid');
  assert.equal(failUpdate.length, 1);
  const q = failUpdate[0].text;
  assert.match(q, /COALESCE\(failed_login_count, 0\) \+ 1/);
  assert.match(q, /WHERE username = \$/);
  assert.match(q, /RETURNING id, failed_login_count, locked_until/);
  assert.equal(failUpdate[0].values.includes(4), false, 'JS에서 계산한 카운트(3+1)를 쓰면 안 됨');
  // 잠금 해제용 별도 UPDATE(read-modify-write)도 없어야 함
  assert.equal(calls.filter((c) => /UPDATE users/.test(c.text)).length, 1);
});

test('없는 아이디와 틀린 비밀번호는 같은 응답·같은 쿼리 순서·같은 scrypt 횟수', async () => {
  const missing = await login({ user: null, password: 'wrong' });
  const wrong = await login({ user: userRow(), password: 'wrong' });

  assert.equal(missing.res.redirectedTo, wrong.res.redirectedTo);
  assert.equal(missing.res.redirectedTo, '/auth/login.html?error=invalid');
  assert.equal(missing.scrypt, 1, '없는 계정도 더미 해시로 scrypt 1회');
  assert.equal(wrong.scrypt, 1);
  const shape = (r) => r.calls.map((c) => c.text.replace(/\s+/g, ' ').slice(0, 40));
  assert.deepEqual(shape(missing), shape(wrong));
});

test('비활성 계정(잠기지 않음): 비밀번호가 틀리면 invalid(카운트 증가), 맞을 때만 inactive 안내', async () => {
  const bad = await login({ user: userRow({ is_active: false }), password: 'wrong' });
  assert.equal(bad.res.redirectedTo, '/auth/login.html?error=invalid');
  assert.equal(bad.failUpdate.length, 1);

  const good = await login({ user: userRow({ is_active: false }) });
  assert.equal(good.res.redirectedTo, '/auth/login.html?error=inactive');
  assert.equal(good.failUpdate.length, 0);
  assert.equal(good.res.headers['set-cookie'], undefined, '세션 쿠키 발급 없음');
});

test('잠긴 계정: 정답과 오답이 같은 응답·같은 쿼리 순서·같은 scrypt 횟수 (D-1 정답 오라클 회귀)', async () => {
  const until = future();
  const lockedUser = () => userRow({ locked_until: until, failed_login_count: 5 });
  const stillLocked = [{ id: USER_ID, failed_login_count: 5, locked_until: until }];
  const bad = await login({ user: lockedUser(), password: 'wrong', updateRows: stillLocked });
  const good = await login({ user: lockedUser(), updateRows: stillLocked });
  const missing = await login({ user: null, password: 'wrong' });

  // 응답이 완전히 같아야 한다 — 'locked'·'until'도 없이 없는 계정과 같은 invalid
  assert.equal(good.res.redirectedTo, bad.res.redirectedTo);
  assert.equal(good.res.redirectedTo, missing.res.redirectedTo);
  assert.equal(good.res.redirectedTo, '/auth/login.html?error=invalid');
  assert.equal(good.res.statusCode, bad.res.statusCode);
  assert.equal(good.res.headers['set-cookie'], undefined, '잠금 중 정답이어도 세션 발급 없음');
  assert.equal(bad.res.headers['set-cookie'], undefined);

  // 처리 경로도 같아야 한다 (scrypt 1회 + 실패 UPDATE 1회 + login_failed 감사 로그)
  assert.equal(good.scrypt, 1);
  assert.equal(bad.scrypt, 1);
  const shape = (r) => r.calls.map((c) => c.text.replace(/\s+/g, ' ').slice(0, 40));
  assert.deepEqual(shape(good), shape(bad));
  assert.deepEqual(shape(good), shape(missing));
  assert.equal(good.failUpdate.length, 1, '정답이어도 실패 경로(UPDATE)를 똑같이 탄다');
  assert.deepEqual(good.audits, ['login_failed']);
  assert.deepEqual(bad.audits, ['login_failed'], '이미 잠긴 계정은 잠금 감사 로그를 다시 남기지 않음');
  // 정답이어도 카운터 초기화(로그인 성공 UPDATE)를 하지 않는다 — 잠금이 풀리지 않음
  assert.equal(good.calls.some((c) => /failed_login_count = 0/.test(c.text)), false);
});

test('잠긴 동안의 실패 UPDATE는 잠금을 연장하지 않는 CASE를 쓴다', async () => {
  const until = future();
  const r = await login({ user: userRow({ locked_until: until, failed_login_count: 5 }), updateRows: [{ id: USER_ID, failed_login_count: 5, locked_until: until }] });
  const q = r.failUpdate[0].text;
  assert.match(q, /WHEN locked_until > now\(\) THEN failed_login_count/);
  assert.match(q, /WHEN locked_until > now\(\) THEN locked_until/);
});

test('잠기고 비활성인 계정도 정답이면 inactive가 아니라 invalid', async () => {
  const until = future();
  const r = await login({ user: userRow({ is_active: false, locked_until: until, failed_login_count: 5 }), updateRows: [{ id: USER_ID, failed_login_count: 5, locked_until: until }] });
  assert.equal(r.res.redirectedTo, '/auth/login.html?error=invalid');
});

test('임계값에 도달해 새로 잠기면 account_locked 감사 로그를 남긴다', async () => {
  const until = future();
  const r = await login({
    user: userRow({ failed_login_count: 4 }),
    password: 'wrong',
    updateRows: [{ id: USER_ID, failed_login_count: 5, locked_until: until }],
  });
  assert.equal(r.res.redirectedTo, '/auth/login.html?error=invalid');
  assert.deepEqual(r.audits, ['account_locked', 'login_failed']);
});

test('잠금이 만료된 계정은 올바른 비밀번호로 로그인되고 카운터가 초기화된다', async () => {
  const r = await login({ user: userRow({ locked_until: past(), failed_login_count: 5 }) });
  assert.equal(r.res.redirectedTo, '/');
  assert.ok(r.res.headers['set-cookie']);
  assert.ok(r.calls.some((c) => /SET failed_login_count = 0, locked_until = NULL, last_login_at = now\(\)/.test(c.text)));
});

test('길이 한도를 넘는 아이디·비밀번호는 DB·scrypt 없이 invalid', async () => {
  const calls = [];
  db.setSql(makeSql([], calls));
  for (const body of [{ username: 'u'.repeat(51), password: 'x' }, { username: 'tester', password: 'p'.repeat(257) }, { username: ['a'], password: 'x' }]) {
    const res = makeRes();
    scryptCalls = 0;
    await withEnv({ JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined }, () => router(makeReq({ method: 'POST', url: '/api/login', body }), res));
    assert.equal(res.redirectedTo, '/auth/login.html?error=invalid');
    assert.equal(scryptCalls, 0);
  }
  assert.equal(calls.length, 0);
});
