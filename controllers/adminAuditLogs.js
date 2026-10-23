/**
 * controllers/adminAuditLogs.js
 * 감사 로그 조회 API (필터 + 페이지네이션)
 * GET /api/admin/audit-logs
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');
const { PG_INT_MAX, isIsoDate, parsePositiveInt } = require('./_shared/validate');

function requireAdmin(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  if (!authToken) { respondError(req, res, 401, { code: 'AUTH_REQUIRED', logMessage: 'Admin audit API requires authentication' }); return null; }
  let decoded;
  try { decoded = jwt.verify(authToken, process.env.JWT_SECRET); } catch (error) { respondError(req, res, 401, { code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID', error, logMessage: 'Admin audit token verification failed' }); return null; }
  if (decoded.role !== 'admin') { respondError(req, res, 403, { code: 'FORBIDDEN', message: '관리자 권한이 필요합니다.', reason: '현재 계정은 감사 로그 조회 API를 사용할 수 없습니다.', action: '관리자 계정으로 로그인하세요.', logMessage: 'Admin role required for audit API' }); return null; }
  return decoded;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  if (req.method !== 'GET') {
    return methodNotAllowed(req, res, ['GET']);
  }

  const decoded = requireAdmin(req, res);
  if (!decoded) return;

  const sql = getDb();
  const qs = new URL(req.url, 'http://localhost').searchParams;

  const limit = 20;
  // page는 양의 정수만 허용 — 'abc' 등은 NaN OFFSET → SQL 오류(500)가 되므로 400으로 차단
  // 상한은 OFFSET이 INTEGER 범위를 넘지 않도록 제한
  const page = parsePositiveInt(qs.get('page'), 1, Math.floor(PG_INT_MAX / limit));
  if (page === null) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: 'page 값이 올바르지 않습니다.',
      reason: 'page는 1 이상의 정수여야 합니다.',
      action: 'page 파라미터를 확인한 뒤 다시 시도하세요.',
    });
  }
  const offset = (page - 1) * limit;

  const usernameFilter = qs.get('username') || '';
  const actionFilter = qs.get('action') || '';
  const dateFrom = qs.get('from') || '';
  const dateTo = qs.get('to') || '';

  if ((dateFrom && !isIsoDate(dateFrom)) || (dateTo && !isIsoDate(dateTo))) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: '날짜 필터 형식이 올바르지 않습니다.',
      reason: 'from/to는 YYYY-MM-DD 형식의 실제 날짜여야 합니다.',
      action: '날짜를 다시 선택한 뒤 조회하세요.',
    });
  }

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
