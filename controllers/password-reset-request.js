/**
 * controllers/password-reset-request.js
 * 비밀번호 재설정 요청 생성 (사용자 → 관리자 알림)
 * POST /api/password-reset-request
 */

const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).send('Method Not Allowed');
  }

  const body = req.body || {};
  const username = (body.username || '').trim();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  if (!username) {
    return res.status(200).json({ ok: true, message: '관리자에게 요청이 전달되었습니다.' });
  }

  try {
    const sql = getDb();
    const users = await sql`SELECT id FROM users WHERE username = ${username} LIMIT 1`;

    if (users && users.length > 0) {
      const user = users[0];
      await sql`
        INSERT INTO password_reset_requests (user_id, username)
        VALUES (${user.id}, ${username})
      `;
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
