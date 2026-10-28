/**
 * scripts/cleanup-request-history-secrets.js
 * api_request_history 에 구버전이 저장한 인증 값(토큰·서명·API Key) 일괄 제거
 *
 * 현행 클라이언트(assets/js/openapi/state.js)는 저장 시 민감 헤더 값을 ""로 보내지만,
 * 이전 버전이 저장한 행에는 Authorization(Bearer 토큰, OPA2_007/048은 base64 회사 API Key)·
 * eformsign_signature 값이 그대로 남아 있다. 이 스크립트가 서버 데이터를 정리한다.
 *
 * 정리 대상 (키 이름이 SENSITIVE_KEY_RE 에 맞는 항목의 값만 "" 로 — 키·다른 필드는 유지):
 *   - headers       [{ key, value }]
 *   - query_params  [{ key, value }]
 *   - response      토큰 발급 응답 등 JSON 안의 access_token / refresh_token 등 (깊이 무관)
 *
 * 실행 방법:
 *   node scripts/cleanup-request-history-secrets.js          # dry-run (건수만 출력, 변경 없음)
 *   node scripts/cleanup-request-history-secrets.js --apply  # 실제 UPDATE
 *
 * 값은 어떤 경우에도 출력하지 않는다. 멱등이므로 재실행해도 안전하다.
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

// state.js 의 SENSITIVE_HEADER_RE 와 동일 기준
const SENSITIVE_KEY_RE = /^(authorization|cookie|x-api-key)$|signature|token|secret/i;

function isSensitiveKey(key) {
  return SENSITIVE_KEY_RE.test(String(key || '').trim());
}

// [{ key, value }] 배열에서 민감 키의 값만 비운다. 바뀐 항목 수 반환
function maskPairs(list) {
  if (!Array.isArray(list)) return { value: list, changed: 0 };
  let changed = 0;
  const value = list.map((item) => {
    if (item && isSensitiveKey(item.key) && item.value) {
      changed += 1;
      return { ...item, value: '' };
    }
    return item;
  });
  return { value, changed };
}

// JSON 안의 민감 키(문자열 값)를 깊이 무관하게 비운다
function maskJson(node) {
  let changed = 0;
  const walk = (v) => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out = {};
      for (const [k, val] of Object.entries(v)) {
        if (isSensitiveKey(k) && typeof val === 'string' && val) {
          changed += 1;
          out[k] = '';
        } else {
          out[k] = walk(val);
        }
      }
      return out;
    }
    return v;
  };
  return { value: walk(node), changed };
}

async function run() {
  if (!process.env.POSTGRES_URL) {
    throw new Error('POSTGRES_URL 환경변수가 설정되지 않았습니다.');
  }
  const apply = process.argv.includes('--apply');
  const sql = neon(process.env.POSTGRES_URL);

  const rows = await sql`
    SELECT id, headers, query_params, response, url
    FROM api_request_history
  `;

  const stats = { rows: rows.length, targetRows: 0, headers: 0, query: 0, response: 0, urlWithToken: 0 };
  const updates = [];

  for (const row of rows) {
    const h = maskPairs(row.headers);
    const q = maskPairs(row.query_params);
    const r = row.response ? maskJson(row.response) : { value: row.response, changed: 0 };
    // url 은 표시용 문자열이라 자동 수정하지 않고 건수만 보고
    if (row.url && /[?&][^=&]*(token|secret|signature)[^=&]*=[^&]+/i.test(row.url)) stats.urlWithToken += 1;

    if (h.changed || q.changed || r.changed) {
      stats.targetRows += 1;
      stats.headers += h.changed;
      stats.query += q.changed;
      stats.response += r.changed;
      updates.push({ id: row.id, headers: h.value, query: q.value, response: r.value });
    }
  }

  console.log(`전체 행: ${stats.rows}`);
  console.log(`정리 대상 행: ${stats.targetRows}`);
  console.log(`  - headers 값 제거: ${stats.headers}건`);
  console.log(`  - query_params 값 제거: ${stats.query}건`);
  console.log(`  - response 토큰 값 제거: ${stats.response}건`);
  console.log(`(참고) url 에 토큰류 쿼리가 있는 행: ${stats.urlWithToken} — 자동 수정 안 함`);

  if (!apply) {
    console.log('\ndry-run: 변경하지 않았습니다. 적용하려면 --apply 를 붙여 실행하세요.');
    return;
  }

  for (const u of updates) {
    await sql`
      UPDATE api_request_history
      SET headers      = ${JSON.stringify(u.headers)}::jsonb,
          query_params = ${JSON.stringify(u.query)}::jsonb,
          response     = ${u.response == null ? null : JSON.stringify(u.response)}::jsonb
      WHERE id = ${u.id}
    `;
  }
  console.log(`\n✓ ${updates.length}개 행 정리 완료.`);
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('요청 기록 인증 값 정리 실패:', err.message);
    process.exit(1);
  });
