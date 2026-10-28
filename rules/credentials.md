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
    envFixed:         null,               // 'op_saas' | 'csap' | 'custom'
    customUrlFixed:   null,               // envFixed:'custom'일 때 고정 URL (KogasDocumentSend)
    envSaveMap:       null,               // 페이지값→DB값 맵 (예: { saas: 'op_saas' })
    envLoadMap:       null,               // DB값→페이지값 맵
    customUrlId:      'customDomainInput',// 페이지의 직접 입력 URL 입력란 id — 입력란이 있으면 필수
    secretMethodId:   'secretKeyMethod',  // null이면 signature 고정
    secretMethodType: 'radio',            // 'radio' | 'select' | 'tab' | null
    darkMode:         false,
};
</script>
<script src="/assets/js/credential-panel.js"></script>
```

**모달 ID:** `#_cpLoadModal` / `#_cpSaveModal` / `#_cpAuthModal`

**CONFIG 필수 규칙 (P1-01):**
- **`customUrlId` 필수**: 환경 select에 `custom`(직접 입력) 옵션이 있으면 그 URL 입력란 id를 반드시 넣는다. `null`이면 저장 모달 URL 칸이 빈 채로 열리고, 불러오기 후 env만 custom이 되고 URL은 비어 있게 된다.
  현재 값: DocumentInfo·DocumentDownload·DocumentSendImprove·DocumentDelete·templateDeletetool·webhook·MassDocumentDowmload = `customDomainInput`, listdocuments = `customBaseUrl`, 임베딩 2종 = `customApiUrl`(API Base URL — 라이브러리 Domain/Lib URL은 저장되지 않으므로 직접 입력 후 [커스텀 스크립트 적용]), MemberV2 = `customEnvUrl`, AutoTest = `formCustomUrl`.
- **env 맵**: 페이지 select 값이 DB 형식(`op_saas`/`csap`/`custom`)과 다르면 `envSaveMap`/`envLoadMap` 필수(임베딩 2종 `saas`↔`op_saas`, AutoTest 동일).
- **고정 도메인 페이지**: KogasDocumentSend는 `envId:null, envFixed:'custom', customUrlFixed:'https://eform.kogas.or.kr/Service'`로 저장한다(과거 `op_saas`로 저장되어 다른 도구에서 SaaS로 불러와지던 문제). 저장 모달의 URL 칸은 읽기 전용. 다른 환경의 크리덴셜을 불러오면 토스트로 경고한다.
- **Basic Auth 미지원 (Q13 기본안)**: `secret_method`는 DB CHECK 제약상 `signature`/`bearer`만 저장한다. 페이지에서 `basic`이 선택되어 있으면(DocumentDelete) 저장 모달에 안내를 띄우고 [저장] 버튼을 비활성화한다(`_cpConfirmSave`도 한 번 더 막음). 그 외 값은 `signature`로 저장.
- 일괄 점검: CONFIG의 참조 id 존재, custom 옵션 ↔ `customUrlId`, env 맵 누락을 스크립트로 확인한다(검증 세션 보고 참고).

**저장 모달:**
- `#_cpSaveEnv`: 운영(SaaS) / 공공(CSAP) / 직접 입력 select — 모달 열릴 때 현재 환경으로 초기값 세팅
- `직접 입력` 선택 시 `#_cpSaveCustomUrl` 필드 표시
- `envFixed` 설정 페이지에서는 select disabled
- 저장 시 환경값은 **모달 select에서 직접 읽음** (항상 DB 형식 `op_saas`/`csap`/`custom`)

**불러오기 모달:**
- `custom` 환경: `직접 입력 · {url}` 형식으로 표시, 긴 URL은 `max-width:320px` 말줄임

**비(非)자명한 동작:**
- **CSS 격리**: 모달 내 `button`·`input`·`select`에 `all:revert`, `table`·`tr`·`td`에 명시적 속성 오버라이드(`border:none`, `background:transparent` 등) 적용 → 호스트 페이지 전역 CSS 오염 방지
- **`secretMethodType: 'tab'`**: `[data-method].active` 읽기, `.click()` 쓰기
- **`secretMethodType: 'select'`**: `<select>` 요소에서 직접 `.value` 읽기/쓰기 (OpenAPIAutoTest 설정 모달 방식)
- **토스트 위치**: `bottom: 80px` — 코너 모드 auth 패널(`bottom: 16px`)과 겹치지 않도록
- **토스트는 textContent**: 이름을 HTML 이스케이프하지 않는다(`A&B` → `"A&B" 인증 정보가 저장되었습니다.`). 목록 렌더링(innerHTML)에서만 `_esc()`를 쓴다
- **삭제 실패 처리**: `DELETE /api/credentials/:id` 응답이 ok가 아니면 "삭제 실패: …" 토스트를 띄우고 목록을 그대로 둔다(성공 시에만 "삭제했습니다." 후 목록 재조회). 네트워크 오류는 "삭제 중 오류" 토스트
- **AutoTest 모달 테마**: `private/OpenAPIAutoTest.html`은 밝은 테마이므로 `darkMode:false`
- **적용 제외**: OpenAPITester(`OpenAPITesterFull.html`, `OpenAPITesterProd.html`)만 자체 모달 유지.
  MemberV2는 공유 모듈로 전환됨(`private/MemberV2.html`이 `CREDENTIAL_CONFIG` 선언 + `credential-panel.js` 로드)
- **로드 순서 주의(MemberV2)**: 공유 모듈(`api-error.js` → `token-issuer.js` → `token-badge.js`) → `member/api.js` → `ui.js` → `init.js` → `credential-panel.js` 순.
  `credential-panel.js`가 마지막이어야 `_setVal()`의 `change`/`input` 이벤트를 member 모듈이 받는다
