/**
 * controllers/signupStatus.js
 * 회원가입 요청 상태 조회 (공개, 인증 불필요)
 * GET /api/signup-status?id=UUID
 */

const { getDb } = require('./_shared/db');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  res.setHeader('Content-Type', 'application/json');
  const id = new URL(req.url, 'http://localhost').searchParams.get('id');

  if (!id) {
    return res.status(400).json({ error: '유효하지 않은 요청입니다.' });
  }

  // UUID 형식 간단 검증
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return res.status(400).json({ error: '유효하지 않은 요청입니다.' });
  }

  try {
    const sql = getDb();
    // 민감정보(email, password_hash, approved_role) 제외하고 반환
    const rows = await sql`
      SELECT status, created_at, reject_reason
      FROM signup_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: '유효하지 않은 요청입니다.' });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('signupStatus 조회 오류:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
};
