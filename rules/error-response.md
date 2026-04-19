## 에러 응답 처리

요청 유형에 따라 에러 응답을 분기한다.

### 정책

- `/api/*` 요청 → 항상 JSON 에러 반환
- `/app/*` 요청 → HTML 에러 페이지 반환
- 인증이 필요한 페이지에서 인증 없음 → 기존 로그인 리다이렉트 흐름 유지
- 내부 예외 상세·스택·DB 세부 정보·시크릿은 응답 본문에 노출 금지
- 서버 로그로 내부 상세를 남기고, 사용자에게는 이해 가능한 원인과 다음 액션만 전달

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
- 중앙 라우터: `api/index.js`
- 페이지 인증/권한 처리: `controllers/_shared/auth-middleware.js`
