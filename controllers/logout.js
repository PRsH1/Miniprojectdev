/**
 * controllers/logout.js
 * 로그아웃 처리
 * POST /api/logout
 */

const crypto = require('crypto');
const { serialize, parse } = require('cookie');
const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const cookies = parse(req.headers.cookie || '');
  const refreshToken = cookies['refresh_token'];

  // refresh_token을 DB에서 revoke
  if (refreshToken) {
    try {
      const sql = getDb();
      const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
      const rows = await sql`
        UPDATE refresh_tokens SET revoked_at = now()
        WHERE token_hash = ${tokenHash} AND revoked_at IS NULL
        RETURNING user_id, (SELECT username FROM users WHERE id = user_id) AS username
      `;
      if (rows && rows.length > 0) {
        await insertAuditLog({
          userId: rows[0].user_id,
          username: rows[0].username,
          action: 'logout',
          ipAddress: ip,
          result: 'success',
        });
      }
    } catch (err) {
      console.error('로그아웃 처리 오류:', err);
    }
  }

  // 쿠키 만료 처리 (Max-Age=0)
  const isSecure = process.env.NODE_ENV !== 'development';
  res.setHeader('Set-Cookie', [
    serialize('auth_token', '', { httpOnly: true, secure: isSecure, sameSite: 'strict', path: '/', maxAge: 0 }),
    serialize('refresh_token', '', { httpOnly: true, secure: isSecure, sameSite: 'strict', path: '/', maxAge: 0 }),
  ]);

  return res.redirect(302, '/auth/login.html');
};
