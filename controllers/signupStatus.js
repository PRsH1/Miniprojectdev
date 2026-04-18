/**
 * controllers/signupStatus.js
 * 회원가입 요청 상태 조회 (공개, 인증 불필요)
 * GET /api/signup-status?id=UUID
 */

const { getDb } = require('./_shared/db');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(req, res, ['GET']);
  }

  res.setHeader('Content-Type', 'application/json');
  const id = new URL(req.url, 'http://localhost').searchParams.get('id');

  if (!id) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: '유효하지 않은 요청입니다.',
      reason: '회원가입 상태 조회에 필요한 id 파라미터가 없습니다.',
      action: '상태 조회 링크를 다시 확인하세요.',
    });
  }

  // UUID 형식 간단 검증
  const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRe.test(id)) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: '유효하지 않은 요청입니다.',
      reason: 'id 파라미터 형식이 올바르지 않습니다.',
      action: '상태 조회 링크를 다시 확인하세요.',
    });
  }

  try {
    const sql = getDb();
    // 민감정보(email, password_hash, approved_role) 제외하고 반환
    const rows = await sql`
      SELECT status, created_at, reject_reason
      FROM signup_requests
      WHERE id = ${id}
      LIMIT 1
    `;

    if (!rows || rows.length === 0) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '조회할 회원가입 요청을 찾을 수 없습니다.',
        reason: '요청 ID가 잘못되었거나 이미 정리된 요청입니다.',
        action: '회원가입 요청 상태 링크를 다시 확인하세요.',
      });
    }

    return res.status(200).json(rows[0]);
  } catch (err) {
    console.error('signupStatus 조회 오류:', err);
    return respondError(req, res, 500, {
      code: 'DATABASE_ERROR',
      message: '회원가입 요청 상태를 조회하지 못했습니다.',
      reason: '상태 조회 중 서버 오류가 발생했습니다.',
      action: '잠시 후 다시 시도하세요.',
      error: err,
      logMessage: 'Signup status lookup failed',
    });
  }
};
