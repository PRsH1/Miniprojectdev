const pusher = require('./_shared/pusher');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

// 공개 채널로 전달해도 되는 수신 헤더 허용 목록 (그 외 헤더는 IP·인증 정보 유출 방지를 위해 버림)
const FORWARDED_HEADERS = new Set(['content-type', 'content-length', 'user-agent']);
// eformsign 서명 관련 헤더(eformsign_signature 등)는 접두어로 허용
const FORWARDED_HEADER_PREFIX = 'eformsign';

// Pusher 메시지 최대 10KB — 채널명·이벤트명 여유분을 두고 본문 직렬화 크기를 제한
const MAX_PUSHER_PAYLOAD_BYTES = 9000;
const SUMMARY_STRING_MAX = 200;

// Pusher 채널명 허용 문자 (company- 접두어 포함 164자 이내)
const COMPANY_ID_PATTERN = /^[A-Za-z0-9_\-=@,.;]{1,150}$/;

function pickForwardHeaders(headers) {
    const result = {};
    if (!headers || typeof headers !== 'object') return result;
    for (const [rawName, value] of Object.entries(headers)) {
        const name = String(rawName).toLowerCase();
        if (FORWARDED_HEADERS.has(name) || name.startsWith(FORWARDED_HEADER_PREFIX)) {
            result[name] = value;
        }
    }
    return result;
}

// req.body 접근 자체가 잘못된 JSON에서 예외를 던질 수 있으므로 안전하게 읽는다
function readJsonBody(req) {
    let body;
    try {
        body = req.body;
    } catch (_) {
        return null;
    }
    if (typeof body === 'string') {
        if (!body.trim()) return null;
        try {
            body = JSON.parse(body);
        } catch (_) {
            return null;
        }
    } else if (Buffer.isBuffer(body)) {
        try {
            body = JSON.parse(body.toString('utf8'));
        } catch (_) {
            return null;
        }
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
    return body;
}

function byteLength(value) {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
}

function clip(value) {
    if (value === undefined || value === null) return value;
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    return text.length > SUMMARY_STRING_MAX ? `${text.slice(0, SUMMARY_STRING_MAX)}…` : text;
}

// 10KB 초과 시 모니터 표에 필요한 핵심 필드만 남긴 요약본
function summarizeBody(body) {
    const pickDoc = (doc) => {
        if (!doc || typeof doc !== 'object') return undefined;
        const out = {};
        ['id', 'document_id', 'document_title', 'status', 'document_status', 'template_id', 'updated_date']
            .forEach((key) => {
                if (doc[key] !== undefined) out[key] = clip(doc[key]);
            });
        return out;
    };
    const summary = {
        company_id: clip(body.company_id),
        webhook_id: clip(body.webhook_id),
        event_type: clip(body.event_type),
    };
    const doc = pickDoc(body.document);
    if (doc) summary.document = doc;
    const pdfDoc = pickDoc(body.ready_document_pdf);
    if (pdfDoc) summary.ready_document_pdf = pdfDoc;
    return summary;
}

function buildEventPayload(req, body) {
    const payload = {
        headers: pickForwardHeaders(req.headers),
        body,
        receivedAt: new Date().toISOString(),
    };
    const originalSize = byteLength(payload);
    if (originalSize <= MAX_PUSHER_PAYLOAD_BYTES) return payload;

    payload.body = summarizeBody(body);
    payload.truncated = true;
    payload.originalSize = originalSize;
    if (byteLength(payload) > MAX_PUSHER_PAYLOAD_BYTES) {
        // 헤더까지 포함해도 넘치면 최소 정보만 전달
        payload.headers = {};
        payload.body = {
            company_id: clip(body.company_id),
            webhook_id: clip(body.webhook_id),
            event_type: clip(body.event_type),
        };
    }
    return payload;
}

async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(req, res, ['POST']);
    }

    const body = readJsonBody(req);
    if (!body) {
        return respondError(req, res, 400, {
            code: 'VALIDATION_FAILED',
            message: '웹훅 본문이 올바르지 않습니다.',
            reason: '요청 본문이 비어 있거나 JSON 객체가 아닙니다.',
            action: 'Content-Type: application/json 으로 JSON 객체를 전송하세요.',
        });
    }

    const companyId = body.company_id;
    if (companyId === undefined || companyId === null || companyId === '') {
        console.log('Webhook received without a company ID. Ignoring.');
        return res.status(200).json({ message: 'Webhook ignored: No company ID' });
    }

    const companyIdText = String(companyId);
    if (!COMPANY_ID_PATTERN.test(companyIdText)) {
        return respondError(req, res, 400, {
            code: 'VALIDATION_FAILED',
            message: 'company_id 형식이 올바르지 않습니다.',
            reason: 'company_id에 허용되지 않는 문자가 있거나 너무 깁니다.',
            action: 'eformsign 회사 ID를 그대로 전송하세요.',
        });
    }

    const companyChannelName = `company-${companyIdText}`;
    const eventPayload = buildEventPayload(req, body);

    try {
        await pusher.trigger(companyChannelName, 'new-event', eventPayload);
        return res.status(200).json({
            message: `Webhook received and forwarded to channel: ${companyChannelName}`,
            ...(eventPayload.truncated ? { truncated: true } : {}),
        });
    } catch (error) {
        console.error('Pusher trigger error:', error);
        return respondError(req, res, 502, {
            code: 'UPSTREAM_API_ERROR',
            message: '웹훅 이벤트를 실시간 채널로 전달하지 못했습니다.',
            reason: 'Pusher 연동 처리 중 오류가 발생했습니다.',
            action: '잠시 후 다시 시도하거나 실시간 연동 설정을 확인하세요.',
            error,
            logMessage: 'Pusher trigger failed',
        });
    }
}

module.exports = handler;
// 테스트용 내부 함수 노출
module.exports._internal = { pickForwardHeaders, readJsonBody, buildEventPayload, MAX_PUSHER_PAYLOAD_BYTES };
