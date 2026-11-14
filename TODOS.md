# TODOS

### `npm run check:api` 카드·행 인식 사각지대 (C8 재검증 E-1·E-2, 낮음 — P2-03 때 함께)

- **E-1**: 카드 래퍼가 `<div>`가 아니고(`<section class="card">`, 대문자 `<DIV>`) 제목도 `<h3>OPA2_`가 아니면(`<h3><span>OPA2_…`, `<h4>`)
  그 카드를 보지 못한다(`scripts/check-api-data.js`의 `CARD_OPEN_RE`·`<h3>OPA2_` 개수 비교).
- **E-2**: 카드 안 두 번째 `<tbody>`·`<table>`, 대문자 `<TR>`의 행은 검사 8·9(코드·메시지, `.cnt`)에 잡히지 않는다(처음부터 있던 한계).
- 현재 카드(공개 35장·내부 58장, 2026-11-14 두 페이지로 분리 — 같은 검사 함수를 두 페이지에 적용하므로 사각지대도 같다)는 모두 같은 마크업이라 일부러 다르게 쓰지 않는 한 생기지 않는다. P2-03(에러 코드 단일 데이터원)에서
  페이지 구조를 바꿀 때 HTML 파서 기반으로 정리하거나, 그 전에 마크업을 바꾸면 여기부터 고친다.

### 에러 코드 링크 설정·Prod 블록 검사 사각지대 (에러 코드 분리 재검증 G-1~G-3, 낮음 — P2-03 때 함께)

- **G-1**: `window.API_ERROR_CODES_PAGE` 설정을 Prod·Full이 함께 쓰는 JS(예: `assets/js/openapi/state.js`)에 넣으면 검사 13이 잡지 못한다
  (공개 도구 경로의 문자열 금지는 `API(JS,HTML)/`·`utils/`·`Embedding/`·`community/`·`index.html`만 본다) → 공개 테스터의 링크가 내부 페이지로 간다.
  보강안: `assets/js/` 전체(설정 허용 파일 없음)도 금지 대상에 넣는다.
- **G-2**: Prod 숨김 블록이 남는 API의 내용(경로·메서드 등)을 바꿔도 검사 10은 통과한다(남는 id 집합만 비교).
  보강안: Full 블록처럼 실행 뒤 남은 항목을 원본의 같은 항목과 JSON 직렬화로 비교한다.
- **G-3**: 동작이 같은 코드도 실패하는 경우가 있다 — 비교 좌우 바꿈(`'멤버' === group`), `indexOf` 형태, 들여쓴 `<script>`(`PAGE_BLOCK_RE`). 안전한 쪽으로 틀리는 오탐이다.
- 참고(정보): 문자열을 쪼개 쓰는 등 일부러 숨기는 우회는 정적 검사로 잡지 않는다. `ApiError.lookupUrl(code, {absolute:true})`는 `location`이 없는 환경에서 예외(기존 동작).
- 지금 코드에는 해당 패턴이 없어 영향이 없다. 검사를 보강할 때마다 비슷한 사각지대가 나와, 에러 코드 데이터를 한 곳으로 모으는 P2-03에서 E-1·E-2와 함께 구조적으로 정리한다.

## 완료

### ~~알림 fallback 폴링 주기 개선 (DB compute 절감 후속)~~ — 완료 (P1-24, 2026-11)

- `auth-status.js` / `notification-bell.js`의 대체 조회를 300초 → **600초**로 늘리고, 탭이 숨겨지면(`document.hidden`) 타이머를 멈춘다.
  다시 보이면 재개하며, 마지막 조회 후 600초가 지났을 때만 바로 1회 조회한다(탭 전환마다 DB를 깨우지 않음).
  Pusher가 다시 연결되면 기존처럼 대체 조회를 멈춘다.
- `notification-bell.js`는 `/api/notifications`가 401이면 대체 조회를 멈춘다(로그아웃·세션 만료 상태에서 계속 두드리지 않음).
  `auth-status.js`는 기존 401 흐름(`handleAuthExpired`)이 대체 조회를 멈추고, 만료 처리 뒤에는 Pusher 연결 실패로도 다시 켜지 않는다(복구 시 다시 판단).
- 배경: Neon 기본 auto-suspend 윈도가 5분(300초)인데 대체 조회도 정확히 300초라, Pusher 연결이 실패한 탭이 하나라도 열려 있으면
  compute가 suspend되지 못했다. Pusher 장애 시 배지 갱신은 최대 10분 늦어질 수 있다 — 정상 시 Pusher 실시간이라 무관.
- 세부 동작: `rules/notifications.md` "Fallback 폴링".
