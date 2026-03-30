# Member UI Design Guide

## 목적

`private/Member.html`의 기존 API 동작과 DOM 훅을 유지하면서, `design-preview-member.html`의 시각 구조를 실제 운영 화면에 이식한다.

이 문서는 구현 전에 고정해야 하는 디자인 기준과 마크업 이식 원칙을 정리한다.

## 현재 코드 구조 분석

### 1. `private/Member.html`

- 단일 HTML 파일 안에 스타일, 마크업, API 호출 로직이 모두 들어 있는 구조다.
- 주요 기능은 아래 8개 섹션으로 분리되어 있다.
  - `memberAddSection`
  - `memberDeleteSection`
  - `memberUpdateSection`
  - `memberListSection`
  - `groupAddSection`
  - `groupUpdateSection`
  - `groupDeleteSection`
  - `groupListSection`
- 토큰 발급 영역은 `tokenSection`으로 별도 존재한다.
- 화면 전환은 `showSection(id)`가 담당하며, 각 섹션의 `display`를 직접 제어한다.
- 많은 기능이 특정 `id`에 강하게 결합되어 있다.
  - 예: `#accessToken`, `#envSelection`, `#optionalFields`, `#excelUploadSection`
- 버튼은 대부분 `onclick="..."` 인라인 핸들러를 사용한다.
- 부가 UI는 jQuery `slideToggle()`과 `.text()` 변경으로 상태를 표현한다.

즉, 이번 작업은 JS 구조를 갈아엎는 작업이 아니라, 기존 `id`, `name`, `onclick`, 결과 출력 영역을 유지한 채 레이아웃과 스타일만 재구성해야 한다.

### 2. `design-preview-member.html`

- 좌측 고정 사이드바 + 우측 메인 작업 영역의 admin tool 패턴이다.
- 상단 토큰 상태 패널이 사이드바에 배치되어 있다.
- 메인 콘텐츠는 카드 단위로 분리된다.
  - 입력 카드
  - 결과 카드
  - 엑셀 업로드 카드
- 추가 옵션은 펼침 패널 형태다.
- 결과 출력은 어두운 코드 패널 스타일이다.
- 위험 액션은 `danger` 색으로 분리되어 있다.
- 전체 톤은 "내부 운영 툴"에 맞춘 차분한 블루/차콜 기반이다.

## 적용 원칙

### 유지할 것

- 기존 API 호출 로직 전체
- 기존 섹션 ID
- 기존 input/select/file 요소 ID
- 기존 radio `name`
- 기존 버튼 `onclick`
- 기존 결과 출력용 요소 ID
- 기존 엑셀 검증/실행 흐름

### 바꿀 것

- 전체 레이아웃 구조
- CSS 토큰
- 섹션 간 시각적 위계
- 내비게이션 방식
- 결과 패널 표현 방식
- 폼 배치 밀도와 카드 구조

## 디자인 시스템

### 디자인 키워드

- internal admin tool
- stable
- compact
- high signal
- low decoration

### 컬러

- Sidebar background: `#111827`
- Sidebar surface: `#182131`
- Sidebar hover: `#1a2740`
- Sidebar active: `#1a2f50`
- Active indicator / focus accent: `#00c2a8`
- Page background: `#f0f4f8`
- Card background: `#ffffff`
- Border: `#d7dfea`
- Primary action: `#1a73e8`
- Danger action: `#dc3545`
- Success: `#1f9d68`
- Result panel background: `#1a2332`

### 타이포그래피

- UI 본문: `SUIT`
- 제목/섹션 헤딩: `Sora`
- 토큰/응답/코드 계열: `JetBrains Mono`

### 형태

- 카드 반경은 14px~16px
- 입력 필드는 40px 높이 기준
- 버튼은 38px~40px 높이 기준
- 카드 그림자는 약하게, hover 시만 조금 강조
- 포커스는 teal ring 사용

## 레이아웃 기준

### 앱 셸

- 좌측 사이드바는 주요 섹션 전환 전용
- 우측 메인 패널은 현재 선택된 작업 1개만 집중해서 보여준다
- 모바일에서는 사이드바가 상단 탭/가로 스크롤 네비게이션으로 내려갈 수 있어야 한다

### 사이드바

- 최상단: Access Token 상태 패널
- 그 아래: `멤버`, `그룹` 두 개의 카테고리 묶음
- 위험 액션인 삭제 메뉴는 danger 스타일 분리
- 현재 활성 섹션은 좌측 인디케이터와 배경으로 강조

### 메인 콘텐츠

- 상단에 현재 섹션 제목과 설명 표시
- 글로벌 경고는 상단 alert 카드로 고정
- 각 기능은 아래 카드 조합으로 구성
  - 입력 카드
  - 결과 카드
  - 엑셀 카드
  - 목록 카드

## 컴포넌트 규칙

### 토큰 패널

- 기존 `tokenSection`은 독립된 큰 폼 블록이 아니라, 사이드바 토큰 상태 패널 + 펼쳐지는 상세 설정 영역으로 재배치한다.
- 기본 상태에서는 토큰 발급 여부, 환경, 토큰 일부만 보여준다.
- 클릭 시 우측 메인에 토큰 발급 카드가 보이거나, 토큰 상세 영역이 펼쳐지는 구조를 사용한다.
- 단, 구현 단순성을 위해 1차 이식에서는 `tokenSection`을 메인 상단 카드로 유지하고, 사이드바에는 요약 정보만 미러링한다.

### 폼 카드

- 필수 입력은 첫 카드에 배치
- 관련 있는 필드는 2열 또는 3열 grid 사용
- `추가 옵션`, `엑셀 업로드`는 접기/펼치기 패널 사용
- 각 입력은 label, control, hint 구조를 유지

### 결과 카드

- 기존 `#result`, `#deleteResult`, `#updateResult`, `#tokenResult` 같은 결과 영역은 dark result panel 스타일로 통일
- JSON, 에러 텍스트, 검증 요약 모두 동일한 결과 카드 안에서 표시
- 성공/실패 상태는 카드 헤더 배지로 보강 가능

### 목록 카드

- 멤버/그룹 목록 조회는 카드 헤더에 보기 모드 버튼(`JSON`, `TABLE`) 배치
- 테이블은 sticky header 유지
- JSON은 mono panel로 출력

### 엑셀 처리 카드

- "템플릿 다운로드 → 파일 선택 → 검증 → 실행" 4단계 흐름을 시각적으로 분리
- 실행 버튼은 검증 전까지 비활성 상태처럼 보이게 한다
- 파일 input은 기본 브라우저 스타일을 그대로 두지 말고 업로드 영역 안에 배치

## 인터랙션 규칙

- 기존 `showSection(id)`를 계속 사용하되, 메뉴 active 상태 동기화 로직을 추가한다
- 기존 토글 버튼들은 문구만 바꾸는 수준이 아니라, chevron 회전과 카드 open 상태 클래스를 함께 가진다
- 로딩 상태는 기존 spinner 로직을 유지하되 새 버튼 스타일에 맞게 색상만 재조정한다

## 구현 전략

### 1차 이식 범위

- `private/Member.html` 안에서만 작업
- 외부 JS 파일 분리는 하지 않음
- 기존 함수 시그니처는 유지
- 전체 CSS를 design preview 기준으로 교체
- HTML 구조를 app shell 기준으로 재배치
- 멤버/그룹 8개 섹션을 카드형 구조로 통일

### 2차 보강 범위

- active nav 동기화
- 토큰 요약 미러링
- 결과 카드 상태 배지
- 모바일 레이아웃 튜닝

## 이번 적용에서 특히 조심할 점

- `display:none`로 숨겨지는 섹션 구조를 바꾸더라도 `showSection()`이 찾는 ID는 그대로 있어야 한다
- jQuery `slideToggle()` 대상 ID는 유지해야 한다
- 엑셀 실행 영역의 `style.display`를 직접 제어하는 코드가 많으므로 해당 컨테이너 ID를 절대 바꾸면 안 된다
- 목록 테이블의 `tbody`를 JS가 직접 채우므로 테이블 ID와 tbody 구조는 유지해야 한다
- 결과 출력은 `innerText`, `text()`, `val()` 혼용이 있으므로 결과 요소를 `input`으로 바꾸면 안 된다

## 결론

이번 리디자인은 "기존 기능 위에 새로운 쉘을 입히는 작업"이다.

구현 방향은 아래 한 줄로 정리된다.

`기존 JS 훅은 그대로, DOM id는 그대로, 화면 구조만 design-preview-member.html의 사이드바 + 카드형 admin tool 패턴으로 재구성한다.`
