/**
 * assets/js/api-error.js
 * 친절한 API 에러 표시 공유 모듈 (IIFE)
 *
 * 사용법:
 *   <script src="/assets/js/api-error.js"></script>
 *
 *   // HTTP 에러 응답
 *   renderApiError(container, { status: res.status, bodyText: await res.text(), url });
 *   // 네트워크·CORS 실패 (fetch reject)
 *   renderApiError(container, { error: err, url });
 *   // Response 객체를 그대로 넘기기 (본문을 읽어서 표시)
 *   await ApiError.fromResponse(container, res, { url });
 *
 * 표시 내용:
 *   - 한 줄 요약: "HTTP 400 · [4000003] 메시지"
 *   - [에러 코드 찾아보기 →] /utils/error-codes.html?q=<코드>
 *   - [원본 응답 보기] 토글 (JSON이면 pretty-print, 아니면 앞 300자만)
 *   - "Failed to fetch" 류: CORS·도메인 오타·네트워크 안내 + /utils/CorsTest.html 링크
 *
 * 규칙: 모든 외부 문자열은 textContent로만 넣는다(XSS 방지). jQuery 불필요.
 */
(function (window, document) {
    'use strict';

    var STYLE_ID = '_aeStyles';
    var ERROR_CODES_PAGE = '/utils/error-codes.html';
    var CORS_TEST_PAGE = '/utils/CorsTest.html';
    var NON_JSON_PREVIEW = 300;

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.ae-box{margin:10px 0;padding:10px 12px;border:1px solid #f3c2bd;border-left:4px solid #d93025;border-radius:6px;background:#fdf3f2;color:#3c1210;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:13px;line-height:1.5;text-align:left;white-space:normal;word-break:break-word;}',
            '.ae-box.ae-network{border-color:#f5d48a;border-left-color:#e8a200;background:#fffaeb;color:#4a3500;}',
            '.ae-summary{font-weight:700;}',
            '.ae-detail{margin-top:2px;color:#5f2b27;}',
            '.ae-box.ae-network .ae-detail{color:#5c4300;}',
            '.ae-actions{margin-top:6px;display:flex;gap:6px;flex-wrap:wrap;align-items:center;}',
            '.ae-box .ae-link,.ae-box .ae-toggle{width:auto !important;display:inline-block !important;margin:0 !important;padding:3px 9px !important;font-size:12px !important;line-height:1.4 !important;border:1px solid #d9a5a0 !important;border-radius:5px !important;background:#fff !important;color:#a50e0e !important;cursor:pointer;text-decoration:none !important;font-weight:500 !important;box-shadow:none !important;}',
            '.ae-box.ae-network .ae-link,.ae-box.ae-network .ae-toggle{border-color:#e6c46e !important;color:#7a5600 !important;}',
            '.ae-box .ae-link:hover,.ae-box .ae-toggle:hover{background:#fff5f4 !important;}',
            '.ae-box pre.ae-raw{display:none;margin:8px 0 0 !important;padding:8px 10px !important;max-height:320px;overflow:auto;background:#fff !important;color:#1f2937 !important;border:1px solid #eed2cf !important;border-radius:4px !important;white-space:pre-wrap !important;word-break:break-all !important;font-family:Consolas,Monaco,monospace !important;font-size:12px !important;}',
            '.ae-box.ae-open pre.ae-raw{display:block;}',
            '.ae-url{margin-top:2px;color:#777;font-size:12px;word-break:break-all;}'
        ].join('\n');
        (document.head || document.documentElement).appendChild(s);
    }

    function firstText() {
        for (var i = 0; i < arguments.length; i += 1) {
            var v = arguments[i];
            if (v !== undefined && v !== null && typeof v !== 'object' && String(v).trim()) return String(v).trim();
        }
        return '';
    }

    function tryParseJson(text) {
        if (text === undefined || text === null) return null;
        if (typeof text === 'object') return text;
        var t = String(text).trim();
        if (!t || (t.charAt(0) !== '{' && t.charAt(0) !== '[')) return null;
        try { return JSON.parse(t); } catch (_) { return null; }
    }

    /**
     * eformsign 에러 본문에서 code / message 추출.
     * 키 탐색 순서: code, error_code, ErrorMessage, message, error.message
     * 허브 서버 프록시 응답(error.upstream)도 지원한다.
     */
    function extract(body) {
        if (!body || typeof body !== 'object') return { code: '', message: '' };
        var err = body.error && typeof body.error === 'object' ? body.error : null;
        var upstream = err && err.upstream && typeof err.upstream === 'object' ? err.upstream : null;
        var upstreamBody = upstream && upstream.body && typeof upstream.body === 'object' ? upstream.body : null;
        // 프록시가 eformsign 원본 에러를 error.error 로 감싸 주는 경우(downloadDocument 등)
        var wrapped = err && err.error && typeof err.error === 'object' ? err.error : null;

        var code = firstText(
            body.code, body.error_code,
            upstream && upstream.code, upstreamBody && upstreamBody.code,
            wrapped && wrapped.code,
            err && err.code
        );
        var message = firstText(
            body.ErrorMessage, body.message, body.error_message,
            upstream && upstream.message, upstreamBody && upstreamBody.ErrorMessage,
            wrapped && wrapped.ErrorMessage, wrapped && wrapped.message,
            err && err.message,
            typeof body.error === 'string' ? body.error : ''
        );
        return { code: code, message: message };
    }

    function isNetworkError(error) {
        if (!error) return false;
        var msg = String(error.message || error);
        return (error.name === 'TypeError' && /fetch|network|load failed/i.test(msg)) ||
            /Failed to fetch|NetworkError|Load failed|ERR_NAME_NOT_RESOLVED|ERR_CONNECTION/i.test(msg);
    }

    function lookupUrl(code, opts) {
        var base = (opts && opts.absolute) ? (window.location.origin + ERROR_CODES_PAGE) : ERROR_CODES_PAGE;
        return base + '?q=' + encodeURIComponent(String(code || ''));
    }

    /**
     * 에러 정보를 요약 객체로 변환 (렌더링 없이 쓰고 싶을 때)
     * @returns {{kind:'network'|'http', status:number|null, code:string, message:string, summary:string, raw:string, isJson:boolean}}
     */
    function parse(info) {
        info = info || {};
        if (info.error && isNetworkError(info.error) && !info.status) {
            return {
                kind: 'network', status: null, code: '', isJson: false,
                message: String(info.error.message || info.error),
                summary: '요청을 보내지 못했습니다 (' + String(info.error.message || info.error) + ')',
                raw: String(info.error.stack || info.error.message || info.error)
            };
        }
        var status = info.status ? Number(info.status) : null;
        var bodyText = info.bodyText !== undefined ? info.bodyText : (info.body !== undefined ? info.body : '');
        var json = tryParseJson(bodyText);
        var raw;
        var code = '';
        var message = '';
        if (json) {
            var ex = extract(json);
            code = ex.code;
            message = ex.message;
            try { raw = JSON.stringify(json, null, 2); } catch (_) { raw = String(bodyText); }
        } else {
            var text = typeof bodyText === 'string' ? bodyText : String(bodyText || '');
            raw = text.length > NON_JSON_PREVIEW ? text.slice(0, NON_JSON_PREVIEW) + '…(이하 생략)' : text;
            if (!status && info.error) message = String(info.error.message || info.error);
        }
        var parts = [];
        if (status) parts.push('HTTP ' + status);
        var cm = '';
        if (code && message) cm = '[' + code + '] ' + message;
        else if (message) cm = message;
        else if (code) cm = '[' + code + ']';
        else if (!json && status) cm = '응답 본문이 JSON이 아닙니다';
        if (cm) parts.push(cm);
        return {
            kind: 'http', status: status, code: code, message: message, isJson: !!json,
            summary: parts.join(' · ') || '알 수 없는 오류',
            raw: raw || ''
        };
    }

    function resolveEl(el) {
        if (!el) return null;
        if (typeof el === 'string') return document.querySelector(el);
        if (el.jquery) return el[0] || null;
        return el;
    }

    function makeLink(href, label) {
        var a = document.createElement('a');
        a.className = 'ae-link';
        a.href = href;
        a.target = '_blank';
        a.rel = 'noopener';
        a.textContent = label;
        return a;
    }

    /**
     * 에러 박스를 렌더링한다.
     * @param {Element|string|jQuery} container
     * @param {{status?:number, bodyText?:string, body?:any, url?:string, error?:Error, title?:string, append?:boolean}} info
     * @returns {object} parse() 결과
     */
    function renderApiError(container, info) {
        var el = resolveEl(container);
        info = info || {};
        var p = parse(info);
        if (!el) return p;
        injectStyles();

        var box = document.createElement('div');
        box.className = 'ae-box' + (p.kind === 'network' ? ' ae-network' : '');
        box.setAttribute('role', 'alert');

        var summary = document.createElement('div');
        summary.className = 'ae-summary';
        summary.textContent = (info.title ? info.title + ' — ' : '') + p.summary;
        box.appendChild(summary);

        if (p.kind === 'network') {
            var hint = document.createElement('div');
            hint.className = 'ae-detail';
            hint.textContent = 'CORS 차단, 도메인 오타, 네트워크 문제 중 하나입니다 — CORS 테스트 도구로 확인하세요.';
            box.appendChild(hint);
        } else if (p.status === 401) {
            var h401 = document.createElement('div');
            h401.className = 'ae-detail';
            h401.textContent = 'Access Token이 만료되었거나 유효하지 않을 수 있습니다. 토큰을 다시 발급해 보세요.';
            box.appendChild(h401);
        }

        if (info.url) {
            var u = document.createElement('div');
            u.className = 'ae-url';
            u.textContent = '요청 URL: ' + info.url;
            box.appendChild(u);
        }

        var actions = document.createElement('div');
        actions.className = 'ae-actions';
        if (p.kind === 'network') {
            actions.appendChild(makeLink(CORS_TEST_PAGE, 'CORS 테스트 도구 →'));
        }
        if (p.code) {
            actions.appendChild(makeLink(lookupUrl(p.code), '에러 코드 찾아보기 →'));
        }
        var pre = null;
        if (p.raw) {
            var toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'ae-toggle';
            toggle.textContent = '원본 응답 보기';
            toggle.addEventListener('click', function () {
                var open = box.classList.toggle('ae-open');
                toggle.textContent = open ? '원본 응답 숨기기' : '원본 응답 보기';
            });
            actions.appendChild(toggle);
            pre = document.createElement('pre');
            pre.className = 'ae-raw';
            pre.textContent = p.raw;
        }
        if (actions.childNodes.length) box.appendChild(actions);
        if (pre) box.appendChild(pre);

        if (!info.append) el.textContent = '';
        el.appendChild(box);
        return p;
    }

    /** Response 객체의 본문을 읽어 에러 박스를 그린다 */
    async function fromResponse(container, res, opts) {
        opts = opts || {};
        var text = '';
        try { text = await res.text(); } catch (_) { text = ''; }
        var info = { status: res.status, bodyText: text, url: opts.url, title: opts.title, append: opts.append };
        renderApiError(container, info);
        return { status: res.status, bodyText: text };
    }

    window.renderApiError = renderApiError;
    window.ApiError = {
        render: renderApiError,
        parse: parse,
        extract: extract,
        fromResponse: fromResponse,
        isNetworkError: isNetworkError,
        lookupUrl: lookupUrl
    };
})(window, document);
