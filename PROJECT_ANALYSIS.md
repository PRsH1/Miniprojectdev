# Project Analysis

## 개요

이 프로젝트는 `eformsign` 연동을 위한 단일 제품형 애플리케이션이라기보다, 여러 운영 도구를 한곳에 모은 **Vercel 기반 툴 허브**에 가깝다.

배포 관점에서 구조는 다음 두 축으로 나뉜다.

- 정적 파일: `index.html`, `API(JS,HTML)`, `Embedding`, `utils`, `private`
- 서버리스 함수: `api/index.js`를 진입점으로 사용하는 `controllers/*.js`

즉, 이 프로젝트는 **정적 HTML/JS 도구 모음 + 일부 Node.js 서버리스 API** 구조다.

---

## 배포 구조

### Vercel 라우팅

[vercel.json](./vercel.json) 기준 리라이트는 다음과 같다.

- `/api/*` -> `/api/index.js`
- `/ApiAutoTest` -> `/api/index.js`
- `/templatecopy` -> `/api/index.js`
- `/idptestauth` -> `/api/index.js`

정적 파일은 Vercel이 그대로 서빙하고, 보호가 필요한 일부 페이지와 API 요청만 `api/index.js`로 들어간다.

### 서버 진입점

[api/index.js](./api/index.js)는 단일 라우터 역할을 하며, 요청 경로를 기준으로 컨트롤러를 lazy loading 한다.

장점:

- 진입점이 단순하다
- Vercel 함수 수를 불필요하게 늘리지 않는다
- 경로별 처리 흐름을 한 파일에서 파악할 수 있다

주의점:

- 라우팅 로직이 문자열 치환 기반이라 확장성이 높지는 않다
- 새 보호 페이지나 API 추가 시 `api/index.js`와 `vercel.json`을 함께 수정해야 한다

---

## 디렉터리 역할

### 핵심 허브

- [index.html](./index.html)
  - 사용자가 각 도구 페이지로 이동하는 메인 허브
  - 실질적으로 서비스의 홈 화면 역할

### 서버리스 계층

- [api/index.js](./api/index.js)
  - 모든 서버 요청의 단일 진입점

- `controllers/`
  - 서버리스 함수 구현
  - 인증, SAML, 문서 조회/다운로드, SMTP, webhook 처리 포함

- [lib/saml.js](./lib/saml.js)
  - `samlify` 설정
  - IdP/SP 메타데이터와 인증 응답 생성에 사용

### 주요 프런트엔드 도구

- `API(JS,HTML)/`
  - eformsign Open API 테스트 및 문서 생성/조회/다운로드용 HTML 도구

- `assets/js/openapi/`
  - Open API Tester의 실제 핵심 로직
  - API 목록, 명세, 상태, UI, 초기화 코드가 분리되어 있음

- `Embedding/`
  - 임베딩/통합 시나리오용 샘플 페이지

- `utils/`
  - SMTP, webhook, CORS, Base64, timestamp 등 범용 유틸리티 도구

- `private/`
  - 쿠키 인증이 필요한 보호 페이지 HTML

### 참고/샘플 영역

- `Webhook/webhook/demo/`
  - 별도 Gradle 기반 webhook 데모 프로젝트
  - 메인 Vercel 앱과는 독립적인 샘플 성격

---

## 핵심 기능 분석

### 1. Open API Tester

프로젝트에서 가장 큰 비중을 차지하는 기능이다.

관련 파일:

- [API(JS,HTML)/OpenAPITester.html](./API(JS,HTML)/OpenAPITester.html)
- [assets/js/openapi/api-list.js](./assets/js/openapi/api-list.js)
- [assets/js/openapi/api-specs.js](./assets/js/openapi/api-specs.js)
- [assets/js/openapi/state.js](./assets/js/openapi/state.js)
- [assets/js/openapi/ui.js](./assets/js/openapi/ui.js)
- [assets/js/openapi/init.js](./assets/js/openapi/init.js)

역할:

- eformsign Open API를 브라우저에서 직접 테스트
- 인증 토큰 발급
- Path, Query, Header, Body 조립
- 응답 확인 및 파일 다운로드
- 코드 스니펫 생성
- API 명세 표시

실질적인 핵심 자산:

- `api-list.js`: API 카탈로그
- `api-specs.js`: API 명세 데이터

현재 유지보수 특성:

- 기능 로직보다 데이터 유지보수 비중이 크다
- API 추가/수정 시 `API_LIST`와 `API_SPECS`를 함께 맞춰야 한다

### 2. 보호 페이지 접근 제어

관련 파일:

- [controllers/login.js](./controllers/login.js)
- [controllers/memberPage.js](./controllers/memberPage.js)
- [controllers/ApiAutoTest.js](./controllers/ApiAutoTest.js)
- [controllers/templatecopy.js](./controllers/templatecopy.js)
- [controllers/idptestauth.js](./controllers/idptestauth.js)

동작:

- 비밀번호 입력 후 쿠키 발급
- 이후 각 보호 페이지 접근 시 쿠키 검증
- 유효하면 `private/*.html` 파일 반환
- 아니면 `auth/login.html`로 리다이렉트

평가:

- 내부 운영도구 용도로는 단순하고 실용적이다
- 다만 페이지별 컨트롤러 구현이 거의 동일해 중복이 많다

### 3. SAML SSO 테스트

관련 파일:

- [controllers/auth.js](./controllers/auth.js)
- [controllers/sso-login.js](./controllers/sso-login.js)
- [controllers/idp-initiated-login.js](./controllers/idp-initiated-login.js)
- [controllers/metadata.js](./controllers/metadata.js)
- [lib/saml.js](./lib/saml.js)

역할:

- SAML Response 생성
- SP/IdP initiated 흐름 테스트
- 메타데이터 XML 제공

평가:

- 테스트 도구로서는 충분히 직접적이다
- 다만 배포 URL과 ACS URL이 코드에 하드코딩되어 있어 환경 분리에 약하다

### 4. eformsign 호출 보조 API

관련 파일:

- [controllers/getToken.js](./controllers/getToken.js)
- [controllers/getDocumentInfo.js](./controllers/getDocumentInfo.js)
- [controllers/downloadDocument.js](./controllers/downloadDocument.js)

역할:

- ECDSA 서명 기반 access token 발급
- 문서 상세 정보 조회
- 파일 다운로드 프록시

평가:

- 프런트에서 직접 하기 번거로운 호출을 서버리스 함수로 감싼 형태
- 구조는 단순하지만, 보안 검토 없이 범용 프록시처럼 확장하면 위험해질 수 있다

### 5. 운영 유틸리티

관련 파일:

- [controllers/send.js](./controllers/send.js)
- [controllers/webhook-receiver.js](./controllers/webhook-receiver.js)
- `utils/*.html`

역할:

- SMTP 발송 테스트
- webhook 수신 후 Pusher 브로드캐스트
- 여러 보조 도구 제공

평가:

- 실무 운영 편의성 중심
- 프로젝트 성격이 제품보다는 툴박스에 가깝다는 점을 잘 보여준다

---

## 기술적 특징

### 실제 구조 기준

- 배포 플랫폼: Vercel
- 런타임: Node.js Serverless Function
- 프런트엔드: 정적 HTML/CSS/JavaScript + jQuery
- 인증/서명: `samlify`, `jsrsasign`, 쿠키 기반 보호 페이지

### 문서와 실제의 차이

[README.md](./README.md)에는 Next.js 기반으로 읽힐 수 있는 설명이 있지만, 현재 저장소 구조상 일반적인 Next.js 앱은 아니다.

현재 코드는 다음에 가깝다.

- Vercel에 배포된 정적 사이트
- Node.js 서버리스 함수 몇 개
- Next.js 의존성은 존재하지만 앱 구조에서 적극적으로 사용되지는 않음

즉, **Vercel에 배포되었다는 사실과 Next.js 앱이라는 사실은 동일하지 않다**. 이 저장소는 전자에 가깝고 후자와는 거리가 있다.

---

## 강점

- 구조가 단순해서 운영자가 이해하기 쉽다
- 허브 페이지를 통해 기능 접근 경로가 명확하다
- 주요 도구가 HTML 단위로 분리되어 있어 빠르게 수정 가능하다
- 서버리스 계층이 얇아 배포 부담이 작다
- Open API Tester가 실무 활용성 높은 중심 기능으로 자리잡고 있다

---

## 약점과 리스크

### 1. 컨트롤러 중복

보호 페이지 컨트롤러들이 거의 같은 로직을 복제하고 있다.

영향:

- 새 페이지 추가 시 반복 작업 증가
- 쿠키 정책 변경 시 여러 파일을 수정해야 함

### 2. Open API 명세 데이터 이중 관리

`API_LIST`와 `API_SPECS`가 분리되어 있어 동기화 누락 가능성이 있다.

영향:

- UI 동작과 문서 표시가 어긋날 수 있음
- 신규 API 추가 시 실수 가능성 증가

### 3. 환경 하드코딩

SAML 관련 URL과 일부 도메인이 코드에 직접 들어가 있다.

영향:

- 스테이징/운영 전환이 어렵다
- 다른 배포 환경으로 복제하기 불편하다

### 4. 자동화 테스트 부재

현재 저장소에는 핵심 기능에 대한 자동 테스트 체계가 사실상 없다.

영향:

- 수정 후 회귀 검증이 수동 확인에 의존
- Open API Tester 같은 대형 UI 변경 시 안정성 저하 가능

### 5. 내부도구 성격과 보안 경계

이 프로젝트는 내부 운영도구 성격이 강하다. 그런데 브라우저에서 직접 인증 정보와 토큰을 다루는 페이지가 많다.

영향:

- 공개 서비스처럼 운영하면 위험
- 접근 대상과 사용 범위를 명확히 제한해야 함

---

## 유지보수 우선순위 제안

### 1순위

- 보호 페이지 컨트롤러 공통화
- SAML/도메인/리다이렉트 URL의 환경변수화
- README와 실제 구조 정합성 수정

### 2순위

- Open API 명세 데이터 관리 방식 정리
- `API_LIST`와 `API_SPECS`의 검증 스크립트 추가
- 공통 UI 문자열과 설정값 정리

### 3순위

- 핵심 흐름에 대한 최소 자동 테스트 추가
- 내부도구/공개도구 경계 재정리
- 페이지 인코딩/문서 깨짐 문제 정리

---

## 결론

이 프로젝트는 현재 기준으로 다음과 같이 정의하는 것이 가장 정확하다.

> `eformsign` 연동과 운영 편의를 위한 **Vercel 기반 사내 툴 허브**

핵심은 단일 비즈니스 앱이 아니라, 여러 실무용 HTML 도구와 일부 서버리스 기능을 조합한 운영 플랫폼이라는 점이다.

가장 중요한 영역은 다음 두 곳이다.

- Open API Tester
- 보호 페이지 및 인증 흐름

향후 확장성을 높이려면 먼저 구조를 크게 바꾸기보다, 다음 세 가지를 정리하는 것이 효과적이다.

- 중복 제거
- 환경 설정 외부화
- 명세 데이터 검증 자동화
