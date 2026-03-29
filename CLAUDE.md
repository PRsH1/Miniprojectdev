# ProjectImprove — CLAUDE.md

eformsign API 연동 도구 허브 프로젝트입니다.
Vercel 서버리스 환경에서 동작하며, 브라우저 기반 HTML 도구 + Node.js API 서버 구조로 구성되어 있습니다.

---

## 프로젝트 구조

```
ProjectImprove/
├── index.html                  # 메인 허브 페이지 (모든 도구 링크 모음)
├── favicon.svg                 # 전체 페이지 공통 파비콘 (플러그 아이콘, 프로젝트 블루 #1a73e8)
├── vercel.json                 # Vercel 배포 라우팅 설정
├── package.json
│
├── api/
│   └── index.js                # 메인 API 라우터 (lazy-loading 패턴)
│
├── controllers/                # 각 엔드포인트 비즈니스 로직
│   ├── _shared/
│   │   ├── protected-pages-config.js  # 보호 페이지 설정 공통화
│   │   └── protectedPage.js           # 보호 페이지 공통 핸들러
│   ├── getToken.js             # ECDSA 서명으로 Access Token 발급
│   ├── downloadDocument.js     # 문서 파일 프록시 다운로드
│   ├── getDocumentInfo.js      # 문서 메타데이터 조회
│   ├── webhook-receiver.js     # Webhook 수신 → Pusher 브로드캐스트
│   ├── memberPage.js           # 멤버 관리 페이지 (인증 보호)
│   ├── ApiAutoTest.js          # (deprecated) 구 API 자동화 테스트 페이지
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
│       # ApiAutoTest.html은 deprecated — index.html 카드에서 제거됨
│
├── API(JS,HTML)/               # eformsign Open API 연동 도구 (브라우저 전용)
│   └── OpenAPITester.html      # ★ Postman 스타일 API 테스터 (Beta) — HTML/CSS만 포함
│
├── Embedding/                  # 문서/템플릿 임베딩 도구 (HTML 파일 모음)
├── utils/                      # 공개 유틸리티 도구 (webhook, smtp, CORS, base64 등)
│
├── assets/js/
│   ├── OpenAPIAutoTest.js      # ★ OPA 자동 테스트 전체 로직 (단일 파일)
│   ├── ApiAutoTestStart.js     # (deprecated) 구 자동화 테스트 로직
│   ├── OpenAPITester.js        # ★ 원본 보존용 (롤백 시 참고) — 직접 편집 금지
│   └── openapi/                # ★ OpenAPITester 분할 모듈 (로드 순서 중요)
│       ├── api-list.js         #   API_LIST 데이터 — 신규 API 추가/수정 시 편집
│       ├── api-specs.js        #   API_SPECS 데이터 — 명세 추가 시 편집
│       ├── state.js            #   DOMAINS, state, responseCache, 공통 헬퍼
│       ├── ui.js               #   사이드바, 요청 빌더, 인증, 전송, 응답, 코드 스니펫
│       └── init.js             #   탭 이벤트, document.ready, 리사이즈, API 명세 모달
│
└── docs/
    └── openapi-response-status.md  # 예시 응답 현황 (API별 성공/실패 등록 여부)
```

---

## 기술 스택

- **배포:** Vercel (서버리스)
- **백엔드:** Node.js (api/index.js 단일 라우터, lazy-loading)
- **프론트엔드:** 순수 HTML/CSS/JS + jQuery + jsrsasign
- **SAML:** samlify ^2.10.2
- **실시간:** Pusher ^5.2.0 (Webhook 브로드캐스트)
- **이메일:** nodemailer ^6.9.14

---

## 핵심 패턴

### 1. eformsign API 인증 (ECDSA 서명)
```javascript
// 1. 타임스탬프로 서명 생성
const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
sig.init(keyObj);
sig.updateString(execTime.toString());
const signature = sig.sign();

// 2. Access Token 요청
fetch(`${domain}/v2.0/api_auth/access_token`, {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + btoa(apiKey),
        'eformsign_signature': signature
    },
    body: JSON.stringify({ execution_time: execTime, member_id: memberId })
});
```

### 2. 환경 도메인
```javascript
const DOMAINS = {
    op_saas: 'https://kr-api.eformsign.com',
    csap:    'https://www.gov-eformsign.com/Service'
};
```

### 3. 인증 보호 페이지 패턴
- 쿠키 값으로 세션 확인 → 유효 시 `/private/` HTML 서빙
- 무효 시 `/auth/login.html?next=<page>&scope=<scope>` 리다이렉트
- 세션 유효시간: 15분
- 보호 페이지 설정은 `controllers/_shared/protected-pages-config.js`에서 일괄 관리

### 4. 새 API 엔드포인트 추가
1. `/controllers/` 에 컨트롤러 파일 생성
2. `api/index.js` 에 라우트 등록
3. `vercel.json` 에 rewrite 규칙 추가 (필요 시)

### 5. 새 공개 도구 추가
1. `/utils/` 에 HTML 파일 생성
2. `index.html` 의 해당 섹션에 링크 추가

---

## OpenAPIAutoTest (★ 현재 작업 중인 주요 파일)

OPA 번호 기준으로 eformsign Open API를 자동 검증하는 테스트 러너입니다.
각 OPA 항목은 생성 → 검증 → 정리 단계를 자동으로 묶어서 실행합니다.

**경로:**
- `private/OpenAPIAutoTest.html` — UI 구조 (모달 뼈대만 포함, 내용은 JS에서 주입)
- `assets/js/OpenAPIAutoTest.js` — 전체 로직 (시나리오 정의, step 핸들러, UI 렌더링, 가이드)

**접근 경로:** `/api/OpenAPIAutoTest` (쿠키 인증 보호)

### 시나리오 데이터 구조
```javascript
{
    code: "OPA 003",
    group: "문서",
    method: "GET",
    name: "문서 정보 조회",
    desc: "시나리오 설명",
    steps: ["listFormsForSeed", "tryCreateAuto", "docInfoBasic", ...],
    keys: ["auth.mode", "data.extTemplateId"]  // 준비 상태 체크 대상
}
```

- `keys`의 각 항목이 모두 채워져야 사이드바에 **준비됨** 배지 표시
- `"auth.mode"`는 항상 포함 — 인증 패널 입력 여부를 체크하는 트리거
- `"data.*"` 형태는 `data()` 함수의 반환값 경로를 참조

### 자동탐색 패턴 (step 조합)

| 패턴 | steps | 대상 OPA |
|---|---|---|
| 템플릿 자동탐색 | `listFormsForSeed` → `tryCreateAuto` | 003, 005, 014, 016, 021, 042 |
| 완료 문서 자동탐색 (단건) | `listCompletedDocsForDownload` → `tryDownloadDocAuto` | 004 |
| 완료 문서 자동탐색 (다건) | `listDocsBasic` → `tryXxxAuto` | 037, 040, 045 |

- `listFormsForSeed`: GET /v2.0/api/forms → 최대 3개 `form_id`를 `state.shared.candidateTemplateIds`에 저장
- `tryCreateAuto`: 후보 ID를 순차 시도, 첫 성공 → `state.shared.lastCreatedId` + `createdIdList`에 저장
- `listCompletedDocsForDownload` / `listDocsBasic`: POST /v2.0/api/list_document → `status_type === "003"` 필터 후 최대 5개를 `candidateDocIds` / `completedDocIds`에 저장
- OPA 040/037은 C(n,2) 조합을 순차 시도, 첫 성공 조합에서 PASS

### 자동 채움 값
- `companyId`: 토큰 발급 응답의 `api_key.company.company_id`에서 자동 추출 → `state.companyId`
- `companyApiKey`: 인증 패널의 API Key 입력값에서 자동 채움 (`els.authApiKey.value`)
- 두 값 모두 설정 모달에 입력 필드 없음 — 직접 입력 불필요

### 준비 상태(readiness) 시스템
- `readiness(scenario)`: `scenario.keys`를 순회하여 비어 있는 항목을 `missing` 배열로 반환
- `missing.length === 0` → 준비됨 / 하나라도 있으면 → 설정 필요
- 상세 패널 "누락된 설정" 섹션(`#missingSectionWrap`)은 누락 시에만 표시, 준비되면 숨김

### 설정 모달 입력 필드 (현재 유효한 항목만)
| 필드 ID | 매핑 | 사용 OPA |
|---|---|---|
| `formExternalTemplateId` | `data.extTemplateId` | 007 |
| `formAttachDocumentId` | `data.lookupTargets.attachDocumentId` | 006 |
| `formMemberId` | `data.memberId` | 011~013, 018~020, 030 |
| `formTargetEmail` | `data.targetEmail` | 014 |
| `formTargetPhone` | `data.targetPhone` | 014 (선택) |
| `formTargetName` | `data.targetName` | 014 (선택) |
| `formPdfRecipientEmail` | `data.pdfTargetEmail` | 037 |
| `formPdfRecipientName` | `data.pdfTargetName` | 037 (선택) |

### 사용 가이드 (`hydrateGuideContent`)
- 가이드 모달 내용은 `OpenAPIAutoTest.js` 하단의 `hydrateGuideContent()` 함수에서 주입
- `private/OpenAPIAutoTest.html`의 가이드 모달은 뼈대(`.guide-header-text`, `.guide-steps`, `.guide-tip p`)만 존재하며 내용은 비어 있음
- **가이드 수정 시 JS 파일만 편집할 것** — HTML을 편집해도 런타임에 덮어써짐

### 비(非)자명한 동작 — 수정 시 주의
- **완료 문서 판별 기준**: `doc.current_status.status_type === "003"` — `"doc_complete"` 등 문자열이 아닌 숫자 코드
- **OPA 037 pdfTargetPhone은 선택**: email 또는 phone 중 하나만 있으면 실행 가능. `keys`에는 `data.pdfTargetEmail`만 포함
- **`freshShared()`**: 실행 시마다 초기화되는 step 간 공유 상태. 새 공유 변수 추가 시 이 함수에도 추가할 것
- **`globalChecks()`의 "주 템플릿" 항목 없음**: 모든 문서 생성 OPA가 자동탐색으로 전환되어 제거됨
- **상세 패널 제목**: `renderDetail()`에서 `activeScenarioTitle` 요소에 `"OPA XXX — API 이름"` 형식으로 동적 설정

---

## OpenAPITester (★ 현재 작업 중인 주요 파일)

**경로:**
- `API(JS,HTML)/OpenAPITester.html` — HTML/CSS (UI 구조)
- `assets/js/openapi/api-list.js` — API_LIST 데이터
- `assets/js/openapi/api-specs.js` — API_SPECS 데이터
- `assets/js/openapi/state.js` — 상태·상수·헬퍼
- `assets/js/openapi/ui.js` — UI 로직 전반
- `assets/js/openapi/init.js` — 초기화·명세 모달

**상태:** Beta (index.html에 Beta 배지로 표시)

### 파일 역할 및 편집 가이드
| 파일 | 편집 빈도 | 편집 목적 |
|------|-----------|-----------|
| `api-list.js` | 높음 | API 추가/수정/삭제 |
| `api-specs.js` | 높음 | API 명세 추가/수정 |
| `ui.js` | 중간 | UI 동작·요청·응답 로직 변경 |
| `init.js` | 낮음 | 초기화·모달·리사이즈 변경 |
| `state.js` | 낮음 | 상수·헬퍼 함수 변경 |

> **로드 순서**: `api-list.js` → `api-specs.js` → `state.js` → `ui.js` → `init.js`
> 전역 변수로 공유되므로 `<script>` 태그 순서를 변경하면 안 됨.

### 비(非)자명한 동작 — 수정 시 주의
- **사이드바 정렬 모드**: `ui.js`의 `currentViewMode` 변수로 관리 (`'group'` | `'code'` | `'method'`)
- **API 선택 시 자동 탭 전환**: Path 파라미터 있음 → Path 탭 / Body 있음 → Body 탭 / 그 외 → Query 탭
- **DELETE with Body**: `sendRequest`에서 DELETE도 body 포함 메서드로 처리 — Body가 있는 DELETE API(OPA2_009, OPA2_020 등) 정상 전송
- **URL 표시 인코딩**: `,` `@` `:` `/` 는 인코딩하지 않고 그대로 표시 (`encodeForDisplay` 함수, `ui.js` `updateUrlPreview`)
- **OPA2_001 SaaS 전용 URL**: `saasBaseUrl` 필드로 op_saas 환경에서만 `https://api.eformsign.com` 사용
- **모바일 사이드바 드로어**: `@media (max-width: 640px)`에서 사이드바가 고정 위치 슬라이드 드로어로 전환됨
  - `#btnMenu` 햄버거 버튼(헤더 좌측)으로 열기/닫기
  - `#sidebarBackdrop` 반투명 오버레이 클릭 시 닫힘
  - `init.js`의 `toggleMobileSidebar()` / `closeMobileSidebar()` 함수로 제어
  - API 항목 선택(`selectEndpoint`) 시 `ui.js`에서 모바일 폭(`window.innerWidth <= 768`)이면 자동으로 사이드바 닫힘
  - 640px 초과(태블릿·PC)에서는 기존 상시 표시 사이드바 유지

### API 데이터 구조 (`API_LIST`)
```javascript
{
    id: 'unique_id',
    group: '그룹명',
    groupIcon: 'fa-아이콘명',
    opaCode: 'OPA2_XXX',       // null이면 배지 없음
    name: 'API 이름',
    method: 'GET|POST|PUT|PATCH|DELETE',
    saasBaseUrl: 'https://...',  // 선택적. op_saas 환경에서만 이 도메인 사용
    path: '/v2.0/api/path/{path_param}',
    description: '설명',
    requiresAuth: true,         // true → Authorization 헤더에 Access Token 자동 삽입
                                // false → Authorization 헤더 자동 삽입 안 함 (외부자용 API)
    pathParams:  [{ key, description, required, default }],
    queryParams: [{ key, description, required, default }],
    defaultHeaders: [           // 선택적, API별 고정 헤더
        { key, value, description }
    ],
    defaultBody: { ... } | null,
    exampleResponse: {
        success: { ... },       // 값 대신 "string"/"number"/"boolean" 타입 표현
        successEmpty: { ... },  // 선택적 — 조회 결과 없는 성공 응답 (OPA2_008 등)
        errors: [
            { title: '에러명 (코드)', body: { code, ErrorMessage } }
        ]
    }
}
```

### API 명세 데이터 구조 (`API_SPECS`)
`API_LIST`와 별도로 `assets/js/openapi/api-specs.js`에 위치. opaCode를 키로 하는 객체.
```javascript
const API_SPECS = {
    'OPA2_XXX': {
        requestHeaders: [
            { key: '헤더명', required: true|false, description: '설명', example: '예시값', note: '비고 (선택)' }
        ],
        queryParams: [
            { key: '파라미터명', type: 'string|number|boolean', required: true|false, description: '설명', note: '비고 (선택)' }
        ],
        requestBody: [
            { key: '필드명', type: 'string|number|boolean|array|object', required: true|false, description: '설명', note: '비고 (선택)' }
            // 중첩 필드는 점 표기법: 'document.recipients[].auth.password'
            // 배열 직접 전송 시 최상위 키를 '[].필드명' 형태로 표기 (OPA2_030 참고)
        ],
        responseFields: [
            { key: '필드명', type: '...', description: '설명', note: '비고 (선택)' }
        ],
        errorCodes: [
            { code: '에러코드', message: '에러 메시지', description: '설명' }
        ],
    },
};
```
- **정합성 원칙**: `API_SPECS`의 queryParams/requestBody/responseFields는 `API_LIST`의 실제 데이터와 일치해야 함. 신규 명세 추가 시 반드시 `api-list.js` 실제 구조를 기준으로 작성.
- `note` 필드가 하나라도 있으면 해당 테이블에 비고 컬럼 자동 표시
- `API_LIST`에 없는 opaCode는 명세 버튼 클릭 시 빈 화면 표시

### 특수 인증 처리 API
- **OPA2_007 새 문서 작성 (외부)** / **OPA2_048 외부자 반려**: `requiresAuth: false`
  - Access Token 대신 Company API Key를 Base64 인코딩하여 Bearer 토큰으로 사용
  - `defaultHeaders`에 `Authorization: Bearer {base64_encoded_api_key}` 플레이스홀더 제공
  - 사용자가 직접 Company API Key를 입력해야 함

### API_LIST 배치 규칙
- 신규 API는 **OPA2 번호 순서**에 맞는 위치에 삽입 (사이드바 표시 순서와 직결)
- 같은 그룹 내에서 번호가 오름차순이 되도록 유지
- 편집 파일: `assets/js/openapi/api-list.js`

---

## 환경변수 (Vercel 대시보드에서 관리)

```env
SAML_PRIVATE_KEY=           # Base64 인코딩된 EC 개인키
SAML_PUBLIC_CERT=           # Base64 인코딩된 공개 인증서
AUTH_COOKIE_VALUE=          # 세션 토큰 값
MEMBER_PAGE_PASSWORD=       # 멤버 페이지 접근 비밀번호
APIAUTOTEST_PAGE_PASSWORD=  # API 자동화 테스트 페이지 비밀번호
TEMPLATECOPY_PAGE_PASSWORD= # 템플릿 복제 페이지 비밀번호
IDP_TEST_PAGE_PASSWORD=     # IdP 테스트 페이지 비밀번호
PUSHER_APP_ID=
PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=
```

---

## 코딩 컨벤션

- HTML 파일은 자체 완결형 (CSS/JS 인라인, 외부 의존성은 CDN)
- jQuery + vanilla JS 혼용
- 한국어 UI, 한국어 주석
- Body 기본값: 구조만 표현하고 실제 값을 박지 않음
  - 문자열 → `''` / boolean → `null` / number → `null`
  - 배열 내 객체는 빈 요소 1개로 구조 표현 (예: `[{ key: '', value: null }]`)
  - `'04'`, `'+82'`, `true` 같은 고정 예시값 사용 금지 — 사용자가 직접 입력해야 하는 값
- 예시 응답: 실제 값 대신 타입명 (`"string"`, `"number"`, `"boolean"`) 사용

---

## 로컬 개발

`vercel dev`는 Vercel `Development` 환경 변수를 사용한다. 보호 페이지 테스트 시 아래 변수가 Development 대상에 등록되어 있어야 한다: `AUTH_COOKIE_VALUE`, `MEMBER_PAGE_PASSWORD`, `APIAUTOTEST_PAGE_PASSWORD`, `TEMPLATECOPY_PAGE_PASSWORD`, `IDP_TEST_PAGE_PASSWORD`

환경 변수 변경 후 로컬 반영 순서:
1. `vercel env pull .env.local`
2. `vercel dev` 재시작

---

## gstack

웹 브라우징이 필요할 때는 gstack의 `/browse`를 사용한다. `mcp__claude-in-chrome__*` 도구는 사용하지 않는다.

사용 가능한 스킬: `/office-hours`, `/plan-ceo-review`, `/plan-eng-review`, `/plan-design-review`, `/design-consultation`, `/review`, `/ship`, `/land-and-deploy`, `/canary`, `/benchmark`, `/browse`, `/qa`, `/qa-only`, `/design-review`, `/setup-browser-cookies`, `/setup-deploy`, `/retro`, `/investigate`, `/document-release`, `/codex`, `/cso`, `/autoplan`, `/careful`, `/freeze`, `/guard`, `/unfreeze`, `/gstack-upgrade`

gstack 스킬이 동작하지 않을 경우: `cd ~/.claude/skills/gstack && ./setup`
