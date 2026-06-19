const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const { parse } = require('cookie');

const { tryRefreshToken } = require('../controllers/_shared/auth-middleware');

function makeSql(responses, calls) {
  return async function sql(strings, ...values) {
    calls.push({ text: strings.join('$'), values });
    const next = responses.shift();
    if (next instanceof Error) throw next;
    if (typeof next === 'function') return next(calls[calls.length - 1]);
    return next;
  };
}

function makeRes() {
  return {
    headers: {},
    setHeader(name, value) {
      this.headers[name.toLowerCase()] = value;
    },
  };
}

async function withRefreshHarness(callback) {
  const hadSecret = Object.prototype.hasOwnProperty.call(process.env, 'JWT_SECRET');
  const previousSecret = process.env.JWT_SECRET;
  const originalUuid = crypto.randomUUID;
  const uuids = ['new-refresh-token-id', 'new-refresh-token'];

  process.env.JWT_SECRET = 'refresh-rotation-test-secret';
  crypto.randomUUID = () => {
    const next = uuids.shift();
    assert.ok(next, 'unexpected crypto.randomUUID call');
    return next;
  };

  try {
    await callback();
  } finally {
    crypto.randomUUID = originalUuid;
    if (hadSecret) process.env.JWT_SECRET = previousSecret;
    else delete process.env.JWT_SECRET;
  }
}

function verifyAuthCookie(cookieValue) {
  const parsed = parse(cookieValue);
  return jwt.verify(parsed.auth_token, process.env.JWT_SECRET);
}

test('tryRefreshToken rotates the winning refresh token atomically and sets both cookies', async () => {
  await withRefreshHarness(async () => {
    const calls = [];
    const sql = makeSql([
      [{
        id: 'old-refresh-token-id',
        user_id: 'user-1',
        role: 'manager',
        must_change_password: false,
        is_active: true,
      }],
    ], calls);
    const res = makeRes();

    const payload = await tryRefreshToken(sql, 'old-refresh-token', res, false);

    assert.deepEqual(payload, { sub: 'user-1', role: 'manager', mustChangePw: false });
    assert.equal(calls.length, 1);
    assert.match(calls[0].text, /UPDATE refresh_tokens rt/);
    assert.match(calls[0].text, /SET revoked_at = now\(\), replaced_by =/);
    assert.match(calls[0].text, /INSERT INTO refresh_tokens \(id, user_id, token_hash, expires_at\)/);
    assert.equal(calls[0].values[0], 'new-refresh-token-id');
    assert.equal(
      calls[0].values[1],
      crypto.createHash('sha256').update('old-refresh-token').digest('hex')
    );

    const setCookies = res.headers['set-cookie'];
    assert.equal(Array.isArray(setCookies), true);
    assert.equal(setCookies.length, 2);
    assert.equal(parse(setCookies[1]).refresh_token, 'new-refresh-token');

    const decoded = verifyAuthCookie(setCookies[0]);
    assert.equal(decoded.sub, 'user-1');
    assert.equal(decoded.role, 'manager');
    assert.equal(decoded.mustChangePw, false);
  });
});

test('tryRefreshToken grants grace loser only a new access token cookie', async () => {
  await withRefreshHarness(async () => {
    const calls = [];
    const sql = makeSql([
      [],
      [{
        id: 'old-refresh-token-id',
        user_id: 'user-1',
        role: 'user',
        must_change_password: true,
        is_active: true,
      }],
    ], calls);
    const res = makeRes();

    const payload = await tryRefreshToken(sql, 'old-refresh-token', res, false);

    assert.deepEqual(payload, { sub: 'user-1', role: 'user', mustChangePw: true });
    assert.equal(calls.length, 2);
    assert.match(calls[1].text, /rt\.replaced_by IS NOT NULL/);
    assert.match(calls[1].text, /rt\.revoked_at > now\(\) - interval '30 seconds'/);

    const setCookies = res.headers['set-cookie'];
    assert.equal(Array.isArray(setCookies), true);
    assert.equal(setCookies.length, 1);
    assert.equal(parse(setCookies[0]).refresh_token, undefined);

    const decoded = verifyAuthCookie(setCookies[0]);
    assert.equal(decoded.sub, 'user-1');
  });
});

test('tryRefreshToken rejects logout-revoked tokens because grace requires replaced_by', async () => {
  await withRefreshHarness(async () => {
    const calls = [];
    const sql = makeSql([[], []], calls);
    const res = makeRes();

    const payload = await tryRefreshToken(sql, 'logout-token', res, false);

    assert.equal(payload, null);
    assert.equal(res.headers['set-cookie'], undefined);
    assert.equal(calls.length, 2);
    assert.match(calls[1].text, /rt\.replaced_by IS NOT NULL/);
  });
});

test('tryRefreshToken rejects expired refresh tokens outside the grace query', async () => {
  await withRefreshHarness(async () => {
    const calls = [];
    const sql = makeSql([[], []], calls);
    const res = makeRes();

    const payload = await tryRefreshToken(sql, 'expired-token', res, false);

    assert.equal(payload, null);
    assert.equal(res.headers['set-cookie'], undefined);
    assert.equal(calls.length, 2);
    assert.match(calls[0].text, /rt\.expires_at > now\(\)/);
    assert.match(calls[1].text, /rt\.expires_at > now\(\)/);
  });
});
