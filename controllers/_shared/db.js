/**
 * controllers/_shared/db.js
 * Neon PostgreSQL 커넥션 (싱글턴)
 */

const { neon } = require('@neondatabase/serverless');

let _sql = null;

function getDb() {
  if (!_sql) {
    if (!process.env.POSTGRES_URL) {
      throw new Error('POSTGRES_URL 환경변수가 설정되지 않았습니다.');
    }
    _sql = neon(process.env.POSTGRES_URL);
  }
  return _sql;
}

module.exports = { getDb };
