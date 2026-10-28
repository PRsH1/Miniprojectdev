const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// 실제 Pusher 호출 대신 trigger 호출을 기록하는 가짜 모듈을 require 캐시에 주입
const pusherPath = path.join(__dirname, '..', 'controllers', '_shared', 'pusher.js');
const triggered = [];
let triggerError = null;
require.cache[require.resolve(pusherPath)] = {
  id: pusherPath,
  filename: pusherPath,
  loaded: true,
  exports: {
    async trigger(channel, event, payload) {
      if (triggerError) throw triggerError;
      triggered.push({ channel, event, payload });
    },
  },
};

const handler = require('../controllers/webhook-receiver');

function makeReq({ method = 'POST', headers = {}, body } = {}) {
  return { method, url: '/api/webhook-receiver', headers, body };
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    send(payload) { this.body = payload; return this; },
  };
}

function silenceConsole(fn) {
  return async () => {
    const saved = { log: console.log, warn: console.warn, error: console.error };
    console.log = console.warn = console.error = () => {};
    try { await fn(); } finally { Object.assign(console, saved); }
  };
}

test('허용 목록 헤더만 공개 채널로 전달한다', silenceConsole(async () => {
  triggered.length = 0;
  const req = makeReq({
    headers: {
      'content-type': 'application/json',
      'user-agent': 'eformsign-webhook',
      'eformsign_signature': 'sig-value',
      'x-secret': 'abc',
      'x-forwarded-for': '1.2.3.4',
      'x-real-ip': '1.2.3.4',
      authorization: 'Bearer leaked',
      cookie: 'auth_token=x',
    },
    body: { company_id: 'T1', document: { document_title: '<img src=x onerror=alert(1)>' } },
  });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 200);
  assert.equal(triggered.length, 1);
  const { channel, payload } = triggered[0];
  assert.equal(channel, 'company-T1');
  assert.deepEqual(Object.keys(payload.headers).sort(), ['content-type', 'eformsign_signature', 'user-agent']);
  // 본문 값은 그대로 전달하되(표시는 클라이언트가 텍스트로 처리) 헤더 유출은 없어야 한다
  assert.equal(payload.body.document.document_title, '<img src=x onerror=alert(1)>');
}));

test('본문이 없거나 JSON 객체가 아니면 400 VALIDATION_FAILED', silenceConsole(async () => {
  for (const body of [undefined, '', 'not-json', '[1,2]', [1, 2], null]) {
    triggered.length = 0;
    const res = makeRes();
    await handler(makeReq({ body }), res);
    assert.equal(res.statusCode, 400, `body=${JSON.stringify(body)}`);
    assert.equal(res.body.error.code, 'VALIDATION_FAILED');
    assert.equal(triggered.length, 0);
  }
}));

test('req.body getter가 예외를 던져도 400으로 응답한다', silenceConsole(async () => {
  const req = makeReq();
  Object.defineProperty(req, 'body', { get() { throw new Error('Invalid JSON'); } });
  const res = makeRes();
  await handler(req, res);
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
}));

test('채널명으로 쓸 수 없는 company_id는 400', silenceConsole(async () => {
  triggered.length = 0;
  const res = makeRes();
  await handler(makeReq({ body: { company_id: 'a b<c>' } }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(triggered.length, 0);
}));

test('10KB 초과 페이로드는 요약본 + truncated:true 로 전달한다', silenceConsole(async () => {
  triggered.length = 0;
  const big = 'x'.repeat(20000);
  const res = makeRes();
  await handler(makeReq({
    headers: { 'content-type': 'application/json' },
    body: { company_id: 'T1', webhook_id: 'w1', event_type: 'document', document: { id: 'd1', document_title: 't', fields: big } },
  }), res);
  assert.equal(res.statusCode, 200);
  const { payload } = triggered[0];
  assert.equal(payload.truncated, true);
  assert.ok(Buffer.byteLength(JSON.stringify(payload)) <= handler._internal.MAX_PUSHER_PAYLOAD_BYTES);
  assert.equal(payload.body.document.id, 'd1');
  assert.equal(payload.body.document.fields, undefined);
}));

test('Pusher 실패는 502 UPSTREAM_API_ERROR', silenceConsole(async () => {
  triggerError = new Error('pusher down');
  try {
    const res = makeRes();
    await handler(makeReq({ body: { company_id: 'T1' } }), res);
    assert.equal(res.statusCode, 502);
    assert.equal(res.body.error.code, 'UPSTREAM_API_ERROR');
  } finally {
    triggerError = null;
  }
}));
