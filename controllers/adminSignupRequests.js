/**
 * controllers/adminSignupRequests.js
 * 관리자 회원가입 요청 관리 API
 *
 * GET  /api/admin/signup-requests                  목록 조회 (?status=pending|approved|rejected)
 * POST /api/admin/signup-requests/:id/approve      승인 { role }
 * POST /api/admin/signup-requests/:id/reject       거절 { reject_reason }
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

function requireAdmin(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  if (!authToken) { respondError(req, res, 401, { code: 'AUTH_REQUIRED', logMessage: 'Admin signup API requires authentication' }); return null; }
  let decoded;
  try { decoded = jwt.verify(authToken, process.env.JWT_SECRET); } catch (error) { respondError(req, res, 401, { code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID', error, logMessage: 'Admin signup token verification failed' }); return null; }
  if (decoded.role !== 'admin') { respondError(req, res, 403, { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.', reason: '현재 계정은 회원가입 요청 관리 API를 사용할 수 없습니다.', action: '관리자 계정으로 로그인하세요.', logMessage: 'Admin role required for signup admin API' }); return null; }
  return decoded;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const decoded = requireAdmin(req, res);
  if (!decoded) return;

  const rawPath = req.url.split('?')[0];
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const sql = getDb();

  // GET /api/admin/signup-requests
  if (req.method === 'GET' && rawPath === '/api/admin/signup-requests') {
    const qs = new URL(req.url, 'http://localhost').searchParams;
    const status = qs.get('status') || 'pending';

    let rows;
    if (status === 'pending') {
      rows = await sql`SELECT id, username, email, status, created_at FROM signup_requests WHERE status = 'pending' ORDER BY created_at ASC`;
    } else if (status === 'approved') {
      rows = await sql`SELECT id, username, email, status, approved_role, reviewed_at FROM signup_requests WHERE status = 'approved' ORDER BY reviewed_at DESC`;
    } else if (status === 'rejected') {
      rows = await sql`SELECT id, username, email, status, reject_reason, reviewed_at FROM signup_requests WHERE status = 'rejected' ORDER BY reviewed_at DESC`;
    } else {
      rows = await sql`SELECT id, username, email, status, created_at FROM signup_requests ORDER BY created_at DESC`;
    }

    return res.status(200).json({ requests: rows });
  }

  // POST /api/admin/signup-requests/:id/approve
  const approveMatch = rawPath.match(/^\/api\/admin\/signup-requests\/([^/]+)\/approve$/);
  if (req.method === 'POST' && approveMatch) {
    const requestId = approveMatch[1];
    const body = req.body || {};
    const role = body.role || 'user';

    if (!['admin', 'manager', 'user'].includes(role)) {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: '유효하지 않은 역할입니다.', reason: 'role은 admin, manager, user 중 하나여야 합니다.', action: '역할 값을 다시 선택하세요.' });
    }

    // signup_requests 조회
    const reqRows = await sql`
      SELECT * FROM signup_requests WHERE id = ${requestId} AND status = 'pending' LIMIT 1
    `;
    if (!reqRows || reqRows.length === 0) {
      return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '대기 중인 요청을 찾을 수 없습니다.', reason: '승인할 회원가입 요청이 없거나 이미 처리되었습니다.', action: '목록을 새로고침한 뒤 다시 시도하세요.' });
    }
    const sr = reqRows[0];

    // users INSERT (password_hash는 signup_requests에서 그대로 복사, 재해싱 금지)
    let newUser;
    try {
      const insertRows = await sql`
        INSERT INTO users (username, email, password_hash, role, is_active, must_change_password)
        VALUES (${sr.username}, ${sr.email}, ${sr.password_hash}, ${role}, true, false)
        RETURNING id, username, email, role
      `;
      newUser = insertRows[0];
    } catch (err) {
      if (err.message && err.message.includes('unique')) {
        return respondError(req, res, 409, { code: 'VALIDATION_FAILED', message: '이미 존재하는 username 또는 email입니다.', reason: '중복된 사용자 식별 정보는 승인 처리할 수 없습니다.', action: '중복 계정을 확인한 뒤 다시 시도하세요.' });
      }
      throw err;
    }

    // signup_requests 상태 업데이트
    await sql`
      UPDATE signup_requests
      SET status = 'approved', approved_role = ${role},
          reviewed_by = ${decoded.sub}, reviewed_at = now()
      WHERE id = ${requestId}
    `;

    await insertAuditLog({
      userId: decoded.sub,
      action: 'signup_approved',
      target: sr.username,
      ipAddress: ip,
      result: 'success',
      metadata: { username: sr.username, approved_role: role, newUserId: newUser.id },
    });

    return res.status(200).json({ ok: true, user: newUser });
  }

  // POST /api/admin/signup-requests/:id/reject
  const rejectMatch = rawPath.match(/^\/api\/admin\/signup-requests\/([^/]+)\/reject$/);
  if (req.method === 'POST' && rejectMatch) {
    const requestId = rejectMatch[1];
    const body = req.body || {};
    const rejectReason = (body.reject_reason || '').trim() || null;

    const reqRows = await sql`
      SELECT username FROM signup_requests WHERE id = ${requestId} AND status = 'pending' LIMIT 1
    `;
    if (!reqRows || reqRows.length === 0) {
      return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '대기 중인 요청을 찾을 수 없습니다.', reason: '거절할 회원가입 요청이 없거나 이미 처리되었습니다.', action: '목록을 새로고침한 뒤 다시 시도하세요.' });
    }

    await sql`
      UPDATE signup_requests
      SET status = 'rejected', reject_reason = ${rejectReason},
          reviewed_by = ${decoded.sub}, reviewed_at = now()
      WHERE id = ${requestId}
    `;

    await insertAuditLog({
      userId: decoded.sub,
      action: 'signup_rejected',
      target: reqRows[0].username,
      ipAddress: ip,
      result: 'success',
      metadata: { username: reqRows[0].username, reject_reason: rejectReason },
    });

    return res.status(200).json({ ok: true });
  }

  if (rawPath === '/api/admin/signup-requests' || approveMatch || rejectMatch) {
    return methodNotAllowed(req, res, ['GET', 'POST']);
  }

  return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '요청한 회원가입 관리 경로를 찾을 수 없습니다.', reason: '등록되지 않은 회원가입 관리 하위 경로입니다.', action: '관리자 콘솔에서 사용하는 경로인지 확인하세요.' });
};
