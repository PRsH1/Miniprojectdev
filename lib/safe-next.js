/**
 * lib/safe-next.js
 * 로그인 후 이동 경로(`next`) 검증 — open redirect 차단
 *
 * 허용 조건 (모두 만족해야 함):
 *   - 문자열이며 `/`로 시작하는 같은 오리진 상대 경로
 *   - `//`, `/\` 로 시작하지 않음 (프로토콜 상대 URL → 외부 호스트 이동 차단)
 *   - 제어 문자(\r \n \t 등 0x00-0x1F, 0x7F) 없음 (헤더 주입·브라우저 정규화 우회 차단)
 *   - 퍼센트 디코딩 후에도 위 조건 유지 (`/%2F%2Fevil.com` 등 이중 해석 우회 차단)
 *   - 길이 2048자 이하
 * 조건을 만족하지 않으면 fallback(기본 '/')을 반환한다.
 *
 * ※ auth/login.html, auth/change-password.html 에 동일 로직의 인라인 사본이 있다.
 *   수정 시 세 곳을 함께 고칠 것 (test/safe-next.test.js 가 사본 일치 여부를 검사한다).
 */

const MAX_NEXT_LENGTH = 2048;

function isSafePath(value) {
  if (value.charAt(0) !== '/') return false;
  const second = value.charAt(1);
  if (second === '/' || second === '\\') return false;
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(value)) return false;
  return true;
}

function safeNext(next, fallback) {
  const fb = typeof fallback === 'string' ? fallback : '/';
  if (typeof next !== 'string' || !next || next.length > MAX_NEXT_LENGTH) return fb;
  if (!isSafePath(next)) return fb;

  // 디코딩 결과도 검사한다 (최대 3회 — 다중 인코딩 대비)
  let decoded = next;
  for (let i = 0; i < 3; i += 1) {
    let step;
    try {
      step = decodeURIComponent(decoded);
    } catch (e) {
      return fb; // 잘못된 퍼센트 인코딩
    }
    if (step === decoded) break;
    if (!isSafePath(step)) return fb;
    decoded = step;
  }
  return next;
}

module.exports = { safeNext, MAX_NEXT_LENGTH };
