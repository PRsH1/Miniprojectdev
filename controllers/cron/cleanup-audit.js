/**
 * controllers/cron/cleanup-audit.js
 * audit_logs 테이블에서 7일 초과 레코드 자동 삭제
 *
 * Vercel Cron이 매일 UTC 00:00에 GET 요청으로 호출
 * Authorization: Bearer <CRON_SECRET> 헤더 검증
 */

const { getDb } = require('../_shared/db');

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // GET 메서드만 허용 (Vercel Cron은 GET으로 호출)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // CRON_SECRET 환경변수 미설정 시 모든 요청 차단
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // Authorization 헤더 검증
  const authHeader = req.headers['authorization'] || '';
  if (authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  // 7일 초과 audit_logs 삭제
  const sql = getDb();
  const result = await sql`
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '7 days'
  `;

  const deleted = result.count ?? 0;
  console.log(`[cron] cleanup-audit: ${deleted}건 삭제`);

  return res.status(200).json({ success: true, deleted });
};
