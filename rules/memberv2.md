## MemberV2 — UI 패턴 및 수정 가이드

`private/MemberV2.html` + `assets/js/member/` (api.js / ui.js / init.js)

**디자인 레퍼런스:** `design-preview-member.html` — 프로덕션 미사용, 디자인 시스템 확인용 전용 파일

---

### 카드 구조 (card-header / card-body)

모든 카드는 header/body로 분리된 구조를 사용한다.

```html
<div class="card">
  <div class="card-header">
    <span class="card-title">제목</span>
    <span class="card-badge">뱃지 (선택)</span>  <!-- 필수 정보, 대량 처리 등 -->
  </div>
  <div class="card-body">
    <!-- 폼, 결과 패널 등 -->
  </div>
</div>
```

- `card-title`은 `.card-header` 안에만 위치. 과거처럼 `.card` 바로 아래 flat하게 두지 말 것.
- 응답 결과 카드는 card-header 우측에 상태 배지 + 복사 버튼 포함 (아래 참고).

---

### 결과 배지 — setResultBadge

`assets/js/member/api.js`에 `setResultBadge(badgeId, isOk)` 헬퍼가 있다.
API 호출 성공/실패 후 반드시 호출해 결과 카드 헤더에 배지를 표시한다.

```javascript
// 성공 시
setResultBadge('addResultBadge', true);   // → "200 OK" (초록)
// 실패 시
setResultBadge('addResultBadge', false);  // → "Error" (빨강)
```

**배지 ID 네이밍 규칙:** `{섹션명}ResultBadge`

| 섹션 | badgeId |
|---|---|
| 토큰 발급 | `tokenResultBadge` |
| 멤버 추가 | `addResultBadge` |
| 멤버 삭제 | `deleteResultBadge` |
| 멤버 수정 | `updateResultBadge` |
| 그룹 추가 | `groupAddResultBadge` |
| 그룹 수정 | `groupUpdateResultBadge` |
| 그룹 삭제 | `groupDeleteResultBadge` |

새 API 섹션 추가 시: HTML에 배지 요소 추가 + api.js 콜백에 `setResultBadge` 추가.

```html
<!-- 결과 카드 헤더 예시 -->
<div class="card-header">
  <span class="card-title">응답 결과</span>
  <div style="display:flex;gap:8px;align-items:center;">
    <span id="addResultBadge" class="result-status-badge" style="display:none;"></span>
    <button class="btn-ghost" onclick="...복사 로직...">복사</button>
  </div>
</div>
```

---

### 접기 패널 — collapse-trigger

선택적 입력 필드(추가 옵션, 엑셀 업로드 등) 토글에 사용한다.

```html
<button class="collapse-trigger" type="button">
  <span>📋 추가 옵션</span>
  <span style="font-size:12px;color:var(--text-muted);margin-left:6px;">연락처 · 부서 · 권한</span>
  <span class="chevron">▾</span>
</button>
```

- JS 토글 시 버튼에 `.open` 클래스를 함께 부여하면 chevron이 180° 회전한다.
- 토글 대상 영역은 기존 방식(display:none/block) 유지.

---

### 엑셀 업로드 영역 — upload-area

파일 input을 `.upload-area` label로 감싸 드래그앤드롭 스타일로 표시한다.

```html
<label class="upload-area" for="excelFileInput">
  📂 &nbsp;.xlsx 또는 .xls 파일을 드래그하거나 클릭하여 선택
</label>
<input type="file" id="excelFileInput" accept=".xlsx,.xls" style="display:none;">
```

---

### 엑셀 단계 안내 — step-row / step-badge

엑셀 처리 흐름 상단에 단계를 시각화한다.

```html
<div class="step-row">
  <div class="step-badge done">✓</div>  <!-- done 클래스: 초록 -->
  <span class="step-label">템플릿 다운로드</span>
  <button class="btn-secondary" style="margin-left:auto;">다운로드</button>
</div>
<div class="step-row">
  <div class="step-badge">2</div>
  <span class="step-label">파일 업로드 및 검증</span>
</div>
```

---

### 비(非)자명한 동작 — 수정 시 주의

- **`.form-input.mono`**: 읽기 전용 토큰/ID 표시 인풋에 사용. 배경 `#f8fbff`, 글자색 `#2a4a6a`.
- **`--teal-ring` / `--teal-subtle`**: focus ring과 토큰 도트 ring에만 사용 — 버튼 색은 primary(blue) 유지.
- **`max-width: 980px`** on `.main-panel`: 넓은 화면에서 콘텐츠 과도한 확장 방지. 제거하지 말 것.
- **사이드바 `border-right`**: `rgba(255,255,255,.06)` — 미묘한 구분선, 제거 시 사이드바/본문 경계 흐려짐.
- **`btn-ghost`**: 복사 같은 보조 액션 전용. 폼 제출 버튼에는 사용하지 않는다.
  복사 버튼은 `copyResultText('<결과 요소 id>')`(ui.js)를 쓴다 — 성공·실패를 토스트(`showToast`)로 알려 준다.

- **상단 바 오프셋 `--auth-bar-h: 40px`**: auth-status.js 상단 바(fixed, 40px, z-index 99999)에 가리지 않도록
  사이드바(`sticky top`·높이), 좁은 화면 드로어(`top`·높이), 햄버거 버튼(`top: calc(40px + 14px)`)이 이 변수를 쓴다(P1-19).
  드로어가 열리면 `.sidebar-logo`에 왼쪽 여백을 줘 버튼이 제목을 가리지 않게 하고, 메뉴를 고르면 드로어를 닫는다(init.js).
  768px 이하에서 카드 헤더·엑셀 단계 행은 줄바꿈된다 — 375px에서 가로 스크롤 없음.
- **세션 만료 미저장 훅 (P1-21)**: init.js가 `window.AUTH_STATUS_HAS_UNSAVED`를 등록한다. 본문(`.main-panel`)의
  읽기 전용이 아닌 텍스트·비밀번호 입력에 기본값과 다른 값이 있거나, 엑셀 파일이 선택되어 있거나, 엑셀 일괄 처리가 실행 중이면 `true`.
  auth-status.js(C5)가 이 값으로 자동 새로고침 대신 배너를 띄운다.

### 의도치 않은 변경 방지 (P1-15)

- **eformsign 멤버·그룹 수정 API는 전체 덮어쓰기다** (SaaS 소스 확인, 2026-11-03 — `docs/reference/eformsign-saas-source-survey.md` 3.6절 e).
  PATCH지만 빠진 필드를 "유지"하지 않는다. P1-15에서 "빈 값은 보내지 않는다"로 바꿨다가 아래 동작 때문에 되돌렸다(핫픽스).
  - 멤버 수정(OPA2_012): `account.name`·`account.contact` 필수(없으면 400). **`enabled`를 빼면 false → 멤버 비활성화**(대표 관리자는 400),
    `role`을 빼면 회사·템플릿 관리자 권한 해제, `department`·`position`을 빼면 빈 값으로 저장.
  - 그룹 수정(OPA2_019): `name`·`description` 키 필수(없으면 400). **`members`를 빼면 빈 배열 → 기존 멤버 전원 제거**.
- **멤버 수정 `enabled`는 직접 선택 필수**: `#updateEnabled`의 첫 옵션은 `선택하세요 (필수)`(disabled)이고, true/false를 고르지 않으면 요청하지 않는다.
  보내기 전에 비어 있는 부서·직책·권한을 나열해 "기존 값이 지워진다"는 확인을 받는다. 엑셀 일괄 수정도 `enabled` 칸이 빈 행은 오류 행으로 거른다
  (`hasValue()` — 엑셀 `FALSE` 포함).
- **그룹 수정은 이름·설명·멤버를 항상 보낸다**: `buildGroupPatch()`는 `{ group }` 또는 `{ error }`를 돌려준다. 이름·설명이 비면 오류,
  멤버 칸이 비면 오류(목록에 없는 기존 멤버가 빠지므로 남길 멤버를 모두 입력). 멤버를 의도적으로 비우려면 `#updGroupClearMembers`("멤버 비우기") → `members: []` + 확인창.
  엑셀 그룹 수정은 "멤버 비우기"가 없어 `name`·`description`·`members`가 모두 있어야 유효 행이다.
- **엑셀 일괄 삭제는 확인을 받는다**: 멤버·그룹 엑셀 삭제 실행 시 "멤버 N명"/"그룹 N개(엑셀 M행)" 확인창. 취소하면 요청 0건.
- **목록 조회는 상태 코드를 먼저 확인한다**: 멤버·그룹 목록이 4xx/5xx·네트워크 실패면 표를 비우고
  `#memberCountLabel`/`#groupCountLabel` 위에 api-error 요약(`HTTP 401 · …`)을 띄운다("검색 결과 없음"으로 보이지 않게).
- **엑셀 읽기는 `readExcelRows()` 한 곳**: 파일 시그니처(xlsx=ZIP `PK\x03\x04`, xls=OLE `D0 CF 11 E0`)를 확인하고
  파싱 실패는 "엑셀 파일을 읽을 수 없습니다…"로 안내한다. 6개 검증 함수는 `runExcelValidation()`을 거쳐 실패해도 스피너가 항상 해제된다.
  검증 통과 행은 `{ rowNumber(엑셀 행 번호), row(원본) }`로 보관한다.
- **비밀 키 입력은 `type=password`** + [표시] 토글(`toggleSecretVisibility`).

### 엑셀 일괄 처리 큐 (P1-16)

엑셀 일괄 추가·삭제·수정(멤버 3종·그룹 3종)은 `Promise.all` 동시 전송 대신 공용 큐를 쓴다(`member/api.js`).

- **`runQueue(items, worker, { concurrency, onProgress, signal })`**: 동시 요청 `BULK_CONCURRENCY`(=3)개.
  `signal`이 abort되면 **새 행을 시작하지 않고** 진행 중인 요청은 끝까지 기다린다(이미 보낸 POST·DELETE는 서버에서 처리되므로 결과를 받아 기록).
- **작업 정의 `BULK_JOBS`**: `memberAdd`·`memberDelete`·`memberUpdate`·`groupAdd`·`groupDelete`·`groupUpdate`.
  각 항목은 `entries()`(검증 통과 행) · `prepare(targets)`(토큰·Base URL 확인, 삭제는 건수 확인창 — 취소 시 `null` → 요청 0건) ·
  `request(item, ctx)`(URL·fetch init)로 구성된다. HTML의 기존 `executeExcel…()` 이름은 `startBulkJob(key)` 래퍼로 남겨 두었다.
  새 일괄 작업을 추가할 때는 `BULK_JOBS`에 항목을 추가하고 실행 버튼을 `#…ExecuteSection`의 **직계 자식 `<button>`**으로 둔다(진행 패널이 그 섹션 안에 붙는다).
- **행 상태**: `pending`(대기) → `running` → `success`(성공) / `fail`(실패) / `skipped`(미실행 — 중지·401로 시작하지 않은 행).
  401을 받으면 남은 행도 실패하므로 큐를 자동 중지하고 토큰 배지를 "만료됨"으로 바꾼다.
- **진행 패널** (`renderBulkPanel`, ui.js): 실행 섹션 안에 `n / 총` 진행률 막대(성공 초록·실패 빨강), 성공·실패·미실행 건수,
  실행 중 [중지], 끝난 뒤 [실패 건만 재시도](실패 행만 다시 보냄) · [미실행 건 이어서 실행] · [결과 엑셀 다운로드].
  실패가 있거나 중지되면 경고(노란) 상태로 "완료 (실패 N건)" / "중지됨 (미실행 N건)"을 표시한다.
- **결과 엑셀** `{작업}_결과_YYYYMMDD_HHmmss.xlsx`: 엑셀 행 번호 + 원본 열 + 결과 + HTTP 상태 + 에러 코드·메시지(api-error 파서).
  이름에 `password`·`pwd`·`secret`이 들어간 열은 `***`로 바꾼다(`maskBulkRow`).
- **화면 결과**: 원본 JSON(비밀번호 포함)을 출력하지 않는다. 요약 한 줄 + 실패 목록(행 번호·ID·`HTTP 400 · [코드] 메시지`) + 미실행 행 번호만 표시한다.
- 같은 섹션에서 파일을 다시 검증하면 이전 작업 결과 패널은 지워진다(실행 중이면 유지). 실행 중 페이지를 떠나면 `beforeunload` 경고.
