/**
 * scripts/migrate-credentials-encrypt.js
 * eformsign_credentials 테이블의 plaintext secret_key를 AES-256-GCM으로 일괄 암호화하는 one-time 스크립트.
 *
 * 실행 방법:
 *   POSTGRES_URL="..." CREDENTIAL_ENCRYPTION_KEY="..." node scripts/migrate-credentials-encrypt.js
 *
 * 암호화 키 생성 (32바이트 랜덤):
 *   Linux/Mac: openssl rand -hex 32
 *   PowerShell: -join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
 *
 * Vercel 대시보드에서 Production / Preview / Development 세 환경 모두 등록 필요.
 * 로컬 반영: vercel env pull .env.local 후 vercel dev 재시작
 */

const { neon } = require('@neondatabase/serverless');
const crypto = require('crypto');

// ─── 암호화 유틸 (credentials.js와 동일 로직) ───────────────────────────

function getEncryptionKey() {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex) throw new Error('CREDENTIAL_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.');
  return Buffer.from(hex, 'hex');
}

function isEncrypted(val) {
  return typeof val === 'string' && val.split(':').length === 3;
}

function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

// ─── 마이그레이션 실행 ─────────────────────────────────────────────────

async function run() {
  if (!process.env.POSTGRES_URL) {
    console.error('오류: POSTGRES_URL 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  // 키 유효성 사전 확인
  try {
    getEncryptionKey();
  } catch (e) {
    console.error('오류:', e.message);
    process.exit(1);
  }

  const sql = neon(process.env.POSTGRES_URL);

  console.log('🔐 크리덴셜 암호화 마이그레이션 시작...\n');

  // secret_key가 있는 행 전체 조회
  const rows = await sql`
    SELECT id, secret_key
    FROM eformsign_credentials
    WHERE secret_key IS NOT NULL
  `;

  const total = rows.length;
  let encrypted = 0;
  let skipped = 0;
  let failed = 0;

  for (const row of rows) {
    // 이미 암호화된 행 스킵
    if (isEncrypted(row.secret_key)) {
      skipped++;
      continue;
    }

    try {
      const encryptedKey = encrypt(row.secret_key);
      await sql`
        UPDATE eformsign_credentials
        SET secret_key = ${encryptedKey}, updated_at = NOW()
        WHERE id = ${row.id}
      `;
      encrypted++;
    } catch (e) {
      console.error(`  ✗ id=${row.id} 암호화 실패:`, e.message);
      failed++;
    }
  }

  console.log(`완료: 총 ${total}건 중 ${encrypted}건 암호화, ${skipped}건 스킵(이미 암호화), ${failed}건 실패`);

  if (failed > 0) {
    console.warn('\n⚠️  실패한 행이 있습니다. 위 로그를 확인하세요.');
    process.exit(1);
  }
}

run().catch((e) => {
  console.error('마이그레이션 중 예외 발생:', e.message);
  process.exit(1);
});
