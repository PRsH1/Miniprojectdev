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
| `ui.js` | 중간 | UI 동작·요청·응답·Save/History 로직 변경 |
| `init.js` | 낮음 | 초기화·모달·리사이즈·사이드바 탭 이벤트 변경 |
| `state.js` | 낮음 | 상수·헬퍼 함수·히스토리 함수 변경 (localStorage / DB 분기 포함) |

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

### 요청 저장 및 히스토리 (Save & History)

**저장소 분기:**

| 사용자 상태 | 저장소 | 비고 |
|---|---|---|
| 비로그인 | `localStorage` 키 `openapi_tester_history` | 기존 동작 유지 |
| 로그인 | DB `api_request_history` 테이블 | 크로스 디바이스·세션 복원 가능 |

- 최대 100건 (초과 시 오래된 항목 자동 제거 — 비로그인은 프론트, 로그인은 서버에서 처리)
- 기존 localStorage 항목은 로그인 시 마이그레이션하지 않음 — 로그인하면 DB 전용, localStorage는 비로그인 전용
- DB 저장 실패 시 localStorage 백업 없음 — 토스트 표시 후 중단

**메모리 캐시 패턴 (`historyCache`):**
- `let historyCache = null` — `null`이면 비로그인(localStorage 사용), 배열이면 로그인(캐시 사용)
- `initHistory()`: 페이지 로드 시(`refreshAuthUser()` 완료 후) `GET /api/request-history`로 DB fetch → `historyCache` 세팅
- `historyLoad()`: `historyCache !== null`이면 캐시 반환, 아니면 localStorage 파싱 — **동기 함수 유지**
- 저장/삭제/초기화 시 DB API 호출 + `historyCache` 즉시 동기화 → `historyLoad()` 반환값 일관성 보장

**두 파일 공유:**
- `OpenAPITesterProd.html`과 `OpenAPITesterFull.html`이 동일한 JS 모듈 파일을 사용하므로 로그인 사용자는 DB에서, 비로그인은 localStorage에서 동일하게 히스토리를 공유함

**사이드바 구조:**
- `sidebar-tabs`: API 탭 / 저장됨 탭 전환 (`init.js` 내 `.sidebar-tab` 클릭 핸들러)
- `#sidebarApiPanel`: 기존 API 목록 + 정렬 토글을 감싸는 래퍼
- `#sidebarHistoryPanel`: flat 히스토리 목록 (저장됨 탭에서 표시)

**인라인 저장 항목 (API 탭):**
- `_makeEndpointWrap(ep)`: API 항목을 `.endpoint-wrap`으로 감싸고, 저장 항목이 있으면 `.endpoint-saves` 하위 영역 추가
- `.saves-toggle` 버튼: 카운트 배지 + chevron. 클릭 시 `slideToggle(150)` 애니메이션
- `expandedSaveEndpoints` Set: 펼침 상태를 기억 — `buildSidebar()` 재호출 후에도 `.toggle(isExpanded)`로 즉시 복원. 페이지 새로고침 시 초기화됨 (의도된 동작)

**주요 함수 (state.js):**

| 함수 | async | 역할 |
|---|---|---|
| `initHistory()` | async | 로그인 시 DB fetch → `historyCache` 세팅. 비로그인 시 no-op |
| `historyLoad()` | 동기 | 캐시 또는 localStorage에서 배열 반환 |
| `historySave(entries)` | 동기 | localStorage에만 저장 (비로그인 전용) |
| `historyCaptureAndSave(name)` | **async** | 현재 요청 캡처 후 로그인=DB POST+캐시 / 비로그인=localStorage |
| `historyDelete(id)` | **async** | 로그인=DB DELETE+캐시 / 비로그인=localStorage |
| `historyClear()` | **async** | 로그인=DB 전체삭제+캐시 초기화 / 비로그인=localStorage 제거 |
| `historyByEndpoint(endpointId)` | 동기 | `historyLoad()` 결과에서 필터링 |

**주요 함수 (ui.js) — async 주의:**

| 함수 | 역할 |
|---|---|
| `openSaveModal()` / `closeSaveModal()` | Save 모달 열기/닫기 |
| `confirmSave()` | **async** — 저장 실행 → 실패 시 모달 유지 → 해당 엔드포인트 자동 펼침 → `buildSidebar()` 재호출 |
| `buildHistoryPanel()` | 저장됨 탭 flat 목록 렌더링 |
| `loadHistoryEntry(entry)` | 저장 항목 불러오기: `selectEndpoint()` → 50ms 후 파라미터/Body/Authorization 복원 |
| `historyClearConfirm()` | **async** — 전체 삭제 확인 → `expandedSaveEndpoints.clear()` → 재빌드 |

**`state.currentHistoryId`:** 현재 불러온 히스토리 항목 ID. `loadHistoryEntry()` 시 설정, `selectEndpoint()` 직접 클릭 시 `null` 초기화.

**DB API 엔드포인트 (`/api/request-history`):**

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/request-history` | 내 히스토리 목록 (최신순 100건) |
| POST | `/api/request-history` | 항목 저장 (100건 초과 시 서버에서 오래된 것 자동 삭제) |
| DELETE | `/api/request-history/:id` | 단건 삭제 |
| DELETE | `/api/request-history` | 전체 삭제 |

---

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
- **히스토리 삭제 후 사이드바 갱신**: `buildHistoryPanel()` 호출만으로는 API 탭의 인라인 배지가 갱신되지 않음. 히스토리 항목 삭제 시 반드시 `buildSidebar($('#sidebarSearch').val())`도 함께 호출할 것
- **전체 삭제 시 펼침 상태 초기화**: `historyClearConfirm()`에서 `expandedSaveEndpoints.clear()` → `buildSidebar()` 순서를 유지해야 토글 버튼이 완전히 사라짐
- **`saves-toggle` 클릭 시 `e.stopPropagation()` 필수**: `.endpoint-item` 클릭(→ `selectEndpoint`) 이벤트와 독립되어야 하므로 반드시 전파 차단
- **`historyCache` 초기화 타이밍**: `initHistory()`는 `refreshAuthUser()` 완료 후 호출되어야 `state.authUser` 체크가 정확함. `init.js`의 `document.ready`에서 `refreshAuthUser().then(() => initHistory()).then(() => buildSidebar())` 체인 순서를 반드시 유지할 것
- **`historyCaptureAndSave()` 반환값**: 저장 성공 시 `entry` 객체 반환, 실패 시 `null` 반환. `confirmSave()`에서 `null` 확인 후 모달을 유지(닫지 않음)해야 사용자가 재시도할 수 있음
- **로그인 상태 변경**: 페이지 로드 시 1회 판단 후 고정. 세션 중 로그아웃해도 `historyCache`가 남아있으면 캐시를 계속 사용함 — 페이지 새로고침 시 비로그인 상태로 올바르게 전환됨 (의도된 동작)
