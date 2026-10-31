## 기술 스택

- **배포:** Vercel (서버리스)
- **백엔드:** Node.js (api/index.js 단일 라우터, lazy-loading)
  — `controllers/` 44개 = 라우트 컨트롤러 29 + `_shared/` 공용 모듈 14 + `cron/` 1
  (레거시 비밀번호 보호 컨트롤러 4종 + `protectedPage.js`·`protected-pages-config.js` 제거,
  `roles`·`validate`·`page-file`·`input-limits`·`password`·`credential-crypto` 추가)
- **테스트:** `node --test` (`npm test` = `node --test test/*.test.js`) — 단위 테스트 21개 파일
  (`ip-whitelist`, `refresh-rotation`, `router-errors`, `require-role`, `page-file`,
  `saml-response`, `saml-xss`, `safe-next`, `webhook-receiver`, `admin-scripts`, `change-password`,
  `credential-crypto`, `cron-cleanup`, `input-limits`, `login-lockout`, `request-history`,
  `account-flow`, `password-reset-notify`, `bug-report-privacy`, `send-smtp`, `csv-export`).
  컨트롤러 테스트는 `test/helpers/http-mocks.js`로 req/res와 `getDb()`를 목으로 바꿔 DB 없이 실행한다. 프론트엔드 테스트는 `csv-export`(순수 함수)뿐이고 화면 동작은 gstack 브라우저로 확인한다
- **CI:** GitHub Actions `.github/workflows/ci.yml` (P0b-10) — push·PR마다 Node 24.x로 `npm ci` → `npm test` →
  `npm run security:secrets`, 별도 job에서 gitleaks 8.21.2(릴리스 체크섬 검증)로 **전체 git 히스토리**를 `.gitleaks.toml` 기준 스캔.
  과거에 확인·조치된 항목(교체된 SAML 키 커밋 등)과 `DUMMY-` 테스트 값은 `.gitleaks.toml` `[allowlist]`에 근거 주석과 함께 둔다.
  테스트용 가짜 시크릿은 항상 `DUMMY-` 접두어로 쓴다(두 스캐너 공통 예외)
- **프론트엔드:** 순수 HTML/CSS/JS + jQuery + jsrsasign
- **DB:** Postgres (Neon) — `@neondatabase/serverless` ^0.10.4, `controllers/_shared/db.js`의 `sql` 태그 사용
- **인증:** JWT (`jsonwebtoken` ^9.0.2) — 액세스/리프레시 토큰 + httpOnly 쿠키
- **eformsign 서명:** jsrsasign (ECDSA SHA256) — 브라우저에서 CDN으로 로드해 서명한다.
  서버 코드는 jsrsasign을 `require`하지 않는다. CDN 버전이 페이지마다 다름
  (`Embedding/*` 8.0.20, 그 외 10.5.25)
- **SAML:** samlify ^2.15.1 + uuid ^11.1.1 (`lib/saml.js`의 Assertion/Response ID 생성)
  — samlify 2.13 미만의 AttributeValue XML 주입 취약점 수정 버전. 회귀 테스트: `test/saml-response.test.js`
  (openssl로 일회성 키·인증서를 만들어 서명·속성·이스케이프를 검사, openssl이 없으면 skip)
- **실시간:** Pusher ^5.2.0 (Webhook 브로드캐스트 + 알림 실시간 푸시)
- **이메일:** nodemailer ^10.2.1 (Node >= 20, CJS `require` 그대로 사용 — `send.js` 옵션·logger 호환 확인)
- **쿠키:** cookie ^0.7.2 (`parse`/`serialize` — 세션 쿠키 발급)
- **분석:** Vercel Web Analytics — `index.html`이 `/_vercel/insights/script.js`를 직접 로드 (npm 패키지 불필요)
- **보안 헤더:** `vercel.json` `headers`에서 전 경로(`/(.*)`)에 `X-Frame-Options: DENY`,
  `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`을 붙인다.
  임베딩 도구가 eformsign iframe을 **띄우는** 것은 영향 없음(우리 페이지가 남의 iframe에 들어가는 것만 차단). CSP는 보류(P2 이후)
- **의존성 정책:** 런타임 의존성은 위 7개(`@neondatabase/serverless`, `cookie`, `jsonwebtoken`, `nodemailer`,
  `pusher`, `samlify`, `uuid`)뿐이며 devDependencies는 없다. `npm audit` 0건(2026-10 기준).
  미사용이던 `next`·`@vercel/analytics`·`vercel`(CLI)·`jsrsasign`·`mammoth`는 제거했다.
  Vercel CLI(`vercel dev`, `vercel env pull`)는 전역 설치(`npm i -g vercel`)해서 사용한다.

### 브라우저 외부 스크립트·스타일 (P0b-07)

- **규칙: 외부 `<script src>`·`<link rel="stylesheet">`는 정확한 버전 URL + `integrity="sha384-…" crossorigin="anonymous"`**.
  `latest`, 버전 없는 URL(`/npm/axios/dist/…`), 메이저·마이너만 있는 경로(`js.pusher.com/8.0/`)는 쓰지 않는다 — 내용이 바뀌면 SRI가 깨지거나, SRI 없이 남의 코드가 비밀키 입력 페이지에서 실행된다.
- SRI 해시는 실제 CDN 파일을 내려받아 계산한다: `curl -sL <url> | openssl dgst -sha384 -binary | openssl base64 -A` → `sha384-<결과>`.
  버전을 올리면 해시도 반드시 다시 계산하고, 브라우저 콘솔에 `Failed to find a valid digest`(SRI 차단)가 없는지 확인한다.
- 같은 라이브러리는 아래 표의 버전 하나만 쓴다(새 페이지도 표의 태그를 그대로 복사).
- **Tailwind Play CDN(`cdn.tailwindcss.com`) 금지** — 런타임 JIT라 버전 고정·SRI가 불가능하다. 예전에 쓰던 3페이지
  (`private/MassDocumentDowmload.html`, `utils/DocumentDelete.html`, `utils/templateDeletetool.html`)는 페이지가 쓰는 유틸리티만
  Tailwind v3.4.17로 미리 생성한 CSS를 `<style id="tw-static">`에 인라인했다(런타임 생성 없음). 이 페이지에 **새 Tailwind 클래스를 쓰면 스타일이 붙지 않으므로**
  페이지 자체 CSS(`mdl-*` 등)로 작성한다.
- CSP는 보류(B-03 — 인라인 스크립트·onclick이 많아 SRI 적용 후 Report-Only부터).

| 라이브러리 | 버전 | URL | 사용 페이지 |
|---|---|---|---|
| jQuery | 3.7.1 | `code.jquery.com/jquery-3.7.1.min.js` | DocumentDownload·DocumentInfo·listdocuments·OpenAPITester 2종·MemberV2·Admin·webhook |
| jQuery (레거시) | 2.1.4 | `code.jquery.com/jquery-2.1.4.min.js` | `Embedding/*_update*` 4종(eformsign 임베딩 라이브러리 짝 — eformsign 호스팅본과 같은 파일. C8 정리 대상) |
| jsrsasign | 10.5.25 | `cdnjs …/jsrsasign/10.5.25/jsrsasign-all-min.js` | 토큰 발급 도구 전부(Embedding 포함) |
| Font Awesome | 6.5.1 | `cdnjs …/font-awesome/6.5.1/css/all.min.css` | index·Admin·MemberV2·OpenAPITester 2종·AutoTest·error-codes·saml-guide·일괄 다운로드·삭제 도구 2종 |
| Pusher JS | 8.0.2 | `js.pusher.com/8.0.2/pusher.min.js` | `auth-status.js`·`notification-bell.js`를 쓰는 전 페이지 |
| Pusher JS | 8.2.0 | `js.pusher.com/8.2.0/pusher.min.js` | `utils/webhook.html`(원래 8.2.0 — 동작 변경 없이 유지) |
| axios | 1.21.0 | `cdn.jsdelivr.net/npm/axios@1.21.0/dist/axios.min.js` | 일괄 다운로드·DocumentDelete·templateDeletetool |
| SheetJS xlsx | 0.18.5 | `cdnjs …/xlsx/0.18.5/xlsx.full.min.js` | MemberV2 |
| JSZip / FileSaver | 3.10.1 / 2.0.5 | cdnjs | 일괄 다운로드 |
| marked / DOMPurify | 15.0.12 / 3.2.6 | jsdelivr | community/developer-notes |
| CodeMirror / Prism / jsonlint | 5.65.13 / 1.29.0 / 1.6.0 | cdnjs | utils/JsonToPretty |
| jsencrypt | 3.3.2 | cdnjs | utils/RsaTestSample |

**SRI를 붙이지 않는 외부 리소스 (이유)**

| 리소스 | 이유 |
|---|---|
| Google Fonts CSS (`fonts.googleapis.com/css2?…`) | 응답 CSS가 브라우저(UA)마다 달라 해시가 고정되지 않는다. 스크립트가 아니라 폰트 정의만 담는다 |
| eformsign 임베딩 라이브러리 (`www.eformsign.com/lib/js/efs_embedded_*.js`, `www.gov-eformsign.com/…`, 임베딩 페이지의 커스텀 Domain·Lib URL 동적 로드) | eformsign이 버전 없는 경로로 배포·갱신하는 벤더 파일이라 SRI를 붙이면 갱신 때 깨진다. 임베딩 도구의 본래 목적이 그 최신 라이브러리 확인 |
| `/_vercel/insights/script.js`, `/assets/js/*` | 동일 출처(우리 배포물) |
