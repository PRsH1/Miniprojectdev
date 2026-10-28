## 환경변수

Vercel 대시보드에서 관리한다.

```env
# ─── DB 기반 인증 시스템 ────────────────────────────────────
POSTGRES_URL=               # Vercel Postgres (Neon) 연결 문자열 (자동 생성)
JWT_SECRET=                 # JWT 서명 비밀키 (openssl rand -base64 64 로 생성)
BASE_URL=                   # 배포 기본 주소 (예: https://eformproj.vercel.app)

# ─── SAML ─────────────────────────────────────────────────
SAML_PRIVATE_KEY=           # Base64 인코딩된 EC 개인키
SAML_PUBLIC_CERT=           # Base64 인코딩된 공개 인증서
SAML_DEBUG=                 # '1'일 때 요청 debug=1과 함께 SAML 디버그 로깅 활성화. 평상시 미설정

# ─── 최초 admin 계정 (scripts/create-admin.js 전용, 런타임 미사용) ──
ADMIN_USERNAME=             # 생성할 admin 아이디
ADMIN_PASSWORD=             # 생성할 admin 초기 비밀번호
ADMIN_EMAIL=                # 생성할 admin 이메일

# ─── 런타임 자동 설정 ─────────────────────────────────────
# NODE_ENV — Vercel이 자동 설정. 쿠키 Secure 플래그 등 분기에 사용 (직접 등록 불필요)

# ─── 삭제 대상 (레거시 비밀번호 보호 방식) — 코드에서 완전히 제거됨 ──
# 관련 컨트롤러(protectedPage.js, protected-pages-config.js 등)를 2026-10에 삭제했다(Q11).
# 아래 5개는 어떤 코드도 읽지 않는다. Vercel 대시보드(Production/Preview/Development)와
# 로컬 .env.local에서 삭제할 것 — 대시보드 삭제는 사용자 작업.
# MEMBER_PAGE_PASSWORD / TEMPLATECOPY_PAGE_PASSWORD / IDP_TEST_PAGE_PASSWORD
# APIAUTOTEST_PAGE_PASSWORD / AUTH_COOKIE_VALUE

# ─── 크리덴셜 암호화 ─────────────────────────────────────
CREDENTIAL_ENCRYPTION_KEY=  # eformsign 비밀 키 AES-256-GCM 암호화 키 (openssl rand -hex 32 로 생성)

# ─── IP 화이트리스트 ──────────────────────────────────────
IP_WHITELIST_ENABLED=       # '1' 또는 'true'일 때만 적용. 미설정/그 외 값은 OFF

# ─── Cron ────────────────────────────────────────────────
CRON_SECRET=                # Cron 엔드포인트 인증 시크릿 (임의 문자열, Production/Preview/Development 모두 등록)

# ─── Pusher ───────────────────────────────────────────────
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
```

### 신규 환경변수 설정 절차

1. Vercel 대시보드 → 프로젝트 → Storage → Postgres (Neon) 생성
   → `POSTGRES_URL` 등 DB 관련 변수 자동 등록됨
2. `JWT_SECRET` 직접 등록:
   ```bash
   openssl rand -base64 64
   ```
   → 출력값을 Production / Preview / Development 전체 환경에 등록
3. 로컬 동기화:
   ```bash
   vercel env pull .env.local
   ```
