/**
 * controllers/password-reset-request.js
 * 비밀번호 재설정 요청 생성 (사용자 → 관리자 알림)
 * POST /api/password-reset-request
 *
 * P1-14: 새 대기 요청을 만들었을 때만 admin 알림(`password_reset_request`)을 INSERT하고
 * Pusher `private-notifications-admin`으로 `new-notification`을 보낸다(이동 경로 /app/admin?tab=users).
 * 알림 실패는 무시한다 — 요청 자체는 성공. 응답은 계정 존재·중복 여부와 무관하게 항상 같다(열거 방지).
 *
 * D-6: 응답 시간도 계정 존재 여부와 무관하게 맞춘다. 있는 계정은 INSERT·감사 로그·알림·Pusher까지 기다리고
 * 없는 계정은 SELECT 1건으로 끝나 시간 차로 존재가 드러났다. 모든 200 응답을 요청 시작부터
 * 최소 MIN_RESPONSE_MS가 지난 뒤 보낸다(응답 전에 await하는 지연 — Vercel 서버리스는 응답 후 남은
 * Promise가 끊길 수 있으므로 알림을 응답 뒤로 미루는 fire-and-forget은 쓰지 않는다).
 * 처리 시간이 이 값을 넘는 드문 경우(Pusher 지연 등)에는 차이가 남는다 — signup 409가 이미 존재를 알려 주므로 수용.
 */

const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const pusher = require('./_shared/pusher');
const { methodNotAllowed } = require('./_shared/respond-error');
const { INPUT_LIMITS, requireMaxLengths } = require('./_shared/input-limits');

async function triggerNewNotification(channel, notification, unreadCount) {
  try {
    await pusher.trigger(channel, 'new-notification', {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      body: notification.body,
      created_at: notification.created_at,
      unread_count: unreadCount,
    });
  } catch (error) {
    console.error('알림 Pusher trigger 오류 (무시):', error);
  }
}

/** admin 알림 INSERT + 실시간 전달 (rules/notifications.md 패턴). 실패해도 예외를 밖으로 던지지 않는다 */
async function notifyAdmins(sql, requestId, username) {
  try {
    const notificationRows = await sql`
      INSERT INTO notifications (type, reference_id, title, body, target_role)
      VALUES (
        'password_reset_request',
        ${String(requestId)},
        '비밀번호 재설정 요청',
        ${username + ' 님이 비밀번호 재설정을 요청했습니다.'},
        'admin'
      )
      RETURNING id, type, title, body, created_at
    `;
    const [{ count }] = await sql`
      SELECT COUNT(*)::int AS count
      FROM notifications
      WHERE target_role = 'admin' AND target_user_id IS NULL AND is_read = FALSE
    `;
    await triggerNewNotification('private-notifications-admin', notificationRows[0], count);
  } catch (error) {
    console.error('password_reset_request 알림 INSERT 오류 (무시):', error);
  }
}

const OK_BODY = { ok: true, message: '관리자에게 요청이 전달되었습니다.' };

/** 요청 시작 후 최소 시간을 채운 뒤 같은 200 응답을 보낸다 (D-6) */
async function respondOk(res, startedAt) {
  const wait = handler.MIN_RESPONSE_MS - (Date.now() - startedAt);
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  return res.status(200).json(OK_BODY);
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST']);
  }
  const startedAt = Date.now();

  const body = req.body || {};
  const username = (typeof body.username === 'string' ? body.username : '').trim();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  if (!username) {
    return respondOk(res, startedAt);
  }

  // 길이 한도 (P0b-04) — 아이디 길이만 보므로 계정 존재 여부는 드러나지 않는다
  if (!requireMaxLengths(req, res, [
    { value: username, max: INPUT_LIMITS.username, label: '아이디' },
  ])) return undefined;

  try {
    const sql = getDb();
    const users = await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`;

    if (users && users.length > 0) {
      const user = users[0];
      // 건수 제한 (P0b-04): 같은 계정에 처리 대기(pending) 요청이 이미 있으면 새로 만들지 않는다.
      // 임의 아이디로 요청을 반복해도 계정당 대기 요청은 1건뿐이다. 응답은 동일(열거 방지).
      const inserted = await sql`
        INSERT INTO password_reset_requests (user_id, username)
        SELECT ${user.id}, ${username}
        WHERE NOT EXISTS (
          SELECT 1 FROM password_reset_requests
          WHERE user_id = ${user.id} AND status = 'pending'
        )
        RETURNING id
      `;
      if (!inserted || inserted.length === 0) {
        return respondOk(res, startedAt);
      }
      await insertAuditLog({
        userId: user.id,
        username,
        action: 'password_reset_request_created',
        ipAddress: ip,
        result: 'success',
      });
      await notifyAdmins(sql, inserted[0].id, username);
    }
    // 사용자가 없어도 동일한 성공 응답 반환 (열거 방지)
  } catch (err) {
    console.error('비밀번호 재설정 요청 오류:', err);
  }

  return respondOk(res, startedAt);
}

// 모든 200 응답의 최소 소요 시간(ms). 테스트에서 줄일 수 있도록 함수 속성으로 둔다
handler.MIN_RESPONSE_MS = 500;

module.exports = handler;
