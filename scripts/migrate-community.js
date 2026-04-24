/**
 * scripts/migrate-community.js
 * developer_notes / bug_reports 테이블 생성 마이그레이션
 *
 * 실행 방법:
 *   POSTGRES_URL="..." node scripts/migrate-community.js
 */

const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.POSTGRES_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS developer_notes (
      id SERIAL PRIMARY KEY,
      title VARCHAR(256) NOT NULL,
      content TEXT NOT NULL,
      version VARCHAR(64),
      author_id UUID REFERENCES users(id) ON DELETE SET NULL,
      pinned BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✓ developer_notes 테이블 생성 완료');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_developer_notes_created_at
      ON developer_notes (created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_developer_notes_pinned
      ON developer_notes (pinned)
  `;
  console.log('✓ developer_notes 인덱스 생성 완료');

  await sql`
    CREATE TABLE IF NOT EXISTS bug_reports (
      id SERIAL PRIMARY KEY,
      title VARCHAR(256) NOT NULL,
      description TEXT NOT NULL,
      reporter_name VARCHAR(128),
      reporter_email VARCHAR(256),
      reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
      page_url VARCHAR(512),
      severity VARCHAR(32) DEFAULT 'normal'
        CHECK (severity IN ('low', 'normal', 'high', 'critical')),
      status VARCHAR(32) DEFAULT 'open'
        CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
      admin_note TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✓ bug_reports 테이블 생성 완료');

  await sql`
    CREATE INDEX IF NOT EXISTS idx_bug_reports_status
      ON bug_reports (status)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bug_reports_created_at
      ON bug_reports (created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_bug_reports_severity
      ON bug_reports (severity)
  `;
  console.log('✓ bug_reports 인덱스 생성 완료');

  console.log('\n커뮤니티 마이그레이션 완료.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('커뮤니티 마이그레이션 실패:', err);
    process.exit(1);
  });
