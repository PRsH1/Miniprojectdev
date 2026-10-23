/**
 * controllers/_shared/session.js
 * API 컨트롤러용 세션 해석 유틸리티
 *
 * - resolveUser(req, res): auth_token 검증 → 만료 시 refresh 로테이션. 실패 시 null (응답하지 않음)
 * - requireRole(req, res, minRole): resolveUser + DB 현재 상태 확인 + 역할 검사.
 *   실패 시 401/403 응답까지 보내고 null 반환. 성공 시 DB 값으로 보정된 사용자 객체 반환.
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');
const { tryRefreshToken } = require('./auth-middleware');
const { respondError } = require('./respond-error');
const { hasRole, loadUserState } = require('./roles');

async function resolveUser(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  const refreshToken = cookies['refresh_token'];

  if (authToken) {
    try {
      return jwt.verify(authToken, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name !== 'TokenExpiredError') return null;
    }
  }

  if (!refreshToken) return null;

  const sql = getDb();
  const isSecure = process.env.NODE_ENV !== 'development';
  return tryRefreshToken(sql, refreshToken, res, isSecure);
}

const ROLE_LABEL = { admin: '관리자', manager: '매니저', user: '로그인 사용자' };

/**
 * 역할 기반 API 인가 (refresh 인지 + 권한 변경 즉시 반영)
 *
 * 1. resolveUser — 액세스 토큰 만료 시에도 리프레시 유효 기간 내면 통과
 * 2. users 테이블에서 role / is_active / must_change_password 를 1회 조회
 *    → JWT의 role이 아니라 DB의 현재 role로 판단 (강등·비활성화 즉시 반영)
 * 3. must_change_password 사용자는 기본 차단 (options.allowMustChangePassword로 예외)
 *
 * @param {'user'|'manager'|'admin'} minRole
 * @param {{ allowMustChangePassword?: boolean, forbiddenReason?: string }} [options]
 * @returns {Promise<null | { sub, role, mustChangePw, username, email }>}
 */
async function requireRole(req, res, minRole = 'user', options = {}) {
  const decoded = await resolveUser(req, res);
  if (!decoded) {
    respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: `requireRole(${minRole}): no valid session`,
    });
    return null;
  }

  let user;
  try {
    user = await loadUserState(getDb(), decoded.sub);
  } catch (error) {
    respondError(req, res, 500, {
      code: 'DATABASE_ERROR',
      message: '사용자 권한을 확인하는 중 오류가 발생했습니다.',
      reason: '계정 상태를 조회하지 못했습니다.',
      action: '잠시 후 다시 시도하세요.',
      error,
      logMessage: 'requireRole user lookup failed',
    });
    return null;
  }

  if (!user || !user.is_active) {
    respondError(req, res, 401, {
      code: 'TOKEN_INVALID',
      message: '사용할 수 없는 계정입니다.',
      reason: '계정이 비활성화되었거나 삭제되었습니다.',
      action: '관리자에게 문의하거나 다른 계정으로 로그인하세요.',
      logMessage: `requireRole(${minRole}): inactive or missing user ${decoded.sub}`,
    });
    return null;
  }

  if (user.must_change_password && !options.allowMustChangePassword) {
    respondError(req, res, 403, {
      code: 'FORBIDDEN',
      message: '비밀번호 변경이 필요합니다.',
      reason: '임시 비밀번호로 로그인한 상태에서는 이 기능을 사용할 수 없습니다.',
      action: '/auth/change-password.html 에서 비밀번호를 변경한 뒤 다시 시도하세요.',
      logMessage: `requireRole(${minRole}): must_change_password ${user.id}`,
    });
    return null;
  }

  if (!hasRole(user.role, minRole)) {
    respondError(req, res, 403, {
      code: 'FORBIDDEN',
      message: `${ROLE_LABEL[minRole] || minRole} 권한이 필요합니다.`,
      reason: options.forbiddenReason || '현재 계정의 역할로는 이 기능을 사용할 수 없습니다.',
      action: '권한이 있는 계정으로 로그인하거나 관리자에게 권한을 요청하세요.',
      logMessage: `requireRole(${minRole}): role ${user.role} denied`,
    });
    return null;
  }

  return {
    ...decoded,
    sub: user.id,
    role: user.role,
    mustChangePw: user.must_change_password,
    username: user.username,
    email: user.email,
  };
}

module.exports = { requireRole, resolveUser };
