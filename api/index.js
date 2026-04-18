// api/index.js (Lazy Loading 적용)

const controllers = {
  // ─── 인증 API ───────────────────────────────────────────────
  'login':                    () => require('../controllers/login'),
  'logout':                   () => require('../controllers/logout'),
  'refresh':                  () => require('../controllers/refresh'),
  'me':                       () => require('../controllers/me'),
  'signup':                   () => require('../controllers/signup'),
  'signup-status':            () => require('../controllers/signupStatus'),
  'password-reset-request':   () => require('../controllers/password-reset-request'),
  'change-password':          () => require('../controllers/change-password'),

  // ─── 기존 API 엔드포인트 ─────────────────────────────────────
  'auth':                     () => require('../controllers/auth'),
  'downloadDocument':         () => require('../controllers/downloadDocument'),
  'getDocumentInfo':          () => require('../controllers/getDocumentInfo'),
  'getToken':                 () => require('../controllers/getToken'),
  'idp-initiated-login':      () => require('../controllers/idp-initiated-login'),
  'metadata':                 () => require('../controllers/metadata'),
  'send':                     () => require('../controllers/send'),
  'sso-login':                () => require('../controllers/sso-login'),
  'webhook-receiver':         () => require('../controllers/webhook-receiver'),

  // ─── 레거시 페이지 컨트롤러 (경로는 /app/* 으로 이전됨) ──────
  'memberPage':               () => require('../controllers/memberPage'),
  'memberV2Page':             () => require('../controllers/memberV2Page'),
  'templatecopy':             () => require('../controllers/templatecopy'),
  'idptestauth':              () => require('../controllers/idptestauth'),
  'ApiAutoTest':              () => require('../controllers/ApiAutoTest'),
  'OpenAPIAutoTest':          () => require('../controllers/OpenAPIAutoTest'),
};

module.exports = async (req, res) => {
  const { url } = req;
  const path = url.split('?')[0];

  // ─── /app/* → auth-middleware (DB 기반 보호 페이지) ────────
  if (path.startsWith('/app/')) {
    const authMiddleware = require('../controllers/_shared/auth-middleware');
    return authMiddleware(req, res);
  }

  // ─── /api/admin/* → 관리자 API 컨트롤러 ────────────────────
  if (path.startsWith('/api/admin/')) {
    if (path.startsWith('/api/admin/users') || path.startsWith('/api/admin/password-reset-requests')) {
      const adminUsers = require('../controllers/adminUsers');
      return adminUsers(req, res);
    }
    if (path.startsWith('/api/admin/pages')) {
      const adminPages = require('../controllers/adminPages');
      return adminPages(req, res);
    }
    if (path.startsWith('/api/admin/audit-logs')) {
      const adminAuditLogs = require('../controllers/adminAuditLogs');
      return adminAuditLogs(req, res);
    }
    if (path.startsWith('/api/admin/signup-requests')) {
      const adminSignupRequests = require('../controllers/adminSignupRequests');
      return adminSignupRequests(req, res);
    }
    return res.status(404).send('Not Found');
  }

  let controllerKey = '';

  // ─── URL 파싱 ────────────────────────────────────────────────
  if (path.startsWith('/api/')) {
    controllerKey = path.replace('/api/', '').split('/')[0];
  }

  // 2. 컨트롤러 로더 찾기
  const controllerLoader = controllers[controllerKey];

  if (!controllerKey || !controllerLoader) {
    console.warn(`⚠️ 404 Not Found: ${path}`);
    return res.status(404).send('Not Found');
  }

  try {
    const controller = controllerLoader();

    if (typeof controller === 'function') {
      return await controller(req, res);
    } else if (typeof controller.default === 'function') {
      return await controller.default(req, res);
    } else if (typeof controller.handler === 'function') {
      return await controller.handler(req, res);
    } else {
      throw new Error(`Controller [${controllerKey}] is not a function`);
    }
  } catch (error) {
    console.error(`❌ Critical Error in ${controllerKey}:`, error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};
