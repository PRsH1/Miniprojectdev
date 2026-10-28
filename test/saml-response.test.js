/**
 * P0-10 회귀 — samlify 업그레이드 후에도 lib/saml.js의 응답 생성이 그대로 동작하는지 확인
 * (네트워크 없이: 런타임에 RSA 키를 만들어 서명 → 디코딩한 XML 구조만 검사)
 *
 * 실제 eformsign SP 로그인 성공 여부는 런타임(SAML test 대상) 검증이 별도로 필요하다.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

/**
 * 테스트 전용 일회성 RSA 키 + 자체 서명 인증서를 openssl로 생성
 * (samlify가 서명 시 인증서를 X.509로 파싱하므로 실제 인증서 형식이 필요. Node에는 인증서 생성 API가 없다)
 * openssl이 없으면 null → 테스트 skip
 */
function makeTestKeyPair() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'saml-test-'));
  const keyFile = path.join(dir, 'k.pem');
  const certFile = path.join(dir, 'c.pem');
  try {
    execFileSync('openssl', [
      'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1',
      '-subj', '/CN=saml-unit-test', '-keyout', keyFile, '-out', certFile,
    ], { stdio: 'ignore' });
    return { key: fs.readFileSync(keyFile), cert: fs.readFileSync(certFile) };
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const keyPair = makeTestKeyPair();
const skip = keyPair ? false : 'openssl을 찾을 수 없어 SAML 회귀 테스트를 건너뜀';

// lib/saml.js는 require 시점에 env를 읽으므로 먼저 설정
process.env.BASE_URL = 'https://hub.example.test';
if (keyPair) {
  process.env.SAML_PRIVATE_KEY = keyPair.key.toString('base64');
  process.env.SAML_PUBLIC_CERT = keyPair.cert.toString('base64');
}

// lib/saml.js는 로드 시 인증서를 파싱하므로 키가 없으면 require 자체가 실패한다(ERR_INVALID_CERTIFICATE).
// openssl이 없는 환경(예: PowerShell PATH)에서도 파일 전체가 실패하지 않고 skip되도록 키가 있을 때만 로드한다.
const { idp, resolveTarget, createTemplateCallback, parseAuthnRequest, ACS_URLS } = keyPair ? require('../lib/saml') : {};
const zlib = require('node:zlib');

async function buildResponse(user, target = 'test') {
  const { acsUrl, sp } = resolveTarget(target);
  const { context } = await idp.createLoginResponse(
    sp,
    { extract: { request: { id: 'req_1' } } },
    'post',
    user,
    createTemplateCallback(acsUrl, user, 'req_1'),
  );
  return { xml: Buffer.from(context, 'base64').toString('utf8'), acsUrl };
}

test('createLoginResponse: 서명·Destination·속성(email/name)이 포함된 SAMLResponse 생성', { skip }, async () => {
  const user = { email: 'tester@example.test', name: '테스터', NameID: 'tester@example.test' };
  const { xml, acsUrl } = await buildResponse(user);

  assert.equal(acsUrl, ACS_URLS.test);
  assert.match(xml, new RegExp(`Destination="${acsUrl.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}"`));
  assert.match(xml, /<(ds:)?Signature[\s>]/);
  assert.match(xml, /<saml:NameID [^>]*>tester@example\.test<\/saml:NameID>/);
  assert.match(xml, /AttributeStatement/);
  assert.match(xml, /identity\/claims\/emailaddress/);
  assert.match(xml, />tester@example\.test</);
  assert.match(xml, />테스터</);
  assert.match(xml, /InResponseTo="req_1"/);
});

test('속성 값의 XML 특수문자는 마크업으로 주입되지 않는다 (samlify >= 2.13 XML injection 수정)', { skip }, async () => {
  const evil = 'x</saml:AttributeValue><saml:AttributeValue>admin';
  const user = { email: 'tester@example.test', name: evil, NameID: 'tester@example.test' };
  const { xml } = await buildResponse(user);

  assert.equal(xml.includes('<saml:AttributeValue>admin'), false, '주입된 AttributeValue 요소가 없어야 함');
  assert.match(xml, /&lt;\/saml:AttributeValue&gt;/);
});

// ── P0b-11: InResponseTo에 실제 AuthnRequest ID 사용 ─────────────────
const REQ_ID = '_a1b2c3d4-e5f6-7890-abcd-ef0123456789';

function authnRequestXml(id, acsUrl) {
  return '<samlp:AuthnRequest xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol" '
    + `xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion" ID="${id}" Version="2.0" `
    + `IssueInstant="2026-10-28T00:00:00Z" AssertionConsumerServiceURL="${acsUrl}">`
    + '<saml:Issuer ID="_issuer_should_be_ignored">urn:eformsign:service</saml:Issuer></samlp:AuthnRequest>';
}
const redirectEncode = (xml) => zlib.deflateRawSync(Buffer.from(xml, 'utf8')).toString('base64');
const postEncode = (xml) => Buffer.from(xml, 'utf8').toString('base64');

test('parseAuthnRequest: Redirect(deflate)·POST(base64) 바인딩 모두에서 루트 ID와 ACS를 추출', { skip }, () => {
  for (const encode of [redirectEncode, postEncode]) {
    const parsed = parseAuthnRequest(encode(authnRequestXml(REQ_ID, ACS_URLS.dev)));
    assert.equal(parsed.requestId, REQ_ID);
    assert.equal(parsed.acsUrl, ACS_URLS.dev);
  }
});

test('parseAuthnRequest: 형식이 맞지 않는 ID·깨진 입력은 null', { skip }, () => {
  assert.equal(parseAuthnRequest(redirectEncode(authnRequestXml('1starts-with-digit', ACS_URLS.test))).requestId, null);
  assert.equal(parseAuthnRequest(redirectEncode(authnRequestXml('a b', ACS_URLS.test))).requestId, null);
  // 루트에 ID가 없으면 하위 요소(Issuer)의 ID를 가져오지 않는다
  const noRootId = authnRequestXml(REQ_ID, ACS_URLS.test).replace(` ID="${REQ_ID}"`, '');
  assert.equal(parseAuthnRequest(redirectEncode(noRootId)).requestId, null);
  assert.deepEqual(parseAuthnRequest(undefined), { acsUrl: null, requestId: null });
  assert.deepEqual(parseAuthnRequest('!!!not-base64'), { acsUrl: null, requestId: null });
  assert.deepEqual(parseAuthnRequest(['a']), { acsUrl: null, requestId: null });
});

test('createTemplateCallback: requestId가 없으면 InResponseTo 속성을 생략한다', { skip }, async () => {
  const user = { email: 'tester@example.test', name: '테스터' };
  const { acsUrl, sp } = resolveTarget('test');
  const { context } = await idp.createLoginResponse(sp, {}, 'post', user, createTemplateCallback(acsUrl, user, null));
  const xml = Buffer.from(context, 'base64').toString('utf8');
  assert.equal(xml.includes('InResponseTo'), false);
  assert.match(xml, /<(ds:)?Signature[\s>]/);
});

test('/api/auth: SP 개시 요청의 실제 ID가 Response와 SubjectConfirmationData의 InResponseTo로 들어간다', { skip }, async () => {
  const handler = require('../controllers/auth');
  const res = {
    statusCode: 200, headers: {}, body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    send(b) { this.body = b; return this; },
    json(b) { this.body = b; return this; },
  };
  const SAMLRequest = redirectEncode(authnRequestXml(REQ_ID, ACS_URLS.test2));
  await handler({
    method: 'POST',
    url: '/api/auth',
    body: { email: 'tester@example.test', name: '테스터', SAMLRequest, RelayState: 'rs' },
  }, res);

  assert.equal(res.statusCode, 200);
  const m = res.body.match(/name="SAMLResponse" value="([^"]+)"/);
  assert.ok(m, 'SAMLResponse 폼 필드가 있어야 함');
  const xml = Buffer.from(m[1], 'base64').toString('utf8');
  const occurrences = xml.match(new RegExp(`InResponseTo="${REQ_ID}"`, 'g')) || [];
  assert.equal(occurrences.length, 2, 'Response와 SubjectConfirmationData 두 곳');
  assert.equal(xml.includes('request_id'), false, '하드코딩 값이 남아 있으면 안 됨');
  assert.ok(res.body.includes(`action="${ACS_URLS.test2}"`), '요청 ACS(test2)로 전달');
});
