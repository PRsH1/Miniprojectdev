/**
 * scripts/migrate-notifications.js
 * notifications 테이블 생성 마이그레이션 (최초 1회)
 *
 * 새 DB에서는 target_user_id(사용자 전용 알림)까지 이 스크립트가 만든다(P1-24).
 * 이 컬럼이 없던 기존 DB는 scripts/migrate-bug-reports-v2.js의 ADD COLUMN IF NOT EXISTS가 채운다.
 * users 테이블을 참조하므로 scripts/migrate.js 다음에 실행한다.
 *
 * 실행 방법:
 *   POSTGRES_URL="..." node scripts/migrate-notifications.js
 *   (또는 vercel env pull .env.local 후 node scripts/migrate-notifications.js)
 */

const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.POSTGRES_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS notifications (
      id           SERIAL PRIMARY KEY,
      type         VARCHAR(64)   NOT NULL,
      target_role  VARCHAR(32)   NOT NULL DEFAULT 'admin',
      target_user_id UUID        REFERENCES users(id),
      reference_id VARCHAR(128),
      title        VARCHAR(256)  NOT NULL,
      body         TEXT,
      is_read      BOOLEAN       NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
      read_at      TIMESTAMPTZ
    )
  `;
  console.log('✓ notifications 테이블 생성 완료');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_notifications_target_unread
      ON notifications (target_role, is_read, created_at DESC)
  `;
  console.log('✓ idx_notifications_target_unread 인덱스 생성 완료');

  console.log('\n마이그레이션 완료.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('마이그레이션 실패:', err);
    process.exit(1);
  });
