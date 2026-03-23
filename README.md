# MiniProject-Hub (ProjectImprove)

eformsign 문서 관리 플랫폼 연동을 위한 API, 임베딩, 유틸리티 통합 허브입니다.
Node.js 기반의 서버리스 애플리케이션으로 Vercel에 배포되어 운영됩니다.

---

## 주요 기능

- **Open API Tester** — Postman 스타일의 eformsign Open API 테스트 도구 (Beta)
- **문서 관리 API** — eformsign API를 통한 문서 생성, 조회, 다운로드
- **SAML 2.0 SSO** — SP/IDP 시작 방식의 싱글사인온 인증 연동
- **임베딩 통합** — 다중 환경(SaaS, CSAP 등)에서의 문서/템플릿 임베딩
- **실시간 웹훅** — Pusher 기반 웹훅 수신 및 이벤트 브로드캐스팅
- **유틸리티 도구** — SMTP 테스트, CORS 테스트, Base64, JSON 포매터 등
- **보호된 관리 페이지** — 쿠키 기반 세션 인증으로 접근 제어

---

## 기술 스택

| 구분 | 기술 |
|------|------|
| Runtime | Node.js (Serverless) |
| Framework | Next.js 15 |
| Deployment | Vercel |
| 인증 | SAML 2.0 (`samlify`), ECDSA (`jsrsasign`), Cookie Session |
| 실시간 통신 | Pusher |
| 이메일 | Nodemailer |

---

## 프로젝트 구조

```
ProjectImprove/
├── api/
│   └── index.js                  # API 라우터 (지연 로딩 방식)
├── controllers/                  # 각 엔드포인트 비즈니스 로직
│   ├── auth.js                   # SAML 응답 생성
│   ├── login.js                  # 쿠키 세션 인증
│   ├── getToken.js               # ECDSA 서명 기반 액세스 토큰 생성
│   ├── downloadDocument.js       # 문서 파일 프록시 다운로드
│   ├── getDocumentInfo.js        # 문서 메타데이터 조회
│   ├── webhook-receiver.js       # 웹훅 수신 (Pusher 트리거)
│   ├── sso-login.js              # SAML SSO 로그인 폼
│   ├── idp-initiated-login.js    # IDP 시작 SAML 플로우
│   ├── metadata.js               # SAML 메타데이터 엔드포인트
│   ├── send.js                   # SMTP 이메일 테스트
│   ├── memberPage.js             # 회원 정보 관리 페이지
│   ├── ApiAutoTest.js            # API 자동화 테스트 페이지
│   └── templatecopy.js           # 템플릿 복사 유틸리티
├── lib/
│   └── saml.js                   # SAML IDP/SP 설정
├── auth/
│   └── login.html                # 로그인 UI
├── API(JS,HTML)/                 # eformsign API 연동 프론트엔드 템플릿
│   └── OpenAPITester.html        # ★ Postman 스타일 Open API 테스터 (Beta) — HTML/CSS만 포함
├── Embedding/                    # 문서/템플릿 임베딩 도구
├── utils/                        # 공개 유틸리티 도구
├── certs/                        # SSL/TLS 인증서
├── assets/js/
│   ├── ApiAutoTestStart.js       # API 자동화 테스트 로직
│   └── OpenAPITester.js          # ★ OpenAPITester 전용 JS (API_LIST 데이터 + 앱 로직)
├── index.html                    # 메인 허브 페이지
├── package.json
└── vercel.json                   # Vercel 라우팅 설정
```

---

## API 엔드포인트

### 인증

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `GET /api/sso-login` | GET | SAML SSO 로그인 폼 |
| `POST /api/auth` | POST | SAML 응답 생성 |
| `POST /api/idp-initiated-login` | POST | IDP 시작 SAML 플로우 |
| `GET /api/metadata` | GET | SAML 메타데이터 XML |
| `POST /api/login` | POST | 쿠키 세션 로그인 |

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

## 인증 방식

### 1. SAML 2.0 SSO
- **라이브러리:** `samlify`
- **SP Entity ID:** `https://mini-project-improve.vercel.app/api/metadata`
- **ACS Endpoint:** `https://test-kr-service.eformsign.com/v1.0/saml_redirect`
- SP 시작 및 IDP 시작 플로우 모두 지원

### 2. 쿠키 기반 세션 인증
- 보호된 관리 페이지 접근 시 사용
- 세션 유효 시간: **15분**
- `httpOnly`, `secure`, `sameSite=strict` 플래그 적용

### 3. ECDSA 서명 인증
- **알고리즘:** SHA256withECDSA
- eformsign API 액세스 토큰 발급 시 사용
- `eformsign_signature` 헤더로 서명값 전달

---

## 환경 변수

배포 전 아래 환경 변수를 Vercel 프로젝트 설정에 등록해야 합니다.

```env
# SAML 인증
SAML_PRIVATE_KEY=        # base64 인코딩된 개인 키
SAML_PUBLIC_CERT=        # base64 인코딩된 공개 인증서

# 쿠키 세션
AUTH_COOKIE_VALUE=       # 세션 쿠키 값

# 페이지별 접근 비밀번호
MEMBER_PAGE_PASSWORD=
APIAUTOTEST_PAGE_PASSWORD=
TEMPLATECOPY_PAGE_PASSWORD=
IDP_TEST_PAGE_PASSWORD=

# Pusher (웹훅)
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
```



## 배포

이 프로젝트는 Vercel을 통해 자동 배포됩니다.

```bash
# Vercel CLI로 배포
vercel --prod
```

`vercel.json`의 라우팅 설정에 따라 `/api/*` 요청은 `api/index.js`로 일괄 처리됩니다.

---

## Open API Tester (Beta)

`API(JS,HTML)/OpenAPITester.html` + `assets/js/OpenAPITester.js`

Postman과 유사한 인터페이스로 eformsign Open API를 브라우저에서 직접 테스트할 수 있는 도구입니다.

### 주요 기능

| 기능 | 설명 |
|------|------|
| API 사이드바 | OPA2_XXX 번호 배지, 그룹별 목록, 검색, 너비 드래그 조절 |
| 인증 패널 | Signature / Bearer 방식 선택, Access Token 자동 발급 |
| Path 탭 | URL 경로 파라미터 입력 (키 readonly, 배지 = 파라미터 개수) |
| Query 탭 | Query String 입력, 체크박스 활성화, 행 추가 가능 |
| Headers 탭 | 헤더 추가/수정, API별 필수 헤더 자동 노출 |
| Body 탭 | JSON 에디터, 높이 드래그 조절로 자동 확장 — DELETE 메서드도 Body 포함하여 전송 (OPA2_009, OPA2_020 등) |
| Response 뷰어 | 상태 코드 배지, JSON 문법 강조, 엔드포인트별 결과 캐싱 |
| 예시 응답 | 성공/실패/조회결과없음 응답 구조 미리보기 (타입 표현) |
| Send and Download | 응답을 파일로 강제 저장 (Content-Type 기반 확장자 자동 결정) |
| Code Snippet | cURL / JS(fetch) / JS(jQuery) / Python / Java 코드 자동 생성 |
| 사용 가이드 | 5단계 스텝 카드 형식 사용법 안내 모달 |

### 등록된 API (OPA2_XXX) 및 예시 응답 현황

| 그룹 | API 목록 | 예시 응답 |
|------|---------|----------|
| 인증 | OPA2_001 Access Token 발급, OPA2_002 Access Token 갱신 | 성공+실패 |
| 문서 | OPA2_003~009, 014, 016, 021, 031, 040, 042, 045 | OPA2_003~009, 014, 016, 021, 031 성공+실패 완비 |
| 템플릿 | OPA2_015, 024 | OPA2_015, 024 성공+실패 완비 |
| 멤버 | OPA2_010~013, 030 | OPA2_010~013, 030 성공+실패 완비 |
| 그룹 | OPA2_017~020 | OPA2_017~020 성공+실패 완비 |
| 회사 도장 | OPA2_025~029 | OPA2_025~029 성공+실패 완비 |
| 회사 기타 | OPA2_037 | 실패(공통) |

---

## 유틸리티 도구 목록

`/utils/` 경로에서 아래 도구들을 사용할 수 있습니다.

| 도구 | 설명 |
|------|------|
| SMTP Tester | 이메일 서버 연결 테스트 |
| Webhook Dashboard | 웹훅 수신 현황 모니터링 |
| CORS Tester | CORS 정책 테스트 |
| RSA/ECDSA Test | 서명 생성 및 검증 테스트 |
| Timestamp Converter | Unix 타임스탬프 변환 |
| Base64 Encoder | Base64 인코딩/디코딩 |
| JSON/XML Formatter | JSON, XML 포매팅 |
| Document Bulk Delete | 문서 일괄 삭제 |
| Document Bulk Download | 문서 일괄 다운로드 |
| Template Delete Tool | 템플릿 일괄 삭제 |
