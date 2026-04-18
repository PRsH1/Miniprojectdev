## 코딩 컨벤션

- HTML 파일은 자체 완결형이 많으나 필요 시 JS파일 분리함(코드 유지보수성을 위해) (CSS/JS 인라인, 외부 의존성은 CDN)
- jQuery + vanilla JS 혼용
- 한국어 UI, 한국어 주석
- Body 기본값: 구조만 표현하고 실제 값을 넣지 않음
  - 문자열 → `''` / boolean → `null` / number → `null`
  - 배열 내 객체는 빈 요소 1개로 구조 표현 (예: `[{ key: '', value: null }]`)
  - `'04'`, `'+82'`, `true` 같은 고정 예시값 사용 금지 — 사용자가 직접 입력해야 하는 값
- 예시 응답: 실제 값 대신 타입명 (`"string"`, `"number"`, `"boolean"`) 사용
