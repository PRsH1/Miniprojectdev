// P0-02: SAML 폼 반사형 XSS 제거 — escapeHtml / 입력 검증 단위 테스트 + 컨트롤러 응답 검증
const test = require('node:test');
const assert = require('node:assert/strict');

const { escapeHtml } = require('../lib/html-escape');
const { isValidSamlRequest, isValidRelayState, MAX_RELAY_STATE_LENGTH } = require('../lib/saml-input');

const XSS = '"><script>alert(1)</script>';

test('escapeHtml: & < > " \' 를 엔티티로 변환', () => {
  assert.equal(escapeHtml(XSS), '&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
  assert.equal(escapeHtml(`'onmouseover='x`), '&#39;onmouseover=&#39;x');
  assert.equal(escapeHtml('a&b'), 'a&amp;b');
  assert.equal(escapeHtml('&amp;'), '&amp;amp;'); // 이중 이스케이프는 의도된 동작(원문 보존)
  assert.equal(escapeHtml('javascript:alert(1)'), 'javascript:alert(1)'); // 스킴 검증 용도 아님
});

test('escapeHtml: null/undefined는 빈 문자열, 그 외는 문자열화', () => {
  assert.equal(escapeHtml(undefined), '');
  assert.equal(escapeHtml(null), '');
  assert.equal(escapeHtml(0), '0');
  assert.equal(escapeHtml('PHNhbWxwOkF1dGhuUmVxdWVzdA=='), 'PHNhbWxwOkF1dGhuUmVxdWVzdA==');
});

test('isValidSamlRequest: base64 문자셋(+공백·줄바꿈)만 허용', () => {
  for (const ok of [undefined, '', 'PHNhbWxwOkF1dGhuUmVxdWVzdA==', 'ab+/cd==', 'ab cd\r\nef==']) {
    assert.equal(isValidSamlRequest(ok), true, JSON.stringify(ok));
  }
  for (const bad of ['<b>x</b>', XSS, 'abc%3D', 'a"b', ['a', 'b'], { a: 1 }]) {
    assert.equal(isValidSamlRequest(bad), false, JSON.stringify(bad));
  }
});

test('isValidRelayState: 1024자 이하 단일 문자열만 허용', () => {
  assert.equal(isValidRelayState(undefined), true);
  assert.equal(isValidRelayState(''), true);
  assert.equal(isValidRelayState(XSS), true); // 내용은 제한하지 않고 반영 시 이스케이프
  assert.equal(isValidRelayState('x'.repeat(MAX_RELAY_STATE_LENGTH)), true);
  assert.equal(isValidRelayState('x'.repeat(MAX_RELAY_STATE_LENGTH + 1)), false);
  assert.equal(isValidRelayState(['a', 'b']), false);
});

// ── 컨트롤러 응답 검증 ─────────────────────────────────────────────
function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    send(b) { this.body = b; return this; },
    json(b) { this.body = b; return this; },
  };
}

test('sso-login: RelayState 스크립트 주입이 이스케이프되어 반영', () => {
  const handler = require('../controllers/sso-login');
  const res = makeRes();
  handler({ url: '/api/sso-login', query: { RelayState: XSS, SAMLRequest: 'PHNhbWw+\nAA==' } }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(!res.body.includes('<script>alert(1)'), '원문 스크립트가 반영되면 안 됨');
  assert.ok(res.body.includes('value="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"'));
  assert.ok(res.body.includes('name="SAMLRequest" value="PHNhbWw+\nAA=="'), '정상 base64는 그대로 전달');
});

test('sso-login: base64가 아닌 SAMLRequest / 과도한 RelayState → 400', () => {
  const handler = require('../controllers/sso-login');
  for (const query of [
    { SAMLRequest: '<b>x</b>' },
    { SAMLRequest: XSS },
    { SAMLRequest: ['a', 'b'] },
    { RelayState: 'x'.repeat(MAX_RELAY_STATE_LENGTH + 1) },
  ]) {
    const res = makeRes();
    handler({ url: '/api/sso-login', query }, res);
    assert.equal(res.statusCode, 400, JSON.stringify(query).slice(0, 60));
    assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  }
});

test('sso-login: target/debug 화이트리스트 동작 유지', () => {
  const handler = require('../controllers/sso-login');
  const res = makeRes();
  handler({ url: '/api/sso-login', query: { target: 'prod', debug: '1' } }, res);
  assert.ok(res.body.includes('name="target" value="prod"'));
  assert.ok(res.body.includes('name="debug" value="1"'));
  const res2 = makeRes();
  handler({ url: '/api/sso-login', query: { target: XSS } }, res2);
  assert.ok(res2.body.includes('name="target" value=""'));
});

// controllers/auth.js — lib/saml 모킹 (실제 키 없이 응답 HTML만 검증)
function loadAuthHandler(createLoginResponse) {
  const samlPath = require.resolve('../lib/saml');
  const authPath = require.resolve('../controllers/auth');
  const fakeSaml = {
    idp: { createLoginResponse },
    resolveTarget: (key) => ({ key, acsUrl: `https://${key}.example.com/acs?a=1&b=2`, sp: {} }),
    resolveTargetByAcsUrl: () => ({ key: 'test', acsUrl: 'https://test.example.com/acs', sp: {} }),
    extractAcsUrl: () => null,
    createTemplateCallback: () => () => ({}),
    debugDeliver: async () => {},
  };
  require.cache[samlPath] = { id: samlPath, filename: samlPath, loaded: true, exports: fakeSaml };
  delete require.cache[authPath];
  const handler = require('../controllers/auth');
  delete require.cache[samlPath];
  delete require.cache[authPath];
  return handler;
}

test('auth: RelayState·acsUrl이 자동 제출 폼에 이스케이프되어 반영', async () => {
  const context = Buffer.from('<samlp:Response/>').toString('base64');
  const handler = loadAuthHandler(async () => ({ context }));
  const res = makeRes();
  await handler({
    method: 'POST',
    url: '/api/auth',
    body: { email: 'a@b.c', name: 'n', RelayState: XSS, target: 'prod' },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.ok(!res.body.includes('<script>alert(1)'));
  assert.ok(res.body.includes('name="RelayState" value="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"'));
  assert.ok(res.body.includes('action="https://prod.example.com/acs?a=1&amp;b=2"'), 'prod target 유지');
  assert.ok(res.body.includes(`name="SAMLResponse" value="${context}"`));
});

test('auth: 내부 예외 시 메시지·스택을 응답에 노출하지 않음', async () => {
  const secret = 'SECRET_DETAIL <img src=x onerror=alert(1)>';
  const handler = loadAuthHandler(async () => { throw new Error(secret); });
  const res = makeRes();
  const origError = console.error;
  console.error = () => {}; // 테스트 출력 정리 (서버 로그는 그대로 호출됨)
  try {
    await handler({ method: 'POST', url: '/api/auth', body: { email: 'a@b.c', name: 'n' } }, res);
  } finally {
    console.error = origError;
  }
  assert.equal(res.statusCode, 500);
  const text = JSON.stringify(res.body);
  assert.ok(!text.includes('SECRET_DETAIL'));
  assert.ok(!text.includes('onerror'));
  assert.equal(res.body.error.code, 'INTERNAL_ERROR');
});

test('auth: 과도한 RelayState → 400', async () => {
  const handler = loadAuthHandler(async () => ({ context: 'AA==' }));
  const res = makeRes();
  await handler({
    method: 'POST',
    url: '/api/auth',
    body: { email: 'a@b.c', name: 'n', RelayState: 'x'.repeat(MAX_RELAY_STATE_LENGTH + 1) },
  }, res);
  assert.equal(res.statusCode, 400);
});
