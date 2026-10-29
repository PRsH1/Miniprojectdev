/**
 * controllers/login.js
 * DB 기반 로그인 (username + password)
 * POST /api/login
 *
 * 실패 처리 원칙 (P0b-01)
 * - 실패 카운터는 단일 UPDATE(failed_login_count = failed_login_count + 1 … RETURNING)로 원자적으로 올린다.
 *   동시 요청이 같은 값을 읽고 덮어써서 카운트가 사라지던 read-modify-write를 없앴다.
 * - 계정 열거 완화: 없는 아이디·틀린 비밀번호·잠김 계정 모두 같은 순서로
 *   (사용자 조회 → scrypt 검증 → 실패 카운터 UPDATE → 감사 로그) 처리하고 같은 'invalid'로 응답한다.
 * - 잠김 계정은 비밀번호 정오와 무관하게 항상 'invalid'다(D-1). 잠금 중 정답일 때만 다른 응답을 주면
 *   잠금 30분 동안 횟수 제한 없이 추측하다 응답이 바뀌는 순간 정답을 알게 되는 오라클이 된다.
 *   'locked' 안내도 주지 않는다 — 아무 아이디나 5회 틀려 잠근 뒤 'locked'가 나오는지로 계정 존재를 확인할 수 있기 때문.
 *   잠금 가능성은 화면의 공통 실패 문구(auth/login.html)로만 알린다.
 * - '비활성' 안내는 잠기지 않은 계정에서 비밀번호가 맞을 때만 준다. 정답 여부가 드러나는 것은 활성 계정의
 *   로그인 성공과 같은 수준이며, 틀린 시도는 같은 실패 카운터로 5회 후 잠긴다(잠긴 뒤에는 위 규칙으로 'invalid').
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

  // 2. 비밀번호 검증 — 계정이 없어도 더미 해시로 같은 scrypt 비용을 치른다.
  //    잠긴 계정도 scrypt는 똑같이 1회 돌리되 결과는 버린다(응답 지연·쿼리 순서를 다른 실패와 맞춤).
  const wasLocked = Boolean(user) && isLockedAt(user.locked_until);
  let passwordOk = false;
  try {
    passwordOk = await verifyPassword(password, user ? user.password_hash : DUMMY_PASSWORD_HASH);
  } catch (err) {
    return respondError(req, res, 500, { code: 'INTERNAL_ERROR', logMessage: '비밀번호 검증 오류', error: err });
  }
  // 잠긴 계정은 정답이어도 실패로 취급한다 — 정답/오답이 같은 경로·같은 응답을 타야 오라클이 생기지 않는다(D-1)
  const isValid = Boolean(user) && !wasLocked && passwordOk;

  // 3. 실패: 없는 계정 / 틀린 비밀번호 / 잠긴 계정(정오 무관) — 같은 처리·같은 응답
  if (!isValid) {
    let updated = null;
    try {
      // 잠긴 동안은 recordFailedLogin이 카운트·잠금 시각을 바꾸지 않는다(연장 없음). 쿼리는 똑같이 실행한다.
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

  // 4. 잠기지 않은 계정에서 비밀번호는 맞지만 비활성 → 본인에게만 비활성 안내
  if (!user.is_active) {
    await insertAuditLog({ userId: user.id, username, action: 'login_failed', ipAddress: ip, result: 'failure', metadata: { reason: 'inactive' } });
    return errorRedirect('inactive');
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

  // 8. last_login_at 업데이트, failed_login_count 초기화 (만료된 잠금도 여기서 정리)
  await sql`
    UPDATE users SET failed_login_count = 0, locked_until = NULL, last_login_at = now(), updated_at = now()
    WHERE id = ${user.id}
  `;

  await insertAuditLog({ userId: user.id, username, action: 'login', ipAddress: ip, result: 'success' });

  // 9. 리다이렉트
  if (user.must_change_password) {
    // 비밀번호 변경 완료 후 원래 가려던 경로로 돌아가도록 검증된 next를 전달
    const changePwUrl = next
      ? `/auth/change-password.html?${new URLSearchParams({ next }).toString()}`
      : '/auth/change-password.html';
    return res.redirect(302, changePwUrl);
  }
  return res.redirect(302, next || '/');
};
