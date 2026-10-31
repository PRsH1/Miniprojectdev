# ProjectImprove - Codex Instructions

eformsign API 연동 도구 허브 프로젝트다.
Vercel 서버리스 환경에서 동작하며, 브라우저 기반 HTML 도구와 Node.js API 서버로 구성된다.

## Agent Startup

- 모든 Codex agent 세션은 작업을 시작하기 전에 gstack 진입 스킬을 반드시 읽고 따른다.
- 저장소에 `.agents/skills/gstack/SKILL.md`가 있으면 이를 우선 사용하고, 없으면
  `$CODEX_HOME/skills/gstack/SKILL.md` 또는 `~/.codex/skills/gstack/SKILL.md`를 사용한다.
- gstack `SKILL.md`의 preamble을 먼저 실행한 뒤, 현재 작업에 맞는 gstack 스킬을 선택해
  해당 `SKILL.md`의 절차를 끝까지 수행한다. 스킬 이름만 언급하고 절차를 생략하지 않는다.
- 버그 조사에는 `/investigate`, 웹 검증에는 `/browse` 또는 `/qa`, 코드 리뷰에는 `/review`,
  디자인 검증에는 `/design-review`, 배포 작업에는 `/ship` 또는 `/land-and-deploy` 등
  작업 목적에 맞는 gstack 스킬을 사용한다.
- 웹 브라우징과 웹 애플리케이션 검증이 필요할 때는 gstack의 `/browse`를 사용한다.
- gstack 스킬의 실제 지침과 이 문서의 예시가 다르면 설치된 gstack `SKILL.md`를 따른다.

## Project Rules

- `rules/`의 문서는 이 저장소의 상세 작업 규칙이다. 관련 코드를 변경하기 전에 해당 문서를
  읽고 적용한다.
- 모든 작업에서 먼저 다음 공통 규칙을 확인한다.
  - `rules/project-structure.md`
  - `rules/tech-stack.md`
  - `rules/core-patterns.md`
  - `rules/coding-conventions.md`
  - `rules/local-dev.md`
  - `rules/gstack.md`
- 작업 영역에 따라 다음 규칙을 추가로 확인한다.
  - OpenAPI 자동 테스트: `rules/open-api-auto-test.md`,
    `rules/open-api-auto-test-v2-plan.md`, `rules/open-api-tester.md`
  - 환경변수와 오류 응답: `rules/env-vars.md`, `rules/error-response.md`
  - 회원 관리: `rules/memberv2.md`
  - IP 화이트리스트: `rules/ip-whitelist.md`
  - 자격 증명과 보안: `rules/credentials.md`
  - 알림: `rules/notifications.md`
  - 커뮤니티: `rules/community.md`
- 규칙 문서의 경로, 명령, 구현 설명이 현재 코드와 다르면 추측하지 말고 실제 코드를 확인한다.
  작업 결과와 함께 발견한 불일치를 보고하고, 요청 범위에 포함될 때만 규칙 문서를 갱신한다.

## Operational Safety

- Production·Preview·Development와 로컬 `.env.local`은 모두 같은 Neon DB를 쓴다. `scripts/*.js` 실행이나 Preview에서의
  저장·설정 변경은 운영 데이터 변경이다. 쓰기 스크립트는 dry-run을 먼저 보고, `--apply`·`--force`·마이그레이션은 사용자 승인 후 실행한다.
- DB 저장 형식을 바꾸면 Preview 확인 ~ 머지 사이에는 현재 Production 코드가 새 형식을 읽지 못한다. 하위 호환 읽기를 넣는다.
- `main` push는 Production 배포, 그 외 브랜치 push는 Preview 배포다. 둘 다 사용자 확인 후 진행하며 main은 `origin`·`dev`에 함께 push한다.
- push 시 GitHub Actions CI가 `npm test` → `npm run security:secrets` → gitleaks 전체 히스토리를 실행한다. 테스트용 가짜 시크릿은 `DUMMY-` 접두어를 쓴다.
- Vercel 대시보드 작업(환경변수 삭제, WAF/Firewall 규칙)은 사용자가 하거나 명시적으로 승인한 경우에만 한다.

## Implementation Expectations

- 기존 구조, 라우팅 방식, 공용 헬퍼와 코딩 컨벤션을 우선 재사용한다.
- Vercel 서버리스 제약과 브라우저 기반 HTML 도구의 실행 방식을 유지한다.
- 환경변수, 토큰, 비밀번호, 개인 키 등 비밀값을 코드나 문서에 추가하지 않는다.
- 변경 범위에 맞는 테스트를 실행한다. JavaScript 백엔드 변경의 기본 검증은 `npm test`다.
- 브라우저 동작을 변경한 경우 gstack으로 실제 사용자 흐름과 반응형 화면을 검증한다.
- 사용자가 명시적으로 요청하지 않은 관련 없는 리팩터링이나 의존성 변경은 하지 않는다.
