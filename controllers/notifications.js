/**
 * controllers/notifications.js
 * 알림 API (로그인 사용자)
 *
 * GET   /api/notifications          미읽음 count + 최신 30건 목록
 * PATCH /api/notifications/read     전체 읽음 처리
 * PATCH /api/notifications/:id/read 단건 읽음 처리
 */

const { getDb } = require('./_shared/db');
const pusher = require('./_shared/pusher');
const { resolveUser } = require('./_shared/session');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

async function requireAuth(req, res) {
  const decoded = await resolveUser(req, res);
  if (!decoded) {
    respondError(req, res, 401, { code: 'AUTH_REQUIRED', logMessage: 'Notifications API requires authentication' });
    return null;
  }
  return decoded;
}

function getNotificationChannel(decoded) {
  return decoded.role === 'admin'
    ? 'private-notifications-admin'
    : `private-notifications-${decoded.sub}`;
}

async function getUnreadCount(sql, decoded) {
  if (decoded.role === 'admin') {
    const [countRow] = await sql`
      SELECT COUNT(*)::int AS unread_count
      FROM notifications
      WHERE target_role = 'admin' AND target_user_id IS NULL AND is_read = FALSE
    `;
    return countRow.unread_count;
  }

  const [countRow] = await sql`
    SELECT COUNT(*)::int AS unread_count
    FROM notifications
    WHERE target_user_id = ${decoded.sub} AND is_read = FALSE
  `;
  return countRow.unread_count;
}

async function triggerNotificationEvent(decoded, eventName, payload) {
  try {
    await pusher.trigger(getNotificationChannel(decoded), eventName, payload);
  } catch (error) {
    console.error('알림 상태 Pusher trigger 오류 (무시):', error);
  }
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const decoded = await requireAuth(req, res);
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
    const unreadCount = await getUnreadCount(sql, decoded);
    await triggerNotificationEvent(decoded, 'notifications-read', { unread_count: unreadCount });
    return res.status(200).json({ ok: true, unread_count: unreadCount });
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
    const unreadCount = await getUnreadCount(sql, decoded);
    await triggerNotificationEvent(decoded, 'notification-read', { id, unread_count: unreadCount });
    return res.status(200).json({ ok: true, unread_count: unreadCount });
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
    const unreadCount = await getUnreadCount(sql, decoded);
    await triggerNotificationEvent(decoded, 'notification-deleted', { id, unread_count: unreadCount });
    return res.status(200).json({ ok: true, unread_count: unreadCount });
  }

  // DELETE /api/notifications (전체 삭제)
  if (req.method === 'DELETE' && rawPath === '/api/notifications') {
    if (isAdmin) {
      await sql`DELETE FROM notifications WHERE target_role = 'admin' AND target_user_id IS NULL`;
    } else {
      await sql`DELETE FROM notifications WHERE target_user_id = ${decoded.sub}`;
    }
    const unreadCount = await getUnreadCount(sql, decoded);
    await triggerNotificationEvent(decoded, 'notifications-cleared', { unread_count: unreadCount });
    return res.status(200).json({ ok: true, unread_count: unreadCount });
  }

  return methodNotAllowed(req, res, ['GET', 'PATCH', 'DELETE']);
};
