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

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];

  if (!authToken) {
    return res.status(401).json({ error: '인증이 필요합니다.' });
  }

  let decoded;
  try {
    decoded = jwt.verify(authToken, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: '유효하지 않은 토큰입니다.' });
  }

  const body = req.body || {};
  const newPassword = body.newPassword || '';
  const confirmPassword = body.confirmPassword || '';

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: '비밀번호 확인이 일치하지 않습니다.' });
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
