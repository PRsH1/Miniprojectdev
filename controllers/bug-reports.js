/**
 * controllers/bug-reports.js
 * 버그 리포트 API
 *
 * POST   /api/bug-reports
 * GET    /api/bug-reports
 * GET    /api/bug-reports/:id
 * PATCH  /api/bug-reports/:id
 * POST   /api/bug-reports/:id/update
 * DELETE /api/bug-reports/:id
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

const ALLOWED_SEVERITY = ['low', 'normal', 'high', 'critical'];
const ALLOWED_STATUS = ['open', 'in-progress', 'resolved', 'closed'];

function requireAdmin(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies.auth_token;
  if (!authToken) {
    respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: 'Bug report admin API requires authentication',
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
      logMessage: 'Bug report admin token verification failed',
    });
    return null;
  }

  if (decoded.role !== 'admin') {
    respondError(req, res, 403, {
      code: 'FORBIDDEN',
      message: '관리자 권한이 필요합니다.',
      reason: '현재 계정은 버그 리포트 관리 API를 사용할 수 없습니다.',
      action: '관리자 계정으로 로그인하세요.',
      logMessage: 'Admin role required for bug reports API',
    });
    return null;
  }

  return decoded;
}

function requireAuth(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies.auth_token;
  if (!authToken) {
    respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: 'Bug report submission requires authentication',
    });
    return null;
  }

  try {
    return jwt.verify(authToken, process.env.JWT_SECRET);
  } catch (error) {
    respondError(req, res, 401, {
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      error,
      logMessage: 'Bug report submission token verification failed',
    });
    return null;
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const rawPath = (req.url || '').split('?')[0];
  const sql = getDb();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  if (req.method === 'POST' && rawPath === '/api/bug-reports') {
    const decoded = requireAuth(req, res);
    if (!decoded) return;

    const body = req.body || {};
    const title = String(body.title || '').trim();
    const description = String(body.description || '').trim();
    const pageUrl = String(body.page_url || '').trim() || null;
    const severity = String(body.severity || 'normal').trim().toLowerCase() || 'normal';

    if (!title || !description) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: 'title과 description은 필수입니다.',
        reason: '버그 리포트 접수에 필요한 값이 누락되었습니다.',
        action: '제목과 설명을 입력한 뒤 다시 시도하세요.',
      });
    }
    if (!ALLOWED_SEVERITY.includes(severity)) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '유효하지 않은 심각도입니다.',
        reason: 'severity는 low, normal, high, critical 중 하나여야 합니다.',
        action: '심각도 값을 다시 선택하세요.',
      });
    }

    const users = await sql`
      SELECT id, username, email
      FROM users
      WHERE id = ${decoded.sub} AND is_active = true
      LIMIT 1
    `;
    if (!users.length) {
      return respondError(req, res, 401, {
        code: 'AUTH_REQUIRED',
        message: '유효한 로그인 사용자만 제보할 수 있습니다.',
        reason: '현재 세션의 사용자 계정을 찾을 수 없거나 비활성 상태입니다.',
        action: '다시 로그인한 뒤 시도하세요.',
      });
    }

    const reporter = users[0];
    const inserted = await sql`
      INSERT INTO bug_reports (
        title, description, reporter_name, reporter_email,
        reporter_user_id, page_url, severity
      )
      VALUES (
        ${title}, ${description}, ${reporter.username}, ${reporter.email},
        ${reporter.id}, ${pageUrl}, ${severity}
      )
      RETURNING id, title, description, reporter_name, reporter_email, reporter_user_id,
                page_url, severity, status, admin_note, created_at, updated_at
    `;
    const report = inserted[0];

    try {
      await sql`
        INSERT INTO notifications (type, reference_id, title, body, target_role)
        VALUES (
          'bug_report',
          ${String(report.id)},
          '새 버그 리포트',
          ${reporter.username + ' 님이 버그를 제보했습니다: ' + title},
          'admin'
        )
      `;
    } catch (notifError) {
      console.error('bug_report 알림 INSERT 오류 (무시):', notifError);
    }

    await insertAuditLog({
      userId: reporter.id,
      username: reporter.username,
      action: 'bug_report_created',
      target: String(report.id),
      ipAddress: ip,
      result: 'success',
      metadata: { severity, pageUrl },
    });

    return res.status(201).json({ report });
  }

  if (req.method === 'GET' && rawPath === '/api/bug-reports') {
    const decoded = requireAdmin(req, res);
    if (!decoded) return;

    const qs = new URL(req.url, 'http://localhost').searchParams;
    const status = qs.get('status') || null;
    const severity = qs.get('severity') || null;

    if (status && !ALLOWED_STATUS.includes(status)) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '유효하지 않은 상태 필터입니다.',
        reason: 'status는 open, in-progress, resolved, closed 중 하나여야 합니다.',
        action: '필터 값을 다시 선택하세요.',
      });
    }
    if (severity && !ALLOWED_SEVERITY.includes(severity)) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '유효하지 않은 심각도 필터입니다.',
        reason: 'severity는 low, normal, high, critical 중 하나여야 합니다.',
        action: '필터 값을 다시 선택하세요.',
      });
    }

    const reports = await sql`
      SELECT id, title, reporter_name, reporter_email, reporter_user_id, page_url,
             severity, status, admin_note, created_at, updated_at
      FROM bug_reports
      WHERE (${status}::text IS NULL OR status = ${status})
        AND (${severity}::text IS NULL OR severity = ${severity})
      ORDER BY created_at DESC, id DESC
    `;
    return res.status(200).json({ reports });
  }

  const reportMatch = rawPath.match(/^\/api\/bug-reports\/(\d+)$/);
  const reportUpdateMatch = rawPath.match(/^\/api\/bug-reports\/(\d+)\/update$/);

  if (req.method === 'GET' && reportMatch) {
    const decoded = requireAdmin(req, res);
    if (!decoded) return;

    const id = parseInt(reportMatch[1], 10);
    const rows = await sql`
      SELECT br.id, br.title, br.description, br.reporter_name, br.reporter_email,
             br.reporter_user_id, br.page_url, br.severity, br.status, br.admin_note,
             br.created_at, br.updated_at, u.username AS reporter_username
      FROM bug_reports br
      LEFT JOIN users u ON u.id = br.reporter_user_id
      WHERE br.id = ${id}
      LIMIT 1
    `;
    if (!rows.length) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '버그 리포트를 찾을 수 없습니다.',
        reason: '대상 제보가 없거나 이미 삭제되었습니다.',
        action: '목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }
    return res.status(200).json({ report: rows[0] });
  }

  if ((req.method === 'PATCH' && reportMatch) || (req.method === 'POST' && reportUpdateMatch)) {
    const decoded = requireAdmin(req, res);
    if (!decoded) return;

    const id = parseInt((reportMatch || reportUpdateMatch)[1], 10);
    const body = req.body || {};
    const hasStatus = body.status !== undefined;
    const hasAdminNote = body.admin_note !== undefined;

    if (!hasStatus && !hasAdminNote) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '변경할 항목이 없습니다.',
        reason: 'status 또는 admin_note 중 하나 이상이 필요합니다.',
        action: '수정할 값을 입력한 뒤 다시 시도하세요.',
      });
    }

    const status = hasStatus ? String(body.status || '').trim() : null;
    const adminNote = hasAdminNote ? (String(body.admin_note || '').trim() || null) : null;

    if (hasStatus && !ALLOWED_STATUS.includes(status)) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '유효하지 않은 상태입니다.',
        reason: 'status는 open, in-progress, resolved, closed 중 하나여야 합니다.',
        action: '상태 값을 다시 선택하세요.',
      });
    }

    const rows = await sql`
      UPDATE bug_reports
      SET
        status = CASE WHEN ${hasStatus} THEN ${status} ELSE status END,
        admin_note = CASE WHEN ${hasAdminNote} THEN ${adminNote} ELSE admin_note END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, title, description, reporter_name, reporter_email, reporter_user_id,
                page_url, severity, status, admin_note, created_at, updated_at
    `;

    if (!rows.length) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '버그 리포트를 찾을 수 없습니다.',
        reason: '수정 대상 제보가 없거나 이미 삭제되었습니다.',
        action: '목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }

    await insertAuditLog({
      userId: decoded.sub,
      action: 'bug_report_updated',
      target: String(id),
      ipAddress: ip,
      result: 'success',
      metadata: { hasStatus, hasAdminNote, status },
    });

    return res.status(200).json({ report: rows[0] });
  }

  if (req.method === 'DELETE' && reportMatch) {
    const decoded = requireAdmin(req, res);
    if (!decoded) return;

    const id = parseInt(reportMatch[1], 10);
    const rows = await sql`
      DELETE FROM bug_reports
      WHERE id = ${id}
      RETURNING id, title
    `;
    if (!rows.length) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '버그 리포트를 찾을 수 없습니다.',
        reason: '삭제 대상 제보가 없거나 이미 삭제되었습니다.',
        action: '목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }

    await insertAuditLog({
      userId: decoded.sub,
      action: 'bug_report_deleted',
      target: String(id),
      ipAddress: ip,
      result: 'success',
      metadata: { title: rows[0].title },
    });

    return res.status(200).json({ ok: true });
  }

  if (rawPath === '/api/bug-reports' || reportMatch || reportUpdateMatch) {
    return methodNotAllowed(req, res, ['GET', 'POST', 'PATCH', 'DELETE']);
  }

  return respondError(req, res, 404, {
    code: 'RESOURCE_NOT_FOUND',
    message: '요청한 버그 리포트 경로를 찾을 수 없습니다.',
    reason: '등록되지 않은 버그 리포트 API 경로입니다.',
    action: '호출 경로를 다시 확인하세요.',
  });
};
