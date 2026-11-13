/**
 * OpenAPITester 데이터(api-list.js · api-specs.js)와 공개 에러 코드 페이지(utils/error-codes.html)의
 * 정합성을 DB 없이 점검하는 정적 스크립트 (P1-23).
 *
 * 실행:
 *   npm run check:api        (= node scripts/check-api-data.js)
 *
 * 검사 항목 (실패가 하나라도 있으면 목록을 출력하고 exit 1):
 *   1. API_LIST 각 항목에 명세가 있다 (getApiSpec 규칙: opaCode 키, 없으면 id 키)
 *   2. exampleResponse.errors ↔ API_SPECS.errorCodes 의 code·message·status 가 같다
 *   3. queryParams 키 집합이 같다 (API_LIST ↔ API_SPECS)
 *   4. defaultBody 에 고정 예시값(비어 있지 않은 문자열·boolean·숫자)이 없다
 *   5. fullOnly 가 아닌 모든 API_LIST 항목에 에러 코드 카드가 있다
 *   6. 모든 카드에 대응하는 API_LIST 항목이 있다 (번호 기준)
 *   7. 카드의 메서드·경로 = API_LIST 의 메서드·경로 ({param} 이름은 무시)
 *   8. 카드 코드 집합 = 테스터 errors 코드 집합, 공통 코드의 메시지 집합이 같다 (HTML 엔티티 디코딩 후)
 *   9. 카드 .cnt 숫자 = 실제 행 수
 *  10. 공개 에러 코드 페이지에 fullOnly 번호 카드가 없다
 *  11. utils/, assets/js/openapi/, API(JS,HTML)/ 에 'customsso_members' 문자열이 없다 (SSO 구성원 API 금지)
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_LIST_PATH = path.join(ROOT_DIR, 'assets', 'js', 'openapi', 'api-list.js');
const API_SPECS_PATH = path.join(ROOT_DIR, 'assets', 'js', 'openapi', 'api-specs.js');
const ERROR_CODES_PATH = path.join(ROOT_DIR, 'utils', 'error-codes.html');
const FORBIDDEN_STRING = 'customsso_members';
const FORBIDDEN_SCAN_DIRS = ['utils', path.join('assets', 'js', 'openapi'), 'API(JS,HTML)'];
const TEXT_EXTENSIONS = new Set(['.html', '.htm', '.js', '.css', '.json', '.md', '.txt']);

/**
 * 의도된 예외. 검사 번호(check)와 대상(key)이 같은 실패만 건너뛴다. 사유(reason)를 반드시 적는다.
 * 예: { check: 8, key: 'OPA2_005', reason: '...' }
 * C8(P1-23) 완료 시점 목표는 0건.
 */
const EXCEPTIONS = [];

const failures = [];

function toProjectPath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}

function fail(check, key, message) {
  failures.push({ check, key, message });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

// api-list.js / api-specs.js 는 브라우저용 전역 const 선언이다. vm 으로 실행한 뒤 같은 컨텍스트에서 값을 꺼낸다.
function loadGlobal(filePath, name) {
  const code = `${readText(filePath)}\n;globalThis.__value = ${name};`;
  const context = vm.createContext({});
  new vm.Script(code, { filename: toProjectPath(filePath) }).runInContext(context);
  return context.__value;
}

function decodeEntities(text) {
  return String(text)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

function stripTags(html) {
  return decodeEntities(String(html).replace(/<[^>]*>/g, '')).trim();
}

// 경로 비교용: {document_id} 같은 파라미터 이름은 무시한다.
function normalizeApiPath(p) {
  return String(p || '').trim().replace(/\{[^}]*\}/g, '{}').replace(/\/+$/, '');
}

function getApiSpec(specs, ep) {
  if (!ep) return undefined;
  return (ep.opaCode && specs[ep.opaCode]) || specs[ep.id];
}

function label(ep) {
  return ep.opaCode || ep.id;
}

// ── 에러 코드 페이지 파싱 ─────────────────────────────────────────
function parseCards(html) {
  const cards = [];
  const chunks = html.split('<div class="card">').slice(1);
  for (const chunk of chunks) {
    const method = (chunk.match(/<span class="mb"[^>]*>([^<]*)<\/span>/) || [])[1];
    const title = stripTags((chunk.match(/<h3>([\s\S]*?)<\/h3>/) || [])[1] || '');
    const ep = stripTags((chunk.match(/<span class="ep">([\s\S]*?)<\/span>/) || [])[1] || '');
    const cntText = (chunk.match(/<span class="cnt">([^<]*)<\/span>/) || [])[1];
    const tbody = (chunk.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '';
    const rows = [];
    const rowRe = /<tr>\s*<td class="cc">([\s\S]*?)<\/td>\s*<td class="ec">([\s\S]*?)<\/td>\s*<td class="mc">([\s\S]*?)<\/td>\s*<\/tr>/g;
    let m;
    while ((m = rowRe.exec(tbody)) !== null) {
      rows.push({ code: stripTags(m[1]), enumName: stripTags(m[2]), message: stripTags(m[3]) });
    }
    const rawRowCount = (tbody.match(/<tr\b/g) || []).length;
    const numberMatch = title.match(/^(OPA2_\d+(?:_\d+)?)/);
    cards.push({
      number: numberMatch ? numberMatch[1] : null,
      title,
      method: (method || '').trim(),
      ep,
      cnt: cntText === undefined ? null : Number(cntText),
      rows,
      rawRowCount,
    });
  }
  return cards;
}

// ── 검사 ──────────────────────────────────────────────────────────
function errorKey(code, message, status) {
  return `${code} | ${message} | ${status === undefined || status === null ? '-' : status}`;
}

function multisetDiff(a, b) {
  const counts = new Map();
  for (const k of a) counts.set(k, (counts.get(k) || 0) + 1);
  for (const k of b) counts.set(k, (counts.get(k) || 0) - 1);
  const onlyA = [];
  const onlyB = [];
  for (const [k, n] of counts) {
    for (let i = 0; i < n; i++) onlyA.push(k);
    for (let i = 0; i < -n; i++) onlyB.push(k);
  }
  return { onlyA, onlyB };
}

function checkTesterData(list, specs) {
  for (const ep of list) {
    const key = label(ep);
    const spec = getApiSpec(specs, ep);

    // 1. 명세 존재
    if (!spec) {
      fail(1, key, `API_SPECS 에 명세가 없습니다 (id: ${ep.id})`);
      continue;
    }

    // 2. errors ↔ errorCodes
    const listErrors = ((ep.exampleResponse && ep.exampleResponse.errors) || []).map((e) =>
      errorKey(e.body && e.body.code, e.body && e.body.ErrorMessage, e.status));
    const specErrors = (spec.errorCodes || []).map((e) => errorKey(e.code, e.message, e.status));
    const d2 = multisetDiff(listErrors, specErrors);
    for (const k of d2.onlyA) fail(2, key, `api-list.js errors 에만 있음: ${k}`);
    for (const k of d2.onlyB) fail(2, key, `api-specs.js errorCodes 에만 있음: ${k}`);

    // 3. queryParams 키 집합
    const listQ = new Set((ep.queryParams || []).map((q) => q.key));
    const specQ = new Set((spec.queryParams || []).map((q) => q.key));
    for (const k of listQ) if (!specQ.has(k)) fail(3, key, `queryParams '${k}' 가 api-specs.js 에 없습니다`);
    for (const k of specQ) if (!listQ.has(k)) fail(3, key, `queryParams '${k}' 가 api-list.js 에 없습니다`);

    // 4. defaultBody 고정 예시값
    walkDefaultBody(ep.defaultBody, 'defaultBody', (where, value) =>
      fail(4, key, `${where} 에 고정 예시값 ${JSON.stringify(value)} (문자열은 '', boolean·숫자는 null)`));
  }
}

function walkDefaultBody(value, where, onViolation) {
  if (value === null || value === undefined) return;
  if (Array.isArray(value)) {
    value.forEach((v, i) => walkDefaultBody(v, `${where}[${i}]`, onViolation));
    return;
  }
  if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) walkDefaultBody(v, `${where}.${k}`, onViolation);
    return;
  }
  if (typeof value === 'string' && value === '') return;
  onViolation(where, value);
}

function checkErrorCodePage(list, cards) {
  const byOpa = new Map();
  for (const ep of list) {
    if (ep.opaCode) {
      if (!byOpa.has(ep.opaCode)) byOpa.set(ep.opaCode, []);
      byOpa.get(ep.opaCode).push(ep);
    }
  }
  const cardsByNumber = new Map();
  for (const card of cards) {
    if (!card.number) {
      fail(6, card.title || '(제목 없음)', '카드 제목에서 OPA2 번호를 읽을 수 없습니다');
      continue;
    }
    if (cardsByNumber.has(card.number)) fail(6, card.number, '같은 번호의 카드가 두 장 이상입니다');
    cardsByNumber.set(card.number, card);
  }

  // 5. fullOnly 가 아닌 항목마다 카드
  for (const ep of list) {
    if (ep.fullOnly) continue;
    if (!ep.opaCode) {
      fail(5, ep.id, 'opaCode 가 없어 에러 코드 카드와 대응할 수 없습니다');
      continue;
    }
    if (!cardsByNumber.has(ep.opaCode)) fail(5, ep.opaCode, `에러 코드 카드가 없습니다 (${ep.method} ${ep.path})`);
  }

  for (const card of cards) {
    if (!card.number) continue;
    const key = card.number;
    const eps = byOpa.get(key) || [];

    // 9. .cnt = 행 수
    if (card.cnt === null || Number.isNaN(card.cnt)) {
      fail(9, key, '.cnt 숫자를 읽을 수 없습니다');
    } else if (card.cnt !== card.rawRowCount) {
      fail(9, key, `.cnt ${card.cnt} ≠ 실제 행 수 ${card.rawRowCount}`);
    }
    if (card.rows.length !== card.rawRowCount) {
      fail(9, key, `코드·Enum·메시지 3칸 형식이 아닌 행이 있습니다 (파싱 ${card.rows.length} / 전체 ${card.rawRowCount})`);
    }

    // 6. 카드 ↔ API_LIST 항목
    if (eps.length === 0) {
      fail(6, key, `대응하는 API_LIST 항목이 없습니다 (${card.method} ${card.ep})`);
      continue;
    }
    if (eps.length > 1) {
      fail(6, key, `같은 opaCode 의 API_LIST 항목이 ${eps.length}개입니다 (${eps.map((e) => e.id).join(', ')})`);
    }
    const ep = eps[0];

    // 10. fullOnly 번호 카드 금지
    if (ep.fullOnly) {
      fail(10, key, `Full 전용(fullOnly) API 의 카드가 공개 페이지에 있습니다 (${ep.id})`);
    }

    // 7. 메서드·경로
    if (card.method.toUpperCase() !== String(ep.method).toUpperCase()) {
      fail(7, key, `메서드 불일치: 카드 ${card.method} / 테스터 ${ep.method}`);
    }
    if (normalizeApiPath(card.ep) !== normalizeApiPath(ep.path)) {
      fail(7, key, `경로 불일치: 카드 ${card.ep} / 테스터 ${ep.path}`);
    }

    // 8. 코드 집합 + 공통 코드 메시지
    const cardMsgs = groupMessages(card.rows.map((r) => [r.code, r.message]));
    const testerMsgs = groupMessages(((ep.exampleResponse && ep.exampleResponse.errors) || [])
      .map((e) => [String(e.body && e.body.code), String(e.body && e.body.ErrorMessage)]));
    for (const code of cardMsgs.keys()) {
      if (!testerMsgs.has(code)) fail(8, key, `카드에만 있는 코드: ${code}`);
    }
    for (const code of testerMsgs.keys()) {
      if (!cardMsgs.has(code)) fail(8, key, `테스터 errors 에만 있는 코드: ${code}`);
    }
    for (const [code, msgs] of cardMsgs) {
      const other = testerMsgs.get(code);
      if (!other) continue;
      for (const msg of msgs) if (!other.has(msg)) fail(8, key, `${code} 카드 메시지가 테스터에 없음: "${msg}"`);
      for (const msg of other) if (!msgs.has(msg)) fail(8, key, `${code} 테스터 메시지가 카드에 없음: "${msg}"`);
    }
  }
}

function groupMessages(pairs) {
  const map = new Map();
  for (const [code, msg] of pairs) {
    if (!map.has(code)) map.set(code, new Set());
    map.get(code).add(msg);
  }
  return map;
}

// 11. SSO 구성원 API 금지 문자열
function checkForbiddenString() {
  for (const dir of FORBIDDEN_SCAN_DIRS) {
    const abs = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(abs)) continue;
    for (const file of listFiles(abs)) {
      if (!TEXT_EXTENSIONS.has(path.extname(file).toLowerCase())) continue;
      const lines = readText(file).split(/\r?\n/);
      lines.forEach((line, i) => {
        if (line.includes(FORBIDDEN_STRING)) {
          fail(11, toProjectPath(file), `${i + 1}행에 '${FORBIDDEN_STRING}' (SSO 구성원 조회 API 는 공개 도구에 넣지 않는다)`);
        }
      });
    }
  }
}

function listFiles(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...listFiles(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
}

function main() {
  let list;
  let specs;
  let cards;
  try {
    list = loadGlobal(API_LIST_PATH, 'API_LIST');
    specs = loadGlobal(API_SPECS_PATH, 'API_SPECS');
    cards = parseCards(readText(ERROR_CODES_PATH));
  } catch (error) {
    console.error(`데이터를 읽을 수 없습니다: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  checkTesterData(list, specs);
  checkErrorCodePage(list, cards);
  checkForbiddenString();

  const usedExceptions = new Set();
  const remaining = failures.filter((f) => {
    const idx = EXCEPTIONS.findIndex((e) => e.check === f.check && e.key === f.key);
    if (idx >= 0) {
      usedExceptions.add(idx);
      return false;
    }
    return true;
  });

  const cardRows = cards.reduce((sum, c) => sum + c.rows.length, 0);
  console.log('API 데이터 정합성 점검 (check:api)');
  console.log(`- API_LIST ${list.length}개 (fullOnly ${list.filter((e) => e.fullOnly).length}개), API_SPECS ${Object.keys(specs).length}개`);
  console.log(`- 에러 코드 카드 ${cards.length}장, 행 ${cardRows}개`);
  console.log(`- 예외(EXCEPTIONS) ${EXCEPTIONS.length}건${EXCEPTIONS.length ? `, 적용 ${usedExceptions.size}건` : ''}`);
  EXCEPTIONS.forEach((e, i) => {
    console.log(`  · [${e.check}] ${e.key} — ${e.reason}${usedExceptions.has(i) ? '' : ' (해당 실패 없음 — 지워도 됨)'}`);
  });

  if (remaining.length > 0) {
    console.log(`\n실패 ${remaining.length}건`);
    for (const f of remaining) console.log(`- [${f.check}] ${f.key}: ${f.message}`);
    process.exitCode = 1;
    return;
  }
  console.log('\n실패 없음 (11개 검사 통과)');
}

main();
