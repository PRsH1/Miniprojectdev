/**
 * controllers/_shared/auth-middleware.js
 * /app/:path* 보호 페이지 접근 흐름 전체 처리
 *
 * 흐름:
 *  1. protected_pages DB 조회 (path + is_active=true) → 없으면 404
 *  2. auth_token JWT 검증
 *     - 유효: role 체크
 *     - 만료: refresh_token으로 토큰 로테이션 시도
 *     - 없음/무효: /auth/login.html?next=현재경로 리다이렉트
 *  3. must_change_password → /auth/change-password 리다이렉트
 *  4. role 체크 실패 → /auth/403.html (audit: access_denied)
 *  5. file_path HTML 서빙 (audit: page_access)
 */

const crypto = require('crypto');
const { promises: fs } = require('fs');
const path = require('path');
const { parse, serialize } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./db');
const { sign } = require('./jwt');
const { insertAuditLog } = require('./audit');

// role 접근 권한 계층 체크
function hasAccess(userRole, requiredRole) {
  if (requiredRole === 'user') return true;
  if (requiredRole === 'manager') return userRole === 'admin' || userRole === 'manager';
  if (requiredRole === 'admin') return userRole === 'admin';
  return false;
}

module.exports = async function authMiddleware(req, res) {
  // tryRefreshToken은 module.exports.tryRefreshToken으로도 접근 가능 (me.js 등 재사용)
  const rawUrl = req.url || '';
  const pagePath = rawUrl.split('?')[0]; // 예: /app/memberV2
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  // 1. DB에서 보호 페이지 조회
  const sql = getDb();
  let rows;
  try {
    rows = await sql`
      SELECT * FROM protected_pages
      WHERE path = ${pagePath} AND is_active = true
      LIMIT 1
    `;
  } catch (err) {
    console.error('protected_pages 조회 오류:', err);
    return res.status(500).send('Internal Server Error');
  }

  if (!rows || rows.length === 0) {
    return res.status(404).send('페이지를 찾을 수 없습니다.');
  }

  const page = rows[0];
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies['auth_token'];
  const refreshToken = cookies['refresh_token'];
  const loginRedirect = `/auth/login.html?next=${encodeURIComponent(pagePath)}`;
  const isSecure = process.env.NODE_ENV !== 'development';

  let decoded = null;

  // 2. auth_token JWT 검증
  if (authToken) {
    try {
      decoded = jwt.verify(authToken, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        // 만료 → refresh_token 로테이션 시도
        decoded = await tryRefreshToken(sql, refreshToken, res, isSecure);
        if (!decoded) return res.redirect(302, loginRedirect);
      } else {
        // 무효 토큰
        return res.redirect(302, loginRedirect);
      }
    }
  } else if (refreshToken) {
    // auth_token 없고 refresh_token만 있는 경우 → 로테이션 시도
    decoded = await tryRefreshToken(sql, refreshToken, res, isSecure);
    if (!decoded) return res.redirect(302, loginRedirect);
  } else {
    return res.redirect(302, loginRedirect);
  }

  // 3. must_change_password 체크
  if (decoded.mustChangePw) {
    return res.redirect(302, '/auth/change-password.html');
  }

  // 4. role 체크
  if (!hasAccess(decoded.role, page.required_role)) {
    await insertAuditLog({
      userId: decoded.sub,
      action: 'access_denied',
      target: pagePath,
      ipAddress: ip,
      result: 'denied',
    });
    return res.redirect(302, '/auth/403.html');
  }

  // 5. HTML 서빙
  try {
    const fullPath = path.join(process.cwd(), page.file_path);
    const html = await fs.readFile(fullPath, 'utf8');

    await insertAuditLog({
      userId: decoded.sub,
      action: 'page_access',
      target: pagePath,
      ipAddress: ip,
      result: 'success',
    });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(html);
  } catch (err) {
    console.error(`페이지 파일 읽기 오류 (${page.file_path}):`, err);
    return res.status(500).send('페이지를 불러오는 중 오류가 발생했습니다.');
  }
};

/**
 * refresh_token 쿠키로 새 JWT + 리프레시 토큰 로테이션 시도
 * 성공 시 decoded payload 반환, 실패 시 null 반환
 * me.js 등 외부에서도 재사용 가능 (module.exports.tryRefreshToken)
 */
async function tryRefreshToken(sql, refreshToken, res, isSecure) {
  if (!refreshToken) return null;

  const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

  let rtRows;
  try {
    rtRows = await sql`
      SELECT rt.*, u.role, u.must_change_password, u.is_active
      FROM refresh_tokens rt
      JOIN users u ON u.id = rt.user_id
      WHERE rt.token_hash = ${tokenHash}
        AND rt.revoked_at IS NULL
        AND rt.expires_at > now()
      LIMIT 1
    `;
  } catch (err) {
    console.error('refresh_token 조회 오류:', err);
    return null;
  }

  if (!rtRows || rtRows.length === 0) return null;

  const rt = rtRows[0];
  if (!rt.is_active) return null;

  // 기존 토큰 revoke
  await sql`UPDATE refresh_tokens SET revoked_at = now() WHERE id = ${rt.id}`;

  // 새 리프레시 토큰 발급
  const newRefreshToken = crypto.randomUUID();
  const newHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await sql`
    INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
    VALUES (${rt.user_id}, ${newHash}, ${expiresAt.toISOString()})
  `;

  // 새 JWT 발급
  const payload = { sub: rt.user_id, role: rt.role, mustChangePw: rt.must_change_password };
  const newAccessToken = sign(payload);

  // 쿠키 갱신
  const newCookies = [
    serialize('auth_token', newAccessToken, { httpOnly: true, secure: isSecure, sameSite: 'strict', path: '/', maxAge: 3600 }),
    serialize('refresh_token', newRefreshToken, { httpOnly: true, secure: isSecure, sameSite: 'strict', path: '/', maxAge: 7 * 24 * 3600 }),
  ];
  res.setHeader('Set-Cookie', newCookies);

  return payload;
}

// 외부 재사용을 위해 내보냄 (me.js 등)
module.exports.tryRefreshToken = tryRefreshToken;
