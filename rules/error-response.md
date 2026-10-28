## 에러 응답 처리

요청 유형에 따라 에러 응답을 분기한다.

### 정책

- `/api/*` 요청 → 항상 JSON 에러 반환
- `/app/*` 요청 → HTML 에러 페이지 반환
- 인증이 필요한 페이지에서 인증 없음 → 기존 로그인 리다이렉트 흐름 유지
- 내부 예외 상세·스택·DB 세부 정보·시크릿은 응답 본문에 노출 금지
- 서버 로그로 내부 상세를 남기고, 사용자에게는 이해 가능한 원인과 다음 액션만 전달
- `respondError` options에 `upstream`을 넘기면 외부 API 에러 정보(`code`, `message`, `body`)를 `error.upstream`으로 응답에 포함한다(opt-in). 현재 `getToken.js`에서 eformsign 에러 전달에 사용

### HTML 에러 페이지

`errors/403.html` / `errors/404.html` / `errors/405.html` / `errors/500.html`

페이지 요청에서 해당 상태 코드 발생 시 공통 유틸이 정적 파일을 읽어 반환한다. 파일 읽기 실패 시에도 최소 HTML fallback 응답을 반환한다.

### JSON 에러 포맷

```json
{
  "error": {
    "status": 404,
    "code": "RESOURCE_NOT_FOUND",
    "message": "요청한 리소스를 찾을 수 없습니다.",
    "reason": "대상 데이터가 없거나 이미 삭제되었을 수 있습니다.",
    "action": "입력값을 다시 확인한 뒤 다시 시도하세요."
  }
}
```

### 주요 에러 코드

| 코드 | 기본 상태 | 설명 |
|------|-----------|------|
| `AUTH_REQUIRED` | 401 | 인증이 필요한 API 요청 |
| `TOKEN_INVALID` | 401 | 토큰 형식 오류, 위조, 폐기 등 |
| `TOKEN_EXPIRED` | 401 | 만료된 토큰 |
| `FORBIDDEN` | 403 | 권한 부족 |
| `PAGE_NOT_FOUND` | 404 | 페이지 요청 경로 없음 |
| `RESOURCE_NOT_FOUND` | 404 | API 리소스 없음 |
| `METHOD_NOT_ALLOWED` | 405 | 허용되지 않은 HTTP 메서드 |
| `VALIDATION_FAILED` | 400 | 필수값 누락, 형식 오류, 중복 등 |
| `INTERNAL_ERROR` | 500 | 일반 서버 내부 오류 |
| `DATABASE_ERROR` | 500 | DB 조회/저장 실패 |
| `UPSTREAM_API_ERROR` | 502 | 외부 API/SMTP/Pusher 등 연동 실패 |

### 구현 위치

- 공통 유틸: `controllers/_shared/respond-error.js`
- 중앙 라우터: `api/index.js` — 모든 경로(`/app/*`, cron, notifications, pusher, credentials,
  request-history, admin, 일반 컨트롤러)를 `dispatch()` 하나로 묶고 **단일 try/catch**로 감싼다.
  컨트롤러에서 처리되지 않은 예외는 Vercel 기본 500이 아니라 `INTERNAL_ERROR`(API는 JSON,
  페이지는 HTML)로 응답된다. 응답이 이미 시작된 뒤(`res.headersSent`)의 예외는 로그만 남긴다.
  새 분기를 추가할 때는 반드시 `return await handler(req, res)` 형태로 호출할 것(`await` 누락 시 catch를 벗어남).
- 입력 사전 검증: `controllers/_shared/validate.js` — 경로 id(UUID/INTEGER), `page`(양의 정수),
  날짜(`YYYY-MM-DD`)를 DB에 넘기기 전에 확인해 형식 오류를 500 대신 400 `VALIDATION_FAILED`로 응답한다.
  (`requireUuid(req, res, id, '라벨')`은 실패 시 응답까지 보내고 `false` 반환)
- 입력 길이·건수 한도: `controllers/_shared/input-limits.js`의 `INPUT_LIMITS` 한곳에 모은다(P0b-04).
  한도 초과는 DB에 닿기 전에 **400 `VALIDATION_FAILED`**(건수 제한도 400)로 응답한다.
  `requireMaxLengths(req, res, [{ value, max, label }])`은 실패 시 응답까지 보내고 `false` 반환.

  | 대상 | 한도 |
  |---|---|
  | `POST /api/signup` | 아이디 50자(공백·제어문자 불가), 이메일 255자(형식 검사), 비밀번호 8~256자, 같은 IP 1시간 5건(`audit_logs` 기준), 승인 대기 전체 200건 |
  | `POST /api/password-reset-request` | 아이디 50자. 같은 계정의 `pending` 요청이 있으면 새로 만들지 않음(응답은 동일 200) |
  | `POST /api/bug-reports` | 제목 256자, 설명 10,000자, 페이지 URL 512자, 사용자당 24시간 20건 |
  | 버그 리포트 관리자 수정 | 원인·조치·관리자 메모 각 10,000자 |
  | `POST /api/request-history` | 이름 255자, URL 4,096자, Body 200,000자, path/query/headers 각 100개·직렬화 50,000자, response 요약 10,000자, savedAt 정수 |

  화면 입력란의 `maxlength`(auth/signup·login·change-password, community/bug-report)도 같은 값을 쓴다.
- 페이지 인증/권한 처리: `controllers/_shared/auth-middleware.js`
