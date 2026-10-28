const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  checkIpAllowed,
  isIpInCidr,
  isIpWhitelistEnabled,
  matchesPathPattern,
} = require('../controllers/_shared/ip-whitelist');

// middleware.js는 data: URL로 로드하므로 상대 경로 import를 쓸 수 없다 → 전역으로 주입
globalThis.__ipMatchForTest = require('../lib/ip-match');
globalThis.__neonForTest = null;

async function loadMiddlewareModule() {
  const middlewarePath = path.join(__dirname, '..', 'middleware.js');
  const source = fs.readFileSync(middlewarePath, 'utf8');
  const withNeon = source.replace(
    "import { neon } from '@neondatabase/serverless';",
    "const neon = (...a) => { if (globalThis.__neonForTest) return globalThis.__neonForTest(...a); throw new Error('middleware DB loader must not run in unit tests'); };"
  );
  const moduleSource = withNeon.replace(
    "import { isIpInCidr, isLoopback, clientIpFromHeaders } from './lib/ip-match.js';",
    'const { isIpInCidr, isLoopback, clientIpFromHeaders } = globalThis.__ipMatchForTest;'
  );

  assert.notEqual(withNeon, source, 'middleware neon import replacement failed');
  assert.notEqual(moduleSource, withNeon, 'middleware ip-match import replacement failed');

  // 같은 data: URL은 모듈 캐시를 공유하므로(모듈 수준 _cache 포함) 로드마다 고유 주석을 붙인다
  const unique = `${moduleSource}\n// load ${Date.now()}-${Math.random()}\n`;
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(unique).toString('base64')}`;
  return import(moduleUrl);
}

async function withIpWhitelistEnv(value, callback) {
  const existed = Object.prototype.hasOwnProperty.call(process.env, 'IP_WHITELIST_ENABLED');
  const previous = process.env.IP_WHITELIST_ENABLED;

  if (value === undefined) delete process.env.IP_WHITELIST_ENABLED;
  else process.env.IP_WHITELIST_ENABLED = value;

  try {
    await callback();
  } finally {
    if (existed) process.env.IP_WHITELIST_ENABLED = previous;
    else delete process.env.IP_WHITELIST_ENABLED;
  }
}

test('isIpInCidr matches single IPv4 addresses and CIDR ranges', () => {
  assert.equal(isIpInCidr('1.2.3.4', '1.2.3.4'), true);
  assert.equal(isIpInCidr('::ffff:1.2.3.4', '1.2.3.4'), true);
  assert.equal(isIpInCidr('192.168.0.42', '192.168.0.0/24'), true);
  assert.equal(isIpInCidr('192.168.1.42', '192.168.0.0/24'), false);
  assert.equal(isIpInCidr('203.0.113.10', '0.0.0.0/0'), true);
});

test('matchesPathPattern supports exact, directory wildcard, and prefix wildcard patterns', () => {
  assert.equal(matchesPathPattern('/api/admin', '/api/admin'), true);
  assert.equal(matchesPathPattern('/api/admin', '/api/admin/*'), true);
  assert.equal(matchesPathPattern('/api/admin/users', '/api/admin/*'), true);
  assert.equal(matchesPathPattern('/api/administrator', '/api/admin/*'), false);
  assert.equal(matchesPathPattern('/app/report', '/app*'), true);
});

test('isStaticPath excludes known static directories and file extensions only', async () => {
  const { isStaticPath } = await loadMiddlewareModule();

  assert.equal(isStaticPath('/assets/app.css'), true);
  assert.equal(isStaticPath('/img/logo'), true);
  assert.equal(isStaticPath('/file/manual'), true);
  assert.equal(isStaticPath('/favicon.svg'), true);
  assert.equal(isStaticPath('/downloads/manual.PDF?version=2'), true);
  assert.equal(isStaticPath('/api/report.pdf/data'), false);
  assert.equal(isStaticPath('/app/admin'), false);
});

test('middleware returns before IP header inspection and DB loading when master flag is unset', async () => {
  const { default: middleware } = await loadMiddlewareModule();

  await withIpWhitelistEnv(undefined, async () => {
    // URL은 /private/ 차단 판별에만 읽고, IP 헤더·DB는 마스터 플래그 OFF면 건드리지 않는다
    const request = { url: 'https://example.com/app/admin' };
    Object.defineProperty(request, 'headers', {
      get() {
        throw new Error('IP headers must not be inspected while the master flag is off');
      },
    });

    assert.equal(await middleware(request), undefined);
  });
});

test('middleware blocks direct /private/ access with 404 regardless of the master flag (P0-09)', async () => {
  const { default: middleware, isPrivatePath } = await loadMiddlewareModule();

  assert.equal(isPrivatePath('/private/Admin.html'), true);
  assert.equal(isPrivatePath('/PRIVATE/Admin.html'), true);
  assert.equal(isPrivatePath('//private/Admin.html'), true);
  assert.equal(isPrivatePath('/%70rivate/Admin.html'), true);
  assert.equal(isPrivatePath('/private'), true);
  assert.equal(isPrivatePath('/privateer/x.html'), false);
  assert.equal(isPrivatePath('/app/admin'), false);
  assert.equal(isPrivatePath('/utils/webhook.html'), false);

  for (const flag of [undefined, 'true']) {
    await withIpWhitelistEnv(flag, async () => {
      const request = { url: 'https://example.com/private/Admin.html' };
      Object.defineProperty(request, 'headers', {
        get() {
          throw new Error('private block must happen before IP inspection');
        },
      });
      const response = await middleware(request);
      assert.ok(response, `flag=${flag}: Response expected`);
      assert.equal(response.status, 404);
    });
  }
});

test('middleware skips static paths before IP inspection when master flag is on', async () => {
  const { default: middleware } = await loadMiddlewareModule();

  await withIpWhitelistEnv('true', async () => {
    const request = {
      url: 'https://example.com/assets/app.css',
    };
    Object.defineProperty(request, 'headers', {
      get() {
        throw new Error('IP headers must not be inspected for static paths');
      },
    });

    assert.equal(await middleware(request), undefined);
  });
});

test('master flag enables only exact 1 or true values', () => {
  assert.equal(isIpWhitelistEnabled('1'), true);
  assert.equal(isIpWhitelistEnabled('true'), true);
  assert.equal(isIpWhitelistEnabled('TRUE'), false);
  assert.equal(isIpWhitelistEnabled('0'), false);
  assert.equal(isIpWhitelistEnabled(null), false);
});

test('checkIpAllowed returns before loading DB when master flag is unset', async () => {
  await withIpWhitelistEnv(undefined, async () => {
    let loadCount = 0;
    const result = await checkIpAllowed('203.0.113.10', '/api/test', 'global_and_path', async () => {
      loadCount += 1;
      throw new Error('DB loader must not run while the master flag is off');
    });

    assert.deepEqual(result, { allowed: true });
    assert.equal(loadCount, 0);
  });
});

test('checkIpAllowed uses existing enforcement when master flag is on', async () => {
  await withIpWhitelistEnv('1', async () => {
    let loadCount = 0;
    const result = await checkIpAllowed('203.0.113.10', '/api/test', 'global_and_path', async () => {
      loadCount += 1;
      return {
        scopes: [{ scope_type: 'global', is_enabled: true }],
        rules: [],
      };
    });

    assert.deepEqual(result, { allowed: false, blockedBy: 'global' });
    assert.equal(loadCount, 1);
  });
});

// ── P0b-03: 경로 스코프 우회 정규화 + IPv4/IPv6 파서 통일 ────────────────
const { parseIp, isValidIpCidr, normalizeRequestPath, isLoopback } = require('../lib/ip-match');

test('P0b-03 parseIp: 엄격한 IPv4와 IPv6(압축·IPv4 표기·mapped) 해석, 쓰레기 값은 null', () => {
  assert.deepEqual(parseIp('1.2.3.4'), { version: 4, bytes: [1, 2, 3, 4] });
  assert.deepEqual(parseIp('::ffff:10.0.0.5'), { version: 4, bytes: [10, 0, 0, 5] });
  assert.equal(parseIp('2001:db8::1').version, 6);
  assert.equal(parseIp('::').version, 6);
  assert.equal(parseIp('1:2:3:4:5:6:7.8.9.10').version, 6);
  for (const bad of ['x.y.z.w', '1.2.3', '1.2.3.4.5', '256.1.1.1', '01.2.3.4', '1.2.3.-1', '',
    '2001:db8:::1', '1:2:3:4:5:6:7:8:9', 'fe80::1%eth0', ':1', 'g::1', undefined, null, 1234]) {
    assert.equal(parseIp(bad), null, String(bad));
  }
});

test('P0b-03 isIpInCidr: IPv4·IPv6 CIDR, 버전이 다르거나 해석 불가면 불일치', () => {
  assert.equal(isIpInCidr('2001:db8::1', '2001:db8::/32'), true);
  assert.equal(isIpInCidr('2001:db8::1', '2001:db9::/32'), false);
  assert.equal(isIpInCidr('2001:db8::1', '2001:db8::1'), true);
  assert.equal(isIpInCidr('2001:db8::1', '::/0'), true);
  assert.equal(isIpInCidr('2001:db8::1', '0.0.0.0/0'), false, 'IPv6는 IPv4 전체 허용 규칙과 불일치');
  assert.equal(isIpInCidr('2001:db8::1', '2.0.0.0/8'), false, '구 middleware: 2001:db8::1 → 2001로 오해석');
  assert.equal(isIpInCidr('x.y.z.w', '0.0.0.0/8'), false, '구 파서: 쓰레기 값 → 0 → 0.0.0.0/8 일치');
  assert.equal(isIpInCidr('10.0.0.5', '::ffff:10.0.0.0/104'), true);
  assert.equal(isIpInCidr('::ffff:10.0.0.5', '10.0.0.0/8'), true);
  assert.equal(isIpInCidr('192.168.0.255', '192.168.0.0/25'), false);
  assert.equal(isIpInCidr('192.168.0.127', '192.168.0.0/25'), true);
  assert.equal(isIpInCidr('1.2.3.4', 'not-a-cidr'), false);
  assert.equal(isIpInCidr(undefined, '0.0.0.0/0'), false);
});

test('P0b-03 isValidIpCidr: 관리자 규칙 입력 검증 (IPv6 허용, 잘못된 접두 길이 거부)', () => {
  for (const ok of ['1.2.3.4', '10.0.0.0/8', '0.0.0.0/0', '2001:db8::/32', '::1', '::/0', '::ffff:1.2.3.0/120']) {
    assert.equal(isValidIpCidr(ok), true, ok);
  }
  for (const bad of ['1.2.3.4/33', '::/129', '1.2.3.4/01', '1.2.3.4/', 'abc', '1.2.3', '2001:db8::/x']) {
    assert.equal(isValidIpCidr(bad), false, bad);
  }
});

test('P0b-03 isLoopback: 127.0.0.1·::1·mapped만 루프백, 빈 값은 아님', () => {
  assert.equal(isLoopback('127.0.0.1'), true);
  assert.equal(isLoopback('::1'), true);
  assert.equal(isLoopback('::ffff:127.0.0.1'), true);
  assert.equal(isLoopback(''), false);
  assert.equal(isLoopback('127.0.0.2'), false);
  assert.equal(isLoopback('::'), false);
});

test('P0b-03 matchesPathPattern: 끝 슬래시·대소문자·중복 슬래시·인코딩·점 구간·하위 경로 우회 차단', () => {
  for (const p of ['/api/login', '/api/login/', '/API/Login', '//api//login', '/api/%6cogin', '/api/%256cogin',
    '/api/login/x', '/api/./login', '/api/x/../login', '/api\\login', '/api/login?x=1']) {
    assert.equal(matchesPathPattern(p, '/api/login'), true, p);
  }
  for (const p of ['/api/loginx', '/api/logout', '/api', '/']) {
    assert.equal(matchesPathPattern(p, '/api/login'), false, p);
  }
  assert.equal(matchesPathPattern('/API/ADMIN/users/', '/api/admin/*'), true);
  assert.equal(matchesPathPattern('/api/Admin', '/api/admin/*'), true);
  assert.equal(matchesPathPattern('/api/administrator', '/api/admin/*'), false);
  assert.equal(matchesPathPattern('/APP/report', '/app*'), true);
  assert.equal(matchesPathPattern('/anything', '/*'), true);
  assert.equal(matchesPathPattern('/api/login', ''), false);
  assert.equal(normalizeRequestPath('/a/b/../../../c/'), '/c');
});

test('P0b-03 checkIpAllowed: path 스코프 /api/login 은 /api/login/ 요청도 차단', async () => {
  await withIpWhitelistEnv('1', async () => {
    const data = async () => ({
      scopes: [{ scope_type: 'path', scope_path: '/api/login', is_enabled: true }],
      rules: [{ scope_type: 'path', scope_path: '/api/login', ip_cidr: '198.51.100.0/24' }],
    });
    for (const p of ['/api/login', '/api/login/', '/API/login', '/api//login']) {
      assert.deepEqual(await checkIpAllowed('203.0.113.10', p, 'global_and_path', data), { allowed: false, blockedBy: 'path' }, p);
    }
    assert.deepEqual(await checkIpAllowed('198.51.100.7', '/api/login/', 'global_and_path', data), { allowed: true });
    assert.deepEqual(await checkIpAllowed('203.0.113.10', '/api/me', 'global_and_path', data), { allowed: true });
  });
});

test('P0b-03 checkIpAllowed: IP를 알 수 없으면 TypeError 없이 차단, IPv6 규칙은 IPv6 클라이언트 허용', async () => {
  await withIpWhitelistEnv('1', async () => {
    const data = async () => ({
      scopes: [{ scope_type: 'global', is_enabled: true }, { scope_type: 'protected', is_enabled: true }],
      rules: [
        { scope_type: 'global', ip_cidr: '2001:db8::/32' },
        { scope_type: 'protected', ip_cidr: '2001:db8::/32' },
      ],
    });
    assert.deepEqual(await checkIpAllowed(undefined, '/api/me', 'global_and_path', data), { allowed: false, blockedBy: 'global' });
    assert.deepEqual(await checkIpAllowed(undefined, null, 'protected_only', data), { allowed: false, blockedBy: 'protected' });
    assert.deepEqual(await checkIpAllowed('2001:db8::abcd', '/api/me', 'global_and_path', data), { allowed: true });
    assert.deepEqual(await checkIpAllowed('2001:db9::1', '/api/me', 'global_and_path', data), { allowed: false, blockedBy: 'global' });
    assert.deepEqual(await checkIpAllowed('::1', '/api/me', 'global_and_path', data), { allowed: true }, '루프백 예외 유지');
  });
});

test('P0b-03 middleware: 공용 파서를 쓰고, IP 헤더가 없으면 로컬호스트로 간주하지 않는다', async () => {
  const source = fs.readFileSync(path.join(__dirname, '..', 'middleware.js'), 'utf8');
  assert.doesNotMatch(source, /function ipToInt/, 'middleware에 별도 IP 파서가 남아 있으면 안 됨');
  assert.doesNotMatch(source, /\|\|\s*'127\.0\.0\.1'/, '헤더 없음 → 127.0.0.1 기본값 제거');

  const { default: middleware } = await loadMiddlewareModule();
  globalThis.__neonForTest = () => async (strings) => {
    const text = strings.join('?');
    if (/FROM ip_whitelist_scopes/.test(text)) return [{ is_enabled: true }];
    if (/FROM ip_whitelist/.test(text)) return [{ ip_cidr: '2001:db8::/32' }];
    return [];
  };
  const req = (headers) => ({
    url: 'https://example.com/app/admin',
    headers: { get: (name) => headers[name.toLowerCase()] },
  });
  try {
    await withIpWhitelistEnv('true', async () => {
      const blocked = await middleware(req({}));
      assert.equal(blocked && blocked.status, 403, '헤더 없음 → 차단');
      assert.equal(await middleware(req({ 'x-forwarded-for': '2001:db8::5, 10.0.0.1' })), undefined, 'IPv6 규칙 허용');
      assert.equal(await middleware(req({ 'x-real-ip': '2001:db8::6' })), undefined, 'x-real-ip 대체');
      const v4 = await middleware(req({ 'x-forwarded-for': '2.0.0.1' }));
      assert.equal(v4 && v4.status, 403, 'IPv4는 IPv6 규칙과 불일치');
      assert.equal(await middleware(req({ 'x-forwarded-for': '127.0.0.1' })), undefined, '루프백 허용');
    });
  } finally {
    globalThis.__neonForTest = null;
  }
});
