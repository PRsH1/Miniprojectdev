## 기술 스택

- **배포:** Vercel (서버리스)
- **백엔드:** Node.js (api/index.js 단일 라우터, lazy-loading)
  — `controllers/` 44개 = 라우트 컨트롤러 33 + `_shared/` 공용 모듈 10 + `cron/` 1
- **테스트:** `node --test` (`npm test`) — 현재 `test/ip-whitelist.test.js`,
  `test/refresh-rotation.test.js` 2개 파일뿐. 프론트엔드 테스트는 없음
- **예외:** `Webhook/webhook/demo/`는 Java Spring Boot 샘플 (배포 대상 아님)
- **프론트엔드:** 순수 HTML/CSS/JS + jQuery + jsrsasign
- **DB:** Postgres (Neon) — `@neondatabase/serverless` ^0.10.4, `controllers/_shared/db.js`의 `sql` 태그 사용
- **인증:** JWT (`jsonwebtoken` ^9.0.2) — 액세스/리프레시 토큰 + httpOnly 쿠키
- **eformsign 서명:** jsrsasign ^11.1.0 (ECDSA SHA256)
- **SAML:** samlify ^2.10.2 + uuid ^8.3.2 (`lib/saml.js`의 Assertion/Response ID 생성)
- **실시간:** Pusher ^5.2.0 (Webhook 브로드캐스트 + 알림 실시간 푸시)
- **이메일:** nodemailer ^6.9.14
- **쿠키:** cookie ^0.6.0 (`serialize` — 세션 쿠키 발급)
- **docx 파싱:** mammoth ^1.12.0
- **분석:** Vercel Web Analytics — `index.html`이 `/_vercel/insights/script.js`를 직접 로드

> **잔여(미사용) 의존성 — 정리 대상:**
> - `devDependencies.next` (^15.5.7): Next.js 미사용
> - `dependencies.@vercel/analytics` (^1.6.1): 코드에서 import하지 않음.
>   분석은 위 `/_vercel/insights` 스크립트 태그로 동작하므로 이 패키지는 불필요
> - `dependencies.vercel` (^54.14.0): CLI 도구이므로 `devDependencies`가 적절
