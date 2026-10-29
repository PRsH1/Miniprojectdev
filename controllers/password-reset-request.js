/**
 * controllers/password-reset-request.js
 * 비밀번호 재설정 요청 생성 (사용자 → 관리자 알림)
 * POST /api/password-reset-request
 */

const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const { methodNotAllowed } = require('./_shared/respond-error');
const { INPUT_LIMITS, requireMaxLengths } = require('./_shared/input-limits');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST']);
  }

  const body = req.body || {};
  const username = (typeof body.username === 'string' ? body.username : '').trim();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  if (!username) {
    return res.status(200).json({ ok: true, message: '관리자에게 요청이 전달되었습니다.' });
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
        return res.status(200).json({ ok: true, message: '관리자에게 요청이 전달되었습니다.' });
      }
      await insertAuditLog({
        userId: user.id,
        username,
        action: 'password_reset_request_created',
        ipAddress: ip,
        result: 'success',
      });
    }
    // 사용자가 없어도 동일한 성공 응답 반환 (열거 방지)
  } catch (err) {
    console.error('비밀번호 재설정 요청 오류:', err);
  }

  return res.status(200).json({ ok: true, message: '관리자에게 요청이 전달되었습니다.' });
};
