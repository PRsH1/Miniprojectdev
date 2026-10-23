/**
 * controllers/_shared/validate.js
 * 컨트롤러 공통 입력 검증 헬퍼
 *
 * DB에 넘기기 전에 형식을 확인해, 형식 오류가 DB 예외(=500)로 번지지 않고
 * 400 VALIDATION_FAILED로 응답되도록 한다.
 */

const { respondError } = require('./respond-error');

// 8-4-4-4-12 형식의 UUID (버전 비트는 검사하지 않음 — gen_random_uuid 외 값도 허용)
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Postgres INTEGER(SERIAL) 상한
const PG_INT_MAX = 2147483647;

function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

/**
 * 양의 정수 쿼리 파라미터 파싱
 * - 값이 없으면(null/'') defaultValue 반환
 * - 숫자 문자열이 아니거나 1 미만·상한 초과면 null 반환 (호출부에서 400 처리)
 */
function parsePositiveInt(value, defaultValue = 1, max = PG_INT_MAX) {
  if (value === null || value === undefined || value === '') return defaultValue;
  if (!/^\d+$/.test(String(value))) return null;
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1 || n > max) return null;
  return n;
}

/** 'YYYY-MM-DD' 형식이면서 실제 존재하는 날짜인지 확인 */
function isIsoDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

/** SERIAL id 경로 파라미터(숫자 문자열)가 INTEGER 범위 안인지 확인 */
function isPgIntId(value) {
  return parsePositiveInt(value, null) !== null;
}

/**
 * UUID 형식이 아니면 400을 응답하고 false 반환
 * 사용: if (!requireUuid(req, res, id, '사용자 ID')) return;
 */
function requireUuid(req, res, value, label = 'ID') {
  if (isUuid(value)) return true;
  respondError(req, res, 400, {
    code: 'VALIDATION_FAILED',
    message: `${label} 형식이 올바르지 않습니다.`,
    reason: `${label}는 UUID 형식이어야 합니다.`,
    action: '목록을 새로고침한 뒤 올바른 항목을 다시 선택하세요.',
    logMessage: `Invalid UUID for ${label}`,
  });
  return false;
}

module.exports = {
  PG_INT_MAX,
  isIsoDate,
  isPgIntId,
  isUuid,
  parsePositiveInt,
  requireUuid,
};
