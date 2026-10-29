/**
 * controllers/cron/cleanup-audit.js
 * audit_logs 테이블에서 7일 초과 레코드 자동 삭제
 *
 * Vercel Cron이 매일 UTC 00:00에 GET 요청으로 호출
 * Authorization: Bearer <CRON_SECRET> 헤더 검증
 */

const crypto = require('crypto');
const { getDb } = require('../_shared/db');
const { respondError } = require('../_shared/respond-error');

/**
 * 고정 시간 문자열 비교 (P0b-09)
 * 길이가 다르면 바로 false — timingSafeEqual은 길이가 다르면 예외를 던지므로 먼저 거른다.
 * 길이 자체는 노출되지만 비밀값 길이는 공격자가 알아도 의미가 없다.
 */
function safeEqual(a, b) {
  const left = Buffer.from(String(a), 'utf8');
  const right = Buffer.from(String(b), 'utf8');
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  // GET 메서드만 허용 (Vercel Cron은 GET으로 호출)
  if (req.method !== 'GET') {
    return respondError(req, res, 405, {
      code: 'METHOD_NOT_ALLOWED',
      logMessage: `cleanup-audit: method ${req.method}`,
    });
  }

  // CRON_SECRET 환경변수 미설정 시 모든 요청 차단
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: 'cleanup-audit: CRON_SECRET not configured',
    });
  }

  // Authorization 헤더 검증 (고정 시간 비교)
  const authHeader = String(req.headers['authorization'] || '');
  if (!safeEqual(authHeader, `Bearer ${cronSecret}`)) {
    return respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: 'cleanup-audit: invalid cron secret',
    });
  }

  // 7일 초과 audit_logs 삭제
  // Neon http 드라이버의 sql 태그는 행 배열만 반환한다(`.count` 없음).
  // 삭제 건수를 얻기 위해 CTE에서 RETURNING 한 행을 집계해 한 행으로 받는다.
  const sql = getDb();
  const rows = await sql`
    WITH removed AS (
      DELETE FROM audit_logs
      WHERE created_at < NOW() - INTERVAL '7 days'
      RETURNING 1
    )
    SELECT COUNT(*)::int AS deleted FROM removed
  `;

  const deleted = Number(rows?.[0]?.deleted) || 0;
  console.log(`[cron] cleanup-audit: ${deleted}건 삭제`);

  return res.status(200).json({ success: true, deleted });
};

module.exports.safeEqual = safeEqual;
