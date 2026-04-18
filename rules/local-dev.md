## 로컬 개발

`vercel dev`는 Vercel `Development` 환경 변수를 사용한다.

### 필수 환경변수 (Development 등록 필요)

DB 기반 인증 시스템 사용을 위해 아래 변수가 Development 대상에 등록되어 있어야 한다:
- `POSTGRES_URL` — Vercel Postgres 생성 시 자동 등록됨
- `JWT_SECRET` — 직접 등록 필요

### 환경변수 변경 후 로컬 반영 순서

1. `vercel env pull .env.local`
2. `vercel dev` 재시작

### 최초 실행 시 DB 초기화

```bash
node scripts/migrate.js   # 스키마 생성 + 초기 protected_pages seed
node scripts/create-admin.js  # 최초 admin 계정 생성 (없으면 직접 INSERT)
```

### 로컬 테스트 접속

```
http://localhost:3000           → index.html 허브
http://localhost:3000/auth/login.html  → 로그인
http://localhost:3000/app/admin        → 관리자 콘솔 (admin 로그인 필요)
```

> **주의**: VS Code Live Server(포트 5502 등)로 index.html을 직접 열면
> `/api/*` 요청이 동작하지 않는다. 반드시 `vercel dev`를 사용할 것.
