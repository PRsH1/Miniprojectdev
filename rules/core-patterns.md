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
- 리프레시 토큰: 7일 (`refresh_token` httpOnly 쿠키, DB 저장)
- 미인증: `/auth/login.html?next=<page>` 리다이렉트
- 권한 부족: `/auth/403.html`
- 강제 비밀번호 변경 필요: `/auth/change-password.html`

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
`</body>` 직전에 `<script src="/assets/js/auth-status.js"></script>` 한 줄로 모든 페이지에 적용한다.

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
<script>window.AUTH_STATUS_CORNER = true;</script>
<script src="/assets/js/auth-status.js"></script>
```

- 비로그인 시 코너 모드는 로그인/회원가입 버튼 표시 (`?next=현재경로` 파라미터 포함), 상단 바 모드도 동일
- admin 로그인 시 모든 모드에서 "관리자 콘솔" 버튼 자동 표시
- **admin 전용 알림 벨**: 기본(상단 바) 모드에서만 `🔔` 벨 버튼 + 미읽음 배지 표시. 60초 폴링으로 count 갱신. 클릭 시 드롭다운 패널 → 알림 목록 + "모두 읽음" 처리. CORNER 모드에서는 미표시
- **주의:** 각 페이지에 `button { width: 100% }` 스타일이 있어도 `.asb-btn`에 `width: auto !important`가 적용되어 버튼이 늘어나지 않음
- 기본 모드의 `.asb-brand`("eformsign Tools Hub")는 클릭 시 `/`(index)로 이동하는 링크(`<a>` 태그)로 렌더링됨

---

### eformsign 인증 정보 저장/불러오기 (크리덴셜 프로필)

로그인한 사이트 사용자가 eformsign API 인증 정보를 이름을 붙여 DB에 저장하고 재사용하는 기능.

**DB 테이블:** `eformsign_credentials`

```
컬럼: id, user_id(FK), name, environment, custom_url,
      api_key, eform_user_id, secret_method, secret_key(nullable), created_at, updated_at
```

**API 엔드포인트:** `/api/credentials`

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/credentials` | 내 크리덴셜 목록 (`secret_key` 제외, `api_key`·`eform_user_id`·`has_secret_key` 포함) |
| GET | `/api/credentials/:id` | 단건 상세 조회 (비밀 키 포함 — 불러오기 시 사용) |
| POST | `/api/credentials` | 새 크리덴셜 저장 |
| DELETE | `/api/credentials/:id` | 크리덴셜 삭제 |

**보안 원칙:**
- `secret_key`는 저장/조회 시 AES-256-GCM으로 암호화 처리 (`CREDENTIAL_ENCRYPTION_KEY` 환경변수 필요)
  - 저장 형식: `{iv_hex}:{authTag_hex}:{ciphertext_hex}` — DB에는 암호문만 저장
  - 목록 조회(`GET /api/credentials`)에서는 `secret_key` 미반환, `has_secret_key: boolean`만 반환
  - 단건 조회(`GET /api/credentials/:id`)에서 서버가 복호화 후 평문 반환 — 클라이언트 변경 없음
  - `secret_key`가 null인 경우(미저장) 암호화/복호화 시도 없이 그대로 처리
  - 기존 plaintext 데이터는 `scripts/migrate-credentials-encrypt.js`로 일괄 재암호화
- 비밀 키 저장은 사용자가 체크박스로 선택 (`secret_key` nullable)
- 불러오기 시 비밀 키가 null이면 UI에서 직접 입력 안내 표시
- 모든 엔드포인트는 JWT(`auth_token` 쿠키) 인증 필요, `WHERE user_id = decoded.sub`로 타 사용자 접근 차단

**공유 모듈:** `assets/js/credential-panel.js` (IIFE)

Access Token을 발급하는 모든 도구 페이지에 적용되는 공유 모듈. 3개 모달을 `<body>`에 자동 주입하고, `openCredentialSaveModal()` / `openCredentialLoadModal()` 전역 함수를 노출한다.

```html
<!-- 페이지별 설정 선언 후 스크립트 로드 -->
<script>
window.CREDENTIAL_CONFIG = {
    apiKeyId:         'apiKey',           // API Key 입력 필드 ID
    userIdId:         'user_id_token',    // User ID 입력 필드 ID
    secretKeyId:      'privateKeyHex',    // 비밀 키 입력 필드 ID
    envId:            'envSelection',     // 환경 선택 필드 ID (null이면 envFixed 사용)
    envFixed:         null,               // 'op_saas' | 'csap' (envId가 null일 때)
    envSaveMap:       null,               // 페이지값→DB값 맵 (예: { saas: 'op_saas' })
    envLoadMap:       null,               // DB값→페이지값 맵 (예: { op_saas: 'saas' })
    customUrlId:      null,               // custom 환경 URL 필드 ID
    secretMethodId:   'secretKeyMethod',  // 인증 방식 선택 필드 ID (null이면 signature 고정)
    secretMethodType: 'radio',            // 'radio' | 'select' | 'tab' | null
    darkMode:         false,              // true면 다크 테마 모달 (webhook.html 등)
};
</script>
<script src="/assets/js/credential-panel.js"></script>
```

**모달 ID (credential-panel.js 주입):**
- `#_cpLoadModal` — 불러오기 모달
- `#_cpSaveModal` — 저장 모달 (환경 select `#_cpSaveEnv` + Custom URL 입력 `#_cpSaveCustomUrl` 포함)
- `#_cpAuthModal` — 비로그인 차단 모달

**저장 모달 환경 선택:**
- `#_cpSaveEnv` (`<select>`): 운영(SaaS) / 공공(CSAP) / 직접 입력 — 모달 열릴 때 현재 페이지 환경으로 초기값 세팅
- `#_cpSaveCustomUrlWrap` / `#_cpSaveCustomUrl`: `직접 입력` 선택 시에만 표시되는 URL 입력 필드
- `_cpSaveEnvChange()`: select 변경 시 Custom URL 래퍼 표시/숨김 처리
- `envFixed` 설정 페이지에서는 `#_cpSaveEnv`가 `disabled` — 환경 변경 불가
- 저장 시 환경값은 페이지 필드가 아닌 **모달 select에서 직접 읽음** (항상 DB 형식 `op_saas`/`csap`/`custom`)

**불러오기 모달 환경 표시:**
- `_envLabel(c)` 헬퍼: `custom` 환경이고 `custom_url`이 있으면 `직접 입력 · {url}` 형식으로 표시
- URL이 긴 경우 환경 태그에서 `max-width:320px` + 말줄임(`text-overflow:ellipsis`) 처리

**CSS 격리:** `_injectStyles()`가 `<style>` 태그를 `<head>`에 삽입하여 모달 내부 `button`·`input`·`select`에 `all:revert` 적용 → 호스트 페이지 전역 CSS 오염 방지

**`secretMethodType` 처리:**
- `'radio'`: `[name="secretMethodId"]:checked` 값 읽기/쓰기
- `'select'`: `<select id="secretMethodId">` 값 읽기/쓰기
- `'tab'`: `[data-method].active` 읽기, `.click()` 쓰기 (OpenAPIAutoTest 방식)
- `null`: `'signature'` 고정

**`envSaveMap` / `envLoadMap`:** 페이지가 사용하는 환경 값이 DB 저장 형식(`op_saas`/`csap`/`custom`)과 다를 때 지정.
- Embedding 페이지: `'saas'` ↔ `'op_saas'` 변환
- CSAP 전용 페이지: `envFixed: 'csap'` (선택 필드 없음)

**적용 페이지:** Access Token을 발급하는 모든 도구 — API(JS,HTML)/, Embedding/, utils/ 내 17개 이상 페이지.
- OpenAPITester(`OpenAPITesterFull.html`, `OpenAPITesterProd.html`), MemberV2.html은 자체 모달(`#credentialLoadModal` 등) 유지
- 나머지 도구들은 `credential-panel.js` 공유 모듈 사용

**토스트 알림 위치:** `bottom: 80px` — 코너 모드 auth 패널(`bottom: 16px`)과 겹치지 않도록 여유 확보

---

### 알림 시스템 (Notification Bell)

admin에게 회원가입 요청 등 주요 이벤트를 상단 바 벨 아이콘으로 알려주는 모듈형 알림 시스템.

**DB 테이블:** `notifications`

```
컬럼: id, type (varchar64), target_role (varchar32, default 'admin'),
      reference_id (varchar128), title (varchar256), body (text),
      is_read (boolean, default false), created_at, read_at
```

**API 엔드포인트:** `/api/notifications` (admin 전용)

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/notifications` | 미읽음 count + 최신 30건 목록 |
| PATCH | `/api/notifications/read` | 전체 읽음 처리 |
| PATCH | `/api/notifications/:id/read` | 단건 읽음 처리 |

**신규 알림 생성 패턴 (서버):**
```javascript
// 알림 발생 지점(예: signup.js)에서 INSERT만 추가 — 클라이언트 변경 불필요
await sql`
  INSERT INTO notifications (type, reference_id, title, body, target_role)
  VALUES ('signup_request', ${requestId}, '새 회원가입 요청',
          ${username + ' 님이 가입을 요청했습니다.'}, 'admin')
`;
```

**알림 타입 확장:** `type` 컬럼에 새 값 추가 + 서버에서 INSERT 한 줄만 추가하면 클라이언트 무변경으로 표시됨.

**현재 알림 타입:**

| type | 발생 시점 | 이동 경로 |
|---|---|---|
| `signup_request` | `POST /api/signup` | `/app/admin?tab=signup-requests` |

**프론트엔드 구성 — 2파일 분리:**

| 파일 | 적용 범위 | 설명 |
|---|---|---|
| `auth-status.js` | `/app/*` 등 auth-status.js 적용 페이지 | 벨 로직 내장. admin + 기본(상단 바) 모드에서만 활성화 |
| `assets/js/notification-bell.js` | `index.html` | 독립 모듈 (IIFE → `window.NotifBell`). `index.html`이 `<script>` 로드 후 `NotifBell.init(containerEl)` 호출 |

**`notification-bell.js` 사용 방법 (index.html 전용):**
```html
<!-- </body> 직전, 인라인 <script> 보다 먼저 로드 -->
<script src="/assets/js/notification-bell.js"></script>
```
```javascript
// renderHeaderUser() 내 admin 구간
if (meData.role === 'admin') {
    var wrap = document.getElementById('idxBellWrap');
    if (wrap && window.NotifBell) window.NotifBell.init(wrap);
}
```

**패널 위치 계산:** `notification-bell.js`는 `getBoundingClientRect()`로 벨 버튼 기준 동적 계산 → 스크롤 위치와 무관하게 벨 바로 아래에 표시됨.

**CSS 격리:** `notification-bell.js`의 CSS 클래스는 `._nb-` 접두어 사용, auth-status.js의 `asb-`·`anp-`와 충돌 없음. 두 파일이 동시에 로드되어도 독립 동작.

**폴링:** 60초 interval로 `/api/notifications` 호출 → unread_count만 갱신. 패널이 열려 있는 동안은 폴링 스킵.

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
