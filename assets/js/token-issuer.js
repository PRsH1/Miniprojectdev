(function (window) {
    'use strict';

    const TOKEN_PATH = '/v2.0/api_auth/access_token';

    function normalizeDomain(domain) {
        return String(domain || '')
            .trim()
            .replace(/\/+$/, '')
            .replace(/\/v2\.0\/api_auth\/access_token$/i, '')
            .replace(/\/v2\.0\/api$/i, '');
    }

    function stringifyData(data) {
        try {
            return JSON.stringify(data);
        } catch (_) {
            return String(data);
        }
    }

    function firstText() {
        for (let i = 0; i < arguments.length; i += 1) {
            const value = arguments[i];
            if (value !== undefined && value !== null && String(value).trim()) {
                return String(value).trim();
            }
        }
        return '';
    }

    function formatCodeMessage(code, message) {
        const cleanCode = firstText(code);
        const cleanMessage = firstText(message);
        if (cleanCode && cleanMessage) return `[${cleanCode}] ${cleanMessage}`;
        if (cleanMessage) return cleanMessage;
        if (cleanCode) return `[${cleanCode}]`;
        return '';
    }

    function extractDirectMessage(data) {
        if (!data || typeof data !== 'object') return firstText(data) || '알 수 없는 오류';
        const code = firstText(data.code, data.error_code, data.error && data.error.code);
        const message = firstText(
            data.ErrorMessage,
            data.message,
            data.error_message,
            data.error && data.error.message
        );
        return formatCodeMessage(code, message) || stringifyData(data);
    }

    function extractProxyMessage(data) {
        const upstream = data && data.error && data.error.upstream;
        if (upstream) {
            return formatCodeMessage(upstream.code, upstream.message)
                || firstText(upstream.body && upstream.body.ErrorMessage, upstream.body && upstream.body.message)
                || stringifyData(upstream.body || upstream);
        }
        return firstText(data && data.error && data.error.message) || extractDirectMessage(data);
    }

    function buildResult(data, via, messageExtractor) {
        const token = data && data.oauth_token && data.oauth_token.access_token;
        if (token) {
            return { ok: true, token, data, message: '', via };
        }
        return {
            ok: false,
            token: '',
            data,
            message: messageExtractor(data),
            via
        };
    }

    async function tryDirect(payload) {
        const domain = normalizeDomain(payload.domain);
        let res;
        try {
            res = await fetch(`${domain}${TOKEN_PATH}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json; charset=UTF-8',
                    'Authorization': 'Bearer ' + btoa(payload.apiKey),
                    'eformsign_signature': payload.signature
                },
                body: JSON.stringify({
                    execution_time: payload.execTime,
                    member_id: payload.memberId
                })
            });
        } catch (error) {
            return {
                ok: false,
                token: '',
                data: null,
                message: error && error.message ? error.message : 'direct 호출 실패',
                via: 'direct',
                transportFail: true
            };
        }

        const data = await res.json().catch(() => ({}));
        return buildResult(data, 'direct', extractDirectMessage);
    }

    async function tryProxy(payload) {
        const normalizedPayload = {
            domain: normalizeDomain(payload.domain),
            apiKey: payload.apiKey,
            memberId: payload.memberId,
            signature: payload.signature,
            execTime: payload.execTime
        };

        try {
            const res = await fetch('/api/getToken', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(normalizedPayload)
            });
            const data = await res.json().catch(() => ({}));
            return buildResult(data, 'proxy', extractProxyMessage);
        } catch (error) {
            return {
                ok: false,
                token: '',
                data: null,
                message: '프록시 호출 실패: ' + (error && error.message ? error.message : '알 수 없는 오류'),
                via: 'proxy'
            };
        }
    }

    async function issueAccessToken(payload) {
        let result = await tryDirect(payload);
        if (result.transportFail) {
            console.info('[token] direct 전송 실패(CORS/네트워크) /api/getToken 프록시 경유 재시도');
            result = await tryProxy(payload);
        }
        return result;
    }

    window.issueAccessToken = issueAccessToken;
})(window);
