/**
 * controllers/signup.js
 * 회원가입 요청 생성
 * POST /api/signup
 */

const crypto = require('crypto');
const { promisify } = require('util');
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

  res.setHeader('Content-Type', 'application/json');
  const body = req.body || {};
  const username = (body.username || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  if (!username || !email || !password) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: 'username, email, password는 필수입니다.',
      reason: '회원가입 요청 생성에 필요한 값이 누락되었습니다.',
      action: '입력값을 모두 채운 뒤 다시 시도하세요.',
    });
  }
  if (password.length < 8) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: '비밀번호는 8자 이상이어야 합니다.',
      reason: '보안 정책상 최소 길이를 만족해야 합니다.',
      action: '8자 이상 비밀번호를 입력하세요.',
    });
  }

  const sql = getDb();

  // 1. username 중복 확인 (users + pending signup_requests)
  const [usersWithName, pendingWithName] = await Promise.all([
    sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`,
    sql`SELECT id FROM signup_requests WHERE username = ${username} AND status = 'pending' LIMIT 1`,
  ]);
  if ((usersWithName && usersWithName.length > 0) || (pendingWithName && pendingWithName.length > 0)) {
    return respondError(req, res, 409, {
      code: 'VALIDATION_FAILED',
      message: '이미 사용 중인 username입니다.',
      reason: '같은 username을 사용하는 계정 또는 대기 중인 요청이 있습니다.',
      action: '다른 username을 입력하세요.',
    });
  }

  // 2. email 중복 확인 (users + pending signup_requests)
  const [usersWithEmail, pendingWithEmail] = await Promise.all([
    sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`,
    sql`SELECT id FROM signup_requests WHERE email = ${email} AND status = 'pending' LIMIT 1`,
  ]);
  if ((usersWithEmail && usersWithEmail.length > 0) || (pendingWithEmail && pendingWithEmail.length > 0)) {
    return respondError(req, res, 409, {
      code: 'VALIDATION_FAILED',
      message: '이미 사용 중인 email입니다.',
      reason: '같은 email을 사용하는 계정 또는 대기 중인 요청이 있습니다.',
      action: '다른 email을 입력하세요.',
    });
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
    return respondError(req, res, 500, {
      code: 'DATABASE_ERROR',
      message: '회원가입 요청을 저장하지 못했습니다.',
      reason: '가입 요청 저장 중 서버 오류가 발생했습니다.',
      action: '잠시 후 다시 시도하세요.',
      error: err,
      logMessage: 'Signup request insert failed',
    });
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
