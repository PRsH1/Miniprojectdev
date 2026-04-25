## 크리덴셜 프로필 (eformsign 인증 정보 저장/불러오기)

로그인한 사이트 사용자가 eformsign API 인증 정보를 이름을 붙여 DB에 저장하고 재사용하는 기능.

**DB 테이블:** `eformsign_credentials`

```
컬럼: id, user_id(FK), name, environment, custom_url,
      api_key, eform_user_id, secret_method, secret_key(nullable), created_at, updated_at
```

**API 엔드포인트:** `/api/credentials`

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/credentials` | 내 크리덴셜 목록 (`secret_key` 제외, `has_secret_key` 포함) |
| GET | `/api/credentials/:id` | 단건 조회 (비밀 키 포함 — 불러오기 시 사용) |
| POST | `/api/credentials` | 새 크리덴셜 저장 |
| DELETE | `/api/credentials/:id` | 크리덴셜 삭제 |

**보안 원칙:**
- `secret_key`는 AES-256-GCM 암호화 저장 (`CREDENTIAL_ENCRYPTION_KEY` 환경변수 필요)
  - 저장 형식: `{iv_hex}:{authTag_hex}:{ciphertext_hex}`
  - 목록 조회 시 `secret_key` 미반환, `has_secret_key: boolean`만 반환
  - 단건 조회 시 서버 복호화 후 평문 반환 — 클라이언트 변경 없음
  - `secret_key`가 null이면 암호화/복호화 없이 그대로 처리
  - 기존 plaintext → `scripts/migrate-credentials-encrypt.js`로 일괄 재암호화
- 모든 엔드포인트는 JWT 인증 필요, `WHERE user_id = decoded.sub`로 타 사용자 접근 차단

---

### 공유 모듈 `assets/js/credential-panel.js` (IIFE)

Access Token을 발급하는 모든 도구 페이지에 적용. 3개 모달을 `<body>`에 자동 주입하고 `openCredentialSaveModal()` / `openCredentialLoadModal()` 전역 함수를 노출한다.

```html
<script>
window.CREDENTIAL_CONFIG = {
    apiKeyId:         'apiKey',
    userIdId:         'user_id_token',
    secretKeyId:      'privateKeyHex',
    envId:            'envSelection',     // null이면 envFixed 사용
    envFixed:         null,               // 'op_saas' | 'csap'
    envSaveMap:       null,               // 페이지값→DB값 맵 (예: { saas: 'op_saas' })
    envLoadMap:       null,               // DB값→페이지값 맵
    customUrlId:      null,
    secretMethodId:   'secretKeyMethod',  // null이면 signature 고정
    secretMethodType: 'radio',            // 'radio' | 'select' | 'tab' | null
    darkMode:         false,
};
</script>
<script src="/assets/js/credential-panel.js"></script>
```

**모달 ID:** `#_cpLoadModal` / `#_cpSaveModal` / `#_cpAuthModal`

**저장 모달:**
- `#_cpSaveEnv`: 운영(SaaS) / 공공(CSAP) / 직접 입력 select — 모달 열릴 때 현재 환경으로 초기값 세팅
- `직접 입력` 선택 시 `#_cpSaveCustomUrl` 필드 표시
- `envFixed` 설정 페이지에서는 select disabled
- 저장 시 환경값은 **모달 select에서 직접 읽음** (항상 DB 형식 `op_saas`/`csap`/`custom`)

**불러오기 모달:**
- `custom` 환경: `직접 입력 · {url}` 형식으로 표시, 긴 URL은 `max-width:320px` 말줄임

**비(非)자명한 동작:**
- **CSS 격리**: 모달 내 `button`·`input`·`select`에 `all:revert` 적용 → 호스트 페이지 전역 CSS 오염 방지
- **`secretMethodType: 'tab'`**: `[data-method].active` 읽기, `.click()` 쓰기 (OpenAPIAutoTest 방식)
- **토스트 위치**: `bottom: 80px` — 코너 모드 auth 패널(`bottom: 16px`)과 겹치지 않도록
- **적용 제외**: OpenAPITester(`OpenAPITesterFull.html`, `OpenAPITesterProd.html`), MemberV2.html은 자체 모달 유지
