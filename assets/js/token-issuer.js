/**
 * assets/js/token-issuer.js
 * eformsign Access Token 발급 공유 모듈 (IIFE → window.issueAccessToken)
 *
 *   const r = await window.issueAccessToken({ domain, apiKey, memberId, signature, execTime });
 *   // 성공: { ok:true, token, data, message:'', via:'direct'|'proxy', issuedAt, expiresAt, expiresIn, expiresEstimated }
 *   // 실패: { ok:false, token:'', data, message:'[코드] 메시지', via }
 *
 * - direct 호출이 CORS/네트워크로 실패(transportFail)할 때만 /api/getToken 프록시로 재시도한다.
 *   인증 거부(4xx 응답)는 즉시 최종 실패로 돌려준다.
 * - expiresAt: 응답 oauth_token.expires_in(초)이 있으면 발급 시각 + expires_in, 없으면 + 3600초로 추정(expiresEstimated:true).
 * - 서명 생성은 각 페이지가 담당하고 계산된 서명값만 받는다(비밀키가 이 모듈·서버로 가지 않음).
 */
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

    const DEFAULT_TTL_SECONDS = 3600;

    // 만료 시각 계산: 응답에 expires_in(초)이 있으면 사용하고, 없으면 발급 시각 + 3600초로 추정한다
    function expiryInfo(oauthToken) {
        const issuedAt = Date.now();
        const expiresIn = Number(oauthToken && oauthToken.expires_in);
        const known = Number.isFinite(expiresIn) && expiresIn > 0;
        const ttl = known ? expiresIn : DEFAULT_TTL_SECONDS;
        return {
            issuedAt,
            expiresAt: issuedAt + ttl * 1000,
            expiresIn: ttl,
            expiresEstimated: !known
        };
    }

    function buildResult(data, via, messageExtractor) {
        const token = data && data.oauth_token && data.oauth_token.access_token;
        if (token) {
            const exp = expiryInfo(data.oauth_token);
            return Object.assign({ ok: true, token, data, message: '', via }, exp);
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
        const result = buildResult(data, 'direct', extractDirectMessage);
        result.status = res.status;
        // 본문이 JSON이 아니거나 비어 있으면 '{}' 대신 HTTP 상태를 메시지로 쓴다
        if (!result.ok && (!result.message || result.message === '{}')) {
            result.message = `HTTP ${res.status}`;
        }
        return result;
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
            const result = buildResult(data, 'proxy', extractProxyMessage);
            result.status = res.status;
            if (!result.ok && (!result.message || result.message === '{}')) {
                result.message = `HTTP ${res.status}`;
            }
            return result;
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
