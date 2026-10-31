/**
 * controllers/send.js (SMTP 발송 테스트) — 실패 시 logs 반환·크리덴셜 마스킹 (P1-22)
 * nodemailer는 require 캐시에 가짜 모듈을 넣어 실제 네트워크 없이 실행한다.
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { makeReq, makeRes } = require('./helpers/http-mocks');

// ── nodemailer 목 ────────────────────────────────────────────
const nodemailerPath = require.resolve('nodemailer');
let behavior = null;      // (options) => Promise<info>  (options.logger로 로그를 남길 수 있음)
let lastOptions = null;
require.cache[nodemailerPath] = {
  id: nodemailerPath,
  filename: nodemailerPath,
  loaded: true,
  exports: {
    createTransport(options) {
      lastOptions = options;
      return { sendMail: () => behavior(options) };
    },
  },
};

const handler = require('../controllers/send');

const PASSWORD = 'DUMMY-smtp-P@ss:word';
const PASSWORD_B64 = Buffer.from(PASSWORD, 'utf-8').toString('base64');

function formBody(overrides = {}) {
  return new URLSearchParams({
    host: 'smtp.example.invalid',
    port: '587',
    authRequired: 'true',
    user: 'qa@example.com',
    pass: PASSWORD,
    from: 'qa@example.com',
    to: 'rcpt@example.com',
    security: 'tls',
    ...overrides,
  }).toString();
}

function silenceConsole(fn) {
  return async () => {
    const saved = { log: console.log, warn: console.warn, error: console.error };
    console.log = console.warn = console.error = () => {};
    try { await fn(); } finally { Object.assign(console, saved); }
  };
}

async function run(body, method = 'POST') {
  const req = makeReq({ method, url: '/api/send', body });
  const res = makeRes();
  await handler(req, res);
  return res;
}

function nmError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

test('GET은 405', silenceConsole(async () => {
  const res = await run(undefined, 'GET');
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.error.code, 'METHOD_NOT_ALLOWED');
}));

test('필수값 누락은 400 + 누락 항목 안내 + logs 배열', silenceConsole(async () => {
  const res = await run(formBody({ host: '', to: '' }));
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  assert.match(res.body.error.reason, /Host, To/);
  assert.ok(Array.isArray(res.body.logs));
}));

test('존재하지 않는 호스트(EDNS) → 502 + 한글 사유 + 연결 시도 로그, undefined 없음', silenceConsole(async () => {
  behavior = async (opts) => {
    opts.logger.info('Resolving smtp.example.invalid');
    opts.logger.error('getaddrinfo ENOTFOUND smtp.example.invalid');
    throw nmError('EDNS', 'getaddrinfo ENOTFOUND smtp.example.invalid');
  };
  const res = await run(formBody());
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.error.code, 'UPSTREAM_API_ERROR');
  assert.equal(res.body.error.message, '메일 발송 테스트에 실패했습니다.');
  assert.match(res.body.error.reason, /호스트 이름을 찾을 수 없습니다/);
  assert.ok(Array.isArray(res.body.logs) && res.body.logs.length > 0);
  assert.ok(res.body.logs.some((l) => l.startsWith('[CONNECT] smtp.example.invalid:587')));
  assert.ok(res.body.logs.some((l) => l.includes('[EDNS]')));
  const serialized = JSON.stringify(res.body);
  assert.ok(!serialized.includes('undefined'));
  assert.ok(!serialized.includes(PASSWORD));
}));

test('인증 실패(EAUTH) 로그에서 비밀번호 원문·base64·AUTH PLAIN 페이로드를 가린다', silenceConsole(async () => {
  behavior = async (opts) => {
    // nodemailer가 마스킹하지 못한 경우를 가정한 최악의 로그
    opts.logger.debug(`C: AUTH PLAIN ${Buffer.from('\u0000qa@example.com\u0000' + PASSWORD).toString('base64')}`);
    opts.logger.debug(`C: ${PASSWORD_B64}`);
    opts.logger.debug(`echo ${PASSWORD} ${encodeURIComponent(PASSWORD)}`);
    throw nmError('EAUTH', 'Invalid login: 535 Authentication failed');
  };
  const res = await run(formBody());
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error.reason, /인증에 실패/);
  const logs = res.body.logs.join('\n');
  assert.ok(!logs.includes(PASSWORD), '비밀번호 원문 노출');
  assert.ok(!logs.includes(PASSWORD_B64), '비밀번호 base64 노출');
  assert.ok(!logs.includes(encodeURIComponent(PASSWORD)), '비밀번호 URL 인코딩 노출');
  assert.match(logs, /AUTH PLAIN \/\* secret \*\//);
  assert.match(logs, /Password=\(입력됨\)/);
  assert.ok(!JSON.stringify(res.body).includes(PASSWORD));
}));

test('알 수 없는 에러 코드는 기본 사유', silenceConsole(async () => {
  behavior = async () => { throw new Error('boom'); };
  const res = await run(formBody());
  assert.equal(res.statusCode, 502);
  assert.match(res.body.error.reason, /SMTP 로그를 확인/);
}));

test('성공 응답은 평문 message(HTML 없음) + 마스킹된 logs', silenceConsole(async () => {
  behavior = async (opts) => {
    opts.logger.debug(`C: ${PASSWORD_B64}`);
    return { response: '250 2.0.0 OK queued' };
  };
  const res = await run(formBody({ to: '<img src=x onerror=alert(1)>@example.com' }));
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.success, true);
  assert.ok(!/<span|style=/.test(res.body.message));
  assert.ok(res.body.logs.some((l) => l.includes('[SUCCESS]')));
  assert.ok(!res.body.logs.join('\n').includes(PASSWORD_B64));
}));

test('타임아웃을 함수 제한 시간 안으로 설정한다', silenceConsole(async () => {
  behavior = async () => ({ response: '250 OK' });
  await run(formBody({ authRequired: 'false', pass: '' }));
  assert.equal(lastOptions.connectionTimeout, 10000);
  assert.equal(lastOptions.greetingTimeout, 10000);
  assert.equal(lastOptions.socketTimeout, 20000);
  assert.equal(lastOptions.auth, undefined);
}));

test('로그 줄 수 상한', silenceConsole(async () => {
  behavior = async (opts) => {
    for (let i = 0; i < 1000; i += 1) opts.logger.debug('line ' + i);
    throw nmError('ETIMEDOUT', 'Greeting never received');
  };
  const res = await run(formBody());
  const { MAX_LOG_LINES } = handler._internal;
  assert.equal(res.body.logs.length, MAX_LOG_LINES + 1);
  assert.match(res.body.logs[res.body.logs.length - 1], /생략/);
  assert.match(res.body.error.reason, /시간이 초과/);
}));
