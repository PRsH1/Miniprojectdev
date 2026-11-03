## 커뮤니티 기능 (개발자 노트 + 버그 리포트)

index.html "커뮤니티" 섹션의 두 기능. 실제 HTML 파일은 `community/` 디렉토리에 위치하며 `utils/*.html`은 리디렉트 스텁.

**DB 테이블:** `developer_notes`, `bug_reports`

```
developer_notes: id, title, content(TEXT), version, author_id(UUID FK→users), pinned, created_at, updated_at
bug_reports:     id, title, description, reporter_user_id(UUID FK→users), reporter_name, reporter_email,
                 page_url, severity(low/normal/high/critical), status(open/in-progress/resolved/closed),
                 cause(TEXT), action_taken(TEXT), admin_note, created_at, updated_at
```

**마이그레이션:**
```bash
POSTGRES_URL="..." node scripts/migrate-community.js    # 최초 1회 (developer_notes, bug_reports)
node scripts/migrate-bug-reports-v2.js                  # bug_reports.cause/action_taken + notifications.target_user_id 추가
                                                        # (migrate-notifications.js 이후에 실행)
```

---

### API — 개발자 노트 (`controllers/developer-notes.js`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| GET | `/api/developer-notes` | public | 목록 (pinned 우선, 정렬 파라미터 화이트리스트 적용) |
| GET | `/api/developer-notes/:id` | public | 단건 |
| POST | `/api/developer-notes` | admin | 작성 |
| PATCH | `/api/developer-notes/:id` | admin | 수정 (표준) |
| POST | `/api/developer-notes/:id/update` | admin | 수정 (PATCH 우회 — Admin Console 실제 사용 경로) |
| DELETE | `/api/developer-notes/:id` | admin | 삭제 |

---

### API — 버그 리포트 (`controllers/bug-reports.js`)

| 메서드 | 경로 | 인증 | 설명 |
|--------|------|------|------|
| POST | `/api/bug-reports` | 로그인 사용자 | 제보 + notifications INSERT (`bug_report` 타입). 제목 256·설명 10,000·URL 512자, 24시간 20건 초과 시 400 (`rules/error-response.md` 한도 표) |
| GET | `/api/bug-reports/mine` | 로그인 사용자 | 본인 제보 목록 (cause·action_taken 포함) |
| GET | `/api/bug-reports/mine/:id` | 로그인 사용자 | 본인 제보 단건 상세 (`WHERE reporter_user_id = me` 강제) |
| GET | `/api/bug-reports` | admin | 목록 (status/severity 필터) |
| GET | `/api/bug-reports/:id` | admin | 단건 |
| PATCH | `/api/bug-reports/:id` | admin | 상태/원인/조치/메모 수정 (표준) |
| POST | `/api/bug-reports/:id/update` | admin | 상태/원인/조치/메모 수정 (PATCH 우회 — Admin Console 실제 사용 경로) |
| DELETE | `/api/bug-reports/:id` | admin | 삭제 |

라우팅 주의: `mine` 경로가 `/:id` 패턴보다 먼저 매칭되도록 순서 배치.

**`/update` 우회 경로 존재 이유:**
로컬 `vercel dev` 환경에서 PATCH + JSON body 요청이 완료되지 않는 문제로 추가. 컨트롤러 내부에서 `(req.method === 'PATCH' && idMatch) || (req.method === 'POST' && updateMatch)` 조건으로 동일 핸들러 공유. 신규 수정 경로 추가 시 이 패턴을 따를 것.

**인증 헬퍼 패턴:**
- `requireAdmin(req, res)` — admin 역할 필수
- `requireAuth(req, res)` — 역할 무관, 로그인 여부만 확인 (mine 엔드포인트, POST 제보)

**정렬·필터 파라미터 보안 (SQL injection 방지):**
```javascript
const ALLOWED_SORT     = ['created_at', 'updated_at', 'pinned'];
const ALLOWED_DIR      = ['ASC', 'DESC'];
const ALLOWED_SEVERITY = ['low', 'normal', 'high', 'critical'];
const ALLOWED_STATUS   = ['open', 'in-progress', 'resolved', 'closed'];
```

---

### Admin Console 탭 (`private/Admin.html`)

- `bug-reports` 탭 — `TAB_ALIAS['bug-reports'] = 'bug-reports'`
- `loadBugReports(preserveSelection, message)` — 상태/심각도 필터, 행 클릭 시 상세 패널
- 상세 패널은 request sequence 기반 stale response 무시 로직 적용 (race condition 방지)
- 답변 저장: `POST /api/bug-reports/:id/update { status, cause, action_taken, admin_note }` — 4개 필드 일괄 전송
- 라벨: `admin_note` = "내부 메모(제보자 비공개)", 원인·조치 = "(제보자에게 공개)"
- `?tab=bug-reports&report=<id>`로 열면 그 리포트를 선택한다(admin 알림 딥링크)
- 다른 관리자가 처리 중 새 가입 요청·버그·재설정 요청이 들어오면 해당 탭에 "새 항목 있음 · 새로고침" 배너(`rules/notifications.md`)

**`admin_note` 공개 범위 (Q9 결정, P1-18): 관리자 내부 전용.** 제보자에게 가는 응답(POST 접수 결과, `GET /mine`, `GET /mine/:id`)은
SELECT에서 `admin_note`를 빼고 `toReporterView()` 화이트리스트로 한 번 더 거른다. 제보자에게 보이는 관리자 답변은 `cause`·`action_taken`뿐이다.
회귀 테스트: `test/bug-report-privacy.test.js`

---

### `community/bug-report.html` — 탭 통합 구조

`.panel` 안에 탭 헤더 추가 (버그 제보 / 내 제보 목록).

- `#tabSubmit`: 기존 제보 폼 (loginGate + form-shell + success-box)
- `#tabMyList`: 본인 제보 카드 목록 → 클릭 시 상세 뷰 전환 (← 목록으로 버튼)
- 제보 성공 후 자동으로 "내 제보 목록" 탭 전환 + 목록 새로고침
- `#my-reports` 진입 시 목록 탭 자동 활성화, `#my-reports/<id>`면 그 리포트 상세를 바로 연다(알림 클릭 연동, `hashchange`도 처리).
  상세를 열면 해시가 `#my-reports/<id>`, 목록으로 돌아가면 `#my-reports`로 바뀐다(`history.replaceState`)
- 관리자 답변(cause/action_taken) 없으면 "관리자가 검토 중입니다." 안내 — `admin_note`는 표시하지 않는다

**두 커뮤니티 페이지는 auth-status 기본(상단 바) 모드**다(P1-18 — 허브 링크·알림 벨 표시, 코너 모드 아님).
`developer-notes.html` 편집기는 열 때 값과 달라진 내용이 있으면 [취소]·배경 클릭 시 확인창을 띄운다.

**알림 연동 패턴 (bug-reports.js):**
- 제보자 ≠ 처리자일 때만 알림 INSERT (셀프 알림 방지 — 단, 코드 명시는 후속 작업)
- 알림 INSERT는 try-catch로 감싸 실패해도 본 처리는 성공 처리
- 알림 타입 및 이동 경로 → `rules/notifications.md` 참고
