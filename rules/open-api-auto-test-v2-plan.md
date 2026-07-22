## OpenAPIAutoTest v2 기획서 — 구현자 참조용

작성일: 2026-05-27
상태: **Feature 1~3 + Hotfix 4 전부 구현 완료 (2026-07-23 확인)**

> 이 문서는 구현이 끝난 기획서다. 현행 동작의 정본은 `rules/open-api-auto-test.md`이며,
> 아래 내용은 설계 의도와 배경을 남기기 위한 기록이다. 코드와 어긋나면 `open-api-auto-test.md`를 따른다.

---

### 구현 순서

| 순서 | 기능 | 난이도 | 상태 |
|---|---|---|---|
| 1 | Custom URL 환경 추가 | 낮음 | ✅ 완료 |
| 2 | OPA 006 파이프라인 변경 | 중간 | ✅ 완료 |
| 3 | 테스트 리포트 | 중간 | ✅ 완료 |
| 4 | runSet OPA 단위 실행 전환 | 중간 | ✅ 완료 |

> Hotfix 4 구현 위치: `assets/js/OpenAPIAutoTest.js`의 `SEED_STEPS`(상수),
> `extractSeedData()` / `restoreSeedCache()`, `runSet()`의 OPA 이중 루프 + `opaFailed` SKIP 처리.

---

## Feature 1: Custom URL 환경 추가

**목표:** SaaS/CSAP 외에 사용자가 직접 URL을 입력하여 커스텀 환경에서 테스트할 수 있도록 한다.

**참고 구현:** `assets/js/openapi/state.js`의 `getBaseUrl()` 패턴 + `private/OpenAPITesterFull.html`의 custom 환경 UI

### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `OpenAPIAutoTest.html` | 헤더: `#envSelect` 옆에 `#customUrlInput` 추가 (기본 display:none) |
| | 설정 모달: `#formDefaultEnvironment` select에 `custom` 옵션 추가 + `#formCustomUrl` 입력 필드 추가 |
| `OpenAPIAutoTest.js` | `DEFAULT_CONFIG.environments`에 `custom: { label: "직접 입력", baseUrl: "" }` 추가 |
| | `baseUrl()` 함수 분기: `env === 'custom'`이면 `#customUrlInput` 값 반환 (trailing slash 제거) |
| | 환경 변경 이벤트: custom 선택 시 입력 필드 표시/숨김 토글 |
| | 프로필 저장/복원 시 `environments.custom.baseUrl` 포함 |
| | 설정 모달 ↔ 헤더 양방향 동기화 |

### UI 동작

```
[환경] [운영 (SaaS) ▼] [https://kr-api.eformsign.com]    ← 기존
                         ↓ custom 선택 시
[환경] [직접 입력   ▼] [https://_______________] [URL 표시]  ← 입력 필드 나타남
```

### 데이터 흐름

```
config.environments.custom.baseUrl ← 사용자 입력
  ↓ 프로필 저장 시
localStorage (프로필 JSON 내 environments.custom.baseUrl)
  ↓ 프로필 복원 시
#customUrlInput.value + #envSelect.value = 'custom'
```

### 설정 모달 내 Custom URL

```html
<!-- #formDefaultEnvironment select에 옵션 추가 -->
<option value="custom">직접 입력</option>

<!-- custom 선택 시에만 표시되는 필드 -->
<div class="settings-field" id="formCustomUrlWrap" style="display:none">
    <label for="formCustomUrl">Custom URL</label>
    <input id="formCustomUrl" type="text" placeholder="https://api.example.com">
</div>
```

---

## Feature 2: OPA 006 파이프라인 변경

**목표:** 사용자가 document_id를 직접 입력하는 대신, 첨부 컴포넌트가 설정된 template_id를 입력하면 자동으로 문서 생성 → 첨부 다운로드 → 정리를 수행한다.

### 변경 전 vs 변경 후

| | 변경 전 | 변경 후 |
|---|---|---|
| **steps** | `["downloadAttach"]` | `["createDocWithAttach", "downloadAttachAuto", "cancelDocs", "deleteDocs"]` |
| **keys** | `["auth.mode", "data.attachDocId"]` | `["auth.mode", "data.attachTemplateId", "data.attachFieldId"]` |
| **사용자 입력** | 완료 문서 ID (document_id) | 첨부 컴포넌트가 있는 template_id + 첨부 필드 ID |
| **desc** | 첨부 파일 포함 문서의 첨부 다운로드를 검증합니다. | 첨부 컴포넌트가 있는 템플릿으로 문서를 생성한 뒤, 해당 문서의 첨부 파일 다운로드를 검증합니다. |

### 새 Step 핸들러

**`createDocWithAttach`** — 첨부 파일 포함 문서 작성:

```javascript
if (id === "createDocWithAttach") {
    const templateId = must(d.attachTemplateId, "첨부 템플릿 ID가 비어 있습니다.");
    const fieldId = d.attachFieldId || "첨부 1";

    const body = {
        document: {
            document_name: "OPA 006 첨부파일 자동 테스트",
            comment: "Auto Test — 첨부 파일 다운로드 검증용",
            fields: [{
                id: fieldId,
                value: JSON.stringify(DUMMY_ATTACH_FILES)
            }],
            recipients: [],
            parameters: [],
            notification: []
        }
    };

    return request({
        id, method: "POST",
        path: `/v2.0/api/documents?template_id=${encodeURIComponent(templateId)}`,
        body, ok: [200],
        after: (json) => rememberDoc(json)
    });
}
```

**`downloadAttachAuto`** — 생성된 문서에서 첨부 다운로드:

```javascript
if (id === "downloadAttachAuto") {
    return request({
        id, method: "GET",
        path: `/v2.0/api/documents/${must(state.shared.lastCreatedId, "첨부 문서가 생성되지 않았습니다.")}/download_attach_files`,
        ok: [200]
    });
}
```

### 더미 첨부 파일 상수

테스트용 더미 PDF를 JS 상수로 내장한다. 용량 절감을 위해 **파일 1개만** 사용한다.

```javascript
const DUMMY_PDF_BASE64 = "JVBERi0xLjUK...";  // 제공된 예시 PDF (약 4KB)
const DUMMY_ATTACH_FILES = [{
    src: `data:application/pdf;base64,${DUMMY_PDF_BASE64}`,
    filetype: "pdf",
    filename: "auto_test_attach.pdf"
}];
```

> base64 원문은 사용자가 제공한 Request Body 예시의 첫 번째 PDF 사용.

### stepMeta 추가

```javascript
createDocWithAttach: ["POST", "새 문서 작성 (첨부파일 포함)"],
downloadAttachAuto: ["GET", "문서 첨부 파일 다운로드 (자동)"],
```

### 설정 모달 변경

| 변경 | 내용 |
|---|---|
| `#formAttachDocumentId` 제거 | 더 이상 document_id를 입력받지 않음 |
| `#formAttachTemplateId` 추가 | 첨부 컴포넌트가 있는 template_id 입력 필드 |
| `#formAttachFieldId` 추가 | 첨부 컴포넌트 필드 ID (기본값: "첨부 1") |

```html
<div class="settings-field">
    <label for="formAttachTemplateId">첨부 템플릿 ID <small style="color:var(--muted)">(OPA 006)</small></label>
    <input id="formAttachTemplateId" type="text">
</div>
<div class="settings-field">
    <label for="formAttachFieldId">첨부 필드 ID <small style="color:var(--muted)">(기본: 첨부 1)</small></label>
    <input id="formAttachFieldId" type="text" placeholder="첨부 1">
</div>
```

### data() 함수 변경

```javascript
// 제거
attachDocId: raw.attachDocId || (raw.lookupTargets && raw.lookupTargets.attachDocumentId) || "",

// 추가
attachTemplateId: raw.attachTemplateId || "",
attachFieldId: raw.attachFieldId || "첨부 1",
```

### 기존 downloadAttach step

기존 `downloadAttach` step 핸들러는 제거한다 (더 이상 사용되지 않음).

### freshShared() 변경 없음

`lastCreatedId`와 `createdIdList`를 그대로 사용하므로 추가 변경 불필요.

---

## Feature 3: 테스트 리포트

**목표:** 테스트 실행 완료 후 OPA별/Step별 성공·실패 여부와 실패 시 에러 상세를 포함한 리포트를 모달로 표시하고, Markdown 또는 HTML 파일로 다운로드할 수 있도록 한다.

### 데이터 수집 구조

`runSet()` 실행 중 결과를 `reportData` 객체에 누적한다.

```javascript
const reportData = {
    meta: {
        executedAt: "2026-05-27 14:30:00",
        environment: "saas",           // 또는 "csap", "custom"
        baseUrl: "https://kr-api.eformsign.com",
        customUrl: null,               // custom 환경일 때만 값 있음
        profile: "Default",
        authMode: "signature"
    },
    // OPA별 요약 — OPA 판정: 모든 step PASS → PASS, 하나라도 FAIL → FAIL
    opaSummary: [
        {
            code: "OPA 003",
            name: "문서 정보 조회",
            result: "PASS",           // "PASS" | "FAIL" | "SKIP"
            totalSteps: 6,
            passed: 6,
            failed: 0,
            skipped: 0
        }
    ],
    // Step별 상세 — 모든 step의 실행 결과
    stepDetails: [
        {
            index: 1,
            opaCode: "OPA 003",       // 이 step이 속한 OPA (매핑 필요)
            stepId: "listFormsForSeed",
            label: "작성 가능한 템플릿 목록 조회 (자동 탐색)",
            method: "GET",
            status: "PASS",           // "PASS" | "FAIL" | "SKIP"
            httpStatus: 200,
            duration: "234ms",
            url: "https://...",
            error: null               // FAIL 시 아래 구조
            // error: { code: "4030004", message: "유효하지 않은 서명" }
        }
    ],
    // 실패 항목만 추출 — 리포트 "실패 상세" 섹션용
    failures: [
        {
            opaCode: "OPA 006",
            stepId: "createDocWithAttach",
            label: "새 문서 작성 (첨부파일 포함)",
            httpStatus: 400,
            errorCode: "4000003",
            errorMessage: "Invalid template_id",
            responseBody: "{ ... 전문 ... }"
        }
    ],
    totalSummary: {
        totalOpa: 2,
        passedOpa: 1,
        failedOpa: 1,
        totalSteps: 10,
        passedSteps: 8,
        failedSteps: 1,
        skippedSteps: 1
    }
};
```

### Step↔OPA 매핑

`plan()`은 step 중복을 제거하므로, 각 step이 어느 OPA에 속하는지 추적이 필요하다.

```javascript
// runSet() 시 codes를 순회하며 매핑 구축
const stepOpaMap = {};  // { stepId: opaCode }
codes.forEach((code) => {
    const s = scenarios.find((item) => item.code === code);
    if (!s) return;
    s.steps.forEach((stepId) => {
        if (!stepOpaMap[stepId]) stepOpaMap[stepId] = code;
        // 이미 다른 OPA에서 등록된 step이면 첫 OPA 유지
    });
});
```

### OPA 판정 로직

```
해당 OPA의 모든 step이 PASS → OPA PASS
하나라도 FAIL → OPA FAIL
모두 SKIP → OPA SKIP
```

### 리포트 모달 UI

실행 완료 후 **"리포트 보기"** 버튼이 상단 `run-actions` 영역에 나타남. 실행 전에는 숨김.

```
┌──────────────────────────────────────────────────────────┐
│  📊 테스트 리포트                [Markdown] [HTML] [닫기] │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  실행 정보                                                │
│  일시: 2026-05-27 14:30:00                                │
│  환경: 운영 (SaaS) — https://kr-api.eformsign.com         │
│  프로필: Default | 인증: Signature                        │
│                                                          │
│  ── 전체 요약 ──────────────────────────────────────────  │
│  OPA: 2개 중 1개 성공 (50%)                               │
│  Step: 10개 중 8개 성공, 1개 실패, 1개 스킵               │
│  ████████░░ 80%                                          │
│                                                          │
│  ── OPA별 결과 ─────────────────────────────────────────  │
│  ✅ OPA 003 문서 정보 조회              6/6 PASS          │
│     1. listFormsForSeed     GET  200  234ms   ✅         │
│     2. tryCreateAuto        POST 200  512ms   ✅         │
│     3. docInfoBasic         GET  200  189ms   ✅         │
│     4. docInfoDetail        GET  200  201ms   ✅         │
│     5. cancelDocs           POST 200  156ms   ✅         │
│     6. deleteDocs           DELETE 200 134ms  ✅         │
│                                                          │
│  ❌ OPA 006 문서 첨부 파일 다운로드      2/4 FAIL         │
│     1. createDocWithAttach  POST 400  156ms   ❌         │
│     2. downloadAttachAuto   -    -    SKIP    ⚠️         │
│     3. cancelDocs           -    -    SKIP    ⚠️         │
│     4. deleteDocs           -    -    SKIP    ⚠️         │
│                                                          │
│  ── 실패 상세 ──────────────────────────────────────────  │
│  ❌ OPA 006 > createDocWithAttach                        │
│     POST /v2.0/api/documents?template_id=...              │
│     HTTP 400 | 156ms                                     │
│     에러: [4000003] Invalid template_id                   │
│     ┌─ Response ─────────────────────────────────────┐   │
│     │ {                                              │   │
│     │   "code": "4000003",                           │   │
│     │   "ErrorMessage": "Invalid template_id"        │   │
│     │ }                                              │   │
│     └────────────────────────────────────────────────┘   │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 파일 다운로드

모달 헤더의 **[Markdown]** / **[HTML]** 버튼 클릭 시 파일 다운로드.

**파일명 규칙:** `OPA_Report_{profile}_{YYYYMMDD_HHmmss}.{md|html}`

**Markdown 출력 예시:**

```markdown
# eformsign Open API 테스트 리포트

## 실행 정보

| 항목 | 값 |
|---|---|
| 일시 | 2026-05-27 14:30:00 |
| 환경 | 운영 (SaaS) — https://kr-api.eformsign.com |
| 프로필 | Default |
| 인증 방식 | Signature |

## 전체 요약

- **OPA**: 2개 중 1개 성공 (50%)
- **Step**: 10개 중 8개 성공, 1개 실패, 1개 스킵

## OPA별 결과

### ✅ OPA 003 — 문서 정보 조회 (PASS 6/6)

| # | Step | Method | Status | Duration | Result |
|---|---|---|---|---|---|
| 1 | 작성 가능한 템플릿 목록 조회 | GET | 200 | 234ms | ✅ PASS |
| 2 | 새 문서 작성 (자동 선택) | POST | 200 | 512ms | ✅ PASS |
| ... |

### ❌ OPA 006 — 문서 첨부 파일 다운로드 (FAIL 2/4)

| # | Step | Method | Status | Duration | Result |
|---|---|---|---|---|---|
| 1 | 새 문서 작성 (첨부파일 포함) | POST | 400 | 156ms | ❌ FAIL |
| 2 | 문서 첨부 파일 다운로드 (자동) | - | - | SKIP | ⚠️ SKIP |
| ... |

## 실패 상세

### ❌ OPA 006 > 새 문서 작성 (첨부파일 포함)

- **URL**: POST /v2.0/api/documents?template_id=...
- **HTTP Status**: 400
- **Duration**: 156ms
- **에러 코드**: 4000003
- **에러 메시지**: Invalid template_id

**Response:**
\```json
{
  "code": "4000003",
  "ErrorMessage": "Invalid template_id"
}
\```
```

**HTML 출력:**
- 모달과 동일한 스타일을 `<style>` 태그로 인라인 포함한 자체 완결형 HTML
- 브라우저에서 열어 바로 확인 가능 + 인쇄(Ctrl+P → PDF) 가능

### 변경 파일

| 파일 | 변경 내용 |
|---|---|
| `OpenAPIAutoTest.html` | 리포트 모달 뼈대 (guide 모달과 동일 패턴) + 리포트 보기 버튼 (run-actions 내, 초기 숨김) |
| `OpenAPIAutoTest.js` | `reportData` 수집 로직 (`runSet` 내부) |
| | `stepOpaMap` 매핑 구축 |
| | `generateReportHtml()` — reportData → 모달 내 HTML 렌더링 |
| | `generateReportMarkdown()` — reportData → Markdown 텍스트 생성 |
| | `generateReportHtmlFile()` — reportData → 자체 완결형 HTML 파일 생성 |
| | `downloadReport(format)` — Blob 생성 → 파일 다운로드 트리거 |
| | `openReportModal()` / `closeReportModal()` |
| | 실행 완료 후 "리포트 보기" 버튼 표시 + reportData 보존 |

### 리포트 버튼 위치

```html
<div class="run-actions">
    <button class="btn-secondary" id="openSettingsModalBtn">입력값 설정</button>
    <button class="btn-secondary" id="runActiveBtn">현재 OPA만 실행</button>
    <button class="btn-primary" id="runSelectedBtn">선택한 OPA 실행</button>
    <!-- 실행 완료 후 표시 -->
    <button class="btn-secondary" id="openReportBtn" style="display:none">
        <i class="fa-solid fa-chart-bar fa-sm"></i> 리포트 보기
    </button>
</div>
```

### 비(非)자명한 설계 결정

- **step 중복 시 OPA 매핑**: `plan()`이 step을 중복 제거하므로 하나의 step이 여러 OPA에 속할 수 있다. 이 경우 **첫 OPA에 귀속**시키고, 리포트에서 "(OPA 003, OPA 005 공유)" 표기로 보조 설명한다.
- **SKIP 판정**: step이 FAIL이면 같은 OPA의 후속 step은 실행되지 않는다 (현재 `runSet`은 순차 실행). 이 경우 미실행 step을 SKIP으로 리포트에 포함하려면 별도 처리가 필요하다.
  - 현재 `runSet()`은 step FAIL 시 그냥 다음 step으로 넘어가므로, OPA 내부에서 선행 step 실패 시 후속 step이 에러를 throw하여 FAIL로 기록된다.
  - 리포트에서는 이를 "선행 실패로 인한 연쇄 실패"로 구분 표기하는 것이 이상적이나, v1에서는 단순 FAIL/PASS 표기로 충분하다.
- **리포트 데이터 생명주기**: 새 실행이 시작되면 이전 `reportData`는 덮어써진다. 모달이 열려 있는 상태에서 재실행하면 모달을 자동으로 닫는다.
- **에러 파싱**: Response Body에서 `code`, `ErrorMessage`, `error_code`, `message` 등 다양한 키를 탐색하여 에러 정보를 추출한다 (eformsign API의 에러 응답 형식이 일관되지 않을 수 있음).

---

## Hotfix 4: runSet OPA 단위 실행 전환 (Seed 캐싱 + OPA 격리)

**목표:** `plan()`의 전역 step 중복 제거가 OPA 간 문서 생명주기를 파괴하는 버그를 수정한다.

### 문제 상황

현재 `plan()`은 선택된 모든 OPA의 steps를 **하나의 flat 리스트**로 합치고 중복을 제거한다. 이로 인해:

1. `cancelDocs`/`deleteDocs`가 1회만 실행되어 선행 OPA에서 문서가 정리되면, 후행 OPA는 이미 삭제된 문서를 대상으로 테스트
2. `tryCreateAuto`가 1회만 실행되므로 모든 OPA가 동일 문서 1개를 공유
3. 선행 OPA 정리 후 `state.shared.lastCreatedId`가 삭제된 문서를 가리킴

**재현:** OPA 003 + OPA 014 동시 선택 → OPA 014의 `rerequestDoc`이 OPA 003에서 이미 삭제된 문서를 대상으로 실행 → FAIL

### 해결 방안: Seed 캐싱 + OPA 단위 순차 실행

읽기 전용 탐색 step의 결과만 OPA 간 캐싱하고, 나머지는 OPA마다 `freshShared()` 후 독립 실행.

### 캐시 대상 step (읽기 전용, 부수효과 없음)

```javascript
const SEED_STEPS = new Set([
    "listFormsForSeed",              // → candidateTemplateIds
    "listDocsBasic",                 // → completedDocIds
    "listCompletedDocsForDownload"   // → candidateDocIds
]);
```

이 step들은 GET/POST로 목록만 조회하여 `state.shared`에 후보 ID 배열을 저장할 뿐, 서버 상태를 변경하지 않는다. 결과가 캐시에 있으면 실행을 SKIP하고 캐시값을 `state.shared`에 복원한다.

### 캐시 키 매핑

| Step | 캐시에 저장할 shared 키 |
|---|---|
| `listFormsForSeed` | `candidateTemplateIds` |
| `listDocsBasic` | `completedDocIds` |
| `listCompletedDocsForDownload` | `candidateDocIds` |

### runSet() 변경 — 의사코드

```javascript
async function runSet(codes) {
    // ... 기존 초기화 (state.running, token 등) ...

    const seedCache = {};          // { stepId: { key: value } }
    const allOpaResults = [];      // 리포트용 OPA별 결과
    let globalStepIndex = 0;       // 결과 테이블 행 번호 (전체 기준)

    // 토큰 발급 (1회)
    await token();

    for (const code of codes) {
        const scenario = scenarios.find(s => s.code === code);
        if (!scenario) continue;

        state.shared = freshShared();

        // 캐시된 seed 복원
        for (const [stepId, cached] of Object.entries(seedCache)) {
            Object.assign(state.shared, cached);
        }

        const opaStepResults = [];
        let opaFailed = false;

        for (const stepId of scenario.steps) {
            globalStepIndex += 1;

            // seed step + 캐시 있으면 SKIP
            if (SEED_STEPS.has(stepId) && seedCache[stepId]) {
                // 리포트에 SKIP(캐시) 기록
                appendRow(globalStepIndex, { statusType: "SKIP", ... });
                continue;
            }

            // 선행 실패 시 후속 step SKIP
            if (opaFailed) {
                appendRow(globalStepIndex, { statusType: "SKIP", ... });
                continue;
            }

            const result = await runStep(stepId);

            // seed step 성공 시 캐시 저장
            if (SEED_STEPS.has(stepId) && result.statusType === "PASS") {
                seedCache[stepId] = extractSeedData(stepId);
            }

            if (result.statusType === "FAIL") opaFailed = true;

            appendRow(globalStepIndex, result);
            opaStepResults.push({ stepId, result });
        }

        allOpaResults.push({ code, scenario, steps: opaStepResults });
    }

    // 리포트 생성 (allOpaResults 기반)
    // ...
}
```

### extractSeedData() 함수 (신규)

```javascript
function extractSeedData(stepId) {
    if (stepId === "listFormsForSeed")
        return { candidateTemplateIds: [...state.shared.candidateTemplateIds] };
    if (stepId === "listDocsBasic")
        return { completedDocIds: [...state.shared.completedDocIds] };
    if (stepId === "listCompletedDocsForDownload")
        return { candidateDocIds: [...state.shared.candidateDocIds] };
    return {};
}
```

### 선행 실패 시 후속 step SKIP 처리

현재 구현은 step FAIL 후에도 다음 step으로 넘어가서 `must()` 등에서 throw되어 연쇄 FAIL이 발생한다. OPA 단위 실행에서는 **선행 FAIL 시 같은 OPA의 후속 step을 SKIP**으로 명시 처리한다.

```javascript
if (opaFailed) {
    const skipResult = {
        statusType: "SKIP",
        responseStatus: "-",
        method: stepMeta(stepId).method,
        label: stepMeta(stepId).label,
        url: "",
        duration: "-",
        requestBody: null,
        responseText: "선행 step 실패로 스킵됨"
    };
    appendRow(globalStepIndex, skipResult);
    // 리포트에도 SKIP으로 기록
    continue;
}
```

### plan() 함수 처리

`plan()` 함수는 **제거하지 않고** OPA 단위 실행에서 사용하지 않도록 한다. 기존에 `plan()`을 참조하는 코드가 있다면 그 부분만 수정. `plan()` 자체는 남겨두어도 무방하다 (향후 다른 용도 가능).

### 리포트 수집 단순화

OPA 단위 실행으로 전환하면 step↔OPA 매핑이 자명해진다.

| 항목 | 변경 전 | 변경 후 |
|---|---|---|
| `buildStepOpaMaps()` | 필요 (step 공유 매핑) | **제거 가능** — OPA 루프 안에서 code를 직접 전달 |
| `stepOpaMap` / `stepOpaListMap` | 복잡한 첫-OPA-귀속 로직 | 불필요 |
| `addReportStep()` 호출 | stepOpaMaps 파라미터 필요 | opaCode 직접 전달 |
| `finalizeReportData()` | stepResultMap 기반 OPA 판정 | `allOpaResults` 기반 직접 판정 |
| SKIP 표기 | "선행 실패 연쇄 FAIL" vs "진짜 SKIP" 구분 불가 | SKIP이 명확 (opaFailed 플래그) |

### seed 캐시 SKIP 시 리포트 표기

seed step이 캐시로 SKIP된 경우 리포트에서 별도 구분한다:

```
⚡ listFormsForSeed  GET  -  SKIP (캐시)  ← 이전 OPA 결과 재사용
```

리포트의 step `status`는 `"CACHE"`로 기록하고, OPA 판정에서는 PASS와 동일하게 취급한다.

### 프로그레스 바 계산

```javascript
// 변경 전: plan(codes).length
// 변경 후: Σ(각 OPA의 steps.length)
const totalSteps = codes.reduce((sum, code) => {
    const s = scenarios.find(item => item.code === code);
    return sum + (s ? s.steps.length : 0);
}, 0);
```

### 결과 테이블 OPA 구분 행 (선택)

OPA 경계에 구분 행을 삽입하여 가독성을 높인다:

```javascript
// OPA 루프 시작 시
const dividerRow = document.createElement("tr");
dividerRow.className = "opa-divider";
dividerRow.innerHTML = `<td colspan="7" style="background:var(--bg-secondary);font-weight:600;padding:6px 12px;">${code} — ${scenario.name}</td>`;
els.resultTableBody.appendChild(dividerRow);
```

### 변경 파일 요약

| 파일 | 변경 내용 |
|---|---|
| `OpenAPIAutoTest.js` | `SEED_STEPS` 상수 추가 |
| | `extractSeedData()` 함수 추가 |
| | `runSet()` 이중 루프 전환 (외부=OPA, 내부=step) + seedCache + opaFailed SKIP |
| | `buildStepOpaMaps()` 제거 또는 미사용 처리 |
| | `addReportStep()` 시그니처 변경 — opaCode 직접 전달 |
| | `finalizeReportData()` 단순화 — allOpaResults 기반 |
| | `createReportData()` 변경 없음 (구조 동일) |
| | 프로그레스 바 totalSteps 계산 변경 |
| | 결과 테이블 OPA 구분 행 삽입 (선택) |
| `OpenAPIAutoTest.html` | 변경 없음 (OPA 구분 행 CSS 추가 시에만 수정) |

### 비(非)자명한 주의사항

- **토큰 발급은 전체 1회 유지**: OPA 루프 진입 전에 `await token()` 1회. OPA마다 재발급하지 않음
- **`state.companyId`는 OPA 간 유지**: `freshShared()`는 `state.shared`만 초기화. `state.companyId`, `state.token`은 유지
- **seed 캐시 복원 순서**: `freshShared()` → 캐시 복원 → step 실행. 순서가 바뀌면 캐시가 초기화됨
- **OPA 006은 `listFormsForSeed` 없음**: `createDocWithAttach`가 `data.attachTemplateId`를 직접 사용하므로 seed 캐시와 무관. 정상 동작
- **seed step FAIL 시 캐시 미저장**: 캐시는 PASS 시에만 저장. 후속 OPA에서 같은 seed step을 다시 실행하게 됨
- **`cancelDocs`/`deleteDocs`는 OPA마다 실행**: 해당 OPA에서 생성한 문서만 `state.shared.createdIdList`에 있으므로 정확히 해당 OPA의 문서만 정리
