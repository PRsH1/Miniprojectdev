/**
 * controllers/refresh.js
 * 액세스 토큰 갱신 (API 클라이언트용)
 * POST /api/refresh
 */

const crypto = require('crypto');
const { parse, serialize } = require('cookie');
const { getDb } = require('./_shared/db');
const { sign } = require('./_shared/jwt');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const cookies = parse(req.headers.cookie || '');
  const refreshToken = cookies['refresh_token'];

  if (!refreshToken) {
    return res.status(401).json({ error: '리프레시 토큰이 없습니다.' });
  }

  const sql = getDb();
  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  let rows;
  try {
    rows = await sql`
      SELECT rt.*, u.role, u.must_change_password, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = ${tokenHash}
        AND rt.revoked_at IS NULL
        AND rt.expires_at > now()
      LIMIT 1
    `;
  } catch (err) {
    console.error('refresh_token 조회 오류:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  if (!rows || rows.length === 0) {
    return res.status(401).json({ error: '유효하지 않은 리프레시 토큰입니다.' });
  }

  const rt = rows[0];
  if (!rt.is_active) {
    return res.status(403).json({ error: '비활성화된 계정입니다.' });
  }

  // 기존 토큰 revoke
  await sql`UPDATE refresh_tokens SET revoked_at = now() WHERE id = ${rt.id}`;

  // 새 리프레시 토큰
  const newRefreshToken = crypto.randomUUID();
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${rt.user_id}, ${newHash}, ${expiresAt.toISOString()})
  `;

  // 새 JWT
  const accessToken = sign({ sub: rt.user_id, role: rt.role, mustChangePw: rt.must_change_password });

  const isSecure = process.env.NODE_ENV !== 'development';
  res.setHeader('Set-Cookie', [
    serialize('auth_token', accessToken, { httpOnly: true, secure: isSecure, sameSite: 'strict', path: '/', maxAge: 3600 }),
    serialize('refresh_token', newRefreshToken, { httpOnly: true, secure: isSecure, sameSite: 'strict', path: '/', maxAge: 7 * 24 * 3600 }),
  ]);

  return res.status(200).json({ ok: true });
};
