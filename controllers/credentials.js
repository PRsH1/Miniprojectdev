/**
 * controllers/credentials.js
 * eformsign 인증 정보 저장/조회/수정/삭제
 * 모든 요청은 JWT 인증 필요 (auth_token 쿠키)
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

module.exports = async function credentialsController(req, res) {
  const decoded = getUser(req);
  if (!decoded) {
    return respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: 'Credentials API requires authentication',
    });
  }

  const userId = decoded.sub;
  const sql = getDb();
  const urlPath = (req.url || '').split('?')[0]; // 예: /api/credentials 또는 /api/credentials/uuid

  // ID 추출 (경로: /api/credentials/:id)
  const idMatch = urlPath.match(/^\/api\/credentials\/([^/]+)$/);
  const credId = idMatch ? idMatch[1] : null;

  // GET /api/credentials — 목록 조회
  if (req.method === 'GET' && !credId) {
    const rows = await sql`
      SELECT id, name, environment, custom_url, api_key, eform_user_id,
             secret_method,
             CASE WHEN secret_key IS NOT NULL THEN true ELSE false END AS has_secret_key,
             created_at, updated_at
      FROM eformsign_credentials
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;
    return res.status(200).json(rows);
  }

  // GET /api/credentials/:id — 단건 조회 (비밀 키 포함, 불러오기 시 사용)
  if (req.method === 'GET' && credId) {
    const rows = await sql`
      SELECT id, name, environment, custom_url, api_key, eform_user_id,
             secret_method, secret_key, created_at, updated_at
      FROM eformsign_credentials
      WHERE id = ${credId} AND user_id = ${userId}
      LIMIT 1
    `;
    if (!rows.length) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '크리덴셜을 찾을 수 없습니다.',
        reason: '요청한 크리덴셜이 없거나 현재 사용자 소유가 아닙니다.',
        action: '목록을 새로고침한 뒤 다시 선택하세요.',
      });
    }
    return res.status(200).json(rows[0]);
  }

  // POST /api/credentials — 저장
  if (req.method === 'POST' && !credId) {
    const { name, environment, custom_url, api_key, eform_user_id, secret_method, secret_key } = req.body || {};

    if (!name || !environment || !api_key || !eform_user_id || !secret_method) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '필수 항목이 누락되었습니다.',
        reason: '크리덴셜 저장에 필요한 값이 모두 전달되지 않았습니다.',
        action: '이름, 환경, API Key, eform_user_id, secret_method를 확인하세요.',
      });
    }
    if (!['op_saas', 'csap', 'custom'].includes(environment)) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '유효하지 않은 환경 값입니다.',
        reason: 'environment는 op_saas, csap, custom 중 하나여야 합니다.',
        action: '환경 값을 다시 선택하세요.',
      });
    }

    const rows = await sql`
      INSERT INTO eformsign_credentials
        (user_id, name, environment, custom_url, api_key, eform_user_id, secret_method, secret_key)
      VALUES
        (${userId}, ${name}, ${environment}, ${custom_url || null},
         ${api_key}, ${eform_user_id}, ${secret_method}, ${secret_key || null})
      RETURNING id, name, environment, custom_url, api_key, eform_user_id, secret_method, created_at
    `;
    return res.status(201).json(rows[0]);
  }

  // DELETE /api/credentials/:id — 삭제
  if (req.method === 'DELETE' && credId) {
    const result = await sql`
      DELETE FROM eformsign_credentials
      WHERE id = ${credId} AND user_id = ${userId}
      RETURNING id
    `;
    if (!result.length) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '크리덴셜을 찾을 수 없습니다.',
        reason: '삭제 대상 크리덴셜이 없거나 현재 사용자 소유가 아닙니다.',
        action: '목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }
    return res.status(200).json({ success: true });
  }

  return methodNotAllowed(req, res, ['GET', 'POST', 'DELETE']);
};
