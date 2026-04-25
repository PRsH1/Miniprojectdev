/**
 * scripts/migrate-bug-reports-v2.js
 * 버그 리포트 답변 필드와 사용자 대상 알림 컬럼 추가 마이그레이션
 *
 * 실행 방법:
 *   node scripts/migrate-bug-reports-v2.js
 */

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}

async function migrate() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL 환경변수가 설정되지 않았습니다.');
  }

  const sql = neon(process.env.POSTGRES_URL);

  await sql`ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS cause TEXT`;
  console.log('✓ bug_reports.cause 컬럼 확인 완료');

  await sql`ALTER TABLE bug_reports ADD COLUMN IF NOT EXISTS action_taken TEXT`;
  console.log('✓ bug_reports.action_taken 컬럼 확인 완료');

  await sql`
    ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES users(id)
  `;
  console.log('✓ notifications.target_user_id 컬럼 확인 완료');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_notifications_target_user_unread
      ON notifications (target_user_id, is_read, created_at DESC)
  `;
  console.log('✓ idx_notifications_target_user_unread 인덱스 확인 완료');

  console.log('\n버그 리포트 v2 마이그레이션 완료.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('버그 리포트 v2 마이그레이션 실패:', err);
    process.exit(1);
  });
