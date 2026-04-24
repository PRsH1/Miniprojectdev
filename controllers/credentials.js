/**
 * controllers/credentials.js
 * eformsign 인증 정보 저장/조회/수정/삭제
 * 모든 요청은 JWT 인증 필요 (auth_token 쿠키)
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('./_shared/db');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

// ─── AES-256-GCM 암호화 유틸 ──────────────────────────────────────────────

/** 환경변수에서 32바이트 키 버퍼 반환. 미설정 시 예외 throw */
function getEncryptionKey() {
  const hex = process.env.CREDENTIAL_ENCRYPTION_KEY;
  if (!hex) throw new Error('CREDENTIAL_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.');
  return Buffer.from(hex, 'hex');
}

/** 암호화된 값 판별 — "{iv}:{tag}:{cipher}" 형식인지 확인 */
function isEncrypted(val) {
  return typeof val === 'string' && val.split(':').length === 3;
}

/** plaintext → "{iv_hex}:{authTag_hex}:{ciphertext_hex}" */
function encrypt(plaintext) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/** "{iv_hex}:{authTag_hex}:{ciphertext_hex}" → plaintext. 실패 시 예외 throw */
function decrypt(stored) {
  const key = getEncryptionKey();
  const [ivHex, authTagHex, ciphertextHex] = stored.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const ciphertext = Buffer.from(ciphertextHex, 'hex');
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}

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

    const row = rows[0];

    // secret_key 복호화 — 암호화된 값이면 복호화, 기존 plaintext는 그대로 반환
    if (row.secret_key && isEncrypted(row.secret_key)) {
      try {
        row.secret_key = decrypt(row.secret_key);
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

    // secret_key가 있을 때만 암호화 후 저장
    let encryptedSecretKey = null;
    if (secret_key) {
      try {
        encryptedSecretKey = encrypt(secret_key);
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
