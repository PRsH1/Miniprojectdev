# MiniProject-Hub (ProjectImprove)

eformsign 문서 관리 플랫폼 연동을 위한 API, 임베딩, 유틸리티 통합 허브입니다.
Node.js 기반의 서버리스 애플리케이션으로 Vercel에 배포되어 운영됩니다.

---

## 주요 기능

- **Open API Tester** — Postman 스타일의 eformsign Open API 테스트 도구 (Beta), 요청 저장·히스토리 복원 (로그인 사용자는 DB 저장, 비로그인은 localStorage), 에러 코드 모음 페이지 연동
- **Open API 자동 테스트** — OPA 번호 기준 eformsign API 자동 검증 테스트 러너 (인증 보호), Custom URL 환경 지원, OPA 단위 격리 실행, 테스트 리포트 (모달 + Markdown/HTML 다운로드)
- **문서 관리 API** — eformsign API를 통한 문서 생성, 조회, 다운로드
- **SAML 2.0 SSO** — SP/IDP 시작 방식의 싱글사인온 인증 연동
- **임베딩 통합** — 다중 환경(SaaS, CSAP 등)에서의 문서/템플릿 임베딩
- **실시간 웹훅** — Pusher 기반 웹훅 수신 및 이벤트 브로드캐스팅, 알림 실시간 푸시
- **유틸리티 도구** — SMTP 테스트, CORS 테스트, Base64, JSON 포매터 등
- **DB 기반 인증/권한 시스템** — JWT 세션 + Vercel Postgres, 역할별 접근 제어 (admin/manager/user)
- **관리자 콘솔** — 사용자 관리, 보호 페이지 동적 설정, 회원가입 승인, 감사 로그, **IP 화이트리스트**, **알림 벨**, **버그 리포트 관리**
- **알림 시스템** — 회원가입 요청·버그 리포트 등 주요 이벤트를 상단 바 벨 아이콘으로 실시간 알림. Pusher WebSocket 기반 실시간 푸시 (연결 실패 시 300초 fallback 폴링). admin은 관리 알림, 일반 사용자는 본인 버그 리포트 상태 변경·답변 등록 알림 수신. DB 기반 모듈형 구조로 신규 알림 타입 확장 용이
- **커뮤니티** — 개발자 노트(마크다운 지원, admin 전용 작성), 버그 리포트 게시판(제보·본인 목록·처리 현황 한 페이지 통합). 관리자는 버그 원인·조치 사항 기록, 상태 변경·답변 등록 시 제보자에게 알림 전송
- **IP 화이트리스트** — DB 기반 IP 접근 제어. global(전체 페이지/API), path(경로 패턴), protected(보호 페이지) 3개 스코프 독립 운용. `IP_WHITELIST_ENABLED` 마스터 플래그로 전체 on/off (OFF 시 DB 미조회·즉시 허용)

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Runtime | Node.js (Serverless) |
| Deployment | Vercel |
| DB | Vercel Postgres (Neon) |
| 인증 | JWT 하이브리드 세션, SAML 2.0 (`samlify`), ECDSA (`jsrsasign`) |
| 실시간 통신 | Pusher (웹훅 브로드캐스트 + 알림 실시간 푸시) |
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
│   │   ├── session.js                 # resolveUser — API용 세션 해석 (만료 시 리프레시 로테이션)
│   │   ├── auth-middleware.js         # JWT 검증 + 리프레시(원자적 로테이션) + role 체크 통합
│   │   ├── audit.js                   # audit_logs INSERT 헬퍼
│   │   ├── respond-error.js           # HTML/JSON 에러 응답 표준화
│   │   ├── protected-pages-config.js  # (레거시) 구 보호 페이지 설정 — seed 참조용
│   │   ├── protectedPage.js           # 보호 페이지 공통 핸들러
│   │   ├── pusher.js                  # Pusher 인스턴스 공통 모듈 (알림 + Webhook 공용)
│   │   └── ip-whitelist.js            # IP 화이트리스트 체크 공통 모듈 (CIDR 매칭, 60초 캐시)
│   ├── login.js                  # DB 기반 로그인 (JWT 발급)
│   ├── logout.js                 # 리프레시 토큰 revoke + 쿠키 만료
│   ├── refresh.js                # 리프레시 토큰 → 새 JWT 발급 (공유 tryRefreshToken 위임)
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
│   ├── notifications.js          # ★ 알림 CRUD API (역할별 분기 — admin: target_role, 일반: target_user_id)
│   ├── pusher-auth.js            # Pusher private 채널 인증 (JWT 검증 + 채널 소유권 확인)
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
│   ├── auth-status.js            # ★ 전 페이지 공통 로그인 상태 상단 바 (IIFE, 알림 벨 내장 — Pusher 실시간 푸시)
│   ├── notification-bell.js      # ★ 알림 벨 독립 모듈 (IIFE → window.NotifBell, index.html 전용)
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

### 알림 (로그인 필요)

> admin: `target_role = 'admin'` 알림 조회. 일반 사용자: 본인 대상 `target_user_id` 알림 조회. 동일 엔드포인트를 역할에 따라 분기.

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `GET /api/notifications` | GET | 미읽음 count + 최신 30건 목록 |
| `PATCH /api/notifications/read` | PATCH | 전체 읽음 처리 |
| `PATCH /api/notifications/:id/read` | PATCH | 단건 읽음 처리 |
| `DELETE /api/notifications/:id` | DELETE | 단건 삭제 |
| `DELETE /api/notifications` | DELETE | 전체 삭제 |

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

### Pusher 채널 인증

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `POST /api/pusher/auth` | POST | Pusher private 채널 인증 (JWT 쿠키 검증 → 본인 채널 또는 admin 채널만 허용) |

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
| 리프레시 토큰 | 7일, SHA-256 해시 후 DB 저장, `refresh_token` httpOnly 쿠키, 사용 시마다 로테이션 |
| 세션 유지 | 액세스 토큰 만료 시 리프레시 토큰으로 자동 갱신 → 활성 사용자는 최대 7일 슬라이딩 세션 |
| 비밀번호 해싱 | Node.js 내장 `crypto.scrypt` |
| 계정 잠금 | 로그인 5회 실패 → 30분 잠금 (관리자 수동 해제 가능) |

**리프레시 토큰 로테이션 (경합 안전)**

- 갱신은 `auth-middleware.js`의 `tryRefreshToken`이 정본이며 `me.js`·`/app/*`·`refresh.js`·`_shared/session.js`가 공유한다.
- 동시 갱신 경합을 막기 위해 **원자적 단일 statement(CTE)로 토큰을 claim**(`revoked_at`·`replaced_by` 세팅 + 신규 토큰 INSERT)한다. 행을 얻은 요청만 두 쿠키를 모두 발급하고, 30초 grace 내 "진" 요청은 새 액세스 토큰만 받는다(쿠키 클로버링 방지). 로그아웃된 토큰(`replaced_by IS NULL`)은 grace에서 제외된다.
- 데이터 API(`credentials`/`request-history`/`notifications`)는 `resolveUser`로 갱신-인지 처리되어 액세스 토큰 만료 후에도 401 없이 동작한다. 클라이언트는 `/api/me` 부트스트랩을 `navigator.locks`로 탭 간 직렬화하며, 리프레시까지 만료되면 안내 후 페이지를 재로딩한다.
- **DB 요구사항**: `refresh_tokens.replaced_by UUID` — `scripts/migrate-refresh-rotation.js`로 추가하며 **코드 배포 전에 실행**해야 한다.

**역할(Role) 체계**

| 역할 | 접근 범위 |
|------|----------|
| `admin` | 모든 보호 페이지 + 관리자 콘솔 |
| `manager` | `/app/memberV2`, `/app/templatecopy`, `/app/OpenAPIAutoTest` |
| `user` | `/app/OpenAPIAutoTest` |

### 2. SAML 2.0 SSO
- **라이브러리:** `samlify`
- **SP Entity ID:** `${BASE_URL}/api/metadata`
- **ACS Endpoint (대상 서버 선택):**
  - Test: `https://test-kr-service.eformsign.com/v1.0/saml_redirect`
  - Dev: `https://dev-service.eformsign.com/v1.0/saml_redirect`
  - `lib/saml.js`의 `ACS_URLS` 맵에서 관리하며, 대상 서버마다 SP 인스턴스를 분리 생성한다(ACS Location이 SAML Response의 Destination/Recipient로 삽입되므로).
- **대상 서버 라우팅:**
  - **IdP 시작** (`idp-test.html` → `idp-initiated-login`): 폼의 "전송 대상 서버" select → `resolveTarget()` (기본값 test)
  - **SP 시작** (`sso-login` → `auth`): 우선순위 ① 명시적 `target`(test/dev, `sso-login?target=dev`) → ② SAMLRequest의 `AssertionConsumerServiceURL`(`extractAcsUrl` + `resolveTargetByAcsUrl`, 화이트리스트 검증) → ③ test 폴백
- **AttributeStatement (email/name):** SAML 응답에 Azure AD 호환 클레임(`.../claims/emailaddress`, `.../claims/name`)을 담아 eformsign이 사용자 이름을 읽을 수 있게 한다. samlify는 `loginResponseTemplate`에 `context`(XML 템플릿)와 `attributes`를 **둘 다** 요구하며, per-user 값은 `createLoginResponse`의 5번째 인자 `customTagReplacement`(= `lib/saml.js`의 `createTemplateCallback`)로 채운다. (둘 중 하나라도 빠지면 `Invalid login response template` 경고와 함께 속성 없는 기본 템플릿으로 폴백됨)
- **진단 로깅 (`SAML_DEBUG`):** `SAML_DEBUG=1` **이면서** 요청에 `debug=1`(SP 시작은 `sso-login?debug=1` → 폼 전달, IdP 시작은 body)인 경우에만, 생성한 SAMLResponse XML과 ACS로 직접 POST한 eformsign 응답(status/location/body)을 Vercel 콘솔에 `[SAML-DEBUG]` 프리픽스로 기록한다(`lib/saml.js`의 `debugDeliver`). 이중 게이트라 평상시 로그인 흐름에는 영향이 없다.
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
SAML_DEBUG=              # '1'일 때 요청 debug=1과 함께 SAML 진단 로깅 활성화. 평상시 미설정

# ─── 크리덴셜 암호화 ─────────────────────────────────────
CREDENTIAL_ENCRYPTION_KEY=  # eformsign 비밀 키 AES-256-GCM 암호화 키 (openssl rand -hex 32 로 생성)

# ─── IP 화이트리스트 ──────────────────────────────────────
IP_WHITELIST_ENABLED=    # '1' 또는 'true'일 때만 IP 화이트리스트 적용. 미설정/그 외 값은 OFF(즉시 허용, DB 미조회)

# ─── Cron ─────────────────────────────────────────────────
CRON_SECRET=             # Cron 엔드포인트 인증 시크릿 (임의 문자열)

# ─── Pusher (웹훅 + 알림 실시간 푸시) ─────────────────────
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
| 설정 모달 | Base URL, 인증 정보(API Key, 멤버 ID, Secret Key), OPA별 추가 입력값 일괄 관리. 인증 저장/불러오기로 DB에 프로필 저장·재사용 가능 (로그인 필요) |
| 자동 탐색 | 템플릿 목록 / 완료 문서 목록 자동 조회 후 후보 ID 순차 시도 |
| 자동 채움 | 토큰 발급 응답에서 `company_id` 자동 추출, 인증 패널 API Key 자동 채움 |
| 전역 설정 확인 | Base URL·인증·토큰·회사 정보 입력 여부 일괄 점검 |
| Custom URL 환경 | SaaS/CSAP 외에 직접 URL을 입력하여 커스텀 환경에서 테스트 가능 |
| OPA 격리 실행 | OPA 단위로 shared 상태를 격리하여 문서 생명주기 간섭 방지 (seed 캐싱으로 API 호출 최적화) |
| 테스트 리포트 | 실행 완료 후 OPA별/Step별 성공·실패 요약 모달 표시, Markdown 또는 HTML 파일로 다운로드. "검토 필요(CHECK) 상세" 섹션 포함 |
| 응답 판정 4단계 | PASS / CHECK(검토 필요) / FAIL / SKIP. 정리·삭제 step의 400~403은 CHECK로 표시(404는 FAIL), 200 OK여도 body가 `success:false`면 FAIL 전환 |
| 사용 가이드 | 5단계 스텝 카드 형식 사용법 안내 모달 |

### 자동탐색 패턴

| 패턴 | Steps | 대상 OPA |
|------|-------|---------|
| 템플릿 자동탐색 | `listFormsForSeed` → `tryCreateAuto` | 003, 005, 014, 042 |
| 템플릿 자동탐색 (일괄) | `listFormsForSeed` → `tryMassCreateAuto` / `tryMassCreateMultiAuto` | 016, 021 |
| 첨부 문서 자동생성 | `createDocWithAttach` → `downloadAttachAuto` | 006 |
| 완료 문서 자동탐색 (단건) | `listCompletedDocsForDownload` → `tryDownloadDocAuto` | 004 |
| 완료 문서 자동탐색 (다건) | `listDocsBasic` → `tryXxxAuto` | 037, 040, 045 |

### 설정 모달 입력 필드

| 필드 | 사용 OPA |
|------|---------|
| Custom URL | custom 환경 선택 시 |
| 외부 Template ID | OPA 007 |
| 첨부 템플릿 ID / 첨부 필드 ID | OPA 006 |
| 테스트 멤버 ID | OPA 011~013, 018~020, 030 |
| 수신자 이메일 | OPA 014 |
| PDF 수신자 이메일 | OPA 037 |

### OPA 실행 방식

여러 OPA를 동시 선택 시 **OPA 단위로 순차 실행**합니다. 각 OPA 시작 시 `freshShared()`로 문서 생명주기를 격리하며, 읽기 전용 탐색 step(`listFormsForSeed`, `listDocsBasic`, `listCompletedDocsForDownload`)의 결과는 seed 캐시로 OPA 간 재사용하여 불필요한 API 호출을 줄입니다.

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
| 인증 패널 | Signature / Bearer 방식 선택, Access Token 자동 발급 (**CORS/네트워크 전송 실패 시 `/api/getToken` 서버 프록시 자동 fallback**), **인증 저장/불러오기** (로그인 필요) |
| Path 탭 | URL 경로 파라미터 입력 (키 readonly, 배지 = 파라미터 개수) |
| Query 탭 | Query String 입력, 체크박스 활성화, 행 추가 가능 |
| Headers 탭 | 헤더 추가/수정, API별 필수 헤더 자동 노출 |
| Body 탭 | JSON 에디터, 높이 드래그 조절로 자동 확장 — DELETE 메서드도 Body 포함하여 전송 (OPA2_009, OPA2_020 등). **실시간 JSON 유효성 검증** (타이핑 300ms 후 자동 검사, 오류 시 빨간 테두리 + 에러 메시지), **Format JSON** 버튼 (`Ctrl+Shift+F`) |
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

## 2026-06-28 Update

### SAML 응답 AttributeStatement(email/name) 포함 + 진단 로깅

eformsign(SP)으로 보내던 SAML 응답에 **AttributeStatement가 누락**되어, eformsign이 사용자 이름을 읽지 못하고 NameID(email)를 이름으로 표시하던 문제를 수정했습니다.

#### 원인

`lib/saml.js`의 `loginResponseTemplate`이 `attributes`만 지정하고 `context`(XML 템플릿 문자열)를 누락 → samlify(`entity-idp.js`)가 템플릿을 무효 처리(`Invalid login response template` 경고)하고 **속성 없는 기본 템플릿으로 폴백**했습니다. 또한 per-user 속성값을 채우는 `createLoginResponse`의 5번째 인자 `customTagReplacement` 콜백도 없었습니다. samlify 라이브러리 자체 결함이 아닌 **설정 누락**입니다(대체 라이브러리 교체 불필요).

#### 동작

- `loginResponseTemplate.context`(`{AuthnStatement}{AttributeStatement}` 포함 기본 템플릿) 추가 + `attributes`(Azure AD 클레임 `.../claims/emailaddress`, `.../claims/name`) 유지.
- `lib/saml.js`에 공유 `createTemplateCallback(acsUrl, user, requestId)` 추가 — 표준 태그(ID·시간·Destination·NameID 등) + 속성 placeholder(`{attrEmail}`/`{attrName}`)를 `SamlLib.replaceTagsByValue`로 채워 `{ id, context }` 반환. `auth.js`·`idp-initiated-login.js`가 5번째 인자로 전달.
- 생성 XML은 기존 동작 형태와 동일(`ds:` prefix, **Response 레벨 서명**, `NameFormat=...attrname-format:basic`) → eformsign 회귀 위험 최소.
- **진단 로깅**: `lib/saml.js`의 `debugDeliver`가 `SAML_DEBUG=1` **AND** 요청 `debug=1` 이중 게이트에서만 동작 — 생성 SAMLResponse XML + ACS로 직접 POST한 eformsign 응답(status/location/headers/body)을 Vercel 콘솔에 `[SAML-DEBUG]` 프리픽스로 기록. 평상시 로그인 흐름 무영향.

#### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `lib/saml.js` | `RESPONSE_CONTEXT` + `loginResponseTemplate.context`, 공유 `createTemplateCallback`·`debugDeliver` 추가·export |
| `controllers/auth.js` | `createLoginResponse` 5번째 인자 콜백 전달 + `SAML_DEBUG` 이중 게이트 로깅 |
| `controllers/idp-initiated-login.js` | 동일 — 콜백 전달 + body 기준 `SAML_DEBUG` 게이트 로깅 |
| `controllers/sso-login.js` | `debug=1` 게이트 플래그를 폼 hidden 필드로 `/api/auth`에 전달 |
| `rules/env-vars.md` · `rules/project-structure.md` | `SAML_DEBUG` 환경변수 및 SAML 파일 설명 갱신 |

> **CouchDB(eformsign) SAML 설정 정합성**: `issuer`·`entity_id`는 `${BASE_URL}/api/metadata`, `redirect_url`은 `ACS_URLS.test`, `attribute.name`/`email`은 위 Azure 클레임 URI, `idp_type`는 `azure`와 일치해야 한다. **배포 환경 `BASE_URL`이 정확히 해당 호스트**여야 Issuer가 일치한다.
> **최종 검증 보류**: eformsign test 서버 복구 후 `@도메인` 사용자 + 이름 입력으로 SSO를 태우고 `[SAML-DEBUG]` 로그로 ACS 응답을 확인하는 E2E 검증이 남아 있다.

---

## 2026-06-16 Update

### OpenAPIAutoTest 응답 판정 강화 (CHECK 상태 + body 검증)

자동 테스트가 4xx 응답을 무조건 PASS로 표시하거나, 200 OK여도 body가 실패를 나타내는 경우(일괄 처리 `success:false`)를 놓치던 문제를 보완했습니다.

#### 동작

- **CHECK(검토 필요) 상태 신설**: 정리·삭제 step(`createMember`, `deleteMember`, `deleteGroup`, `cleanupBulk1/2`, `cancelDocs`, `deleteDocs`)이 반환하는 **400~403**(`CHECK_STATUS_CODES`)을 PASS가 아닌 **CHECK(주황 배지)**로 표시. 의도된 응답(이미 정리된 리소스 등)인지 실제 오류인지 사용자가 결과 보기로 직접 확인. CHECK는 `opaFailed`를 세팅하지 않아 파이프라인은 계속 진행됩니다.
- **404 → FAIL**: eformsign 정리 step의 4xx는 400~403만 정상 범주이므로 **404는 실제 오류(FAIL)**로 처리.
- **`validate(json)` 훅으로 body 검증**: 200 OK여도 body가 실패를 나타내면 FAIL로 전환하고, **응답 body 원문은 유지**한 채 `[검증 실패] {사유}`만 앞에 덧붙여 어느 항목이 실패했는지 확인 가능. OPA 030(`bulkCreateMembers`)의 `success:false` 검증을 기존 `after`-throw(응답 body 소실) 방식에서 `validate`로 교체.
- **OPA 판정 우선순위**: FAIL > CHECK > SKIP > PASS. 상단 요약·진행바·실행 이력·리포트·Markdown/HTML 모두 4분류(PASS/FAIL/CHECK/SKIP)로 확장하고, 리포트에 **"검토 필요 상세(CHECK)"** 섹션 추가.

#### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `assets/js/OpenAPIAutoTest.js` | `request()` 판정 3분기(`ok`/`check`/그외) + `validate` 훅, `CHECK_STATUS_CODES` 상수, step 7종 `check` 적용, `bulkCreateMembers` `validate` 교체, 집계·리포트·가이드 CHECK 반영 |
| `private/OpenAPIAutoTest.html` | `.status-check` / `.report-pill.check` 주황 배지 스타일 추가 |
| `rules/open-api-auto-test.md` | "응답 판정(PASS/CHECK/FAIL/SKIP)" 섹션 추가, OPA 판정 우선순위 갱신 |

### OpenAPIAutoTest 리포트 step별 요청/응답 + 실행 이력 결과 복원

리포트와 실행 이력의 활용도를 높이기 위해 두 기능을 추가했습니다.

#### 동작

- **리포트 step별 요청/응답 인라인 펼침**: 리포트 OPA별 결과 표의 각 step 행 아래에 표준 `<details>` 행이 추가되어 **전송한 Request Body와 Response**를 펼쳐 볼 수 있습니다. JS 없이 동작하는 `<details>`라 모달·내보낸 HTML·Markdown(GitHub 호환) 모두 동일하게 반영됩니다. 본문은 `truncateBody()`로 절단(기본 16384자)하고, 본문 없는 step은 "(본문 없음)"으로 표기합니다.
- **프로필별 실행 이력 결과 복원**: 사이드바 "프로필별 실행 이력" 항목을 클릭하면 우측 결과 패널에 과거 실행 결과 행이 복원되고(`loadHistoryRun`), "리포트 보기"로 해당 실행 리포트를 다시 열 수 있습니다. 복원 중에는 결과 패널 상단에 과거-이력 안내 배너가 표시되고, 새 실행을 시작하면 배너가 사라지며 라이브로 복귀합니다.
- **저장 안정성**: 이력 엔트리에 `id` + 리포트 스냅샷(`report`)을 저장합니다. `snapshotReportForHistory()`가 본문을 절단해 용량을 절감하고, `QuotaExceededError` 발생 시 가장 오래된 엔트리부터 제거하며 재시도(최소 1건)한 뒤 그래도 실패하면 `report`를 뺀 요약-only 엔트리로 저장합니다(`persistHistoryMap()`). `report`가 없는 구(舊) 엔트리는 클릭 비활성("상세 데이터 없음" 표기).

#### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `assets/js/OpenAPIAutoTest.js` | 공통 헬퍼 `truncateBody`/`stepDetailToRow`, 리포트 `<details>` 렌더(모달/HTML/MD), `loadHistoryRun`·배너·`snapshotReportForHistory`·`persistHistoryMap`, 이력 엔트리 `id`/`report` 저장 |
| `private/OpenAPIAutoTest.html` | 이력 행 클릭 스타일(`.config-row.clickable/.selected`), `#historyViewBanner` 배너, `.report-detail-row` 스타일 추가 |
| `rules/open-api-auto-test.md` | step별 요청/응답 펼침 + 실행 이력 복원 동작 문서화 |

---

## 2026-06-07 Update

### IP 화이트리스트 DB Compute 절감 (마스터 플래그 + 미들웨어 정적 제외)

Neon(Vercel Postgres) compute 사용량 급증 원인이 **IP 화이트리스트 체크가 모든 요청(정적 자산·봇 트래픽 포함)마다 DB를 깨워 compute가 suspend되지 못함**임을 분석으로 확인하고 보완했습니다. (현재 IP 화이트리스트 기능은 미사용 상태였으나, 기능이 꺼져 있어도 `enabled` 확인을 위해 DB를 조회하던 구조)

#### 동작

- **마스터 플래그(`IP_WHITELIST_ENABLED`)**: `'1'`/`'true'`일 때만 적용. 미설정/그 외 값은 OFF이며, `middleware.js`·`ip-whitelist.js` 진입부에서 **DB를 조회하지 않고 즉시 허용**. → 기능 OFF 시 IP 화이트리스트發 DB 쿼리 0.
- **미들웨어 정적 제외**: Edge `matcher`는 넓게 유지하되(정규식 축소 금지 — 전체 라우팅 장애 방지), 정적 경로(`/assets/`, `/img/`, `/file/`, favicon, 정적 확장자)는 `middleware.js` 내부 `isStaticPath()`로 제외. global scope는 이제 직접 정적 파일 URL을 차단하지 않음(페이지/API 차단이 통제 목적).
- **마스터 플래그 가시화**: scope는 켜졌으나 마스터 플래그가 OFF면 Admin 콘솔에 경고 표시(`GET /api/admin/ip-whitelist` 응답에 `master_enabled` 추가).
- **잠금 복구**: 잘못된 규칙으로 Admin이 잠기면 `IP_WHITELIST_ENABLED` 제거/`0` + 재배포로 즉시 복구.
- **테스트 도입**: `node:test`(제로 의존성)로 CIDR/경로/정적/플래그 순수 로직 단위 테스트 추가 (`npm test`).
- **fail-open·60초 캐시·로컬호스트 우회 등 기존 정책 유지.** Edge Config 이전(설정 읽기를 DB→엣지로 이전)은 기능을 상시 ON 운영할 때 별도 검토 항목으로 보류.

#### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `middleware.js` | 마스터 플래그 단락 + `isStaticPath()` 제외 (pathname은 `new URL(request.url).pathname` — 표준 Request) |
| `controllers/_shared/ip-whitelist.js` | `checkIpAllowed` 진입부 플래그 단락(DB 호출 前) + 순수 함수 export |
| `controllers/adminIpWhitelist.js` | GET 응답에 `master_enabled` 추가 |
| `private/Admin.html` | 마스터 플래그 OFF 경고 + IP 테스트 선행 안내 |
| `test/ip-whitelist.test.js` | 신규 — node:test 단위 테스트 |
| `package.json` | `"test": "node --test"` (의존성 추가 없음) |

---

## 2026-06-05 Update

### Access Token 발급 3단계 fallback (direct → 서버 프록시)

OpenAPITester · OpenAPIAutoTest가 브라우저에서 eformsign로 직접 토큰을 발급할 때, 일부 custom/on-premise 도메인이 CORS preflight에서 `eformsign_signature` 헤더를 허용하지 않아 발급이 차단되는 문제를 보완했습니다.

#### 문제

- 토큰 발급 요청은 `Authorization` + `eformsign_signature` 커스텀 헤더를 실어 **CORS preflight(OPTIONS)** 를 유발
- 일부 서버의 `Access-Control-Allow-Headers`에 `eformsign_signature`가 빠져 있어 브라우저가 본 요청을 차단 (Postman·주소창 직접 호출은 CORS 미적용이라 정상 동작 → 오인 진단 유발)

#### 동작 — 전송 실패 시에만 서버 프록시 재시도

```
서명·execTime 1회 계산
 ① 브라우저 direct fetch (eformsign 도메인 직접)
     ├ 응답 도착 + 토큰 있음 → 성공
     ├ 응답 도착 + 토큰 없음 → 인증거부 → 즉시 최종 실패 (프록시 건너뜀)
     └ throw(CORS/네트워크) → ②
 ② POST /api/getToken 서버 프록시 (동일 서명·execTime 재사용)
     ├ 200 + 토큰 → 성공 (무음)
     └ 실패 → 최종 실패
```

- **전송 실패(CORS/네트워크)일 때만** 프록시로 재시도. 인증거부(응답 도착·토큰 없음)는 프록시 우회가 무의미하므로 즉시 최종 실패 처리 → 정상 환경의 불필요한 2차 호출·지연 방지
- **모든 환경 적용**. 운영(SaaS)/공공(CSAP)은 ①에서 즉시 성공하므로 프록시 미진입 — 기존 동작·성능 무영향 (순수 추가형, 회귀 없음)
- **비밀키는 브라우저를 벗어나지 않음** — 서명은 브라우저에서 jsrsasign으로 계산하고, 프록시에는 계산된 **서명값만** 전달 (기존 `controllers/getToken.js` 계약 그대로 활용)
- 프록시 경유 성공은 **무음 처리** (사용자에게는 일반 발급 토스트만, 경유 여부는 콘솔 로그로만 기록)

#### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `assets/js/openapi/ui.js` | `getAccessToken()` 재구조화 + `tryDirectToken` / `tryProxyToken` / `applyIssuedToken` 헬퍼 분리 (Signature·Bearer 양 모드 적용) |
| `assets/js/OpenAPIAutoTest.js` | `issueTokenFromPanel()`에 fallback 적용 + `fetchTokenDirect` / `fetchTokenViaProxy` 헬퍼 추가 (signature 모드) |
| `controllers/getToken.js` | 변경 없음 — 기존 서버 프록시 엔드포인트 재사용 |

> **참고**: 근본 해결은 대상 서버 nginx의 `Access-Control-Allow-Headers`에 `eformsign_signature` 추가입니다. 본 fallback은 서버 수정이 어렵거나 CORS가 막힌 도메인을 클라이언트 측에서 구제하기 위한 보완책입니다.

### eformsign 에러 메시지 프록시 응답 전달 (`error.upstream`)

`/api/getToken` 프록시 경유 발급 시, eformsign이 에러를 반환해도 클라이언트가 우리 고정 메시지만 받고 eformsign 원본 에러를 받지 못하던 문제를 보완했습니다.

#### 원인

`controllers/_shared/respond-error.js`의 `buildJsonPayload`가 응답 본문에 `status·code·message·reason·action` 5개 필드만 직렬화 → `getToken.js`가 넘기던 eformsign 에러 정보는 서버 로그로만 남고 응답엔 빠져 있었습니다.

#### 동작

- `respond-error.js`에 **opt-in `upstream` 패스스루** 추가 — 컨트롤러가 `options.upstream`을 넘긴 경우에만 응답 `error.upstream`에 포함. 미전달 시 기존 5필드 그대로라 **타 엔드포인트 무영향(회귀 없음)**
- `getToken.js`는 eformsign non-ok 응답에서 `{ status, code, message, body }`(원본 전문 포함)를 추려 `upstream`으로 전달. 형식 불일치 대비 `message`/`ErrorMessage`/`error_message`, `code`/`error_code` 모두 탐색
- 클라이언트(OpenAPITester `tryProxyToken` / OpenAPIAutoTest `fetchTokenViaProxy`)는 실패 메시지에 `error.upstream`을 우선 사용 → 토스트에 **`[코드] 메시지`** 형식으로 eformsign 원본 에러 표시
- eformsign 연결 실패(catch 분기)는 응답 body가 없으므로 변경 없음

> eformsign 에러는 사용자가 직접 테스트 중인 외부 API의 응답이므로 노출이 정당하며, 내부 예외·시크릿 비노출 정책과 충돌하지 않습니다.

#### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `controllers/_shared/respond-error.js` | `buildJsonPayload`에 opt-in `upstream` 패스스루 추가 (범용) |
| `controllers/getToken.js` | non-ok 분기에서 `upstream` 객체 구성·전달 |
| `assets/js/openapi/ui.js` | `tryProxyToken` 실패 메시지에 `upstream.code/message` 우선 사용 |
| `assets/js/OpenAPIAutoTest.js` | `fetchTokenViaProxy` 동일 적용 |

---

## 2026-04-25 Update

### 버그 리포트 개선 — 사용자 현황 조회 + 관리자 답변 + 양방향 알림

#### 변경 개요

- 사용자가 본인 제보 목록과 처리 현황을 `community/bug-report.html` 내 탭으로 확인 가능
- 관리자가 버그 원인·조치 사항을 Admin Console에서 직접 기록 가능
- 상태 변경 시 제보자에게 알림 전송 (기존 admin 수신 전용 → 양방향)

#### DB 변경

| 테이블 | 변경 |
|--------|------|
| `bug_reports` | `cause TEXT`, `action_taken TEXT` 컬럼 추가 |
| `notifications` | `target_user_id UUID REFERENCES users(id)` 컬럼 추가 (NULL = target_role 기반, NOT NULL = 특정 사용자 대상) |

#### 마이그레이션

```bash
node scripts/migrate-bug-reports-v2.js
```

#### 신규 알림 타입

| type | 발생 시점 | 수신자 |
|------|----------|--------|
| `bug_report_status` | 관리자가 버그 상태 변경 시 | 제보자(target_user_id) |
| `bug_report_reply` | 관리자가 버그 원인 또는 조치 사항 최초 등록 시 | 제보자(target_user_id) |

#### `community/bug-report.html` — 탭 통합 구조

`.panel` 안에 탭 헤더 추가. 비로그인 시에도 탭 표시, 내 제보 목록 탭 클릭 시 로그인 안내.

| 탭 | 내용 |
|----|------|
| 버그 제보 | 기존 제보 폼 (변경 없음) |
| 내 제보 목록 | 본인 제보 카드 리스트 + 클릭 시 상세 뷰 (원인·조치·메모 포함) |

- 제보 성공 후 자동으로 "내 제보 목록" 탭 전환
- `#my-reports` URL 해시 진입 시 내 제보 목록 탭 자동 활성화 (알림 클릭 연동)
- 관리자 답변(`cause`/`action_taken`/`admin_note`) 없으면 "관리자가 검토 중입니다." 안내 표시

#### Admin Console — 버그 리포트 탭 개선

- 상세 패널에 **버그 원인** (`cause`)·**조치 사항** (`action_taken`) textarea 추가
- "답변 저장" 버튼으로 `status`, `cause`, `action_taken`, `admin_note` 4개 필드 일괄 전송

#### 알림 벨 — 일반 사용자 확장

기존 admin 전용이던 알림 벨(`🔔`)을 로그인한 일반 사용자에게도 표시.
- admin: `target_role = 'admin'` 알림
- 일반 사용자: `target_user_id = 본인` 알림 (버그 리포트 상태 변경·답변 등록)
- 알림 클릭 시 `/community/bug-report.html#my-reports` 이동

#### 변경 파일

| 파일 | 변경 내용 |
|------|----------|
| `scripts/migrate-bug-reports-v2.js` | 신규 — bug_reports, notifications 컬럼 추가 마이그레이션 |
| `controllers/bug-reports.js` | mine 엔드포인트 추가, cause·action_taken 저장, 상태 변경·답변 등록 시 알림 INSERT |
| `controllers/notifications.js` | admin/일반 사용자 역할 분기 (target_role vs target_user_id) |
| `private/Admin.html` | cause·action_taken 필드 추가, 답변 저장 버튼 통합 |
| `community/bug-report.html` | 탭 통합 (제보 폼 + 내 제보 목록/상세) |
| `assets/js/auth-status.js` | 일반 로그인 사용자에게도 알림 벨 표시 |

---

### 커뮤니티 기능 추가 (개발자 노트 + 버그 리포트 게시판)

index.html 유틸리티 섹션 아래에 "커뮤니티" 섹션을 신설하고 두 가지 기능을 추가했습니다.

#### 개발자 노트 (`/community/developer-notes.html`)

- **읽기**: 누구나 (public)
- **쓰기/수정/삭제**: admin만
- **내용 형식**: 마크다운 (marked.js CDN) — 상단 고정(pinned), 버전 배지 지원

#### 버그 리포트 게시판 (`/community/bug-report.html`)

- **제보**: 로그인 사용자만 (스팸·운영부채 방지)
- **관리**: admin 전용 (Admin Console → 버그 리포트 탭)
- 제보 시 `notifications` 테이블에 `bug_report` 타입 알림 자동 생성 → admin 벨 아이콘 알림
- 알림 클릭 시 `/app/admin?tab=bug-reports` 이동

#### DB 테이블

| 테이블 | 주요 컬럼 |
|--------|-----------|
| `developer_notes` | `id, title, content(TEXT), version, author_id(UUID FK), pinned, created_at, updated_at` |
| `bug_reports` | `id, title, description, reporter_user_id(UUID FK), severity(low/normal/high/critical), status(open/in-progress/resolved/closed), cause(TEXT), action_taken(TEXT), admin_note, created_at, updated_at` |
| `notifications` | `id, type, target_role(default 'admin'), target_user_id(UUID FK, nullable), reference_id, title, body, is_read, created_at, read_at` |

#### API 엔드포인트

**개발자 노트** (`/api/developer-notes`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/developer-notes` | public | 목록 (pinned 우선, 최신순, 정렬 파라미터 지원) |
| GET | `/api/developer-notes/:id` | public | 단건 조회 |
| POST | `/api/developer-notes` | admin | 작성 |
| PATCH | `/api/developer-notes/:id` | admin | 수정 (표준) |
| POST | `/api/developer-notes/:id/update` | admin | 수정 (PATCH 우회용 — Admin Console에서 사용) |
| DELETE | `/api/developer-notes/:id` | admin | 삭제 |

**버그 리포트** (`/api/bug-reports`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/bug-reports` | 로그인 사용자 | 제보 + admin 알림 생성 |
| GET | `/api/bug-reports/mine` | 로그인 사용자 | 본인 제보 목록 (cause·action_taken 포함) |
| GET | `/api/bug-reports/mine/:id` | 로그인 사용자 | 본인 제보 단건 상세 |
| GET | `/api/bug-reports` | admin | 목록 (status/severity 필터 지원) |
| GET | `/api/bug-reports/:id` | admin | 단건 상세 |
| PATCH | `/api/bug-reports/:id` | admin | 상태/원인/조치/메모 수정 (표준) |
| POST | `/api/bug-reports/:id/update` | admin | 상태/원인/조치/메모 수정 (PATCH 우회용 — Admin Console에서 사용) |
| DELETE | `/api/bug-reports/:id` | admin | 삭제 |

> **`/update` 우회 경로**: 일부 환경(로컬 `vercel dev`)에서 PATCH + JSON body 요청이 정상 처리되지 않는 문제로 `POST /:id/update` 보조 경로를 추가했습니다. 두 경로는 동일한 핸들러를 공유합니다.

#### 마이그레이션

```bash
POSTGRES_URL="..." node scripts/migrate-community.js
```

#### 변경 파일

| 파일 | 변경 유형 |
|------|-----------|
| `scripts/migrate-community.js` | 신규 — developer_notes, bug_reports 테이블 + 인덱스 |
| `controllers/developer-notes.js` | 신규 |
| `controllers/bug-reports.js` | 신규 |
| `api/index.js` | 수정 — 라우트 2개 추가 |
| `community/developer-notes.html` | 신규 |
| `community/bug-report.html` | 신규 |
| `utils/developer-notes.html` | 신규 — `/community/developer-notes.html` 리디렉트 스텁 |
| `utils/bug-report.html` | 신규 — `/community/bug-report.html` 리디렉트 스텁 |
| `private/Admin.html` | 수정 — 버그 리포트 탭 추가 |
| `assets/js/notification-bell.js` | 수정 — `bug_report` 이동 경로 추가 |
| `assets/js/auth-status.js` | 수정 — `bug_report` 이동 경로 추가 |
| `index.html` | 수정 — `theme-community` CSS + 커뮤니티 섹션 카드 |

---

## 2026-05-25 Update

### 알림 실시간 전환 — DB 폴링 제거, Pusher WebSocket 푸시

기존 60초 DB 폴링 방식을 Pusher WebSocket 실시간 푸시로 전환했습니다. Neon(Vercel Postgres) Free 티어 연결 제한 소진 문제를 해결하고 알림 전달 지연을 최소화합니다.

#### 서버 변경

| 파일 | 변경 내용 |
|---|---|
| `controllers/_shared/pusher.js` | 신규 — Pusher 인스턴스 공통 모듈 (알림 + Webhook 공용). `triggerNewNotification()` 헬퍼 포함 |
| `controllers/pusher-auth.js` | 신규 — Pusher private 채널 인증 (`POST /api/pusher/auth`). JWT 쿠키 검증 → 본인 채널 또는 admin 채널만 허용 |
| `controllers/notifications.js` | 수정 — 알림 생성/읽음/삭제 시 Pusher 이벤트 발행 추가. `unread_count` payload 포함 |
| `controllers/me.js` | 수정 — `/api/me` 응답에 `pusher_key`, `pusher_cluster`, `id` 추가 |
| `controllers/webhook-receiver.js` | 수정 — 공통 Pusher 인스턴스 사용으로 전환 |
| `api/index.js` | 수정 — `pusher/auth` 라우트 추가 |

#### Pusher 채널 및 이벤트

| 채널명 | 대상 |
|---|---|
| `private-notifications-admin` | admin 역할 전체 |
| `private-notifications-{userId}` | 특정 사용자 |

| 이벤트명 | 발생 시점 |
|---|---|
| `new-notification` | 알림 INSERT 후 |
| `notification-read` | 단건 읽음 처리 후 |
| `notifications-read` | 전체 읽음 처리 후 |
| `notification-deleted` | 단건 삭제 후 |
| `notifications-cleared` | 전체 삭제 후 |

#### 클라이언트 변경

| 파일 | 변경 내용 |
|---|---|
| `assets/js/auth-status.js` | 60초 DB 폴링 제거 → Pusher WebSocket 구독. 로그인한 모든 사용자에게 벨 활성화 (기존 admin 전용 → 전체 확대). Pusher 연결 실패 시 300초 fallback 폴링 |
| `assets/js/notification-bell.js` | 동일 변경 적용. `NotifBell.init(container, meData)` 시그니처로 Pusher 설정 수신 |
| 모든 페이지 HTML | Pusher CDN (`pusher.min.js`) 로드 추가 — `auth-status.js` / `notification-bell.js` 로드 전에 필수 |

#### 효과

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| 알림 전달 | 60초 DB 폴링 | Pusher WebSocket 즉시 푸시 |
| DB 연결 부하 | 클라이언트 × 분당 1회 쿼리 | 알림 이벤트 발생 시에만 쿼리 |
| 알림 대상 | admin 전용 | 로그인한 모든 사용자 |
| Fallback | 없음 | Pusher 연결 실패 시 300초 폴링 |

---

## 2026-04-24 Update

### 관리자 알림(Notification Bell) 기능 추가

> **Note**: 이 섹션의 60초 DB 폴링 방식은 2026-05-25 업데이트에서 Pusher WebSocket 실시간 푸시로 전환되었습니다. 현재는 Pusher 연결 실패 시에만 300초 fallback 폴링이 동작합니다. → [2026-05-25 Update](#2026-05-25-update) 참고

admin 계정에게 회원가입 요청 등 주요 이벤트를 실시간으로 알려주는 알림 시스템을 추가했습니다.

#### 아키텍처

- **DB**: 신규 `notifications` 테이블 — `type`, `target_role`, `reference_id`, `title`, `body`, `is_read`
- **백엔드**: `controllers/notifications.js` — 역할별 분기 조회/읽음 처리 API (admin: target_role, 일반 사용자: target_user_id)
- **트리거**: 회원가입 요청(`POST /api/signup`) 시 자동 INSERT. 신규 알림 타입 추가는 서버에서 INSERT 한 줄만 추가하면 클라이언트 무변경

#### 프론트엔드 — 2파일 구조

| 파일 | 설명 |
|---|---|
| `assets/js/auth-status.js` | 기존 상단 바에 알림 벨 통합. 로그인한 모든 사용자 + 기본 모드에서 활성화 (CORNER 모드 제외) |
| `assets/js/notification-bell.js` | `index.html` 전용 독립 모듈 (IIFE → `window.NotifBell`). `index.html`은 auth-status.js 적용 제외 페이지라 별도 모듈로 분리 |

- **실시간 전달**: Pusher WebSocket private 채널로 알림 이벤트 즉시 푸시 (Pusher 연결 실패 시 300초 fallback 폴링)
- **드롭다운 패널**: 벨 클릭 시 최신 알림 목록 표시 + "모두 읽음" 처리
- **항목 클릭**: 단건 읽음 처리 후 연관 페이지 이동 (signup_request → `/app/admin?tab=signup-requests`)
- **패널 위치**: `notification-bell.js`는 `getBoundingClientRect()` 기반 동적 계산 — 스크롤 위치 무관

#### 마이그레이션

```bash
node scripts/migrate-notifications.js
```

#### 현재 지원 알림 타입

| type | 발생 시점 |
|---|---|
| `signup_request` | 회원가입 요청 접수 시 |

---

### 알림 삭제 기능 추가

알림 패널에 개별 삭제(X 버튼)와 전체 삭제 기능을 추가했습니다.

#### 변경된 동작

| 동작 | 결과 |
|---|---|
| 알림 항목 우측 **X 버튼** 클릭 | 페이지 이동 없이 해당 항목만 즉시 제거. 미읽음 항목이면 배지 카운트 즉시 감소 |
| 패널 헤더 **"전체 삭제"** 버튼 클릭 | 전체 삭제 후 패널 새로고침 |
| 알림 항목 클릭 (이동) | 기존과 동일 — 단건 읽음 처리 후 연관 페이지 이동 |

- X 버튼: 평상시 반투명, hover 시 빨간색 강조
- 목록이 모두 비워지면 패널이 "알림이 없습니다." 상태로 즉시 전환 (API 재호출 없음)
- "전체 삭제" 버튼은 알림이 하나라도 있을 때만 헤더에 노출

#### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `controllers/notifications.js` | `DELETE /api/notifications/:id`, `DELETE /api/notifications` 핸들러 추가 |
| `assets/js/notification-bell.js` | X 버튼·전체 삭제 버튼 UI 및 클릭 핸들러 추가 (`._nb-del`, `._nb-del-all`) |
| `assets/js/auth-status.js` | 동일 변경 적용 (`.anp-del`, `.anp-del-all`) |

---

### eformsign 크리덴셜 비밀 키 AES-256-GCM 암호화 적용

DB에 plaintext로 저장되던 `secret_key`(EC 개인키)를 AES-256-GCM으로 암호화하여 저장하도록 변경했습니다.

- **암호화 키**: `CREDENTIAL_ENCRYPTION_KEY` 환경변수 (32바이트 hex, `openssl rand -hex 32`)
- **저장 형식**: `{iv_hex}:{authTag_hex}:{ciphertext_hex}` — DB에는 암호문만 저장
- **복호화 시점**: 단건 조회(`GET /api/credentials/:id`) 시 서버에서 복호화 후 반환 — 클라이언트(`credential-panel.js`) 변경 없음
- **null 처리**: 비밀 키를 저장하지 않은 크리덴셜은 암호화/복호화 대상에서 제외, 기존 동작 유지
- **기존 데이터 마이그레이션**: `scripts/migrate-credentials-encrypt.js` one-time 스크립트로 기존 plaintext 데이터 일괄 재암호화 가능
- **하위 호환**: 마이그레이션 전 기존 plaintext 데이터도 정상 복호화 — `isEncrypted()` 판별 후 분기 처리

#### 마이그레이션 (기존 저장된 비밀 키가 있는 경우)

```bash
POSTGRES_URL="..." CREDENTIAL_ENCRYPTION_KEY="..." node scripts/migrate-credentials-encrypt.js
```

#### 환경변수 키 생성

```bash
# Linux/Mac
openssl rand -hex 32

# PowerShell
-join ((1..32) | ForEach-Object { '{0:x2}' -f (Get-Random -Max 256) })
```

Vercel 대시보드에서 Production / Preview / Development 세 환경 모두 등록 후 `vercel env pull .env.local` 로 로컬 동기화.

### 크리덴셜 저장/불러오기 모달 환경 선택 및 Custom URL 표시 개선

`assets/js/credential-panel.js` 단일 파일 수정. 서버·DB·HTML 파일 변경 없음.

**저장 모달:**
- 환경 선택 드롭다운 (`#_cpSaveEnv`) 추가 — 운영(SaaS) / 공공(CSAP) / 직접 입력
- `직접 입력` 선택 시 Custom URL 입력 필드 (`#_cpSaveCustomUrl`) 동적 표시
- 모달 열릴 때 현재 페이지 환경·URL이 초기값으로 자동 세팅
- `envFixed` 페이지에서는 환경 select disabled 처리
- 저장 시 환경·URL은 모달 필드에서 직접 읽음 (페이지 필드 재참조 없음)

**불러오기 모달:**
- `custom` 환경 항목의 환경 태그에 실제 URL 표시: `직접 입력 · {url}`
- `custom_url`이 없는 항목은 기존과 동일하게 `직접 입력`만 표시
- 긴 URL은 `max-width:320px` + 말줄임(`text-overflow:ellipsis`) 처리

---

## 2026-04-21 Update

### Open API Tester — Body 에디터 실시간 JSON 유효성 검증

- **실시간 JSON 검증**: Body 탭 textarea 입력 시 300ms debounce 후 자동 유효성 검사
  - 유효한 JSON → 초록 테두리
  - 유효하지 않은 JSON → 빨간 테두리 + 하단 에러 메시지 (SyntaxError 내용, 위치 포함)
  - 빈 입력 → 중립 상태 (검증 비활성)
  - API 선택 변경 시 에러 상태 자동 초기화
- **Format JSON 버튼**: 기존 "정렬" 버튼 아이콘/레이블 개선, `Ctrl+Shift+F` 단축키 추가
- `OpenAPITesterFull.html`, `OpenAPITesterProd.html` 양쪽 모두 적용
- **에러 위치 빨간 물결 밑줄**: Backdrop Overlay 기법 적용 — `e.message`의 `position N` 파싱 후 해당 토큰에 `text-decoration: underline wavy` 표시. textarea 뒤에 `#bodyHighlights` div를 겹쳐 렌더링
- 관련 함수: `showBodyError()` / `clearBodyError()` / `markBodyValid()` / `_validateBodyJson` / `_escapeHtml()` / `_getErrorRange()` / `_buildHighlightHtml()` / `_updateBackdrop()` / `syncBackdropScroll()` (`ui.js`)

---

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
- **불러오기 UX**: 인증 불러오기 모달에서 항목별 인증 이름·API Key·User ID·비밀 키 저장 여부를 레이블-값 리스트로 표시, [선택] 시 인증 패널 자동 채움. `custom` 환경 항목은 환경 태그에 `직접 입력 · {url}` 형식으로 실제 URL 표시 (말줄임 처리 포함)
- **저장 UX**: 저장 모달에서 이름 입력 + 인증 패널 현재 값 pre-fill, 수정 후 저장 가능. **환경 선택 드롭다운** (운영/공공/직접 입력) 포함 — 직접 입력 선택 시 Custom URL 입력 필드 동적 표시. `envFixed` 페이지에서는 환경 선택 disabled
- **비밀 키 저장**: 체크박스로 선택 저장 (`secret_key` nullable) — 미저장 시 불러오기 후 직접 입력 안내
- **비로그인 차단**: 저장/불러오기 버튼 클릭 시 미인증이면 로그인 안내 모달 표시 (`?next=현재경로` 포함)
- **보안**: 목록 조회 시 비밀 키 미반환 (`has_secret_key: boolean`만), 단건 조회 시에만 비밀 키 포함 응답. 비밀 키는 DB에 AES-256-GCM 암호화하여 저장 (→ 2026-04-24 Update 참고)
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
