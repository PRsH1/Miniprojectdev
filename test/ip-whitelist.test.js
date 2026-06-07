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

async function loadMiddlewareModule() {
  const middlewarePath = path.join(__dirname, '..', 'middleware.js');
  const source = fs.readFileSync(middlewarePath, 'utf8');
  const moduleSource = source.replace(
    "import { neon } from '@neondatabase/serverless';",
    "const neon = () => { throw new Error('middleware DB loader must not run in unit tests'); };"
  );

  assert.notEqual(moduleSource, source, 'middleware neon import replacement failed');

  const moduleUrl = `data:text/javascript;base64,${Buffer.from(moduleSource).toString('base64')}`;
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

test('middleware returns before request inspection and DB loading when master flag is unset', async () => {
  const { default: middleware } = await loadMiddlewareModule();

  await withIpWhitelistEnv(undefined, async () => {
    const request = {};
    Object.defineProperty(request, 'url', {
      get() {
        throw new Error('request must not be inspected while the master flag is off');
      },
    });

    assert.equal(await middleware(request), undefined);
  });
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
