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
- 목록 조회 시 `secret_key`는 반환하지 않고 `has_secret_key: boolean`만 반환
- 비밀 키 저장은 사용자가 체크박스로 선택 (`secret_key` nullable)
- 불러오기 시 비밀 키가 null이면 UI에서 직접 입력 안내 표시
- 모든 엔드포인트는 JWT(`auth_token` 쿠키) 인증 필요, `WHERE user_id = decoded.sub`로 타 사용자 접근 차단

**적용 페이지:** `private/MemberV2.html`, `private/OpenAPITesterFull.html`, `API(JS,HTML)/OpenAPITesterProd.html`

**크리덴셜 UI 패턴 (OpenAPITester):**
- 인증 패널 내 **인증 저장** / **인증 불러오기** 버튼으로 진입
- **불러오기 모달** (`#credentialLoadModal`): 항목당 인증 이름·API Key·User ID·비밀 키 저장 여부를 레이블-값 리스트로 표시 (API Key / User ID 전체 표시), [선택] 클릭 시 인증 패널 자동 채움 후 모달 닫힘
- **저장 모달** (`#credentialSaveModal`): 저장 이름 + 인증 패널 현재 값(API Key·User ID·비밀 키) pre-fill, 수정 후 저장 가능, 비밀 키 표시/숨김 토글 포함
- **비로그인 차단** (`#authRequiredModal`): 두 버튼 모두 `state.authUser`(init.js에서 `/api/me` 캐시) 확인 후 미인증 시 로그인 안내 모달 표시 — [로그인하기] 버튼에 `?next=현재경로` 파라미터 포함
- 토스트 알림 위치: `bottom: 80px` — 코너 모드 auth 패널(`bottom: 16px`)과 겹치지 않도록 여유 확보

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
