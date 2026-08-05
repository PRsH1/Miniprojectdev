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
