/**
 * scripts/migrate.js
 * DB 스키마 초기화 및 시드 데이터 삽입 스크립트
 * 실행: node scripts/migrate.js
 */

// 환경변수 로드: vercel env pull .env.local 후 아래처럼 실행
// $env:POSTGRES_URL="..." ; node scripts/migrate.js  (PowerShell)
// POSTGRES_URL="..." node scripts/migrate.js          (bash)
const { neon } = require('@neondatabase/serverless');

async function migrate() {
  const sql = neon(process.env.POSTGRES_URL);

  console.log('🔧 마이그레이션 시작...');

  // ─── 테이블 생성 ────────────────────────────────────────────

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username              VARCHAR(50) UNIQUE NOT NULL,
      email                 VARCHAR(255) UNIQUE NOT NULL,
      password_hash         VARCHAR NOT NULL,
      role                  VARCHAR NOT NULL CHECK (role IN ('admin','manager','user')),
      is_active             BOOLEAN DEFAULT true,
      must_change_password  BOOLEAN DEFAULT false,
      failed_login_count    INTEGER DEFAULT 0,
      locked_until          TIMESTAMPTZ,
      last_login_at         TIMESTAMPTZ,
      created_at            TIMESTAMPTZ DEFAULT now(),
      updated_at            TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✅ users 테이블 생성 완료');

  await sql`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash  VARCHAR NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      created_at  TIMESTAMPTZ DEFAULT now(),
      revoked_at  TIMESTAMPTZ
    )
  `;
  console.log('✅ refresh_tokens 테이블 생성 완료');

  await sql`
    CREATE TABLE IF NOT EXISTS password_reset_requests (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID REFERENCES users(id) ON DELETE CASCADE,
      username     VARCHAR NOT NULL,
      status       VARCHAR NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending','resolved')),
      created_at   TIMESTAMPTZ DEFAULT now(),
      resolved_at  TIMESTAMPTZ,
      resolved_by  UUID REFERENCES users(id) ON DELETE SET NULL
    )
  `;
  console.log('✅ password_reset_requests 테이블 생성 완료');

  await sql`
    CREATE TABLE IF NOT EXISTS protected_pages (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      path          VARCHAR UNIQUE NOT NULL,
      name          VARCHAR NOT NULL,
      description   VARCHAR,
      required_role VARCHAR NOT NULL CHECK (required_role IN ('admin','manager','user')),
      file_path     VARCHAR NOT NULL,
      is_active     BOOLEAN DEFAULT true,
      created_at    TIMESTAMPTZ DEFAULT now(),
      updated_at    TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✅ protected_pages 테이블 생성 완료');

  await sql`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
      username    VARCHAR,
      action      VARCHAR NOT NULL,
      target      VARCHAR,
      ip_address  VARCHAR,
      result      VARCHAR CHECK (result IN ('success','failure','denied')),
      metadata    JSONB,
      created_at  TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✅ audit_logs 테이블 생성 완료');

  await sql`
    CREATE TABLE IF NOT EXISTS signup_requests (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username      VARCHAR(50) NOT NULL,
      email         VARCHAR(255) NOT NULL,
      password_hash VARCHAR NOT NULL,
      status        VARCHAR DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected')),
      approved_role VARCHAR
                    CHECK (approved_role IN ('admin','manager','user')),
      reviewed_by   UUID REFERENCES users(id) ON DELETE SET NULL,
      reviewed_at   TIMESTAMPTZ,
      reject_reason VARCHAR,
      created_at    TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✅ signup_requests 테이블 생성 완료');

  await sql`
    CREATE TABLE IF NOT EXISTS eformsign_credentials (
      id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name           VARCHAR(100) NOT NULL,
      environment    VARCHAR(20)  NOT NULL CHECK (environment IN ('op_saas','csap','custom')),
      custom_url     VARCHAR(500),
      api_key        VARCHAR(500) NOT NULL,
      eform_user_id  VARCHAR(255) NOT NULL,
      secret_method  VARCHAR(20)  NOT NULL CHECK (secret_method IN ('signature','bearer')),
      secret_key     TEXT,
      created_at     TIMESTAMPTZ DEFAULT now(),
      updated_at     TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✅ eformsign_credentials 테이블 생성 완료');

  // ─── 인덱스 생성 ────────────────────────────────────────────

  await sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_password_reset_requests_status ON password_reset_requests(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON signup_requests(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_eformsign_credentials_user_id ON eformsign_credentials(user_id)`;
  console.log('✅ 인덱스 생성 완료');

  await sql`
    CREATE TABLE IF NOT EXISTS api_request_history (
      id           VARCHAR(20) PRIMARY KEY,
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name         VARCHAR(255) NOT NULL,
      endpoint_id  VARCHAR(100),
      method       VARCHAR(10),
      environment  VARCHAR(50),
      url          TEXT,
      path_params  JSONB DEFAULT '[]',
      query_params JSONB DEFAULT '[]',
      headers      JSONB DEFAULT '[]',
      body         TEXT,
      response     JSONB,
      saved_at     BIGINT,
      created_at   TIMESTAMPTZ DEFAULT now()
    )
  `;
  console.log('✅ api_request_history 테이블 생성 완료');

  await sql`CREATE INDEX IF NOT EXISTS idx_api_request_history_user_saved
    ON api_request_history(user_id, saved_at DESC)`;

  // ─── 보호 페이지 시드 데이터 ────────────────────────────────

  const pages = [
    { path: '/app/memberV2',        name: '멤버 관리 V2',          required_role: 'manager', file_path: 'private/MemberV2.html' },
    { path: '/app/templatecopy',    name: '템플릿 복제',            required_role: 'manager', file_path: 'private/templatecopy.html' },
    { path: '/app/OpenAPIAutoTest', name: 'API 자동 테스트',        required_role: 'manager', file_path: 'private/OpenAPIAutoTest.html' },
    { path: '/app/ApiAutoTest',     name: 'API 자동 테스트 구버전', required_role: 'admin',   file_path: 'private/ApiAutoTest.html' },
    { path: '/app/idptestauth',          name: 'IdP 테스트',            required_role: 'admin',   file_path: 'private/idp-test.html' },
    { path: '/app/admin',                name: '관리자',                 required_role: 'admin',   file_path: 'private/Admin.html' },
    { path: '/app/massDocumentDownload', name: '문서 일괄 다운로드',     required_role: 'manager', file_path: 'private/MassDocumentDowmload.html' },
  ];

  for (const p of pages) {
    await sql`
      INSERT INTO protected_pages (path, name, required_role, file_path)
      VALUES (${p.path}, ${p.name}, ${p.required_role}, ${p.file_path})
      ON CONFLICT (path) DO NOTHING
    `;
  }
  console.log('✅ protected_pages 시드 데이터 삽입 완료');

  console.log('\n🎉 마이그레이션 완료!');
  console.log('\n다음 단계: 관리자 계정 생성');
  console.log('   $env:ADMIN_USERNAME="admin"');
  console.log('   $env:ADMIN_EMAIL="admin@example.com"');
  console.log('   $env:ADMIN_PASSWORD="yourpassword"');
  console.log('   node scripts/create-admin.js');
}

migrate().catch((err) => {
  console.error('❌ 마이그레이션 실패:', err);
  process.exit(1);
});
