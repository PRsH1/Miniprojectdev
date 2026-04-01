# eformsign Embedding SDK — 문의 답변 (2~5번)

---

## 2. `sendAction` 사용 전 선결조건 — 어떤 상황에서 어떤 code를 사용하는가

`sendAction`을 호출하기 위해서는 아래 두 가지가 반드시 먼저 충족되어야 합니다.

**선결조건 1: `eformsign.document()` + `eformsign.open()` 호출 완료**

```javascript
eformsign.document(
  docOpt,
  "eformsign_iframe",
  success_callback,
  error_callback,
  actions_callback   // ← 이 콜백이 호출된 이후에만 sendAction 사용 가능
);
eformsign.open();
```

**선결조건 2: `actions_callback`이 호출되어 유효한 `code` 목록을 수신한 상태**

`actions_callback`은 iframe 내 문서가 완전히 로드된 후 자동 호출됩니다. 이 콜백에서 받은 `code`가 `sendAction`에 사용할 수 있는 유일한 유효 값입니다.

```javascript
let availableActions = [];

function actions_callback(actions) {
  const arr = Array.isArray(actions.data) ? actions.data : [actions.data];
  availableActions = arr; // { code, name } 목록 보관

  // 어떤 액션이 현재 사용 가능한지 확인
  arr.forEach(a => console.log("사용 가능한 액션:", a.code, a.name));
}
```

**어떤 상황에서 어떤 code를 사용하는가**

사용 가능한 액션 목록은 **문서의 현재 상태와 워크플로우 설정**에 따라 달라집니다. 고정된 코드값이 존재하는 것이 아니라, `actions_callback` 응답에서 그 시점에 가능한 액션만 내려옵니다.

| 상황 | `actions_callback`에서 내려오는 액션 예시 |
|---|---|
| 문서 작성 중 (mode `"01"`) | 저장, 제출 등 |
| 문서 처리 중 (mode `"02"`) | 승인, 반려, 저장 등 |

따라서 `sendAction` 호출 전 `actions_callback`에서 수신한 목록을 반드시 먼저 확인하고, 그 중 원하는 액션의 `code`를 사용해야 합니다.

```javascript
// actions_callback 수신 후, 원하는 액션 코드로 sendAction 호출
function doAction(targetName) {
  const action = availableActions.find(a => a.name === targetName);
  if (!action) { console.warn("해당 액션 없음"); return; }

  eformsign.sendAction(
    { type: "01", code: action.code }, // ← actions_callback에서 받은 code
    (resp) => console.log("완료:", resp),
    (err)  => console.error("실패:", err)
  );
}

---

## 3. `actions_callback`이 동작하지 않는 원인

`actions_callback`은 `eformsign.document()`의 **5번째 인자**입니다. 위치가 틀리면 절대 호출되지 않습니다.

```javascript
eformsign.document(
  docOpt,             // 1번째
  "eformsign_iframe", // 2번째
  success_callback,   // 3번째
  error_callback,     // 4번째
  actions_callback    // 5번째 ← 반드시 이 위치
);
eformsign.open();
```

`actions_callback`은 **iframe 내 문서가 완전히 로드된 후**에 호출됩니다. `eformsign.open()` 직후 즉시 실행되지 않으므로, 이 콜백이 호출되기 전에는 `sendAction`을 사용할 수 없습니다.

---

## 4. `sendAction` 응답이 -1로 돌아오는 원인

| 원인 | 설명 |
|---|---|
| 잘못된 `code` 값 사용 | `actions_callback`에서 받은 `a.code`가 아닌 임의 값을 넣은 경우 |
| 타이밍 문제 | `actions_callback` 호출 이전에 `sendAction` 실행 |
| 문서 상태 불일치 | 현재 문서 상태에서 해당 액션이 유효하지 않음 |

`code` 값은 반드시 `actions_callback` 응답에서 받은 값을 그대로 사용해야 합니다.

```javascript
// ❌ 잘못된 사용 — 임의 숫자 사용
eformsign.sendAction({ type: "01", code: "01" }, ...);

// ✅ 올바른 사용 — actions_callback에서 받은 code 사용
function actions_callback(actions) {
  const arr = Array.isArray(actions.data) ? actions.data : [actions.data];
  arr.forEach(a => {
    // a.code 를 그대로 저장해 두었다가 sendAction에 전달
  });
}
```

---

## 5. `sendAction` request → response 연결고리

```
① eformsign.document(docOpt, iframeId, success_cb, error_cb, actions_cb)
   eformsign.open()
        ↓ (iframe 내 문서 로드 완료)

② actions_cb 호출
   → { data: [{ code: "02", name: "저장" }, { code: "01", name: "제출" }] }
        ↓ (수신한 code를 저장해 두고, 사용자가 저장 요청 시)

③ eformsign.sendAction({ type: "01", code: "02" }, onSuccess, onError)
        ↓ (저장 처리 완료)

④ success_cb 호출
   → { document_id: "...", title: "..." }  ← 이 document_id로 후속 처리
```

정리하면:
- **request**: `actions_callback`에서 받은 `code`를 `sendAction`에 그대로 전달
- **response**: 처리 완료 시 `success_callback`이 호출되며 `document_id`와 `title` 반환
- `sendAction`의 자체 success 콜백과 `eformsign.document()`의 `success_callback` **둘 다** 호출될 수 있으므로 중복 처리에 주의
