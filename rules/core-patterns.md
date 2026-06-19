## 핵심 패턴

### eformsign API 인증 (ECDSA 서명)

```javascript
// 1. 타임스탬프로 서명 생성
const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
sig.init(keyObj);
sig.updateString(execTime.toString());
const signature = sig.sign();

// 2. Access Token 요청
fetch(`${domain}/v2.0/api_auth/access_token`, {
    method: 'POST',
    headers: {
        'Authorization': 'Bearer ' + btoa(apiKey),
        'eformsign_signature': signature
    },
    body: JSON.stringify({ execution_time: execTime, member_id: memberId })
});
```

### 환경 도메인

```javascript
const DOMAINS = {
    op_saas: 'https://kr-api.eformsign.com',
    csap:    'https://www.gov-eformsign.com/Service'
};
```

### 인증 보호 페이지 패턴 (DB 기반, 현행)

- `/app/:path*` → `auth-middleware.js` → DB에서 `protected_pages` 조회 → JWT 검증 → role 체크 → HTML 서빙
- JWT 액세스 토큰: 1시간 (`auth_token` httpOnly 쿠키)
- 리프레시 토큰: 7일 (`refresh_token` httpOnly 쿠키, DB 저장, 사용 시마다 로테이션)
- 미인증: `/auth/login.html?next=<page>` 리다이렉트
- 권한 부족: `/auth/403.html`
- 강제 비밀번호 변경 필요: `/auth/change-password.html`

### 세션 갱신 / 리프레시 토큰 로테이션 (경합 안전)

액세스 토큰(1h)이 만료되면 `refresh_token`(7d)으로 새 액세스 토큰을 발급하며, 리프레시 토큰도 함께 로테이션한다(활성 사용자는 7일 슬라이딩 세션). 동시 갱신 경합으로 인한 오(誤)로그아웃을 막기 위해 아래 패턴을 사용한다.

- **공통 함수**: `auth-middleware.js`의 `tryRefreshToken(sql, refreshToken, res, isSecure)` 가 정본. `me.js`, `auth-middleware`(/app/*), `refresh.js`(/api/refresh), `_shared/session.js`가 모두 이 함수를 공유한다. (`refresh.js`는 자체 로테이션 로직 없이 위임만)
- **원자적 단일 승자(claim)**: 단일 SQL문(CTE)으로 `UPDATE … SET revoked_at=now(), replaced_by=<신규ID> WHERE token_hash=:h AND revoked_at IS NULL AND expires_at>now()` 후 신규 토큰 INSERT까지 한 번에 처리. 행을 반환받은 요청만 "승자"가 되어 `auth_token`+`refresh_token` 두 쿠키를 모두 세팅한다. (Neon http 드라이버는 autocommit이라 다중 statement 트랜잭션이 없으므로, 정확성은 이 단일 원자적 UPDATE에 의존)
- **grace 패자**: claim 0행이면 재조회 — `replaced_by IS NOT NULL AND revoked_at > now() - interval '30 seconds'`(=형제 갱신에 30초 내 진 경우)면 **새 액세스 JWT만 발급하고 refresh 쿠키는 건드리지 않는다**(승자가 이미 세팅 → 쿠키 클로버링 방지). 그 외(없음/만료/`replaced_by IS NULL`)는 `null`.
- **로그아웃 토큰 차단**: `logout.js`는 `replaced_by` 없이 `revoked_at`만 세팅하므로, grace 조건의 `replaced_by IS NOT NULL`이 로그아웃된 토큰의 재인증을 자동 차단한다.
- **데이터 API 갱신-인지(refresh-aware)**: `_shared/session.js`의 `resolveUser(req, res)` 는 `auth_token` 검증 → 만료 시 `tryRefreshToken` 호출. `credentials.js`/`requestHistory.js`/`notifications.js`가 직접 `jwt.verify` 대신 이 헬퍼를 쓰므로, 액세스 토큰 만료 후에도 리프레시 유효 기간 내에는 401 없이 동작한다.
- **클라이언트 single-flight**: `auth-status.js`/`credential-panel.js`/`openapi/state.js`가 `window.AUTH_STATUS_ME_PROMISE = window.AUTH_STATUS_ME_PROMISE || …` 멱등 가드로 `/api/me` 부트스트랩을 1회로 공유하고, `navigator.locks.request('eform-auth-bootstrap', …)`로 탭 간 직렬화한다(미지원 시 lock 없이 진행 — 서버 원자성이 정확성 보장).
- **로그아웃 graceful 처리**: 같은-오리진 `/api/*` 호출이 갱신 후에도 401이거나(=리프레시 만료) `visibilitychange`/`focus` 재확인에서 `authenticated:false`면 `window.handleAuthExpired()`(auth-status.js)가 1회 안내 후 `location.reload()`. (interval 폴링은 쓰지 않음 — Neon idle suspend 유지)
- **마이그레이션**: `refresh_tokens.replaced_by UUID` 컬럼 필요. `scripts/migrate-refresh-rotation.js`로 추가(멱등). **반드시 코드 배포 전에 실행** — 없으면 claim/grace 쿼리가 실패해 갱신 전체가 막힌다.

```javascript
// controllers/_shared/auth-middleware.js 처리 흐름
// 1. protected_pages DB 조회 (path, is_active)
// 2. auth_token JWT 검증
//    만료 시 → refresh_token으로 갱신 (로테이션)
// 3. mustChangePw 확인
// 4. role 계층 체크: admin > manager > user
// 5. file_path HTML 서빙 + audit_logs INSERT
```

### 역할(Role) 계층

```
admin   → 모든 /app/* 접근 가능
manager → required_role이 'manager' 또는 'user'인 페이지
user    → required_role이 'user'인 페이지만
```

### 보호 페이지 동적 관리

보호 페이지 설정은 `protected_pages` DB 테이블에서 관리한다.
관리자가 Admin UI(`/app/admin` → 보호 페이지 탭)에서 런타임 추가/수정 가능.

```
신규 보호 페이지 추가 절차:
1. HTML 파일을 private/ 디렉토리에 추가 후 배포
   (직접 URL 차단 필요 시. utils/ 등 정적 경로는 직접 URL로 접근 가능)
2. Admin UI → 보호 페이지 탭 → 신규 등록
   (path: /app/pageName, file_path: private/pageName.html, required_role 선택)
```

**file_path 등록 시 주의:**
- `private/`로 시작하면 직접 URL 차단 — Admin UI에서 초록 안내 표시
- `utils/` 등 다른 경로는 직접 URL로도 접근 가능 — Admin UI에서 노란 경고 표시
- 등록한 `file_path`가 `index.html` 카드의 `data-original-url`과 일치하면 해당 카드가 자동으로 권한 제어를 받음 (배포 불필요)

### index.html 카드 가시성 시스템

카드 가시성은 3단계로 처리된다. (`applyRoleFilter()` — `/api/me` 응답 수신 후 실행)

```
Step 1. 자동 매칭 (data-original-url ↔ protected_pages.file_path)
  → data-protected-path 없고 data-original-url 있는 카드
  → DB의 file_path와 비교 (앞 슬래시 정규화 후 대소문자 구분 비교)
  → 매칭 성공 시: data-protected-path 동적 주입, onclick → navigateCard

Step 2. data-protected-path 카드 처리 (Step 1 주입 카드 포함)
  → DB에서 path 기준으로 required_role 조회
  → DB에 없고 data-original-url 있음 → public (보호 해제, 공개 복원)
  → DB에 없고 data-original-url 없음 → admin (공개 복원 경로 없음, 최고 제한 유지)

Step 3. data-min-role 카드 처리 (data-protected-path 없는 카드만)
  → 하드코딩된 역할로 가시성 결정
```

**카드 속성 규칙:**

| 속성 | 용도 | 필수 여부 |
|---|---|---|
| `data-min-role` | 하드코딩 역할 제어 (정적) | `data-protected-path` 없는 카드에 필수 |
| `data-protected-path` | DB 기반 역할 제어 (동적) | `/app/*` 경로 카드에 사용 |
| `data-original-url` | 보호 해제 시 복원 경로 | 모든 카드에 설정 권장 |

```javascript
// navigateCard(card) 동작
// - data-protected-path 있고 DB에 존재 → /app/{path} 이동
// - data-protected-path 있고 DB에 없음 + data-original-url 있음 → 원래 URL 이동
// - data-original-url 없음 → 이동하지 않음
```

### 전 페이지 로그인 상태 바 패턴 (`assets/js/auth-status.js`)

`auth-status.js`는 IIFE로 `/api/me`를 호출해 로그인 상태를 표시하는 공통 스크립트다.
`</body>` 직전에 Pusher CDN + `auth-status.js` 순서로 로드한다. Pusher CDN이 없으면 알림 실시간 갱신이 fallback 폴링(300초)으로 동작한다.

```html
<script src="https://js.pusher.com/8.0/pusher.min.js"></script>
<script src="/assets/js/auth-status.js"></script>
```

```
적용 제외 페이지: auth/login.html, auth/signup.html, auth/change-password.html, auth/403.html, index.html
```

**3가지 모드:**

| 모드 | 선언 방법 | 동작 |
|---|---|---|
| 기본 (상단 바) | 선언 없음 | `position:fixed; top:0` 파란 바 자동 삽입 + `body { padding-top: 40px }` 주입 |
| 코너 | `window.AUTH_STATUS_CORNER = true` | `position:fixed; bottom:16px; right:16px` 플로팅 패널 — 기존 헤더 있는 페이지용 (OpenAPITester 등) |
| 인라인 | `window.AUTH_STATUS_INLINE = true` | `#authStatusBar` 요소를 HTML에 미리 배치, 자동 삽입 없음 |

```html
<!-- 코너 모드 예시 (OpenAPITesterFull.html) -->
<script src="https://js.pusher.com/8.0/pusher.min.js"></script>
<script>window.AUTH_STATUS_CORNER = true;</script>
<script src="/assets/js/auth-status.js"></script>
```

- 비로그인 시 코너 모드는 로그인/회원가입 버튼 표시 (`?next=현재경로` 파라미터 포함), 상단 바 모드도 동일
- admin 로그인 시 모든 모드에서 "관리자 콘솔" 버튼 자동 표시
- **알림 벨**: 기본(상단 바) 모드 + 로그인 사용자에게 벨 버튼 + 미읽음 배지 표시. Pusher WebSocket으로 실시간 갱신 (Pusher 연결 실패 시 300초 fallback 폴링). 클릭 시 드롭다운 패널 → 알림 목록 + "모두 읽음" 처리. CORNER 모드에서는 미표시
- **주의:** 각 페이지에 `button { width: 100% }` 스타일이 있어도 `.asb-btn`에 `width: auto !important`가 적용되어 버튼이 늘어나지 않음
- 기본 모드의 `.asb-brand`("eformsign Tools Hub")는 클릭 시 `/`(index)로 이동하는 링크(`<a>` 태그)로 렌더링됨

---

### Vercel Cron Job 패턴

정기 실행 작업은 `vercel.json`의 `crons` 배열 + 전용 컨트롤러로 구현한다.

```json
// vercel.json
"crons": [
  { "path": "/api/cron/cleanup-audit", "schedule": "0 0 * * *" }
]
```

```javascript
// controllers/cron/cleanup-audit.js (GET 메서드)
// 1. Authorization: Bearer <CRON_SECRET> 헤더 검증
// 2. DELETE 쿼리 실행
// 3. { success: true, deleted: N } 반환
```

- Cron 엔드포인트는 반드시 `CRON_SECRET` 검증 — 미설정(`undefined`) 시 모든 요청 차단
- `crons` 스케줄은 **Production 환경에서만** 자동 실행 (로컬·Preview는 수동 curl로 테스트)
- 로컬 테스트: `curl -H "Authorization: Bearer <CRON_SECRET>" http://localhost:3000/api/cron/cleanup-audit`
- Hobby 플랜: 일 1회 제한 / Pro 플랜: 분 단위 설정 가능

### 새 API 엔드포인트 추가

1. `/controllers/`에 컨트롤러 파일 생성
2. `api/index.js`에 라우트 등록
3. `vercel.json`에 rewrite 규칙 추가 (필요 시, `/api/*` 와일드카드로 대부분 불필요)

### 새 공개 도구 추가

1. `/utils/`에 HTML 파일 생성
2. `index.html`의 해당 섹션 카드에 아래 속성 추가:

```html
<a href="/utils/pageName.html" class="card" data-card
   data-min-role="public"
   data-original-url="utils/pageName.html">
```

- `data-original-url`은 `href`의 앞 슬래시를 제거한 값 — Admin UI에서 `file_path`로 등록 시 자동 매칭에 사용됨
- 나중에 보호 페이지로 전환하더라도 HTML 수정 없이 Admin UI 등록만으로 권한 제어 가능
