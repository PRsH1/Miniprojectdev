/**
 * controllers/_shared/input-limits.js
 * 입력 길이·건수 한도 (P0b-04) — 모든 한도 값은 이 파일 한곳에서 관리한다.
 *
 * 기준
 * - 길이 한도는 DB 컬럼 길이(scripts/migrate*.js)를 넘지 않게 잡는다. 넘으면 DB 예외(500)가 나므로
 *   그 전에 400 VALIDATION_FAILED로 응답한다. TEXT/JSONB 컬럼은 저장 용량·알림 폭주를 막는 운영 한도다.
 * - 길이는 JS 문자열 길이(UTF-16 코드 유닛) 기준. Postgres VARCHAR(n)은 문자 수 기준이라
 *   한글·이모지가 섞여도 n 이하면 DB에서 거부되지 않는다(서로게이트 쌍은 2로 세므로 더 보수적).
 * - 화면(HTML maxlength)도 같은 값을 쓴다: auth/signup.html, auth/login.html, auth/change-password.html,
 *   community/bug-report.html. 값을 바꾸면 그 파일들도 함께 고칠 것.
 */

const { respondError } = require('./respond-error');

const INPUT_LIMITS = Object.freeze({
  // users.username VARCHAR(50), users.email VARCHAR(255) / signup_requests 동일
  username: 50,
  email: 255,
  // 비밀번호: 최소 8자. 최대는 scrypt 비용(요청당 CPU) 상한 — 저장은 해시라 DB 길이와 무관
  passwordMin: 8,
  passwordMax: 256,

  // 미인증 가입 요청 남발 방지 (audit_logs signup_requested 기준, IP당)
  signupPerIpPerHour: 5,
  // 승인 대기 가입 요청 전체 상한 — 넘으면 관리자 처리 전까지 신규 접수 중단(관리자 알림 폭주 방지)
  signupPendingMax: 200,

  // bug_reports: title VARCHAR(256), page_url VARCHAR(512), description/cause/action_taken/admin_note TEXT
  bugTitle: 256,
  bugDescription: 10000,
  bugPageUrl: 512,
  bugAdminText: 10000,
  // 제보는 건마다 관리자 알림을 만들므로 사용자당 24시간 건수 제한
  bugReportsPerUserPerDay: 20,

  // api_request_history: name VARCHAR(255), endpoint_id VARCHAR(100), method VARCHAR(10),
  // environment VARCHAR(50), url/body TEXT, path_params/query_params/headers/response JSONB
  historyName: 255,
  historyEndpointId: 100,
  historyMethod: 10,
  historyEnvironment: 50,
  historyUrl: 4096,
  historyBody: 200000,
  historyParamItems: 100,      // pathParams / queryParams / headers 배열 항목 수
  historyParamsJson: 50000,    // 각 배열을 JSON으로 직렬화한 길이
  historyResponseJson: 10000,  // 응답 요약(statusText·time·size) 직렬화 길이
});

/** 문자열이고 max 이하인지 (null/undefined는 통과 — 필수 여부는 호출부가 따로 검사) */
function withinLength(value, max) {
  if (value === null || value === undefined) return true;
  return String(value).length <= max;
}

/**
 * 길이 한도를 넘으면 400 VALIDATION_FAILED를 응답하고 false 반환
 * checks: [{ value, max, label }]
 */
function requireMaxLengths(req, res, checks) {
  for (const { value, max, label } of checks) {
    if (!withinLength(value, max)) {
      respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: `${label}이(가) 너무 깁니다.`,
        reason: `${label}은(는) 최대 ${max.toLocaleString('en-US')}자까지 입력할 수 있습니다.`,
        action: '내용을 줄인 뒤 다시 시도하세요.',
        logMessage: `Input too long: ${label} (max ${max})`,
      });
      return false;
    }
  }
  return true;
}

/** 건수 한도 초과 400 응답 */
function respondCountLimit(req, res, { message, reason, action, logMessage }) {
  return respondError(req, res, 400, {
    code: 'VALIDATION_FAILED',
    message,
    reason,
    action: action || '잠시 후 다시 시도하세요.',
    logMessage,
  });
}

module.exports = {
  INPUT_LIMITS,
  requireMaxLengths,
  respondCountLimit,
  withinLength,
};
