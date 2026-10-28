// P0-06: 로그인 next open redirect 차단 — safeNext 단위 테스트 + login.js 리다이렉트 검증
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const { safeNext } = require('../lib/safe-next');

const ROOT = path.join(__dirname, '..');

// 거부되어야 하는 값 (→ fallback)
const REJECT_CASES = [
  'https://evil.com',
  'http://evil.com/app/x',
  '//evil.com',
  '///evil.com',
  '/\\evil.com',
  '\\\\evil.com',
  '/%2F%2Fevil.com',
  '/%2f%2fevil.com',
  '/%5Cevil.com',
  '/%252F%252Fevil.com',
  '/%0d%0aSet-Cookie:x',
  '/\r\nSet-Cookie:x',
  '/\t/evil.com',
  '/app\nx',
  'javascript:alert(1)',
  'JaVaScRiPt:alert(1)',
  'data:text/html,<script>alert(1)</script>',
  'evil.com',
  'app/memberV2',
  '/%E0%A4%A',
  '',
  ' /app/memberV2',
  '/' + 'a'.repeat(2048),
];

// 허용되어야 하는 값 (→ 그대로)
const ACCEPT_CASES = [
  '/',
  '/app/memberV2',
  '/app/admin?tab=bug-reports',
  '/community/bug-report.html#my-reports',
  '/app/a%2Fb',
  '/utils/error-codes.html?q=%ED%95%9C%EA%B8%80',
];

test('safeNext: 외부·프로토콜 상대·제어문자·인코딩 우회 값은 fallback', () => {
  for (const v of REJECT_CASES) {
    assert.equal(safeNext(v), '/', `거부되어야 함: ${JSON.stringify(v)}`);
    assert.equal(safeNext(v, ''), '', `fallback 지정 시 그 값: ${JSON.stringify(v)}`);
  }
});

test('safeNext: 같은 오리진 상대 경로는 그대로 허용', () => {
  for (const v of ACCEPT_CASES) {
    assert.equal(safeNext(v), v, `허용되어야 함: ${JSON.stringify(v)}`);
  }
});

test('safeNext: 문자열이 아닌 입력은 fallback', () => {
  for (const v of [undefined, null, 123, ['/app/x'], { a: 1 }]) {
    assert.equal(safeNext(v), '/');
  }
});

// auth/*.html 인라인 사본이 lib 버전과 동일하게 동작하는지 검사
function loadInlineSafeNext(relFile) {
  const html = fs.readFileSync(path.join(ROOT, relFile), 'utf8');
  const m = html.match(/\/\/ \[safeNext\][^\n]*\n([\s\S]*?)\/\/ \[\/safeNext\]/);
  assert.ok(m, `${relFile}에 [safeNext] 블록이 없음`);
  const ctx = {};
  vm.runInNewContext(`${m[1]}\nthis.safeNext = safeNext;`, ctx);
  return ctx.safeNext;
}

for (const rel of ['auth/login.html', 'auth/change-password.html']) {
  test(`safeNext 인라인 사본 일치: ${rel}`, () => {
    const inline = loadInlineSafeNext(rel);
    for (const v of [...REJECT_CASES, ...ACCEPT_CASES, undefined, null]) {
      assert.equal(inline(v), safeNext(v), `불일치: ${JSON.stringify(v)}`);
      assert.equal(inline(v, ''), safeNext(v, ''), `불일치(fallback ''): ${JSON.stringify(v)}`);
    }
  });
}

// ── controllers/login.js 리다이렉트 통합 검증 (DB/감사로그 모듈 모킹) ──────────
const PASSWORD = 'correct-horse-battery';
function makeHash(password) {
  const salt = 'testsalt';
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}

function loadLoginHandler(userRow) {
  const dbPath = require.resolve('../controllers/_shared/db');
  const auditPath = require.resolve('../controllers/_shared/audit');
  const loginPath = require.resolve('../controllers/login');
  const fakeSql = async (strings) => {
    const q = strings.join('?');
    if (q.includes('SELECT * FROM users')) return userRow ? [userRow] : [];
    return [];
  };
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: { getDb: () => fakeSql } };
  require.cache[auditPath] = { id: auditPath, filename: auditPath, loaded: true, exports: { insertAuditLog: async () => {} } };
  delete require.cache[loginPath];
  const handler = require('../controllers/login');
  // 다른 테스트 파일에 영향이 없도록 모킹 해제 (handler는 이미 참조를 잡고 있음)
  delete require.cache[dbPath];
  delete require.cache[auditPath];
  delete require.cache[loginPath];
  return handler;
}

function makeRes() {
  return {
    statusCode: 200,
    headers: {},
    location: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(c) { this.statusCode = c; return this; },
    send() { return this; },
    redirect(code, url) { this.statusCode = code; this.location = url; return this; },
  };
}

async function login(next, { mustChange = false, password = PASSWORD } = {}) {
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
  const user = {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'user',
    is_active: true,
    locked_until: null,
    failed_login_count: 0,
    must_change_password: mustChange,
    password_hash: makeHash(PASSWORD),
  };
  const handler = loadLoginHandler(user);
  const res = makeRes();
  await handler({ method: 'POST', body: { username: 'u', password, next }, headers: {}, socket: {} }, res);
  return res;
}

test('login.js: 외부/우회 next는 로그인 성공 후 Location: /', async () => {
  for (const next of ['https://evil.example', '//evil.example', '/\\evil.example', '/%0d%0aSet-Cookie:x', '/%2F%2Fevil.com', 'javascript:alert(1)']) {
    const res = await login(next);
    assert.equal(res.statusCode, 302);
    assert.equal(res.location, '/', `next=${JSON.stringify(next)}`);
  }
});

test('login.js: 같은 오리진 next는 그대로 이동', async () => {
  const res = await login('/app/memberV2');
  assert.equal(res.location, '/app/memberV2');
});

test('login.js: 강제 비밀번호 변경 사용자는 검증된 next를 변경 페이지로 전달', async () => {
  const ok = await login('/app/memberV2', { mustChange: true });
  assert.equal(ok.location, '/auth/change-password.html?next=%2Fapp%2FmemberV2');
  const bad = await login('//evil.example', { mustChange: true });
  assert.equal(bad.location, '/auth/change-password.html');
});

test('login.js: 실패 리다이렉트에도 안전하지 않은 next는 싣지 않음', async () => {
  const bad = await login('https://evil.example', { password: 'wrong-password' });
  assert.equal(bad.location, '/auth/login.html?error=invalid');
  const ok = await login('/app/memberV2', { password: 'wrong-password' });
  assert.equal(ok.location, '/auth/login.html?error=invalid&next=%2Fapp%2FmemberV2');
});
