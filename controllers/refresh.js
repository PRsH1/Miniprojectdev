/**
 * controllers/refresh.js
 * 액세스 토큰 갱신 (API 클라이언트용)
 * POST /api/refresh
 */

const { parse } = require('cookie');
const { getDb } = require('./_shared/db');
const { tryRefreshToken } = require('./_shared/auth-middleware');
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
  const isSecure = process.env.NODE_ENV !== 'development';
  const decoded = await tryRefreshToken(sql, refreshToken, res, isSecure);
  if (!decoded) {
    return respondError(req, res, 401, {
      code: 'TOKEN_INVALID',
      message: '유효하지 않은 리프레시 토큰입니다.',
      reason: '토큰이 만료되었거나 이미 폐기되었을 수 있습니다.',
      action: '다시 로그인해 주세요.',
    });
  }

  return res.status(200).json({ ok: true });
};
