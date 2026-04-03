## OpenAPITester

Postman 스타일 eformsign Open API 테스터. **상태:** Beta

**파일:**
- `API(JS,HTML)/OpenAPITester.html` — HTML/CSS (UI 구조)
- `assets/js/openapi/api-list.js` — API_LIST 데이터
- `assets/js/openapi/api-specs.js` — API_SPECS 데이터
- `assets/js/openapi/state.js` — 상태·상수·헬퍼
- `assets/js/openapi/ui.js` — UI 로직 전반
- `assets/js/openapi/init.js` — 초기화·명세 모달

> **로드 순서**: `api-list.js` → `api-specs.js` → `state.js` → `ui.js` → `init.js`
> 전역 변수로 공유되므로 `<script>` 태그 순서를 변경하면 안 됨.

### 파일 역할 및 편집 가이드

| 파일 | 편집 빈도 | 편집 목적 |
|------|-----------|-----------|
| `api-list.js` | 높음 | API 추가/수정/삭제 |
| `api-specs.js` | 높음 | API 명세 추가/수정 |
| `ui.js` | 중간 | UI 동작·요청·응답 로직 변경 |
| `init.js` | 낮음 | 초기화·모달·리사이즈 변경 |
| `state.js` | 낮음 | 상수·헬퍼 함수 변경 |

### API 데이터 구조 (`API_LIST`)

```javascript
{
    id: 'unique_id',
    group: '그룹명',
    groupIcon: 'fa-아이콘명',
    opaCode: 'OPA2_XXX',        // null이면 배지 없음
    name: 'API 이름',
    method: 'GET|POST|PUT|PATCH|DELETE',
    saasBaseUrl: 'https://...',  // 선택적. op_saas 환경에서만 이 도메인 사용
    path: '/v2.0/api/path/{path_param}',
    description: '설명',
    requiresAuth: true,          // false → Authorization 헤더 자동 삽입 안 함 (외부자용 API)
    pathParams:  [{ key, description, required, default }],
    queryParams: [{ key, description, required, default }],
    defaultHeaders: [{ key, value, description }],  // 선택적, API별 고정 헤더
    defaultBody: { ... } | null,
    exampleResponse: {
        success: { ... },        // 값 대신 "string"/"number"/"boolean" 타입 표현
        successEmpty: { ... },   // 선택적 — 조회 결과 없는 성공 응답
        errors: [
            { title: '한글 설명 (코드)', body: { code, ErrorMessage } }
            // title 형식: '유효하지 않은 서명 (4030004)' — 항상 한글로 작성
            // 소스 기준: utils/error-codes.html (43개 엔드포인트 전체 에러 코드 레퍼런스)
        ]
    }
}
```

**API_LIST 배치 규칙**: 신규 API는 OPA2 번호 오름차순 위치에 삽입. 편집 파일: `assets/js/openapi/api-list.js`

### API 명세 데이터 구조 (`API_SPECS`)

`assets/js/openapi/api-specs.js`에 위치. opaCode를 키로 하는 객체.

```javascript
const API_SPECS = {
    'OPA2_XXX': {
        requestHeaders: [
            { key, required, description, example, note }  // note는 선택
        ],
        queryParams: [
            { key, type, required, description, note }
        ],
        requestBody: [
            { key, type, required, description, note }
            // 중첩 필드: 점 표기법 'document.recipients[].auth.password'
            // 배열 직접 전송: '[].필드명' (OPA2_030 참고)
        ],
        responseFields: [
            { key, type, description, note }
        ],
        errorCodes: [
            { code, message, description }
        ],
    },
};
```

- **정합성 원칙**: `API_SPECS`의 queryParams/requestBody/responseFields는 `API_LIST`의 실제 데이터와 일치해야 함. 신규 명세 추가 시 반드시 `api-list.js` 실제 구조를 기준으로 작성
- **errorCodes 정합성**: `API_SPECS`의 `errorCodes`는 `API_LIST`의 `exampleResponse.errors`와 동기화 상태여야 함. 에러 추가/수정 시 두 파일 모두 수정할 것 (소스 레퍼런스: `utils/error-codes.html`)
- `note` 필드가 하나라도 있으면 해당 테이블에 비고 컬럼 자동 표시

### 특수 인증 처리 API

**OPA2_007 새 문서 작성 (외부)** / **OPA2_048 외부자 반려**: `requiresAuth: false`
- Access Token 대신 Company API Key를 Base64 인코딩하여 Bearer 토큰으로 사용
- `defaultHeaders`에 `Authorization: Bearer {base64_encoded_api_key}` 플레이스홀더 제공

### 비(非)자명한 동작 — 수정 시 주의

- **사이드바 정렬 모드**: `ui.js`의 `currentViewMode` 변수로 관리 (`'group'` | `'code'` | `'method'`)
- **API 선택 시 자동 탭 전환**: Path 파라미터 있음 → Path 탭 / Body 있음 → Body 탭 / 그 외 → Query 탭
- **DELETE with Body**: `sendRequest`에서 DELETE도 body 포함 메서드로 처리 — Body가 있는 DELETE API(OPA2_009, OPA2_020, OPA2_051 등) 정상 전송
- **가이드 문서 Authorization 오기재**: OPA2_050~052처럼 가이드에 `api_key base64 인코딩`으로 잘못 기재된 경우가 있음 — 실제로는 Bearer Access Token을 사용하므로 `requiresAuth: true`로 설정할 것
- **URL 표시 인코딩**: `,` `@` `:` `/`는 인코딩하지 않고 그대로 표시 (`encodeForDisplay` 함수, `ui.js` `updateUrlPreview`)
- **OPA2_001 SaaS 전용 URL**: `saasBaseUrl` 필드로 op_saas 환경에서만 `https://api.eformsign.com` 사용
- **모바일 사이드바 드로어**: `@media (max-width: 640px)`에서 사이드바가 고정 위치 슬라이드 드로어로 전환
  - `#btnMenu` 햄버거 버튼으로 열기/닫기, `#sidebarBackdrop` 클릭 시 닫힘
  - `init.js`의 `toggleMobileSidebar()` / `closeMobileSidebar()` 함수로 제어
  - `selectEndpoint` 호출 시 모바일 폭(`window.innerWidth <= 768`)이면 사이드바 자동으로 닫힘
