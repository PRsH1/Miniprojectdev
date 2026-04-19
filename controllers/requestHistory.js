/**
 * controllers/requestHistory.js
 * OpenAPITester 요청 히스토리 저장/조회/삭제 (로그인 사용자 전용)
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

function getUser(req) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  if (!authToken) return null;
  try {
    return jwt.verify(authToken, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

const HISTORY_MAX = 100;

module.exports = async function requestHistoryController(req, res) {
  const decoded = getUser(req);
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
