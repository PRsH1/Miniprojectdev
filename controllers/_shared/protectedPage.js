const crypto = require('crypto');
const { promises: fs } = require('fs');
const path = require('path');
const { parse } = require('cookie');

module.exports = function createProtectedPageHandler(config) {
  if (!config || !config.cookieName || !config.filePath || !config.defaultNext || !config.scope) {
    throw new Error('Invalid protected page configuration');
  }

  return async function protectedPageHandler(req, res) {
    const cookies = parse(req.headers.cookie || '');
    const authCookie = cookies[config.cookieName];

    const expected = Buffer.from(process.env.AUTH_COOKIE_VALUE || '');
    const actual = Buffer.from(authCookie || '');
    if (expected.length > 0 && expected.length === actual.length && crypto.timingSafeEqual(expected, actual)) {
      try {
        const fullPath = path.join(process.cwd(), config.filePath);
        const html = await fs.readFile(fullPath, 'utf8');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(html);
      } catch (err) {
        console.error(`${config.errorLabel || 'Protected page'} read error:`, err);
        return res.status(500).send('Error loading page.');
      }
    }

    const next = encodeURIComponent(config.defaultNext);
    return res.redirect(302, `/auth/login.html?next=${next}&scope=${config.scope}`);
  };
};
