/**
 * controllers/_shared/session.js
 * API 컨트롤러용 세션 해석 유틸리티
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');
const { tryRefreshToken } = require('./auth-middleware');

async function resolveUser(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  const refreshToken = cookies['refresh_token'];

  if (authToken) {
    try {
      return jwt.verify(authToken, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name !== 'TokenExpiredError') return null;
    }
  }

  if (!refreshToken) return null;

  const sql = getDb();
  const isSecure = process.env.NODE_ENV !== 'development';
  return tryRefreshToken(sql, refreshToken, res, isSecure);
}

module.exports = { resolveUser };
