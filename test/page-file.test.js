/**
 * P0-09 — 보호 페이지 file_path 경로 탈출 차단
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

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
const {
  normalizePageFilePath,
  readProtectedPageFile,
  resolvePageFilePath,
} = require('../controllers/_shared/page-file');

const ADMIN_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const adminUser = {
  id: ADMIN_ID, username: 'admin', email: 'a@example.test', role: 'admin', is_active: true, must_change_password: false,
};

const BAD_PATHS = [
  '../../etc/passwd',
  '../../proc/self/environ',
  'private/../../etc/passwd',
  'private/../.env.local',
  '/etc/passwd.html',
  '//server/share/x.html',
  'C:/Windows/win.ini',
  'private\\..\\..\\x.html',
  'errors/500.html',
  'API(JS,HTML)/DocumentInfo.html',
  'private/Admin.js',
  'private/',
  'private',
  'private/./Admin.html',
  'private//Admin.html',
  'private/Admin.html\u0000.png',
  '',
  null,
];

test('normalizePageFilePath: 경로 탈출·허용 외 디렉터리·비 HTML 거부', () => {
  for (const p of BAD_PATHS) {
    assert.equal(normalizePageFilePath(p).ok, false, JSON.stringify(p));
  }
});

test('normalizePageFilePath: 정상 경로는 앞 슬래시를 제거해 정규화', () => {
  assert.deepEqual(normalizePageFilePath('private/Admin.html'), { ok: true, relPath: 'private/Admin.html' });
  assert.deepEqual(normalizePageFilePath('/utils/webhook.html'), { ok: true, relPath: 'utils/webhook.html' });
  assert.deepEqual(normalizePageFilePath('  private/sub/Page.HTML '), { ok: true, relPath: 'private/sub/Page.HTML' });
});

test('resolvePageFilePath: 결과 절대 경로가 항상 허용 디렉터리 안', () => {
  const root = path.resolve(__dirname, '..');
  const r = resolvePageFilePath('private/Admin.html', root);
  assert.equal(r.ok, true);
  assert.ok(r.fullPath.startsWith(path.join(root, 'private') + path.sep));
});

test('readProtectedPageFile: 실제 파일은 읽고, 탈출 경로는 PAGE_PATH_INVALID', async () => {
  const root = path.resolve(__dirname, '..');
  const html = await readProtectedPageFile('private/Admin.html', root);
  assert.match(html, /<html/i);
  await assert.rejects(() => readProtectedPageFile('../../etc/passwd', root), { code: 'PAGE_PATH_INVALID' });
});

async function run(reqOptions, handlers) {
  const calls = [];
  db.setSql(makeSql(handlers, calls));
  const req = makeReq(reqOptions);
  const res = makeRes();
  await withEnv({ JWT_SECRET: TEST_JWT_SECRET, IP_WHITELIST_ENABLED: undefined }, () => router(req, res));
  return { res, calls };
}

const adminCookies = () => ({ auth_token: signTestToken({ sub: ADMIN_ID, role: 'admin', mustChangePw: false }) });
const usersHandler = { match: /must_change_password\s+FROM users/, rows: [adminUser] };

test('POST /api/admin/pages file_path="../../etc/passwd" → 400, INSERT 없음', async () => {
  const { res, calls } = await run(
    {
      method: 'POST',
      url: '/api/admin/pages',
      cookies: adminCookies(),
      body: { path: '/app/evil', name: 'evil', required_role: 'user', file_path: '../../etc/passwd' },
    },
    [usersHandler],
  );
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.error.code, 'VALIDATION_FAILED');
  assert.equal(calls.some((c) => /INSERT INTO protected_pages/.test(c.text)), false);
});

test('POST /api/admin/pages 정상 경로는 정규화된 값으로 INSERT', async () => {
  const { res, calls } = await run(
    {
      method: 'POST',
      url: '/api/admin/pages',
      cookies: adminCookies(),
      body: { path: '/app/hook', name: 'hook', required_role: 'user', file_path: '/utils/webhook.html' },
    },
    [usersHandler, { match: /INSERT INTO protected_pages/, rows: [{ id: 'x', path: '/app/hook' }] }],
  );
  assert.equal(res.statusCode, 201);
  const insert = calls.find((c) => /INSERT INTO protected_pages/.test(c.text));
  assert.ok(insert.values.includes('utils/webhook.html'));
});

test('DB에 ../ file_path가 직접 들어가 있어도 /app/<path> → 404, 파일 내용 미노출', async () => {
  const { res } = await run(
    { url: '/app/evil', cookies: adminCookies() },
    [
      { match: /FROM protected_pages/, rows: [{ path: '/app/evil', required_role: 'user', file_path: '../../etc/passwd', is_active: true }] },
      usersHandler,
    ],
  );
  assert.equal(res.statusCode, 404);
  assert.doesNotMatch(String(res.body), /root:/);
});

test('정상 file_path는 /app/admin에서 200으로 서빙', async () => {
  const { res } = await run(
    { url: '/app/admin', cookies: adminCookies() },
    [
      { match: /FROM protected_pages/, rows: [{ path: '/app/admin', required_role: 'admin', file_path: 'private/Admin.html', is_active: true }] },
      usersHandler,
    ],
  );
  assert.equal(res.statusCode, 200);
  assert.match(String(res.body), /<html/i);
});
