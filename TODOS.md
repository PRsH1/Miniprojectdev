# TODOS

### `npm run check:api` 카드·행 인식 사각지대 (C8 재검증 E-1·E-2, 낮음 — P2-03 때 함께)

- **E-1**: 카드 래퍼가 `<div>`가 아니고(`<section class="card">`, 대문자 `<DIV>`) 제목도 `<h3>OPA2_`가 아니면(`<h3><span>OPA2_…`, `<h4>`)
  그 카드를 보지 못한다(`scripts/check-api-data.js`의 `CARD_OPEN_RE`·`<h3>OPA2_` 개수 비교).
- **E-2**: 카드 안 두 번째 `<tbody>`·`<table>`, 대문자 `<TR>`의 행은 검사 8·9(코드·메시지, `.cnt`)에 잡히지 않는다(처음부터 있던 한계).
- 현재 카드(공개 35장·내부 58장, 2026-11-14 두 페이지로 분리 — 같은 검사 함수를 두 페이지에 적용하므로 사각지대도 같다)는 모두 같은 마크업이라 일부러 다르게 쓰지 않는 한 생기지 않는다. P2-03(에러 코드 단일 데이터원)에서
  페이지 구조를 바꿀 때 HTML 파서 기반으로 정리하거나, 그 전에 마크업을 바꾸면 여기부터 고친다.

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
