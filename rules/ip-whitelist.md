## IP 화이트리스트

DB 기반 IP 접근 제어 기능. 스코프 단위로 독립 활성화/비활성화 가능.

---

### 아키텍처

```
모든 요청
    ↓
middleware.js (Vercel Edge Middleware)   ← 정적 파일보다 먼저 실행
    ↓ global scope 체크 → 차단 시 403
    ↓
Vercel 라우팅
    ├── /api/*, /app/* → api/index.js
    │       ↓ path scope 체크 (api/index.js)
    │       └── /app/* → auth-middleware.js
    │               ↓ protected scope 체크
    └── 정적 파일 → Vercel CDN 서빙
```

### 스코프 3종

| 스코프 | 적용 범위 | 체크 위치 |
|---|---|---|
| `global` | 전체 사이트 (정적 파일 포함) | `middleware.js` |
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
| `controllers/_shared/ip-whitelist.js` | CIDR 매칭 + 60초 TTL 캐시 공통 모듈 |
| `controllers/adminIpWhitelist.js` | Admin REST API (규칙/스코프 CRUD + IP 테스트) |
| `scripts/migrate-ip-whitelist.js` | DB 테이블 생성 + 시드 마이그레이션 |
| `private/Admin.html` | Admin UI — IP 화이트리스트 탭 |

### Admin API 엔드포인트

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | `/api/admin/ip-whitelist` | 전체 스코프 + 규칙 조회 |
| POST | `/api/admin/ip-whitelist/rules` | 규칙 추가 |
| PATCH | `/api/admin/ip-whitelist/rules/:id` | 규칙 수정 |
| DELETE | `/api/admin/ip-whitelist/rules/:id` | 규칙 삭제 |
| PUT | `/api/admin/ip-whitelist/scopes/:id` | 스코프 활성화/비활성화 |
| POST | `/api/admin/ip-whitelist/scopes` | path 스코프 추가 |
| DELETE | `/api/admin/ip-whitelist/scopes/:id` | path 스코프 삭제 (path 타입만) |
| POST | `/api/admin/ip-whitelist/test` | IP 허용 여부 테스트 |

---

### 동작 원칙

**Fail-open**: DB 오류 시 차단하지 않고 허용 — 서비스 가용성 우선

**캐시**:
- `controllers/_shared/ip-whitelist.js`: 모듈 수준 캐시 60초 TTL
- `middleware.js`: Edge Worker 인스턴스 수준 캐시 60초 TTL
- Admin write 시 서버 캐시는 `invalidateCache()` 즉시 무효화. Edge Worker 캐시는 최대 60초 후 갱신

**스코프 활성 + 규칙 없음 = 전체 차단**:
- Admin UI에서 규칙을 먼저 추가한 뒤 스코프를 활성화하도록 경고 표시

**로컬호스트 자동 허용**:
- `127.0.0.1`, `::1` 은 global scope 활성화 여부와 무관하게 항상 허용
- `vercel dev` 환경에서 자기 자신이 잠기는 문제 방지

### ip_cidr 형식

- IPv4 단일 주소: `1.2.3.4`
- CIDR 표기: `192.168.0.0/24`
- 전체 허용(드물게): `0.0.0.0/0`

### 비(非)자명한 동작 — 수정 시 주의

- **Edge Middleware가 global scope 전담**: `middleware.js`가 정적 파일 포함 모든 요청에 적용됨. `api/index.js`의 IP 체크는 `/api/*`, `/app/*` 경로에 대한 2차 방어선
- **path 스코프 삭제 시 해당 스코프의 규칙도 함께 삭제**: ON DELETE CASCADE 없이 명시적 DELETE로 처리 (`adminIpWhitelist.js`)
- **`ip_whitelist_scopes` 시드 레코드 삭제 시**: global/protected 스코프 카드가 Admin UI에서 사라짐. `node scripts/migrate-ip-whitelist.js` 재실행으로 복원
- **audit_log action 이름**: `ip_whitelist_rule_added`, `ip_whitelist_rule_updated`, `ip_whitelist_rule_deleted`, `ip_whitelist_scope_toggled`, `ip_whitelist_scope_added`, `ip_whitelist_scope_deleted`
