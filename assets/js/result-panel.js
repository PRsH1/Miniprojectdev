/**
 * assets/js/result-panel.js
 * 결과 패널 공유 모듈 (IIFE) — JSON 결과 표시·복사·다운로드·접기, 버튼 로딩 상태
 *
 * 사용법:
 *   <script src="/assets/js/result-panel.js"></script>
 *
 *   ResultPanel.render(el, data, {
 *       title:    '응답 결과',          // 헤더 제목 (선택)
 *       filename: 'DocumentInfo',       // 다운로드 파일명 접두어 → DocumentInfo_YYYYMMDD_HHmmss.json
 *       meta:     ['실행 URL: ...'],    // 헤더 아래 보조 줄 (선택, 텍스트로만 렌더링)
 *       status:   'ok' | 'error' | null,// 헤더 배지 (선택)
 *       collapsed: false,               // 처음부터 접어 둘지
 *   });
 *
 *   withLoading(btn, async () => { ... });     // 실행 중 버튼 비활성 + "처리 중…", 끝나면 복원
 *   ResultPanel.renderDocumentLinks(el, documentId); // 생성된 문서 ID + [복사] [문서 정보 조회 →] [다운로드 →]
 *
 * 규칙: 외부 문자열(응답 본문, URL 등)은 모두 textContent로만 넣는다(XSS 방지).
 * 의존성 없음(jQuery 불필요) — DocumentSendImprove처럼 jQuery가 없는 페이지에서도 동작한다.
 */
(function (window, document) {
    'use strict';

    var STYLE_ID = '_rpStyles';
    var DOC_INFO_PAGE = '/API(JS,HTML)/DocumentInfo.html';
    var DOC_DOWNLOAD_PAGE = '/API(JS,HTML)/DocumentDownload.html';

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        // 호스트 페이지의 전역 button/pre 스타일(width:100% 등)을 덮어쓰도록 !important 사용
        s.textContent = [
            '.rp-panel{margin-top:12px;border:1px solid #d6dbe3;border-radius:8px;background:#fff;color:#1f2937;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;font-size:13px;overflow:hidden;text-align:left;}',
            '.rp-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:8px 10px;background:#f5f7fa;border-bottom:1px solid #e5e7eb;}',
            '.rp-title{font-weight:700;flex:1;min-width:120px;color:#1f2937;}',
            '.rp-badge{display:inline-block;padding:1px 8px;border-radius:10px;font-size:11px;font-weight:700;}',
            '.rp-badge.ok{background:#e6f4ea;color:#137333;}',
            '.rp-badge.error{background:#fce8e6;color:#c5221f;}',
            '.rp-panel .rp-btn,.rp-doclinks .rp-btn{width:auto !important;display:inline-block !important;margin:0 !important;padding:4px 10px !important;font-size:12px !important;line-height:1.4 !important;border:1px solid #c7ccd4 !important;border-radius:5px !important;background:#fff !important;color:#333 !important;cursor:pointer;text-decoration:none !important;font-weight:500 !important;box-shadow:none !important;transform:none !important;}',
            '.rp-panel .rp-btn:hover,.rp-doclinks .rp-btn:hover{background:#eef3fd !important;border-color:#1a73e8 !important;color:#1a73e8 !important;}',
            '.rp-meta{padding:6px 10px 0;color:#555;font-size:12px;word-break:break-all;}',
            '.rp-meta div{margin-bottom:2px;}',
            '.rp-panel pre.rp-pre{margin:0 !important;padding:10px 12px !important;max-height:480px;overflow:auto;white-space:pre-wrap !important;word-break:break-all !important;background:#fafbfc !important;color:#1f2937 !important;border:none !important;border-radius:0 !important;font-family:Consolas,Monaco,"Courier New",monospace !important;font-size:12.5px !important;line-height:1.5;}',
            '.rp-panel.rp-collapsed pre.rp-pre{display:none;}',
            '.rp-doclinks{margin-top:12px;padding:10px 12px;border:1px solid #b7dfc3;border-radius:8px;background:#f0faf3;color:#1e4620;font-size:13px;display:flex;align-items:center;gap:6px;flex-wrap:wrap;}',
            '.rp-doclinks code{font-family:Consolas,Monaco,monospace;background:#fff;border:1px solid #cfe8d6;border-radius:4px;padding:2px 6px;word-break:break-all;color:#1e4620;}',
            '.rp-loading-btn{opacity:.75;cursor:progress !important;}'
        ].join('\n');
        (document.head || document.documentElement).appendChild(s);
    }

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    // YYYYMMDD_HHmmss (로컬 시각)
    function timestamp(d) {
        d = d || new Date();
        return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
            pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    }

    function toText(data) {
        if (typeof data === 'string') return data;
        if (data === undefined) return '';
        try { return JSON.stringify(data, null, 2); } catch (_) { return String(data); }
    }

    function resolveEl(el) {
        if (!el) return null;
        if (typeof el === 'string') return document.querySelector(el);
        if (el.jquery) return el[0] || null; // jQuery 객체 허용
        return el;
    }

    // 클립보드 복사 — Clipboard API 실패 시 textarea fallback
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return fallbackCopy(text); });
        }
        return Promise.resolve(fallbackCopy(text));
    }

    function fallbackCopy(text) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;top:-1000px;left:-1000px;opacity:0;';
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
        ta.remove();
        return ok;
    }

    function flashLabel(btn, label) {
        var original = btn.getAttribute('data-rp-label') || btn.textContent;
        btn.setAttribute('data-rp-label', original);
        btn.textContent = label;
        clearTimeout(btn._rpTimer);
        btn._rpTimer = setTimeout(function () { btn.textContent = original; }, 1500);
    }

    function makeBtn(label, onClick, title) {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'rp-btn';
        b.textContent = label;
        if (title) b.title = title;
        b.addEventListener('click', onClick);
        return b;
    }

    function downloadText(text, filename, mime) {
        var blob = new Blob([text], { type: mime || 'application/json;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 0);
    }

    /**
     * 결과 패널 렌더링. el의 기존 내용을 지우고 패널을 넣는다.
     * @returns {{panel: HTMLElement, pre: HTMLElement, text: string}}
     */
    function render(el, data, opts) {
        el = resolveEl(el);
        if (!el) return null;
        opts = opts || {};
        injectStyles();

        var text = toText(data);
        var prefix = String(opts.filename || 'result').replace(/[\\/:*?"<>|\s]+/g, '_');

        var panel = document.createElement('div');
        panel.className = 'rp-panel' + (opts.collapsed ? ' rp-collapsed' : '');

        var head = document.createElement('div');
        head.className = 'rp-head';

        var title = document.createElement('span');
        title.className = 'rp-title';
        title.textContent = opts.title || '응답 결과';
        head.appendChild(title);

        if (opts.status === 'ok' || opts.status === 'error') {
            var badge = document.createElement('span');
            badge.className = 'rp-badge ' + opts.status;
            badge.textContent = opts.statusText || (opts.status === 'ok' ? '성공' : '실패');
            head.appendChild(badge);
        }

        var copyBtn = makeBtn('복사', function () {
            copyText(text).then(function (ok) { flashLabel(copyBtn, ok ? '복사됨' : '복사 실패'); });
        }, '결과 JSON을 클립보드에 복사');
        var dlBtn = makeBtn('JSON 다운로드', function () {
            downloadText(text, prefix + '_' + timestamp() + '.json');
        }, prefix + '_YYYYMMDD_HHmmss.json');
        var toggleBtn = makeBtn(opts.collapsed ? '펼치기' : '접기', function () {
            var collapsed = panel.classList.toggle('rp-collapsed');
            toggleBtn.textContent = collapsed ? '펼치기' : '접기';
        });
        head.appendChild(copyBtn);
        head.appendChild(dlBtn);
        head.appendChild(toggleBtn);
        panel.appendChild(head);

        if (opts.meta && opts.meta.length) {
            var meta = document.createElement('div');
            meta.className = 'rp-meta';
            opts.meta.forEach(function (line) {
                if (line === undefined || line === null || line === '') return;
                var d = document.createElement('div');
                d.textContent = String(line);
                meta.appendChild(d);
            });
            panel.appendChild(meta);
        }

        var pre = document.createElement('pre');
        pre.className = 'rp-pre';
        pre.textContent = text;
        panel.appendChild(pre);

        el.textContent = '';
        el.appendChild(panel);
        return { panel: panel, pre: pre, text: text };
    }

    /**
     * 진행 중 메시지(로딩 문구)만 간단히 표시
     */
    function renderStatus(el, message, meta) {
        el = resolveEl(el);
        if (!el) return;
        injectStyles();
        var panel = document.createElement('div');
        panel.className = 'rp-panel';
        var head = document.createElement('div');
        head.className = 'rp-head';
        var title = document.createElement('span');
        title.className = 'rp-title';
        title.textContent = message;
        head.appendChild(title);
        panel.appendChild(head);
        if (meta && meta.length) {
            var m = document.createElement('div');
            m.className = 'rp-meta';
            m.style.paddingBottom = '6px';
            meta.forEach(function (line) {
                var d = document.createElement('div');
                d.textContent = String(line);
                m.appendChild(d);
            });
            panel.appendChild(m);
        }
        el.textContent = '';
        el.appendChild(panel);
    }

    /**
     * 버튼 로딩 상태 헬퍼.
     * 실행 중에는 disabled + "처리 중…"으로 바꾸고, 끝나면(성공·실패 모두) 원래 상태로 복원한다.
     * 이미 실행 중이면 fn을 호출하지 않는다 → 빠른 연속 클릭에도 요청 1건.
     */
    async function withLoading(btn, fn, opts) {
        btn = resolveEl(btn);
        opts = opts || {};
        if (!btn) return fn();
        if (btn._rpBusy) return undefined;
        btn._rpBusy = true;
        injectStyles();
        var savedNodes = Array.prototype.slice.call(btn.childNodes);
        var wasDisabled = btn.disabled;
        btn.disabled = true;
        btn.classList.add('rp-loading-btn');
        btn.setAttribute('aria-busy', 'true');
        btn.textContent = opts.label || '처리 중…';
        try {
            return await fn();
        } finally {
            btn.textContent = '';
            savedNodes.forEach(function (n) { btn.appendChild(n); });
            btn.disabled = wasDisabled;
            btn.classList.remove('rp-loading-btn');
            btn.removeAttribute('aria-busy');
            btn._rpBusy = false;
        }
    }

    /**
     * 문서 작성 성공 시 "생성된 문서 ID: xxx [복사] [문서 정보 조회 →] [다운로드 →]" 박스.
     * 링크는 ?document_id=xxx 로 해당 페이지를 새 탭에 연다.
     */
    function renderDocumentLinks(el, documentId, opts) {
        el = resolveEl(el);
        if (!el || !documentId) return null;
        opts = opts || {};
        injectStyles();
        var id = String(documentId);

        var box = document.createElement('div');
        box.className = 'rp-doclinks';

        var label = document.createElement('strong');
        label.textContent = opts.label || '생성된 문서 ID:';
        box.appendChild(label);

        var code = document.createElement('code');
        code.textContent = id;
        box.appendChild(code);

        var copyBtn = makeBtn('복사', function () {
            copyText(id).then(function (ok) { flashLabel(copyBtn, ok ? '복사됨' : '복사 실패'); });
        }, '문서 ID 복사');
        box.appendChild(copyBtn);

        if (opts.links !== false) {
            [[DOC_INFO_PAGE, '문서 정보 조회 →'], [DOC_DOWNLOAD_PAGE, '다운로드 →']].forEach(function (pair) {
                var a = document.createElement('a');
                a.className = 'rp-btn';
                a.href = pair[0] + '?document_id=' + encodeURIComponent(id);
                a.target = '_blank';
                a.rel = 'noopener';
                a.textContent = pair[1];
                box.appendChild(a);
            });
        }

        if (opts.append) {
            el.appendChild(box);
        } else {
            el.textContent = '';
            el.appendChild(box);
        }
        return box;
    }

    /** URL 쿼리에서 값 읽기 (프리필용) */
    function getQueryParam(name) {
        try {
            return new URLSearchParams(window.location.search).get(name) || '';
        } catch (_) {
            return '';
        }
    }

    window.ResultPanel = {
        render: render,
        renderStatus: renderStatus,
        renderDocumentLinks: renderDocumentLinks,
        withLoading: withLoading,
        copyText: copyText,
        downloadText: downloadText,
        timestamp: timestamp,
        getQueryParam: getQueryParam
    };
    window.withLoading = withLoading;
})(window, document);
