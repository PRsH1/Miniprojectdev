# MiniProject-Hub (ProjectImprove)

eformsign 문서 관리 플랫폼 연동을 위한 API, 임베딩, 유틸리티 통합 허브입니다.
Node.js 기반의 서버리스 애플리케이션으로 Vercel에 배포되어 운영됩니다.

---

## 주요 기능

- **Open API Tester** — Postman 스타일의 eformsign Open API 테스트 도구 (Beta), 요청 저장·히스토리 복원 (로그인 사용자는 DB 저장, 비로그인은 localStorage), 에러 코드 모음 페이지 연동
- **Open API 자동 테스트** — OPA 번호 기준 eformsign API 자동 검증 테스트 러너 (인증 보호)
- **문서 관리 API** — eformsign API를 통한 문서 생성, 조회, 다운로드
- **SAML 2.0 SSO** — SP/IDP 시작 방식의 싱글사인온 인증 연동
- **임베딩 통합** — 다중 환경(SaaS, CSAP 등)에서의 문서/템플릿 임베딩
- **실시간 웹훅** — Pusher 기반 웹훅 수신 및 이벤트 브로드캐스팅
- **유틸리티 도구** — SMTP 테스트, CORS 테스트, Base64, JSON 포매터 등
- **DB 기반 인증/권한 시스템** — JWT 세션 + Vercel Postgres, 역할별 접근 제어 (admin/manager/user)
- **관리자 콘솔** — 사용자 관리, 보호 페이지 동적 설정, 회원가입 승인, 감사 로그, **IP 화이트리스트**
- **IP 화이트리스트** — DB 기반 IP 접근 제어. global(전체 사이트), path(경로 패턴), protected(보호 페이지) 3개 스코프 독립 운용

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Runtime | Node.js (Serverless) |
| Deployment | Vercel |
| DB | Vercel Postgres (Neon) |
| 인증 | JWT 하이브리드 세션, SAML 2.0 (`samlify`), ECDSA (`jsrsasign`) |
| 실시간 통신 | Pusher |
| 이메일 | Nodemailer |

---

## 프로젝트 구조

```
ProjectImprove/
├── api/
│   └── index.js                  # API 라우터 (지연 로딩 방식)
├── controllers/                  # 각 엔드포인트 비즈니스 로직
│   ├── _shared/
│   │   ├── db.js                      # Neon DB 커넥션 풀
│   │   ├── jwt.js                     # JWT sign/verify 유틸
│   │   ├── auth-middleware.js         # JWT 검증 + 리프레시 + role 체크 통합
│   │   ├── audit.js                   # audit_logs INSERT 헬퍼
│   │   ├── respond-error.js           # HTML/JSON 에러 응답 표준화
│   │   ├── protected-pages-config.js  # (레거시) 구 보호 페이지 설정 — seed 참조용
│   │   └── protectedPage.js           # 보호 페이지 공통 핸들러
│   ├── login.js                  # DB 기반 로그인 (JWT 발급)
│   ├── logout.js                 # 리프레시 토큰 revoke + 쿠키 만료
│   ├── refresh.js                # 리프레시 토큰 → 새 JWT 발급
│   ├── me.js                     # 현재 로그인 사용자 정보 반환
│   ├── signup.js                 # 회원가입 요청 생성
│   ├── signupStatus.js           # 회원가입 요청 상태 조회
│   ├── change-password.js        # 강제 비밀번호 변경 처리
│   ├── password-reset-request.js # 비밀번호 재설정 요청 (관리자 알림)
│   ├── adminPage.js              # /app/admin 페이지 서빙
│   ├── adminUsers.js             # 사용자 CRUD + 잠금해제 + 비밀번호 초기화
│   ├── adminPages.js             # 보호 페이지 동적 설정 CRUD
│   ├── adminAuditLogs.js         # 감사 로그 조회
│   ├── adminSignupRequests.js    # 회원가입 요청 승인/거절
│   ├── credentials.js            # ★ eformsign 인증 정보 CRUD (사용자별 크리덴셜)
│   ├── requestHistory.js         # ★ OpenAPITester 요청 히스토리 CRUD (로그인 사용자 DB 저장)
│   ├── cron/
│   │   └── cleanup-audit.js      # 7일 초과 감사 로그 자동 삭제 (Vercel Cron)
│   ├── auth.js                   # SAML 응답 생성
│   ├── getToken.js               # ECDSA 서명 기반 액세스 토큰 생성
│   ├── downloadDocument.js       # 문서 파일 프록시 다운로드
│   ├── getDocumentInfo.js        # 문서 메타데이터 조회
│   ├── webhook-receiver.js       # 웹훅 수신 (Pusher 트리거)
│   ├── sso-login.js              # SAML SSO 로그인 폼
│   ├── idp-initiated-login.js    # IDP 시작 SAML 플로우
│   ├── idptestauth.js            # IdP 테스트 페이지
│   ├── metadata.js               # SAML 메타데이터 엔드포인트
│   ├── send.js                   # SMTP 이메일 테스트
│   ├── memberV2Page.js           # ★ 멤버/그룹 관리 V2 페이지
│   ├── memberPage.js             # (deprecated) 구 멤버 관리 페이지
│   ├── OpenAPIAutoTest.js        # OPA 번호 기준 자동 테스트 페이지
│   └── templatecopy.js           # 템플릿 복사 유틸리티
├── lib/
│   └── saml.js                   # SAML IDP/SP 설정
├── auth/
│   ├── login.html                # 로그인 UI (username + password)
│   ├── signup.html               # 회원가입 요청 폼
│   ├── signup-status.html        # 회원가입 요청 상태 조회
│   ├── change-password.html      # 강제 비밀번호 변경 폼
│   └── 403.html                  # 권한 없음 페이지
├── API(JS,HTML)/                 # eformsign API 연동 프론트엔드 도구
│   └── OpenAPITester.html        # ★ Postman 스타일 Open API 테스터 (Beta) — HTML/CSS만 포함
├── errors/                       # 공통 HTML 에러 페이지
│   ├── 403.html
│   ├── 404.html
│   ├── 405.html
│   └── 500.html
├── Embedding/                    # 문서/템플릿 임베딩 도구
│   ├── embedding_doc_Integration.html       # 문서 임베딩 (환경 통합)
│   ├── embedding_template_intergration.html # 템플릿 임베딩 (환경 통합)
│   └── ...                                  # CSAP 버전, MultiFileViewer 등
├── utils/                        # 공개 유틸리티 도구
├── private/                      # 인증 보호 콘텐츠 (auth-middleware에서 서빙)
│   ├── Admin.html                # ★ 관리자 콘솔 (사용자/보호페이지/감사로그/회원가입 탭)
│   ├── MemberV2.html             # ★ 멤버/그룹 관리 UI (현행)
│   ├── OpenAPIAutoTest.html      # OPA 자동 테스트 UI (뼈대만, 내용은 JS에서 주입)
│   ├── idp-test.html             # IdP 테스트 UI
│   ├── templatecopy.html         # 템플릿 복제 UI
│   └── Member.html               # (deprecated) 구 멤버 관리 UI
├── assets/js/
│   ├── auth-status.js            # ★ 전 페이지 공통 로그인 상태 상단 바 (IIFE)
│   ├── credential-panel.js       # ★ eformsign 인증 저장/불러오기 공유 모듈 (IIFE, window.CREDENTIAL_CONFIG 필요)
│   ├── OpenAPIAutoTest.js        # ★ OPA 자동 테스트 전체 로직 (단일 파일)
│   ├── OpenAPITester.js          # 원본 보존용 (롤백 시 참고) — 직접 편집 금지
│   ├── member/                   # ★ 멤버/그룹 관리 V2 분할 모듈 (로드 순서 중요)
│   │   ├── api.js                #   API 호출, 엑셀 처리 (전역 함수)
│   │   ├── ui.js                 #   렌더링 전담 (섹션 전환, 사이드바, URL 표시)
│   │   └── init.js               #   이벤트 바인딩, 초기화
│   └── openapi/                  # ★ OpenAPITester 분할 모듈 (로드 순서 중요)
│       ├── api-list.js           #   API_LIST 데이터 — 신규 API 추가/수정 시 편집
│       ├── api-specs.js          #   API_SPECS 명세 데이터 — 명세 추가 시 편집
│       ├── state.js              #   DOMAINS, state, 공통 헬퍼
│       ├── ui.js                 #   UI 로직 전반
│       └── init.js               #   탭 이벤트, 초기화, 명세 모달
├── index.html                    # 메인 허브 페이지
├── package.json
└── vercel.json                   # Vercel 라우팅 설정
```

---

## API 엔드포인트

### 인증

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `POST /api/login` | POST | DB 기반 로그인 (JWT + 리프레시 토큰 발급) |
| `POST /api/logout` | POST | 로그아웃 (리프레시 토큰 revoke) |
| `POST /api/refresh` | POST | 액세스 토큰 갱신 |
| `GET /api/me` | GET | 현재 로그인 사용자 정보 조회 |
| `POST /api/signup` | POST | 회원가입 요청 생성 |
| `GET /api/signup-status` | GET | 회원가입 요청 상태 조회 (UUID 기반) |
| `POST /api/change-password` | POST | 비밀번호 강제 변경 |
| `POST /api/password-reset-request` | POST | 비밀번호 재설정 요청 (관리자 알림) |
| `GET /api/sso-login` | GET | SAML SSO 로그인 폼 |
| `POST /api/auth` | POST | SAML 응답 생성 |
| `POST /api/idp-initiated-login` | POST | IDP 시작 SAML 플로우 |
| `GET /api/metadata` | GET | SAML 메타데이터 XML |

### 관리자 API (admin 역할 전용)

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `GET /api/admin/users` | GET | 사용자 목록 조회 |
| `POST /api/admin/users` | POST | 사용자 생성 |
| `PATCH /api/admin/users/:id` | PATCH | 사용자 수정 (역할/활성화) |
| `POST /api/admin/users/:id/reset-password` | POST | 비밀번호 초기화 (임시 비밀번호 발급) |
| `PATCH /api/admin/users/:id/unlock` | PATCH | 계정 잠금 해제 |
| `GET /api/admin/pages` | GET | 보호 페이지 목록 조회 |
| `POST /api/admin/pages` | POST | 보호 페이지 등록 |
| `PATCH /api/admin/pages/:id` | PATCH | 보호 페이지 설정 변경 |
| `GET /api/admin/signup-requests` | GET | 회원가입 요청 목록 조회 |
| `POST /api/admin/signup-requests/:id/approve` | POST | 회원가입 승인 |
| `POST /api/admin/signup-requests/:id/reject` | POST | 회원가입 거절 |
| `GET /api/admin/audit-logs` | GET | 감사 로그 조회 |
| `GET /api/admin/password-reset-requests` | GET | 비밀번호 재설정 요청 목록 |

### eformsign 크리덴셜 (로그인 필요)

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `GET /api/credentials` | GET | 내 크리덴셜 목록 조회 (비밀 키 제외) |
| `GET /api/credentials/:id` | GET | 크리덴셜 단건 조회 (비밀 키 포함, 불러오기용) |
| `POST /api/credentials` | POST | 새 크리덴셜 저장 |
| `DELETE /api/credentials/:id` | DELETE | 크리덴셜 삭제 |

### OpenAPITester 요청 히스토리 (로그인 필요)

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `GET /api/request-history` | GET | 내 요청 히스토리 목록 (최신순 100건) |
| `POST /api/request-history` | POST | 요청 히스토리 저장 (100건 초과 시 오래된 항목 자동 삭제) |
| `DELETE /api/request-history/:id` | DELETE | 요청 히스토리 단건 삭제 |
| `DELETE /api/request-history` | DELETE | 요청 히스토리 전체 삭제 |

### Cron

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `GET /api/cron/cleanup-audit` | GET | 7일 초과 감사 로그 자동 삭제 (매일 UTC 00:00 실행) |

### 보호 페이지 (/app/*)

| 경로 | 필요 역할 | 설명 |
|------|----------|------|
| `GET /app/admin` | admin | 관리자 콘솔 |
| `GET /app/memberV2` | manager | 멤버/그룹 관리 V2 |
| `GET /app/templatecopy` | manager | 템플릿 복제 도구 |
| `GET /app/OpenAPIAutoTest` | manager | OPA 자동 테스트 |
| `GET /app/ApiAutoTest` | admin | API 자동 테스트 (구버전) |
| `GET /app/idptestauth` | admin | IdP 테스트 |

> 기존 경로(`/memberV2`, `/templatecopy` 등)는 `/app/*`으로 301 리다이렉트됨.
> 보호 페이지는 Admin 콘솔에서 동적으로 추가/관리 가능.

### 문서 관리

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `POST /api/getToken` | POST | ECDSA 서명으로 액세스 토큰 생성 |
| `GET /api/getDocumentInfo` | GET | 문서 메타데이터 조회 |
| `GET /api/downloadDocument` | GET | 문서 파일 다운로드 (프록시) |

### 웹훅 & 기타

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `POST /api/webhook-receiver` | POST | 웹훅 이벤트 수신 및 Pusher 브로드캐스팅 |
| `POST /api/send` | POST | SMTP 이메일 테스트 발송 |

---

## 에러 응답 정책

- `/api/*` 요청은 항상 JSON 에러를 반환합니다.
- `/app/*` 요청은 HTML 에러 페이지를 반환합니다.
- 인증이 필요한 페이지에서 인증이 없는 경우에는 기존 로그인 리다이렉트 흐름을 유지합니다.
- 공통 유틸은 `controllers/_shared/respond-error.js`에 있으며, 상태 코드별 HTML 페이지는 `errors/*.html`을 사용합니다.
- JSON 에러 응답은 `status`, `code`, `message`, `reason`, `action` 필드를 포함하며 내부 예외 세부는 숨깁니다.

예시:

```json
{
  "error": {
    "status": 404,
    "code": "RESOURCE_NOT_FOUND",
    "message": "요청한 리소스를 찾을 수 없습니다.",
    "reason": "대상 데이터가 없거나 이미 삭제되었을 수 있습니다.",
    "action": "입력값을 다시 확인한 뒤 다시 시도하세요."
  }
}
```

상세 규칙과 에러 코드 표는 [docs/error-response-format.md](./docs/error-response-format.md) 문서를 참고하세요.

---

## 인증 방식

### 1. DB 기반 JWT 인증 (현행)

보호 페이지 및 관리자 기능 접근에 사용.

| 항목 | 내용 |
|------|------|
| 저장소 | Vercel Postgres (Neon) |
| 액세스 토큰 | JWT, 1시간, `auth_token` httpOnly 쿠키 |
| 리프레시 토큰 | 7일, SHA-256 해시 후 DB 저장, `refresh_token` httpOnly 쿠키 |
| 비밀번호 해싱 | Node.js 내장 `crypto.scrypt` |
| 계정 잠금 | 로그인 5회 실패 → 30분 잠금 (관리자 수동 해제 가능) |

**역할(Role) 체계**

| 역할 | 접근 범위 |
|------|----------|
| `admin` | 모든 보호 페이지 + 관리자 콘솔 |
| `manager` | `/app/memberV2`, `/app/templatecopy`, `/app/OpenAPIAutoTest` |
| `user` | `/app/OpenAPIAutoTest` |

### 2. SAML 2.0 SSO
- **라이브러리:** `samlify`
- **SP Entity ID:** `${BASE_URL}/api/metadata`
- **ACS Endpoint:** `https://test-kr-service.eformsign.com/v1.0/saml_redirect`
- SP 시작 및 IDP 시작 플로우 모두 지원

### 3. ECDSA 서명 인증
- **알고리즘:** SHA256withECDSA
- eformsign API 액세스 토큰 발급 시 사용
- `eformsign_signature` 헤더로 서명값 전달

---

## 환경 변수

배포 전 아래 환경 변수를 Vercel 프로젝트 설정에 등록해야 합니다.

```env
# ─── DB 기반 인증 (필수) ──────────────────────────────────
POSTGRES_URL=            # Vercel Postgres 생성 시 자동 등록
JWT_SECRET=              # openssl rand -base64 64 으로 생성
BASE_URL=                # 예: https://eformproj.vercel.app

# ─── SAML 인증 ────────────────────────────────────────────
SAML_PRIVATE_KEY=        # base64 인코딩된 개인 키
SAML_PUBLIC_CERT=        # base64 인코딩된 공개 인증서

# ─── Cron ─────────────────────────────────────────────────
CRON_SECRET=             # Cron 엔드포인트 인증 시크릿 (임의 문자열)

# ─── Pusher (웹훅) ────────────────────────────────────────
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=

# ─── 레거시 (현재 미사용, 제거 예정) ──────────────────────
AUTH_COOKIE_VALUE=
MEMBER_PAGE_PASSWORD=
APIAUTOTEST_PAGE_PASSWORD=
TEMPLATECOPY_PAGE_PASSWORD=
IDP_TEST_PAGE_PASSWORD=
```



## 배포

이 프로젝트는 Vercel을 통해 자동 배포됩니다.

```bash
# Vercel CLI로 배포
vercel --prod
```

`vercel.json`의 라우팅 설정에 따라 `/api/*` 요청은 `api/index.js`로 일괄 처리됩니다.

---

## 멤버/그룹 관리 (MemberV2)

`private/MemberV2.html` + `assets/js/member/` (분할 모듈)

eformsign Open API를 이용해 멤버·그룹을 관리하는 Admin 도구입니다. 수동 입력과 엑셀 일괄처리를 모두 지원하며, 쿠키 인증으로 접근이 보호됩니다.

**접근 경로:** `/memberV2`

> **모듈 구조**: JS 로직은 역할별로 3개 파일로 분리됩니다.
> 로드 순서: `api.js` → `ui.js` → `init.js`

### 지원 환경

| 환경 | Base URL |
|------|----------|
| 운영 (SaaS) | `https://kr-api.eformsign.com` |
| 공공 (CSAP) | `https://www.gov-eformsign.com/Service` |
| 사용자 지정 | 직접 입력 |

### 섹션 구성

| 섹션 | OPA | 기능 |
|------|-----|------|
| Access Token 발급 | — | Signature / Bearer 방식 선택, 발급 결과 자동 채움 |
| 멤버 추가 | OPA2_011 | 수동 입력 + 엑셀 일괄 추가 (템플릿 다운로드 포함) |
| 멤버 삭제 | OPA2_013 | 수동 삭제 + 엑셀 일괄 삭제, 이메일 발송 옵션 |
| 멤버 수정 | OPA2_012 | 수동 수정 + 엑셀 일괄 수정 |
| 구성원 목록 | OPA2_010 | JSON / TABLE 뷰 전환, 이름·아이디 검색 |
| 그룹 추가 | OPA2_018 | 수동 입력 + 엑셀 일괄 추가 |
| 그룹 수정 | OPA2_019 | 수동 수정 + 엑셀 일괄 수정 |
| 그룹 삭제 | OPA2_020 | 수동 삭제 (복수 ID 지원) + 엑셀 일괄 삭제 |
| 그룹 목록 | OPA2_017 | JSON / TABLE 뷰, `include_member` / `include_field` 토글 |

### UI 컴포넌트 패턴

| 컴포넌트 | 설명 |
|---|---|
| `.card-header` / `.card-body` | 카드 헤더/본문 분리 구조. 결과 카드 헤더에 상태 배지 + 복사 버튼 포함 |
| `.collapse-trigger` | 추가 옵션 접기/펼치기 트리거. `.open` 클래스로 chevron 회전 |
| `.upload-area` | 엑셀 파일 업로드 드래그앤드롭 영역 |
| `.step-row` / `.step-badge` | 엑셀 처리 단계 안내 인디케이터 |
| `setResultBadge(badgeId, isOk)` | API 결과 배지 갱신 헬퍼 (`api.js`). 배지 ID: `{섹션명}ResultBadge` |

> **디자인 레퍼런스:** `design-preview-member.html` — 프로덕션 미사용, 디자인 시스템 확인 전용

### 구성원 목록 테이블 컬럼

`id` / `이름` / `부서` / `직책` / `연락처(휴대폰)` / `권한` / `생성일` / `enabled`

- **이름 검색 / 아이디 검색**: 조회 후 클라이언트 사이드 실시간 필터링 (AND 조건)
- 검색 필터는 TABLE 뷰에서만 동작, JSON 뷰는 전체 데이터 그대로 표시

### 엑셀 일괄처리 헤더 규격

| 작업 | 필수 헤더 |
|------|----------|
| 멤버 추가 | `id, password, first_name, contact_tel, contact_number, contact_country_number, department, position, agreement_marketing, role, external_uuid, external_idp_name, external_account_id` |
| 멤버 삭제 | `id` |
| 멤버 수정 | `id, name, enabled, contact_number, contact_tel, department, position, role` |
| 그룹 추가 | `name, description, members` (members는 콤마 구분) |
| 그룹 수정 | `group_id, name, description, members` |
| 그룹 삭제 | `group_ids` |

---

## Open API 자동 테스트 (OpenAPIAutoTest)

`private/OpenAPIAutoTest.html` + `assets/js/OpenAPIAutoTest.js`

OPA 번호 기준으로 eformsign Open API를 자동 검증하는 테스트 러너입니다.
각 OPA 항목은 **생성 → 검증 → 정리** 단계를 자동으로 묶어서 실행하며, 쿠키 인증으로 접근이 보호됩니다.

**접근 경로:** `/api/OpenAPIAutoTest`

### 주요 기능

| 기능 | 설명 |
|------|------|
| OPA 사이드바 | 전체 OPA 목록 표시, 준비됨/설정필요 배지 자동 표시 |
| 상세 패널 | 선택한 OPA 이름·설명 표시, 누락된 설정 독립 섹션으로 분리 표시 |
| 설정 모달 | Base URL, 인증 정보(API Key, 멤버 ID, Secret Key), OPA별 추가 입력값 일괄 관리 |
| 자동 탐색 | 템플릿 목록 / 완료 문서 목록 자동 조회 후 후보 ID 순차 시도 |
| 자동 채움 | 토큰 발급 응답에서 `company_id` 자동 추출, 인증 패널 API Key 자동 채움 |
| 전역 설정 확인 | Base URL·인증·토큰·회사 정보 입력 여부 일괄 점검 |
| 사용 가이드 | 5단계 스텝 카드 형식 사용법 안내 모달 |

### 자동탐색 패턴

| 패턴 | Steps | 대상 OPA |
|------|-------|---------|
| 템플릿 자동탐색 | `listFormsForSeed` → `tryCreateAuto` | 003, 005, 014, 016, 021, 042 |
| 완료 문서 자동탐색 (단건) | `listCompletedDocsForDownload` → `tryDownloadDocAuto` | 004 |
| 완료 문서 자동탐색 (다건) | `listDocsBasic` → `tryXxxAuto` | 037, 040, 045 |

### 설정 모달 입력 필드

| 필드 | 사용 OPA |
|------|---------|
| 외부 Template ID | OPA 007 |
| 첨부 문서 ID | OPA 006 |
| 테스트 멤버 ID | OPA 011~013, 018~020, 030 |
| 수신자 이메일 | OPA 014 |
| PDF 수신자 이메일 | OPA 037 |

> **UI 구조**: `private/OpenAPIAutoTest.html`은 뼈대(빈 컨테이너)만 포함합니다.
> 가이드 내용은 `assets/js/OpenAPIAutoTest.js`의 `hydrateGuideContent()`가 DOMContentLoaded 시 주입하므로,
> **가이드 수정은 JS 파일에서만** 합니다.

---

## Open API Tester

`API(JS,HTML)/OpenAPITesterProd.html` (공개 배포용) · `private/OpenAPITesterFull.html` (전체 버전, manager 이상) + `assets/js/openapi/` (분할 모듈)

Postman과 유사한 인터페이스로 eformsign Open API를 브라우저에서 직접 테스트할 수 있는 도구입니다.

- **OpenAPITesterProd** — 멤버 관련 API(그룹 '멤버') 비공개 처리된 배포 버전. `index.html`에서 기본 링크 제공.
- **OpenAPITesterFull** — 멤버 API 포함 전체 버전. `private/`에서 서빙, manager 이상 접근 가능. `index.html` "Open API Tester Full" 카드로 진입.

> **모듈 구조**: 기존 단일 파일(`OpenAPITester.js`)을 5개 파일로 분할하여 유지보수성 개선.
> 로드 순서: `api-list.js` → `api-specs.js` → `state.js` → `ui.js` → `init.js`

### 주요 기능

| 기능 | 설명 |
|------|------|
| API 사이드바 | OPA2_XXX 번호 배지, 검색, 너비 드래그 조절, **정렬 방식 토글** (그룹별 / 코드순 / Method별) |
| 인증 패널 | Signature / Bearer 방식 선택, Access Token 자동 발급, **인증 저장/불러오기** (로그인 필요) |
| Path 탭 | URL 경로 파라미터 입력 (키 readonly, 배지 = 파라미터 개수) |
| Query 탭 | Query String 입력, 체크박스 활성화, 행 추가 가능 |
| Headers 탭 | 헤더 추가/수정, API별 필수 헤더 자동 노출 |
| Body 탭 | JSON 에디터, 높이 드래그 조절로 자동 확장 — DELETE 메서드도 Body 포함하여 전송 (OPA2_009, OPA2_020 등) |
| Response 뷰어 | 상태 코드 배지, JSON 문법 강조, 엔드포인트별 결과 캐싱 |
| 예시 응답 | 성공/실패/조회결과없음 응답 구조 미리보기 (타입 표현) |
| Send and Download | 응답을 파일로 강제 저장 (Content-Type 기반 확장자 자동 결정) |
| Code Snippet | cURL / JS(fetch) / JS(jQuery) / Python / Java 코드 자동 생성 |
| **API 명세** | 각 API의 Request/Response 필드 명세 조회 모달 — 헤더·Path/Query 파라미터·Body·응답 필드·에러 코드, **비고 컬럼** 지원 (`note` 필드가 있는 경우 자동 표시) |
| **에러 코드 모음** | 헤더 버튼으로 `utils/error-codes.html` 연결 — 43개 엔드포인트 전체 에러 코드 검색 가능 |
| 사용 가이드 | 7단계 스텝 카드 형식 사용법 안내 모달 |

### 등록된 API (OPA2_XXX) 및 예시 응답 현황

| 그룹 | API 목록 | 예시 응답 |
|------|---------|----------|
| 인증 | OPA2_001 Access Token 발급, OPA2_002 Access Token 갱신 | 성공+실패 완비 |
| 문서 | OPA2_003~009, 014, 016, 021, 031, 037, 040, 042~045, 047, 048 | 전체 성공+실패 완비 |
| 템플릿 | OPA2_015, 024, 041, 061 | 전체 성공+실패 완비 |
| 멤버 | OPA2_010~013, 030 | 전체 성공+실패 완비 |
| 그룹 | OPA2_017~020 | 전체 성공+실패 완비 |
| 회사 도장 | OPA2_025~029 | 전체 성공+실패 완비 |
| 회사 | OPA2_046 이용현황 조회, OPA2_049 문서 관리 조건 목록 조회 | 성공+실패 완비 |
| 문서 관리자 | OPA2_050 추가, OPA2_051 삭제, OPA2_052 관리 문서 설정 | 성공+실패 완비 |

> **에러 코드 완비**: `api-list.js` 43개 API의 `errors` 배열 전면 교체 (API당 15~35개, 한글 타이틀), `api-specs.js` `errorCodes`도 동기화 완료 (2026-04-03)
> **소스 레퍼런스**: `utils/error-codes.html` — 45+ 소스파일 3단계 추적 기반 에러 코드 모음

---

## Embedding 도구

`/Embedding/` 경로에서 아래 도구들을 사용할 수 있습니다.

| 파일 | 설명 |
|------|------|
| `embedding_doc_Integration.html` | 문서 임베딩 (SaaS·CSAP 환경 통합) |
| `embedding_doc_update.html` | 문서 수정 임베딩 |
| `embedding_doc_update_CSAP.html` | 문서 수정 임베딩 (CSAP) |
| `embedding_template_intergration.html` | 템플릿 임베딩 (SaaS·CSAP 환경 통합) |
| `template_create_update.html` | 템플릿 생성/수정 임베딩 |
| `template_create_update_CSAP.html` | 템플릿 생성/수정 임베딩 (CSAP) |
| `MultiFileViewer.html` | 다중 파일 뷰어 |

---

## API 단독 도구

`/API(JS,HTML)/` 경로에서 아래 도구들을 사용할 수 있습니다.

| 파일 | 설명 |
|------|------|
| `OpenAPITesterProd.html` | Postman 스타일 Open API 테스터 — 배포 버전 (멤버 API 비공개) |
| `OpenAPITester.html` | Postman 스타일 Open API 테스터 — 전체 버전 (멤버 API 포함) |
| `DocumentSendImprove.html` | 새 문서 작성 API 테스트 |
| `DocumentInfo.html` | 문서 정보 조회 API 테스트 |
| `listdocuments.html` | 문서 목록 조회 API 테스트 |
| `DocumentDownload.html` | 문서 다운로드 API 테스트 |

---

## 유틸리티 도구 목록

`/utils/` 경로에서 아래 도구들을 사용할 수 있습니다.

| 파일 | 설명 |
|------|------|
| `smtp.html` | SMTP 이메일 발송 테스트 |
| `webhook.html` | Webhook 수신 모니터링 |
| `CorsTest.html` | CORS 차단 테스트 |
| `RsaTestSample.html` | RSA/ECDSA 서명 생성·검증 테스트 |
| `timestamp.html` | Unix 타임스탬프 변환 |
| `base64.html` | Base64 인코딩/디코딩 |
| `JsonToPretty.html` | JSON/XML 포맷 정리 |
| `DocumentDelete.html` | 문서 일괄 삭제 |
| `MassDocumentDowmload.html` | 문서 일괄 다운로드 |
| `templateDeletetool.html` | 템플릿 일괄 삭제 |
| `saml-guide.html` | SAML 연동 가이드 |
| `error-codes.html` | OPA2 에러 코드 모음 (43개 엔드포인트, 에러 코드·Enum·메시지 검색) |

---

## 2026-04-21 Update

### IP 화이트리스트 기능 추가

DB 기반 IP 접근 제어 기능을 추가했습니다. 스코프 단위로 독립 활성화/비활성화가 가능합니다.

#### 아키텍처

```
모든 요청 → middleware.js (Edge Middleware, CDN보다 먼저 실행)
    ↓ global scope 체크
Vercel 라우팅
    ├── /api/*, /app/* → api/index.js (path scope 체크)
    │       └── /app/* → auth-middleware.js (protected scope 체크)
    └── 정적 파일 → Vercel CDN
```

#### 스코프 3종

| 스코프 | 적용 범위 | 체크 위치 |
|---|---|---|
| `global` | 전체 사이트 (정적 HTML 포함) | `middleware.js` (Edge Middleware) |
| `path` | 특정 경로 패턴 (예: `/api/admin/*`) | `api/index.js` |
| `protected` | 보호 페이지 (`/app/*`) | `auth-middleware.js` |

#### 추가된 파일

| 파일 | 설명 |
|---|---|
| `middleware.js` | Vercel Edge Middleware — global scope IP 체크. 정적 파일보다 먼저 실행 |
| `controllers/_shared/ip-whitelist.js` | CIDR 매칭 + 60초 TTL 캐시 공통 모듈 |
| `controllers/adminIpWhitelist.js` | Admin REST API (규칙/스코프 CRUD + IP 테스트 엔드포인트) |
| `scripts/migrate-ip-whitelist.js` | DB 테이블 생성 + 시드 마이그레이션 |

#### DB 테이블

- `ip_whitelist` — IP 규칙 (label, ip_cidr, scope_type, scope_path, is_active)
- `ip_whitelist_scopes` — 스코프 활성화 설정 (scope_type, is_enabled)

#### Admin UI

관리자 콘솔 → **IP 화이트리스트** 탭:
- 스코프 카드에서 global / protected / path 스코프별 토글 활성화/비활성화
- IP 규칙 추가/수정/삭제 (단일 IP 또는 CIDR 표기)
- IP 테스트 도구 — 특정 IP + 경로에 대한 허용/차단 여부를 스코프별 상세로 확인

#### 마이그레이션

```bash
POSTGRES_URL="..." node scripts/migrate-ip-whitelist.js
```

#### 동작 원칙

- **Fail-open**: DB 오류 시 차단하지 않고 허용 — 서비스 가용성 우선
- **캐시 60초**: Admin write 시 즉시 무효화, 다른 warm instance는 최대 60초 후 반영
- **스코프 활성 + 규칙 없음 = 전체 차단**: Admin UI에서 규칙 추가 후 스코프 활성화 유도
- **로컬호스트 자동 허용**: `127.0.0.1`, `::1` 은 global scope 활성화와 무관하게 항상 허용

---

## 2026-04-19 Update

### 전 페이지 로그인 상태 상단 바

`assets/js/auth-status.js` 공통 스크립트를 신규 생성하여 `index.html`을 제외한 모든 도구 페이지에 로그인 상태 표시를 추가했습니다.

- **적용 범위**: `utils/` 12개, `API(JS,HTML)/` 7개, `Embedding/` 8개, `private/` 보호 페이지 전체
- **3가지 모드**:
  - **기본 (상단 바)**: `position:fixed` 파란 바 자동 삽입 + `body { padding-top: 40px }` 주입
  - **코너 모드** (`window.AUTH_STATUS_CORNER = true`): 우측 하단 플로팅 패널 — 기존 헤더가 있는 OpenAPITester 등에 사용
  - **인라인 모드** (`window.AUTH_STATUS_INLINE = true`): `#authStatusBar` 요소를 HTML에 직접 배치
- **표시 내용**: 사용자명 + 역할 배지 + (admin) 관리자 콘솔 버튼 + 로그아웃 버튼
- **비로그인 시**: 모든 모드에서 로그인/회원가입 버튼 표시 — 코너 모드는 로그인 URL에 `?next=현재경로` 파라미터 포함
- **제외**: `auth/` 페이지 전체 (로그인 플로우 페이지)

### eformsign 인증 정보 저장/불러오기 (크리덴셜 프로필)

로그인한 사이트 사용자가 eformsign API 인증 정보를 여러 개 이름을 붙여 DB에 저장하고 재사용할 수 있는 기능을 추가했습니다.

- **신규 DB 테이블**: `eformsign_credentials` (user_id FK, name, environment, api_key, eform_user_id, secret_method, secret_key nullable)
- **신규 API**: `GET/POST/DELETE /api/credentials` — JWT 인증 필수, 사용자별 완전 격리
- **공유 모듈**: `assets/js/credential-panel.js` (IIFE) — Access Token을 발급하는 모든 도구에 적용. `window.CREDENTIAL_CONFIG`로 페이지별 필드 ID·환경값 매핑·다크 모드 설정
- **적용 도구**: OpenAPITester, MemberV2, API(JS,HTML)/ 내 문서/목록 도구, Embedding/ 전체, utils/ 내 webhook·대량삭제·대량다운로드 등 Access Token 발급 도구 17개 이상
- **불러오기 UX**: 인증 불러오기 모달에서 항목별 인증 이름·API Key·User ID·비밀 키 저장 여부를 레이블-값 리스트로 표시, [선택] 시 인증 패널 자동 채움
- **저장 UX**: 저장 모달에서 이름 입력 + 인증 패널 현재 값 pre-fill, 수정 후 저장 가능
- **비밀 키 저장**: 체크박스로 선택 저장 (`secret_key` nullable) — 미저장 시 불러오기 후 직접 입력 안내
- **비로그인 차단**: 저장/불러오기 버튼 클릭 시 미인증이면 로그인 안내 모달 표시 (`?next=현재경로` 포함)
- **보안**: 목록 조회 시 비밀 키 미반환 (`has_secret_key: boolean`만), 단건 조회 시에만 비밀 키 포함 응답
- **다크 모드**: `CREDENTIAL_CONFIG.darkMode: true` 설정 시 모달이 다크 테마로 렌더링됨 (webhook.html 등 어두운 배경 페이지용)
- **CSS 격리**: 모달 내 버튼·인풋에 `all:revert` 적용 — 호스트 페이지 전역 CSS(`button { width:100% }` 등) 오염 방지

### OpenAPITester 요청 히스토리 DB 저장 (로그인 사용자)

OpenAPITester에서 API 요청 저장 기능을 로그인 사용자와 비로그인 사용자로 분기했습니다.

- **비로그인**: 기존과 동일하게 localStorage(`openapi_tester_history`)에 저장
- **로그인**: DB(`api_request_history` 테이블)에 저장 — 다른 기기·세션에서도 히스토리 복원 가능
- **저장 내용**: API 이름, 엔드포인트 ID, 메서드, 환경, URL, Path/Query 파라미터, 헤더, 바디, 응답 메타
- **100건 제한**: 초과 시 서버에서 오래된 항목 자동 삭제
- **신규 DB 테이블**: `api_request_history` (user_id FK, endpoint_id, method, environment, url, path_params, query_params, headers, body, response, saved_at)
- **신규 API**: `GET/POST/DELETE /api/request-history` — JWT 인증 필수, 사용자별 완전 격리
- **프론트엔드**: 메모리 캐시(`historyCache`) 패턴으로 기존 동기 코드 구조 유지하면서 DB 비동기 연동 — `initHistory()`가 페이지 로드 시 DB fetch 후 캐시 세팅

---

## 2026-04-18 Update

### DB 기반 인증/권한 시스템 도입

기존 페이지별 비밀번호 + 공유 쿠키 방식을 완전히 교체하여 DB 기반 JWT 인증 시스템을 구축했습니다.

#### 핵심 변경사항

- **Vercel Postgres (Neon) 연동**: `users`, `refresh_tokens`, `protected_pages`, `audit_logs`, `signup_requests`, `password_reset_requests` 테이블
- **JWT 하이브리드 세션**: 액세스 토큰(1시간) + 리프레시 토큰(7일, DB 저장, 로테이션 적용)
- **역할 기반 접근 제어(RBAC)**: `admin` / `manager` / `user` 3단계 계층
- **보호 페이지 URL 구조 변경**: `/memberV2` → `/app/memberV2` 등 `/app/*` 프리픽스 통일
- **보호 페이지 동적 관리**: DB 기반 설정으로 관리자가 Admin UI에서 런타임 추가 가능

#### 관리자 콘솔 (`/app/admin`)

| 탭 | 기능 |
|---|---|
| 회원가입 요청 | 대기 요청 목록, 승인(역할 확정) / 거절 처리 |
| 사용자 관리 | 계정 생성, 역할 변경(팝업), 활성/비활성, 잠금 해제, 비밀번호 초기화(임시 비밀번호 1회 노출) |
| 보호 페이지 | 페이지 등록, 접근 권한 변경(팝업), 활성/비활성 |
| 감사 로그 | 전체 액션 기록, 날짜/사용자/action 필터, 페이지네이션 |

#### 보안 기능

- 로그인 5회 실패 시 30분 계정 잠금 (관리자 수동 해제 가능)
- 비밀번호 초기화 후 다음 로그인 시 강제 변경 (`must_change_password`)
- 모든 주요 액션 감사 로그 기록
- 회원가입 요청 → 관리자 승인 후 계정 활성화
- 감사 로그 7일 보존 정책 — Vercel Cron Job(`/api/cron/cleanup-audit`)이 매일 UTC 00:00에 7일 초과 레코드 자동 삭제

#### index.html 변경

- `/api/me` 기반 로그인 상태 감지 (httpOnly 쿠키 → API 조회)
- 역할별 도구 카드 가시성 3단계 동적 처리:
  - **자동 매칭**: 카드의 `data-original-url` ↔ `protected_pages.file_path` 비교 → Admin UI 등록만으로 권한 제어 자동 적용 (배포 불필요)
  - **`data-protected-path`**: `/app/*` 경로 카드의 DB 기반 동적 제어
  - **`data-min-role`**: 하드코딩 역할 제어 (정적, 위 두 방식에 해당 없는 카드)
- 보호 페이지 삭제 시 해당 카드 자동 공개 복원 (`data-original-url` 기준)
- 헤더에 로그인/회원가입 버튼, 로그인 시 사용자명 + 역할 배지 + 로그아웃
- admin 로그인 시 헤더에 "관리자 콘솔" 버튼 추가

---

## 2026-04-10 Update

### OpenAPITesterProd 추가 및 OPA2_061 신규 API

#### `API(JS,HTML)/OpenAPITesterProd.html` — 배포용 Prod 버전 신규 생성
- 멤버 관련 API(그룹 '멤버') 비공개 처리
- `index.html`: Beta 배지 제거, Prod 버전 링크로 교체

#### OPA2_061 단일 템플릿 정보 조회 추가
- `assets/js/openapi/api-list.js`, `api-specs.js` 업데이트

---

## 2026-04-09 Update

### JsonToPretty — 코드·디자인·UX 전면 개선

- **보안**: `escapeHTML()` 헬퍼 적용(XSS 방지), `javascript:` URL 차단
- **XML 포매터**: 정규식 방식 → DOM 직렬화(CDATA·주석·속성 지원), 트리 뷰에 속성 표시 추가
- **UX**: 붙여넣기 자동 포맷, `autoFormat()` 단일 자동 감지 버튼, Ctrl+Enter 단축키, 초기화 확인 다이얼로그, 최소화(minify) 기능 추가
- **디자인**: 인라인 스타일 → CSS 클래스 분리, 다크 테마 통일(Monokai), 버튼 계층 명확화

---

## 2026-04-03 Update

### Open API Tester — 에러 코드 전면 보강 및 에러 코드 모음 페이지 추가

#### `api-list.js` — 실패 응답 에러 코드 전면 교체
- 43개 API(`OPA2_001`~`OPA2_052`)의 `exampleResponse.errors` 배열을 소스 파일 기준으로 전면 교체
- 기존 API당 3~5개 → **15~35개**로 확장 (eformsign 서버 소스 45+ 파일 3단계 추적 기반)
- 에러 타이틀 형식 변경: `ENUM_NAME (코드)` → **한글 설명 (코드)** (90가지 Enum 전수 번역)
  - 예: `INVALID_AUTH_SIGNATURE (4030004)` → `유효하지 않은 서명 (4030004)`

#### `api-specs.js` — API 명세 `errorCodes` 동기화
- 43개 OPA2 항목의 `errorCodes` 배열을 `api-list.js`와 동기화 (API당 15~35개)
- 형식: `{ code, message(영문 원문), description(한글) }`

#### `utils/error-codes.html` — 에러 코드 모음 페이지 신규 추가
- 43개 엔드포인트 전체 에러 코드를 한 화면에서 확인 가능
- 에러 코드·Enum 이름·메시지 전문 검색 지원
- 허브(`/`) 및 API 테스터 링크 포함

#### `OpenAPITester.html` — 헤더에 에러 코드 버튼 추가
- 사용 가이드 버튼 옆에 **에러 코드** 버튼 추가 → 새 탭으로 `error-codes.html` 오픈

#### `index.html`
- Open API 섹션에 **에러 코드 모음** 카드 신규 추가

---

## 2026-04-01 Update

### MemberV2 — 구성원 목록 테이블 컬럼 추가 및 검색 기능

- **테이블 컬럼 추가**: 구성원 목록 TABLE 뷰에 `연락처(휴대폰)` (`contact.number`), `권한` (`role[]`) 컬럼 추가
- **이름 검색 / 아이디 검색**: 뷰 전환 버튼 위에 검색 입력창 2개 추가, 조회된 데이터를 클라이언트 사이드에서 실시간 필터링
  - 이름·아이디 입력값 AND 조건 적용
  - TABLE 뷰에서만 동작, JSON 뷰는 전체 데이터 표시 유지
  - `_membersCache`로 멤버 데이터를 보관 → 검색 시 API 재요청 없음
- **JS 구조 개선** (`assets/js/member/api.js`): `renderMemberTable()` / `filterAndRenderMembers()` 함수 분리

---

## 2026-03-29 Update

### OpenAPIAutoTest — UI 개선 및 가이드 단일 소스화

- **상세 패널 제목**: OPA 선택 시 "선택된 OPA" 고정 문구 → 실제 API 이름(`OPA XXX — API 이름`)으로 동적 표시
- **누락된 설정 분리**: 설명 카드 내 인라인 표시 → 완전히 독립된 `<section>`으로 분리, 누락 항목 없을 때 섹션 자체 숨김
- **가이드 단일 소스화**: `private/OpenAPIAutoTest.html`의 가이드 내용을 비우고 `hydrateGuideContent()`(JS)에서만 관리
- **가이드 내용 수정**: 실제 자동탐색으로 전환된 항목(OPA 004 등) 반영, 수동 입력 필요 항목 정확화
- **Readiness 수정**: OPA 037 `pdfTargetPhone` 필수 제거, `globalChecks()` "주 템플릿" 항목 제거
- **index.html**: deprecated `ApiAutoTest` 카드 제거

---

## 2026-03-28 Update

### 파비콘 (Favicon) 추가

- `/favicon.svg` 신규 생성 — 프로젝트 블루(`#1a73e8`) 배경의 플러그 아이콘 SVG
- 전체 HTML 파일 31개에 `<link rel="icon" href="/favicon.svg" type="image/svg+xml">` 일괄 추가
- 하위 경로(`utils/`, `API(JS,HTML)/`, `Embedding/` 등)에서도 절대경로로 동일 파비콘 사용

### Open API Tester — 모바일 반응형 대응

- **모바일 사이드바 드로어**: `@media (max-width: 640px)` 브레이크포인트에서 사이드바가 고정 위치 슬라이드 드로어로 전환됩니다.
  - 헤더 좌측 햄버거(`#btnMenu`) 버튼으로 사이드바 열기/닫기
  - 배경 오버레이(`#sidebarBackdrop`) 클릭으로도 닫기 가능
  - API 항목 선택 시 사이드바 자동 닫힘
- **터치 타겟 최소 44×44px 보장**: 버튼, 탭 등 모든 인터랙션 요소에 적용
- **인증 패널 그리드**: 모바일에서 1열 레이아웃으로 전환
- **빈 화면 안내**: 모바일에서 "API 목록 열기" 버튼 표시
- 640px 초과(태블릿·PC)에서는 기존 상시 표시 사이드바 유지

---

## 2026-03-26 Update

### Protected Page Refactor

- 보호 페이지 설정을 `controllers/_shared/protected-pages-config.js`로 공통화했습니다.
- 보호 페이지 공통 핸들러를 `controllers/_shared/protectedPage.js`로 분리했습니다.
- `member`, `apiautotest`, `templatecopy`, `idptestauth` 페이지가 `login.js`와 같은 설정을 공유하도록 정리했습니다.

### Local `vercel dev` Note

- `vercel dev`는 `Development` 환경 변수를 사용합니다.
- 보호 페이지 로그인 테스트 시 아래 값이 `Development` 대상에도 등록되어 있어야 합니다.
  - `AUTH_COOKIE_VALUE`
  - `MEMBER_PAGE_PASSWORD`
  - `APIAUTOTEST_PAGE_PASSWORD`
  - `TEMPLATECOPY_PAGE_PASSWORD`
  - `IDP_TEST_PAGE_PASSWORD`

```bash
vercel env pull .env.local
vercel dev
```
