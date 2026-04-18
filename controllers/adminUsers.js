/**
 * controllers/adminUsers.js
 * 관리자 사용자 관리 API
 *
 * GET    /api/admin/users                          → 사용자 목록
 * POST   /api/admin/users                          → 사용자 생성
 * PUT    /api/admin/users/:id                      → 사용자 수정 (role, is_active)
 * POST   /api/admin/users/:id/unlock               → 잠금 해제
 * POST   /api/admin/users/:id/reset-password       → 비밀번호 초기화
 * GET    /api/admin/password-reset-requests        → pending 요청 목록
 * POST   /api/admin/password-reset-requests/:id/resolve → 요청 처리
 */

const crypto = require('crypto');
const { promisify } = require('util');
const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

const scryptAsync = promisify(crypto.scrypt);

// ─── 공통 유틸 ────────────────────────────────────────────────

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

/** 영문 대소문자 + 숫자 혼합 임시 비밀번호 생성 */
function generateTempPassword(length = 8) {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

/** admin 역할 검증 */
function requireAdmin(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  if (!authToken) {
    respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: 'Admin API requires authentication',
    });
    return null;
  }
  let decoded;
  try {
    decoded = jwt.verify(authToken, process.env.JWT_SECRET);
  } catch (error) {
    respondError(req, res, 401, {
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      error,
      logMessage: 'Admin token verification failed',
    });
    return null;
  }
  if (decoded.role !== 'admin') {
    respondError(req, res, 403, {
      code: 'FORBIDDEN',
      message: '관리자 권한이 필요합니다.',
      reason: '현재 계정은 관리자 전용 API를 사용할 수 없습니다.',
      action: '관리자 계정으로 로그인하거나 권한을 요청하세요.',
      logMessage: 'Admin role required',
    });
    return null;
  }
  return decoded;
}

// ─── 메인 핸들러 ──────────────────────────────────────────────

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const decoded = requireAdmin(req, res);
  if (!decoded) return;

  const rawPath = req.url.split('?')[0]; // e.g. /api/admin/users/123/reset-password
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  // 패스워드 재설정 요청 라우트
  if (rawPath.startsWith('/api/admin/password-reset-requests')) {
    return handlePasswordResetRequests(req, res, decoded, rawPath, ip);
  }

  // 사용자 관리 라우트
  return handleUsers(req, res, decoded, rawPath, ip);
};

// ─── 사용자 관리 ──────────────────────────────────────────────

async function handleUsers(req, res, decoded, rawPath, ip) {
  const sql = getDb();

  // GET /api/admin/users
  if (req.method === 'GET' && rawPath === '/api/admin/users') {
    const users = await sql`
      SELECT id, username, email, role, is_active, must_change_password,
             failed_login_count, locked_until, last_login_at, created_at
      FROM users
      ORDER BY created_at DESC
    `;
    return res.status(200).json({ users });
  }

  // POST /api/admin/users — 신규 사용자 생성
  if (req.method === 'POST' && rawPath === '/api/admin/users') {
    const body = req.body || {};
    const username = (body.username || '').trim();
    const email = (body.email || '').trim();
    const role = body.role || 'user';

    if (!username || !email) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: 'username과 email은 필수입니다.',
        reason: '사용자 생성에 필요한 기본 정보가 누락되었습니다.',
        action: 'username과 email을 입력한 뒤 다시 시도하세요.',
      });
    }
    if (!['admin', 'manager', 'user'].includes(role)) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '유효하지 않은 역할입니다.',
        reason: 'role은 admin, manager, user 중 하나여야 합니다.',
        action: '역할 값을 다시 확인하세요.',
      });
    }

    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    let newUser;
    try {
      const rows = await sql`
        INSERT INTO users (username, email, password_hash, role, must_change_password)
        VALUES (${username}, ${email}, ${passwordHash}, ${role}, true)
        RETURNING id, username, email, role
      `;
      newUser = rows[0];
    } catch (err) {
      if (err.message && err.message.includes('unique')) {
        return respondError(req, res, 409, {
          code: 'VALIDATION_FAILED',
          message: '이미 존재하는 username 또는 email입니다.',
          reason: '중복된 사용자 식별 정보는 등록할 수 없습니다.',
          action: '다른 username 또는 email을 사용하세요.',
        });
      }
      throw err;
    }

    await insertAuditLog({
      userId: decoded.sub,
      action: 'user_created',
      target: username,
      ipAddress: ip,
      result: 'success',
      metadata: { newUserId: newUser.id, role },
    });

    return res.status(201).json({ user: newUser, temporaryPassword: tempPassword });
  }

  // URL에서 사용자 ID 추출: /api/admin/users/:id[/action]
  const match = rawPath.match(/^\/api\/admin\/users\/([^/]+)(\/.*)?$/);
  if (!match) {
    return respondError(req, res, 404, {
      code: 'RESOURCE_NOT_FOUND',
      message: '요청한 사용자 관리 경로를 찾을 수 없습니다.',
      reason: '등록되지 않은 사용자 관리 하위 경로입니다.',
      action: '관리자 콘솔에서 사용하는 경로인지 확인하세요.',
    });
  }
  const userId = match[1];
  const subAction = match[2] || '';

  // POST /api/admin/users/:id/unlock
  if (req.method === 'POST' && subAction === '/unlock') {
    await sql`
      UPDATE users SET failed_login_count = 0, locked_until = NULL, updated_at = now()
      WHERE id = ${userId}
    `;
    await insertAuditLog({ userId: decoded.sub, action: 'account_unlocked', target: userId, ipAddress: ip, result: 'success' });
    return res.status(200).json({ ok: true });
  }

  // POST /api/admin/users/:id/reset-password
  if (req.method === 'POST' && subAction === '/reset-password') {
    const tempPassword = generateTempPassword();
    const passwordHash = await hashPassword(tempPassword);

    const rows = await sql`
      UPDATE users SET password_hash = ${passwordHash}, must_change_password = true, updated_at = now()
      WHERE id = ${userId}
      RETURNING username
    `;
    if (!rows || rows.length === 0) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
        reason: '대상 사용자 ID가 없거나 이미 삭제되었습니다.',
        action: '사용자 목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }

    // 해당 사용자의 모든 refresh_tokens revoke
    await sql`UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = ${userId} AND revoked_at IS NULL`;

    // pending 비밀번호 재설정 요청 자동 resolved 처리
    await sql`
      UPDATE password_reset_requests
      SET status = 'resolved', resolved_at = now(), resolved_by = ${decoded.sub}
      WHERE user_id = ${userId} AND status = 'pending'
    `;

    await insertAuditLog({ userId: decoded.sub, action: 'admin_password_reset', target: userId, ipAddress: ip, result: 'success' });
    await insertAuditLog({ userId: decoded.sub, action: 'session_revoked_by_admin', target: userId, ipAddress: ip, result: 'success' });

    return res.status(200).json({ temporaryPassword: tempPassword });
  }

  // DELETE /api/admin/users/:id — 사용자 삭제
  if (req.method === 'DELETE' && subAction === '') {
    // 안전 장치 1: 본인 계정 삭제 방지
    if (userId === decoded.sub) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '본인 계정은 삭제할 수 없습니다.',
        reason: '현재 로그인한 관리자 본인을 삭제하면 세션과 관리 권한이 즉시 손실됩니다.',
        action: '다른 관리자 계정에서 작업하거나 대상 사용자를 다시 확인하세요.',
      });
    }

    // 안전 장치 2: 마지막 활성 admin 삭제 방지
    const targetRows = await sql`SELECT role FROM users WHERE id = ${userId} LIMIT 1`;
    if (!targetRows || targetRows.length === 0) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '사용자를 찾을 수 없습니다.',
        reason: '대상 사용자 ID가 없거나 이미 삭제되었습니다.',
        action: '사용자 목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }
    if (targetRows[0].role === 'admin') {
      const adminCount = await sql`SELECT COUNT(*) AS cnt FROM users WHERE role = 'admin' AND is_active = true`;
      if (parseInt(adminCount[0].cnt, 10) <= 1) {
        return respondError(req, res, 400, {
          code: 'VALIDATION_FAILED',
          message: '마지막 관리자 계정은 삭제할 수 없습니다.',
          reason: '활성 관리자 계정이 하나도 남지 않으면 운영이 불가능해집니다.',
          action: '다른 관리자를 먼저 추가하거나 활성화한 뒤 다시 시도하세요.',
        });
      }
    }

    // 감사 로그 기록 (삭제 전 — 삭제 후에는 user_id 참조 불가)
    await insertAuditLog({ userId: decoded.sub, action: 'user_deleted', target: userId, ipAddress: ip, result: 'success', metadata: { targetRole: targetRows[0].role } });

    // DB 정리 (순서 중요)
    await sql`DELETE FROM refresh_tokens WHERE user_id = ${userId}`;
    await sql`UPDATE audit_logs SET user_id = NULL WHERE user_id = ${userId}`;
    await sql`UPDATE signup_requests SET reviewed_by = NULL WHERE reviewed_by = ${userId}`;
    await sql`DELETE FROM users WHERE id = ${userId}`;

    return res.status(200).json({ ok: true });
  }

  // PUT/PATCH /api/admin/users/:id — 역할/활성여부 변경
  if ((req.method === 'PUT' || req.method === 'PATCH') && subAction === '') {
    const body = req.body || {};
    const updates = [];
    const params = [];

    if (body.role !== undefined) {
      if (!['admin', 'manager', 'user'].includes(body.role)) {
        return respondError(req, res, 400, {
          code: 'VALIDATION_FAILED',
          message: '유효하지 않은 역할입니다.',
          reason: 'role은 admin, manager, user 중 하나여야 합니다.',
          action: '역할 값을 다시 확인하세요.',
        });
      }
    }

    // 업데이트할 필드 동적 구성
    const allowedFields = { role: body.role, is_active: body.is_active };
    const setKeys = Object.entries(allowedFields).filter(([, v]) => v !== undefined);

    if (setKeys.length === 0) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '변경할 항목이 없습니다.',
        reason: '업데이트 가능한 필드가 요청 본문에 포함되지 않았습니다.',
        action: 'role 또는 is_active 값을 전달하세요.',
      });
    }

    // 개별 필드 업데이트 (동적 SQL 한계로 인해 분기 처리)
    if (body.role !== undefined && body.is_active !== undefined) {
      await sql`UPDATE users SET role = ${body.role}, is_active = ${body.is_active}, updated_at = now() WHERE id = ${userId}`;
    } else if (body.role !== undefined) {
      await sql`UPDATE users SET role = ${body.role}, updated_at = now() WHERE id = ${userId}`;
    } else if (body.is_active !== undefined) {
      const action = body.is_active ? 'user_updated' : 'user_deactivated';
      await sql`UPDATE users SET is_active = ${body.is_active}, updated_at = now() WHERE id = ${userId}`;
      await insertAuditLog({ userId: decoded.sub, action, target: userId, ipAddress: ip, result: 'success' });
      return res.status(200).json({ ok: true });
    }

    await insertAuditLog({ userId: decoded.sub, action: 'user_updated', target: userId, ipAddress: ip, result: 'success', metadata: allowedFields });
    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(req, res, ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
}

// ─── 비밀번호 재설정 요청 관리 ────────────────────────────────

async function handlePasswordResetRequests(req, res, decoded, rawPath, ip) {
  const sql = getDb();

  // GET /api/admin/password-reset-requests
  if (req.method === 'GET' && rawPath === '/api/admin/password-reset-requests') {
    const requests = await sql`
      SELECT id, user_id, username, status, created_at, resolved_at
      FROM password_reset_requests
      WHERE status = 'pending'
      ORDER BY created_at ASC
    `;
    return res.status(200).json({ requests });
  }

  // POST /api/admin/password-reset-requests/:id/resolve
  const match = rawPath.match(/^\/api\/admin\/password-reset-requests\/([^/]+)\/resolve$/);
  if (req.method === 'POST' && match) {
    const requestId = match[1];
    const body = req.body || {};

    const rows = await sql`
      UPDATE password_reset_requests
      SET status = 'resolved', resolved_at = now(), resolved_by = ${decoded.sub}
      WHERE id = ${requestId} AND status = 'pending'
      RETURNING user_id, username
    `;

    if (!rows || rows.length === 0) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '요청을 찾을 수 없습니다.',
        reason: '대상 비밀번호 재설정 요청이 없거나 이미 처리되었습니다.',
        action: '목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }

    await insertAuditLog({
      userId: decoded.sub,
      action: 'password_reset_request_resolved',
      target: rows[0].username,
      ipAddress: ip,
      result: 'success',
    });

    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(req, res, ['GET', 'POST']);
}
