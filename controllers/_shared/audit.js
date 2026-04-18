/**
 * controllers/_shared/audit.js
 * 감사 로그 삽입 헬퍼
 */

const { getDb } = require('./db');

/**
 * @param {{ userId?, username?, action, target?, ipAddress?, result?, metadata? }} params
 */
async function insertAuditLog({ userId, username, action, target, ipAddress, result, metadata } = {}) {
  try {
    const sql = getDb();
    const meta = metadata ? JSON.stringify(metadata) : null;
    await sql`
      INSERT INTO audit_logs (user_id, username, action, target, ip_address, result, metadata)
      VALUES (
        ${userId || null},
        ${username || null},
        ${action},
        ${target || null},
        ${ipAddress || null},
        ${result || null},
        ${meta}::jsonb
      )
    `;
  } catch (err) {
    // 감사 로그 실패는 주요 흐름을 막지 않음
    console.error('감사 로그 삽입 오류:', err);
  }
}

module.exports = { insertAuditLog };
