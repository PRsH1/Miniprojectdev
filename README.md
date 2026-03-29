# MiniProject-Hub (ProjectImprove)

eformsign 문서 관리 플랫폼 연동을 위한 API, 임베딩, 유틸리티 통합 허브입니다.
Node.js 기반의 서버리스 애플리케이션으로 Vercel에 배포되어 운영됩니다.

---

## 주요 기능

- **Open API Tester** — Postman 스타일의 eformsign Open API 테스트 도구 (Beta)
- **Open API 자동 테스트** — OPA 번호 기준 eformsign API 자동 검증 테스트 러너 (인증 보호)
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
│   ├── ApiAutoTest.js            # (deprecated) 구 API 자동화 테스트 페이지
│   ├── OpenAPIAutoTest.js        # OPA 번호 기준 자동 테스트 페이지 (인증 보호)
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
├── private/                      # 비밀번호 보호 콘텐츠 (컨트롤러에서 서빙)
│   └── OpenAPIAutoTest.html      # OPA 자동 테스트 UI (뼈대만, 내용은 JS에서 주입)
├── assets/js/
│   ├── OpenAPIAutoTest.js        # ★ OPA 자동 테스트 전체 로직 (단일 파일)
│   ├── ApiAutoTestStart.js       # (deprecated) 구 자동화 테스트 로직
│   ├── OpenAPITester.js          # 원본 보존용 (롤백 시 참고) — 직접 편집 금지
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

### 보호 페이지

| 엔드포인트 | 메서드 | 설명 |
|-----------|--------|------|
| `GET /api/OpenAPIAutoTest` | GET | OPA 자동 테스트 페이지 (쿠키 인증 보호) |
| `GET /api/member` | GET | 멤버 관리 페이지 (쿠키 인증 보호) |
| `GET /api/templatecopy` | GET | 템플릿 복제 도구 (쿠키 인증 보호) |

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

## Open API Tester (Beta)

`API(JS,HTML)/OpenAPITester.html` + `assets/js/openapi/` (분할 모듈)

Postman과 유사한 인터페이스로 eformsign Open API를 브라우저에서 직접 테스트할 수 있는 도구입니다.

> **모듈 구조**: 기존 단일 파일(`OpenAPITester.js`)을 5개 파일로 분할하여 유지보수성 개선.
> 로드 순서: `api-list.js` → `api-specs.js` → `state.js` → `ui.js` → `init.js`

### 주요 기능

| 기능 | 설명 |
|------|------|
| API 사이드바 | OPA2_XXX 번호 배지, 검색, 너비 드래그 조절, **정렬 방식 토글** (그룹별 / 코드순 / Method별) |
| 인증 패널 | Signature / Bearer 방식 선택, Access Token 자동 발급 |
| Path 탭 | URL 경로 파라미터 입력 (키 readonly, 배지 = 파라미터 개수) |
| Query 탭 | Query String 입력, 체크박스 활성화, 행 추가 가능 |
| Headers 탭 | 헤더 추가/수정, API별 필수 헤더 자동 노출 |
| Body 탭 | JSON 에디터, 높이 드래그 조절로 자동 확장 — DELETE 메서드도 Body 포함하여 전송 (OPA2_009, OPA2_020 등) |
| Response 뷰어 | 상태 코드 배지, JSON 문법 강조, 엔드포인트별 결과 캐싱 |
| 예시 응답 | 성공/실패/조회결과없음 응답 구조 미리보기 (타입 표현) |
| Send and Download | 응답을 파일로 강제 저장 (Content-Type 기반 확장자 자동 결정) |
| Code Snippet | cURL / JS(fetch) / JS(jQuery) / Python / Java 코드 자동 생성 |
| **API 명세** | 각 API의 Request/Response 필드 명세 조회 모달 — 헤더·Path/Query 파라미터·Body·응답 필드·에러 코드, **비고 컬럼** 지원 (`note` 필드가 있는 경우 자동 표시) |
| 사용 가이드 | 5단계 스텝 카드 형식 사용법 안내 모달 |

### 등록된 API (OPA2_XXX) 및 예시 응답 현황

| 그룹 | API 목록 | 예시 응답 |
|------|---------|----------|
| 인증 | OPA2_001 Access Token 발급, OPA2_002 Access Token 갱신 | 성공+실패 완비 |
| 문서 | OPA2_003~009, 014, 016, 021, 031, 037, 040, 042~045, 047, 048 | 전체 성공+실패 완비 |
| 템플릿 | OPA2_015, 024, 041 | 전체 성공+실패 완비 |
| 멤버 | OPA2_010~013, 030 | 전체 성공+실패 완비 |
| 그룹 | OPA2_017~020 | 전체 성공+실패 완비 |
| 회사 도장 | OPA2_025~029 | 전체 성공+실패 완비 |
| 회사 | OPA2_046 이용현황 조회, OPA2_049 문서 관리 조건 목록 조회 | 성공+실패 완비 |

> **명세 정합성**: API 명세(`api-specs.js`)는 2026-03-25 기준 OPA2_001~031 + OPA2_037, OPA2_040~OPA2_049 전수 검토 및 정정 완료
> (eformsign Open API 가이드 v1.9 + 별도 PDF 스펙 + `api-list.js` 실제 데이터 기준 교차 검증)

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
