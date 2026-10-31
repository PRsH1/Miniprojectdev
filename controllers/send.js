const util = require('util');
const nodemailer = require('nodemailer');
const { methodNotAllowed, buildJsonPayload } = require('./_shared/respond-error');

// SMTP 대화 로그 한도 — 응답 크기 보호 (P1-22)
const MAX_LOG_LINES = 300;
const MAX_LOG_LINE_LENGTH = 2000;

// 서버리스 함수 시간 안에 실패 로그를 돌려주기 위한 타임아웃(ms).
// nodemailer 기본값(연결 2분)은 함수 제한 시간보다 길어 실패 시 로그가 사라진다.
const TIMEOUTS = {
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
};

// nodemailer 에러 코드 → 한글 실패 사유
const FAILURE_REASONS = {
    EDNS: 'SMTP 호스트 이름을 찾을 수 없습니다. 호스트 주소의 오타를 확인하세요.',
    ENOTFOUND: 'SMTP 호스트 이름을 찾을 수 없습니다. 호스트 주소의 오타를 확인하세요.',
    ECONNREFUSED: 'SMTP 서버가 연결을 거부했습니다. 포트 번호와 서버의 외부 접속 허용 여부를 확인하세요.',
    ECONNECTION: 'SMTP 서버와 연결하지 못했거나 연결이 끊겼습니다. 호스트·포트·보안 방식(SSL/STARTTLS) 조합을 확인하세요.',
    ETIMEDOUT: 'SMTP 서버 응답 시간이 초과되었습니다. 포트가 방화벽에 막혀 있거나 보안 방식이 맞지 않을 수 있습니다.',
    ESOCKET: '소켓 오류로 SMTP 연결이 실패했습니다. 보안 방식(SSL/STARTTLS)과 포트 조합을 확인하세요.',
    ETLS: 'TLS 연결(STARTTLS/SSL)에 실패했습니다. 보안 방식과 포트 조합을 확인하세요.',
    EAUTH: 'SMTP 인증에 실패했습니다. 사용자·비밀번호(앱 비밀번호 여부)를 확인하세요.',
    ENOAUTH: '인증 정보가 없습니다. Use Auth를 켰다면 사용자와 비밀번호를 입력하세요.',
    EENVELOPE: '보내는 사람 또는 받는 사람 주소가 SMTP 서버에서 거부되었습니다.',
    EMESSAGE: 'SMTP 서버가 메일 전송을 거부했습니다. 로그의 서버 응답 코드를 확인하세요.',
    EPROTOCOL: 'SMTP 서버 응답이 올바르지 않습니다. 포트가 SMTP 포트인지 확인하세요.',
};
const DEFAULT_FAILURE_REASON = 'SMTP 서버가 요청을 처리하지 못했거나 연결 과정에서 오류가 발생했습니다. 아래 SMTP 로그를 확인하세요.';

function failureReason(error) {
    if (!error) return DEFAULT_FAILURE_REASON;
    return FAILURE_REASONS[error.code] || DEFAULT_FAILURE_REASON;
}

function escapeRegExp(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 로그 줄에서 크리덴셜을 지운다 (P1-22).
 * - 비밀번호 원문 / base64 / URL 인코딩 형태
 * - AUTH PLAIN·XOAUTH2 페이로드 (nodemailer가 이미 가리지만 이중 방어)
 */
function createMasker(secrets) {
    const patterns = [];
    for (const secret of secrets) {
        if (!secret) continue;
        const variants = new Set([
            secret,
            Buffer.from(secret, 'utf-8').toString('base64'),
            encodeURIComponent(secret),
        ]);
        for (const v of variants) {
            if (v && v.length >= 1) patterns.push(new RegExp(escapeRegExp(v), 'g'));
        }
    }
    // 긴 패턴부터 치환해야 부분 문자열이 먼저 지워져 긴 형태가 남는 일이 없다
    patterns.sort((a, b) => b.source.length - a.source.length);

    return function mask(line) {
        let out = String(line);
        out = out.replace(/(AUTH\s+(?:PLAIN|XOAUTH2))\s+\S+/gi, '$1 /* secret */');
        for (const re of patterns) out = out.replace(re, '/* secret */');
        if (out.length > MAX_LOG_LINE_LENGTH) out = out.slice(0, MAX_LOG_LINE_LENGTH) + ' …(생략)';
        return out;
    };
}

function createLogBuffer(mask) {
    const lines = [];
    let dropped = 0;
    return {
        push(line) {
            if (lines.length >= MAX_LOG_LINES) { dropped += 1; return; }
            lines.push(mask(line));
        },
        toArray() {
            return dropped ? lines.concat(`… 로그 ${dropped}줄 생략 (최대 ${MAX_LOG_LINES}줄)`) : lines.slice();
        },
    };
}

// nodemailer logger는 bunyan 형식 (meta 객체, 포맷 문자열, ...값)으로 호출한다 → "[component] 포맷 적용 문장"
function formatArgs(args) {
    const rest = args.slice();
    let meta = null;
    if (rest.length > 1 && rest[0] && typeof rest[0] === 'object' && !(rest[0] instanceof Error)) {
        meta = rest.shift();
    }
    const text = rest.length ? util.format(...rest) : '';
    return (meta && meta.component ? `[${meta.component}] ` : '') + text;
}

module.exports = async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(req, res, ['POST']);
    }

    // req.body는 Vercel이 파싱한 객체 또는 원문 문자열 — URLSearchParams가 둘 다 받는다
    const params = new URLSearchParams(req.body || '');
    const host = (params.get('host') || '').trim();
    const port = parseInt(params.get('port'), 10);
    const authRequired = params.get('authRequired') === 'true';
    const user = params.get('user') || '';
    const pass = params.get('pass') || '';
    const from = (params.get('from') || '').trim();
    const to = (params.get('to') || '').trim();
    const security = params.get('security');

    const logBuffer = createLogBuffer(createMasker([pass]));

    // 에러 응답: 표준 error 객체 + 최상위 logs(크리덴셜 마스킹된 SMTP 대화 로그) — rules/error-response.md
    function sendError(status, options) {
        const payload = buildJsonPayload(status, options);
        payload.logs = logBuffer.toArray();
        const logger = status >= 500 ? console.error : console.warn;
        logger('[respondError]', {
            status: payload.error.status,
            code: payload.error.code,
            path: (req.url || '').split('?')[0],
            logMessage: options.logMessage,
            errorCode: options.error && options.error.code,
        });
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.status(payload.error.status).json(payload);
    }

    if (!host || !port || !from || !to) {
        const missing = [!host && 'Host', !port && 'Port', !from && 'From', !to && 'To'].filter(Boolean);
        logBuffer.push(`[VALIDATION] 필수값 누락: ${missing.join(', ')}`);
        return sendError(400, {
            code: 'VALIDATION_FAILED',
            message: '필수값이 비어 있습니다.',
            reason: `SMTP 테스트에는 Host, Port, From, To 값이 필요합니다. (누락: ${missing.join(', ')})`,
            action: '입력값을 모두 채운 뒤 다시 시도하세요.',
        });
    }

    try {
        // 비밀번호는 로그에 남기지 않는다 (입력 여부만)
        logBuffer.push(`[REQUEST] Host=${host}, Port=${port}, AuthRequired=${authRequired}, User=${authRequired ? user : '-'}, Password=${authRequired ? (pass ? '(입력됨)' : '(비어 있음)') : '-'}, From=${from}, To=${to}, Security=${security}`);
        logBuffer.push(`[CONNECT] ${host}:${port} 연결 시도 (보안: ${security === 'ssl' ? 'SSL/TLS' : security === 'tls' ? 'STARTTLS' : '없음'}, 연결 제한 ${TIMEOUTS.connectionTimeout / 1000}초)`);

        const transporterOptions = {
            host: host,
            port: port,
            secure: security === 'ssl',
            requireTLS: security === 'tls',
            auth: authRequired ? { user, pass } : undefined,
            ...TIMEOUTS,
            debug: true,
            logger: {
                info: (...args) => logBuffer.push(`[INFO] ${formatArgs(args)}`),
                debug: (...args) => logBuffer.push(`[DEBUG] ${formatArgs(args)}`),
                warn: (...args) => logBuffer.push(`[WARN] ${formatArgs(args)}`),
                error: (...args) => logBuffer.push(`[ERROR] ${formatArgs(args)}`),
            },
            tls: {
                rejectUnauthorized: false,
                ciphers: 'DEFAULT:@SECLEVEL=1'
            }
        };

        const transporter = nodemailer.createTransport(transporterOptions);

        const info = await transporter.sendMail({
            from: from,
            to: to,
            subject: 'SMTP 발송 테스트 (Node.js Serverless)',
            text: '이 메일은 Vercel 서버리스 함수를 통해 발송된 테스트입니다.',
        });

        logBuffer.push(`[SUCCESS] Mail sent: ${info.response}`);

        // message는 평문 — 화면은 textContent로 표시한다 (이전의 HTML 조각 반환 제거)
        return res.status(200).json({
            success: true,
            message: `메일 발송 성공! 수신자: ${to}`,
            logs: logBuffer.toArray(),
        });
    } catch (error) {
        logBuffer.push(`[ERROR] Mail sending failed: ${error && error.code ? `[${error.code}] ` : ''}${error && error.message}`);

        return sendError(502, {
            code: 'UPSTREAM_API_ERROR',
            message: '메일 발송 테스트에 실패했습니다.',
            reason: failureReason(error),
            action: '호스트, 포트, 보안 방식, 인증 정보를 다시 확인하세요.',
            error,
            logMessage: 'SMTP send failed',
        });
    }
};

module.exports._internal = { createMasker, failureReason, MAX_LOG_LINES };
