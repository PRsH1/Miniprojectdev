## 로컬 개발

`vercel dev`는 Vercel `Development` 환경 변수를 사용한다.
보호 페이지 테스트 시 아래 변수가 Development 대상에 등록되어 있어야 한다:
`AUTH_COOKIE_VALUE`, `MEMBER_PAGE_PASSWORD`, `APIAUTOTEST_PAGE_PASSWORD`, `TEMPLATECOPY_PAGE_PASSWORD`, `IDP_TEST_PAGE_PASSWORD`

환경 변수 변경 후 로컬 반영 순서:
1. `vercel env pull .env.local`
2. `vercel dev` 재시작
