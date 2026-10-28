/**
 * controllers/login.js
 * DB 기반 로그인 (username + password)
 * POST /api/login
 *
 * 실패 처리 원칙 (P0b-01)
 * - 실패 카운터는 단일 UPDATE(failed_login_count = failed_login_count + 1 … RETURNING)로 원자적으로 올린다.
 *   동시 요청이 같은 값을 읽고 덮어써서 카운트가 사라지던 read-modify-write를 없앴다.
 * - 계정 열거 완화: 없는 아이디·틀린 비밀번호·비활성·잠김 계정 모두 같은 순서로
 *   (사용자 조회 → scrypt 검증 → 실패 카운터 UPDATE → 감사 로그) 처리하고 같은 'invalid'로 응답한다.
 *   '비활성'·'잠김' 안내는 비밀번호가 맞을 때만 보여 준다(비밀번호를 아는 본인만 상태를 알 수 있음).
 * - IP 단위 제한은 코드가 아니라 Vercel WAF rate limit 규칙으로 건다(rules/core-patterns.md 참고).
 */

const crypto = require('crypto');
const { serialize } = require('cookie');
const { getDb } = require('./_shared/db');
const { sign } = require('./_shared/jwt');
const { insertAuditLog } = require('./_shared/audit');
const { respondError } = require('./_shared/respond-error');
const {
  DUMMY_PASSWORD_HASH,
  isLockedAt,
  recordFailedLogin,
  verifyPassword,
} = require('./_shared/password');
const { INPUT_LIMITS } = require('./_shared/input-limits');
const { safeNext } = require('../lib/safe-next');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return respondError(req, res, 405, { code: 'METHOD_NOT_ALLOWED' });
  }

  const body = req.body || {};
  const username = (typeof body.username === 'string' ? body.username : '').trim();
  const password = typeof body.password === 'string' ? body.password : '';
  // open redirect 차단: 같은 오리진 상대 경로만 허용, 그 외는 '' (→ 최종 '/')
  const next = safeNext(body.next, '');
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  const errorRedirect = (code) => {
    const p = new URLSearchParams({ error: code });
    if (next) p.set('next', next);
    return res.redirect(302, `/auth/login.html?${p.toString()}`);
  };

  if (!username || !password) return errorRedirect('invalid');
  // 길이 한도를 넘는 값은 존재할 수 없는 계정/비밀번호 — 계정과 무관하게 같은 응답(scrypt 비용 남용 방지)
  if (username.length > INPUT_LIMITS.username || password.length > INPUT_LIMITS.passwordMax) {
    return errorRedirect('invalid');
  }

  const sql = getDb();

  // 1. username으로 사용자 조회
  let users;
  try {
    users = await sql`SELECT * FROM users WHERE username = ${username} LIMIT 1`;
  } catch (err) {
    return respondError(req, res, 500, { code: 'DATABASE_ERROR', logMessage: '사용자 조회 오류', error: err });
  }
  const user = users && users.length > 0 ? users[0] : null;

  // 2. 비밀번호 검증 — 계정이 없어도 더미 해시로 같은 scrypt 비용을 치른다
  let isValid = false;
  try {
    isValid = await verifyPassword(password, user ? user.password_hash : DUMMY_PASSWORD_HASH);
  } catch (err) {
    return respondError(req, res, 500, { code: 'INTERNAL_ERROR', logMessage: '비밀번호 검증 오류', error: err });
  }
  if (!user) isValid = false;

  const wasLocked = Boolean(user) && isLockedAt(user.locked_until);

  // 3. 실패: 없는 계정 / 틀린 비밀번호 (잠김·비활성 여부와 무관하게 같은 처리·같은 응답)
  if (!isValid) {
    let updated = null;
    try {
      updated = await recordFailedLogin(sql, username);
    } catch (err) {
      return respondError(req, res, 500, { code: 'DATABASE_ERROR', logMessage: '로그인 실패 카운트 갱신 오류', error: err });
    }

    const reason = !user ? 'not_found' : (wasLocked ? 'locked' : (user.is_active ? 'bad_password' : 'inactive'));
    if (updated && !wasLocked && isLockedAt(updated.locked_until)) {
      await insertAuditLog({ userId: user.id, username, action: 'account_locked', ipAddress: ip, result: 'failure', metadata: { failed_count: updated.failed_login_count } });
    }
    await insertAuditLog({
      userId: user ? user.id : undefined,
      username,
      action: 'login_failed',
      ipAddress: ip,
      result: 'failure',
      metadata: { reason, ...(updated ? { failed_count: updated.failed_login_count } : {}) },
    });
    return errorRedirect('invalid');
  }

  // 4. 비밀번호는 맞지만 잠긴 계정 → 본인에게만 잠금 안내 (카운트 변화 없음)
  if (wasLocked) {
    await insertAuditLog({ userId: user.id, username, action: 'login_failed', ipAddress: ip, result: 'failure', metadata: { reason: 'locked' } });
    const p = new URLSearchParams({ error: 'locked', until: new Date(user.locked_until).toISOString() });
    if (next) p.set('next', next);
    return res.redirect(302, `/auth/login.html?${p.toString()}`);
  }

  // 5. 비밀번호는 맞지만 비활성 계정 → 본인에게만 비활성 안내
  if (!user.is_active) {
    await insertAuditLog({ userId: user.id, username, action: 'login_failed', ipAddress: ip, result: 'failure', metadata: { reason: 'inactive' } });
    return errorRedirect('inactive');
  }

  // 6. JWT 액세스 토큰 발급
  const accessToken = sign({ sub: user.id, role: user.role, mustChangePw: user.must_change_password });

  // 7. 리프레시 토큰 발급 (UUID → SHA-256 해시 저장)
  const refreshTokenRaw = crypto.randomUUID();
  const refreshHash = crypto.createHash('sha256').update(refreshTokenRaw).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${user.id}, ${refreshHash}, ${expiresAt.toISOString()})
  `;

  // 8. httpOnly 쿠키 설정
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

  // 9. last_login_at 업데이트, failed_login_count 초기화 (만료된 잠금도 여기서 정리)
  await sql`
    UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = now(), updated_at = now()
    WHERE id = ${user.id}
  `;

  await insertAuditLog({ userId: user.id, username, action: 'login', ipAddress: ip, result: 'success' });

  // 10. 리다이렉트
  if (user.must_change_password) {
    // 비밀번호 변경 완료 후 원래 가려던 경로로 돌아가도록 검증된 next를 전달
    const changePwUrl = next
      ? `/auth/change-password.html?${new URLSearchParams({ next }).toString()}`
      : '/auth/change-password.html';
    return res.redirect(302, changePwUrl);
  }
  return res.redirect(302, next || '/');
};
