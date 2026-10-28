/**
 * scripts/create-admin.js
 * 초기 관리자 계정 생성 / 기존 관리자 계정 복구 스크립트
 * 실행: node scripts/create-admin.js [--must-change]
 *
 * 환경변수: POSTGRES_URL, ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * 같은 username이 이미 있으면 "복구"로 동작한다(P0b-12):
 *   - 비밀번호를 ADMIN_PASSWORD로 교체, role='admin', is_active=true
 *   - 로그인 잠금 해제(failed_login_count=0, locked_until=NULL)
 *   - must_change_password=false (--must-change 지정 시 true → 다음 로그인 때 변경 강제)
 *   - 해당 계정의 활성 refresh 토큰 전부 폐기 — 탈취됐을 수 있는 기존 세션을 끊는다.
 *     replaced_by 없이 revoked_at만 세팅하므로 grace(30초) 경로로도 재인증되지 않는다.
 */

// 환경변수 주입 후 실행:
// $env:POSTGRES_URL="..."; $env:ADMIN_PASSWORD="yourpw"; node scripts/create-admin.js
const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}

/**
 * 관리자 계정 upsert + (기존 계정이면) 잠금 해제·토큰 폐기
 * @returns {{ user: object, created: boolean, revokedTokens: number }}
 */
async function upsertAdmin(sql, { username, email, passwordHash, mustChangePassword = false }) {
  // xmax = 0 이면 새로 INSERT된 행, 아니면 ON CONFLICT UPDATE된 기존 행
  const rows = await sql`
    INSERT INTO users (username, email, password_hash, role, must_change_password)
    VALUES (${username}, ${email}, ${passwordHash}, 'admin', ${mustChangePassword})
    ON CONFLICT (username) DO UPDATE SET
      password_hash        = EXCLUDED.password_hash,
      role                 = 'admin',
      is_active            = true,
      must_change_password = EXCLUDED.must_change_password,
      failed_login_count   = 0,
      locked_until         = NULL,
      updated_at           = now()
    RETURNING id, username, email, role, (xmax = 0) AS created
  `;
  const user = rows[0];
  const created = user.created === true;

  let revokedTokens = 0;
  if (!created) {
    const revoked = await sql`
      UPDATE refresh_tokens
      SET revoked_at = now()
      WHERE user_id = ${user.id} AND revoked_at IS NULL
      RETURNING id
    `;
    revokedTokens = revoked.length;
  }

  return { user, created, revokedTokens };
}

async function main() {
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@example.com';
  const password = process.env.ADMIN_PASSWORD;
  const mustChangePassword = process.argv.includes('--must-change');

  if (!password) {
    console.error('❌ ADMIN_PASSWORD 환경변수가 필요합니다.');
    console.error('   예: ADMIN_PASSWORD=yourpassword node scripts/create-admin.js');
    process.exit(1);
  }
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL 환경변수가 필요합니다.');
    process.exit(1);
  }

  const { neon } = require('@neondatabase/serverless');
  const sql = neon(process.env.POSTGRES_URL);
  const passwordHash = await hashPassword(password);

  try {
    const { user, created, revokedTokens } = await upsertAdmin(sql, {
      username, email, passwordHash, mustChangePassword,
    });
    if (created) {
      console.log('✅ 관리자 계정 생성 완료:', { id: user.id, username: user.username, email: user.email });
    } else {
      console.log('✅ 기존 관리자 계정 복구 완료:', { id: user.id, username: user.username, email: user.email });
      console.log('   잠금 해제 · 비밀번호 교체 · role=admin · 활성화');
      console.log(`   폐기한 refresh 토큰: ${revokedTokens}개 (기존 세션은 다시 로그인해야 함)`);
    }
    console.log(`   username: ${username}`);
    console.log('   password: (입력한 값)');
    console.log(`   다음 로그인 시 비밀번호 변경 강제: ${mustChangePassword ? '예' : '아니오'}`);
  } catch (err) {
    console.error('❌ 관리자 계정 생성 실패:', err.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { upsertAdmin, hashPassword };
