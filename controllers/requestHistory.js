/**
 * controllers/requestHistory.js
 * OpenAPITester 요청 히스토리 저장/조회/삭제 (로그인 사용자 전용)
 */

const { getDb } = require('./_shared/db');
const { resolveUser } = require('./_shared/session');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

const HISTORY_MAX = 100;
const ENTRY_ID_MAX_LENGTH = 20;

function isValidEntryId(value) {
  return typeof value === 'string' && value.length >= 1 && value.length <= ENTRY_ID_MAX_LENGTH;
}

module.exports = async function requestHistoryController(req, res) {
  const decoded = await resolveUser(req, res);
  if (!decoded) {
    return respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: 'RequestHistory API requires authentication',
    });
  }

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
    const {
      id,
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

    if (!id || !name) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '필수 항목이 누락되었습니다.',
        reason: 'id와 name은 필수입니다.',
        action: '요청 데이터를 확인하세요.',
      });
    }
    if (!isValidEntryId(id)) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '히스토리 ID 형식이 올바르지 않습니다.',
        reason: `id는 1~${ENTRY_ID_MAX_LENGTH}자 문자열이어야 합니다.`,
        action: '요청 데이터를 확인하세요.',
      });
    }

    await sql`
      INSERT INTO api_request_history
        (id, user_id, name, endpoint_id, method, environment, url,
         path_params, query_params, headers, body, response, saved_at)
      VALUES
        (${id}, ${userId}, ${name}, ${endpointId || null}, ${method || null},
         ${environment || null}, ${url || null},
         ${JSON.stringify(pathParams || [])}::jsonb,
         ${JSON.stringify(queryParams || [])}::jsonb,
         ${JSON.stringify(headers || [])}::jsonb,
         ${body || null},
         ${response ? JSON.stringify(response) : null}::jsonb,
         ${savedAt || Date.now()})
      ON CONFLICT (id) DO NOTHING
    `;

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

    return res.status(201).json({ success: true, id });
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
