/**
 * assets/js/auth-status.js
 * 전 페이지 공통 로그인 상태 표시
 *
 * 기본 모드: 상단 고정 바 자동 삽입
 *
 * 코너 모드 (기존 헤더가 있는 페이지 — OpenAPITester 등):
 *   <script>window.AUTH_STATUS_CORNER = true;</script> 를 이 파일 로드 전에 선언
 *
 * 인라인 모드 (사용 안 함 — 이전 방식):
 *   <script>window.AUTH_STATUS_INLINE = true;</script>
 */
(function () {
    var CORNER = window.AUTH_STATUS_CORNER === true;
    var INLINE = window.AUTH_STATUS_INLINE === true;

    // ─── CSS 주입 ────────────────────────────────────────────
    var barCss;

    if (CORNER) {
        // 우측 하단 플로팅 패널
        barCss = [
            '#authStatusBar {',
            '  position: fixed; bottom: 16px; right: 16px; z-index: 99999;',
            '  background: rgba(20, 30, 45, 0.93);',
            '  backdrop-filter: blur(8px);',
            '  border: 1px solid rgba(255,255,255,.12);',
            '  border-radius: 10px;',
            '  padding: 6px 12px;',
            '  display: flex; align-items: center; gap: 8px;',
            '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
            '  font-size: 12px; color: #fff;',
            '  box-shadow: 0 4px 16px rgba(0,0,0,.4);',
            '}',
        ].join('\n');
    } else {
        // 상단 고정 바
        barCss = [
            '#authStatusBar {',
            '  position: fixed; top: 0; left: 0; right: 0; z-index: 99999;',
            '  height: 40px;',
            '  background: #1a73e8;',
            '  display: flex; align-items: center;',
            '  padding: 0 16px; gap: 8px;',
            '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
            '  font-size: 13px; color: #fff;',
            '  box-shadow: 0 2px 6px rgba(0,0,0,.25);',
            '}',
        ].join('\n');
    }

    var commonCss = [
        '#authStatusBar .asb-brand {',
        '  font-weight: 700; letter-spacing: -.3px;',
        '  color: rgba(255,255,255,.85); margin-right: 4px;',
        '  text-decoration: none; cursor: pointer;',
        '}',
        '#authStatusBar .asb-spacer { flex: 1; }',
        '#authStatusBar .asb-username { font-weight: 600; color: #fff; }',
        '#authStatusBar .asb-role {',
        '  padding: 2px 7px; border-radius: 10px;',
        '  font-size: 11px; font-weight: 700;',
        '}',
        '#authStatusBar .asb-role.admin   { background: rgba(239,68,68,.35);  color: #fca5a5; }',
        '#authStatusBar .asb-role.manager { background: rgba(59,130,246,.35); color: #bfdbfe; }',
        '#authStatusBar .asb-role.user    { background: rgba(255,255,255,.18); color: rgba(255,255,255,.9); }',
        /* ★ width: auto !important — 페이지 button{width:100%} 스타일 덮어쓰기 방지 */
        '#authStatusBar .asb-btn {',
        '  width: auto !important; display: inline-flex !important; align-items: center !important;',
        '  padding: 5px 14px; border-radius: 8px; font-size: 12px; font-weight: 600;',
        '  cursor: pointer; border: 1px solid rgba(255,255,255,.35);',
        '  background: rgba(255,255,255,.15); color: #fff;',
        '  text-decoration: none; transition: background .12s;',
        '  white-space: nowrap; flex-shrink: 0;',
        '}',
        '#authStatusBar .asb-btn:hover { background: rgba(255,255,255,.28); }',
        '#authStatusBar .asb-btn.primary { background: rgba(255,255,255,.9); color: #1a73e8; border-color: transparent; }',
        '#authStatusBar .asb-btn.primary:hover { background: #fff; }',
        '#authStatusBar .asb-btn.danger { background: rgba(220,38,38,.55); border-color: rgba(220,38,38,.5); }',
        '#authStatusBar .asb-btn.danger:hover { background: rgba(220,38,38,.75); }',
    ].join('\n');

    // 상단 바 모드에서만 body 여백 주입 (INLINE·CORNER는 기존 레이아웃 유지)
    var paddingCss = (!INLINE && !CORNER)
        ? 'body { padding-top: 40px !important; }'
        : '';

    var styleEl = document.createElement('style');
    styleEl.textContent = barCss + '\n' + commonCss + '\n' + paddingCss;
    document.head.appendChild(styleEl);

    // ─── 바 DOM 삽입 ─────────────────────────────────────────
    if (!INLINE) {
        // CORNER: body 끝에 삽입 / 기본: body 첫 번째 자식으로 삽입
        var bar = document.createElement('div');
        bar.id = 'authStatusBar';
        if (CORNER) {
            document.body.appendChild(bar);
        } else {
            document.body.insertBefore(bar, document.body.firstChild);
        }
    }

    // ─── 렌더링 ──────────────────────────────────────────────
    function escHtml(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function render(user) {
        var el = document.getElementById('authStatusBar');
        if (!el) return;

        if (!user) {
            if (CORNER) {
                // 코너 모드 비로그인: 로그인/회원가입 버튼 표시
                var nextParam = '?next=' + encodeURIComponent(window.location.pathname);
                el.innerHTML =
                    '<a href="/auth/login.html' + nextParam + '" class="asb-btn primary">로그인</a>' +
                    '<a href="/auth/signup.html" class="asb-btn">회원가입</a>';
                return;
            }
            // 기본 상단 바 모드 (기존 동작 유지)
            el.innerHTML =
                '<a href="/" class="asb-brand">eformsign Tools Hub</a>' +
                '<span class="asb-spacer"></span>' +
                '<a href="/auth/login.html" class="asb-btn primary">로그인</a>' +
                '<a href="/auth/signup.html" class="asb-btn">회원가입</a>';
            return;
        }

        var adminBtn = user.role === 'admin'
            ? '<a href="/app/admin" class="asb-btn">관리자 콘솔</a>'
            : '';

        // 코너 모드: brand 없이 유저 정보만
        var brandHtml = CORNER ? '' : '<a href="/" class="asb-brand">eformsign Tools Hub</a>';
        var spacerHtml = CORNER ? '' : '<span class="asb-spacer"></span>';

        el.innerHTML =
            brandHtml +
            spacerHtml +
            '<span class="asb-username">' + escHtml(user.username) + '</span>' +
            '<span class="asb-role ' + escHtml(user.role) + '">' + escHtml(user.role) + '</span>' +
            adminBtn +
            '<button class="asb-btn danger" id="asbBtnLogout">로그아웃</button>';

        document.getElementById('asbBtnLogout').addEventListener('click', function () {
            fetch('/api/logout', { method: 'POST' })
                .finally(function () { window.location.reload(); });
        });
    }

    // ─── /api/me 호출 ────────────────────────────────────────
    fetch('/api/me')
        .then(function (r) { return r.json(); })
        .then(function (data) {
            var isAuth = data && data.authenticated !== false && data.username;
            render(isAuth ? data : null);
        })
        .catch(function () { render(null); });
})();
