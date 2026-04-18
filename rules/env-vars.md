## 환경변수

Vercel 대시보드에서 관리한다.

```env
# ─── DB 기반 인증 시스템 ────────────────────────────────────
POSTGRES_URL=               # Vercel Postgres (Neon) 연결 문자열 (자동 생성)
JWT_SECRET=                 # JWT 서명 비밀키 (openssl rand -base64 64 로 생성)

# ─── SAML ─────────────────────────────────────────────────
SAML_PRIVATE_KEY=           # Base64 인코딩된 EC 개인키
SAML_PUBLIC_CERT=           # Base64 인코딩된 공개 인증서

# ─── 레거시 인증 (구 시스템 — 신규 DB 인증으로 대체됨, 제거 예정) ──
AUTH_COOKIE_VALUE=          # 구 세션 토큰 값 (현재 미사용)
MEMBER_PAGE_PASSWORD=       # 구 멤버 페이지 비밀번호 (현재 미사용)
APIAUTOTEST_PAGE_PASSWORD=  # 구 자동 테스트 비밀번호 (현재 미사용)
TEMPLATECOPY_PAGE_PASSWORD= # 구 템플릿 복제 비밀번호 (현재 미사용)
IDP_TEST_PAGE_PASSWORD=     # 구 IdP 테스트 비밀번호 (현재 미사용)

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
