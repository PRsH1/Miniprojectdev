const path = require('path');
const { promises: fs } = require('fs');

const HTML_ERROR_ROOT = path.join(process.cwd(), 'errors');

const ERROR_DEFINITIONS = {
  AUTH_REQUIRED: {
    status: 401,
    message: '로그인이 필요합니다.',
    reason: '이 요청은 인증된 사용자만 사용할 수 있습니다.',
    action: '로그인 후 다시 시도하세요.',
  },
  TOKEN_INVALID: {
    status: 401,
    message: '인증 토큰을 확인할 수 없습니다.',
    reason: '로그인 세션이 없거나 토큰 형식이 올바르지 않습니다.',
    action: '다시 로그인한 뒤 요청을 다시 시도하세요.',
  },
  TOKEN_EXPIRED: {
    status: 401,
    message: '로그인 세션이 만료되었습니다.',
    reason: '인증 토큰의 유효 시간이 지나 더 이상 사용할 수 없습니다.',
    action: '로그인 화면에서 다시 인증해 주세요.',
  },
  FORBIDDEN: {
    status: 403,
    message: '이 요청을 수행할 권한이 없습니다.',
    reason: '현재 계정에는 이 기능이나 페이지에 접근할 권한이 없습니다.',
    action: '권한이 있는 계정으로 로그인하거나 관리자에게 문의하세요.',
  },
  PAGE_NOT_FOUND: {
    status: 404,
    message: '요청한 페이지를 찾을 수 없습니다.',
    reason: '요청 경로가 잘못되었거나 해당 페이지가 더 이상 제공되지 않습니다.',
    action: '주소를 다시 확인하거나 홈으로 이동하세요.',
  },
  RESOURCE_NOT_FOUND: {
    status: 404,
    message: '요청한 리소스를 찾을 수 없습니다.',
    reason: '대상 데이터가 없거나 이미 삭제되었을 수 있습니다.',
    action: '입력값을 다시 확인한 뒤 다시 시도하세요.',
  },
  METHOD_NOT_ALLOWED: {
    status: 405,
    message: '허용되지 않은 요청 방식입니다.',
    reason: '이 엔드포인트는 현재 HTTP 메서드를 지원하지 않습니다.',
    action: '문서에 정의된 요청 방식을 사용하세요.',
  },
  VALIDATION_FAILED: {
    status: 400,
    message: '요청값이 올바르지 않습니다.',
    reason: '필수 항목이 누락되었거나 형식이 맞지 않습니다.',
    action: '입력값을 확인한 뒤 다시 시도하세요.',
  },
  INTERNAL_ERROR: {
    status: 500,
    message: '요청을 처리하는 중 오류가 발생했습니다.',
    reason: '서버 내부 처리 중 예상하지 못한 문제가 발생했습니다.',
    action: '잠시 후 다시 시도하고 문제가 계속되면 관리자에게 문의하세요.',
  },
  DATABASE_ERROR: {
    status: 500,
    message: '데이터 처리 중 오류가 발생했습니다.',
    reason: '저장 또는 조회 과정에서 서버가 요청을 완료하지 못했습니다.',
    action: '잠시 후 다시 시도하고 문제가 계속되면 관리자에게 문의하세요.',
  },
  UPSTREAM_API_ERROR: {
    status: 502,
    message: '외부 서비스 호출에 실패했습니다.',
    reason: '연동 중인 외부 서비스가 요청을 처리하지 못했습니다.',
    action: '입력값과 연동 상태를 확인한 뒤 다시 시도하세요.',
  },
};

function getRequestPath(req) {
  return (req.url || '').split('?')[0] || '/';
}

function isApiRequest(req) {
  return getRequestPath(req).startsWith('/api/');
}

function resolveDefinition(status, code) {
  if (code && ERROR_DEFINITIONS[code]) {
    return ERROR_DEFINITIONS[code];
  }

  const fallbackByStatus = {
    400: ERROR_DEFINITIONS.VALIDATION_FAILED,
    401: ERROR_DEFINITIONS.AUTH_REQUIRED,
    403: ERROR_DEFINITIONS.FORBIDDEN,
    404: ERROR_DEFINITIONS.RESOURCE_NOT_FOUND,
    405: ERROR_DEFINITIONS.METHOD_NOT_ALLOWED,
    500: ERROR_DEFINITIONS.INTERNAL_ERROR,
    502: ERROR_DEFINITIONS.UPSTREAM_API_ERROR,
    503: ERROR_DEFINITIONS.UPSTREAM_API_ERROR,
    504: ERROR_DEFINITIONS.UPSTREAM_API_ERROR,
  };

  return fallbackByStatus[status] || ERROR_DEFINITIONS.INTERNAL_ERROR;
}

function buildJsonPayload(status, options = {}) {
  const definition = resolveDefinition(status, options.code);
  const resolvedStatus = options.status || status || definition.status;
  const resolvedCode = options.code || Object.keys(ERROR_DEFINITIONS).find((key) => ERROR_DEFINITIONS[key] === definition) || 'INTERNAL_ERROR';

  return {
    error: {
      status: resolvedStatus,
      code: resolvedCode,
      message: options.message || definition.message,
      reason: options.reason || definition.reason,
      action: options.action || definition.action,
    },
  };
}

function logInternalError(status, payload, options) {
  const level = status >= 500 ? 'error' : 'warn';
  const logger = console[level] || console.error;
  const meta = {
    status,
    code: payload.error.code,
    path: options.path,
  };

  if (options.logMessage) {
    meta.logMessage = options.logMessage;
  }

  if (options.error) {
    meta.error = options.error;
  }

  logger('[respondError]', meta);
}

async function renderHtmlError(status, payload) {
  const filePath = path.join(HTML_ERROR_ROOT, `${status}.html`);

  try {
    return await fs.readFile(filePath, 'utf8');
  } catch {
    const title = `${payload.error.status} ${payload.error.code}`;
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Arial;background:#f6f7fb;color:#111827;display:grid;place-items:center;min-height:100vh;padding:24px}
    main{width:min(480px,92vw);background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px;box-shadow:0 10px 25px rgba(0,0,0,.08)}
    h1{margin:0 0 12px;font-size:32px}
    h2{margin:0 0 12px;font-size:20px}
    p{margin:0 0 10px;line-height:1.6;color:#4b5563}
    a{display:inline-block;margin-top:12px;padding:11px 18px;border-radius:10px;background:#0070f3;color:#fff;text-decoration:none}
  </style>
</head>
<body>
  <main>
    <h1>${payload.error.status}</h1>
    <h2>${payload.error.message}</h2>
    <p>${payload.error.reason}</p>
    <p>${payload.error.action}</p>
    <a href="/">홈으로 이동</a>
  </main>
</body>
</html>`;
  }
}

async function respondError(req, res, status, options = {}) {
  const payload = buildJsonPayload(status, options);
  const requestPath = options.path || getRequestPath(req);
  const apiRequest = options.forceType
    ? options.forceType === 'json'
    : isApiRequest(req);

  logInternalError(payload.error.status, payload, { ...options, path: requestPath });

  if (apiRequest) {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    return res.status(payload.error.status).json(payload);
  }

  const html = await renderHtmlError(payload.error.status, payload);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(payload.error.status).send(html);
}

function methodNotAllowed(req, res, allowedMethods, options = {}) {
  if (allowedMethods && allowedMethods.length) {
    res.setHeader('Allow', allowedMethods.join(', '));
  }

  return respondError(req, res, 405, {
    code: 'METHOD_NOT_ALLOWED',
    ...options,
  });
}

module.exports = {
  ERROR_DEFINITIONS,
  buildJsonPayload,
  getRequestPath,
  isApiRequest,
  methodNotAllowed,
  respondError,
};
