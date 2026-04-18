/**
 * scripts/add-mass-download-page.js
 * protected_pages에 문서 일괄 다운로드 레코드 삽입 및 file_path 갱신
 *
 * 실행 방법:
 *   $env:POSTGRES_URL="neon-연결-문자열"
 *   node scripts/add-mass-download-page.js
 */

const { neon } = require('@neondatabase/serverless');

async function main() {
  const sql = neon(process.env.POSTGRES_URL);

  // 레코드가 없으면 삽입, 있으면 file_path 갱신 (파일 이동 반영)
  await sql`
    INSERT INTO protected_pages (path, name, required_role, file_path)
    VALUES ('/app/massDocumentDownload', '문서 일괄 다운로드', 'manager', 'private/MassDocumentDowmload.html')
    ON CONFLICT (path) DO UPDATE
      SET file_path = 'private/MassDocumentDowmload.html'
  `;
  console.log('✅ /app/massDocumentDownload 레코드 삽입/갱신 완료');

  // utils/ 경로로 등록된 구 레코드가 있으면 file_path 갱신
  const updated = await sql`
    UPDATE protected_pages
    SET file_path = 'private/MassDocumentDowmload.html'
    WHERE file_path = 'utils/MassDocumentDowmload.html'
    RETURNING id
  `;
  if (updated.length > 0) {
    console.log(`✅ 구 file_path 갱신 완료 (${updated.length}건)`);
  }
}

main().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
