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

### 의도치 않은 변경 방지 (P1-15)

- **멤버 수정 `enabled`는 "변경 안 함"이 기본**: `#updateEnabled`의 첫 옵션은 빈 값(`변경 안 함`)이며,
  사용자가 `true`/`false`를 고른 경우에만 `account.enabled`를 보낸다. 항상 보내면 비활성 멤버의 이름만 바꿔도
  다시 활성화된다. 엑셀 일괄 수정도 `enabled` 셀에 값이 있을 때만(엑셀 `FALSE` 포함 — `hasValue()`로 판정) 보낸다.
- **그룹 수정은 입력한 필드만 보낸다**: `buildGroupPatch()`가 빈 이름·설명·멤버를 본문에서 뺀다(수동·엑셀 공통).
  멤버를 의도적으로 비우려면 `#updGroupClearMembers`("멤버 비우기")를 체크한다 → `members: []` + 확인창.
  그룹 ID가 없거나 수정 항목이 하나도 없으면 요청하지 않는다.
- **엑셀 일괄 삭제는 확인을 받는다**: 멤버·그룹 엑셀 삭제 실행 시 "멤버 N명"/"그룹 N개(엑셀 M행)" 확인창. 취소하면 요청 0건.
- **목록 조회는 상태 코드를 먼저 확인한다**: 멤버·그룹 목록이 4xx/5xx·네트워크 실패면 표를 비우고
  `#memberCountLabel`/`#groupCountLabel` 위에 api-error 요약(`HTTP 401 · …`)을 띄운다("검색 결과 없음"으로 보이지 않게).
- **엑셀 읽기는 `readExcelRows()` 한 곳**: 파일 시그니처(xlsx=ZIP `PK\x03\x04`, xls=OLE `D0 CF 11 E0`)를 확인하고
  파싱 실패는 "엑셀 파일을 읽을 수 없습니다…"로 안내한다. 6개 검증 함수는 `runExcelValidation()`을 거쳐 실패해도 스피너가 항상 해제된다.
  검증 통과 행은 `{ rowNumber(엑셀 행 번호), row(원본) }`로 보관한다.
- **비밀 키 입력은 `type=password`** + [표시] 토글(`toggleSecretVisibility`).
