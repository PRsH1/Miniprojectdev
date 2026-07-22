## 프로젝트 구조

```
ProjectImprove/
├── index.html                  # 메인 허브 페이지 (모든 도구 링크 모음)
├── favicon.svg                 # 공통 파비콘 (플러그 아이콘, #1a73e8)
├── middleware.js               # Vercel Edge Middleware — IP 화이트리스트 global scope 체크
├── vercel.json                 # Vercel 배포 라우팅 설정
├── package.json
│
├── api/
│   └── index.js                # 메인 API 라우터 (lazy-loading) + IP 화이트리스트 path/protected 체크
│
├── controllers/
│   ├── _shared/
│   │   ├── respond-error.js           # 공통 에러 응답 유틸 (JSON/HTML 분기, error.upstream)
│   │   ├── auth-middleware.js         # /app/* 보호 페이지 인증·권한·리프레시 미들웨어
│   │   ├── db.js                      # Neon serverless Postgres 클라이언트 (sql 태그)
│   │   ├── jwt.js                     # JWT 발급/검증 헬퍼
│   │   ├── session.js                 # resolveUser — API용 세션 해석 (verify→만료 시 리프레시 로테이션)
│   │   ├── audit.js                   # audit_logs INSERT 공통 모듈
│   │   ├── protected-pages-config.js  # 보호 페이지 설정 공통화
│   │   ├── protectedPage.js           # 보호 페이지 공통 핸들러 (구 password 보호 방식)
│   │   ├── ip-whitelist.js            # IP 화이트리스트 체크 공통 모듈 (CIDR 매칭, 60초 캐시)
│   │   └── pusher.js                  # Pusher 인스턴스 공통 모듈 (알림 + Webhook 공용)
│   │
│   │   # ── 인증 API ──────────────────────────────────────────
│   ├── login.js                # 로그인 (JWT 발급 + 쿠키 세션)
│   ├── logout.js               # 로그아웃 (쿠키/리프레시 토큰 폐기)
│   ├── refresh.js              # 리프레시 토큰으로 액세스 토큰 갱신 (공유 tryRefreshToken 위임)
│   ├── me.js                   # 현재 로그인 사용자 정보 (+ Pusher 설정 포함)
│   ├── signup.js               # 회원가입 요청 (admin 알림 INSERT)
│   ├── signupStatus.js         # 가입 요청 상태 조회
│   ├── password-reset-request.js  # 비밀번호 재설정 요청
│   ├── change-password.js      # 비밀번호 변경
│   │
│   │   # ── eformsign 도구 API ────────────────────────────────
│   ├── credentials.js          # eformsign 인증 정보 저장/조회/수정/삭제 (사용자별 크리덴셜 CRUD)
│   ├── getToken.js             # ECDSA 서명으로 Access Token 발급 (eformsign 에러 → error.upstream)
│   ├── downloadDocument.js     # 문서 파일 프록시 다운로드
│   ├── getDocumentInfo.js      # 문서 메타데이터 조회
│   ├── webhook-receiver.js     # Webhook 수신 → Pusher 브로드캐스트
│   ├── send.js                 # SMTP 이메일 테스트
│   ├── requestHistory.js       # OpenAPITester 요청 히스토리 CRUD (로그인 사용자 DB 저장)
│   │
│   │   # ── 알림 / 커뮤니티 ──────────────────────────────────
│   ├── notifications.js        # 알림 목록/읽음/삭제 (역할별 분기)
│   ├── pusher-auth.js          # Pusher private 채널 인증 (JWT 검증 + 채널 소유권 확인)
│   ├── developer-notes.js      # 개발자 노트 CRUD (목록 public, 작성 admin)
│   ├── bug-reports.js          # 버그 리포트 CRUD (제보 로그인, 관리 admin)
│   │
│   │   # ── 보호 페이지 컨트롤러 (경로는 /app/* 으로 이전됨) ──
│   ├── memberV2Page.js         # 멤버/그룹 관리 V2 페이지 (인증 보호, 현행)
│   ├── memberPage.js           # (deprecated) 구 멤버 관리 페이지 (인증 보호)
│   ├── OpenAPIAutoTest.js      # OPA 번호 기준 자동 테스트 페이지 (인증 보호)
│   ├── ApiAutoTest.js          # (deprecated) 구 자동 테스트 페이지 (인증 보호)
│   ├── templatecopy.js         # 템플릿 복제 도구 (인증 보호)
│   ├── idptestauth.js          # IdP 테스트 페이지 (인증 보호)
│   ├── adminPage.js            # /app/admin 라우터 등록 참조용 (실제 처리는 auth-middleware)
│   │
│   │   # ── SAML ────────────────────────────────────────────
│   ├── auth.js                 # SAML 응답 생성 (SP개시: 요청 ACS/target으로 test·test2·testjp·dev 대상 라우팅, createTemplateCallback로 email/name 속성 채움, SAML_DEBUG 게이트 로깅)
│   ├── sso-login.js            # SAML SSO 로그인 폼 (target 쿼리로 대상 서버 강제 가능 — test·test2·testjp·dev, debug=1 게이트 플래그 폼 전달)
│   ├── idp-initiated-login.js  # IdP 개시 SAML 플로우 (폼 target으로 test·dev 선택, createTemplateCallback + SAML_DEBUG 게이트 로깅)
│   ├── metadata.js             # SAML 메타데이터 엔드포인트
│   │
│   │   # ── Admin API (/api/admin/*) ─────────────────────────
│   ├── adminUsers.js           # 사용자 + 비밀번호 재설정 요청 관리
│   ├── adminPages.js           # 보호 페이지(protected_pages) 관리
│   ├── adminAuditLogs.js       # 감사 로그 조회
│   ├── adminSignupRequests.js  # 가입 요청 승인/거부
│   ├── adminIpWhitelist.js     # IP 화이트리스트 Admin API (규칙/스코프 CRUD + 테스트)
│   │
│   └── cron/
│       └── cleanup-audit.js    # 감사 로그 정리 Cron (CRON_SECRET 검증)
│
├── lib/
│   └── saml.js                 # SAML IdP/SP 설정 (samlify, ACS_URLS test/test2/testjp/dev 대상 서버별 SP를 ACS_URLS 기반 자동 생성 + resolveTarget, loginResponseTemplate.context + createTemplateCallback로 AttributeStatement 생성, debugDeliver 진단 헬퍼)
│
├── auth/
│   └── login.html              # 인증 보호 페이지용 로그인 UI (+ signup/change-password/403 등)
│
├── errors/                     # HTML 에러 페이지 (403/404/405/500)
│
├── private/                    # 보호 콘텐츠 (컨트롤러에서 서빙, 직접 URL 차단)
│   └── Admin.html / OpenAPIAutoTest.html / MemberV2.html / Member.html
│       / templatecopy.html / idp-test.html / OpenAPITesterFull.html / ApiAutoTest.html
│
├── community/                  # 커뮤니티 페이지 (utils/*.html 은 리디렉트 스텁)
│   └── bug-report.html / developer-notes.html
│
├── API(JS,HTML)/
│   ├── OpenAPITesterProd.html  # Postman 스타일 API 테스터 — 배포 버전 (멤버 API 비공개, public)
│   └── OpenAPITester.html      # (deprecated → private/OpenAPITesterFull.html 으로 이동됨)
│
├── Embedding/                  # 문서/템플릿 임베딩 도구 (HTML)
├── Webhook/                    # Webhook 관련 공개 도구
├── utils/                      # 공개 유틸리티 도구 (webhook, smtp, CORS, base64 등)
│   └── error-codes.html        # OPA2 에러 코드 모음 (43개 엔드포인트 전체, 검색 가능)
│
├── design-preview-member.html  # MemberV2 디자인 시스템 확인용 (프로덕션 미사용)
├── img/                        # 정적 이미지 (sso_flow.png 등)
├── file/                       # 정적 첨부 (SSO 연동 가이드 PDF 등)
│
├── assets/js/
│   ├── auth-status.js          # 전 페이지 공통 로그인 상태 상단 바 + 알림 벨 (IIFE, /api/me 호출)
│   ├── notification-bell.js    # index.html 전용 알림 벨 모듈 (IIFE → window.NotifBell)
│   ├── credential-panel.js     # 크리덴셜 저장/불러오기 공유 모달 모듈 (IIFE)
│   ├── token-issuer.js         # Access Token 발급 공유 모듈 (IIFE → window.issueAccessToken, direct→CORS 실패 시 /api/getToken 프록시 fallback)
│   ├── OpenAPIAutoTest.js      # OPA 자동 테스트 전체 로직 (단일 파일)
│   ├── OpenAPITester.js        # 원본 보존용 (롤백 시 참고) — 직접 편집 금지
│   ├── ApiAutoTestStart.js     # (deprecated) 구 자동 테스트 로직
│   ├── member/                 # MemberV2 분할 모듈 (로드 순서 중요)
│   │   ├── api.js              #   API 호출, 엑셀 처리 (전역 함수)
│   │   ├── ui.js              #   렌더링 전담 (섹션 전환, 사이드바, URL 표시)
│   │   └── init.js            #   이벤트 바인딩, 초기화
│   └── openapi/                # OpenAPITester 분할 모듈 (로드 순서 중요)
│       ├── api-list.js         #   API_LIST 데이터
│       ├── api-specs.js        #   API_SPECS 데이터
│       ├── state.js            #   DOMAINS, state, responseCache, 공통 헬퍼
│       ├── ui.js               #   사이드바, 요청 빌더, 인증, 전송, 응답, 코드 스니펫
│       └── init.js             #   탭 이벤트, document.ready, 리사이즈, API 명세 모달
│
├── scripts/
│   ├── migrate.js                       # DB 스키마 초기화 + 시드 (최초 1회)
│   ├── migrate-ip-whitelist.js          # IP 화이트리스트 테이블 마이그레이션 (최초 1회)
│   ├── migrate-community.js             # developer_notes / bug_reports 테이블 (최초 1회)
│   ├── migrate-bug-reports-v2.js        # bug_reports cause/action_taken/target_user_id 컬럼 추가
│   ├── migrate-refresh-rotation.js      # refresh_tokens.replaced_by 컬럼 추가 (로테이션 경합 처리, 코드 배포 전 실행)
│   ├── migrate-credentials-encrypt.js   # 크리덴셜 secret_key 일괄 재암호화
│   ├── migrate-notifications.js         # notifications 테이블 마이그레이션
│   ├── seed-developer-notes.js          # 개발자 노트 시드
│   ├── create-admin.js                  # 최초 admin 계정 생성
│   ├── add-mass-download-page.js        # 대량 다운로드 보호 페이지 등록 스크립트
│   ├── check-protected-pages.js         # 보호 페이지 정합성 점검 (npm run check:pages)
│   ├── check-secrets.js                 # 시크릿 누출 점검 (npm run security:secrets)
│   └── mcp/                             # MCP 서버 실행 스크립트 (brave-search.ps1, tavily.ps1)
│
└── docs/
    └── openapi-response-status.md  # 예시 응답 현황
```
