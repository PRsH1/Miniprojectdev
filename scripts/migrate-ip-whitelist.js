/**
 * scripts/migrate-ip-whitelist.js
 * IP 화이트리스트 테이블 추가 마이그레이션
 * 실행: node scripts/migrate-ip-whitelist.js
 */
// 환경변수 로드: vercel env pull .env.local 후 아래처럼 실행
// PowerShell: $env:POSTGRES_URL="..." ; node scripts/migrate-ip-whitelist.js
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.POSTGRES_URL);

  await sql`
    CREATE TABLE IF NOT EXISTS ip_whitelist (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      label       VARCHAR(100) NOT NULL,
      ip_cidr     VARCHAR(50)  NOT NULL,
      scope_type  VARCHAR(20)  NOT NULL CHECK (scope_type IN ('global','path','protected')),
      scope_path  VARCHAR(200) DEFAULT NULL,
      is_active   BOOLEAN      DEFAULT TRUE,
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS ip_whitelist_scopes (
      id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      scope_type  VARCHAR(20)  NOT NULL CHECK (scope_type IN ('global','path','protected')),
      scope_path  VARCHAR(200) DEFAULT NULL,
      label       VARCHAR(100) NOT NULL,
      is_enabled  BOOLEAN      DEFAULT FALSE,
      created_at  TIMESTAMPTZ  DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  DEFAULT NOW()
    )
  `;

  await sql`CREATE INDEX IF NOT EXISTS idx_ip_whitelist_scope
    ON ip_whitelist(scope_type, scope_path)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_ip_whitelist_scopes_type
    ON ip_whitelist_scopes(scope_type)`;

  await sql`
    INSERT INTO ip_whitelist_scopes (scope_type, label, is_enabled)
    SELECT 'global', '전체 사이트', false
    WHERE NOT EXISTS (SELECT 1 FROM ip_whitelist_scopes WHERE scope_type = 'global')
  `;
  await sql`
    INSERT INTO ip_whitelist_scopes (scope_type, label, is_enabled)
    SELECT 'protected', '보호 페이지 (/app/*)', false
    WHERE NOT EXISTS (SELECT 1 FROM ip_whitelist_scopes WHERE scope_type = 'protected')
  `;

  console.log('✅ IP 화이트리스트 마이그레이션 완료');
}

migrate().catch(err => { console.error('❌ 마이그레이션 실패:', err); process.exit(1); });
