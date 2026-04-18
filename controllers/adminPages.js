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
      return res.status(400).json({ error: 'path, name, required_role, file_path는 필수입니다.' });
    }
    if (!['admin', 'manager', 'user'].includes(required_role)) {
      return res.status(400).json({ error: '유효하지 않은 required_role입니다.' });
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
        return res.status(409).json({ error: '이미 등록된 경로입니다.' });
      }
      throw err;
    }

    await insertAuditLog({ userId: decoded.sub, action: 'page_registered', target: pagePath, ipAddress: ip, result: 'success' });
    return res.status(201).json({ page: newPage });
  }

  // PUT /api/admin/pages/:id
  const match = rawPath.match(/^\/api\/admin\/pages\/([^/]+)$/);
  if (req.method === 'PUT' && match) {
    const pageId = match[1];
    const body = req.body || {};

    if (body.required_role !== undefined) {
      if (!['admin', 'manager', 'user'].includes(body.required_role)) {
        return res.status(400).json({ error: '유효하지 않은 required_role입니다.' });
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

  return res.status(404).json({ error: 'Not Found' });
};
