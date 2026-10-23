// api/index.js (Lazy Loading 적용)
const { respondError } = require('../controllers/_shared/respond-error');

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
  'developer-notes':          () => require('../controllers/developer-notes'),
  'bug-reports':              () => require('../controllers/bug-reports'),

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
  'memberV2Page':             () => require('../controllers/memberV2Page'),
  'templatecopy':             () => require('../controllers/templatecopy'),
  'idptestauth':              () => require('../controllers/idptestauth'),
  'OpenAPIAutoTest':          () => require('../controllers/OpenAPIAutoTest'),
};

/** 로더가 반환한 모듈에서 실제 핸들러 함수를 꺼낸다 */
function resolveHandler(controller, controllerKey) {
  if (typeof controller === 'function') return controller;
  if (controller && typeof controller.default === 'function') return controller.default;
  if (controller && typeof controller.handler === 'function') return controller.handler;
  throw new Error(`Controller [${controllerKey}] is not a function`);
}

/**
 * 경로별 컨트롤러 디스패치
 * 모든 분기는 반드시 `return await` 로 호출한다 — 그래야 컨트롤러의 비동기 예외가
 * 아래 module.exports의 단일 try/catch로 모여 JSON(또는 HTML) 에러로 응답된다.
 */
async function dispatch(req, res, path) {
  // ─── /app/* → auth-middleware (DB 기반 보호 페이지) ────────
  if (path.startsWith('/app/')) {
    const authMiddleware = require('../controllers/_shared/auth-middleware');
    return await authMiddleware(req, res);
  }

  // ─── /api/cron/* → Cron Job 컨트롤러 ──────────────────────
  if (path.startsWith('/api/cron/')) {
    if (path === '/api/cron/cleanup-audit') {
      const cleanupAudit = require('../controllers/cron/cleanup-audit');
      return await cleanupAudit(req, res);
    }
    return respondError(req, res, 404, {
      code: 'RESOURCE_NOT_FOUND',
      message: '요청한 Cron 엔드포인트를 찾을 수 없습니다.',
      reason: '등록되지 않은 Cron 경로입니다.',
      action: '사용 가능한 Cron 엔드포인트를 확인하세요.',
      logMessage: 'Unknown cron route',
    });
  }

  // ─── /api/notifications/* → 알림 API ────────────────────────
  if (path.startsWith('/api/notifications')) {
    const notifications = require('../controllers/notifications');
    return await notifications(req, res);
  }

  // ─── /api/pusher/* → Pusher private channel auth ───────────
  if (path.startsWith('/api/pusher/')) {
    const pusherAuth = require('../controllers/pusher-auth');
    return await pusherAuth(req, res);
  }

  // ─── /api/credentials/* → 크리덴셜 CRUD ────────────────────
  if (path.startsWith('/api/credentials')) {
    const credentials = require('../controllers/credentials');
    return await credentials(req, res);
  }

  // ─── /api/request-history/* → 요청 히스토리 CRUD ────────────
  if (path.startsWith('/api/request-history')) {
    const requestHistory = require('../controllers/requestHistory');
    return await requestHistory(req, res);
  }

  // ─── /api/admin/* → 관리자 API 컨트롤러 ────────────────────
  if (path.startsWith('/api/admin/')) {
    if (path.startsWith('/api/admin/users') || path.startsWith('/api/admin/password-reset-requests')) {
      const adminUsers = require('../controllers/adminUsers');
      return await adminUsers(req, res);
    }
    if (path.startsWith('/api/admin/pages')) {
      const adminPages = require('../controllers/adminPages');
      return await adminPages(req, res);
    }
    if (path.startsWith('/api/admin/audit-logs')) {
      const adminAuditLogs = require('../controllers/adminAuditLogs');
      return await adminAuditLogs(req, res);
    }
    if (path.startsWith('/api/admin/signup-requests')) {
      const adminSignupRequests = require('../controllers/adminSignupRequests');
      return await adminSignupRequests(req, res);
    }
    if (path.startsWith('/api/admin/ip-whitelist')) {
      const adminIpWhitelist = require('../controllers/adminIpWhitelist');
      return await adminIpWhitelist(req, res);
    }
    return respondError(req, res, 404, {
      code: 'RESOURCE_NOT_FOUND',
      message: '요청한 관리자 API를 찾을 수 없습니다.',
      reason: '등록되지 않은 관리자 API 경로입니다.',
      action: '관리자 콘솔에서 사용하는 올바른 경로인지 확인하세요.',
      logMessage: 'Unknown admin API route',
    });
  }

  let controllerKey = '';

  // ─── URL 파싱 ────────────────────────────────────────────────
  if (path.startsWith('/api/')) {
    controllerKey = path.replace('/api/', '').split('/')[0];
  }

  // 컨트롤러 로더 찾기 (hasOwnProperty로 'constructor' 등 프로토타입 키 차단)
  const controllerLoader = Object.prototype.hasOwnProperty.call(controllers, controllerKey)
    ? controllers[controllerKey]
    : null;

  if (!controllerKey || !controllerLoader) {
    console.warn(`⚠️ 404 Not Found: ${path}`);
    return respondError(req, res, 404, {
      code: path.startsWith('/api/') ? 'RESOURCE_NOT_FOUND' : 'PAGE_NOT_FOUND',
      message: path.startsWith('/api/')
        ? '요청한 API 엔드포인트를 찾을 수 없습니다.'
        : '요청한 페이지를 찾을 수 없습니다.',
      reason: path.startsWith('/api/')
        ? '등록되지 않았거나 제거된 API 경로입니다.'
        : '등록되지 않았거나 제거된 페이지 경로입니다.',
      action: '경로를 다시 확인한 뒤 다시 시도하세요.',
      logMessage: 'Controller not found',
    });
  }

  const handler = resolveHandler(controllerLoader(), controllerKey);
  return await handler(req, res);
}

/** 디스패치 중 처리되지 않은 예외를 공통 에러 응답으로 변환 */
function handleUnexpectedError(req, res, path, error) {
  console.error(`❌ Unhandled route error (${path}):`, error);

  // 컨트롤러가 이미 응답을 시작했다면 다시 쓸 수 없다 — 로그만 남긴다
  if (res.headersSent) return undefined;

  const isApi = path.startsWith('/api/');
  return respondError(req, res, 500, {
    code: 'INTERNAL_ERROR',
    message: isApi
      ? '요청을 처리하는 중 서버 오류가 발생했습니다.'
      : '페이지를 처리하는 중 서버 오류가 발생했습니다.',
    reason: isApi
      ? '서버가 요청을 정상적으로 완료하지 못했습니다.'
      : '페이지 인증, 조회 또는 렌더링 중 오류가 발생했습니다.',
    action: '잠시 후 다시 시도하세요.',
    error,
    logMessage: `Unhandled route error: ${path}`,
  });
}

module.exports = async (req, res) => {
  const { url } = req;
  const path = (url || '').split('?')[0];

  // ─── IP 화이트리스트 체크 (global + path scope) ─────────────
  try {
    const { checkIpAllowed } = require('../controllers/_shared/ip-whitelist');
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim()
      || req.socket?.remoteAddress || '';
    const ipCheck = await checkIpAllowed(clientIp, path, 'global_and_path');
    if (!ipCheck.allowed) {
      console.warn(`[IP Whitelist] 차단: ${clientIp} → ${path} (scope: ${ipCheck.blockedBy})`);
      return respondError(req, res, 403, {
        code: 'FORBIDDEN',
        message: '이 IP 주소에서는 접근이 허용되지 않습니다.',
        reason: 'IP 화이트리스트에 등록되지 않은 주소입니다.',
        action: '허용된 네트워크에서 접근하거나 관리자에게 문의하세요.',
        logMessage: `IP whitelist blocked (${ipCheck.blockedBy}): ${clientIp}`,
      });
    }
  } catch (err) {
    console.error('[IP Whitelist] 체크 오류 (fail-open):', err);
  }

  // ─── 라우트 디스패치 (모든 경로를 단일 try/catch로 보호) ────
  try {
    return await dispatch(req, res, path);
  } catch (error) {
    return handleUnexpectedError(req, res, path, error);
  }
};
