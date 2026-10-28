## 기술 스택

- **배포:** Vercel (서버리스)
- **백엔드:** Node.js (api/index.js 단일 라우터, lazy-loading)
  — `controllers/` 44개 = 라우트 컨트롤러 29 + `_shared/` 공용 모듈 14 + `cron/` 1
  (레거시 비밀번호 보호 컨트롤러 4종 + `protectedPage.js`·`protected-pages-config.js` 제거,
  `roles`·`validate`·`page-file`·`input-limits`·`password`·`credential-crypto` 추가)
- **테스트:** `node --test` (`npm test` = `node --test test/*.test.js`) — 서버 단위 테스트 16개 파일
  (`ip-whitelist`, `refresh-rotation`, `router-errors`, `require-role`, `page-file`,
  `saml-response`, `saml-xss`, `safe-next`, `webhook-receiver`, `admin-scripts`, `change-password`,
  `credential-crypto`, `cron-cleanup`, `input-limits`, `login-lockout`, `request-history`).
  컨트롤러 테스트는 `test/helpers/http-mocks.js`로 req/res와 `getDb()`를 목으로 바꿔 DB 없이 실행한다. 프론트엔드 테스트는 없음
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
