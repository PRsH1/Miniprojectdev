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
- 상세 패널 "누락된 설정" 섹션(`#missingSectionWrap`)은 누락 시에만 표시

### 설정 모달 입력 필드

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

### 사용 가이드

가이드 모달 내용은 `OpenAPIAutoTest.js` 하단의 `hydrateGuideContent()` 함수에서 주입한다.
`private/OpenAPIAutoTest.html`의 가이드 모달은 뼈대만 존재하며, **가이드 수정 시 JS 파일만 편집할 것** — HTML을 수정해도 런타임에 덮어써진다.

### 비(非)자명한 동작 — 수정 시 주의

- **완료 문서 판별 기준**: `doc.current_status.status_type === "003"` — 문자열이 아닌 숫자 코드
- **OPA 037 pdfTargetPhone은 선택**: email 또는 phone 중 하나만 있으면 실행 가능. `keys`에는 `data.pdfTargetEmail`만 포함
- **`freshShared()`**: 실행 시마다 초기화되는 step 간 공유 상태. 새 공유 변수 추가 시 이 함수에도 추가할 것
- **`globalChecks()`의 "주 템플릿" 항목 없음**: 모든 문서 생성 OPA가 자동탐색으로 전환되어 제거됨
- **상세 패널 제목**: `renderDetail()`에서 `activeScenarioTitle` 요소에 `"OPA XXX — API 이름"` 형식으로 동적 설정
