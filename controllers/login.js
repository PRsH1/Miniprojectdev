/**
 * controllers/login.js
 * DB 기반 로그인 (username + password)
 * POST /api/login
 */

const crypto = require('crypto');
const { promisify } = require('util');
const { serialize } = require('cookie');
const { getDb } = require('./_shared/db');
const { sign } = require('./_shared/jwt');
const { insertAuditLog } = require('./_shared/audit');

const scryptAsync = promisify(crypto.scrypt);

// 비밀번호 해시 검증 (salt:hash 형식)
async function verifyPassword(password, stored) {
  const colonIdx = stored.indexOf(':');
  if (colonIdx === -1) return false;
  const salt = stored.slice(0, colonIdx);
  const hash = stored.slice(colonIdx + 1);
  const hashBuffer = Buffer.from(hash, 'hex');
  const inputHash = await scryptAsync(password, salt, 64);
  if (hashBuffer.length !== inputHash.length) return false;
  return crypto.timingSafeEqual(hashBuffer, inputHash);
}



module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body || {};
  const username = (body.username || '').trim();
  const password = body.password || '';
  const next = body.next || '';
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  const errorRedirect = (code) => {
    const p = new URLSearchParams({ error: code });
    if (next) p.set('next', next);
    return res.redirect(302, `/auth/login.html?${p.toString()}`);
  };

  if (!username || !password) return errorRedirect('invalid');

  const sql = getDb();

  // 1. username으로 사용자 조회
  let users;
  try {
    users = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
  } catch (err) {
    console.error('사용자 조회 오류:', err);
    return res.status(500).send('Internal Server Error');
  }

  if (!users || users.length === 0) {
    // 사용자 열거 방지: 동일한 에러 반환
    await insertAuditLog({ username, action: 'login_failed', ipAddress: ip, result: 'failure', metadata: { reason: 'not_found' } });
    return errorRedirect('invalid');
  }

  const user = users[0];

  // 2. is_active 확인
  if (!user.is_active) {
    await insertAuditLog({ userId: user.id, username, action: 'login_failed', ipAddress: ip, result: 'failure', metadata: { reason: 'inactive' } });
    return errorRedirect('inactive');
  }

  // 3. locked_until 확인
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    await insertAuditLog({ userId: user.id, username, action: 'login_failed', ipAddress: ip, result: 'failure', metadata: { reason: 'locked' } });
    const p = new URLSearchParams({ error: 'locked', until: user.locked_until.toISOString() });
    if (next) p.set('next', next);
    return res.redirect(302, `/auth/login.html?${p.toString()}`);
  }

  // locked_until이 과거면 failed_login_count 초기화
  if (user.locked_until && new Date(user.locked_until) <= new Date()) {
    await sql`UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ${user.id}`;
    user.failed_login_count = 0;
    user.locked_until = null;
  }

  // 4. 비밀번호 검증
  let isValid = false;
  try {
    isValid = await verifyPassword(password, user.password_hash);
  } catch (err) {
    console.error('비밀번호 검증 오류:', err);
    return res.status(500).send('Internal Server Error');
  }

  if (!isValid) {
    const newCount = (user.failed_login_count || 0) + 1;
    if (newCount >= 5) {
      const lockedUntil = new Date(Date.now() + 30 * 60 * 1000);
      await sql`
        UPDATE users SET failed_login_count = ${newCount}, locked_until = ${lockedUntil.toISOString()}, updated_at = now()
        WHERE id = ${user.id}
      `;
      await insertAuditLog({ userId: user.id, username, action: 'account_locked', ipAddress: ip, result: 'failure', metadata: { failed_count: newCount } });
    } else {
      await sql`UPDATE users SET failed_login_count = ${newCount}, updated_at = now() WHERE id = ${user.id}`;
    }
    await insertAuditLog({ userId: user.id, username, action: 'login_failed', ipAddress: ip, result: 'failure', metadata: { failed_count: newCount } });
    return errorRedirect('invalid');
  }

  // 5. JWT 액세스 토큰 발급
  const accessToken = sign({ sub: user.id, role: user.role, mustChangePw: user.must_change_password });

  // 6. 리프레시 토큰 발급 (UUID → SHA-256 해시 저장)
  const refreshTokenRaw = crypto.randomUUID();
  const refreshHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${refreshHash}, ${expiresAt.toISOString()})
  `;

  // 7. httpOnly 쿠키 설정
  const isSecure = process.env.NODE_ENV !== 'development';
  const cookies = [
    serialize('auth_token', accessToken, {
      httpOnly: true, secure: isSecure, sameSite: 'strict', path: '/', maxAge: 3600,
    }),
    serialize('refresh_token', refreshTokenRaw, {
      httpOnly: true, secure: isSecure, sameSite: 'strict', path: '/', maxAge: 7 * 24 * 3600,
    }),
  ];
  res.setHeader('Set-Cookie', cookies);

  // 8. last_login_at 업데이트, failed_login_count 초기화
  await sql`
    UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = now(), updated_at = now()
    WHERE id = ${user.id}
  `;

  await insertAuditLog({ userId: user.id, username, action: 'login', ipAddress: ip, result: 'success' });

  // 9. 리다이렉트
  if (user.must_change_password) {
    return res.redirect(302, '/auth/change-password.html');
  }
  return res.redirect(302, next || '/');
};
