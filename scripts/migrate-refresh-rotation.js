/**
 * scripts/migrate-refresh-rotation.js
 * 리프레시 토큰 로테이션 경합 처리를 위한 replaced_by 컬럼 추가
 *
 * 실행 방법:
 *   node scripts/migrate-refresh-rotation.js
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

  await sql`
    ALTER TABLE refresh_tokens
    ADD COLUMN IF NOT EXISTS replaced_by UUID
  `;
  console.log('✓ refresh_tokens.replaced_by 컬럼 확인 완료');

  console.log('\n리프레시 토큰 로테이션 마이그레이션 완료.');
}

migrate()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('리프레시 토큰 로테이션 마이그레이션 실패:', err);
    process.exit(1);
  });
