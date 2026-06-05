## OpenAPIAutoTest

OPA 번호 기준으로 eformsign Open API를 자동 검증하는 테스트 러너.
각 OPA 항목은 생성 → 검증 → 정리 단계를 자동으로 묶어서 실행한다.

**파일:**
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

- `keys`의 모든 항목이 채워져야 사이드바에 **준비됨** 배지 표시
- `"auth.mode"`는 항상 포함 — 인증 패널 입력 여부 체크 트리거
- `"data.*"` 형태는 `data()` 함수의 반환값 경로를 참조

### 자동탐색 패턴

| 패턴 | steps | 대상 OPA |
|---|---|---|
| 템플릿 자동탐색 | `listFormsForSeed` → `tryCreateAuto` | 003, 005, 014, 042 |
| 템플릿 자동탐색 (일괄) | `listFormsForSeed` → `tryMassCreateAuto` / `tryMassCreateMultiAuto` | 016, 021 |
| 첨부 문서 자동생성 | `createDocWithAttach` → `downloadAttachAuto` | 006 |
| 완료 문서 자동탐색 (단건) | `listCompletedDocsForDownload` → `tryDownloadDocAuto` | 004 |
| 완료 문서 자동탐색 (다건) | `listDocsBasic` → `tryXxxAuto` | 037, 040, 045 |
| 회사 도장 자동 생성/정리 | `createStamp` → `deleteStamp` | 026, 028 |

- `listFormsForSeed`: GET /v2.0/api/forms → 최대 10개 `form_id`를 `state.shared.candidateTemplateIds`에 저장 (활성 템플릿이 10개 미만이면 조회된 만큼만)
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
- 상세 패널 "누락된 설정" 섹션(`#missingSectionWrap`)은 누락 시에만 표시

### 설정 모달 입력 필드

| 필드 ID | 매핑 | 사용 OPA |
|---|---|---|
| `formDefaultEnvironment` | `defaultEnvironment` | 전체 |
| `formCustomUrl` | `environments.custom.baseUrl` | custom 환경 |
| `formExternalTemplateId` | `data.extTemplateId` | 007 |
| `formAttachTemplateId` | `data.attachTemplateId` | 006 |
| `formAttachFieldId` | `data.attachFieldId` | 006 |
| `formMemberId` | `data.memberId` | 011~013, 018~020, 030 |
| `formTargetEmail` | `data.targetEmail` | 014 |
| `formTargetPhone` | `data.targetPhone` | 014 (선택) |
| `formTargetName` | `data.targetName` | 014 (선택) |
| `formPdfRecipientEmail` | `data.pdfTargetEmail` | 037 |
| `formPdfRecipientName` | `data.pdfTargetName` | 037 (선택) |

### 인증 저장/불러오기

설정 모달의 "인증 및 외부 API 설정" 섹션에 **인증 저장** / **인증 불러오기** 버튼이 있다. `credential-panel.js` 공유 모듈을 사용하며, 로그인 사용자만 이용 가능.

**CREDENTIAL_CONFIG 매핑 (설정 모달 필드 직접 참조):**

| CONFIG 키 | 매핑 요소 ID | 비고 |
|---|---|---|
| `apiKeyId` | `formApiKey` | 설정 모달 API Key |
| `userIdId` | `formAuthMemberId` | 설정 모달 Auth Member ID |
| `secretKeyId` | `formSecretKey` | 설정 모달 Secret Key / Bearer Token |
| `envId` | `formDefaultEnvironment` | 설정 모달 기본 환경 select |
| `customUrlId` | `formCustomUrl` | 설정 모달 Custom URL |
| `secretMethodId` | `formAuthMode` | 설정 모달 인증 방식 select |
| `secretMethodType` | `select` | auth 패널 tab이 아닌 설정 모달 select 사용 |
| `darkMode` | `true` | 설정 모달이 다크 테마 |

**`envSaveMap`/`envLoadMap`:** 모달 select value(`saas`)와 DB 형식(`op_saas`) 변환. `csap`/`custom`은 동일하므로 `saas` ↔ `op_saas` 한 건만 매핑.

**동기화 흐름:** 불러오기 시 `credential-panel.js`의 `_setVal()`이 `change`+`input` 이벤트를 dispatch → `bindSettingsInputs()`에서 등록된 `syncConfigFromForm()` 자동 트리거 → config + auth 패널 + readiness 배지 전체 동기화. 추가 코드 불필요.

### 사용 가이드

가이드 모달 내용은 `OpenAPIAutoTest.js` 하단의 `hydrateGuideContent()` 함수에서 주입한다.
`private/OpenAPIAutoTest.html`의 가이드 모달은 뼈대만 존재하며, **가이드 수정 시 JS 파일만 편집할 것** — HTML을 수정해도 런타임에 덮어써진다.

### 비(非)자명한 동작 — 수정 시 주의

- **완료 문서 판별 기준**: `doc.current_status.status_type === "003"` — 문자열이 아닌 숫자 코드
- **토큰 발급 3단계 fallback**: `issueTokenFromPanel()`은 direct 호출 후 전송실패(CORS/네트워크) 시에만 `/api/getToken` 프록시를 재시도하고, 인증거부 응답은 즉시 최종 실패 처리
- **OPA 037 pdfTargetPhone은 선택**: email 또는 phone 중 하나만 있으면 실행 가능. `keys`에는 `data.pdfTargetEmail`만 포함
- **`freshShared()`**: 실행 시마다 초기화되는 step 간 공유 상태. 새 공유 변수 추가 시 이 함수에도 추가할 것
- **`globalChecks()`의 "주 템플릿" 항목 없음**: 모든 문서 생성 OPA가 자동탐색으로 전환되어 제거됨
- **상세 패널 제목**: `renderDetail()`에서 `activeScenarioTitle` 요소에 `"OPA XXX — API 이름"` 형식으로 동적 설정
- **OPA 006 첨부 다운로드**: 사용자가 완료 문서 ID를 직접 입력하지 않는다. `attachTemplateId`와 `attachFieldId`로 첨부 파일 포함 문서를 생성한 뒤 `downloadAttachAuto`가 생성 문서의 첨부 다운로드를 검증한다.
- **OPA 016/021 정리 step 없음**: 일괄 작성 시나리오(`tryMassCreateAuto`, `tryMassCreateMultiAuto`)는 `cancelDocs`/`deleteDocs` 없이 작성 검증만 수행한다.
- **OPA 026/028 도장 이미지 자동 생성**: `createStamp`는 사용자 입력 없이 `makeStampImage()`가 canvas로 즉석 생성한 PNG를 `company_stamp.stamp.path`로 전송한다. 도장 이름은 `OPA자동테스트_{Date.now()}`로 유니크하게 생성해 `4000174`(중복 이름)을 회피한다. 두 시나리오 모두 파이프라인은 `createStamp` → `deleteStamp` 동일이며 `keys`는 `["auth.mode"]`뿐(설정 모달 입력 불필요). 생성된 도장 ID는 `state.shared.companyStampId`에 저장되어 `deleteStamp`가 정리한다.
- **`stamp.path` 형식**: 기본은 data URI(`data:image/png;base64,...`) 전송. API가 순수 base64만 받는다면(`4000231 Invalid company stamp image data`) `OpenAPIAutoTest.js`의 `STAMP_USE_DATA_URI`를 `false`로 바꿔 접두어를 제거한다.

### OPA 격리 실행 (Seed 캐싱)

`runSet()`은 **OPA 단위로 순차 실행**한다. 각 OPA 시작 시 `state.shared = freshShared()`로 문서 생명주기를 격리한다.

- **SEED_STEPS**: `listFormsForSeed`, `listDocsBasic`, `listCompletedDocsForDownload` — 읽기 전용 탐색 step
- seed step의 결과(`candidateTemplateIds`, `completedDocIds`, `candidateDocIds`)는 `seedCache`에 저장
- 후속 OPA에서 같은 seed step이 있으면 캐시를 복원하고 실행을 SKIP (리포트에 "CACHE" 상태로 기록)
- `extractSeedData(stepId)`: seed step 실행 후 해당 shared 키를 캐시 객체로 추출
- `restoreSeedCache(seedCache)`: OPA 시작 시 `freshShared()` 후 캐시된 seed 복원
- 선행 step FAIL 시 같은 OPA의 후속 step은 `opaFailed` 플래그로 SKIP 처리

### 테스트 리포트

실행 완료 후 **"리포트 보기"** 버튼이 표시되며, 모달에서 OPA별/Step별 결과 요약과 실패 상세를 확인할 수 있다.

- `createReportData()` → `addReportStep()` → `finalizeReportData()` 순으로 데이터 수집
- OPA 판정: 모든 step PASS(CACHE 포함) → PASS / 하나라도 FAIL → FAIL / 모두 SKIP → SKIP
- `generateReportHtml()`: 모달 내 HTML 렌더링
- `generateReportMarkdown()`: Markdown 텍스트 생성
- `generateReportHtmlFile()`: 인라인 CSS 포함 자체 완결형 HTML
- 파일명: `OPA_Report_{프로필명}_{YYYYMMDD_HHmmss}.{md|html}`
- 새 실행 시작 시 이전 리포트 데이터는 덮어써진다
