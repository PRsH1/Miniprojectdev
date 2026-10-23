## 기술 스택

- **배포:** Vercel (서버리스)
- **백엔드:** Node.js (api/index.js 단일 라우터, lazy-loading)
  — `controllers/` 41개 = 라우트 컨트롤러 29 + `_shared/` 공용 모듈 11 + `cron/` 1
  (레거시 비밀번호 보호 컨트롤러 4종 + `protectedPage.js`·`protected-pages-config.js` 제거, `roles`·`validate`·`page-file` 추가)
- **테스트:** `node --test` (`npm test` = `node --test test/*.test.js`) — 서버 단위 테스트 5개 파일
  (`ip-whitelist`, `refresh-rotation`, `router-errors`, `require-role`, `page-file`).
  컨트롤러 테스트는 `test/helpers/http-mocks.js`로 req/res와 `getDb()`를 목으로 바꿔 DB 없이 실행한다. 프론트엔드 테스트는 없음
- **프론트엔드:** 순수 HTML/CSS/JS + jQuery + jsrsasign
- **DB:** Postgres (Neon) — `@neondatabase/serverless` ^0.10.4, `controllers/_shared/db.js`의 `sql` 태그 사용
- **인증:** JWT (`jsonwebtoken` ^9.0.2) — 액세스/리프레시 토큰 + httpOnly 쿠키
- **eformsign 서명:** jsrsasign (ECDSA SHA256) — 브라우저에서 CDN으로 로드해 서명한다.
  서버 코드는 jsrsasign을 `require`하지 않는다. CDN 버전이 페이지마다 다름
  (`Embedding/*` 8.0.20, 그 외 10.5.25)
- **SAML:** samlify ^2.10.2 + uuid ^8.3.2 (`lib/saml.js`의 Assertion/Response ID 생성)
- **실시간:** Pusher ^5.2.0 (Webhook 브로드캐스트 + 알림 실시간 푸시)
- **이메일:** nodemailer ^6.9.14
- **쿠키:** cookie ^0.6.0 (`serialize` — 세션 쿠키 발급)
- **분석:** Vercel Web Analytics — `index.html`이 `/_vercel/insights/script.js`를 직접 로드

> **잔여(미사용) 의존성 — 정리 대상:**
> - `devDependencies.next` (^15.5.7): Next.js 미사용
> - `dependencies.@vercel/analytics` (^1.6.1): 코드에서 import하지 않음.
>   분석은 위 `/_vercel/insights` 스크립트 태그로 동작하므로 이 패키지는 불필요
> - `dependencies.vercel` (^54.14.0): CLI 도구이므로 `devDependencies`가 적절
>   (prod 의존성에 있어 `npm audit --omit=dev` 취약점 대부분이 여기서 나옴)
> - `dependencies.jsrsasign` (^11.1.0): 서버 코드에서 `require`하지 않음 (브라우저는 CDN 사용)
> - `dependencies.mammoth` (^1.12.0): 저장소 어디에서도 참조하지 않음
