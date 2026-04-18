/**
 * controllers/signup.js
 * 회원가입 요청 생성
 * POST /api/signup
 */

const crypto = require('crypto');
const { promisify } = require('util');
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
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  const body = req.body || {};
  const username = (body.username || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'username, email, password는 필수입니다.' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: '비밀번호는 8자 이상이어야 합니다.' });
  }

  const sql = getDb();

  // 1. username 중복 확인 (users + pending signup_requests)
  const [usersWithName, pendingWithName] = await Promise.all([
    sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`,
    sql`SELECT id FROM signup_requests WHERE username = ${username} AND status = 'pending' LIMIT 1`,
  ]);
  if ((usersWithName && usersWithName.length > 0) || (pendingWithName && pendingWithName.length > 0)) {
    return res.status(409).json({ error: 'username_taken' });
  }

  // 2. email 중복 확인 (users + pending signup_requests)
  const [usersWithEmail, pendingWithEmail] = await Promise.all([
    sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`,
    sql`SELECT id FROM signup_requests WHERE email = ${email} AND status = 'pending' LIMIT 1`,
  ]);
  if ((usersWithEmail && usersWithEmail.length > 0) || (pendingWithEmail && pendingWithEmail.length > 0)) {
    return res.status(409).json({ error: 'email_taken' });
  }

  // 3. 비밀번호 해싱
  const passwordHash = await hashPassword(password);

  // 4. signup_requests INSERT (role은 서버에서 고정, 요청 바디 role 무시)
  let rows;
  try {
    rows = await sql`
      INSERT INTO signup_requests (username, email, password_hash)
      VALUES (${username}, ${email}, ${passwordHash})
      RETURNING id
    `;
  } catch (err) {
    console.error('signup_requests INSERT 오류:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }

  const requestId = rows[0].id;

  // 5. 감사 로그
  await insertAuditLog({
    username,
    action: 'signup_requested',
    ipAddress: ip,
    result: 'success',
    metadata: { requestId },
  });

  return res.status(200).json({ requestId });
};
