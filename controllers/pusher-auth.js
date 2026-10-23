/**
 * controllers/pusher-auth.js
 * Pusher private channel authentication
 *
 * POST /api/pusher/auth
 */

const pusher = require('./_shared/pusher');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');
const { requireRole } = require('./_shared/session');

async function readBody(req) {
  if (Buffer.isBuffer(req.body)) {
    const params = new URLSearchParams(req.body.toString('utf8'));
    return {
      socket_id: params.get('socket_id'),
      channel_name: params.get('channel_name'),
    };
  }

  if (req.body && typeof req.body === 'object') return req.body;

  const raw = typeof req.body === 'string'
    ? req.body
    : await new Promise((resolve, reject) => {
        if (typeof req.on !== 'function') {
          resolve('');
          return;
        }
        let data = '';
        req.on('data', chunk => { data += chunk; });
        req.on('end', () => resolve(data));
        req.on('error', reject);
      });

  const params = new URLSearchParams(raw || '');
  return {
    socket_id: params.get('socket_id'),
    channel_name: params.get('channel_name'),
  };
}

function canAuthorizeChannel(decoded, channelName) {
  if (channelName === 'private-notifications-admin') {
    return decoded.role === 'admin';
  }

  const userChannelMatch = channelName.match(/^private-notifications-([A-Za-z0-9_-]+)$/);
  return Boolean(userChannelMatch && String(decoded.sub) === userChannelMatch[1]);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return methodNotAllowed(req, res, ['POST']);
  }

  // DB의 현재 role로 채널 권한을 판단 (강등된 admin은 즉시 admin 채널 구독 불가)
  // 알림 구독은 읽기 전용이므로 임시 비밀번호 상태에서도 허용
  const decoded = await requireRole(req, res, 'user', { allowMustChangePassword: true });
  if (!decoded) return;

  const body = await readBody(req);
  const socketId = body.socket_id;
  const channelName = body.channel_name;

  if (!socketId || !channelName) {
    return respondError(req, res, 400, {
      code: 'VALIDATION_FAILED',
      message: 'socket_id와 channel_name은 필수입니다.',
      reason: 'Pusher private 채널 인증에 필요한 값이 누락되었습니다.',
      action: 'Pusher 클라이언트 설정을 확인한 뒤 다시 시도하세요.',
      logMessage: 'Pusher auth missing socket_id or channel_name',
    });
  }

  if (!canAuthorizeChannel(decoded, channelName)) {
    return respondError(req, res, 403, {
      code: 'FORBIDDEN',
      message: '이 알림 채널에 접근할 수 없습니다.',
      reason: '현재 로그인 사용자와 요청한 Pusher private 채널이 일치하지 않습니다.',
      action: '다시 로그인한 뒤 알림 구독을 재시도하세요.',
      logMessage: `Pusher channel forbidden: ${channelName}`,
    });
  }

  try {
    const auth = pusher.authorizeChannel(socketId, channelName);
    return res.status(200).json(auth);
  } catch (error) {
    return respondError(req, res, 500, {
      code: 'INTERNAL_ERROR',
      error,
      logMessage: 'Pusher channel authorization failed',
    });
  }
};
