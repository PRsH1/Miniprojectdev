/**
 * controllers/change-password.js
 * 비밀번호 변경 (강제 변경 + 자발적 변경)
 * GET  /api/change-password  → { requiresCurrentPassword } (화면이 현재 비밀번호 입력란 표시 여부 결정)
 * POST /api/change-password  → { currentPassword?, newPassword, confirmPassword }
 *
 * P0b-02
 * - 인증은 requireRole('user', allowMustChangePassword) — refresh 인지, 비활성 계정 즉시 차단
 * - 현재 비밀번호 확인:
 *   · must_change_password=false(일반 변경) → currentPassword 필수. 틀리면 로그인 실패와 같은 카운터를 올린다
 *     (5회 → 30분 잠금). 잠긴 동안은 변경 불가 → 탈취된 세션으로 비밀번호를 무차별 대입해 바꾸는 것을 막는다.
 *   · must_change_password=true(관리자 초기화 임시 비밀번호) → 방금 임시 비밀번호로 로그인해 확인했으므로
 *     currentPassword를 요구하지 않는다(임시 비밀번호를 모르는 화면 흐름이 막히지 않도록).
 * - 새 비밀번호는 현재 비밀번호와 달라야 한다(임시 비밀번호 재사용 방지).
 * - 변경 후 이 사용자의 **다른** refresh 토큰을 모두 폐기한다(다른 기기 세션 종료).
 *   현재 요청의 refresh 토큰(그리고 이번 요청에서 로테이션됐다면 그 후속 토큰)은 남겨 현재 세션을 유지한다.
 *   JWT 재서명(mustChangePw:false)과 현재 refresh 로테이션은 P1-13에서 처리한다.
 */

const crypto = require('crypto');
const { parse } = require('cookie');
const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');
const { requireRole } = require('./_shared/session');
const { INPUT_LIMITS } = require('./_shared/input-limits');
const {
  hashPassword,
  isLockedAt,
  recordFailedLogin,
  verifyPassword,
} = require('./_shared/password');

function badRequest(req, res, message, reason, action) {
  return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message, reason, action });
}

/**
 * 현재 세션을 제외한 이 사용자의 활성 refresh 토큰 폐기
 * - currentHash: 요청 쿠키의 refresh_token 해시(없으면 null → 전부 폐기)
 * - 같은 요청에서 requireRole이 토큰을 로테이션했다면 쿠키 토큰은 이미 폐기됐고 후속 토큰(replaced_by)이
 *   새 쿠키로 나가므로, 그 후속 토큰도 남긴다.
 * - replaced_by 없이 revoked_at만 세팅 → grace(30초) 재인증도 차단된다(logout과 같은 방식)
 */
async function revokeOtherRefreshTokens(sql, userId, currentHash) {
  const rows = await sql`
    UPDATE refresh_tokens
    SET revoked_at = now()
    WHERE user_id = ${userId}
      AND revoked_at IS NULL
      AND token_hash IS DISTINCT FROM ${currentHash}
      AND id NOT IN (
        SELECT replaced_by FROM refresh_tokens
        WHERE token_hash = ${currentHash} AND replaced_by IS NOT NULL
      )
    RETURNING id
  `;
  return rows ? rows.length : 0;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return methodNotAllowed(req, res, ['GET', 'POST']);
  }

  // 임시 비밀번호 상태에서도 이 API는 사용할 수 있어야 한다
  const user = await requireRole(req, res, 'user', { allowMustChangePassword: true });
  if (!user) return undefined;

  if (req.method === 'GET') {
    return res.status(200).json({ requiresCurrentPassword: !user.mustChangePw });
  }

  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const body = req.body || {};
  const str = (v) => (typeof v === 'string' ? v : '');
  const currentPassword = str(body.currentPassword);
  const newPassword = str(body.newPassword);
  const confirmPassword = str(body.confirmPassword);

  if (!newPassword || newPassword.length < INPUT_LIMITS.passwordMin) {
    return badRequest(req, res,
      `비밀번호는 ${INPUT_LIMITS.passwordMin}자 이상이어야 합니다.`,
      '보안 정책상 최소 길이를 만족해야 합니다.',
      `${INPUT_LIMITS.passwordMin}자 이상 비밀번호를 입력하세요.`);
  }
  if (newPassword.length > INPUT_LIMITS.passwordMax || currentPassword.length > INPUT_LIMITS.passwordMax) {
    return badRequest(req, res,
      `비밀번호는 ${INPUT_LIMITS.passwordMax}자 이하여야 합니다.`,
      '입력한 비밀번호가 너무 깁니다.',
      '더 짧은 비밀번호를 입력하세요.');
  }
  if (newPassword !== confirmPassword) {
    return badRequest(req, res,
      '비밀번호 확인이 일치하지 않습니다.',
      'newPassword와 confirmPassword 값이 다릅니다.',
      '두 입력값을 다시 확인하세요.');
  }

  const requiresCurrent = !user.mustChangePw;
  if (requiresCurrent && !currentPassword) {
    return badRequest(req, res,
      '현재 비밀번호를 입력하세요.',
      '비밀번호를 바꾸려면 현재 비밀번호 확인이 필요합니다.',
      '현재 비밀번호를 입력한 뒤 다시 시도하세요.');
  }

  const sql = getDb();
  const rows = await sql`
    SELECT password_hash, locked_until
    FROM users
    WHERE id = ${user.sub}
    LIMIT 1
  `;
  if (!rows || rows.length === 0) {
    return respondError(req, res, 401, { code: 'TOKEN_INVALID', logMessage: 'change-password: user vanished' });
  }
  const stored = rows[0];

  if (requiresCurrent) {
    // 잠긴 동안은 현재 비밀번호를 검증하지 않는다(무차별 대입 지속 방지)
    if (isLockedAt(stored.locked_until)) {
      return respondError(req, res, 403, {
        code: 'FORBIDDEN',
        message: '비밀번호 확인 실패가 반복되어 계정이 잠겨 있습니다.',
        reason: `잠금이 풀리는 시각: ${new Date(stored.locked_until).toISOString()}`,
        action: '잠금이 풀린 뒤 다시 시도하거나 관리자에게 문의하세요.',
        logMessage: `change-password: locked ${user.sub}`,
      });
    }
    const ok = await verifyPassword(currentPassword, stored.password_hash);
    if (!ok) {
      const updated = await recordFailedLogin(sql, user.username);
      const nowLocked = Boolean(updated) && isLockedAt(updated.locked_until);
      await insertAuditLog({
        userId: user.sub,
        username: user.username,
        action: 'password_change_failed',
        ipAddress: ip,
        result: 'failure',
        metadata: { reason: 'wrong_current_password', ...(updated ? { failed_count: updated.failed_login_count } : {}) },
      });
      if (nowLocked) {
        await insertAuditLog({ userId: user.sub, username: user.username, action: 'account_locked', ipAddress: ip, result: 'failure', metadata: { failed_count: updated.failed_login_count, via: 'change-password' } });
      }
      return badRequest(req, res,
        '현재 비밀번호가 올바르지 않습니다.',
        nowLocked
          ? '실패가 반복되어 계정이 잠겼습니다.'
          : '입력한 현재 비밀번호가 저장된 비밀번호와 다릅니다.',
        nowLocked ? '잠금이 풀린 뒤 다시 시도하세요.' : '현재 비밀번호를 다시 확인하세요.');
    }
  }

  // 새 비밀번호가 현재(또는 임시) 비밀번호와 같으면 거부
  if (await verifyPassword(newPassword, stored.password_hash)) {
    return badRequest(req, res,
      '현재 비밀번호와 다른 비밀번호를 입력하세요.',
      '새 비밀번호가 현재 비밀번호와 같습니다.',
      '다른 비밀번호를 입력하세요.');
  }

  const hash = await hashPassword(newPassword);
  await sql`
    UPDATE users
    SET password_hash = ${hash}, must_change_password = false,
        failed_login_count = 0, locked_until = NULL, updated_at = now()
    WHERE id = ${user.sub}
  `;

  // 다른 세션의 refresh 토큰 폐기 (현재 세션은 유지)
  const cookies = parse(req.headers.cookie || '');
  const currentRefresh = cookies['refresh_token'];
  const currentHash = currentRefresh
    ? crypto.createHash('sha256').update(currentRefresh).digest('hex')
    : null;
  let revokedSessions = 0;
  try {
    revokedSessions = await revokeOtherRefreshTokens(sql, user.sub, currentHash);
  } catch (err) {
    // 비밀번호는 이미 바뀌었으므로 실패해도 응답은 성공. 서버 로그로 남긴다.
    console.error('change-password: 다른 refresh 토큰 폐기 실패:', err);
  }

  await insertAuditLog({
    userId: user.sub,
    username: user.username,
    action: 'password_changed',
    ipAddress: ip,
    result: 'success',
    metadata: { forced: Boolean(user.mustChangePw), revoked_sessions: revokedSessions },
  });

  return res.status(200).json({ ok: true, message: '비밀번호가 변경되었습니다.', revokedSessions });
};
