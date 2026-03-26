const { serialize } = require('cookie');
const { PROTECTED_PAGES } = require('./_shared/protected-pages-config');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body || {};
  const next = body.next || '';
  const scope = body.scope || 'member'; 
  const password = body.password || '';

  const cfg = PROTECTED_PAGES[scope] || PROTECTED_PAGES.member;
  const expectedPassword = process.env[cfg.passwordEnv];
  const normalizedInput = password.trim();
  const normalizedExpected = typeof expectedPassword === 'string' ? expectedPassword.trim() : '';

  console.log('[login debug]', {
    requestedScope: scope,
    resolvedScope: PROTECTED_PAGES[scope] ? scope : 'member',
    passwordEnv: cfg.passwordEnv,
    hasExpectedPassword: Boolean(expectedPassword),
    inputLength: password.length,
    expectedLength: typeof expectedPassword === 'string' ? expectedPassword.length : 0,
    trimmedInputLength: normalizedInput.length,
    trimmedExpectedLength: normalizedExpected.length,
    exactMatch: Boolean(expectedPassword) && password === expectedPassword,
    trimmedMatch: Boolean(expectedPassword) && normalizedInput === normalizedExpected,
    next: next || cfg.defaultNext,
  });

  if (expectedPassword && password === expectedPassword) {
    const cookie = serialize(cfg.cookieName, process.env.AUTH_COOKIE_VALUE, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== 'development',
      maxAge: 60 * 15, // 15분
      sameSite: 'strict',
      path: '/',
    });

    res.setHeader('Set-Cookie', cookie);
    return res.redirect(302, next || cfg.defaultNext);
  }

  const params = new URLSearchParams();
  params.set('error', '1');
  if (next) params.set('next', next);
  params.set('scope', scope);

  if (expectedPassword && password !== expectedPassword && normalizedInput === normalizedExpected) {
    console.warn('[login debug] Password mismatch caused by surrounding whitespace', {
      scope,
      passwordEnv: cfg.passwordEnv,
    });
  }

  if (!expectedPassword) {
    console.warn('[login debug] Missing expected password environment variable', {
      scope,
      passwordEnv: cfg.passwordEnv,
    });
  }

  return res.redirect(302, `/auth/login.html?${params.toString()}`);
};
