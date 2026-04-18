/**
 * controllers/_shared/protectedPage.js
 * 보호 페이지 핸들러 팩토리 — auth-middleware.js에 위임
 *
 * createProtectedPageHandler 인터페이스를 유지하면서 내부 구현을
 * 새 DB 기반 auth-middleware로 교체한다.
 * config 파라미터는 마이그레이션 참조용으로만 유지.
 */

const authMiddleware = require('./auth-middleware');

module.exports = function createProtectedPageHandler(config) {
  // config는 하위 호환을 위해 인수로 받되 사용하지 않음.
  // 실제 인증/권한 체크는 auth-middleware가 DB 기반으로 처리.
  return async function protectedPageHandler(req, res) {
    return authMiddleware(req, res);
  };
};
