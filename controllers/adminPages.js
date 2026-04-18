/**
 * controllers/adminPages.js
 * 관리자 보호 페이지 관리 API
 *
 * GET  /api/admin/pages       → 목록
 * POST /api/admin/pages       → 신규 등록
 * PUT  /api/admin/pages/:id   → 수정 (required_role, is_active)
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

function requireAdmin(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  if (!authToken) { respondError(req, res, 401, { code: 'AUTH_REQUIRED', logMessage: 'Admin pages API requires authentication' }); return null; }
  let decoded;
  try { decoded = jwt.verify(authToken, process.env.JWT_SECRET); } catch (error) { respondError(req, res, 401, { code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID', error, logMessage: 'Admin pages token verification failed' }); return null; }
  if (decoded.role !== 'admin') { respondError(req, res, 403, { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.', reason: '현재 계정은 페이지 관리 API를 사용할 수 없습니다.', action: '관리자 계정으로 로그인하세요.', logMessage: 'Admin role required for page API' }); return null; }
  return decoded;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const decoded = requireAdmin(req, res);
  if (!decoded) return;

  const rawPath = req.url.split('?')[0];
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const sql = getDb();

  // GET /api/admin/pages
  if (req.method === 'GET' && rawPath === '/api/admin/pages') {
    const pages = await sql`
      SELECT id, path, name, description, required_role, file_path, is_active, created_at
      FROM protected_pages
      ORDER BY path ASC
    `;
    return res.status(200).json({ pages });
  }

  // POST /api/admin/pages
  if (req.method === 'POST' && rawPath === '/api/admin/pages') {
    const body = req.body || {};
    const { path: pagePath, name, description, required_role, file_path } = body;

    if (!pagePath || !name || !required_role || !file_path) {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: 'path, name, required_role, file_path는 필수입니다.', reason: '보호 페이지 등록에 필요한 값이 누락되었습니다.', action: '필수 항목을 모두 입력한 뒤 다시 시도하세요.' });
    }
    if (!['admin', 'manager', 'user'].includes(required_role)) {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: '유효하지 않은 required_role입니다.', reason: 'required_role은 admin, manager, user 중 하나여야 합니다.', action: '권한 값을 다시 선택하세요.' });
    }

    let newPage;
    try {
      const rows = await sql`
        INSERT INTO protected_pages (path, name, description, required_role, file_path)
        VALUES (${pagePath}, ${name}, ${description || null}, ${required_role}, ${file_path})
        RETURNING id, path, name, required_role, file_path, is_active
      `;
      newPage = rows[0];
    } catch (err) {
      if (err.message && err.message.includes('unique')) {
        return respondError(req, res, 409, { code: 'VALIDATION_FAILED', message: '이미 등록된 경로입니다.', reason: '같은 path를 가진 보호 페이지가 이미 존재합니다.', action: '다른 경로를 사용하거나 기존 페이지를 수정하세요.' });
      }
      throw err;
    }

    await insertAuditLog({ userId: decoded.sub, action: 'page_registered', target: pagePath, ipAddress: ip, result: 'success' });
    return res.status(201).json({ page: newPage });
  }

  // DELETE /api/admin/pages/:id
  const deleteMatch = rawPath.match(/^\/api\/admin\/pages\/([^/]+)$/);
  if (req.method === 'DELETE' && deleteMatch) {
    const pageId = deleteMatch[1];
    const rows = await sql`
      DELETE FROM protected_pages WHERE id = ${pageId}
      RETURNING path, file_path
    `;
    if (!rows || rows.length === 0) {
      return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '페이지를 찾을 수 없습니다.', reason: '삭제 대상 보호 페이지가 존재하지 않습니다.', action: '목록을 새로고침한 뒤 다시 시도하세요.' });
    }
    await insertAuditLog({
      userId: decoded.sub, action: 'page_deleted', target: rows[0].path,
      ipAddress: ip, result: 'success', metadata: { file_path: rows[0].file_path },
    });
    return res.status(200).json({ ok: true });
  }

  // PUT /api/admin/pages/:id
  const match = rawPath.match(/^\/api\/admin\/pages\/([^/]+)$/);
  if (req.method === 'PUT' && match) {
    const pageId = match[1];
    const body = req.body || {};

    if (body.required_role !== undefined) {
      if (!['admin', 'manager', 'user'].includes(body.required_role)) {
        return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: '유효하지 않은 required_role입니다.', reason: 'required_role은 admin, manager, user 중 하나여야 합니다.', action: '권한 값을 다시 선택하세요.' });
      }
      await sql`UPDATE protected_pages SET required_role = ${body.required_role}, updated_at = now() WHERE id = ${pageId}`;
      const action = 'page_updated';
      await insertAuditLog({ userId: decoded.sub, action, target: pageId, ipAddress: ip, result: 'success', metadata: { required_role: body.required_role } });
    }

    if (body.is_active !== undefined) {
      await sql`UPDATE protected_pages SET is_active = ${body.is_active}, updated_at = now() WHERE id = ${pageId}`;
      const action = body.is_active ? 'page_updated' : 'page_deactivated';
      await insertAuditLog({ userId: decoded.sub, action, target: pageId, ipAddress: ip, result: 'success', metadata: { is_active: body.is_active } });
    }

    return res.status(200).json({ ok: true });
  }

  if (rawPath === '/api/admin/pages' || deleteMatch || match) {
    return methodNotAllowed(req, res, ['GET', 'POST', 'PUT', 'DELETE']);
  }

  return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '요청한 페이지 관리 경로를 찾을 수 없습니다.', reason: '등록되지 않은 페이지 관리 하위 경로입니다.', action: '관리자 콘솔에서 사용하는 경로인지 확인하세요.' });
};
