/**
 * controllers/notifications.js
 * 알림 API (admin 전용)
 *
 * GET   /api/notifications          미읽음 count + 최신 30건 목록
 * PATCH /api/notifications/read     전체 읽음 처리
 * PATCH /api/notifications/:id/read 단건 읽음 처리
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

// admin 전용 인증 헬퍼
function requireAdmin(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  if (!authToken) {
    respondError(req, res, 401, { code: 'AUTH_REQUIRED', logMessage: 'Notifications API requires authentication' });
    return null;
  }
  let decoded;
  try {
    decoded = jwt.verify(authToken, process.env.JWT_SECRET);
  } catch (error) {
    respondError(req, res, 401, {
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      error,
      logMessage: 'Notifications token verification failed',
    });
    return null;
  }
  if (decoded.role !== 'admin') {
    respondError(req, res, 403, {
      code: 'FORBIDDEN',
      message: '관리자 권한이 필요합니다.',
      reason: '현재 계정은 알림 API를 사용할 수 없습니다.',
      action: '관리자 계정으로 로그인하세요.',
      logMessage: 'Admin role required for notifications API',
    });
    return null;
  }
  return decoded;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const decoded = requireAdmin(req, res);
  if (!decoded) return;

  const rawPath = req.url.split('?')[0];
  const sql = getDb();

  // GET /api/notifications
  if (req.method === 'GET' && rawPath === '/api/notifications') {
    const [[countRow], notifications] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS unread_count
        FROM notifications
        WHERE target_role = 'admin' AND is_read = FALSE
      `,
      sql`
        SELECT id, type, reference_id, title, body, is_read, created_at, read_at
        FROM notifications
        WHERE target_role = 'admin'
        ORDER BY created_at DESC
        LIMIT 30
      `,
    ]);
    return res.status(200).json({
      unread_count: countRow.unread_count,
      notifications,
    });
  }

  // PATCH /api/notifications/read (전체 읽음) — /:id/read 보다 먼저 매칭
  if (req.method === 'PATCH' && rawPath === '/api/notifications/read') {
    await sql`
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE target_role = 'admin' AND is_read = FALSE
    `;
    return res.status(200).json({ ok: true });
  }

  // PATCH /api/notifications/:id/read (단건 읽음)
  const singleReadMatch = rawPath.match(/^\/api\/notifications\/(\d+)\/read$/);
  if (req.method === 'PATCH' && singleReadMatch) {
    const id = parseInt(singleReadMatch[1], 10);
    const existing = await sql`
      SELECT id FROM notifications WHERE id = ${id} AND target_role = 'admin'
    `;
    if (!existing || existing.length === 0) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '요청한 알림을 찾을 수 없습니다.',
        reason: '대상 알림이 없거나 이미 삭제되었을 수 있습니다.',
        action: '입력값을 다시 확인한 뒤 다시 시도하세요.',
        logMessage: `Notification not found: id=${id}`,
      });
    }
    await sql`
      UPDATE notifications
      SET is_read = TRUE, read_at = NOW()
      WHERE id = ${id} AND target_role = 'admin'
    `;
    return res.status(200).json({ ok: true });
  }

  // DELETE /api/notifications/:id (단건 삭제)
  const singleDeleteMatch = rawPath.match(/^\/api\/notifications\/(\d+)$/);
  if (req.method === 'DELETE' && singleDeleteMatch) {
    const id = parseInt(singleDeleteMatch[1], 10);
    const existing = await sql`
      SELECT id FROM notifications WHERE id = ${id} AND target_role = 'admin'
    `;
    if (!existing || existing.length === 0) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '요청한 알림을 찾을 수 없습니다.',
        reason: '대상 알림이 없거나 이미 삭제되었을 수 있습니다.',
        action: '입력값을 다시 확인한 뒤 다시 시도하세요.',
        logMessage: `Notification not found for delete: id=${id}`,
      });
    }
    await sql`
      DELETE FROM notifications WHERE id = ${id} AND target_role = 'admin'
    `;
    return res.status(200).json({ ok: true });
  }

  // DELETE /api/notifications (전체 삭제)
  if (req.method === 'DELETE' && rawPath === '/api/notifications') {
    await sql`
      DELETE FROM notifications WHERE target_role = 'admin'
    `;
    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(req, res, ['GET', 'PATCH', 'DELETE']);
};
