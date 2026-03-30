## 프로젝트 구조

```
ProjectImprove/
├── index.html                  # 메인 허브 페이지 (모든 도구 링크 모음)
├── favicon.svg                 # 공통 파비콘 (플러그 아이콘, #1a73e8)
├── vercel.json                 # Vercel 배포 라우팅 설정
├── package.json
│
├── api/
│   └── index.js                # 메인 API 라우터 (lazy-loading)
│
├── controllers/
│   ├── _shared/
│   │   ├── protected-pages-config.js  # 보호 페이지 설정 공통화
│   │   └── protectedPage.js           # 보호 페이지 공통 핸들러
│   ├── getToken.js             # ECDSA 서명으로 Access Token 발급
│   ├── downloadDocument.js     # 문서 파일 프록시 다운로드
│   ├── getDocumentInfo.js      # 문서 메타데이터 조회
│   ├── webhook-receiver.js     # Webhook 수신 → Pusher 브로드캐스트
│   ├── memberPage.js           # 멤버 관리 페이지 (인증 보호)
│   ├── OpenAPIAutoTest.js      # OPA 번호 기준 자동 테스트 페이지 (인증 보호)
│   ├── templatecopy.js         # 템플릿 복제 도구 (인증 보호)
│   ├── idptestauth.js          # IdP 테스트 페이지 (인증 보호)
│   ├── auth.js                 # SAML 응답 생성
│   ├── login.js                # 쿠키 세션 인증
│   ├── sso-login.js            # SAML SSO 로그인 폼
│   ├── idp-initiated-login.js  # IdP 개시 SAML 플로우
│   ├── metadata.js             # SAML 메타데이터 엔드포인트
│   └── send.js                 # SMTP 이메일 테스트
│
├── lib/
│   └── saml.js                 # SAML IdP/SP 설정 (samlify)
│
├── auth/
│   └── login.html              # 인증 보호 페이지용 로그인 UI
│
├── private/                    # 비밀번호 보호 콘텐츠 (컨트롤러에서 서빙)
│   └── OpenAPIAutoTest.html / Member.html / templatecopy.html / idp-test.html
│
├── API(JS,HTML)/
│   └── OpenAPITester.html      # Postman 스타일 API 테스터 (Beta) — HTML/CSS만 포함
│
├── Embedding/                  # 문서/템플릿 임베딩 도구
├── utils/                      # 공개 유틸리티 도구 (webhook, smtp, CORS, base64 등)
│
├── assets/js/
│   ├── OpenAPIAutoTest.js      # OPA 자동 테스트 전체 로직 (단일 파일)
│   ├── OpenAPITester.js        # 원본 보존용 (롤백 시 참고) — 직접 편집 금지
│   └── openapi/                # OpenAPITester 분할 모듈 (로드 순서 중요)
│       ├── api-list.js         #   API_LIST 데이터
│       ├── api-specs.js        #   API_SPECS 데이터
│       ├── state.js            #   DOMAINS, state, responseCache, 공통 헬퍼
│       ├── ui.js               #   사이드바, 요청 빌더, 인증, 전송, 응답, 코드 스니펫
│       └── init.js             #   탭 이벤트, document.ready, 리사이즈, API 명세 모달
│
└── docs/
    └── openapi-response-status.md  # 예시 응답 현황
```
