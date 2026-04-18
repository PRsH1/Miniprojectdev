/**
 * controllers/change-password.js
 * must_change_password 강제 변경
 * POST /api/change-password
 */

const crypto = require('crypto');
const { promisify } = require('util');
const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST']);
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];

  if (!authToken) {
    return respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: 'Change password requires auth token',
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(authToken, process.env.JWT_SECRET);
  } catch (error) {
    return respondError(req, res, 401, {
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      logMessage: 'Invalid token on change-password',
      error,
    });
  }

  const body = req.body || {};
  const newPassword = body.newPassword || '';
  const confirmPassword = body.confirmPassword || '';

  if (!newPassword || newPassword.length < 8) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: '비밀번호는 8자 이상이어야 합니다.',
      reason: '보안 정책상 최소 길이를 만족해야 합니다.',
      action: '8자 이상 비밀번호를 입력하세요.',
    });
  }
  if (newPassword !== confirmPassword) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: '비밀번호 확인이 일치하지 않습니다.',
      reason: 'newPassword와 confirmPassword 값이 다릅니다.',
      action: '두 입력값을 다시 확인하세요.',
    });
  }

  const sql = getDb();
  const hash = await hashPassword(newPassword);

  await sql`
    UPDATE users
    SET password_hash = ${hash}, must_change_password = false, updated_at = now()
    WHERE id = ${decoded.sub}
  `;

  await insertAuditLog({
    userId: decoded.sub,
    action: 'password_changed',
    ipAddress: ip,
    result: 'success',
  });

  return res.status(200).json({ ok: true, message: '비밀번호가 변경되었습니다.' });
};
