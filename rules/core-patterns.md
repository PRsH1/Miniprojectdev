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
- 강제 비밀번호 변경 필요: `/auth/change-password.html`

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
- **로그아웃 graceful 처리**: 같은-오리진 `/api/*` 호출이 갱신 후에도 401이거나(=리프레시 만료) `visibilitychange`/`focus` 재확인에서 `authenticated:false`면 `window.handleAuthExpired()`(auth-status.js)가 1회 안내 후 `location.reload()`. (interval 폴링은 쓰지 않음 — Neon idle suspend 유지)
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
  없는 아이디·틀린 비밀번호·비활성·잠김 계정의 실패 응답은 모두 `error=invalid`.
- `error=inactive` / `error=locked&until=…` 안내는 **비밀번호가 맞을 때만** 보낸다(본인만 상태를 알 수 있음).
- 아이디 50자·비밀번호 256자를 넘으면 DB·scrypt 없이 `error=invalid`.
- IP 단위 제한은 코드가 아니라 **Vercel WAF rate limit** 규칙으로 건다(대시보드 설정, 사용자 작업).
  권장: `POST /api/login` IP당 10회/60초 초과 시 429(또는 Deny 10분), `POST /api/signup`·`/api/password-reset-request`
  IP당 5회/10분. Firewall 규칙은 배포와 별개라 코드 머지만으로는 적용되지 않는다.

### 비밀번호 변경 (`controllers/change-password.js`, P0b-02)

- 인증은 `requireRole(req, res, 'user', { allowMustChangePassword: true })` (refresh 인지·비활성 즉시 차단).
- `GET /api/change-password` → `{ requiresCurrentPassword }`. `auth/change-password.html`이 이 값으로 현재 비밀번호 입력란을 보인다.
- 일반 변경(`must_change_password=false`)은 `currentPassword` 필수. 틀리면 400이고 **로그인과 같은 실패 카운터**
  (`_shared/password.js`의 `recordFailedLogin`)를 올린다 → 5회면 30분 잠금. 잠긴 동안은 검증 없이 403.
- 임시 비밀번호 강제 변경(`must_change_password=true`)은 방금 그 비밀번호로 로그인했으므로 `currentPassword`를 요구하지 않는다.
- 새 비밀번호가 현재(임시) 비밀번호와 같으면 400. 길이 8~256자.
- 성공 시 `failed_login_count`·`locked_until` 초기화 + **현재 세션을 뺀** 이 사용자의 refresh 토큰을 모두 폐기한다
  (`replaced_by` 없이 `revoked_at`만 → grace 차단). 현재 세션 = 요청 쿠키의 refresh 토큰 + 같은 요청에서 로테이션됐다면 그 후속 토큰.
  다른 기기의 액세스 토큰(최대 1시간)은 만료 전까지 남는다. JWT 재서명(`mustChangePw:false`)·현재 refresh 로테이션은 P1-13.

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
  → 매칭 성공 시: data-protected-path 동적 주입, onclick → navigateCard

Step 2. data-protected-path 카드 처리 (Step 1 주입 카드 포함)
  → DB에서 path 기준으로 required_role 조회
  → DB에 없고 data-original-url 있음 → public (보호 해제, 공개 복원)
  → DB에 없고 data-original-url 없음 → admin (공개 복원 경로 없음, 최고 제한 유지)

Step 3. data-min-role 카드 처리 (data-protected-path 없는 카드만)
  → 하드코딩된 역할로 가시성 결정
```

**카드 속성 규칙:**

| 속성 | 용도 | 필수 여부 |
|---|---|---|
| `data-min-role` | 하드코딩 역할 제어 (정적) | `data-protected-path` 없는 카드에 필수 |
| `data-protected-path` | DB 기반 역할 제어 (동적) | `/app/*` 경로 카드에 사용 |
| `data-original-url` | 보호 해제 시 복원 경로 | 모든 카드에 설정 권장 |

```javascript
// navigateCard(card) 동작
// - data-protected-path 있고 DB에 존재 → /app/{path} 이동
// - data-protected-path 있고 DB에 없음 + data-original-url 있음 → 원래 URL 이동
// - data-original-url 없음 → 이동하지 않음
```

### 전 페이지 로그인 상태 바 패턴 (`assets/js/auth-status.js`)

`auth-status.js`는 IIFE로 `/api/me`를 호출해 로그인 상태를 표시하는 공통 스크립트다.
`</body>` 직전에 Pusher CDN + `auth-status.js` 순서로 로드한다. Pusher CDN이 없으면 알림 실시간 갱신이 fallback 폴링(300초)으로 동작한다.

```html
<script src="https://js.pusher.com/8.0/pusher.min.js"></script>
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
<script src="https://js.pusher.com/8.0/pusher.min.js"></script>
<script>window.AUTH_STATUS_CORNER = true;</script>
<script src="/assets/js/auth-status.js"></script>
```

- 비로그인 시 코너 모드는 로그인/회원가입 버튼 표시 (`?next=현재경로` 파라미터 포함), 상단 바 모드도 동일
- admin 로그인 시 모든 모드에서 "관리자 콘솔" 버튼 자동 표시
- **알림 벨**: 기본(상단 바) 모드 + 로그인 사용자에게 벨 버튼 + 미읽음 배지 표시. Pusher WebSocket으로 실시간 갱신 (Pusher 연결 실패 시 300초 fallback 폴링). 클릭 시 드롭다운 패널 → 알림 목록 + "모두 읽음" 처리. CORNER 모드에서는 미표시
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
   data-original-url="utils/pageName.html">
```

- `data-original-url`은 `href`의 앞 슬래시를 제거한 값 — Admin UI에서 `file_path`로 등록 시 자동 매칭에 사용됨
- 나중에 보호 페이지로 전환하더라도 HTML 수정 없이 Admin UI 등록만으로 권한 제어 가능
