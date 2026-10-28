/**
 * assets/js/token-badge.js
 * Access Token 상태 배지 공유 모듈 (IIFE → window.TokenBadge)
 *
 * 사용법:
 *   <script src="/assets/js/token-issuer.js"></script>
 *   <script src="/assets/js/token-badge.js"></script>
 *
 *   const r = await window.issueAccessToken({...});
 *   if (r.ok) TokenBadge.attach('#tokenBadge', r, { onReissue: () => getAccessToken() });
 *
 *   // API 응답이 401이면
 *   TokenBadge.markExpired('#tokenBadge');      // "만료됨 · [토큰 재발급]"
 *
 *   // 테스트: 만료 시각 주입 (시스템 시계를 바꾸지 않고 확인)
 *   TokenBadge.setExpiresAt('#tokenBadge', Date.now() - 1000);
 *
 * 표시: "토큰 유효 · 47분 남음 · via proxy" / "곧 만료 · 3분 남음" / "만료됨 · [토큰 재발급]"
 * 1분 간격 클라이언트 타이머로 갱신한다(서버 호출 없음). 만료 시각을 응답에서 못 받으면 "(추정)" 표기.
 * 외부 문자열은 textContent로만 넣는다.
 */
(function (window, document) {
    'use strict';

    var STYLE_ID = '_tbStyles';
    var TICK_MS = 60 * 1000;
    var SOON_MS = 5 * 60 * 1000;

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;
        var s = document.createElement('style');
        s.id = STYLE_ID;
        s.textContent = [
            '.tb-badge{display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;margin:6px 0;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Arial,sans-serif;border:1px solid transparent;max-width:100%;}',
            '.tb-badge .tb-dot{width:8px;height:8px;border-radius:50%;background:currentColor;flex-shrink:0;}',
            '.tb-badge.tb-valid{background:#e6f4ea;color:#137333;border-color:#b7dfc3;}',
            '.tb-badge.tb-soon{background:#fff7e0;color:#8a5a00;border-color:#f3d48a;}',
            '.tb-badge.tb-expired{background:#fce8e6;color:#b3261e;border-color:#f3c2bd;}',
            '.tb-badge .tb-via{font-weight:500;opacity:.85;}',
            '.tb-badge .tb-reissue{width:auto !important;display:inline-block !important;margin:0 !important;padding:1px 8px !important;font-size:11px !important;line-height:1.5 !important;border:1px solid currentColor !important;border-radius:999px !important;background:#fff !important;color:inherit !important;cursor:pointer;font-weight:600 !important;box-shadow:none !important;}',
            '.tb-badge .tb-reissue:disabled{opacity:.6;cursor:progress;}'
        ].join('\n');
        (document.head || document.documentElement).appendChild(s);
    }

    function resolveEl(el) {
        if (!el) return null;
        if (typeof el === 'string') return document.querySelector(el);
        if (el.jquery) return el[0] || null;
        return el;
    }

    function pad(n) { return n < 10 ? '0' + n : String(n); }
    function hhmm(ts) { var d = new Date(ts); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

    function Controller(el, opts) {
        this.el = el;
        this.opts = opts || {};
        this.state = null; // { expiresAt, estimated, via, invalid }
        this.timer = null;
    }

    Controller.prototype.update = function (result) {
        result = result || {};
        var expiresAt = Number(result.expiresAt);
        if (!Number.isFinite(expiresAt)) expiresAt = Date.now() + 3600 * 1000;
        this.state = {
            expiresAt: expiresAt,
            estimated: !!result.expiresEstimated || !Number.isFinite(Number(result.expiresAt)),
            via: result.via || '',
            invalid: false
        };
        this.render();
        this.startTimer();
        return this;
    };

    Controller.prototype.setExpiresAt = function (ts) {
        if (!this.state) this.state = { estimated: false, via: '', invalid: false };
        this.state.expiresAt = Number(ts);
        this.state.invalid = false;
        this.render();
        this.startTimer();
        return this;
    };

    Controller.prototype.markExpired = function (reason) {
        if (!this.state) this.state = { expiresAt: Date.now(), estimated: false, via: '' };
        this.state.invalid = true;
        this.state.reason = reason || '';
        this.render();
        this.stopTimer();
        return this;
    };

    Controller.prototype.startTimer = function () {
        var self = this;
        this.stopTimer();
        this.timer = setInterval(function () {
            // 요소가 DOM에서 사라지면 타이머 정리
            if (!document.body.contains(self.el)) { self.stopTimer(); return; }
            self.render();
        }, TICK_MS);
    };

    Controller.prototype.stopTimer = function () {
        if (this.timer) { clearInterval(this.timer); this.timer = null; }
    };

    Controller.prototype.clear = function () {
        this.stopTimer();
        this.state = null;
        this.el.textContent = '';
        return this;
    };

    Controller.prototype.isExpired = function () {
        return !this.state || this.state.invalid || Date.now() >= this.state.expiresAt;
    };

    Controller.prototype.render = function () {
        var st = this.state;
        var el = this.el;
        if (!st) { el.textContent = ''; return; }
        injectStyles();
        var remaining = st.expiresAt - Date.now();
        var expired = st.invalid || remaining <= 0;
        var cls = expired ? 'tb-expired' : (remaining <= SOON_MS ? 'tb-soon' : 'tb-valid');

        var badge = document.createElement('span');
        badge.className = 'tb-badge ' + cls;
        badge.setAttribute('role', 'status');

        var dot = document.createElement('span');
        dot.className = 'tb-dot';
        badge.appendChild(dot);

        var text = document.createElement('span');
        if (expired) {
            text.textContent = st.invalid
                ? '토큰이 만료되었거나 유효하지 않습니다' + (st.reason ? ' (' + st.reason + ')' : '')
                : '만료됨';
        } else {
            var mins = Math.floor(remaining / 60000);
            var left = mins >= 1 ? mins + '분 남음' : '1분 미만 남음';
            text.textContent = (cls === 'tb-soon' ? '곧 만료 · ' : '토큰 유효 · ') + left + (st.estimated ? ' (추정)' : '');
        }
        badge.appendChild(text);
        badge.title = '만료 예정 ' + hhmm(st.expiresAt) + (st.estimated ? ' (응답에 expires_in이 없어 발급 시각 + 1시간으로 추정)' : '');

        if (st.via && !expired) {
            var via = document.createElement('span');
            via.className = 'tb-via';
            via.textContent = st.via === 'proxy' ? '· via proxy' : '· direct';
            badge.appendChild(via);
        }

        if (expired && typeof this.opts.onReissue === 'function') {
            var self = this;
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tb-reissue';
            btn.textContent = '토큰 재발급';
            btn.addEventListener('click', function () {
                btn.disabled = true;
                btn.textContent = '재발급 중…';
                Promise.resolve()
                    .then(function () { return self.opts.onReissue(); })
                    .catch(function (e) { console.warn('[token-badge] 재발급 실패', e); })
                    .then(function () { if (document.body.contains(btn)) { btn.disabled = false; btn.textContent = '토큰 재발급'; } });
            });
            badge.appendChild(btn);
        }

        el.textContent = '';
        el.appendChild(badge);

        if (expired && !this._expiredNotified && typeof this.opts.onExpire === 'function') {
            this._expiredNotified = true;
            try { this.opts.onExpire(); } catch (_) { /* 무시 */ }
        }
        if (!expired) this._expiredNotified = false;
    };

    function get(el) {
        el = resolveEl(el);
        return el ? el._tokenBadge || null : null;
    }

    /**
     * 배지를 붙이거나(처음) 갱신한다.
     * @param {Element|string|jQuery} el
     * @param {object} result issueAccessToken 성공 결과 ({ expiresAt, expiresEstimated, via })
     * @param {{onReissue?:Function, onExpire?:Function}} opts
     */
    function attach(el, result, opts) {
        el = resolveEl(el);
        if (!el) return null;
        var ctrl = el._tokenBadge;
        if (!ctrl) {
            ctrl = new Controller(el, opts);
            el._tokenBadge = ctrl;
        } else if (opts) {
            ctrl.opts = Object.assign({}, ctrl.opts, opts);
        }
        return ctrl.update(result);
    }

    window.TokenBadge = {
        attach: attach,
        get: get,
        markExpired: function (el, reason) { var c = get(el); return c ? c.markExpired(reason) : null; },
        setExpiresAt: function (el, ts) { var c = get(el); return c ? c.setExpiresAt(ts) : null; },
        clear: function (el) { var c = get(el); return c ? c.clear() : null; },
        isExpired: function (el) { var c = get(el); return c ? c.isExpired() : true; }
    };
})(window, document);
