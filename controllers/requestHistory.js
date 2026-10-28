/**
 * controllers/requestHistory.js
 * OpenAPITester 요청 히스토리 저장/조회/삭제 (로그인 사용자 전용)
 */

const crypto = require('crypto');
const { getDb } = require('./_shared/db');
const { requireRole } = require('./_shared/session');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');
const { INPUT_LIMITS, requireMaxLengths } = require('./_shared/input-limits');

const HISTORY_MAX = 100;
const ENTRY_ID_MAX_LENGTH = 20;
const ID_INSERT_ATTEMPTS = 3;

/**
 * 서버 생성 히스토리 ID (P0b-06)
 * id 컬럼이 VARCHAR(20)이라 UUID(36자)는 들어가지 않는다 → 스키마를 바꾸지 않고
 * 15바이트(120비트) 난수를 base64url 20자로 쓴다. URL 경로(/api/request-history/:id)에 그대로 쓸 수 있는 문자만 나온다.
 */
function newEntryId() {
  return crypto.randomBytes(15).toString('base64url');
}

function isValidEntryId(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= ENTRY_ID_MAX_LENGTH;
}

function validationError(req, res, message, reason) {
  respondError(req, res, 400, {
    code: 'VALIDATION_FAILED',
    message,
    reason,
    action: '저장할 요청 내용을 줄이거나 확인한 뒤 다시 시도하세요.',
    logMessage: `request-history: ${message}`,
  });
  return false;
}

/**
 * 저장 항목 형식·크기 검증 (P0b-04)
 * - 문자열 필드는 컬럼 길이(또는 운영 한도) 이하
 * - pathParams/queryParams/headers는 배열이며 항목 수·직렬화 길이 한도 이하
 * - response는 객체(또는 없음)이며 직렬화 길이 한도 이하
 * - savedAt은 없거나 0 이상의 안전한 정수(BIGINT 컬럼)
 * 실패 시 400 응답 후 false
 */
function validateEntryPayload(req, res, payload) {
  const L = INPUT_LIMITS;
  const { name, endpointId, method, environment, url, body, pathParams, queryParams, headers, response, savedAt } = payload;

  for (const [value, label] of [[name, 'name'], [endpointId, 'endpointId'], [method, 'method'],
    [environment, 'environment'], [url, 'url'], [body, 'body']]) {
    if (value !== undefined && value !== null && typeof value !== 'string') {
      return validationError(req, res, `${label} 형식이 올바르지 않습니다.`, `${label}은(는) 문자열이어야 합니다.`);
    }
  }
  if (!requireMaxLengths(req, res, [
    { value: name, max: L.historyName, label: '저장 이름' },
    { value: endpointId, max: L.historyEndpointId, label: 'endpointId' },
    { value: method, max: L.historyMethod, label: 'method' },
    { value: environment, max: L.historyEnvironment, label: 'environment' },
    { value: url, max: L.historyUrl, label: '요청 URL' },
    { value: body, max: L.historyBody, label: '요청 Body' },
  ])) return false;

  for (const [value, label] of [[pathParams, 'pathParams'], [queryParams, 'queryParams'], [headers, 'headers']]) {
    if (value === undefined || value === null) continue;
    if (!Array.isArray(value)) {
      return validationError(req, res, `${label} 형식이 올바르지 않습니다.`, `${label}는 배열이어야 합니다.`);
    }
    if (value.length > L.historyParamItems) {
      return validationError(req, res, `${label} 항목이 너무 많습니다.`, `${label}는 최대 ${L.historyParamItems}개까지 저장할 수 있습니다.`);
    }
    if (JSON.stringify(value).length > L.historyParamsJson) {
      return validationError(req, res, `${label}가 너무 큽니다.`, `${label} 전체 길이는 최대 ${L.historyParamsJson.toLocaleString('en-US')}자입니다.`);
    }
  }

  if (response !== undefined && response !== null) {
    if (typeof response !== 'object' || Array.isArray(response)) {
      return validationError(req, res, 'response 형식이 올바르지 않습니다.', 'response는 객체여야 합니다.');
    }
    if (JSON.stringify(response).length > L.historyResponseJson) {
      return validationError(req, res, 'response가 너무 큽니다.', `response 요약은 최대 ${L.historyResponseJson.toLocaleString('en-US')}자입니다.`);
    }
  }

  if (savedAt !== undefined && savedAt !== null && !(Number.isSafeInteger(savedAt) && savedAt >= 0)) {
    return validationError(req, res, 'savedAt 형식이 올바르지 않습니다.', 'savedAt은 밀리초 단위 정수여야 합니다.');
  }
  return true;
}

module.exports = async function requestHistoryController(req, res) {
  // refresh 인지 + 비활성화·임시 비밀번호 계정 즉시 차단 (실패 시 401/403 응답 완료)
  const decoded = await requireRole(req, res, 'user');
  if (!decoded) return undefined;

  const userId = decoded.sub;
  const sql = getDb();
  const urlPath = (req.url || '').split('?')[0];

  const idMatch = urlPath.match(/^\/api\/request-history\/([^/]+)$/);
  const entryId = idMatch ? idMatch[1] : null;

  // id 컬럼은 VARCHAR(20) — 범위를 벗어난 값은 DB 예외(500) 대신 400으로 응답
  if (entryId !== null && !isValidEntryId(entryId)) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: '히스토리 ID 형식이 올바르지 않습니다.',
      reason: `id는 1~${ENTRY_ID_MAX_LENGTH}자 문자열이어야 합니다.`,
      action: '목록을 새로고침한 뒤 다시 시도하세요.',
    });
  }

  if (req.method === 'GET' && !entryId) {
    const rows = await sql`
      SELECT id, name, endpoint_id, method, environment, url,
             path_params, query_params, headers, body, response, saved_at
      FROM api_request_history
      WHERE user_id = ${userId}
      ORDER BY saved_at DESC
      LIMIT ${HISTORY_MAX}
    `;
    return res.status(200).json(rows);
  }

  if (req.method === 'POST' && !entryId) {
    // 클라이언트가 보낸 id는 쓰지 않는다(P0b-06) — 하위 호환을 위해 받아도 무시
    const {
      name,
      endpointId,
      method,
      environment,
      url,
      pathParams,
      queryParams,
      headers,
      body,
      response,
      savedAt,
    } = req.body || {};

    if (!name) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '필수 항목이 누락되었습니다.',
        reason: 'name은 필수입니다.',
        action: '요청 데이터를 확인하세요.',
      });
    }
    if (!validateEntryPayload(req, res, req.body || {})) return undefined;

    // 서버가 id를 만든다(P0b-06). 예전에는 클라이언트의 Date.now() 문자열을 전역 PK로 쓰고
    // ON CONFLICT DO NOTHING 후에도 201을 돌려줘, 같은 밀리초에 저장한 다른 사용자의 항목이 조용히 사라졌다.
    // 120비트 난수라 충돌은 사실상 없지만, 충돌로 0행이면 새 id로 다시 시도하고 끝내 실패하면 500을 낸다.
    let savedId = null;
    for (let attempt = 0; attempt < ID_INSERT_ATTEMPTS && !savedId; attempt += 1) {
      const candidate = newEntryId();
      const inserted = await sql`
        INSERT INTO api_request_history
          (id, user_id, name, endpoint_id, method, environment, url,
           path_params, query_params, headers, body, response, saved_at)
        VALUES
          (${candidate}, ${userId}, ${name}, ${endpointId || null}, ${method || null},
           ${environment || null}, ${url || null},
           ${JSON.stringify(pathParams || [])}::jsonb,
           ${JSON.stringify(queryParams || [])}::jsonb,
           ${JSON.stringify(headers || [])}::jsonb,
           ${body || null},
           ${response ? JSON.stringify(response) : null}::jsonb,
           ${savedAt || Date.now()})
        ON CONFLICT (id) DO NOTHING
        RETURNING id
      `;
      if (inserted && inserted.length > 0) savedId = inserted[0].id;
    }
    if (!savedId) {
      return respondError(req, res, 500, {
        code: 'DATABASE_ERROR',
        message: '요청을 저장하지 못했습니다.',
        reason: '저장 ID를 할당하지 못했습니다.',
        action: '잠시 후 다시 시도하세요.',
        logMessage: 'request-history: id allocation failed',
      });
    }

    await sql`
      DELETE FROM api_request_history
      WHERE user_id = ${userId}
        AND id NOT IN (
          SELECT id
          FROM api_request_history
          WHERE user_id = ${userId}
          ORDER BY saved_at DESC
          LIMIT ${HISTORY_MAX}
        )
    `;

    return res.status(201).json({ success: true, id: savedId });
  }

  if (req.method === 'DELETE' && entryId) {
    await sql`
      DELETE FROM api_request_history
      WHERE id = ${entryId} AND user_id = ${userId}
    `;
    return res.status(200).json({ success: true });
  }

  if (req.method === 'DELETE' && !entryId) {
    await sql`
      DELETE FROM api_request_history
      WHERE user_id = ${userId}
    `;
    return res.status(200).json({ success: true });
  }

  return methodNotAllowed(req, res, ['GET', 'POST', 'DELETE']);
};
