const { methodNotAllowed, respondError } = require('./_shared/respond-error');

const handler = async (req, res) => {
    if (req.method !== 'POST') return methodNotAllowed(req, res, ['POST']);
    try {
        const { domain, apiKey, memberId, signature, execTime } = req.body;
        if (!domain || !apiKey || !memberId || !signature || !execTime) {
            return respondError(req, res, 400, {
                code: 'VALIDATION_FAILED',
                message: '필수 요청값이 누락되었습니다.',
                reason: 'domain, apiKey, memberId, signature, execTime이 모두 필요합니다.',
                action: '입력값을 확인한 뒤 다시 시도하세요.',
            });
        }
        const tokenResponse = await fetch(`${domain}/v2.0/api_auth/access_token`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + Buffer.from(apiKey).toString('base64'),
                'eformsign_signature': signature
            },
            body: JSON.stringify({ execution_time: execTime, member_id: memberId }),
        });
        const data = await tokenResponse.json();
        if (!tokenResponse.ok) {
            return respondError(req, res, tokenResponse.status >= 500 ? 502 : tokenResponse.status, {
                code: 'UPSTREAM_API_ERROR',
                message: 'eformsign 액세스 토큰 발급에 실패했습니다.',
                reason: '외부 인증 API가 요청을 정상적으로 처리하지 못했습니다.',
                action: '도메인, API Key, 서명 값을 확인한 뒤 다시 시도하세요.',
                logMessage: 'Upstream token API returned non-ok response',
                error: data,
            });
        }
        res.status(200).json(data);
    } catch (error) {
        console.error('Error getting access token:', error);
        return respondError(req, res, 502, {
            code: 'UPSTREAM_API_ERROR',
            message: 'eformsign 액세스 토큰 발급에 실패했습니다.',
            reason: '외부 인증 API 호출 또는 응답 처리 중 문제가 발생했습니다.',
            action: '연결 대상 도메인과 인증 정보를 다시 확인하세요.',
            error,
            logMessage: 'Token API request failed',
        });
    }
};
module.exports = handler;
