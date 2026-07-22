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

**순서대로 전부 실행해야 한다.** 하나라도 빠지면 해당 기능이 500으로 실패한다.

```bash
node scripts/migrate.js                  # 스키마 + protected_pages seed
node scripts/migrate-ip-whitelist.js     # ip_whitelist / ip_whitelist_scopes
node scripts/migrate-community.js        # developer_notes / bug_reports
node scripts/migrate-bug-reports-v2.js   # bug_reports 확장 컬럼
node scripts/migrate-notifications.js    # notifications
node scripts/migrate-refresh-rotation.js # refresh_tokens.replaced_by
node scripts/create-admin.js             # 최초 admin 계정
```

- 모든 마이그레이션은 멱등이므로 재실행해도 안전하다.
- `migrate-refresh-rotation.js`를 빠뜨리면 로그인은 되지만 액세스 토큰 만료(1h) 후
  세션 갱신이 전부 막힌다. **코드 배포 전에 실행할 것.**

> **증상으로 역추적**: `/api/login`이 401이 아니라 **500**을 반환하면 자격 증명 문제가 아니라
> 스키마 부재를 의심할 것. 테이블이 없으면 쿼리가 실행되지 못하고 `INTERNAL_ERROR`로 감싸진다.
> Vercel 로그에서 `relation "..." does not exist`를 확인하면 확정이다.

### 로컬 테스트 접속

```
http://localhost:3000           → index.html 허브
http://localhost:3000/auth/login.html  → 로그인
http://localhost:3000/app/admin        → 관리자 콘솔 (admin 로그인 필요)
```

> **주의**: VS Code Live Server(포트 5502 등)로 index.html을 직접 열면
> `/api/*` 요청이 동작하지 않는다. 반드시 `vercel dev`를 사용할 것.
