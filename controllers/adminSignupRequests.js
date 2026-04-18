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

function requireAdmin(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  if (!authToken) { res.status(401).json({ error: '인증이 필요합니다.' }); return null; }
  let decoded;
  try { decoded = jwt.verify(authToken, process.env.JWT_SECRET); } catch { res.status(401).json({ error: '유효하지 않은 토큰입니다.' }); return null; }
  if (decoded.role !== 'admin') { res.status(403).json({ error: '관리자 권한이 필요합니다.' }); return null; }
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
      return res.status(400).json({ error: '유효하지 않은 역할입니다.' });
    }

    // signup_requests 조회
    const reqRows = await sql`
      SELECT * FROM signup_requests WHERE id = ${requestId} AND status = 'pending' LIMIT 1
    `;
    if (!reqRows || reqRows.length === 0) {
      return res.status(404).json({ error: '대기 중인 요청을 찾을 수 없습니다.' });
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
        return res.status(409).json({ error: '이미 존재하는 username 또는 email입니다.' });
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
      return res.status(404).json({ error: '대기 중인 요청을 찾을 수 없습니다.' });
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

  return res.status(404).json({ error: 'Not Found' });
};
