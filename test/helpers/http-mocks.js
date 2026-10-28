/**
 * test/helpers/http-mocks.js
 * 컨트롤러·라우터 단위 테스트용 req/res/sql 목(mock)
 */

const jwt = require('jsonwebtoken');

// 테스트 전용 더미 값 (실제 비밀 아님)
const TEST_JWT_SECRET = 'DUMMY-unit-test-signing-key';

function makeReq({ method = 'GET', url = '/', cookies = {}, headers = {}, body } = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return {
    method,
    url,
    body,
    headers: { ...(cookieHeader ? { cookie: cookieHeader } : {}), ...headers },
    socket: { remoteAddress: '127.0.0.1' },
  };
}

function makeRes() {
  const res = {
    statusCode: 200,
    headers: {},
    body: undefined,
    headersSent: false,
    redirectedTo: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    getHeader(name) { return this.headers[name.toLowerCase()]; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; this.headersSent = true; return this; },
    send(payload) { this.body = payload; this.headersSent = true; return this; },
    redirect(code, location) { this.statusCode = code; this.redirectedTo = location; this.headersSent = true; return this; },
  };
  return res;
}

/**
 * 쿼리 텍스트 기반으로 응답하는 sql 태그 목
 * handlers: [{ match: RegExp, rows: [] | (call) => rows | Error }]
 * 매칭되는 핸들러가 없으면 빈 배열 반환
 */
function makeSql(handlers = [], calls = []) {
  async function sql(strings, ...values) {
    const text = strings.join('$');
    const call = { text, values };
    calls.push(call);
    const handler = handlers.find((h) => h.match.test(text));
    if (!handler) return [];
    const result = typeof handler.rows === 'function' ? handler.rows(call) : handler.rows;
    if (result instanceof Error) throw result;
    return result;
  }
  sql.calls = calls;
  return sql;
}

function signTestToken(payload, options = { expiresIn: '1h' }) {
  return jwt.sign(payload, TEST_JWT_SECRET, options);
}

/** 환경변수를 잠시 바꿔 콜백을 실행하고 원복 */
async function withEnv(vars, callback) {
  const previous = {};
  for (const [key, value] of Object.entries(vars)) {
    previous[key] = Object.prototype.hasOwnProperty.call(process.env, key) ? process.env[key] : undefined;
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  try {
    return await callback();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

/**
 * controllers/_shared/db.js 의 getDb를 목으로 교체
 * 컨트롤러는 `const { getDb } = require('./_shared/db')`로 로드 시점에 함수를 구조분해하므로,
 * 반드시 컨트롤러를 require 하기 전에 호출해야 한다. 반환된 setSql로 테스트마다 sql을 바꾼다.
 */
function installDbMock() {
  const dbModule = require('../../controllers/_shared/db');
  let current = makeSql();
  dbModule.getDb = () => current;
  return {
    setSql(sql) { current = sql; },
  };
}

module.exports = {
  TEST_JWT_SECRET,
  installDbMock,
  makeReq,
  makeRes,
  makeSql,
  signTestToken,
  withEnv,
};
