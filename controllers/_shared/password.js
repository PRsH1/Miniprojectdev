/**
 * controllers/_shared/password.js
 * 비밀번호 해시(scrypt) 생성·검증 공통 모듈
 *
 * 저장 형식: `{salt_hex}:{hash_hex}` (scrypt, keylen 64)
 * login.js(검증), change-password.js(현재 비밀번호 확인 + 새 해시), signup.js(새 해시)가 같은 구현을 쓴다.
 */

const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${hash.toString('hex')}`;
}

/** 비밀번호 해시 검증 (salt:hash 형식). 형식이 맞지 않으면 false */
async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const colonIdx = stored.indexOf(':');
  if (colonIdx === -1) return false;
  const salt = stored.slice(0, colonIdx);
  const hash = stored.slice(colonIdx + 1);
  const hashBuffer = Buffer.from(hash, 'hex');
  const inputHash = await scryptAsync(password, salt, KEY_LENGTH);
  if (hashBuffer.length !== inputHash.length) return false;
  return crypto.timingSafeEqual(hashBuffer, inputHash);
}

/**
 * 계정이 없을 때 대신 검증할 더미 해시 (P0b-01 계정 열거 완화)
 * 존재하지 않는 아이디도 같은 scrypt 비용을 치르게 해 응답 지연으로 계정 존재 여부가 드러나지 않게 한다.
 * 해시 부분은 난수라 어떤 비밀번호와도 일치하지 않는다. 프로세스마다 새로 만든다(비밀값 아님).
 */
const DUMMY_PASSWORD_HASH = `${crypto.randomBytes(16).toString('hex')}:${crypto.randomBytes(KEY_LENGTH).toString('hex')}`;

// ─── 로그인 실패 잠금 (P0b-01) ─────────────────────────────────
// 연속 실패 허용 횟수와 잠금 시간 — login.js와 change-password.js(현재 비밀번호 확인)가 공유
const MAX_FAILED_LOGINS = 5;
const LOCK_MINUTES = 30;

/**
 * 비밀번호 실패 1회 기록 — 원자적 증가 + 임계값 도달 시 잠금
 * - 단일 UPDATE로 처리한다. 동시 요청도 행 잠금으로 직렬화되어 증가분이 사라지지 않는다.
 * - 이미 잠겨 있으면 카운트·잠금 시각을 그대로 둔다(잠금 연장 없음)
 * - 잠금이 만료된 뒤 첫 실패는 1부터 다시 센다
 * - 없는 아이디도 같은 쿼리를 실행한다(0행) — 응답 지연을 맞추기 위함
 * 반환: 갱신된 행 { id, failed_login_count, locked_until } 또는 null(계정 없음)
 */
async function recordFailedLogin(sql, username) {
  const rows = await sql`
    UPDATE users SET
      failed_login_count = CASE
        WHEN locked_until > now() THEN failed_login_count
        WHEN locked_until IS NOT NULL THEN 1
        ELSE COALESCE(failed_login_count, 0) + 1
      END,
      locked_until = CASE
        WHEN locked_until > now() THEN locked_until
        WHEN (CASE WHEN locked_until IS NOT NULL THEN 1 ELSE COALESCE(failed_login_count, 0) + 1 END) >= ${MAX_FAILED_LOGINS}::int
          THEN now() + (${LOCK_MINUTES}::int * interval '1 minute')
        ELSE NULL
      END,
      updated_at = now()
    WHERE username = ${username}
    RETURNING id, failed_login_count, locked_until
  `;
  return rows && rows.length ? rows[0] : null;
}

function isLockedAt(lockedUntil, now = new Date()) {
  return Boolean(lockedUntil) && new Date(lockedUntil) > now;
}

module.exports = {
  DUMMY_PASSWORD_HASH,
  LOCK_MINUTES,
  MAX_FAILED_LOGINS,
  hashPassword,
  isLockedAt,
  recordFailedLogin,
  verifyPassword,
};
