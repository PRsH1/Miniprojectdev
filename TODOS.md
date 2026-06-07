# TODOS

## 알림 fallback 폴링 주기 개선 (DB compute 절감 후속)

- **What:** `auth-status.js` / `notification-bell.js`의 알림 fallback 폴링 주기를 300초 → 600초+ 로 늘리고, `document.hidden`(탭 비활성)일 때 폴링을 멈춘다.
- **Why:** Neon 기본 auto-suspend 윈도가 5분(300초)인데 fallback 폴링도 정확히 300초라, Pusher 연결이 실패한 탭이 하나라도 열려 있으면 5분마다 `/api/notifications`를 쳐서 compute가 suspend되지 못한다. IP 화이트리스트 DB 절감(A/B/C) 이후 남는 마지막 상시 DB-wake 요인.
- **Pros:** Pusher 장애 시에도 DB가 주기적으로 깨지 않음 → idle 시 compute suspend 보장. 탭 백그라운드 시 불필요 호출 제거.
- **Cons:** 폴링 주기가 길어지면 Pusher 장애 상황에서 알림 배지 갱신이 최대 10분+ 지연될 수 있음(정상 시 Pusher 실시간이라 무관).
- **Context:** 두 파일 모두 `setInterval(..., 300000)` 패턴. Pusher `connected` 시 폴링 정지, `unavailable`/`subscription_error` 시 시작하는 구조가 이미 있음. 거기에 `visibilitychange` 핸들러로 `document.hidden` 시 `clearInterval`, 복귀 시 재시작을 추가하면 됨.
- **Depends on / blocked by:** 없음. IP 화이트리스트 작업과 독립.
