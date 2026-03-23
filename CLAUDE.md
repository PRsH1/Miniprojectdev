# ProjectImprove — CLAUDE.md

eformsign API 연동 도구 허브 프로젝트입니다.
Vercel 서버리스 환경에서 동작하며, 브라우저 기반 HTML 도구 + Node.js API 서버 구조로 구성되어 있습니다.

---

## 프로젝트 구조

```
ProjectImprove/
├── index.html                  # 메인 허브 페이지 (모든 도구 링크 모음)
├── vercel.json                 # Vercel 배포 라우팅 설정
├── package.json
│
├── api/
│   └── index.js                # 메인 API 라우터 (lazy-loading 패턴)
│
├── controllers/                # 각 엔드포인트 비즈니스 로직
│   ├── getToken.js             # ECDSA 서명으로 Access Token 발급
│   ├── downloadDocument.js     # 문서 파일 프록시 다운로드
│   ├── getDocumentInfo.js      # 문서 메타데이터 조회
│   ├── webhook-receiver.js     # Webhook 수신 → Pusher 브로드캐스트
│   ├── memberPage.js           # 멤버 관리 페이지 (인증 보호)
│   ├── ApiAutoTest.js          # API 자동화 테스트 페이지 (인증 보호)
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
│   ├── ApiAutoTest.html        # API 자동화 테스트 UI
│   ├── Member.html             # 멤버 관리 UI
│   ├── templatecopy.html       # 템플릿 복제 UI
│   └── idp-test.html           # IdP 테스트 UI
│
├── API(JS,HTML)/               # eformsign Open API 연동 도구 (브라우저 전용)
│   ├── OpenAPITester.html      # ★ Postman 스타일 API 테스터 (Beta) — HTML/CSS만 포함
│   ├── DocumentDownload.html   # 문서 다운로드
│   ├── DocumentInfo.html       # 문서 정보 조회
│   ├── DocumentSendImprove.html# 새 문서 작성
│   ├── KogasDocumentSend.html  # KOGAS 전용 문서 작성
│   ├── listdocuments.html      # 문서 목록 조회
│   ├── css/
│   │   └── MemberStyle.css     # 멤버 관련 스타일
│   └── js/
│       ├── MemberMain.js       # 멤버 관련 메인 로직
│       └── api/                # API 모듈 (Member.js, auth.js, group.js, nav.js, toggle.js)
│
├── Embedding/                  # 문서/템플릿 임베딩 도구
│   ├── embedding_doc_Integration.html      # 문서 임베딩 (환경 통합)
│   ├── embedding_doc_update.html           # 문서 임베딩 (업데이트)
│   ├── embedding_doc_update_CSAP.html      # 문서 임베딩 (CSAP 업데이트)
│   ├── embedding_template_intergration.html# 템플릿 임베딩 (환경 통합)
│   ├── template_create_update.html         # 템플릿 생성/업데이트
│   ├── template_create_update_CSAP.html    # 템플릿 생성/업데이트 (CSAP)
│   └── MultiFileViewer.html                # 멀티 파일 뷰어
│
├── utils/                      # 공개 유틸리티 도구
│   ├── webhook.html            # Webhook 수신 모니터링
│   ├── smtp.html               # SMTP 발송 테스트
│   ├── CorsTest.html           # CORS 차단 테스트
│   ├── RsaTestSample.html      # RSA/ECDSA 서명 테스트
│   ├── base64.html             # Base64 인코딩/디코딩
│   ├── timestamp.html          # Unix 타임스탬프 변환
│   ├── JsonToPretty.html       # JSON/XML 포맷 정리
│   ├── DocumentDelete.html     # 문서 일괄 삭제
│   ├── MassDocumentDowmload.html # 문서 일괄 다운로드
│   ├── templateDeletetool.html # 템플릿 삭제 도구
│   └── saml-guide.html         # SAML 연동 가이드
│
├── Webhook/                    # Webhook 관련 리소스
│   └── webhook/demo/           # Webhook 데모 (Gradle 프로젝트)
│
├── file/
│   └── eformsign SSO 연동 가이드 (SAML 2.0)_v1.0.pdf  # SSO 연동 가이드 문서
│
├── img/
│   └── sso_flow.png            # SSO 플로우 다이어그램
│
└── assets/js/
    ├── ApiAutoTestStart.js     # API 자동화 테스트 로직 (OPA2_XXX 목록 포함)
    └── OpenAPITester.js        # ★ OpenAPITester 전용 JS (API_LIST 데이터 + 앱 로직)
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

### 4. 새 API 엔드포인트 추가
1. `/controllers/` 에 컨트롤러 파일 생성
2. `api/index.js` 에 라우트 등록
3. `vercel.json` 에 rewrite 규칙 추가 (필요 시)

### 5. 새 공개 도구 추가
1. `/utils/` 에 HTML 파일 생성
2. `index.html` 의 해당 섹션에 링크 추가

---

## OpenAPITester (★ 현재 작업 중인 주요 파일)

**경로:** `API(JS,HTML)/OpenAPITester.html` (HTML/CSS) + `assets/js/OpenAPITester.js` (JS 로직)
**상태:** Beta (index.html에 Beta 배지로 표시)

### 구현된 기능
- 좌측 사이드바: API 그룹별 목록, OPA2_XXX 번호 배지, 검색, 너비 드래그 조절
- 상단 인증 패널: Signature/Bearer 방식 선택, Access Token 발급
- Request Builder: **Path / Query / Headers / Body** 4개 탭, 높이 드래그 조절
  - **Path 탭**: URL 경로 파라미터 입력 (키 readonly, 배지 = 파라미터 존재 개수)
  - **Query 탭**: Query String 입력, 체크박스로 활성화, 행 추가 가능
  - API 선택 시 자동 탭 전환: Path 파라미터 있음 → Path / Body 있음 → Body / 그 외 → Query
- Response 뷰어: 상태 코드 배지, JSON 문법 강조, 복사 버튼, 엔드포인트별 결과 캐싱
- 예시 응답 버튼: 성공/실패 구조 표시 (실제 값 대신 타입 표현)
  - `success`: 일반 성공 응답
  - `successEmpty`: 조회 결과 없음 성공 응답 (OPA2_008 등)
- **Send and Download**: 응답을 파일로 강제 다운로드 (PDF/ZIP/JSON 등 Content-Type 기반 확장자 결정)
  - PDF/ZIP 응답은 Send 버튼으로도 자동 다운로드
  - 파일명: `Content-Disposition` 헤더 → `document_id` path param → `download.*` 순으로 결정
- **Code Snippet 모달**: 현재 Request 설정(URL/Method/Headers/Body) 기반 코드 자동 생성
  - 지원 언어: cURL / JavaScript (fetch) / JavaScript (jQuery) / Python / Java (HttpClient)
- **사용 가이드 모달**: 헤더 우측 "사용 가이드" 버튼 → 5단계 스텝 카드 형식 안내
  - DELETE 메서드도 defaultBody가 있으면 Body 탭 자동 표시
- **DELETE with Body**: `sendRequest`에서 body 포함 메서드에 `DELETE` 포함 — Body가 있는 DELETE API(OPA2_009, OPA2_020 등)에서 payload가 정상 전송됨

### API 데이터 구조 (`API_LIST`)
```javascript
{
    id: 'unique_id',
    group: '그룹명',
    groupIcon: 'fa-아이콘명',
    opaCode: 'OPA2_XXX',       // null이면 배지 없음
    name: 'API 이름',
    method: 'GET|POST|PUT|PATCH|DELETE',
    path: '/v2.0/api/path/{path_param}',
    description: '설명',
    requiresAuth: true,         // true → Authorization 헤더에 Access Token 자동 삽입
                                // false → Authorization 헤더 자동 삽입 안 함 (OPA2_007 등 외부자용 API)
    pathParams:  [{ key, description, required, default }],
    queryParams: [{ key, description, required, default }],
    defaultHeaders: [           // 선택적, API별 고정 헤더 (requiresAuth: false인 경우 Authorization 직접 지정)
        { key, value, description }
    ],
    defaultBody: { ... } | null,
    exampleResponse: {          // 전체 API에 추가됨
        success: { ... },       // 값 대신 "string"/"number"/"boolean" 타입 표현
        successEmpty: { ... },  // 선택적 — 조회 결과 없는 성공 응답 (OPA2_008 등)
        errors: [
            { title: '에러명 (코드)', body: { code, ErrorMessage } }
        ]
    }
}
```

### 특수 인증 처리 API
- **OPA2_007 새 문서 작성 (외부)**: `requiresAuth: false`
  - Access Token 대신 Company API Key를 Base64 인코딩하여 Bearer 토큰으로 사용
  - `defaultHeaders`에 `Authorization: Bearer {base64_encoded_api_key}` 플레이스홀더 제공
  - 사용자가 직접 Company API Key를 입력해야 함

### 예시 응답 현황 (전체 API)
공통 실패 응답 (OPA2_001, OPA2_007 제외한 전체 API에 포함):
- `4010001` 유효하지 않거나 만료된 토큰
- `4010006` Refresh Token 만료

| API | 성공 | 실패 |
|-----|------|------|
| OPA2_001 Access Token 발급 | ✅ | ✅ 3건 |
| OPA2_002 Access Token 갱신 | ✅ | ✅ 5건 |
| OPA2_003 문서 정보 조회 | ✅ | ✅ 5건 |
| OPA2_004 문서 파일 다운로드 | — | ✅ 4건 |
| OPA2_005 새 문서 작성 (내부) | ✅ | ✅ 6건 |
| OPA2_006 문서 첨부 파일 다운로드 | — | ✅ 5건 |
| OPA2_007 새 문서 작성 (외부) | ✅ | ✅ 5건 |
| OPA2_008 문서 목록 조회 | ✅ + 결과없음 | ✅ 3건 |
| OPA2_009 문서 삭제 | ✅ | ✅ 5건 |
| OPA2_010 멤버 목록 조회 | ✅ | ✅ 2건 |
| OPA2_011 멤버 추가 | ✅ | ✅ 4건 |
| OPA2_012 멤버 수정 | ✅ | ✅ 2건 |
| OPA2_013 멤버 삭제 | ✅ | ✅ 3건 |
| OPA2_014 수신자 문서 재요청 | ✅ | ✅ 4건 |
| OPA2_015 작성 가능한 템플릿 목록 조회 | ✅ | ✅ 2건 |
| OPA2_016 문서 일괄 작성 | ✅ | ✅ 4건 |
| OPA2_017 그룹 목록 조회 | ✅ | ✅ 2건 |
| OPA2_018 그룹 추가 | ✅ | ✅ 2건 |
| OPA2_019 그룹 수정 | ✅ | ✅ 3건 |
| OPA2_020 그룹 삭제 | ✅ | ✅ 4건 |
| OPA2_021~OPA2_037 (나머지 전체) | — | ✅ 2건 (공통) |

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
  - 문자열 → `''`
  - boolean → `null`
  - number → `null`
  - 배열 내 객체는 빈 요소 1개로 구조 표현 (예: `[{ key: '', value: null }]`)
  - `'04'`, `'05'`, `'+82'`, `true` 같은 고정 예시값 사용 금지 — 사용자가 직접 입력해야 하는 값임
- 예시 응답: 실제 값 대신 타입명 (`"string"`, `"number"`, `"boolean"`) 사용
