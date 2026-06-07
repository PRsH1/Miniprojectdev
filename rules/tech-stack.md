## 기술 스택

- **배포:** Vercel (서버리스)
- **백엔드:** Node.js (api/index.js 단일 라우터, lazy-loading)
- **프론트엔드:** 순수 HTML/CSS/JS + jQuery + jsrsasign
- **DB:** Postgres (Neon) — `@neondatabase/serverless` ^0.10.4, `controllers/_shared/db.js`의 `sql` 태그 사용
- **인증:** JWT (`jsonwebtoken` ^9.0.2) — 액세스/리프레시 토큰 + httpOnly 쿠키
- **eformsign 서명:** jsrsasign ^11.1.0 (ECDSA SHA256)
- **SAML:** samlify ^2.10.2
- **실시간:** Pusher ^5.2.0 (Webhook 브로드캐스트 + 알림 실시간 푸시)
- **이메일:** nodemailer ^6.9.14
- **docx 파싱:** mammoth ^1.12.0

> **참고:** `package.json`의 `devDependencies.next`는 현재 코드에서 사용하지 않는 잔여 의존성이다 (Next.js 미사용).
