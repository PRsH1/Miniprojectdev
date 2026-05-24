## 알림 시스템 (Notification Bell)

admin에게 관리 이벤트를, 일반 사용자에게 본인 버그 리포트 관련 이벤트를 상단 바 벨 아이콘으로 알려주는 모듈형 알림 시스템.

**DB 테이블:** `notifications`

```
컬럼: id, type (varchar64), target_role (varchar32, default 'admin'),
      target_user_id (UUID REFERENCES users(id), nullable),
      reference_id (varchar128), title (varchar256), body (text),
      is_read (boolean, default false), created_at, read_at
```

- `target_user_id = NULL` → target_role 기반 (admin 알림 등)
- `target_user_id = NOT NULL` → 특정 사용자 전용 (버그 리포트 상태 변경·답변 알림)

**API 엔드포인트:** `/api/notifications` (로그인 필요, 역할별 분기)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/notifications` | 미읽음 count + 최신 30건 목록 |
| PATCH | `/api/notifications/read` | 전체 읽음 처리 |
| PATCH | `/api/notifications/:id/read` | 단건 읽음 처리 |
| DELETE | `/api/notifications/:id` | 단건 삭제 |
| DELETE | `/api/notifications` | 전체 삭제 |

- admin: `WHERE target_role = 'admin'` 쿼리
- 일반 사용자: `WHERE target_user_id = decoded.sub` 쿼리
- 동일 엔드포인트 내부에서 `isAdmin` 분기 처리

---

### 실시간 전달 — Pusher 연동

알림 생성/읽음/삭제 시 Pusher private 채널로 이벤트를 발행하여 클라이언트 배지를 즉시 갱신한다.
DB 폴링은 제거되었으며, Pusher 연결 실패 시에만 300초 fallback 폴링이 활성화된다.

**Pusher 채널:**

| 채널명 | 대상 | 용도 |
|---|---|---|
| `private-notifications-admin` | admin 역할 전체 | 가입 요청, 버그 리포트 접수 알림 |
| `private-notifications-{userId}` | 특정 사용자 | 본인 버그 리포트 상태 변경/답변 알림 |

**Pusher 이벤트:**

| 이벤트명 | 발생 시점 | payload |
|---|---|---|
| `new-notification` | 알림 INSERT 후 | `{ id, type, title, body, created_at, unread_count }` |
| `notification-read` | 단건 읽음 처리 후 | `{ id, unread_count }` |
| `notifications-read` | 전체 읽음 처리 후 | `{ unread_count }` |
| `notification-deleted` | 단건 삭제 후 | `{ id, unread_count }` |
| `notifications-cleared` | 전체 삭제 후 | `{ unread_count }` |

**채널 인증:** `POST /api/pusher/auth` — JWT 쿠키에서 사용자 확인 → 본인 채널 또는 admin 채널만 허용.

**관련 파일:**

| 파일 | 역할 |
|---|---|
| `controllers/_shared/pusher.js` | Pusher 인스턴스 공통 모듈 (알림 + Webhook 공용) |
| `controllers/pusher-auth.js` | Private 채널 인증 엔드포인트 |

---

### 알림 생성 패턴 (서버)

```javascript
// 1. 알림 INSERT
const notificationRows = await sql`
  INSERT INTO notifications (type, reference_id, title, body, target_role)
  VALUES ('signup_request', ${requestId}, '새 회원가입 요청',
          ${username + ' 님이 가입을 요청했습니다.'}, 'admin')
  RETURNING id, type, title, body, created_at
`;
// 2. 미읽음 count 조회
const [{ count }] = await sql`
  SELECT COUNT(*)::int AS count FROM notifications
  WHERE target_role = 'admin' AND target_user_id IS NULL AND is_read = FALSE
`;
// 3. Pusher 이벤트 발행
await triggerNewNotification('private-notifications-admin', notificationRows[0], count);
// 전체를 try-catch로 감싸 실패해도 본 처리는 성공
```

**타입 확장:** `type` 컬럼에 새 값 추가 + 서버 INSERT + Pusher trigger 한 줄씩 추가하면 클라이언트 무변경으로 표시됨.

**현재 알림 타입:**

| type | 발생 시점 | 수신자 | 이동 경로 |
|---|---|---|---|
| `signup_request` | `POST /api/signup` | admin (target_role) | `/app/admin?tab=signup-requests` |
| `bug_report` | `POST /api/bug-reports` | admin (target_role) | `/app/admin?tab=bug-reports` |
| `bug_report_status` | 관리자가 bug status 변경 시 | 제보자 (target_user_id) | `/community/bug-report.html#my-reports` |
| `bug_report_reply` | 관리자가 cause/action_taken 최초 등록 시 | 제보자 (target_user_id) | `/community/bug-report.html#my-reports` |

---

### 프론트엔드 구성 — 2파일 분리

| 파일 | 적용 범위 | 설명 |
|---|---|---|
| `auth-status.js` | `/app/*` 등 auth-status.js 적용 페이지 | 벨 로직 내장. **로그인한 모든 사용자** + 기본(상단 바) 모드에서 활성화. admin은 target_role 알림, 일반 사용자는 target_user_id 알림 표시 |
| `assets/js/notification-bell.js` | `index.html` | 독립 모듈 (IIFE → `window.NotifBell`). `index.html`이 `<script>` 로드 후 `NotifBell.init(containerEl, meData)` 호출 |

```html
<!-- index.html: </body> 직전 로드 -->
<script src="https://js.pusher.com/8.0/pusher.min.js"></script>
<script src="/assets/js/notification-bell.js"></script>
```
```javascript
// renderHeaderUser() 내 admin 구간
if (meData.role === 'admin') {
    var wrap = document.getElementById('idxBellWrap');
    if (wrap && window.NotifBell) window.NotifBell.init(wrap, meData);
}
```

**비(非)자명한 동작:**
- **패널 위치**: `getBoundingClientRect()` 기반 동적 계산 → 스크롤 위치 무관하게 벨 바로 아래
- **CSS 격리**: `._nb-` 접두어 (notification-bell.js) vs `asb-`·`anp-` (auth-status.js) — 충돌 없음
- **실시간 갱신**: Pusher `new-notification` 이벤트 payload의 `unread_count`로 배지 즉시 갱신. `unread_count`가 없으면 fallback으로 `fetchUnreadCount()` 호출
- **Fallback 폴링**: Pusher 연결 실패 시 300초(5분) interval로 자동 전환. 재연결 시 폴링 해제
- **Pusher CDN 필수**: `auth-status.js` / `notification-bell.js` 로드 전에 `pusher.min.js` CDN이 먼저 로드되어야 함. 없으면 fallback 폴링으로 동작
- **X 버튼 삭제**: DOM 즉시 제거 + 미읽음 배지 카운트 즉시 감소. API 재호출 없음
- **"전체 삭제" 버튼**: 알림이 하나라도 있을 때만 헤더에 노출 (`._nb-del-all` / `.anp-del-all`)
- **`/api/me` 응답에 Pusher 설정 포함**: `pusher_key`, `pusher_cluster`, `id` — 클라이언트에서 Pusher 초기화 및 채널 구독에 사용
