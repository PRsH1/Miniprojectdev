/**
 * controllers/me.js
 * 현재 로그인 사용자 정보 조회
 * GET /api/me
 *
 * 인증 여부 무관하게 200 반환:
 * - 인증 사용자 → { username, role, protected_pages }
 * - 비인증 사용자 → { authenticated: false, protected_pages }
 *
 * protected_pages: is_active = true인 레코드만 포함 (path, required_role, file_path_hash)
 * file_path는 서버에서 SHA-256 해시로 변환 후 반환 — 실제 경로는 클라이언트에 노출되지 않음
 * 비인증 사용자도 카드 가시성 계산에 필요하므로 항상 반환
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { getDb } = require('./_shared/db');
const { tryRefreshToken } = require('./_shared/auth-middleware');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

function hashFilePath(filePath) {
  return crypto.createHash('sha256').update(filePath).digest('hex');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return methodNotAllowed(req, res, ['GET']);
  }

  res.setHeader('Content-Type', 'application/json');
  const isSecure = process.env.NODE_ENV !== 'development';
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  const refreshToken = cookies['refresh_token'];
  const sql = getDb();

  // ─── 1. 항상 protected_pages 조회 ────────────────────────────
  let protectedPages = [];
  try {
    const pages = await sql`
      SELECT path, required_role, file_path FROM protected_pages
      WHERE is_active = true ORDER BY path
    `;
    protectedPages = pages.map(p => ({
      path: p.path,
      required_role: p.required_role,
      file_path_hash: p.file_path ? hashFilePath(p.file_path) : null,
    }));
  } catch (err) {
    console.error('me.js protected_pages 조회 오류:', err);
    // 오류 시 빈 배열로 계속 진행 (카드 전체 숨김 처리됨)
  }

  // ─── 2. 인증 확인 ────────────────────────────────────────────
  let decoded = null;

  if (authToken) {
    try {
      decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        // 만료 → refresh_token 로테이션 (auth-middleware 재사용)
        decoded = await tryRefreshToken(sql, refreshToken, res, isSecure);
      }
      // 그 외 오류는 decoded = null 유지
    }
  } else if (refreshToken) {
    decoded = await tryRefreshToken(sql, refreshToken, res, isSecure);
  }

  // 비인증 → 200 반환 (index.html이 protected_pages를 받아 카드 숨김 처리)
  if (!decoded) {
    return res.status(200).json({ authenticated: false, protected_pages: protectedPages });
  }

  // ─── 3. 인증 사용자: username 조회 ───────────────────────────
  try {
    const rows = await sql`
      SELECT username FROM users
      WHERE id = ${decoded.sub} AND is_active = true LIMIT 1
    `;
    if (!rows || rows.length === 0) {
      return res.status(200).json({ authenticated: false, protected_pages: protectedPages });
    }
    return res.status(200).json({
      username: rows[0].username,
      role: decoded.role,
      protected_pages: protectedPages,
    });
  } catch (err) {
    console.error('me.js DB 조회 오류:', err);
    return respondError(req, res, 500, {
      code: 'DATABASE_ERROR',
      message: '사용자 정보를 조회하는 중 오류가 발생했습니다.',
      reason: '계정 정보를 읽는 중 서버가 요청을 완료하지 못했습니다.',
      action: '잠시 후 다시 시도하세요.',
      error: err,
      logMessage: 'Current user lookup failed',
    });
  }
};
