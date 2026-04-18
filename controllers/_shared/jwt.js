/**
 * controllers/_shared/jwt.js
 * JWT 서명 / 검증 유틸리티
 */

const jwt = require('jsonwebtoken');

function getSecret() {
  if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET 환경변수가 설정되지 않았습니다.');
  return process.env.JWT_SECRET;
}

/**
 * JWT 액세스 토큰 서명 (1시간)
 * @param {{ sub: string, role: string, mustChangePw: boolean }} payload
 */
function sign(payload) {
  return jwt.sign(payload, getSecret(), { expiresIn: '1h' });
}

/**
 * JWT 토큰 검증
 * @param {string} token
 * @returns {{ sub: string, role: string, mustChangePw: boolean } | null}
 * @throws TokenExpiredError | JsonWebTokenError
 */
function verify(token) {
  return jwt.verify(token, getSecret());
}

module.exports = { sign, verify };
