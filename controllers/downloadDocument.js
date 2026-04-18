const { methodNotAllowed, respondError } = require('./_shared/respond-error');

module.exports = async function handler(req, res) {
    if (req.method !== 'GET') {
        return methodNotAllowed(req, res, ['GET']);
    }

    try {
        const { domain, documentId, file_type, title } = req.query;
        const token = req.headers.authorization?.split(' ')[1];

        if (!domain || !documentId || !file_type || !token) {
            return respondError(req, res, 400, {
                code: 'VALIDATION_FAILED',
                message: '필수 요청값이 누락되었습니다.',
                reason: 'domain, documentId, file_type, Authorization 토큰이 모두 필요합니다.',
                action: '요청값을 확인한 뒤 다시 시도하세요.',
            });
        }

        const params = new URLSearchParams({ file_type });
        const url = `${domain}/v2.0/api/documents/${documentId}/download_files?${params.toString()}`;

        const fileResponse = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!fileResponse.ok) {
            let errorJson = null;
            try {
                errorJson = await fileResponse.json();
            } catch {
                errorJson = null;
            }
            return respondError(req, res, fileResponse.status >= 500 ? 502 : fileResponse.status, {
                code: 'UPSTREAM_API_ERROR',
                message: '문서 파일을 다운로드하지 못했습니다.',
                reason: '외부 다운로드 API가 요청을 정상적으로 처리하지 못했습니다.',
                action: '문서 상태와 다운로드 권한을 확인한 뒤 다시 시도하세요.',
                error: errorJson,
                logMessage: 'Document download upstream API returned non-ok response',
            });
        }
        
        const contentType = fileResponse.headers.get('content-type');
        const fileBuffer = await fileResponse.arrayBuffer();

        let finalFileName = title || 'download';

        if (file_type === 'audit_trail') {
            finalFileName += '_audit_trail';
        }
        
        if (contentType && contentType.includes('application/pdf') && !finalFileName.toLowerCase().endsWith('.pdf')) {
            finalFileName += '.pdf';
        } else if (contentType && contentType.includes('application/zip') && !finalFileName.toLowerCase().endsWith('.zip')) {
            finalFileName += '.zip';
        }
        
        const encodedFileName = encodeURIComponent(finalFileName);
        res.setHeader('Content-Disposition', `attachment; filename*="UTF-8''${encodedFileName}"`);
        
        if (contentType) {
            res.setHeader('Content-Type', contentType);
        }

        res.send(Buffer.from(fileBuffer));

    } catch (error) {
        console.error('File download proxy error:', error);
        return respondError(req, res, 502, {
            code: 'UPSTREAM_API_ERROR',
            message: '문서 파일을 다운로드하지 못했습니다.',
            reason: '외부 파일 다운로드 처리 중 오류가 발생했습니다.',
            action: '잠시 후 다시 시도하거나 요청 파라미터를 확인하세요.',
            error,
            logMessage: 'Document download request failed',
        });
    }
};
