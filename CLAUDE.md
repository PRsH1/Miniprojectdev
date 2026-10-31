# ProjectImprove — CLAUDE.md

eformsign API 연동 도구 허브 프로젝트입니다.
Vercel 서버리스 환경에서 동작하며, 브라우저 기반 HTML 도구 + Node.js API 서버 구조로 구성되어 있습니다.

---

## 세션 시작 (Agent Startup)

- 모든 세션은 작업을 시작하기 전에 gstack 진입 스킬을 먼저 확인하고 따른다.
  Claude Code에서는 `Skill` 도구로 gstack 스킬을 실행한다(예: `/browse`, `/investigate`).
- gstack 업데이트 확인은 **하루 1회**로 제한한다. 마커 파일
  `~/.claude/.gstack-upgrade-check`의 내용(마지막 확인 날짜, `YYYY-MM-DD`)이 오늘 날짜와
  같으면 이번 세션에서는 업데이트 확인을 건너뛴다. 다르거나 파일이 없으면 아래 절차를
  수행한다.
  1. `/gstack-upgrade` 스킬을 실행한다. 설치 형태(전역/벤더링)를 감지해 새 버전이 있으면
     업그레이드하고 변경 사항을 보여준다.
  2. 확인이 끝나면 마커 파일에 오늘 날짜(`YYYY-MM-DD`)를 기록해 같은 날 재확인을 막는다.
- gstack 스킬이 동작하지 않으면 `cd ~/.claude/skills/gstack && ./setup`으로 복구한다
  (`rules/gstack.md` 참고).
- 작업 목적에 맞는 gstack 스킬을 선택해 해당 절차를 끝까지 수행한다. 스킬 이름만 언급하고
  절차를 생략하지 않는다.
  - 버그 조사: `/investigate`
  - 웹 검증·브라우징: `/browse` 또는 `/qa`
  - 코드 리뷰: `/review`
  - 디자인 검증: `/design-review`
  - 배포 작업: `/ship` 또는 `/land-and-deploy`
- 웹 브라우징과 웹 애플리케이션 검증이 필요할 때는 gstack의 `/browse`를 사용하고,
  `mcp__claude-in-chrome__*` 도구는 사용하지 않는다(`rules/gstack.md`).
- gstack 스킬의 실제 지침과 이 문서의 예시가 다르면 설치된 gstack 스킬을 따른다.

---

## 작업 안전 수칙 (운영 환경)

- **DB는 하나다.** Production·Preview·Development(`vercel dev`)와 로컬 `.env.local`이 모두 같은 Neon DB를 쓴다.
  `scripts/*.js` 실행, Preview에서의 로그인·저장·설정 변경은 곧 운영 데이터 변경이다.
  - 쓰기 스크립트는 dry-run(기본 실행)으로 건수를 먼저 보고, `--apply`·`--force`·마이그레이션은 사용자 승인 후에만 실행한다.
  - DB에 저장하는 형식을 바꾸는 변경은 **현재 Production 코드가 새 형식을 읽지 못하는 기간**(Preview 확인 ~ 머지)이 생긴다.
    하위 호환 읽기를 넣고, 확인 기간에는 테스트 데이터만 쓰도록 안내한다(예: 크리덴셜 `v1:` 형식).
- **push가 곧 배포다.** `main` push = Production 배포, 그 외 브랜치 push = Preview 배포. 둘 다 사용자 확인 후 진행한다.
  main은 `origin`과 `dev` 두 원격에 함께 push한다.
- **검증 기본값**: `npm test`(DB 없이 목으로 실행). push하면 GitHub Actions CI가 `npm test` → `npm run security:secrets` →
  gitleaks 전체 히스토리를 돈다. 테스트용 가짜 시크릿은 항상 `DUMMY-` 접두어를 쓴다.
- **비밀값**: 환경변수·토큰·비밀번호·개인키 값은 출력하거나 커밋하지 않는다. 필요한 것은 길이·형식·존재 여부만 확인한다.
- **대시보드 작업**(환경변수 삭제, WAF/Firewall 규칙)은 코드 배포와 별개이며 사용자가 하거나 명시적으로 승인한 경우에만 한다.

---

@rules/project-structure.md
@rules/tech-stack.md
@rules/core-patterns.md
@rules/open-api-auto-test.md
@rules/open-api-auto-test-v2-plan.md
@rules/open-api-tester.md
@rules/env-vars.md
@rules/error-response.md
@rules/coding-conventions.md
@rules/local-dev.md
@rules/gstack.md
@rules/memberv2.md
@rules/ip-whitelist.md
@rules/credentials.md
@rules/notifications.md
@rules/community.md
