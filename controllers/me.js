/**
 * controllers/me.js
 * 현재 로그인 사용자 정보 조회
 * GET /api/me
 *
 * - auth_token JWT 유효 → { username, role }
 * - 만료 → refresh_token 로테이션 재사용 (auth-middleware.tryRefreshToken)
 * - 없음/무효 → 401 { error: "unauthenticated" }
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { tryRefreshToken } = require('./_shared/auth-middleware');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  const isSecure = process.env.NODE_ENV !== 'development';
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  const refreshToken = cookies['refresh_token'];

  let decoded = null;

  if (authToken) {
    try {
      decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        // 만료 → refresh_token 로테이션 (auth-middleware 재사용)
        const sql = getDb();
        decoded = await tryRefreshToken(sql, refreshToken, res, isSecure);
      }
      // 그 외 오류는 decoded = null 유지
    }
  } else if (refreshToken) {
    const sql = getDb();
    decoded = await tryRefreshToken(sql, refreshToken, res, isSecure);
  }

  if (!decoded) {
    return res.status(401).json({ error: 'unauthenticated' });
  }

  // DB에서 username 조회 (JWT에 username 미포함)
  try {
    const sql = getDb();
    const rows = await sql`SELECT username FROM users WHERE id = ${decoded.sub} AND is_active = true LIMIT 1`;
    if (!rows || rows.length === 0) {
      return res.status(401).json({ error: 'unauthenticated' });
    }
    return res.status(200).json({ username: rows[0].username, role: decoded.role });
  } catch (err) {
    console.error('me.js DB 조회 오류:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
