/**
 * controllers/refresh.js
 * 액세스 토큰 갱신 (API 클라이언트용)
 * POST /api/refresh
 */

const crypto = require('crypto');
const { parse, serialize } = require('cookie');
const { getDb } = require('./_shared/db');
const { sign } = require('./_shared/jwt');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST']);
  }

  const cookies = parse(req.headers.cookie || '');
  const refreshToken = cookies['refresh_token'];

  if (!refreshToken) {
    return respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      message: '리프레시 토큰이 없습니다.',
      reason: '세션 갱신에 필요한 refresh_token 쿠키가 없습니다.',
      action: '다시 로그인한 뒤 요청을 다시 시도하세요.',
    });
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
    return respondError(req, res, 500, {
      code: 'DATABASE_ERROR',
      message: '세션 정보를 확인하는 중 오류가 발생했습니다.',
      reason: '리프레시 토큰 조회에 실패했습니다.',
      action: '잠시 후 다시 로그인해 주세요.',
      error: err,
      logMessage: 'Refresh token lookup failed',
    });
  }

  if (!rows || rows.length === 0) {
    return respondError(req, res, 401, {
      code: 'TOKEN_INVALID',
      message: '유효하지 않은 리프레시 토큰입니다.',
      reason: '토큰이 만료되었거나 이미 폐기되었을 수 있습니다.',
      action: '다시 로그인해 주세요.',
    });
  }

  const rt = rows[0];
  if (!rt.is_active) {
    return respondError(req, res, 403, {
      code: 'FORBIDDEN',
      message: '비활성화된 계정입니다.',
      reason: '현재 계정은 세션을 갱신할 수 없는 상태입니다.',
      action: '관리자에게 계정 상태를 문의하세요.',
    });
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
