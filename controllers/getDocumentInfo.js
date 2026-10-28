const { methodNotAllowed, respondError } = require('./_shared/respond-error');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return methodNotAllowed(req, res, ['GET']);
    }

    try {
        const { domain, documentId } = req.query;

        // 토큰은 Authorization: Bearer 헤더를 우선 사용한다.
        // 쿼리스트링 token은 로그·히스토리에 남으므로 폐기 예정 — 하위 호환으로만 허용하고 경고를 남긴다.
        const authHeader = req.headers && req.headers.authorization;
        const bearerMatch = typeof authHeader === 'string' ? /^Bearer\s+(.+)$/i.exec(authHeader.trim()) : null;
        let token = bearerMatch ? bearerMatch[1].trim() : '';
        if (!token && req.query.token) {
            token = String(req.query.token);
            console.warn('[getDocumentInfo] 쿼리스트링 token 사용은 폐기 예정입니다. Authorization: Bearer 헤더를 사용하세요.');
        }

        if (!domain || !documentId || !token) {
            return respondError(req, res, 400, {
                code: 'VALIDATION_FAILED',
                message: '필수 파라미터가 누락되었습니다.',
                reason: 'domain, documentId 쿼리와 Authorization: Bearer 토큰이 모두 필요합니다.',
                action: '요청 파라미터를 확인한 뒤 다시 시도하세요.',
            });
        }

        const params = new URLSearchParams({
            include_fields: 'true',
            include_histories: 'true',
            include_previous_status: 'true',
            include_next_status: 'true',
            include_external_token: 'true',
            include_detail_template_info: 'true'
        });
        const url = `${domain}/v2.0/api/documents/${encodeURIComponent(documentId)}?${params.toString()}`;

        const docResponse = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await docResponse.json();

        if (!docResponse.ok) {
            return respondError(req, res, docResponse.status >= 500 ? 502 : docResponse.status, {
                code: 'UPSTREAM_API_ERROR',
                message: '문서 정보를 불러오지 못했습니다.',
                reason: '외부 문서 조회 API가 요청을 정상적으로 처리하지 못했습니다.',
                action: '문서 ID와 토큰 유효성을 확인한 뒤 다시 시도하세요.',
                error: data,
                logMessage: 'Document info upstream API returned non-ok response',
            });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('Error fetching document info:', error);
        return respondError(req, res, 502, {
            code: 'UPSTREAM_API_ERROR',
            message: '문서 정보를 불러오지 못했습니다.',
            reason: '외부 문서 조회 서비스 연결 또는 응답 처리 중 오류가 발생했습니다.',
            action: '잠시 후 다시 시도하거나 입력값을 점검하세요.',
            error,
            logMessage: 'Document info request failed',
        });
    }
};
