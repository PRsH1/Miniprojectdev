/**
 * controllers/adminAuditLogs.js
 * 감사 로그 조회 API (필터 + 페이지네이션)
 * GET /api/admin/audit-logs
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');

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
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const decoded = requireAdmin(req, res);
  if (!decoded) return;

  const sql = getDb();
  const qs = new URL(req.url, 'http://localhost').searchParams;

  const page = Math.max(1, parseInt(qs.get('page') || '1', 10));
  const limit = 20;
  const offset = (page - 1) * limit;

  const usernameFilter = qs.get('username') || '';
  const actionFilter = qs.get('action') || '';
  const dateFrom = qs.get('from') || '';
  const dateTo = qs.get('to') || '';

  // 동적 필터 조건 (neon 태그드 템플릿 리터럴 한계로 조건 분기)
  // 조건 조합: username, action, date_from, date_to 각각 선택적 적용
  let logs, total;

  // 간단하게 조건을 텍스트로 조합 (SQL 인젝션 없음 — 파라미터 바인딩)
  // neon()은 템플릿 리터럴만 지원하므로 조건별 분기
  const hasUsername = !!usernameFilter;
  const hasAction = !!actionFilter;
  const hasFrom = !!dateFrom;
  const hasTo = !!dateTo;

  // 전체 조건 없음
  if (!hasUsername && !hasAction && !hasFrom && !hasTo) {
    [logs, total] = await Promise.all([
      sql`SELECT id, created_at, username, action, target, result, ip_address FROM audit_logs ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      sql`SELECT COUNT(*) AS cnt FROM audit_logs`,
    ]);
  } else if (hasUsername && !hasAction && !hasFrom && !hasTo) {
    [logs, total] = await Promise.all([
      sql`SELECT id, created_at, username, action, target, result, ip_address FROM audit_logs WHERE username ILIKE ${'%' + usernameFilter + '%'} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      sql`SELECT COUNT(*) AS cnt FROM audit_logs WHERE username ILIKE ${'%' + usernameFilter + '%'}`,
    ]);
  } else if (!hasUsername && hasAction && !hasFrom && !hasTo) {
    [logs, total] = await Promise.all([
      sql`SELECT id, created_at, username, action, target, result, ip_address FROM audit_logs WHERE action = ${actionFilter} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      sql`SELECT COUNT(*) AS cnt FROM audit_logs WHERE action = ${actionFilter}`,
    ]);
  } else if (hasUsername && hasAction && !hasFrom && !hasTo) {
    [logs, total] = await Promise.all([
      sql`SELECT id, created_at, username, action, target, result, ip_address FROM audit_logs WHERE username ILIKE ${'%' + usernameFilter + '%'} AND action = ${actionFilter} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
      sql`SELECT COUNT(*) AS cnt FROM audit_logs WHERE username ILIKE ${'%' + usernameFilter + '%'} AND action = ${actionFilter}`,
    ]);
  } else {
    // 날짜 필터가 포함된 경우 — 모든 조건 적용
    const fromDate = hasFrom ? dateFrom : '1970-01-01';
    const toDate = hasTo ? dateTo : '2099-12-31';
    if (hasUsername && hasAction) {
      [logs, total] = await Promise.all([
        sql`SELECT id, created_at, username, action, target, result, ip_address FROM audit_logs WHERE username ILIKE ${'%' + usernameFilter + '%'} AND action = ${actionFilter} AND created_at >= ${fromDate}::date AND created_at < (${toDate}::date + interval '1 day') ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        sql`SELECT COUNT(*) AS cnt FROM audit_logs WHERE username ILIKE ${'%' + usernameFilter + '%'} AND action = ${actionFilter} AND created_at >= ${fromDate}::date AND created_at < (${toDate}::date + interval '1 day')`,
      ]);
    } else if (hasUsername) {
      [logs, total] = await Promise.all([
        sql`SELECT id, created_at, username, action, target, result, ip_address FROM audit_logs WHERE username ILIKE ${'%' + usernameFilter + '%'} AND created_at >= ${fromDate}::date AND created_at < (${toDate}::date + interval '1 day') ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        sql`SELECT COUNT(*) AS cnt FROM audit_logs WHERE username ILIKE ${'%' + usernameFilter + '%'} AND created_at >= ${fromDate}::date AND created_at < (${toDate}::date + interval '1 day')`,
      ]);
    } else if (hasAction) {
      [logs, total] = await Promise.all([
        sql`SELECT id, created_at, username, action, target, result, ip_address FROM audit_logs WHERE action = ${actionFilter} AND created_at >= ${fromDate}::date AND created_at < (${toDate}::date + interval '1 day') ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        sql`SELECT COUNT(*) AS cnt FROM audit_logs WHERE action = ${actionFilter} AND created_at >= ${fromDate}::date AND created_at < (${toDate}::date + interval '1 day')`,
      ]);
    } else {
      [logs, total] = await Promise.all([
        sql`SELECT id, created_at, username, action, target, result, ip_address FROM audit_logs WHERE created_at >= ${fromDate}::date AND created_at < (${toDate}::date + interval '1 day') ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        sql`SELECT COUNT(*) AS cnt FROM audit_logs WHERE created_at >= ${fromDate}::date AND created_at < (${toDate}::date + interval '1 day')`,
      ]);
    }
  }

  const totalCount = parseInt(total[0].cnt, 10);
  const totalPages = Math.ceil(totalCount / limit);

  return res.status(200).json({ logs, total: totalCount, page, totalPages, limit });
};
