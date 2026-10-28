/**
 * controllers/credentials.js
 * eformsign 인증 정보 저장/조회/삭제 (수정 엔드포인트 없음)
 * 모든 요청은 JWT 인증 필요 (auth_token 쿠키)
 *
 * secret_key 암호화는 controllers/_shared/credential-crypto.js (P0b-05)
 * - 새로 저장: `v1:{iv}:{tag}:{ct}` + authTagLength 16 + AAD(user_id)
 * - 읽기: v1 / 기존 접두어 없는 `{iv}:{tag}:{ct}` / 암호화 이전 평문 모두 지원
 */

const { getDb } = require('./_shared/db');
const { requireRole } = require('./_shared/session');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');
const { requireUuid } = require('./_shared/validate');
const { decryptSecret, encryptSecret } = require('./_shared/credential-crypto');

module.exports = async function credentialsController(req, res) {
  // refresh 인지 + 비활성화·임시 비밀번호 계정 즉시 차단 (실패 시 401/403 응답 완료)
  const decoded = await requireRole(req, res, 'user');
  if (!decoded) return undefined;

  const userId = decoded.sub;
  const sql = getDb();
  const urlPath = (req.url || '').split('?')[0]; // 예: /api/credentials 또는 /api/credentials/uuid

  // ID 추출 (경로: /api/credentials/:id)
  const idMatch = urlPath.match(/^\/api\/credentials\/([^/]+)$/);
  const credId = idMatch ? idMatch[1] : null;

  // 잘못된 UUID가 DB 예외(500)로 번지지 않도록 사전 검증
  if (credId && !requireUuid(req, res, credId, '크리덴셜 ID')) return undefined;

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

    const row = rows[0];

    // secret_key 복호화 — v1(AAD=user_id)·기존 형식은 복호화, 암호화 이전 평문은 그대로 반환
    if (row.secret_key) {
      try {
        row.secret_key = decryptSecret(row.secret_key, userId).plaintext;
      } catch (e) {
        console.error('[credentials] decrypt failed:', { id: credId, error: e.message });
        return respondError(req, res, 500, {
          code: 'INTERNAL_ERROR',
          message: '인증 정보를 복호화할 수 없습니다.',
          reason: '암호화 키가 변경되었거나 데이터가 손상되었습니다.',
          action: '관리자에게 문의하세요.',
        });
      }
    }

    return res.status(200).json(row);
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
    if (!['signature', 'bearer'].includes(secret_method)) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '유효하지 않은 인증 방식입니다.',
        reason: 'secret_method는 signature, bearer 중 하나여야 합니다.',
        action: '인증 방식을 다시 선택하세요.',
      });
    }

    if (secret_key !== undefined && secret_key !== null && typeof secret_key !== 'string') {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: 'secret_key 형식이 올바르지 않습니다.',
        reason: 'secret_key는 문자열이어야 합니다.',
        action: '비밀 키 값을 다시 확인하세요.',
      });
    }

    // secret_key가 있을 때만 암호화 후 저장 (v1 + AAD=user_id)
    let encryptedSecretKey = null;
    if (secret_key) {
      try {
        encryptedSecretKey = encryptSecret(secret_key, userId);
      } catch (e) {
        return respondError(req, res, 500, {
          code: 'INTERNAL_ERROR',
          message: '인증 정보를 암호화할 수 없습니다.',
          reason: 'CREDENTIAL_ENCRYPTION_KEY가 설정되지 않았거나 유효하지 않습니다.',
          action: '관리자에게 문의하세요.',
          logMessage: e.message,
        });
      }
    }

    const rows = await sql`
      INSERT INTO eformsign_credentials
        (user_id, name, environment, custom_url, api_key, eform_user_id, secret_method, secret_key)
      VALUES
        (${userId}, ${name}, ${environment}, ${custom_url || null},
         ${api_key}, ${eform_user_id}, ${secret_method}, ${encryptedSecretKey})
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
