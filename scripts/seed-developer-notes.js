/**
 * scripts/seed-developer-notes.js
 * 프로젝트 개발 이력을 developer_notes 테이블에 버전별로 삽입
 *
 * 실행 방법:
 *   node scripts/seed-developer-notes.js
 *   (또는) POSTGRES_URL="..." node scripts/seed-developer-notes.js
 *
 * 재실행 시: 기존 노트를 전체 삭제 후 재삽입합니다.
 */

// .env.local 수동 파싱 (dotenv 패키지 없이)
const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach(line => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m && !process.env[m[1].trim()]) {
      process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  });
}
const { neon } = require('@neondatabase/serverless');

const NOTES = [
  // ──────────────────────────────────────────────────────────────
  // v0.x — DB 인증 도입 이전 단계별 확장
  // ──────────────────────────────────────────────────────────────
  {
    version: 'v0.1',
    title: '프로젝트 초기 구성',
    pinned: false,
    created_at: '2025-05-16',
    content: `## 개요

eformsign API 연동 도구 허브 프로젝트의 첫 번째 버전입니다.
Vercel 서버리스 환경 위에 브라우저 기반 HTML 도구 + Node.js API 서버 구조로 시작했습니다.

## 초기 포함 기능

- **임베딩 도구** — 문서·템플릿 임베딩 (SaaS, CSAP 환경 지원)
- **API(JS,HTML)/** — 문서 발송·조회·다운로드 기초 도구
- ECDSA 서명 기반 Access Token 발급 로직
- Bearer / Signature 인증 방식 선택
`,
  },
  {
    version: 'v0.2',
    title: '임베딩·멤버 관리 기능 확장',
    pinned: false,
    created_at: '2025-07-15',
    content: `## 개요

임베딩 도구를 확장하고, eformsign 멤버 관리 API를 처음으로 추가했습니다.

## 주요 변경사항

### 임베딩 도구 확장
- CSAP 전용 임베딩 샘플 추가
- 외부자 작성(embedding_post) 로직 추가 — prefill, layout, action callback 지원
- 템플릿 관리 임베딩에도 동일 로직 적용
- Bearer token 인증 방식 추가

### 멤버 관리 초기 기능
- 구성원 목록 조회 API (JSON / TABLE 뷰 전환)
- 그룹 추가·수정·삭제 API 기능 추가
- Custom URL 입력 지원
`,
  },
  {
    version: 'v0.3',
    title: '유틸리티 도구 확장 — Webhook, RSA, 타임스탬프, SMTP',
    pinned: false,
    created_at: '2025-09-28',
    content: `## 개요

Webhook 수신, RSA/ECDSA 서명 테스트, 타임스탬프 변환 등 독립 유틸리티 도구들을 추가하고
Pusher 기반 실시간 웹훅 수신 기능을 서버에 구현했습니다.

## 추가된 유틸리티 도구

| 도구 | 설명 |
|------|------|
| \`utils/webhook.html\` | Pusher 기반 웹훅 이벤트 실시간 수신·모니터링 |
| \`utils/RsaTestSample.html\` | RSA/ECDSA 키 생성·서명·검증 테스트 |
| \`utils/timestamp.html\` | Unix 타임스탬프 ↔ 날짜 상호 변환 |
| \`utils/smtp.html\` | SMTP 이메일 발송 테스트 |

## 웹훅 서버 구현

- \`controllers/webhook-receiver.js\` — Webhook 수신 후 Pusher 브로드캐스트
- 상태별 필터 기능 추가
- 문서 정보 조회 기능 Webhook 연동

## 임베딩 개선

- \`success_callback\` 관련 로직 수정 (임베딩 종료 처리)
- 문서 전송 임시저장 기능 추가
`,
  },
  {
    version: 'v0.4',
    title: 'Vercel 서버리스 구조 개선 + 유틸 확충',
    pinned: false,
    created_at: '2025-11-07',
    content: `## 개요

Vercel 환경에 맞는 CJS 방식으로 서버 코드를 전면 수정하고,
Base64 변환, 템플릿 복제 등 유틸리티 도구를 추가했습니다.

## 서버 구조 개선

- Vercel 배포 환경에 맞는 CommonJS(CJS) 방식으로 전환
- \`api/index.js\` 단일 라우터 구조 정비

## 추가된 유틸리티 도구

| 도구 | 설명 |
|------|------|
| \`utils/base64.html\` | Base64 인코딩/디코딩 |
| \`utils/templateDeletetool.html\` | 템플릿 일괄 삭제 |
| \`controllers/templatecopy.js\` | 템플릿 복제 도구 (인증 보호) |

## index.html UI 개선

- 도구 카드 레이아웃 개선
- 템플릿 복제·삭제 도구 링크 추가

## 로그인 페이지 개선

- \`auth/login.html\` UI 개선 및 안내 문구 정비
`,
  },
  {
    version: 'v0.5',
    title: 'Open API 자동 테스트 초기 버전 + 일괄 문서 처리 API',
    pinned: false,
    created_at: '2025-12-05',
    content: `## 개요

OPA 번호 기준으로 eformsign Open API를 자동 검증하는 테스트 러너(OpenAPIAutoTest) 초기 버전을 구현했습니다.
완료 문서 일괄 전송·다운로드, 회사도장 조회 API도 추가했습니다.

## Open API 자동 테스트 (초기 버전)

- OPA 번호 단위로 생성 → 검증 → 정리 단계를 자동 실행
- 비밀번호 보호 페이지(\`/api/OpenAPIAutoTest\`)로 서빙
- scope 방식(Signature / Bearer) 인증 지원

## 일괄 문서 처리 API 추가

| 기능 | 설명 |
|------|------|
| 멤버 일괄 추가 | 멤버 일괄 추가 API 테스트 목록에 추가, JS 파일 분리 |
| 완료 문서 일괄 전송 | 완료 토큰 기한 연장 API 추가 |
| 문서 파일 일괄 다운로드 | 문서 파일 다운로드 배치 처리 |
| 그룹 관련 API | 일괄 작성(멀티 템플릿) API 추가 |
| 회사도장 조회 | OPA2_025~029 회사도장 관련 API 추가 |

## SMTP 유틸 개선

- 테스트 가능한 API 목록 보기 기능 추가
- SMTP 안내 문구 추가
`,
  },
  {
    version: 'v0.6',
    title: 'SAML 2.0 SSO 연동 + IdP 테스트 페이지',
    pinned: false,
    created_at: '2026-01-17',
    content: `## 개요

samlify 라이브러리를 사용해 SAML 2.0 SSO 연동을 구현했습니다.
SP 시작 및 IdP 시작 플로우를 모두 지원하며, IdP 테스트 페이지를 추가했습니다.

## SAML 2.0 SSO

- \`lib/saml.js\` — samlify 기반 IdP/SP 설정
- \`controllers/auth.js\` — SAML 응답 생성
- \`controllers/sso-login.js\` — SAML SSO 로그인 폼
- \`controllers/idp-initiated-login.js\` — IdP 개시 SAML 플로우
- \`controllers/metadata.js\` — SAML 메타데이터 XML 엔드포인트

## IdP 테스트 페이지

- \`idp-test.html\` — IdP 테스트 UI (비밀번호 보호)
- \`controllers/idptestauth.js\` — IdP 테스트 페이지 서빙

## Vercel 서버리스 구조 전면 재정비

- Vercel Serverless Function 제한에 따른 프로젝트 구조 변경
- \`api/index.js\` — lazy-loading 기반 단일 라우터로 통합
- 컨트롤러 파일 분리 + \`cookie\` 패키지 기반 세션 처리

## 기타

- 임베딩 페이지 deprecated 처리, IdP SSO 테스트 페이지 링크 추가
- \`is_noti_ignore\` 기능 추가
`,
  },
  {
    version: 'v0.7',
    title: '문서 일괄 삭제·다운로드 + Custom URL 지원 확대',
    pinned: false,
    created_at: '2026-02-10',
    content: `## 개요

문서 일괄 삭제·다운로드 유틸리티를 추가하고, 다운로드/조회 API에 Custom URL(On-Premise) 지원을 추가했습니다.
Vercel Web Analytics도 연동했습니다.

## 추가된 유틸리티 도구

| 도구 | 설명 |
|------|------|
| \`utils/DocumentDelete.html\` | 문서 목록 조회 후 조건에 맞는 문서 일괄 삭제 |
| \`utils/MassDocumentDownload.html\` | 문서 일괄 다운로드 (대용량 방어 로직 포함) |

## Custom URL (On-Premise) 지원 확대

- 다운로드 API에 Custom URL 입력 기능 추가
- 문서 목록 조회 UI에 Custom URL 적용
- 대용량 삭제 시 토큰 갱신 방어 로직 추가

## 서버 개선

- \`api/index.js\` — lazy loading 적용 (cold start 개선)
- \`controllers/downloadDocument.js\` / \`getDocumentInfo.js\` — Access Token 발급 방식 개선

## Vercel Web Analytics 연동

- \`@vercel/analytics\` 패키지 추가

## JSON/XML Formatter 초기 버전

- \`utils/JsonToPretty.html\` — JSON/XML 포맷 정리 (초기 구현)
- 에러 체킹, 텍스트 영역 확대, 트리 구조 보기 기능
`,
  },
  {
    version: 'v0.8',
    title: 'Open API Tester (Beta) 초기 구현',
    pinned: false,
    created_at: '2026-03-19',
    content: `## 개요

Postman 스타일의 eformsign Open API 테스터(Beta) 초기 버전을 추가했습니다.
단일 파일에서 시작해 JS 모듈 분리까지 진행했습니다.

## Open API Tester 신규 추가

- \`API(JS,HTML)/OpenAPITester.html\` — Postman 스타일 API 테스터 (Beta) 초기 버전
- OPA2 번호 기반 사이드바, API 선택 → 요청 빌더 → 응답 뷰어 흐름
- 예시 응답(성공/실패) 구조 미리보기

## 기능 대폭 확장 (2026-03-20 ~ 25)

- **JS 파일 분리**: \`assets/js/openapi/\` — \`api-list.js\`, \`api-specs.js\`, \`state.js\`, \`ui.js\`, \`init.js\`
- **Code Snippet 추가**: cURL / JS(fetch) / JS(jQuery) / Python / Java 자동 생성
- **파일 다운로드**: "Send and Download" — 응답을 파일로 저장
- **Path/Query 탭 분리**: 경로 파라미터와 쿼리 파라미터 입력 UI 분리
- **DELETE with Body 수정**: DELETE 메서드도 Body 포함하여 전송 (OPA2_009, OPA2_020 등)
- **API 명세 확인 기능**: 헤더·Path/Query 파라미터·Body·응답 필드·에러 코드 명세 조회 모달
- **비고 컬럼**: \`note\` 필드가 있을 때 자동 표시
- **사이드바 정렬 토글**: 그룹별 / 코드순 / Method별 전환
- **OPA2_046~052 신규 API 추가**: 회사·문서 관리자 관련 API

## 예시 응답 전면 확충

OPA2_001~031, OPA2_037~052 전체 API에 성공/실패 예시 응답 추가 완료.
`,
  },
  {
    version: 'v0.9',
    title: 'Protected Page 리팩터 + 파비콘 + 모바일 반응형 + OpenAPIAutoTest UI 개선',
    pinned: false,
    created_at: '2026-03-29',
    content: `## 개요

보호 페이지 구조를 공통화하고, 파비콘 및 모바일 반응형 대응을 추가했습니다.
OpenAPIAutoTest UI도 개선했습니다.

## Protected Page 리팩터 (2026-03-26)

- 보호 페이지 설정을 \`controllers/_shared/protected-pages-config.js\`로 공통화
- 보호 페이지 공통 핸들러를 \`controllers/_shared/protectedPage.js\`로 분리
- \`member\`, \`apiautotest\`, \`templatecopy\`, \`idptestauth\` 페이지가 동일 설정 공유

## 파비콘 추가 (2026-03-28)

- \`/favicon.svg\` 신규 생성 — 프로젝트 블루(\`#1a73e8\`) 배경의 플러그 아이콘 SVG
- 전체 HTML 파일 31개에 절대경로 파비콘 일괄 추가

## Open API Tester — 모바일 반응형 (2026-03-28)

- \`@media (max-width: 640px)\`에서 사이드바가 슬라이드 드로어로 전환
- 햄버거(\`#btnMenu\`) 버튼 + 배경 오버레이로 열기/닫기
- 터치 타겟 최소 44×44px 보장, 인증 패널 그리드 1열 전환

## OpenAPIAutoTest UI 개선 (2026-03-29)

- 상세 패널 제목이 실제 API 이름(\`OPA XXX — API 이름\`)으로 동적 표시
- 누락된 설정을 완전히 독립된 \`<section>\`으로 분리
- 가이드 내용을 \`hydrateGuideContent()\` JS 함수에서만 관리하도록 단일 소스화
- OPA 037 \`pdfTargetPhone\` 필수 해제, \`globalChecks()\` "주 템플릿" 항목 제거
`,
  },
  // ──────────────────────────────────────────────────────────────
  // v1.x — DB 인증 시스템 도입 이후
  // ──────────────────────────────────────────────────────────────
  {
    version: 'v1.0',
    title: 'DB 기반 인증/권한 시스템 전면 도입',
    pinned: false,
    created_at: '2026-04-18',
    content: `## 개요

기존 페이지별 비밀번호 + 공유 쿠키 방식을 완전히 교체하여 DB 기반 JWT 인증 시스템을 구축했습니다.
이 버전부터 **로그인 계정 기반** 접근 제어가 적용됩니다.

## 핵심 변경사항

- **Vercel Postgres (Neon) 연동**: \`users\`, \`refresh_tokens\`, \`protected_pages\`, \`audit_logs\`, \`signup_requests\` 테이블
- **JWT 하이브리드 세션**: 액세스 토큰(1시간) + 리프레시 토큰(7일, DB 저장, 로테이션)
- **역할 기반 접근 제어(RBAC)**: \`admin\` / \`manager\` / \`user\` 3단계 계층
- **보호 페이지 URL 구조 변경**: \`/memberV2\` → \`/app/memberV2\` 등 \`/app/*\` 프리픽스 통일
- **보호 페이지 동적 관리**: Admin UI에서 런타임 추가 가능

## 관리자 콘솔 (/app/admin)

| 탭 | 기능 |
|---|---|
| 회원가입 요청 | 대기 요청 목록, 승인/거절 처리 |
| 사용자 관리 | 계정 생성, 역할 변경, 활성/비활성, 잠금 해제, 비밀번호 초기화 |
| 보호 페이지 | 페이지 등록, 접근 권한 변경 |
| 감사 로그 | 전체 액션 기록, 날짜/사용자/action 필터, 페이지네이션 |

## 보안 기능

- 로그인 5회 실패 시 30분 계정 잠금 (관리자 수동 해제 가능)
- 비밀번호 초기화 후 강제 변경 (\`must_change_password\`)
- 모든 주요 액션 감사 로그 기록
- 감사 로그 7일 보존 — Vercel Cron Job 자동 삭제

## index.html 변경

- \`/api/me\` 기반 로그인 상태 감지
- 역할별 도구 카드 가시성 3단계 동적 처리:
  - **자동 매칭**: \`data-original-url\` ↔ \`protected_pages.file_path\` 비교
  - **\`data-protected-path\`**: DB 기반 동적 제어
  - **\`data-min-role\`**: 하드코딩 정적 제어
- admin 로그인 시 "관리자 콘솔" 버튼 자동 표시
`,
  },
  {
    version: 'v1.1',
    title: '전 페이지 로그인 상태 바 + 크리덴셜 저장/불러오기 + OpenAPITester 히스토리 DB 저장',
    pinned: false,
    created_at: '2026-04-19',
    content: `## 개요

v1.0에서 도입한 인증 시스템을 모든 도구 페이지에 연결하고,
eformsign API 인증 정보를 DB에 저장·재사용할 수 있는 크리덴셜 기능을 추가했습니다.

## 전 페이지 로그인 상태 상단 바

\`assets/js/auth-status.js\` 공통 스크립트로 모든 도구 페이지에 적용.

**3가지 모드**:
- **기본 (상단 바)**: \`position:fixed\` 파란 바 자동 삽입
- **코너 모드** (\`window.AUTH_STATUS_CORNER = true\`): 우측 하단 플로팅 패널
- **인라인 모드** (\`window.AUTH_STATUS_INLINE = true\`): \`#authStatusBar\` 요소에 직접 렌더링

**적용 범위**: \`utils/\` 12개, \`API(JS,HTML)/\` 7개, \`Embedding/\` 8개, 보호 페이지 전체

## eformsign 크리덴셜 저장/불러오기

로그인한 사용자가 eformsign API 인증 정보를 이름 붙여 DB에 저장·재사용.

- **신규 DB 테이블**: \`eformsign_credentials\`
- **API**: \`GET/POST/DELETE /api/credentials\` — 사용자별 완전 격리
- **공유 모듈**: \`assets/js/credential-panel.js\` (IIFE) — 17개 이상 도구 페이지에 적용
- **보안**: 목록 조회 시 비밀 키 미반환 (\`has_secret_key: boolean\`만)
- **CSS 격리**: 모달 내 요소에 \`all:revert\` 적용

## OpenAPITester 히스토리 DB 저장

| 사용자 상태 | 저장소 |
|---|---|
| 비로그인 | \`localStorage\` |
| 로그인 | DB \`api_request_history\` 테이블 |

- 100건 제한, 초과 시 서버에서 자동 삭제
- 메모리 캐시(\`historyCache\`) 패턴으로 기존 동기 코드 구조 유지

## OpenAPITesterFull.html 추가


`,
  },
  {
    version: 'v1.2',
    title: 'IP 화이트리스트 + Body JSON 실시간 검증 + MemberV2 기능 보강',
    pinned: false,
    created_at: '2026-04-21',
    content: `## 개요

DB 기반 IP 접근 제어 기능을 추가하고, OpenAPITester Body 에디터에 실시간 JSON 검증을 구현했습니다.

## IP 화이트리스트 기능

스코프 단위로 독립 활성화/비활성화 가능한 IP 접근 제어.

**아키텍처**:
\`\`\`
모든 요청 → middleware.js (Edge Middleware)
    ↓ global scope 체크
Vercel 라우팅
    ├── /api/*, /app/* → api/index.js (path scope 체크)
    │       └── /app/* → auth-middleware.js (protected scope 체크)
    └── 정적 파일 → Vercel CDN
\`\`\`

**스코프 3종**:

| 스코프 | 적용 범위 | 체크 위치 |
|---|---|---|
| \`global\` | 전체 사이트 (정적 파일 포함) | \`middleware.js\` |
| \`path\` | 특정 경로 패턴 | \`api/index.js\` |
| \`protected\` | 보호 페이지 (\`/app/*\`) | \`auth-middleware.js\` |

**동작 원칙**:
- Fail-open: DB 오류 시 차단하지 않고 허용 (서비스 가용성 우선)
- 캐시 60초 TTL, Admin write 시 즉시 무효화
- 로컬호스트(\`127.0.0.1\`, \`::1\`) 자동 허용

## OpenAPITester — Body JSON 실시간 검증

- Body 탭 입력 시 300ms debounce 후 자동 유효성 검사
- 유효한 JSON → 초록 테두리
- 유효하지 않은 JSON → 빨간 테두리 + 에러 메시지 + **물결 밑줄** (Backdrop Overlay 기법)
- \`Ctrl+Shift+F\` 단축키로 Format JSON
- API 선택 변경 시 에러 상태 자동 초기화

## MemberV2 기능 보강

- 구성원 목록 페이지네이션 + 쿼리파라미터 기반 조회 추가
- 공용 크리덴셜(\`credential-panel.js\`) 연동
- 엑셀 업로드 버그 수정 (멤버 추가 일괄 처리)
`,
  },
  {
    version: 'v1.3',
    title: '관리자 알림(Notification Bell) + 크리덴셜 암호화 + 알림 삭제',
    pinned: false,
    created_at: '2026-04-24',
    content: `## 개요

admin에게 주요 이벤트를 실시간으로 알려주는 알림 시스템을 추가하고,
크리덴셜 비밀 키를 AES-256-GCM으로 암호화하여 보안을 강화했습니다.

## 관리자 알림(Notification Bell)

**DB 테이블**: \`notifications\` — \`type\`, \`target_role\`, \`reference_id\`, \`title\`, \`body\`, \`is_read\`

**API 엔드포인트** (\`/api/notifications\`, admin 전용):

| 메서드 | 경로 | 설명 |
|---|---|---|
| GET | \`/api/notifications\` | 미읽음 count + 최신 30건 목록 |
| PATCH | \`/api/notifications/read\` | 전체 읽음 처리 |
| PATCH | \`/api/notifications/:id/read\` | 단건 읽음 처리 |
| DELETE | \`/api/notifications/:id\` | 단건 삭제 |
| DELETE | \`/api/notifications\` | 전체 삭제 |

**프론트엔드 — 2파일 구조**:

| 파일 | 설명 |
|---|---|
| \`auth-status.js\` | 상단 바에 벨 통합. admin + 기본 모드에서만 활성화 |
| \`notification-bell.js\` | \`index.html\` 전용 독립 모듈 (IIFE → \`window.NotifBell\`) |

- 60초 폴링으로 미읽음 배지 자동 갱신
- 항목 클릭 시 단건 읽음 처리 후 연관 페이지 이동

**현재 알림 타입**:

| type | 발생 시점 |
|---|---|
| \`signup_request\` | 회원가입 요청 접수 |
| \`bug_report\` | 버그 제보 접수 |

## 알림 삭제 기능

- 항목 우측 **X 버튼**: 해당 항목 즉시 제거, 미읽음 배지 즉시 감소
- **전체 삭제** 버튼: 알림 하나 이상 있을 때만 노출
- 항목 모두 삭제 시 "알림이 없습니다." 빈 상태로 즉시 전환 (API 재호출 없음)

## 크리덴셜 비밀 키 AES-256-GCM 암호화

- **암호화 키**: \`CREDENTIAL_ENCRYPTION_KEY\` 환경변수 (32바이트 hex)
- **저장 형식**: \`{iv_hex}:{authTag_hex}:{ciphertext_hex}\`
- **복호화 시점**: 단건 조회(\`GET /api/credentials/:id\`) 시 서버에서 복호화 후 반환
- \`null\` 처리: 비밀 키 미저장 크리덴셜은 암호화/복호화 대상 제외

## 크리덴셜 저장 모달 환경 선택 개선

- 저장 모달에 환경 선택 드롭다운 추가 (운영 SaaS / 공공 CSAP / 직접 입력)
- 직접 입력 선택 시 Custom URL 입력 필드 동적 표시
- 불러오기 모달: \`custom\` 환경 항목에 실제 URL 표시 (\`직접 입력 · {url}\`)
`,
  },
  {
    version: 'v1.4',
    title: '커뮤니티 기능 — 개발자 노트 + 버그 리포트 게시판',
    pinned: true,
    created_at: '2026-04-25',
    content: `## 개요

index.html 유틸리티 섹션 아래에 "커뮤니티" 섹션을 신설했습니다.
두 가지 기능을 추가했습니다.

## 개발자 노트 (\`/community/developer-notes.html\`)

- **읽기**: 누구나 (public)
- **쓰기/수정/삭제**: admin만
- **내용 형식**: 마크다운 (marked.js CDN) — 상단 고정(pinned), 버전 배지 지원
- 긴 노트 펼침/접기 UI

## 버그 리포트 게시판 (\`/community/bug-report.html\`)

- **제보**: 로그인 사용자만 (스팸 방지)
- **관리**: Admin Console → 버그 리포트 탭
- 제보 시 \`notifications\` 테이블에 \`bug_report\` 타입 알림 자동 생성 → admin 벨 아이콘 알림
- 알림 클릭 시 \`/app/admin?tab=bug-reports\` 이동

## DB 테이블

| 테이블 | 주요 컬럼 |
|--------|-----------|
| \`developer_notes\` | \`id, title, content(TEXT), version, author_id(UUID FK), pinned, created_at, updated_at\` |
| \`bug_reports\` | \`id, title, description, reporter_user_id(UUID FK), severity(low/normal/high/critical), status(open/in-progress/resolved/closed), admin_note\` |

## 비고 — PATCH 우회 경로

로컬 \`vercel dev\` 환경에서 PATCH + JSON body 요청이 완료되지 않는 문제가 확인되어
\`POST /:id/update\` 보조 경로를 추가했습니다. 두 경로는 동일한 핸들러를 공유합니다.


`,
  },
];

async function seed() {
  if (!process.env.POSTGRES_URL) {
    console.error('❌ POSTGRES_URL 환경변수가 설정되지 않았습니다.');
    process.exit(1);
  }

  const sql = neon(process.env.POSTGRES_URL);

  // admin 계정 조회
  const admins = await sql`SELECT id, username FROM users WHERE role = 'admin' LIMIT 1`;
  if (admins.length === 0) {
    console.error('❌ admin 계정을 찾을 수 없습니다. 먼저 create-admin.js를 실행하세요.');
    process.exit(1);
  }
  const adminId = admins[0].id;
  console.log(`✓ admin 계정 확인: ${admins[0].username} (${adminId})`);

  // 기존 노트 전체 삭제 후 재삽입
  const existing = await sql`SELECT COUNT(*) as cnt FROM developer_notes`;
  if (parseInt(existing[0].cnt) > 0) {
    await sql`DELETE FROM developer_notes`;
    console.log(`  ✓ 기존 ${existing[0].cnt}개 노트 삭제 완료`);
  }

  console.log(`\n총 ${NOTES.length}개 버전 노트를 삽입합니다...\n`);

  for (const note of NOTES) {
    await sql`
      INSERT INTO developer_notes (title, content, version, author_id, pinned, created_at, updated_at)
      VALUES (
        ${note.title},
        ${note.content},
        ${note.version},
        ${adminId},
        ${note.pinned},
        ${note.created_at}::date,
        ${note.created_at}::date
      )
    `;
    console.log(`  ✓ ${note.version} — ${note.title}`);
  }

  console.log('\n✅ 개발자 노트 시드 완료!');
}

seed().catch(err => {
  console.error('❌ 오류:', err.message);
  process.exit(1);
});
