// F-1: IdP 개시 로그인 — 이메일·이름 누락 시 평문 대신 이스케이프된 HTML 안내 페이지(돌아가기 링크)
const test = require('node:test');
const assert = require('node:assert/strict');

const { makeReq, makeRes } = require('./helpers/http-mocks');

const XSS = '"><script>alert(1)</script>';

// lib/saml 모킹 (실제 키·BASE_URL 없이 컨트롤러 응답만 검증) — saml-xss.test.js와 같은 방식
const calls = [];
function loadHandler() {
  const samlPath = require.resolve('../lib/saml');
  const ctrlPath = require.resolve('../controllers/idp-initiated-login');
  const fakeSaml = {
    idp: {
      createLoginResponse: async (...args) => {
        calls.push(args);
        return { context: Buffer.from('<samlp:Response/>').toString('base64') };
      },
    },
    resolveTarget: (key) => ({ key: key || 'test', acsUrl: 'https://test.example.com/acs', sp: {} }),
    createTemplateCallback: () => () => ({}),
    debugDeliver: async () => {},
  };
  require.cache[samlPath] = { id: samlPath, filename: samlPath, loaded: true, exports: fakeSaml };
  delete require.cache[ctrlPath];
  const h = require('../controllers/idp-initiated-login');
  delete require.cache[samlPath];
  delete require.cache[ctrlPath];
  return h;
}
const handler = loadHandler();

async function post(body) {
  const res = makeRes();
  await handler(makeReq({ method: 'POST', url: '/api/idp-initiated-login', body }), res);
  return res;
}

function assertGuidePage(res, heading) {
  assert.equal(res.statusCode, 400);
  assert.match(res.headers['content-type'], /^text\/html/);
  assert.match(res.body, /^<!DOCTYPE html>/);
  assert.ok(res.body.includes(`<h1>${heading}</h1>`), res.body);
  assert.ok(res.body.includes('<a href="/app/idptestauth">돌아가기</a>'));
}

test('이메일 누락 → "이메일이 필요합니다." 안내 페이지', async () => {
  assertGuidePage(await post({ name: '홍길동' }), '이메일이 필요합니다.');
});

test('이름 누락 → "이름이 필요합니다." 안내 페이지', async () => {
  assertGuidePage(await post({ email: 'a@example.com' }), '이름이 필요합니다.');
});

test('둘 다 누락·공백만 입력·body 없음 → "이메일과 이름이 필요합니다."', async () => {
  assertGuidePage(await post({}), '이메일과 이름이 필요합니다.');
  assertGuidePage(await post({ email: '   ', name: '\t' }), '이메일과 이름이 필요합니다.');
  assertGuidePage(await post(undefined), '이메일과 이름이 필요합니다.');
});

test('누락 시 SAML 응답을 만들지 않고, 둘 다 있으면 기존대로 자동 제출 폼(200)', async () => {
  calls.length = 0;
  await post({ name: '홍길동' });
  assert.equal(calls.length, 0);
  const res = await post({ email: 'a@example.com', name: '홍길동', target: 'test' });
  assert.equal(res.statusCode, 200);
  assert.equal(calls.length, 1);
  assert.ok(res.body.includes('action="https://test.example.com/acs"'));
  assert.ok(res.body.includes('name="SAMLResponse"'));
});

test('누락 안내 페이지는 입력값을 반영하지 않는다(스크립트 주입 없음)', async () => {
  const res = await post({ email: '', name: XSS, target: XSS });
  assertGuidePage(res, '이메일이 필요합니다.');
  assert.ok(!res.body.includes('<script'), '사용자 입력이 HTML에 들어가면 안 됨');
  assert.ok(!res.body.includes('alert(1)'));
});
