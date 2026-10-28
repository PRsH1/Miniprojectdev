/**
 * P0b-05 — 크리덴셜 secret_key 암호문 포맷
 * - 신규: `v1:{iv}:{tag}:{ct}` + authTagLength 16 + AAD(user_id)
 * - 하위 호환: 접두어 없는 `{iv}:{tag}:{ct}`(AAD 없음) 복호화, 암호화 이전 평문은 그대로
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
const { decryptSecret, detectFormat, encryptSecret, isEncryptedValue } = require('../controllers/_shared/credential-crypto');

// 테스트 전용 더미 키 (실제 비밀 아님) — 32바이트 hex를 문자열 연산으로 만든다
const KEY = 'ab'.repeat(32);
const OTHER_KEY = 'cd'.repeat(32);
const USER_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const USER_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const SECRET = 'DUMMY-ecdsa-private-key-hex';

const withKey = (key, fn) => withEnv({ CREDENTIAL_ENCRYPTION_KEY: key }, fn);

/** 이전 코드(P0b-05 이전)와 같은 방식으로 만든 기존 형식 암호문 */
function legacyEncrypt(plaintext, keyHex, tagLength = 16) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', Buffer.from(keyHex, 'hex'), iv, { authTagLength: tagLength });
  const ct = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${ct.toString('hex')}`;
}

test('encryptSecret: v1 접두어 + 12바이트 IV + 16바이트 태그, 매번 다른 IV', async () => {
  await withKey(KEY, () => {
    const a = encryptSecret(SECRET, USER_A);
    const b = encryptSecret(SECRET, USER_A);
    assert.match(a, /^v1:[0-9a-f]{24}:[0-9a-f]{32}:[0-9a-f]+$/);
    assert.notEqual(a, b);
    assert.equal(detectFormat(a), 'v1');
    assert.deepEqual(decryptSecret(a, USER_A), { plaintext: SECRET, format: 'v1' });
  });
});

test('v1 암호문은 다른 사용자(AAD 불일치)·다른 키·변조된 태그/본문으로 복호화되지 않는다', async () => {
  await withKey(KEY, () => {
    const enc = encryptSecret(SECRET, USER_A);
    assert.throws(() => decryptSecret(enc, USER_B));
    const parts = enc.split(':');
    const flip = (hex) => (hex[0] === '0' ? '1' : '0') + hex.slice(1);
    assert.throws(() => decryptSecret([parts[0], parts[1], flip(parts[2]), parts[3]].join(':'), USER_A));
    assert.throws(() => decryptSecret([parts[0], parts[1], parts[2], flip(parts[3])].join(':'), USER_A));
  });
  await withKey(OTHER_KEY, () => {
    // 같은 형식이라도 키가 다르면 실패
    assert.throws(() => decryptSecret(`v1:${'00'.repeat(12)}:${'00'.repeat(16)}:00`, USER_A));
  });
});

test('잘린(짧은) 인증 태그는 형식 단계에서 거부된다 (authTagLength 16 강제)', async () => {
  await withKey(KEY, () => {
    const enc = encryptSecret(SECRET, USER_A);
    const [v, iv, tag, ct] = enc.split(':');
    const short = [v, iv, tag.slice(0, 8), ct].join(':');
    assert.equal(detectFormat(short), 'invalid-v1');
    assert.throws(() => decryptSecret(short, USER_A), /형식/);
    // 기존 형식에서도 4바이트 태그는 암호문으로 인정하지 않는다 → 평문 취급(복호화 시도 안 함)
    const legacyShort = legacyEncrypt(SECRET, KEY, 4);
    assert.equal(detectFormat(legacyShort), 'plain');
  });
});

test('하위 호환: 접두어 없는 기존 형식은 AAD 없이 복호화된다', async () => {
  await withKey(KEY, () => {
    const legacy = legacyEncrypt(SECRET, KEY);
    assert.equal(detectFormat(legacy), 'legacy');
    assert.equal(isEncryptedValue(legacy), true);
    assert.deepEqual(decryptSecret(legacy, USER_A), { plaintext: SECRET, format: 'legacy' });
    // 기존 형식은 user_id와 무관 (AAD 없음)
    assert.equal(decryptSecret(legacy, USER_B).plaintext, SECRET);
  });
});

test('암호화 이전 평문은 그대로 반환 — 콜론 2개가 든 평문도 500 없이 처리', async () => {
  await withKey(KEY, () => {
    for (const plain of ['a:b:c', 'plain-secret', '1234:5678:abcd', '']) {
      assert.equal(detectFormat(plain), 'plain', plain);
      assert.equal(isEncryptedValue(plain), false);
      assert.deepEqual(decryptSecret(plain, USER_A), { plaintext: plain, format: 'plain' });
    }
  });
});

test('키가 없거나 64자 hex가 아니면 암호화 실패', async () => {
  await withKey(undefined, () => assert.throws(() => encryptSecret(SECRET, USER_A), /설정되지/));
  await withKey('abcd', () => assert.throws(() => encryptSecret(SECRET, USER_A), /64자/));
  await withKey(KEY, () => assert.throws(() => encryptSecret(SECRET, ''), /user_id/));
});

// ── 컨트롤러 통합 ─────────────────────────────────────
const userState = {
  match: /SELECT id, username, email, role, is_active, must_change_password\s+FROM users/,
  rows: [{ id: USER_A, username: 'a', email: 'a@x.test', role: 'user', is_active: true, must_change_password: false }],
};
const CRED_ID = '11111111-1111-4111-8111-111111111111';

async function call({ method, url, body, rows }) {
  const calls = [];
  db.setSql(makeSql([
    userState,
    { match: /INSERT INTO eformsign_credentials/, rows: [{ id: CRED_ID, name: 'n' }] },
    { match: /FROM eformsign_credentials\s+WHERE id =/, rows: rows || [] },
  ], calls));
  const res = makeRes();
  await withEnv(
    { JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined, CREDENTIAL_ENCRYPTION_KEY: KEY, NODE_ENV: 'development' },
    () => router(makeReq({ method, url, body, cookies: { auth_token: signTestToken({ sub: USER_A, role: 'user', mustChangePw: false }) } }), res),
  );
  return { res, calls };
}

test('POST /api/credentials: secret_key를 v1(AAD=user_id) 형식으로 저장', async () => {
  const { res, calls } = await call({
    method: 'POST',
    url: '/api/credentials',
    body: { name: 'n', environment: 'op_saas', api_key: 'k', eform_user_id: 'u', secret_method: 'signature', secret_key: SECRET },
  });
  assert.equal(res.statusCode, 201);
  const insert = calls.find((c) => /INSERT INTO eformsign_credentials/.test(c.text));
  const stored = insert.values[insert.values.length - 1];
  assert.match(stored, /^v1:/);
  await withKey(KEY, () => assert.equal(decryptSecret(stored, USER_A).plaintext, SECRET));
});

test('GET /api/credentials/:id: v1·기존 형식·평문 모두 평문으로 반환', async () => {
  const v1 = await withKey(KEY, () => encryptSecret(SECRET, USER_A));
  const legacy = legacyEncrypt(SECRET, KEY);
  for (const stored of [v1, legacy, SECRET, 'x:y:z']) {
    const { res } = await call({ method: 'GET', url: `/api/credentials/${CRED_ID}`, rows: [{ id: CRED_ID, secret_key: stored }] });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.secret_key, stored === 'x:y:z' ? 'x:y:z' : SECRET);
  }
});

test('GET /api/credentials/:id: 다른 사용자 AAD로 만든 v1 값은 500(복호화 실패), 평문 노출 없음', async () => {
  const foreign = await withKey(KEY, () => encryptSecret(SECRET, USER_B));
  const origError = console.error;
  console.error = () => {};
  try {
    const { res } = await call({ method: 'GET', url: `/api/credentials/${CRED_ID}`, rows: [{ id: CRED_ID, secret_key: foreign }] });
    assert.equal(res.statusCode, 500);
    assert.equal(JSON.stringify(res.body).includes(SECRET), false);
  } finally {
    console.error = origError;
  }
});
