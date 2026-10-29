/**
 * controllers/signup.js
 * 회원가입 요청 생성
 * POST /api/signup
 */

const crypto = require('crypto');
const { promisify } = require('util');
const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const pusher = require('./_shared/pusher');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');
const { INPUT_LIMITS, requireMaxLengths, respondCountLimit } = require('./_shared/input-limits');

// 단순 이메일 형식 (공백 없음, @ 하나, 도메인에 점) — 실제 수신 가능 여부는 확인하지 않는다
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

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

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST']);
  }

  res.setHeader('Content-Type', 'application/json');
  const body = req.body || {};
  // 배열·객체 등 문자열이 아닌 값은 빈 값으로 취급 (.trim() TypeError → 500 방지)
  const str = (v) => (typeof v === 'string' ? v : '');
  const username = str(body.username).trim();
  const email = str(body.email).trim().toLowerCase();
  const password = str(body.password);
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  if (!username || !email || !password) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: 'username, email, password는 필수입니다.',
      reason: '회원가입 요청 생성에 필요한 값이 누락되었습니다.',
      action: '입력값을 모두 채운 뒤 다시 시도하세요.',
    });
  }
  if (password.length < INPUT_LIMITS.passwordMin) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: `비밀번호는 ${INPUT_LIMITS.passwordMin}자 이상이어야 합니다.`,
      reason: '보안 정책상 최소 길이를 만족해야 합니다.',
      action: `${INPUT_LIMITS.passwordMin}자 이상 비밀번호를 입력하세요.`,
    });
  }
  // 길이 한도 (P0b-04) — DB 컬럼 길이 초과로 500이 나기 전에 400
  if (!requireMaxLengths(req, res, [
    { value: username, max: INPUT_LIMITS.username, label: '아이디' },
    { value: email, max: INPUT_LIMITS.email, label: '이메일' },
    { value: password, max: INPUT_LIMITS.passwordMax, label: '비밀번호' },
  ])) return undefined;
  if (/[\s\u0000-\u001f\u007f]/.test(username)) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: '아이디에 공백이나 제어 문자를 쓸 수 없습니다.',
      reason: '아이디는 공백 없는 문자열이어야 합니다.',
      action: '공백을 빼고 다시 입력하세요.',
    });
  }
  if (!EMAIL_RE.test(email)) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: '이메일 형식이 올바르지 않습니다.',
      reason: '이메일은 name@example.com 형식이어야 합니다.',
      action: '이메일 주소를 다시 확인하세요.',
    });
  }

  const sql = getDb();

  // 0. 건수 제한 (P0b-04) — 미인증 엔드포인트라 IP당 시간당 요청 수와 전체 대기 건수를 제한한다.
  //    IP는 audit_logs(signup_requested) 기준. IP를 알 수 없으면 IP 제한은 건너뛰고 전체 상한만 적용.
  const [recentFromIp, pendingTotal] = await Promise.all([
    ip
      ? sql`
          SELECT COUNT(*)::int AS count FROM audit_logs
          WHERE action = 'signup_requested' AND ip_address = ${ip}
            AND created_at > now() - interval '1 hour'
        `
      : Promise.resolve([{ count: 0 }]),
    sql`SELECT COUNT(*)::int AS count FROM signup_requests WHERE status = 'pending'`,
  ]);
  if ((Number(recentFromIp[0]?.count) || 0) >= INPUT_LIMITS.signupPerIpPerHour) {
    return respondCountLimit(req, res, {
      message: '가입 요청이 너무 많습니다.',
      reason: `같은 네트워크에서 1시간에 ${INPUT_LIMITS.signupPerIpPerHour}건까지 가입을 요청할 수 있습니다.`,
      action: '1시간 뒤 다시 시도하거나 관리자에게 문의하세요.',
      logMessage: `Signup rate limit by IP: ${ip}`,
    });
  }
  if ((Number(pendingTotal[0]?.count) || 0) >= INPUT_LIMITS.signupPendingMax) {
    return respondCountLimit(req, res, {
      message: '지금은 가입 요청을 받을 수 없습니다.',
      reason: '승인 대기 중인 가입 요청이 너무 많습니다.',
      action: '관리자가 대기 요청을 처리한 뒤 다시 시도하세요.',
      logMessage: 'Signup pending limit reached',
    });
  }

  // 1. username 중복 확인 (users + pending signup_requests)
  const [usersWithName, pendingWithName] = await Promise.all([
    sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`,
    sql`SELECT id FROM signup_requests WHERE username = ${username} AND status = 'pending' LIMIT 1`,
  ]);
  if ((usersWithName && usersWithName.length > 0) || (pendingWithName && pendingWithName.length > 0)) {
    return respondError(req, res, 409, {
      code: 'VALIDATION_FAILED',
      message: '이미 사용 중인 username입니다.',
      reason: '같은 username을 사용하는 계정 또는 대기 중인 요청이 있습니다.',
      action: '다른 username을 입력하세요.',
    });
  }

  // 2. email 중복 확인 (users + pending signup_requests)
  const [usersWithEmail, pendingWithEmail] = await Promise.all([
    sql`SELECT id FROM users WHERE email = ${email} LIMIT 1`,
    sql`SELECT id FROM signup_requests WHERE email = ${email} AND status = 'pending' LIMIT 1`,
  ]);
  if ((usersWithEmail && usersWithEmail.length > 0) || (pendingWithEmail && pendingWithEmail.length > 0)) {
    return respondError(req, res, 409, {
      code: 'VALIDATION_FAILED',
      message: '이미 사용 중인 email입니다.',
      reason: '같은 email을 사용하는 계정 또는 대기 중인 요청이 있습니다.',
      action: '다른 email을 입력하세요.',
    });
  }

  // 3. 비밀번호 해싱
  const passwordHash = await hashPassword(password);

  // 4. signup_requests INSERT (role은 서버에서 고정, 요청 바디 role 무시)
  let rows;
  try {
    rows = await sql`
      INSERT INTO signup_requests (username, email, password_hash)
      VALUES (${username}, ${email}, ${passwordHash})
      RETURNING id
    `;
  } catch (err) {
    console.error('signup_requests INSERT 오류:', err);
    return respondError(req, res, 500, {
      code: 'DATABASE_ERROR',
      message: '회원가입 요청을 저장하지 못했습니다.',
      reason: '가입 요청 저장 중 서버 오류가 발생했습니다.',
      action: '잠시 후 다시 시도하세요.',
      error: err,
      logMessage: 'Signup request insert failed',
    });
  }

  const requestId = rows[0].id;

  // 5. 알림 INSERT (실패해도 회원가입 요청 자체는 성공 처리)
  try {
    const notificationRows = await sql`
      INSERT INTO notifications (type, reference_id, title, body, target_role)
      VALUES (
        'signup_request',
        ${String(requestId)},
        '새 회원가입 요청',
        ${username + ' 님이 가입을 요청했습니다.'},
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
  } catch (notifErr) {
    console.error('알림 INSERT 오류 (무시):', notifErr);
  }

  // 6. 감사 로그
  await insertAuditLog({
    username,
    action: 'signup_requested',
    ipAddress: ip,
    result: 'success',
    metadata: { requestId },
  });

  return res.status(200).json({ requestId });
};
