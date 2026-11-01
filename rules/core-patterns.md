## 핵심 패턴

### eformsign API 인증 (ECDSA 서명)

```javascript
// 1. 타임스탬프로 서명 생성
const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
sig.init(keyObj);
sig.updateString(execTime.toString());
const signature = sig.sign();

// 2. Access Token 요청
fetch(`${domain}/v2.0/api_auth/access_token`, {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + btoa(apiKey),
        'eformsign_signature': signature
    },
    body: JSON.stringify({ execution_time: execTime, member_id: memberId })
});
```

> **브라우저 도구에서 토큰 발급 시**: 위 direct fetch를 그대로 복사하지 말고 공유 모듈 `assets/js/token-issuer.js`의 `window.issueAccessToken({ domain, apiKey, memberId, signature, execTime })`를 사용한다. CORS/네트워크 전송 실패 시에만 `/api/getToken` 서버 프록시로 자동 fallback하며(인증거부는 즉시 최종 실패), 반환값 `{ ok, token, data, message, via, status, issuedAt, expiresAt, expiresIn, expiresEstimated }`의 `data`로 `refresh_token`·`company_id` 등 원본 응답을 추출할 수 있다. `expiresAt`은 응답 `oauth_token.expires_in`(초)이 있으면 발급 시각 + expires_in, 없으면 + 3600초로 추정하고 `expiresEstimated: true`. 실패 시 `message`는 `[코드] 메시지` 형식. 서명 생성은 각 페이지가 담당하고 모듈에는 계산된 서명값만 전달한다(비밀키 브라우저 이탈 없음).
>
> **토큰 직접 호출 금지**: `api_auth/access_token`을 `fetch`/`axios`/`$.ajax`로 직접 부르지 않는다. 적용 페이지: DocumentInfo·DocumentDownload·listdocuments·DocumentSendImprove·KogasDocumentSend·임베딩 2종·DocumentDelete·templateDeletetool·webhook·MassDocumentDowmload·MemberV2(`member/api.js`)·OpenAPITester(`openapi/ui.js`)·AutoTest(`OpenAPIAutoTest.js`). 남은 직접 호출은 레거시 페이지(`Embedding/*_update*`, `template_create_update*`, `API(JS,HTML)/js/MemberMain.js`)뿐이다(P1-24 정리 대상).
>
> **토큰 상태 배지 `assets/js/token-badge.js`**: `TokenBadge.attach(el, result, { onReissue, onExpire })`로 "토큰 유효 · 47분 남음 · via proxy" / "곧 만료"(5분 이하) / "만료됨 · [토큰 재발급]"을 표시한다. 1분 간격 클라이언트 타이머(서버 호출 없음). API가 401을 주면 `TokenBadge.markExpired(el)`, 토큰 초기화 시 `TokenBadge.clear(el)`. 테스트용 `TokenBadge.setExpiresAt(el, ts)`. 로드 순서: `token-issuer.js` → `token-badge.js` → 페이지 스크립트(MemberV2는 `member/api.js`보다 앞, OpenAPITester는 `openapi/api-list.js`보다 앞, AutoTest는 `OpenAPIAutoTest.js`보다 앞).

### 결과 패널 공유 모듈 (`assets/js/result-panel.js`)

API 도구의 결과 영역은 `<pre>`를 직접 만들지 말고 `window.ResultPanel`을 쓴다(IIFE, 의존성 없음 — jQuery 없는 페이지도 가능).

- `ResultPanel.render(el, data, { title, filename, meta, status, statusText, collapsed })` — JSON(또는 문자열)을 **textContent**로 렌더링하고 헤더에 [복사]·[JSON 다운로드]·[접기] 버튼을 붙인다. 다운로드 파일명은 `<filename>_<YYYYMMDD_HHmmss>.json`. `el`은 요소·셀렉터·jQuery 객체 모두 허용.
- `ResultPanel.renderStatus(el, message, meta)` — "조회 중..." 같은 진행 문구.
- `withLoading(btn, asyncFn)` (= `ResultPanel.withLoading`) — 실행 중 버튼 `disabled` + "처리 중…", 끝나면 원래 자식 노드로 복원. 이미 실행 중이면 `asyncFn`을 호출하지 않으므로 빠른 연속 클릭에도 요청은 1건이다. `onclick="withLoading(this, fn)"` 형태로 쓰고, `fn`은 요청이 끝날 때까지 기다리는 Promise를 반환해야 한다.
- `ResultPanel.renderDocumentLinks(el, documentId)` — "생성된 문서 ID: xxx [복사] [문서 정보 조회 →] [다운로드 →]". 링크는 `/API(JS,HTML)/DocumentInfo.html?document_id=xxx`, `/API(JS,HTML)/DocumentDownload.html?document_id=xxx`(새 탭). 두 페이지는 `?document_id=` 쿼리로 입력란을 프리필한다.
- 적용: `API(JS,HTML)/{DocumentInfo,listdocuments,DocumentDownload,DocumentSendImprove}.html`, `Embedding/embedding_doc_Integration.html`(성공 시 `alert()` 대신 페이지 내 박스).
- 로드 순서: `token-issuer.js` 바로 다음(페이지 인라인 스크립트보다 앞).
- DocumentDownload는 direct 호출이 CORS/네트워크로 실패하면 `/api/downloadDocument` 프록시로 재시도하고(결과 배지 `via proxy`), 확장자는 content-type으로 추론한다. 프록시는 Vercel 응답 한도(약 4.5MB)를 넘는 파일을 전달하지 못한다.

### CSV 내보내기 공유 모듈 (`assets/js/csv-export.js`)

표 데이터를 CSV로 내려받을 때는 직접 문자열을 조립하지 말고 `window.CsvExport`를 쓴다(IIFE, 의존성 없음).

- `CsvExport.download(prefix, headers, rows)` → `<prefix>_<YYYYMMDD_HHmmss>.csv`. **UTF-8 BOM**을 붙여 Excel에서 한글이 깨지지 않고, 줄 구분은 CRLF.
- 모든 값을 큰따옴표로 감싸고(내부 `"`는 `""`), `=`·`+`·`-`·`@`·탭·CR로 시작하는 값 앞에 `'`를 붙여 **CSV 수식 주입**을 막는다(문서 제목·템플릿 이름은 외부 데이터).
- `CsvExport.build(headers, rows)`(BOM 없는 문자열), `CsvExport.formatDate(epochMs)` → `YYYY-MM-DD HH:mm:ss`(로컬, 잘못된 값은 `''`).
- 적용: `API(JS,HTML)/listdocuments.html`(현재 페이지 5열), `utils/DocumentDelete.html`·`utils/templateDeletetool.html`(대상 CSV·결과 CSV). 테스트: `test/csv-export.test.js`.

### 일괄 삭제 도구 안전장치 (`utils/DocumentDelete.html`, `utils/templateDeletetool.html`, P1-06)

- 조회 후 **미리보기 표**(문서: #·ID·제목·상태·생성일 / 템플릿: #·ID·이름·카테고리·생성일·수정일)와 [대상 CSV 다운로드].
- `confirm()`을 쓰지 않는다. 확인 모달에서 **삭제 건수를 정확히 입력**해야 [삭제 실행]이 활성화된다(문서는 휴지통·완전 삭제 모두, 템플릿은 항상).
- [중지]는 플래그만 세운다. 문서는 배치(100건) 사이·대기 중, 템플릿은 다음 요청 전·20건 대기 중에 확인하며 **진행 중 요청은 완료를 기다린다**.
- 대상별 결과를 `deleteResults`에 남겨 [결과 CSV](ID·결과 `성공`/`실패`/`미실행`·에러 코드·메시지)를 제공한다. 문서 `fail_result` 항목은 ID 문자열/객체 모두 해석하고, 응답 어디에도 없는 ID는 `실패`("응답에 결과가 없음")로 둔다.
- 진행 문구는 항상 `pct% (n / total)`. DocumentDelete는 상태 체크박스가 0개면 요청 없이 "상태를 1개 이상 선택하세요"를 표시한다.
- 기본 종료일은 로컬 날짜로 채운다(`toISOString()`은 UTC라 KST 09시 전에는 어제가 된다).

### API 에러 표시 공유 모듈 (`assets/js/api-error.js`)

eformsign API·허브 프록시의 에러 응답은 raw JSON 대신 `window.renderApiError(container, info)`로 보여 준다(IIFE, jQuery 불필요, 모든 외부 문자열 textContent).

- `info`: `{ status, bodyText | body, url, title, append }` — HTTP 에러 / `{ error, url }` — fetch reject(네트워크·CORS).
- 표시: 한 줄 요약 `HTTP 400 · [코드] 메시지` + [에러 코드 찾아보기 →](`/utils/error-codes.html?q=<코드>`) + [원본 응답 보기] 토글(JSON은 pretty-print, 아니면 앞 300자).
  401이면 토큰 재발급 안내, `Failed to fetch`류면 "CORS 차단, 도메인 오타, 네트워크 문제" 안내 + `/utils/CorsTest.html` 링크.
- 코드·메시지 키 탐색 순서: `code`, `error_code`, `ErrorMessage`, `message`, `error.message` (허브 프록시의 `error.upstream`, `error.error`도 지원).
- 부가 API: `ApiError.parse(info)`(렌더링 없이 요약), `ApiError.fromResponse(container, res, {url})`, `ApiError.isNetworkError(err)`, `ApiError.lookupUrl(code, {absolute})`.
- **상태 코드를 먼저 확인한 뒤 본문을 파싱**한다(`res.text()` → `!res.ok`면 renderApiError → 그다음 `JSON.parse`). HTML 502 게이트웨이 페이지에서 SyntaxError가 나지 않게 하기 위함.
- 적용: DocumentInfo·DocumentSendImprove(전송·템플릿 조회)·listdocuments·DocumentDownload·webhook(문서 정보 조회)·OpenAPITester(`#responseNotice`)·MemberV2(결과 영역 위 `.member-api-error`, `showApiErrorSummary()`)·AutoTest(리포트 실패/CHECK 상세의 에러 코드 링크).
- 에러 코드 딥링크: `utils/error-codes.html?q=<검색어>`(검색창 채움 + 필터, 0건 카드 숨김, 입력 시 `?q=` URL 동기화), `#code-<코드>`(해당 행으로 스크롤·하이라이트, 같은 코드의 두 번째 이후 행은 `code-<코드>-2`…). 각 행에 [링크 복사] 버튼. 엔드포인트·항목 수는 DOM에서 계산한다.

### 환경 도메인

```javascript
const DOMAINS = {
    op_saas: 'https://kr-api.eformsign.com',
    csap:    'https://www.gov-eformsign.com/Service'
};
```

### 인증 보호 페이지 패턴 (DB 기반, 현행)

- `/app/:path*` → `auth-middleware.js` → DB에서 `protected_pages` 조회 → JWT 검증 → role 체크 → HTML 서빙
- JWT 액세스 토큰: 1시간 (`auth_token` httpOnly 쿠키)
- 리프레시 토큰: 7일 (`refresh_token` httpOnly 쿠키, DB 저장, 사용 시마다 로테이션)
- 미인증: `/auth/login.html?next=<page>` 리다이렉트
- 권한 부족: `/auth/403.html`
- 강제 비밀번호 변경 필요: `/auth/change-password.html?next=<page>` — 로그인(`login.js`)과 `/app/*`(`auth-middleware.js`)가
  검증된 `next`를 넘기고, 변경 페이지는 `safeNext`로 다시 검증한 뒤 변경 성공 시 그 경로로 바로 이동한다(P1-13).
  변경 API가 세션을 재발급하므로(아래 "비밀번호 변경") 재로그인이나 변경 페이지 재진입 없이 원래 페이지가 열린다.
- 자발적 비밀번호 변경: `auth-status.js` 사용자 영역의 [비밀번호 변경] 버튼 → `/auth/change-password.html?next=<현재 경로>`
  (현재 비밀번호 확인 필요, [변경하지 않고 돌아가기] 링크 제공)

### 세션 갱신 / 리프레시 토큰 로테이션 (경합 안전)

액세스 토큰(1h)이 만료되면 `refresh_token`(7d)으로 새 액세스 토큰을 발급하며, 리프레시 토큰도 함께 로테이션한다(활성 사용자는 7일 슬라이딩 세션). 동시 갱신 경합으로 인한 오(誤)로그아웃을 막기 위해 아래 패턴을 사용한다.

- **공통 함수**: `auth-middleware.js`의 `tryRefreshToken(sql, refreshToken, res, isSecure)` 가 정본. `me.js`, `auth-middleware`(/app/*), `refresh.js`(/api/refresh), `_shared/session.js`가 모두 이 함수를 공유한다. (`refresh.js`는 자체 로테이션 로직 없이 위임만)
- **원자적 단일 승자(claim)**: 단일 SQL문(CTE)으로 `UPDATE … SET revoked_at=now(), replaced_by=<신규ID> WHERE token_hash=:h AND revoked_at IS NULL AND expires_at>now()` 후 신규 토큰 INSERT까지 한 번에 처리. 행을 반환받은 요청만 "승자"가 되어 `auth_token`+`refresh_token` 두 쿠키를 모두 세팅한다. (Neon http 드라이버는 autocommit이라 다중 statement 트랜잭션이 없으므로, 정확성은 이 단일 원자적 UPDATE에 의존)
- **grace 패자**: claim 0행이면 재조회 — `replaced_by IS NOT NULL AND revoked_at > now() - interval '30 seconds'`(=형제 갱신에 30초 내 진 경우)면 **새 액세스 JWT만 발급하고 refresh 쿠키는 건드리지 않는다**(승자가 이미 세팅 → 쿠키 클로버링 방지). 그 외(없음/만료/`replaced_by IS NULL`)는 `null`.
- **로그아웃 토큰 차단**: `logout.js`는 `replaced_by` 없이 `revoked_at`만 세팅하므로, grace 조건의 `replaced_by IS NOT NULL`이 로그아웃된 토큰의 재인증을 자동 차단한다.
- **데이터 API 갱신-인지(refresh-aware)**: `_shared/session.js`의 `resolveUser(req, res)` 는 `auth_token` 검증 → 만료 시 `tryRefreshToken` 호출. 실패 시 `null`만 반환하고 응답하지 않는다.
- **역할 인가 `requireRole(req, res, minRole, options)`** (`_shared/session.js`): 인증이 필요한 **모든 API**의 정본.
  `resolveUser` → `_shared/roles.js`의 `loadUserState()`로 `users`의 `role`/`is_active`/`must_change_password`를 1회 조회 →
  **JWT의 role이 아니라 DB의 현재 role로** 판단한다. 실패 시 응답까지 보내고 `null` 반환
  (세션 없음 401 `AUTH_REQUIRED` / 비활성·삭제 401 `TOKEN_INVALID` / 임시 비밀번호 403 / 역할 부족 403).
  성공 시 `{ sub, role(DB), mustChangePw, username, email }` 반환.
  - 사용처: `admin*.js` 5종(`'admin'`), `developer-notes.js`·`bug-reports.js` 관리 경로(`'admin'`), 버그 제보·내 제보(`'user'`),
    `credentials.js`·`requestHistory.js`(`'user'`), `notifications.js`·`pusher-auth.js`·`change-password.js`(`'user'`, `allowMustChangePassword: true`)
  - 컨트롤러에 `jwt.verify` 기반 로컬 `requireAdmin`을 새로 만들지 말 것 — 1시간 후 401(재로그인 강요)과 강등 미반영이 재발한다.
  - `/app/*`(`auth-middleware.js`)와 `/api/me`도 같은 DB 상태를 기준으로 role·활성·임시 비밀번호를 판단한다.
- **권한 변경 즉시 반영**: `PUT /api/admin/users/:id`에서 role 변경·비활성화 시 대상의 refresh 토큰을 폐기한다(`replaced_by` 없이 `revoked_at`만 → grace 차단).
  API 권한은 `requireRole`이 매 요청 DB로 판단하므로 즉시 반영되고, 액세스 토큰 만료 후에는 재로그인으로 JWT도 갱신된다.
  본인 강등·비활성화와 마지막 활성 admin 강등·비활성화는 400(DELETE와 동일 정책).
- **클라이언트 single-flight**: `auth-status.js`/`credential-panel.js`/`openapi/state.js`가 `window.AUTH_STATUS_ME_PROMISE = window.AUTH_STATUS_ME_PROMISE || …` 멱등 가드로 `/api/me` 부트스트랩을 1회로 공유하고, `navigator.locks.request('eform-auth-bootstrap', …)`로 탭 간 직렬화한다(미지원 시 lock 없이 진행 — 서버 원자성이 정확성 보장).
- **로그아웃 graceful 처리**: 같은-오리진 `/api/*` 호출이 갱신 후에도 401이거나(=리프레시 만료) `visibilitychange`/`focus` 재확인에서 `authenticated:false`면 `window.handleAuthExpired()`(auth-status.js)가 1회 처리한다. (interval 폴링은 쓰지 않음 — Neon idle suspend 유지)
  - **입력 보존 (P1-21)**: 페이지가 `window.AUTH_STATUS_HAS_UNSAVED = function () { return 미저장 입력 있음; }`을 등록했고 `true`를 반환하면
    자동 새로고침하지 않고 상단 고정 배너 "세션이 만료되었습니다 … [새 탭에서 로그인] [새로고침]"(`#asbSessionExpiredBanner`)을 띄운다.
    [새 탭에서 로그인]은 `/auth/login.html?next=/auth/login-complete.html`을 새 탭으로 연다(완료 페이지: "이 탭을 닫고 돌아가세요").
    원래 탭으로 돌아오면 `focus`/`visibilitychange` 재확인이 `authenticated:true`를 보고 배너를 닫고 사용자 영역·알림을 다시 붙인다(쿠키 공유 → 그대로 저장 가능).
    단, **만료 전과 다른 아이디로 로그인했으면**(`authStatusCurrentUser.username` 비교) 배너를 닫지 않고 "다른 계정으로 로그인되었습니다 —
    이 탭은 A 계정으로 작업하던 화면… 계속하면 B 계정으로 저장" 문구와 [B 계정으로 계속]을 보여 준다(D-7). 누르기 전에는 사용자 영역을 바꾸지 않는다.
    [새로고침]은 미저장 입력이 있으면 한 번 더 확인한다. 훅이 없거나 `false`·미정의면 기존처럼 안내 토스트 후 1.2초 뒤 `location.reload()`.
    훅이 예외를 던지면 입력 보호를 위해 "미저장 있음"으로 본다. 등록 페이지: `private/Admin.html`(버그 답변 패널이 렌더링 때 값과 다름 · 열린 모달에 입력값),
    `community/developer-notes.html`(편집기 변경), `community/bug-report.html`(제출 전 제보 글), `private/MemberV2.html`(C6 담당).
  - **탭 복귀 재확인 1회**: `visibilitychange`와 `focus`가 연달아 와도 진행 중인 `/api/me` promise를 공유하고, 끝난 뒤 1초 안의 재요청은 건너뛴다 → 탭 복귀 1회당 `/api/me` 1건.
  - Admin 콘솔의 목록 로드 401은 로그인 페이지로 바로 이동하지 않고 `onAuthLost()` → `handleAuthExpired()`로 넘긴다. 버그 답변 저장이 401이면 입력을 그대로 두고 안내한다.
    작성 중인 답변이 있으면 목록 새로고침·다른 리포트 선택·필터 변경 전에 확인하고, 탭을 다시 열어도 다시 그리지 않는다.
- **마이그레이션**: `refresh_tokens.replaced_by UUID` 컬럼 필요. `scripts/migrate-refresh-rotation.js`로 추가(멱등). **반드시 코드 배포 전에 실행** — 없으면 claim/grace 쿼리가 실패해 갱신 전체가 막힌다.

```javascript
// controllers/_shared/auth-middleware.js 처리 흐름
// 1. protected_pages DB 조회 (path, is_active)
// 2. auth_token JWT 검증
//    만료 시 → refresh_token으로 갱신 (로테이션)
// 3. mustChangePw 확인
// 4. role 계층 체크: admin > manager > user
// 5. file_path HTML 서빙 + audit_logs INSERT
```

### 로그인 실패 잠금 · 계정 열거 완화 (`controllers/login.js`, P0b-01)

- 연속 5회 실패 시 30분 잠금(`MAX_FAILED_LOGINS`, `LOCK_MINUTES`). 실패 카운트는 **단일 UPDATE**
  (`failed_login_count = COALESCE(failed_login_count,0) + 1 … RETURNING`)로만 올린다 — 동시 요청이 같은 값을 읽고
  덮어쓰던 read-modify-write 금지. 이미 잠긴 동안의 실패는 카운트·잠금 시각을 바꾸지 않고(연장 없음),
  잠금 만료 후 첫 실패는 1부터 다시 센다. 성공 로그인 시 0으로 초기화.
- 없는 아이디도 `DUMMY_PASSWORD_HASH`(`_shared/password.js`)로 scrypt를 1회 돌리고 같은 실패 UPDATE(0행)를 실행한다.
  없는 아이디·틀린 비밀번호의 실패 응답은 모두 `error=invalid`.
- **잠긴 계정은 비밀번호 정오와 무관하게 `error=invalid`** (D-1). scrypt 1회·실패 UPDATE(잠금 중이라 값 변화 없음)·
  `login_failed` 감사 로그(`reason: 'locked'`)까지 오답과 똑같은 경로를 탄다. 잠금 중 정답에만 다른 응답을 주면
  30분 동안 무제한 추측하다 응답이 바뀌는 순간 정답을 아는 오라클이 되고, `error=locked`를 항상 주면
  아무 아이디나 5회 틀려 잠근 뒤 응답으로 계정 존재를 확인할 수 있으므로 둘 다 쓰지 않는다.
  잠금 가능성은 `auth/login.html`의 공통 실패 문구("5회 연속 실패하면 30분 제한…")로만 안내한다.
  (`error=locked`는 서버가 더 이상 보내지 않으며 화면은 예전 링크 호환용으로 같은 문구를 표시)
- `error=inactive`는 **잠기지 않은 계정에서 비밀번호가 맞을 때만** 보낸다. 정답 여부가 드러나는 정도는 활성 계정의
  로그인 성공과 같고, 틀린 시도는 같은 카운터로 5회 후 잠긴다(잠긴 뒤에는 위 규칙대로 `invalid`).
- 아이디 50자·비밀번호 256자를 넘으면 DB·scrypt 없이 `error=invalid`.
- **승인 대기 안내 `error=pending` (P1-13)**: `users`에 없는 아이디이고 `signup_requests`에 `pending` 신청이 있으며
  **비밀번호가 신청 때 비밀번호(`signup_requests.password_hash`)와 일치할 때만** 보낸다. 비밀번호를 모르면 `invalid`와
  구별되지 않으므로 가입 신청 존재 여부는 드러나지 않는다. 가입 대기 조회는 `users` 조회와 `Promise.all`로 **항상** 함께
  실행하고(쿼리 순서 동일), 더미 해시 대신 신청 해시로 scrypt를 1회 돌린다(비용 동일). 그 아이디의 최근 30분 `login_failed`
  감사 로그(`pending_approval` 제외)가 5건 이상이면 정답이어도 `invalid`(잠금과 같은 D-1 원칙 — 무제한 추측 오라클 방지).
  화면은 "가입 승인 대기 중" 문구와, 이 브라우저에서 가입했다면(`localStorage['eform-signup-request-id']`) 상태 확인 링크를 보여 준다.
  **pending 시도 제한은 비원자적이다(D-5)** — audit_logs 건수를 읽고 판단하므로 동시 요청은 모두 같은 건수를 보고 통과한다(검증 시 동시 10건 모두 통과).
  계정 잠금처럼 단일 UPDATE 카운터가 없어서이며, 동시 대량 추측은 아래 IP 단위 WAF 제한으로 막는다(**WAF는 아직 미적용** — 사용자 작업).
- 로그인 실패 후 아이디 유지: `auth/login.html`이 제출 시 아이디를 **sessionStorage**(`eform-login-username`)에만 두고
  `?error=`로 돌아오면 채운다(URL·서버 로그에 아이디를 싣지 않음, 비밀번호는 저장하지 않음). 로그인 화면에 회원가입 링크가 있다.
- IP 단위 제한은 코드가 아니라 **Vercel WAF rate limit** 규칙으로 건다(대시보드 설정, 사용자 작업).
  권장: `POST /api/login` IP당 10회/60초 초과 시 429(또는 Deny 10분), `POST /api/signup`·`/api/password-reset-request`
  IP당 5회/10분. Firewall 규칙은 배포와 별개라 코드 머지만으로는 적용되지 않는다.
- **비밀번호 재설정 요청 응답 시간 맞춤 (D-6)**: `controllers/password-reset-request.js`는 모든 200 응답을 요청 시작부터
  최소 `MIN_RESPONSE_MS`(500ms)가 지난 뒤 보낸다. 있는 계정은 INSERT·감사 로그·알림 INSERT·Pusher를 기다리고 없는 계정은
  SELECT 1건이라, 그대로면 응답 시간으로 계정 존재가 드러난다. 알림을 응답 뒤로 미루는(fire-and-forget) 방식은
  Vercel 서버리스가 응답 후 남은 Promise를 끊을 수 있어 쓰지 않고, "없는 계정도 같은 쿼리 실행"은 Pusher 왕복까지 흉내 낼 수 없어
  고정 하한(await 지연)을 택했다. 처리가 500ms를 넘는 드문 경우(Pusher 지연)에는 차이가 남는데, `POST /api/signup` 409가
  이미 아이디 존재를 알려 주므로 수용한다. 테스트: `test/password-reset-timing.test.js`.

### 비밀번호 변경 (`controllers/change-password.js`, P0b-02)

- 인증은 `requireRole(req, res, 'user', { allowMustChangePassword: true })` (refresh 인지·비활성 즉시 차단).
- `GET /api/change-password` → `{ requiresCurrentPassword }`. `auth/change-password.html`이 이 값으로 현재 비밀번호 입력란을 보인다.
- 일반 변경(`must_change_password=false`)은 `currentPassword` 필수. 틀리면 400이고 **로그인과 같은 실패 카운터**
  (`_shared/password.js`의 `recordFailedLogin`)를 올린다 → 5회면 30분 잠금. 잠긴 동안은 검증 없이 403.
- 임시 비밀번호 강제 변경(`must_change_password=true`)은 방금 그 비밀번호로 로그인했으므로 `currentPassword`를 요구하지 않는다.
- 새 비밀번호가 현재(임시) 비밀번호와 같으면 400. 길이 8~256자.
- 성공 시 `failed_login_count`·`locked_until` 초기화 + **현재 세션을 뺀** 이 사용자의 refresh 토큰을 모두 폐기한다
  (`replaced_by` 없이 `revoked_at`만 → grace 차단). 현재 세션 = 요청 쿠키의 refresh 토큰 + 같은 요청에서 로테이션됐다면 그 후속 토큰.
  다른 기기의 액세스 토큰(최대 1시간)은 만료 전까지 남는다.
- **세션 재발급 (P1-13)**: 다른 세션 폐기 **다음에** 현재 세션을 다시 발급한다(`reissueSession`).
  요청 쿠키의 refresh 토큰을 `tryRefreshToken`(auth-middleware 정본, 원자적 claim)으로 로테이션해 새 `refresh_token` 쿠키를 내보내고,
  `auth_token`은 `mustChangePw:false`로 다시 서명해 덮어쓴다. 같은 요청에서 `requireRole`이 이미 로테이션했다면(액세스 토큰 만료)
  그 refresh 쿠키를 그대로 두고 `auth_token`만 바꾼다(이중 로테이션·쿠키 중복 없음). 실패 응답에는 쿠키를 새로 발급하지 않는다.
- 클라이언트 에러 표시: 서버 에러는 `{ error: { message, reason, action } }` 객체다. 화면은 문자열로 바꿔 보여 준다
  (`auth/*.html`은 message·reason, `private/Admin.html`은 공용 `errorMessage(xhr)` — message → reason → action 순). `xhr.responseJSON?.error`를
  그대로 문자열로 쓰지 않는다(`[object Object]`).
- 회원가입 중복은 409 `VALIDATION_FAILED` + "이미 사용 중인 아이디입니다." / "이미 사용 중인 이메일입니다."

### 역할(Role) 계층

```
admin   → 모든 /app/* 접근 가능
manager → required_role이 'manager' 또는 'user'인 페이지
user    → required_role이 'user'인 페이지만
```

### 보호 페이지 동적 관리

보호 페이지 설정은 `protected_pages` DB 테이블에서 관리한다.
관리자가 Admin UI(`/app/admin` → 보호 페이지 탭)에서 런타임 추가/수정 가능.

```
신규 보호 페이지 추가 절차:
1. HTML 파일을 private/ 디렉토리에 추가 후 배포
   (직접 URL 차단 필요 시. utils/ 등 정적 경로는 직접 URL로 접근 가능)
2. Admin UI → 보호 페이지 탭 → 신규 등록
   (path: /app/pageName, file_path: private/pageName.html, required_role 선택)
```

**file_path 등록 시 주의:**
- **허용 디렉터리는 `private/`, `utils/` 두 곳뿐**이며 `.html` 파일만 등록할 수 있다
  (`controllers/_shared/page-file.js`의 `normalizePageFilePath` — 등록 시 `adminPages.js`와 서빙 시 `auth-middleware.js`가 같은 규칙 사용).
  `../`, 절대 경로, 드라이브 문자, 역슬래시, `./`·빈 구간은 400으로 거부하고, DB에 직접 넣은 잘못된 값도 `/app/*` 서빙 시 404로 숨긴다.
  서빙 시 `realpath`로 심볼릭 링크를 통한 디렉터리 이탈도 차단한다.
  - 이유: 함수 번들에 포함되는 디렉터리는 `vercel.json`의 `includeFiles: {private,utils,errors}/**` 뿐이다.
    `API(JS,HTML)/`, `Embedding/` 등은 번들에 없어 등록해도 서빙할 수 없으므로(500) 등록 단계에서 막는다.
    (`errors/`는 번들에 있지만 보호 페이지 대상이 아니므로 제외)
  - 앞 슬래시(`/utils/x.html`)는 제거한 형태(`utils/x.html`)로 저장된다.
- `private/`로 시작하면 직접 URL 차단 — `middleware.js`가 `/private/*` 정적 요청을 **항상 404**로 차단한다
  (IP 화이트리스트 마스터 플래그와 무관, 퍼센트 인코딩·대소문자·중복 슬래시 정규화). Admin UI에서 초록 안내 표시
- `utils/` 경로는 직접 URL로도 접근 가능 — Admin UI에서 노란 경고 표시, 허용 외 경로는 빨간 경고
- 등록한 `file_path`가 `index.html` 카드의 `data-original-url`과 일치하면 해당 카드가 자동으로 권한 제어를 받음 (배포 불필요)

### index.html 카드 가시성 시스템

카드 가시성은 3단계로 처리된다. (`applyRoleFilter()` — `/api/me` 응답 수신 후 실행)

```
Step 1. 자동 매칭 (SHA-256(data-original-url) ↔ protected_pages.file_path_hash)
  → data-protected-path 없고 data-original-url 있는 카드
  → /api/me가 file_path 대신 SHA-256 해시(file_path_hash)만 내려줌 (실제 경로 비노출, me.js)
  → 클라이언트가 normalizeFilePath(data-original-url)를 Web Crypto로 해시해 비교 (대소문자 구분)
  → 매칭 성공 시: data-protected-path 동적 주입 (href는 Step 2에서 /app/{path}로 바뀜)

Step 2. data-protected-path 카드 처리 (Step 1 주입 카드 포함)
  → DB에서 path 기준으로 required_role 조회
  → DB에 없고 data-original-url 있음 → public (보호 해제, 공개 복원)
  → DB에 없고 data-original-url 없음 → admin (공개 복원 경로 없음, 최고 제한 유지)
  → 보이는 카드는 resolveCardHref()로 실제 href를 세팅 (아래 "카드 이동" 참고)

Step 3. data-min-role 카드 처리 (data-protected-path 없는 카드만)
  → 하드코딩된 역할로 가시성 결정
```

**카드 속성 규칙:**

| 속성 | 용도 | 필수 여부 |
|---|---|---|
| `data-min-role` | 하드코딩 역할 제어 (정적) | `data-protected-path` 없는 카드에 필수 |
| `data-protected-path` | DB 기반 역할 제어 (동적) | `/app/*` 경로 카드에 사용 |
| `data-original-url` | 보호 해제 시 복원 경로 | 모든 카드에 설정 권장 |
| `data-keywords` | 검색 전용 키워드(공백 구분, 화면 비표시) — 예: AutoTest 카드 `"OPA 자동 회귀 테스트"` | 권장 (P1-19) |

**카드 이동 (P1-19 — 모든 카드 같은 탭):** 보호 카드도 `href`에 실제 경로(`/app/...`)를 두고 인라인 `onclick`·`window.open`을 쓰지 않는다.
`navigateCard()`는 제거됐고, `applyRoleFilter()` Step 2가 `resolveCardHref(card, pageInfo)` 결과로 `href`를 다시 세팅한다.
그래서 클릭은 같은 탭, Ctrl/가운데 클릭은 브라우저 기본 동작으로 새 탭이다.

```javascript
// resolveCardHref(card, pageInfo)
// - DB(protected_pages)에 path 존재 → /app/{path}
// - DB에 없음 + data-original-url 있음 → '/' + 원래 URL (공개 복원)
// - 둘 다 없음 → null → href 제거 + aria-disabled="true" (이동하지 않음)
```

**검색:** `runSearch()`는 카드 제목·설명·`data-keywords`를 합친 문자열에서 공백으로 나눈 검색어가 **모두** 포함된 카드만 보인다.
`/` 키(입력란 밖)로 검색창 포커스, 검색창에서 `Esc`로 검색어 지우기.

### 전 페이지 로그인 상태 바 패턴 (`assets/js/auth-status.js`)

`auth-status.js`는 IIFE로 `/api/me`를 호출해 로그인 상태를 표시하는 공통 스크립트다.
`</body>` 직전에 Pusher CDN + `auth-status.js` 순서로 로드한다. Pusher CDN이 없으면 알림 실시간 갱신이 fallback 폴링(300초)으로 동작한다.

```html
<script src="https://js.pusher.com/8.0.2/pusher.min.js" integrity="sha384-iWiFe+Ww57tz83ld78RvLxLwvRDO30Rf1uBXgU7sIso+FZR4fa/vWI8vmGrVYATL" crossorigin="anonymous"></script>
<script src="/assets/js/auth-status.js"></script>
```

```
적용 제외: auth/ 전체 (login·signup·signup-status·change-password·403), errors/ 전체,
index.html(자체 헤더 + notification-bell.js 사용), utils/의 리디렉트 스텁 2종

```

**3가지 모드:**

| 모드 | 선언 방법 | 동작 |
|---|---|---|
| 기본 (상단 바) | 선언 없음 | `position:fixed; top:0` 파란 바 자동 삽입 + `body { padding-top: 40px }` 주입 |
| 코너 | `window.AUTH_STATUS_CORNER = true` | `position:fixed; bottom:16px; right:16px` 플로팅 패널 — 기존 헤더 있는 페이지용 (OpenAPITester 등) |
| 인라인 | `window.AUTH_STATUS_INLINE = true` | `#authStatusBar` 요소를 HTML에 미리 배치, 자동 삽입 없음 |

```html
<!-- 코너 모드 예시 (OpenAPITesterFull.html) -->
<script src="https://js.pusher.com/8.0.2/pusher.min.js" integrity="sha384-iWiFe+Ww57tz83ld78RvLxLwvRDO30Rf1uBXgU7sIso+FZR4fa/vWI8vmGrVYATL" crossorigin="anonymous"></script>
<script>window.AUTH_STATUS_CORNER = true;</script>
<script src="/assets/js/auth-status.js"></script>
```

- 비로그인 시 코너 모드는 로그인/회원가입 버튼 표시 (`?next=현재경로` 파라미터 포함), 상단 바 모드도 동일
- admin 로그인 시 모든 모드에서 "관리자 콘솔" 버튼 자동 표시
- **알림 벨**: 기본(상단 바) 모드 + 로그인 사용자에게 벨 버튼 + 미읽음 배지 표시. Pusher WebSocket으로 실시간 갱신 (Pusher 연결 실패 시 300초 fallback 폴링). 클릭 시 드롭다운 패널 → 알림 목록 + "모두 읽음" 처리. CORNER 모드에서는 미표시
- **모드별 적용 페이지**: 커뮤니티 두 페이지(`community/bug-report.html`·`developer-notes.html`)는 P1-18부터 **기본(상단 바)** 모드다
  (허브 링크·벨 필요). 코너 모드는 자체 헤더가 있는 OpenAPITester 등에만 쓴다
- **[비밀번호 변경] 버튼**: 로그인 사용자에게 모든 모드에서 표시(코너 모드는 "비밀번호") → `/auth/change-password.html?next=<현재 경로>` (P1-13).
  `index.html` 자체 헤더(`renderHeaderUser`)에도 같은 [비밀번호 변경] 링크(`?next=/`)가 있다(F-5)
- **좁은 화면(720px 이하, F-3)**: 브랜드·관리자 콘솔·비밀번호 변경·로그아웃이 SVG 아이콘 버튼(`.asb-ico`, 라벨 `.asb-lbl`은 숨김, `title`·`aria-label` 유지)으로 바뀌고 사용자명은 말줄임(28vw). 코너 모드도 동일.
  **상단 바 높이는 항상 40px** — `body { padding-top: 40px }`, 세션 만료 배너 `top:40px`, MemberV2 `--auth-bar-h`, Admin 사이드바/가로 탭 `top: 40px`가 이 값에 의존하므로 높이를 바꾸면 모두 함께 고친다
- **주의:** 각 페이지에 `button { width: 100% }` 스타일이 있어도 `.asb-btn`에 `width: auto !important`가 적용되어 버튼이 늘어나지 않음
- 기본 모드의 `.asb-brand`("eformsign Tools Hub")는 클릭 시 `/`(index)로 이동하는 링크(`<a>` 태그)로 렌더링됨

---

### Webhook 수신 → 모니터 (`webhook-receiver.js` → `utils/webhook.html`)

`POST /api/webhook-receiver`는 인증 없이 열려 있고(누구나 임의 `company_id`로 보낼 수 있음) 결과를 **공개** Pusher 채널 `company-{company_id}`로 `new-event` 이벤트로 브로드캐스트한다. 따라서 페이로드는 신뢰할 수 없는 데이터로 취급한다.

- **전달 헤더 허용 목록**: `content-type`, `content-length`, `user-agent`, 그리고 이름이 `eformsign`으로 시작하는 헤더(예: `eformsign_signature`)만 전달한다. `x-forwarded-for`/`x-real-ip`/`authorization`/`cookie` 등 그 외 헤더는 버린다.
- **본문 검증**: 본문이 없거나 JSON 객체가 아니면 400 `VALIDATION_FAILED`. `company_id`가 없으면 기존대로 200 무시. 채널명으로 쓸 수 없는 `company_id`(Pusher 허용 문자 외, 150자 초과)는 400.
- **크기 제한**: 직렬화한 이벤트가 9000바이트(Pusher 10KB 제한 여유분)를 넘으면 `company_id`/`webhook_id`/`event_type`/문서 핵심 필드만 남긴 요약본에 `truncated: true`, `originalSize`를 붙여 보낸다. 모니터는 "(요약본…)"을 표시한다.
- **모니터 렌더링**: `utils/webhook.html`은 표 셀·토큰 결과·문서 정보 결과를 모두 `.text()`/`textContent`로만 렌더링한다(`createRow`, `renderPre`).
- **문서 정보 조회 토큰 전달**: `/api/getDocumentInfo`에는 `Authorization: Bearer <token>` 헤더로 보낸다. 서버는 헤더를 우선 읽고, 쿼리 `token=`은 하위 호환으로만 허용하며 폐기 예정 경고 로그를 남긴다.
- **모니터 로컬 이력 (P1-07)**: 채널은 공개 `company-{company_id}` 그대로(Q3 기본안). 수신 이벤트 원본(`{headers, body, receivedAt, truncated?}`)을 localStorage `webhook-monitor-history-v1:<company_id>`에 **회사별 최신순 최대 200건** 보관하고, 다시 그릴 때도 같은 `addLogEntry`(textContent)로 렌더링한다.
  마지막 Company ID는 `webhook-monitor-company-id`에 기억해 다음 방문 시 이력 복원 + 채널 재연결. 토큰 발급 성공 시 응답 `api_key.company.company_id`로 자동 채운다 —
  단 **아직 채널에 연결하지 않았을 때만** 채우고 연결한다. 이미 다른 회사 채널을 보고 있으면 바꾸지 않고 토스트로 차이만 알린다(D-15).
  모든 저장소 접근은 try/catch — 차단되면 화면에만 표시하고 안내 문구를 바꾸며, 용량 초과면 오래된 것부터 줄여 재시도한다. 서버 저장은 P2-05.
- **모니터 기타**: 수신 URL [복사]·"eformsign 설정 방법" 안내, 새 이벤트가 와도 상태 필터 유지(숨겨지면 토스트), 제목 없는 PDF는 `<document_id>.pdf`로 다운로드.
  `/api/downloadDocument`의 `Content-Disposition: filename*="UTF-8''…"`(따옴표 포함)를 그대로 파싱한다.
- 테스트: `test/webhook-receiver.test.js`

---

### Vercel Cron Job 패턴

정기 실행 작업은 `vercel.json`의 `crons` 배열 + 전용 컨트롤러로 구현한다.

```json
// vercel.json
"crons": [
  { "path": "/api/cron/cleanup-audit", "schedule": "0 0 * * *" }
]
```

```javascript
// controllers/cron/cleanup-audit.js (GET 메서드)
// 1. Authorization: Bearer <CRON_SECRET> 헤더 검증 (crypto.timingSafeEqual 고정 시간 비교)
// 2. DELETE 쿼리 실행 — CTE(DELETE … RETURNING 1 → SELECT COUNT(*))로 실제 삭제 건수 집계
// 3. { success: true, deleted: N } 반환
```

- Cron 엔드포인트는 반드시 `CRON_SECRET` 검증 — 미설정(`undefined`) 시 모든 요청 차단(401 `AUTH_REQUIRED` JSON)
- 시크릿 비교는 `===`가 아니라 길이 확인 후 `crypto.timingSafeEqual`을 쓴다(`cleanup-audit.js`의 `safeEqual`)
- Neon http 드라이버의 `sql` 태그는 행 배열만 반환하므로(`.count` 없음) 삭제 건수는 `RETURNING`으로 받아 센다
- `crons` 스케줄은 **Production 환경에서만** 자동 실행 (로컬·Preview는 수동 curl로 테스트)
- 로컬 테스트: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/cleanup-audit`
- Hobby 플랜: 일 1회 제한 / Pro 플랜: 분 단위 설정 가능

### 새 API 엔드포인트 추가

1. `/controllers/`에 컨트롤러 파일 생성
2. `api/index.js`에 라우트 등록
3. `vercel.json`에 rewrite 규칙 추가 (필요 시, `/api/*` 와일드카드로 대부분 불필요)

### 새 공개 도구 추가

1. `/utils/`에 HTML 파일 생성
2. `index.html`의 해당 섹션 카드에 아래 속성 추가:

```html
<a href="/utils/pageName.html" class="card" data-card
   data-min-role="public"
   data-original-url="utils/pageName.html"
   data-keywords="검색에 걸릴 키워드">
```

- `data-original-url`은 `href`의 앞 슬래시를 제거한 값 — Admin UI에서 `file_path`로 등록 시 자동 매칭에 사용됨
- 나중에 보호 페이지로 전환하더라도 HTML 수정 없이 Admin UI 등록만으로 권한 제어 가능
