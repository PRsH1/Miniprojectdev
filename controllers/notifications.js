/**
 * controllers/notifications.js
 * 알림 API (로그인 사용자)
 *
 * GET   /api/notifications          미읽음 count + 최신 30건 목록
 * PATCH /api/notifications/read     전체 읽음 처리
 * PATCH /api/notifications/:id/read 단건 읽음 처리
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

function requireAuth(req, res) {
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
  return decoded;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const decoded = requireAuth(req, res);
  if (!decoded) return;

  const rawPath = req.url.split('?')[0];
  const sql = getDb();
  const isAdmin = decoded.role === 'admin';

  // GET /api/notifications
  if (req.method === 'GET' && rawPath === '/api/notifications') {
    if (!isAdmin) {
      const [[countRow], notifications] = await Promise.all([
        sql`
          SELECT COUNT(*)::int AS unread_count
          FROM notifications
          WHERE target_user_id = ${decoded.sub} AND is_read = FALSE
        `,
        sql`
          SELECT id, type, reference_id, title, body, is_read, created_at, read_at
          FROM notifications
          WHERE target_user_id = ${decoded.sub}
          ORDER BY created_at DESC
          LIMIT 30
        `,
      ]);
      return res.status(200).json({
        unread_count: countRow.unread_count,
        notifications,
      });
    }

    const [[countRow], notifications] = await Promise.all([
      sql`
        SELECT COUNT(*)::int AS unread_count
        FROM notifications
        WHERE target_role = 'admin' AND target_user_id IS NULL AND is_read = FALSE
      `,
      sql`
        SELECT id, type, reference_id, title, body, is_read, created_at, read_at
        FROM notifications
        WHERE target_role = 'admin' AND target_user_id IS NULL
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
    if (isAdmin) {
      await sql`
        UPDATE notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE target_role = 'admin' AND target_user_id IS NULL AND is_read = FALSE
      `;
    } else {
      await sql`
        UPDATE notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE target_user_id = ${decoded.sub} AND is_read = FALSE
      `;
    }
    return res.status(200).json({ ok: true });
  }

  // PATCH /api/notifications/:id/read (단건 읽음)
  const singleReadMatch = rawPath.match(/^\/api\/notifications\/(\d+)\/read$/);
  if (req.method === 'PATCH' && singleReadMatch) {
    const id = parseInt(singleReadMatch[1], 10);
    const existing = isAdmin
      ? await sql`SELECT id FROM notifications WHERE id = ${id} AND target_role = 'admin' AND target_user_id IS NULL`
      : await sql`SELECT id FROM notifications WHERE id = ${id} AND target_user_id = ${decoded.sub}`;
    if (!existing || existing.length === 0) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '요청한 알림을 찾을 수 없습니다.',
        reason: '대상 알림이 없거나 이미 삭제되었을 수 있습니다.',
        action: '입력값을 다시 확인한 뒤 다시 시도하세요.',
        logMessage: `Notification not found: id=${id}`,
      });
    }
    if (isAdmin) {
      await sql`
        UPDATE notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE id = ${id} AND target_role = 'admin' AND target_user_id IS NULL
      `;
    } else {
      await sql`
        UPDATE notifications
        SET is_read = TRUE, read_at = NOW()
        WHERE id = ${id} AND target_user_id = ${decoded.sub}
      `;
    }
    return res.status(200).json({ ok: true });
  }

  // DELETE /api/notifications/:id (단건 삭제)
  const singleDeleteMatch = rawPath.match(/^\/api\/notifications\/(\d+)$/);
  if (req.method === 'DELETE' && singleDeleteMatch) {
    const id = parseInt(singleDeleteMatch[1], 10);
    const existing = isAdmin
      ? await sql`SELECT id FROM notifications WHERE id = ${id} AND target_role = 'admin' AND target_user_id IS NULL`
      : await sql`SELECT id FROM notifications WHERE id = ${id} AND target_user_id = ${decoded.sub}`;
    if (!existing || existing.length === 0) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '요청한 알림을 찾을 수 없습니다.',
        reason: '대상 알림이 없거나 이미 삭제되었을 수 있습니다.',
        action: '입력값을 다시 확인한 뒤 다시 시도하세요.',
        logMessage: `Notification not found for delete: id=${id}`,
      });
    }
    if (isAdmin) {
      await sql`DELETE FROM notifications WHERE id = ${id} AND target_role = 'admin' AND target_user_id IS NULL`;
    } else {
      await sql`DELETE FROM notifications WHERE id = ${id} AND target_user_id = ${decoded.sub}`;
    }
    return res.status(200).json({ ok: true });
  }

  // DELETE /api/notifications (전체 삭제)
  if (req.method === 'DELETE' && rawPath === '/api/notifications') {
    if (isAdmin) {
      await sql`DELETE FROM notifications WHERE target_role = 'admin' AND target_user_id IS NULL`;
    } else {
      await sql`DELETE FROM notifications WHERE target_user_id = ${decoded.sub}`;
    }
    return res.status(200).json({ ok: true });
  }

  return methodNotAllowed(req, res, ['GET', 'PATCH', 'DELETE']);
};
