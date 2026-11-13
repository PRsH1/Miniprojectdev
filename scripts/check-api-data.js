/**
 * OpenAPITester 데이터(api-list.js · api-specs.js)와 에러 코드 페이지 두 개의 정합성을 DB 없이 점검하는 정적 스크립트 (P1-23).
 *   - 공개 페이지 utils/error-codes.html            = OpenAPITester Prod 에 보이는 API (멤버·그룹·fullOnly 제외)
 *   - 내부 페이지 private/error-codes-internal.html = OpenAPITester Full 과 같은 API_LIST 전체 (/app/error-codes-internal, manager 이상)
 *
 * 실행:
 *   npm run check:api        (= node scripts/check-api-data.js)
 *
 * 검사 항목 (실패가 하나라도 있으면 목록을 출력하고 exit 1). 5~9 는 두 페이지에 같은 함수로 적용하고 실패 키에 [공개]/[내부]를 붙인다:
 *   1. API_LIST 각 항목에 명세가 있다 (getApiSpec 규칙: opaCode 키, 없으면 id 키)
 *   2. exampleResponse.errors ↔ API_SPECS.errorCodes 의 code·message·status 가 같다
 *   3. queryParams 키 집합이 같다 (API_LIST ↔ API_SPECS)
 *   4. defaultBody 에 고정 예시값(비어 있지 않은 문자열·boolean·숫자)이 없다
 *   5. 페이지 대상 API 마다 카드가 있다 (공개 = isProdVisible, 내부 = 전체)
 *   6. 모든 카드가 페이지 대상 API 와 1:1 이다 (번호 기준 — 대상 밖 API(공개 페이지의 멤버·그룹·fullOnly)의 카드도 실패).
 *      카드는 class 에 'card' 토큰이 있는 <div> 로 나누고, 페이지의 <h3>OPA2_ 제목 수와 파싱한 카드 수가 다르면 실패
 *   7. 카드의 메서드·경로 = API_LIST 의 메서드·경로 ({param} 이름은 무시)
 *   8. 카드 코드 집합 = 테스터 errors 코드 집합, 공통 코드의 메시지 집합이 같다 (HTML 엔티티 디코딩 후).
 *      카드 안 같은 행(코드·Enum·메시지) 중복 금지, (코드, 메시지) 행 수 ≤ 테스터 errors 의 같은 (코드, 메시지) 개수
 *   9. 카드 .cnt 숫자 = 실제 행 수
 *  10. 공개 범위 = Prod 숨김 블록: Prod HTML 의 페이지 전용 블록(api-list.js 직후 인라인 <script>)을 실제로 실행해 남는 API 가
 *      isProdVisible 집합과 같다(조건 문자열 '멤버'·'그룹'·fullOnly 도 확인). Full 블록은 API_LIST 를 바꾸지 않고
 *      window.API_ERROR_CODES_PAGE 를 내부 페이지로 설정한다. 두 HTML 은 그 블록을 빼면 같다
 *  11. utils/, private/, assets/js/openapi/, API(JS,HTML)/ 에 'customsso_members' 문자열이 없다 (SSO 구성원 API 금지)
 *  12. 내부 페이지 카드 중 공개 페이지에도 있는 카드는 제목·메서드·경로·행(코드·Enum·메시지, 순서 포함)이 공개 페이지와 같다
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const API_LIST_PATH = path.join(ROOT_DIR, 'assets', 'js', 'openapi', 'api-list.js');
const API_SPECS_PATH = path.join(ROOT_DIR, 'assets', 'js', 'openapi', 'api-specs.js');
const PROD_HTML_PATH = path.join(ROOT_DIR, 'API(JS,HTML)', 'OpenAPITesterProd.html');
const FULL_HTML_PATH = path.join(ROOT_DIR, 'private', 'OpenAPITesterFull.html');
const INTERNAL_PAGE_URL = '/app/error-codes-internal';
const FORBIDDEN_STRING = 'customsso_members';
const FORBIDDEN_SCAN_DIRS = ['utils', 'private', path.join('assets', 'js', 'openapi'), 'API(JS,HTML)'];

/**
 * OpenAPITester Prod 가 화면에 남기는 API (Prod HTML 숨김 블록과 같은 판정 — 검사 10 이 블록을 실행해 대조한다).
 * 공개 에러 코드 페이지의 대상이다.
 */
function isProdVisible(ep) {
  return ep.group !== '멤버' && ep.group !== '그룹' && !ep.fullOnly;
}

// 에러 코드 페이지별 설정 — 검사 함수는 같고 파일·대상 판정만 다르다
const ERROR_CODE_PAGES = [
  {
    key: '공개',
    file: path.join(ROOT_DIR, 'utils', 'error-codes.html'),
    target: 'OpenAPITester Prod 표시 API',
    includes: isProdVisible,
  },
  {
    key: '내부',
    file: path.join(ROOT_DIR, 'private', 'error-codes-internal.html'),
    target: 'API_LIST 전체(OpenAPITester Full)',
    includes: () => true,
  },
];
const TEXT_EXTENSIONS = new Set(['.html', '.htm', '.js', '.css', '.json', '.md', '.txt']);

/**
 * 의도된 예외. 검사 번호(check)와 대상(key)이 같은 실패만 건너뛴다. 사유(reason)를 반드시 적는다.
 * 예: { check: 8, key: '[공개] OPA2_005', reason: '...' }  (5~9 의 key 는 페이지 접두어 [공개]/[내부] 포함, 출력된 그대로)
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
// 카드 시작 태그: class 목록에 'card' 토큰이 있는 <div> (예: class="card", class="card x", class='x card').
// card-header·card-body는 토큰이 달라 걸리지 않는다. 예전에는 '<div class="card">' 정확 일치라 속성이 다른 카드가 검사를 피했다 (D-4)
const CARD_OPEN_RE = /<div\b[^>]*\bclass\s*=\s*(["'])(?:(?!\1)[^>])*?(?<![\w-])card(?![\w-])(?:(?!\1)[^>])*\1[^>]*>/g;
// 안전망: 페이지의 OPA2 카드 제목 수 (파싱한 카드 수와 같아야 한다)
const CARD_TITLE_RE = /<h3\b[^>]*>\s*OPA2_/g;

function parseCards(html) {
  const cards = [];
  const chunks = html.split(CARD_OPEN_RE).slice(1).filter((_, i) => i % 2 === 1); // split 결과에 따옴표 캡처가 끼므로 본문만 남긴다
  for (const chunk of chunks) {
    const method = (chunk.match(/<span class="mb"[^>]*>([^<]*)<\/span>/) || [])[1];
    const title = stripTags((chunk.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || '');
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

// 5~9. 에러 코드 페이지 한 개 검사 (page = ERROR_CODE_PAGES 항목)
function checkErrorCodePage(page, list, cards, cardTitleCount) {
  const k = (s) => `[${page.key}] ${s}`;

  // 6. 안전망 — 카드 마크업이 달라 파싱에서 빠진 카드가 없는지 (OPA2 제목 수 = 파싱한 카드 수)
  if (cardTitleCount !== cards.length) {
    fail(6, k(toProjectPath(page.file)),
      `OPA2 카드 제목(<h3>OPA2_…) ${cardTitleCount}개 ≠ 파싱한 카드 ${cards.length}장 — 카드 마크업(<div class="card">…)을 확인하세요`);
  }

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
      fail(6, k(card.title || '(제목 없음)'), '카드 제목에서 OPA2 번호를 읽을 수 없습니다');
      continue;
    }
    if (cardsByNumber.has(card.number)) fail(6, k(card.number), '같은 번호의 카드가 두 장 이상입니다');
    cardsByNumber.set(card.number, card);
  }

  // 5. 페이지 대상 API 마다 카드
  for (const ep of list) {
    if (!page.includes(ep)) continue;
    if (!ep.opaCode) {
      fail(5, k(ep.id), 'opaCode 가 없어 에러 코드 카드와 대응할 수 없습니다');
      continue;
    }
    if (!cardsByNumber.has(ep.opaCode)) fail(5, k(ep.opaCode), `에러 코드 카드가 없습니다 (${ep.method} ${ep.path})`);
  }

  for (const card of cards) {
    if (!card.number) continue;
    const key = k(card.number);
    const eps = byOpa.get(card.number) || [];

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

    // 6. 페이지 대상 밖 API 의 카드 금지 (공개 페이지의 멤버·그룹·fullOnly)
    if (!page.includes(ep)) {
      fail(6, key, `이 페이지의 대상(${page.target})이 아닌 API 의 카드입니다 (${ep.id} — group ${ep.group}${ep.fullOnly ? ', fullOnly' : ''})`);
    }

    // 7. 메서드·경로
    if (card.method.toUpperCase() !== String(ep.method).toUpperCase()) {
      fail(7, key, `메서드 불일치: 카드 ${card.method} / 테스터 ${ep.method}`);
    }
    if (normalizeApiPath(card.ep) !== normalizeApiPath(ep.path)) {
      fail(7, key, `경로 불일치: 카드 ${card.ep} / 테스터 ${ep.path}`);
    }

    // 8. 코드 집합 + 공통 코드 메시지
    const cardPairs = card.rows.map((r) => [r.code, r.message]);
    const testerPairs = ((ep.exampleResponse && ep.exampleResponse.errors) || [])
      .map((e) => [String(e.body && e.body.code), String(e.body && e.body.ErrorMessage)]);
    const cardMsgs = groupMessages(cardPairs);
    const testerMsgs = groupMessages(testerPairs);

    // 8-1. 행 중복 (D-4) — 집합 비교만으로는 같은 행을 두 번 넣고 .cnt를 맞추면 통과했다.
    //  - 코드·Enum·메시지가 모두 같은 행은 금지
    //  - (코드, 메시지) 행 수는 테스터 errors 의 같은 (코드, 메시지) 개수를 넘을 수 없다.
    //    테스터는 같은 코드·메시지를 HTTP 상태별로 두 번 둘 수 있고(OPA2_008 4000070 등) 카드는 상태 열이 없어 한 번만 둔다 → 적은 것은 허용.
    //    같은 코드가 다른 메시지로 두 번 나오는 것(4010001 ×2 등)은 (코드, 메시지)가 달라 영향이 없다
    const rowCounts = countBy(card.rows.map((r) => `${r.code} | ${r.enumName} | ${r.message}`));
    for (const [k, n] of rowCounts) if (n > 1) fail(8, key, `같은 행이 ${n}번 있습니다: ${k}`);
    const cardPairCounts = countBy(cardPairs.map(([c, m]) => `${c} | ${m}`));
    const testerPairCounts = countBy(testerPairs.map(([c, m]) => `${c} | ${m}`));
    for (const [k, n] of cardPairCounts) {
      const t = testerPairCounts.get(k) || 0;
      if (t > 0 && n > t) fail(8, key, `카드에 ${n}행, 테스터 errors 에 ${t}건: ${k}`);
    }
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

function countBy(keys) {
  const map = new Map();
  for (const k of keys) map.set(k, (map.get(k) || 0) + 1);
  return map;
}

function groupMessages(pairs) {
  const map = new Map();
  for (const [code, msg] of pairs) {
    if (!map.has(code)) map.set(code, new Set());
    map.get(code).add(msg);
  }
  return map;
}

// ── 10. Prod/Full 페이지 전용 블록 ────────────────────────────────
// api-list.js 로드 태그 바로 다음의 인라인 <script> 블록 하나가 페이지 전용 블록이다.
const PAGE_BLOCK_RE = /(<script src="\/assets\/js\/openapi\/api-list\.js"><\/script>\r?\n)(<script>\r?\n([\s\S]*?)<\/script>\r?\n)/;

function runPageBlock(code, list, filePath) {
  const context = vm.createContext({ API_LIST: JSON.parse(JSON.stringify(list)), window: {} });
  new vm.Script(code, { filename: toProjectPath(filePath) }).runInContext(context, { timeout: 1000 });
  return { list: context.API_LIST, window: context.window };
}

function checkTesterPages(list) {
  const prodKey = toProjectPath(PROD_HTML_PATH);
  const fullKey = toProjectPath(FULL_HTML_PATH);
  const prodHtml = readText(PROD_HTML_PATH);
  const fullHtml = readText(FULL_HTML_PATH);
  const prodMatch = prodHtml.match(PAGE_BLOCK_RE);
  const fullMatch = fullHtml.match(PAGE_BLOCK_RE);
  if (!prodMatch) fail(10, prodKey, 'api-list.js 로드 직후의 숨김 블록(<script>…</script>)을 찾을 수 없습니다');
  if (!fullMatch) fail(10, fullKey, 'api-list.js 로드 직후의 페이지 전용 블록(<script>…</script>)을 찾을 수 없습니다');

  if (prodMatch) {
    const code = prodMatch[3];
    const codeOnly = code.replace(/\/\/.*$/gm, ''); // 주석의 낱말은 조건으로 치지 않는다
    for (const token of ["group === '멤버'", "group === '그룹'", '.fullOnly']) {
      if (!codeOnly.includes(token)) fail(10, prodKey, `숨김 블록에 ${token} 조건이 없습니다 — isProdVisible 과 함께 고치세요`);
    }
    try {
      const after = runPageBlock(code, list, PROD_HTML_PATH).list;
      const shown = new Set(after.map((ep) => ep.id));
      const expected = new Set(list.filter(isProdVisible).map((ep) => ep.id));
      for (const id of expected) if (!shown.has(id)) fail(10, prodKey, `isProdVisible 은 공개인데 Prod 가 숨기는 API: ${id}`);
      for (const id of shown) if (!expected.has(id)) fail(10, prodKey, `Prod 에 보이는데 isProdVisible 은 비공개인 API: ${id}`);
    } catch (error) {
      fail(10, prodKey, `숨김 블록을 실행할 수 없습니다: ${error.message}`);
    }
  }

  if (fullMatch) {
    try {
      const result = runPageBlock(fullMatch[3], list, FULL_HTML_PATH);
      if (result.list.length !== list.length) fail(10, fullKey, `페이지 전용 블록이 API_LIST 를 바꿉니다 (${list.length} → ${result.list.length})`);
      if (result.window.API_ERROR_CODES_PAGE !== INTERNAL_PAGE_URL) {
        fail(10, fullKey, `window.API_ERROR_CODES_PAGE 가 '${INTERNAL_PAGE_URL}' 이 아닙니다 (${JSON.stringify(result.window.API_ERROR_CODES_PAGE)})`);
      }
    } catch (error) {
      fail(10, fullKey, `페이지 전용 블록을 실행할 수 없습니다: ${error.message}`);
    }
  }

  if (prodMatch && fullMatch) {
    const strip = (html, m) => (html.slice(0, m.index) + m[1] + html.slice(m.index + m[0].length)).split(/\r?\n/);
    const a = strip(fullHtml, fullMatch);
    const b = strip(prodHtml, prodMatch);
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) {
        fail(10, `${fullKey} ↔ ${prodKey}`,
          `페이지 전용 블록 밖에서 두 HTML 이 다릅니다 (블록 제외 ${i + 1}행 — UI 수정은 두 파일에 똑같이)`);
        break;
      }
    }
  }
}

// ── 12. 공개·내부 공통 카드 동일 ──────────────────────────────────
function checkSharedCards(publicCards, internalCards) {
  const internalByNumber = new Map(internalCards.filter((c) => c.number).map((c) => [c.number, c]));
  const rowText = (r) => `${r.code} | ${r.enumName} | ${r.message}`;
  for (const pub of publicCards) {
    if (!pub.number) continue;
    const key = `[공개↔내부] ${pub.number}`;
    const inner = internalByNumber.get(pub.number);
    if (!inner) {
      fail(12, key, '공개 페이지 카드가 내부 페이지에 없습니다');
      continue;
    }
    if (pub.title !== inner.title) fail(12, key, `제목이 다릅니다: 공개 "${pub.title}" / 내부 "${inner.title}"`);
    if (pub.method !== inner.method || pub.ep !== inner.ep) {
      fail(12, key, `메서드·경로가 다릅니다: 공개 ${pub.method} ${pub.ep} / 내부 ${inner.method} ${inner.ep}`);
    }
    const a = pub.rows.map(rowText);
    const b = inner.rows.map(rowText);
    const n = Math.max(a.length, b.length);
    for (let i = 0; i < n; i++) {
      if (a[i] !== b[i]) {
        fail(12, key, `${i + 1}번째 행이 다릅니다: 공개 ${a[i] === undefined ? '(없음)' : a[i]} / 내부 ${b[i] === undefined ? '(없음)' : b[i]}`);
        break;
      }
    }
  }
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
          fail(11, toProjectPath(file), `${i + 1}행에 '${FORBIDDEN_STRING}' (SSO 구성원 조회 API 는 테스터·에러 코드 페이지 어디에도 넣지 않는다)`);
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
  const parsed = new Map(); // page.key -> { cards, cardTitleCount }
  try {
    list = loadGlobal(API_LIST_PATH, 'API_LIST');
    specs = loadGlobal(API_SPECS_PATH, 'API_SPECS');
    for (const page of ERROR_CODE_PAGES) {
      const html = readText(page.file);
      parsed.set(page.key, { cards: parseCards(html), cardTitleCount: (html.match(CARD_TITLE_RE) || []).length });
    }
  } catch (error) {
    console.error(`데이터를 읽을 수 없습니다: ${error.message}`);
    process.exitCode = 1;
    return;
  }

  checkTesterData(list, specs);
  for (const page of ERROR_CODE_PAGES) {
    const { cards, cardTitleCount } = parsed.get(page.key);
    checkErrorCodePage(page, list, cards, cardTitleCount);
  }
  checkTesterPages(list);
  checkSharedCards(parsed.get('공개').cards, parsed.get('내부').cards);
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

  console.log('API 데이터 정합성 점검 (check:api)');
  console.log(`- API_LIST ${list.length}개 (fullOnly ${list.filter((e) => e.fullOnly).length}개, Prod 표시 ${list.filter(isProdVisible).length}개), API_SPECS ${Object.keys(specs).length}개`);
  for (const page of ERROR_CODE_PAGES) {
    const { cards } = parsed.get(page.key);
    const rows = cards.reduce((sum, c) => sum + c.rows.length, 0);
    console.log(`- ${page.key} 에러 코드 페이지 ${toProjectPath(page.file)}: 카드 ${cards.length}장, 행 ${rows}개 (대상: ${page.target} ${list.filter(page.includes).length}개)`);
  }
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
  console.log('\n실패 없음 (12개 검사 통과)');
}

main();
