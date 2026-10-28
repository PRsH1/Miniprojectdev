/**
 * lib/saml-input.js
 * SAML 폼 입력값(SAMLRequest / RelayState) 형식 검증
 *
 * - SAMLRequest: base64 문자셋만 허용. 정상 요청의 줄바꿈과 쿼리 파싱 시 `+`가 공백으로
 *   바뀐 경우를 위해 공백 문자(\s)도 허용한다. 값이 없으면(빈 문자열) 허용.
 * - RelayState: 문자열이며 1024자 이하. 내용은 SP가 해석하므로 형식은 제한하지 않고,
 *   HTML에 반영할 때 escapeHtml 로 이스케이프한다.
 * - 배열(같은 파라미터 반복) 등 문자열이 아닌 값은 거부한다.
 */

const MAX_RELAY_STATE_LENGTH = 1024;
const SAML_REQUEST_PATTERN = /^[A-Za-z0-9+/=\s]*$/;

function isValidSamlRequest(value) {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  return SAML_REQUEST_PATTERN.test(value);
}

function isValidRelayState(value) {
  if (value === undefined || value === null) return true;
  if (typeof value !== 'string') return false;
  return value.length <= MAX_RELAY_STATE_LENGTH;
}

module.exports = {
  MAX_RELAY_STATE_LENGTH,
  isValidSamlRequest,
  isValidRelayState,
};
