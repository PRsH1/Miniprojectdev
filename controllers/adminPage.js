/**
 * controllers/adminPage.js
 * /app/admin 페이지는 auth-middleware가 직접 처리하므로
 * 이 파일은 라우터 등록 참조용으로만 유지됩니다.
 */

const authMiddleware = require('./_shared/auth-middleware');

module.exports = async function handler(req, res) {
  return authMiddleware(req, res);
};
