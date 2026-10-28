/**
 * controllers/_shared/roles.js
 * 역할 계층 비교 + 사용자 현재 상태(DB) 조회 공통 모듈
 *
 * JWT의 role/mustChangePw는 발급 시점 스냅샷이라 최대 1시간 동안 낡을 수 있다.
 * 권한 판단은 항상 loadUserState()로 읽은 DB 값을 기준으로 한다.
 * (session.js ↔ auth-middleware.js 순환 참조를 피하려고 별도 모듈로 분리)
 */

const { isUuid } = require('./validate');

// admin > manager > user
const ROLE_RANK = Object.freeze({ user: 1, manager: 2, admin: 3 });

/** userRole이 minRole 이상인지 확인 (알 수 없는 역할은 항상 false) */
function hasRole(userRole, minRole) {
  const have = ROLE_RANK[userRole];
  const need = ROLE_RANK[minRole];
  if (!have || !need) return false;
  return have >= need;
}

/**
 * users 테이블에서 권한 판단에 필요한 현재 상태를 1회 조회
 * 반환: { id, username, email, role, is_active, must_change_password } 또는 null
 */
async function loadUserState(sql, userId) {
  if (!isUuid(userId)) return null;
  const rows = await sql`
    SELECT id, username, email, role, is_active, must_change_password
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  return rows && rows.length ? rows[0] : null;
}

module.exports = { ROLE_RANK, hasRole, loadUserState };
