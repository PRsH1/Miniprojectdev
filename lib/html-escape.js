/**
 * lib/html-escape.js
 * HTML 본문·속성 값 이스케이프 (반사형 XSS 방지)
 *
 * 서버에서 템플릿 문자열로 HTML을 조립할 때 외부 입력(쿼리·body)이나
 * 서버 생성 값을 보간하기 전에 반드시 거친다. `&<>"'` 5개 문자를 엔티티로 바꾸므로
 * 큰따옴표·작은따옴표로 감싼 속성 값과 요소 본문 양쪽에 안전하다.
 * (따옴표 없는 속성, <script>/<style> 내부, URL 스킴 검증 용도로는 쓰지 말 것)
 */

const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

function escapeHtml(value) {
  if (value === undefined || value === null) return '';
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch]);
}

module.exports = { escapeHtml };
