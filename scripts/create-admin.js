/**
 * scripts/create-admin.js
 * 초기 관리자 계정 생성 스크립트
 * 실행: node scripts/create-admin.js
 *
 * 환경변수: POSTGRES_URL, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 */

// 환경변수 주입 후 실행:
// $env:POSTGRES_URL="..."; $env:ADMIN_PASSWORD="yourpw"; node scripts/create-admin.js
const crypto = require('crypto');
const { promisify } = require('util');
const { neon } = require('@neondatabase/serverless');

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

async function createAdmin() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('❌ ADMIN_PASSWORD 환경변수가 필요합니다.');
    console.error('   예: ADMIN_PASSWORD=yourpassword node scripts/create-admin.js');
    process.exit(1);
  }

  const sql = neon(process.env.POSTGRES_URL);
  const passwordHash = await hashPassword(password);

  try {
    const rows = await sql`
      INSERT INTO users (username, email, password_hash, role, must_change_password)
      VALUES (${username}, ${email}, ${passwordHash}, 'admin', false)
      ON CONFLICT (username) DO UPDATE SET password_hash = ${passwordHash}, role = 'admin', is_active = true
      RETURNING id, username, email, role
    `;
    console.log('✅ 관리자 계정 생성/업데이트 완료:', rows[0]);
    console.log(`   username: ${username}`);
    console.log(`   password: (입력한 값)`);
  } catch (err) {
    console.error('❌ 관리자 계정 생성 실패:', err.message);
    process.exit(1);
  }
}

createAdmin();
