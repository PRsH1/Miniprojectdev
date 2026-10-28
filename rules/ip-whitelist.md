## IP 화이트리스트

DB 기반 IP 접근 제어 기능. 스코프 단위로 독립 활성화/비활성화 가능.

---

### 아키텍처

```
모든 요청 (matcher는 넓게 유지)
    ↓
middleware.js (Vercel Edge Middleware)
    ├── 마스터 플래그 OFF 또는 정적 경로 → 즉시 통과
    └── 페이지/API 요청 → global scope 체크 → 차단 시 403
    ↓
Vercel 라우팅
    ├── /api/*, /app/* → api/index.js
    │       ↓ path scope 체크 (api/index.js)
    │       └── /app/* → auth-middleware.js
    │               ↓ protected scope 체크
    └── 정적 파일 → middleware 내부에서 제외 후 Vercel CDN 서빙
```

### 스코프 3종

| 스코프 | 적용 범위 | 체크 위치 |
|---|---|---|
| `global` | 전체 페이지/API 요청 (직접 정적 파일 URL 제외) | `middleware.js` |
| `path` | 특정 경로 패턴 (예: `/api/admin/*`) | `api/index.js` |
| `protected` | 보호 페이지 (`/app/*`) 전용 | `auth-middleware.js` |

**`/app/*` 요청은 global → path → protected 세 스코프를 모두 통과해야 접근됨.**

---

### DB 테이블

**`ip_whitelist`** — IP 규칙

```
id, label, ip_cidr, scope_type (global|path|protected),
scope_path (path 스코프 시 필수), is_active, created_at, updated_at
```

**`ip_whitelist_scopes`** — 스코프 활성화 설정

```
id, scope_type, scope_path, label, is_enabled, created_at, updated_at
```

- `global`, `protected` 스코프는 마이그레이션 시 시드로 삽입 (삭제 불가)
- `path` 스코프는 Admin UI에서 동적 추가/삭제 가능

### 마이그레이션

```bash
# POSTGRES_URL 인라인 설정 후 실행 (최초 1회)
POSTGRES_URL="..." node scripts/migrate-ip-whitelist.js
```

- `WHERE NOT EXISTS` 조건으로 중복 삽입 방지 → 재실행 안전

---

### 관련 파일

| 파일 | 역할 |
|---|---|
| `middleware.js` | Vercel Edge Middleware — global scope 체크 |
| `lib/ip-match.js` | IP 파싱(IPv4/IPv6)·CIDR 매칭·경로 정규화/패턴 매칭 — middleware·서버·Admin API가 **같은 구현**을 공유 |
| `controllers/_shared/ip-whitelist.js` | 스코프 판정 + 60초 TTL 캐시 공통 모듈 (매칭은 `lib/ip-match.js`) |
| `controllers/adminIpWhitelist.js` | Admin REST API (규칙/스코프 CRUD + IP 테스트) |
| `scripts/migrate-ip-whitelist.js` | DB 테이블 생성 + 시드 마이그레이션 |
| `private/Admin.html` | Admin UI — IP 화이트리스트 탭 |

### Admin API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/admin/ip-whitelist` | 마스터 플래그 상태(`master_enabled`) + 전체 스코프 + 규칙 조회 |
| POST | `/api/admin/ip-whitelist/rules` | 규칙 추가 |
| PATCH | `/api/admin/ip-whitelist/rules/:id` | 규칙 수정 |
| DELETE | `/api/admin/ip-whitelist/rules/:id` | 규칙 삭제 |
| PUT | `/api/admin/ip-whitelist/scopes/:id` | 스코프 활성화/비활성화 |
| POST | `/api/admin/ip-whitelist/scopes` | path 스코프 추가 |
| DELETE | `/api/admin/ip-whitelist/scopes/:id` | path 스코프 삭제 (path 타입만) |
| POST | `/api/admin/ip-whitelist/test` | IP 허용 여부 테스트 |

---

### 동작 원칙

**마스터 플래그**:
- `IP_WHITELIST_ENABLED`가 정확히 `1` 또는 `true`일 때만 IP 화이트리스트를 적용
- 미설정 또는 그 외 값은 기본 OFF이며, enforcement 경로에서 IP 화이트리스트 DB를 조회하지 않고 즉시 허용
- 환경변수 변경은 재배포 후 반영

**Fail-open**: DB 오류 시 차단하지 않고 허용 — 서비스 가용성 우선

**캐시**:
- `controllers/_shared/ip-whitelist.js`: 모듈 수준 캐시 60초 TTL
- `middleware.js`: Edge Worker 인스턴스 수준 캐시 60초 TTL
- Admin write 시 서버 캐시는 `invalidateCache()` 즉시 무효화. Edge Worker 캐시는 최대 60초 후 갱신

**스코프 활성 + 규칙 없음 = 전체 차단**:
- Admin UI에서 규칙을 먼저 추가한 뒤 스코프를 활성화하도록 경고 표시

**로컬호스트 자동 허용**:
- `127.0.0.1`, `::1`(및 `::ffff:127.0.0.1`)은 global scope 활성화 여부와 무관하게 항상 허용
- `vercel dev` 환경에서 자기 자신이 잠기는 문제 방지
- 클라이언트 IP는 `x-forwarded-for` 첫 값 → `x-real-ip` 순으로 읽는다. **둘 다 없으면 더 이상 127.0.0.1로 간주하지 않는다**
  (이전에는 헤더 없는 요청이 로컬호스트 예외로 통과). Vercel에서는 플랫폼이 항상 헤더를 붙인다

**잠금 복구 절차**:
1. 잘못된 규칙으로 Admin 접근이 차단되면 Vercel에서 `IP_WHITELIST_ENABLED`를 제거하거나 `0`으로 설정
2. 재배포하여 마스터 플래그 OFF를 반영하면 모든 IP 요청이 즉시 허용됨
3. Admin에서 규칙을 수정하고 내 IP 테스트를 통과한 뒤, 마스터 플래그를 다시 ON으로 설정하고 재배포

### ip_cidr 형식

- IPv4 단일 주소: `1.2.3.4` / CIDR: `192.168.0.0/24` / IPv4 전체 허용(드물게): `0.0.0.0/0`
- IPv6 단일 주소: `2001:db8::1` / CIDR: `2001:db8::/32` / IPv6 전체 허용: `::/0`
- IPv4-mapped IPv6(`::ffff:1.2.3.4`)는 IPv4로 취급한다. `0.0.0.0/0`은 IPv6 클라이언트와 일치하지 않으므로
  IPv6 사용자가 있는 스코프에는 IPv6 규칙도 따로 넣는다
- 선행 0(`01.2.3.4`), 범위 초과, 앞뒤 공백, 50자 초과는 400으로 거부한다(Admin API `isValidIpCidr`)
- 해석할 수 없는 클라이언트 IP(헤더 없음·쓰레기 값)는 어떤 규칙과도 일치하지 않는다 → 스코프가 켜져 있으면 차단

### 경로 패턴 매칭 (path 스코프)

요청 경로와 패턴을 모두 정규화한 뒤 비교한다(`normalizeRequestPath`): 퍼센트 디코딩(최대 2회),
역슬래시→슬래시, 중복 슬래시 축약, `.`/`..` 구간 해석, **소문자화**, 끝 슬래시 제거.

| 패턴 | 일치 범위 |
|---|---|
| `/api/login` (정확) | `/api/login` 자체 + 하위 경로(`/api/login/`, `/api/login/x`) — 라우터가 하위 경로도 같은 컨트롤러로 보내므로 |
| `/api/admin/*` | `/api/admin` 자체 + 하위 전체 |
| `/app*` | 정규화한 경로가 `/app`으로 시작 (`/apple`도 포함) |

예전에는 정확 일치만 봐서 `/api/login/`·`/API/login`·`//api/login`으로 path 스코프를 우회할 수 있었다(P0b-03).

### 비(非)자명한 동작 — 수정 시 주의

- **`/private/*` 차단이 IP 체크보다 먼저**: `middleware.js`는 마스터 플래그와 무관하게 `/private/*` 정적 직접 접근을 404로 먼저 차단한다(P0-09). 그 외 요청은 플래그 OFF면 IP 헤더·DB를 건드리지 않고 즉시 통과
- **Edge Middleware가 global scope 전담**: matcher는 넓게 유지하지만 `middleware.js` 내부에서 정적 경로를 제외함. `api/index.js`의 IP 체크는 `/api/*`, `/app/*` 경로에 대한 2차 방어선
- **path 스코프 삭제 시 해당 스코프의 규칙도 함께 삭제**: ON DELETE CASCADE 없이 명시적 DELETE로 처리 (`adminIpWhitelist.js`)
- **`ip_whitelist_scopes` 시드 레코드 삭제 시**: global/protected 스코프 카드가 Admin UI에서 사라짐. `node scripts/migrate-ip-whitelist.js` 재실행으로 복원
- **audit_log action 이름**: `ip_whitelist_rule_added`, `ip_whitelist_rule_updated`, `ip_whitelist_rule_deleted`, `ip_whitelist_scope_toggled`, `ip_whitelist_scope_added`, `ip_whitelist_scope_deleted`
