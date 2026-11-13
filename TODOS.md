# TODOS

(남은 항목 없음)

## 완료

### ~~알림 fallback 폴링 주기 개선 (DB compute 절감 후속)~~ — 완료 (P1-24, 2026-11)

- `auth-status.js` / `notification-bell.js`의 대체 조회를 300초 → **600초**로 늘리고, 탭이 숨겨지면(`document.hidden`) 타이머를 멈춘다.
  다시 보이면 재개하며, 마지막 조회 후 600초가 지났을 때만 바로 1회 조회한다(탭 전환마다 DB를 깨우지 않음).
  Pusher가 다시 연결되면 기존처럼 대체 조회를 멈춘다.
- `notification-bell.js`는 `/api/notifications`가 401이면 대체 조회를 멈춘다(로그아웃·세션 만료 상태에서 계속 두드리지 않음).
  `auth-status.js`는 기존 401 흐름(`handleAuthExpired`)이 대체 조회를 멈춘다.
- 배경: Neon 기본 auto-suspend 윈도가 5분(300초)인데 대체 조회도 정확히 300초라, Pusher 연결이 실패한 탭이 하나라도 열려 있으면
  compute가 suspend되지 못했다. Pusher 장애 시 배지 갱신은 최대 10분 늦어질 수 있다 — 정상 시 Pusher 실시간이라 무관.
- 세부 동작: `rules/notifications.md` "Fallback 폴링".
