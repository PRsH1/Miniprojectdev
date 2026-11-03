## OpenAPITester

Postman 스타일 eformsign Open API 테스터. **상태:** Beta

**파일:**
- `API(JS,HTML)/OpenAPITesterProd.html` — 공개 배포판 UI (멤버·그룹 API와 `fullOnly` API 비공개 — Q5, 명세 데이터는 공개 번들에 남아 있음)
- `private/OpenAPITesterFull.html` — 전체판 UI (`/app/OpenAPITesterFull`, manager 이상)
- `assets/js/openapi/api-list.js` — API_LIST 데이터
- `assets/js/openapi/api-specs.js` — API_SPECS 데이터
- `assets/js/openapi/state.js` — 상태·상수·헬퍼
- `assets/js/openapi/ui.js` — UI 로직 전반
- `assets/js/openapi/init.js` — 초기화·명세 모달

> **로드 순서**: `api-list.js` → `api-specs.js` → `state.js` → `ui.js` → `init.js`
> 전역 변수로 공유되므로 `<script>` 태그 순서를 변경하면 안 됨.

> **Prod와 Full은 거의 동일한 복제본이다.** 두 HTML의 실질적 차이는 Prod에만 있는
> 인라인 스크립트 한 블록(`api-list.js` 로드 직후, `API_LIST`에서 `group === '멤버'`·`'그룹'` 항목과
> `fullOnly: true` 항목을 `splice`로 제거)뿐이다. `diff private/OpenAPITesterFull.html "API(JS,HTML)/OpenAPITesterProd.html"`의 결과가 이 블록뿐이어야 한다. **UI를 수정할 때는 반드시 두 파일 모두 고쳐야 한다** — 한쪽만
> 고치면 조용히 갈라진다. JS 모듈은 공유하므로 로직 수정은 한 번으로 충분하다.

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
    opaCode: 'OPA2_XXX',        // 대고객 번호. null이면 배지 없음 (Full 전용 신규 API). 기존 값은 절대 바꾸지 않는다
    sourceApiId: 'OPA2_0xx',    // 선택 — SaaS 소스 내부 번호(ApiIdConf, 참고용). opaCode가 없는 항목에만 쓴다
    fullOnly: true,             // 선택 — 대고객 공개 검토 전. Full에만 보이고 Prod는 화면에서 제거, 사이드바에 회색 "검토" 라벨
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
            { title: '한글 설명 (코드)', body: { code, ErrorMessage }, status: 400 }
            // title 형식: '유효하지 않은 서명 (4030004)' — 항상 한글로 작성
            // status(선택): HTTP 상태. 예시 패널 제목 끝에 "· HTTP 500"으로 표시된다 (아래 "HTTP 상태" 참고)
            // 소스 기준: SaaS 소스 EformsignExceptionType + 던지는 위치. utils/error-codes.html은 고객 공개 페이지라
            //            소스와 다른 곳이 있다(OPA2_030=SSO 카드, OPA2_041 경로 form_image 등) — 그 페이지를 근거로 삼지 말 것
        ]
    }
}
```

**API_LIST 배치 규칙**: 신규 API는 OPA2 번호 오름차순 위치에 삽입. 대고객 번호가 없는 Full 전용 API는
파일 끝 "Full 전용" 구역에 두며, 그룹 보기에서는 각 그룹 끝에 붙는다. 편집 파일: `assets/js/openapi/api-list.js`

### 대고객 OPA 번호 ≠ 소스 내부 번호 (2026-11 소스 대조)

- 허브의 `opaCode`는 **대고객 안내용 번호**이고, SaaS 소스 `ApiIdConf.java`의 내부 번호와 일부 다르다. **기존 `opaCode`는 바꾸지 않는다.**
  소스와 맞출 때는 번호가 아니라 **HTTP 메서드 + 경로**로 대응시킨다.
- 번호가 다른 항목(허브 → 소스): `OPA2_008` POST `/list_document` → 소스 `OPA2_008_1`(소스 `OPA2_008`은 GET `/documents` + Body),
  `OPA2_021` POST `/forms/mass_multi_documents` → `OPA2_023`, `OPA2_030` POST `/list_members` → `OPA2_036`(소스 `OPA2_030`은 SSO 구성원 조회 — 추가 금지).
  나머지 등록 항목은 번호·경로가 같다.
- 근거 자료: `docs/reference/eformsign-saas-source-survey.md` 3.2절(엔드포인트 전체 표 — 로컬 문서, `docs/`는 .gitignore로 커밋되지 않음). 소스: `OpenAPIV2Controller.java`, `ApiIdConf.java`.

### Full 전용 신규 API 추가 절차

1. 소스(`OpenAPIV2Controller.java`)에서 메서드·경로·쿼리·Body 파싱·응답·던지는 예외를 확인한다. 특정 고객 전용·내부 운영용·파트너(국가 키·IAM 키) 전용·
   SSO 구성원·multipart·GET+Body 엔드포인트는 넣지 않는다.
2. `api-list.js` "Full 전용" 구역에 `opaCode: null`, `sourceApiId`, `fullOnly: true`로 추가한다.
3. 명세는 `API_SPECS[<API id>]` 키로 넣는다 — 조회는 `getApiSpec(ep)` = `API_SPECS[ep.opaCode] || API_SPECS[ep.id]`(`state.js`).
4. Prod HTML은 고치지 않아도 된다(숨김 블록이 `fullOnly`를 제거). 공개하기로 하면 대고객 번호를 정해 `opaCode`를 넣고 `fullOnly`·`sourceApiId`를 지운 뒤,
   명세 키를 `opaCode`로 옮긴다.
5. **한계**: Prod는 화면에서만 숨긴다 — `api-list.js`·`api-specs.js`가 공개 번들이라 데이터는 누구나 내려받을 수 있다(Q5와 같은 수준).

### HTTP 상태 (`status`)

소스에서 HTTP 상태는 에러 코드가 아니라 **예외 클래스**가 정한다: `EformsignBadRequestException` 400, `EformsignTokenException` 401,
`EformsignForbiddenException` 403, `EformsignCheckException` **500**(입력 오류에도 쓰임), `EformsignProcessingException` 202.
같은 코드가 위치에 따라 다른 상태로 나가므로 `status`는 확인된 것만 넣는다 — 소스 전체에서 한 클래스로만 던지는 code+message이거나,
공통 인증·회사·역할 검사(토큰 4010001=401, API Key 4000003=400, 비활성 키 4030001=403, 삭제·정지 회사 4000076·4030052=403,
역할 4030009·4000097=403)이거나, 그 API의 던지는 위치를 확인한 경우. `errors`와 `errorCodes`의 `status`도 같아야 한다.

### API 명세 데이터 구조 (`API_SPECS`)

`assets/js/openapi/api-specs.js`에 위치. opaCode를 키로 하는 객체(opaCode가 없는 Full 전용 API는 API `id`를 키로 쓴다 — `getApiSpec(ep)`).

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
            { code, message, description, status }   // status(선택)가 하나라도 있으면 명세 모달에 HTTP 열 표시
        ],
    },
};
```

- **정합성 원칙**: `API_SPECS`의 queryParams/requestBody/responseFields는 `API_LIST`의 실제 데이터와 일치해야 함. 신규 명세 추가 시 반드시 `api-list.js` 실제 구조를 기준으로 작성
- **errorCodes 정합성**: `API_SPECS`의 `errorCodes`는 `API_LIST`의 `exampleResponse.errors`와 동기화 상태여야 함(code·message·status). 에러 추가/수정 시 두 파일 모두 수정할 것 (소스 레퍼런스: SaaS 소스 `EformsignExceptionType.java`)
- **최상위 에러가 아닌 것**: 일괄 처리 API의 문서별 실패(OPA2_009 `fail_result`, OPA2_040 `{document_id: 메시지}`, OPA2_030 `success:false`)는 HTTP 200 본문으로 오므로 `errors` 예시에 넣지 않고 응답 필드 설명에 적는다
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
- **인증 헤더 마스킹**: 저장 시 `Authorization`(Bearer 토큰, OPA2_007/048은 base64 회사 API Key)·`eformsign_signature` 등 민감 헤더(`state.js`의 `SENSITIVE_HEADER_RE` — `authorization`/`cookie`/`x-api-key` 또는 이름에 `signature`/`token`/`secret` 포함)는 **키만 저장하고 값은 `""`**. `loadHistoryEntry()`는 저장 항목의 인증 헤더로 덮어쓰지 않고 현재 발급된 토큰을 유지한다(재발급 후 불러와도 401 없음).
- 구버전 데이터: localStorage 항목은 `historyLoad()`가 읽을 때 인증 헤더 값을 지우고 다시 기록한다. DB에 남아 있던 구버전 행은 2026-10-28 `scripts/cleanup-request-history-secrets.js --apply`로 일괄 정리했다(6행, 인증 헤더 값 제거 — 기본 실행은 건수만 보는 dry-run, 멱등). `initHistory()`도 메모리 캐시에 올릴 때 한 번 더 마스킹한다.

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
| `historyCaptureAndSave(name, { replaceId })` | **async** | 현재 요청 캡처(`captureRequestSnapshot()`) 후 로그인=DB POST+캐시 / 비로그인=localStorage. `replaceId`가 있으면 덮어쓰기(아래) |
| `captureRequestSnapshot()` | 동기 | 화면의 `{ method, pathParams, queryParams, headers, body }` — draft·저장 공용 |
| `rememberCurrentDraft()` / `persistDraftSession()` / `readDraftSession()` | 동기 | draft 캐시·sessionStorage 보관/읽기 |
| `historyDelete(id)` | **async** | 로그인=DB DELETE+캐시 / 비로그인=localStorage |
| `historyClear()` | **async** | 로그인=DB 전체삭제+캐시 초기화 / 비로그인=localStorage 제거 |
| `historyByEndpoint(endpointId)` | 동기 | `historyLoad()` 결과에서 필터링 |

**주요 함수 (ui.js) — async 주의:**

| 함수 | 역할 |
|---|---|
| `openSaveModal()` / `closeSaveModal()` | Save 모달 열기/닫기 |
| `confirmSave(mode)` | **async** — 불러온 항목이 있으면 기본 버튼이 [덮어쓰기], `confirmSave('new')`는 [새로 저장]. 실패 시 모달 유지 → 해당 엔드포인트 자동 펼침 → `buildSidebar()` 재호출. 저장 후 `state.currentHistoryId`를 방금 저장한 항목으로 바꾼다 |
| `buildHistoryPanel()` | 저장됨 탭 flat 목록 렌더링 |
| `loadHistoryEntry(entry)` | 저장 항목 불러오기: 환경이 다르면 바꾸고 토스트(`환경 변경: A → B`) → `selectEndpoint(id, { skipDraft: true })` → `applyRequestSnapshot(entry)` (지연 없음) |
| `applyRequestSnapshot(snap)` | path·query·헤더를 **key로** 맞춰 복원, 정의에 없는 query·헤더는 사용자 추가 행으로 복원. requiresAuth API의 Authorization과 값이 빈 인증 헤더는 현재 값 유지 |
| `resetRequestToDefault()` | [기본값 복원] — 현재 API의 draft를 버리고 정의 기본값으로 |
| `historyClearConfirm()` | **async** — 전체 삭제 확인 → `expandedSaveEndpoints.clear()` → 재빌드 |

**`state.currentHistoryId`:** 현재 불러온 히스토리 항목 ID. `loadHistoryEntry()`·저장 시 설정, `selectEndpoint()` 직접 클릭·해당 항목 삭제 시 `null` 초기화.

**덮어쓰기 (P1-09):** 저장 항목을 불러온 상태(같은 엔드포인트)에서 Save → [덮어쓰기]/[새로 저장].
- 비로그인: localStorage에서 같은 id 항목을 빼고 새 내용으로 맨 앞에 넣는다(id 유지, 개수 그대로).
- 로그인: 서버에 PATCH가 없어 **새로 POST → 성공하면 이전 id DELETE** 순서로 한다(기획서의 DELETE→POST와 반대 — POST 실패 시 원본을 잃지 않기 위해).
  DELETE가 실패하면 두 항목이 모두 남는다 — `historyCaptureAndSave()`는 `entry.replaceFailed = true`만 표시하고,
  `confirmSave()`가 "덮어씀" 대신 "새 내용은 저장했지만 이전 항목을 지우지 못했습니다" 토스트(5초)를 띄운다(D-3 — 예전엔 경고 직후 "덮어씀"이 덮었다).
  캐시는 POST 직후(서버가 100건으로 자르는 시점과 같게) 100건으로 자르고, 이전 항목이 그 정리로 이미 빠졌으면 DELETE하지 않는다
  (D-9 — DELETE 뒤에 자르면 100건이 찬 상태에서 캐시가 서버보다 1건 많았다). 저장 id는 서버가 새로 만들므로 덮어쓰면 id가 바뀐다. PATCH 도입은 서버(`controllers/requestHistory.js`) 변경 사항.

**편집 내용 보존 — draft (P1-09):**
- `requestDraftCache`(state.js, `responseCache`와 같은 엔드포인트별 캐시): `selectEndpoint()`가 떠나는 API의 `captureRequestSnapshot()`을 저장하고,
  들어오는 API는 기본값으로 만든 뒤(`renderEndpointDefaults()`) draft가 있으면 `applyRequestSnapshot()`으로 덮는다. 메서드 select 변경도 포함.
- sessionStorage `openapi_tester_draft_v1` = `{ v:1, current, env, customDomain, drafts }`: 입력이 멈춘 뒤 0.4초(`scheduleDraftPersist`) 및 API 전환 시 기록.
  **인증 헤더 값은 `maskSensitiveHeaders()`로 비워서 저장**한다(메모리 캐시는 값 보유 — OPA2_007의 직접 입력 Authorization은 같은 탭 안에서 API를 오가도 유지).
  용량 초과면 현재 API draft만 저장. 새로고침하면 환경·직접 입력 URL을 먼저 복원하고, 사이드바를 만든 뒤 마지막으로 보던 API를 열어 draft를 복원한다(토스트 안내).
  복원(`restoreDraftSession()`)이 끝나기 전에는 `draftSessionReady=false`라 `persistDraftSession()`이 기록하지 않는다
  (D-10 — 환경 select 복원의 change 이벤트가 빈 draft를 먼저 써서, `/api/me`가 느릴 때 다시 새로고침하면 편집 내용이 사라졌다).
  `refreshAuthUser()`/`initHistory()`가 실패해도 `.catch()` 뒤에 복원은 실행된다.
  토큰·API Key·Member ID·비밀 키는 저장하지 않는다(P0-08). Body·파라미터 값(수신자 비밀번호 등 업무 데이터)은 마스킹하지 않고 draft·저장 항목에 그대로 남긴다 — 2026-11-03 사용자 허용.
- 진행 중인 요청이 있는데 다른 API로 바꾸면 그 요청은 취소된다(응답이 다른 API 화면에 표시되는 것 방지). 같은 API 재클릭은 취소하지 않는다(D-11).

**DB API 엔드포인트 (`/api/request-history`):**

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/request-history` | 내 히스토리 목록 (최신순 100건) |
| POST | `/api/request-history` | 항목 저장 (100건 초과 시 서버에서 오래된 것 자동 삭제). **id는 서버가 생성**(20자 base64url 난수, 응답 `{ success, id }`) — 클라이언트 id는 무시(P0b-06). 크기 한도 초과는 400(`rules/error-response.md` 한도 표) |
| DELETE | `/api/request-history/:id` | 단건 삭제 |
| DELETE | `/api/request-history` | 전체 삭제 |

---

### Body 에디터 JSON 검증

`#bodyEditor` textarea에 입력 시 300ms debounce 후 자동으로 JSON 유효성 검사.

| 상태 | 표시 |
|---|---|
| 유효한 JSON | 초록 테두리 (`.is-valid`) |
| 유효하지 않은 JSON | 빨간 테두리 (`.has-error`) + `#bodyErrorMsg` div에 SyntaxError 내용 표시 |
| 빈 입력 | 중립 (검증 비활성) |

**관련 함수 (`ui.js`):**

| 함수 | 역할 |
|---|---|
| `showBodyError(msg)` | 에러 표시 — e.message에서 `JSON.parse:` / `SyntaxError:` 접두어 제거 후 렌더링 |
| `clearBodyError()` | 에러 해제 — 테두리 클래스 + `#bodyErrorMsg` 초기화 |
| `markBodyValid()` | 유효 표시 — 초록 테두리 적용 + `#bodyErrorMsg` 초기화 |
| `_validateBodyJson` | debounce(300ms) 래퍼 — `#bodyEditor` input 이벤트에 바인딩 |

**`selectEndpoint()` 호출 시 `clearBodyError()` 자동 실행** — API 선택 변경 시 이전 에러 상태 초기화.

**Format JSON (`formatBody()`)** — 성공 시 `markBodyValid()`, 실패 시 `showBodyError()` 연동.

**HTML 구조 (`#tab-body`):**
```html
<div class="body-toolbar">
    <span>Content-Type: application/json</span>
    <button onclick="formatBody()" title="JSON 자동 정렬 (Ctrl+Shift+F)">
        <i class="fa-solid fa-align-left fa-xs"></i> Format JSON
    </button>
    <button onclick="clearBody()">초기화</button>
</div>
<textarea class="body-editor" id="bodyEditor"></textarea>
<div id="bodyErrorMsg" class="body-error-msg" style="display:none;"></div>
```

> **에러 위치 빨간 물결 밑줄**: Backdrop Overlay 기법으로 구현됨. `e.message`에서 `position N` 파싱 → 해당 토큰에 `<mark class="err-token">` 삽입 → `text-decoration: underline wavy #e74c3c` 표시. 관련 함수: `_escapeHtml()` / `_getErrorRange()` / `_buildHighlightHtml()` / `_updateBackdrop()` / `syncBackdropScroll()` (`ui.js`). HTML: `#bodyHighlights` div가 `#bodyEditor` textarea 뒤에 겹쳐서 렌더링됨 (`.body-editor-wrap` 내 absolute 배치).

---

### 응답 에러 표시 (`#responseNotice`)

- 두 HTML 모두 응답 헤더와 `.response-body-wrap` 사이에 `#responseNotice`가 있다. `ui.js`의 `showResponseNotice(info)` / `hideResponseNotice()`가 관리한다.
- 4xx/5xx 응답이면 `renderApiError`(`assets/js/api-error.js`)로 `HTTP 400 · [코드] 메시지` + 에러 코드 찾아보기 링크를 표시한다. 본문은 기존처럼 `#responseBody`에 pretty-print된다.
- `fetch` 자체가 실패하면(`Failed to fetch`) CORS·도메인 오타·네트워크 안내와 CorsTest 링크를 표시한다.
- `clearResponse()`와 `selectEndpoint()`(응답 캐시 복원 전)에서 숨긴다. 응답 캐시(`responseCache`)에는 저장하지 않는다.
- 로드 순서: `api-error.js` → `token-issuer.js` → `token-badge.js` → `openapi/api-list.js` …(공유 모듈 → openapi 모듈). 두 HTML 모두 동일.

---

### 토큰 혼선 방지 · 전송 전 검증 (P1-08)

- **토큰 발급 설정 추적**: `getAccessToken()`은 발급 요청 시점의 `{ baseUrl(환경·직접 입력 도메인), apiKey, memberId }`를
  `state.tokenContext`에 기억한다(`currentTokenContext()`). 환경 select·직접 입력 URL·API Key·Member ID 입력이 바뀔 때마다
  `updateAuthUI()`가 비교해 하나라도 다르면 헤더 상태를 **"다른 설정으로 발급됨"**(주황)으로 바꾸고, 유효 시간 배지(`#tokenBadge`)
  대신 `#tokenStaleNotice`(변경 항목 + [현재 설정으로 재발급] [토큰 비우기])를 보여 준다. 원래 값으로 되돌리면 정상 표시로 돌아온다.
  크리덴셜 불러오기도 같은 규칙을 탄다(토큰을 자동으로 지우지 않음).
- **Send 확인창**: `requiresAuth` API를 "다른 설정으로 발급됨" 상태에서 보내면 `#choiceModal`(`showChoiceModal()`)이 뜬다.
  기본(포커스) 버튼은 **[토큰 비우고 재발급]** — 토큰을 비우고 인증 패널을 펼친 뒤 전송하지 않는다. [그대로 전송]은 기존 토큰으로 보낸다.
- **토큰 비우기**: `clearAccessToken()`(초기화 버튼·확인창 공통)은 `state.tokenContext`도 지운다. Authorization 헤더 자동 채움/비움
  (`syncAuthorizationHeader()`)은 `requiresAuth: true` API에서만 한다 — OPA2_007/048처럼 base64 회사 API Key를 직접 넣는 헤더는 건드리지 않는다.
- **크리덴셜 적용 순서**: `applyCredentialTester()`는 직접 입력 URL을 먼저 넣고 그다음 환경 `change`를 발생시킨다
  (반대 순서면 Base URL 배지·URL 미리보기가 옛 URL을 보여 줬다).
- **전송 전 검증** `validateRequestBeforeSend()`: 아래 중 하나라도 걸리면 요청을 보내지 않고, 해당 입력에 빨간 테두리(`.kv-input.has-error`)와
  `.param-error-msg`, URL 바 아래 `#requestValidationMsg`에 목록을 표시한 뒤 첫 오류의 탭으로 이동한다. 입력을 고치면 그 칸의 표시는 바로 사라진다.
  - path 파라미터 빈 값(모든 path 파라미터는 필수 — 비우면 URL에 `{document_id}`가 남는다)
  - `required: true` query 파라미터의 빈 값 또는 체크 해제 (query 행의 `data-required`)
  - `requiresAuth` API인데 Authorization 헤더가 없음/비활성/빈 값/`Bearer`만 있음 → 인증 패널 자동 펼침
  - 활성 헤더 값에 `{base64_encoded_api_key}` 같은 플레이스홀더가 남아 있음
  - Body JSON 형식 오류
- **인증 패널 기본 펼침**: 토큰이 없으면 펼친 상태로 시작한다(`setAuthPanelOpen()`, HTML도 `open` 클래스로 시작).

### 요청 취소 · 단축키 · 코드 스니펫 (P1-10)

- **취소·타임아웃**: `sendRequest()`는 `AbortController`를 `state.inFlight`에 두고 **60초**(`REQUEST_TIMEOUT_MS`) 타이머를 건다.
  진행 중에는 Send 버튼이 회색 **[취소]**(`.btn-send.is-cancel`, `setSendButtonBusy()`)로 바뀌고 드롭다운 화살표는 비활성.
  [취소] → "요청이 취소되었습니다", 타임아웃 → "응답이 60초 안에 오지 않아 요청을 취소했습니다"를 응답 영역에 표시한다(CORS 안내는 띄우지 않음).
  진행 중에 다른 API를 고르면 `cancelInFlightRequest('switch')`로 취소하고 토스트만 띄운다. **보고 있는 API를 다시 클릭하면** 화면을 다시 그리지 않고
  요청도 취소하지 않는다(`selectEndpoint()` 조기 반환 — 불러온 저장 항목 상태만 해제, D-11). 저장 항목 불러오기(`skipDraft`)는 같은 API여도 다시 그린다.
- **단축키**(`init.js` keydown): **Ctrl/Cmd+Enter** = Send(모달이 열려 있거나 요청 진행 중이면 무시, Body 편집 중에도 줄바꿈 대신 전송),
  **Esc** = 가장 위 모달 하나 닫기(`MODAL_CLOSERS` 순서: 확인창 → 로그인 필요 → 인증 저장 → 인증 불러오기 → 요청 저장 → Code → API 명세 → 가이드),
  모달이 없으면 Send 드롭다운·모바일 사이드바를 닫는다. **Ctrl+Shift+F** = Body JSON 정렬(기존). 새 모달을 추가하면 `MODAL_CLOSERS`에도 넣는다.
- **코드 스니펫 이스케이프**: cURL은 URL·헤더·Body를 `shellQuote()`(`'` → `'\''`)로 감싼다. Python은
  `payload = json.loads(r'''…''')` + `requests.<m>(url, headers=headers, json=payload)`(Body에 `'''`가 있거나 `'`·`\`로 끝나면
  한 줄 JSON 문자열 리터럴로 대체), `print(response.status_code)` / `print(response.text)`. fetch·jQuery는 Body를 템플릿 리터럴
  (`jsTemplateEscape()` — `\` `` ` `` `${`)로, URL은 `JSON.stringify`로 넣는다. Java는 헤더·URL을 `javaQuote()`, Body 텍스트 블록은 `\`·`"""`만 이스케이프.

### 비(非)자명한 동작 — 수정 시 주의

- **사이드바 정렬 모드**: `ui.js`의 `currentViewMode` 변수로 관리 (`'group'` | `'code'` | `'method'`)
- **API 선택 시 자동 탭 전환**: Path 파라미터 있음 → Path 탭 / Body 있음 → Body 탭 / 그 외 → Query 탭
- **토큰 발급은 공유 모듈 사용**: `getAccessToken()`은 `window.issueAccessToken`(`assets/js/token-issuer.js`)을 호출한다(direct → 전송실패 시에만 `/api/getToken` 프록시, 인증거부는 즉시 실패). 페이지 자체 direct/proxy 구현(`tryDirectToken`/`tryProxyToken`)은 제거됨. 성공 시 `#tokenBadge`(token-badge.js)에 남은 시간·via 표시, 실패 시 `#tokenErrorMsg`에 `[코드] 메시지`를 [닫기] 전까지 고정 표시(`showTokenError`/`hideTokenError`). 성공 시 `getAccessToken()`은 발급 결과를 반환한다
- **401 배너**: Send 응답이 401이면 `#responseNotice` 맨 위에 "토큰이 만료되었거나 유효하지 않습니다 [토큰 재발급]" 배너(`#tokenExpiredBanner`)가 뜨고 배지가 "만료됨"으로 바뀐다. 클릭 → `getAccessToken()` 성공 시 배너 제거
- **`showToast` 타이머**: `state.js`의 `showToast`는 이전 타이머를 `clearTimeout`한 뒤 새로 건다(연속 토스트가 일찍 사라지던 문제 수정)
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
  - 로그인 저장은 요청 본문에서 `id`를 빼고 보내며, 응답의 서버 `id`를 `entry.id`로 넣은 뒤 캐시에 추가한다. 실패 토스트에는 서버의 `error.reason`(없으면 `message`)을 보여 준다. 비로그인(localStorage)은 기존대로 `Date.now()` id
- **로그인 상태 변경**: 페이지 로드 시 1회 판단 후 고정. 세션 중 로그아웃해도 `historyCache`가 남아있으면 캐시를 계속 사용함 — 페이지 새로고침 시 비로그인 상태로 올바르게 전환됨 (의도된 동작)
