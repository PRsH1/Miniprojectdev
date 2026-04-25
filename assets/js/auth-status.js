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

    // 알림 상태
    var notifUnreadCount = 0;
    var notifPollTimer = null;

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
        /* ─── 알림 벨 ─── */
        '#authStatusBar .asb-notif-wrap {',
        '  position: relative; display: inline-flex; align-items: center;',
        '}',
        '#authStatusBar .asb-bell {',
        '  width: auto !important; display: inline-flex !important; align-items: center !important;',
        '  background: none; border: none; color: #fff; font-size: 16px;',
        '  cursor: pointer; padding: 4px 6px; border-radius: 6px;',
        '  transition: background .12s; position: relative; flex-shrink: 0;',
        '}',
        '#authStatusBar .asb-bell:hover { background: rgba(255,255,255,.18); }',
        '#authStatusBar .asb-badge {',
        '  position: absolute; top: -2px; right: -2px;',
        '  background: #ef4444; color: #fff;',
        '  font-size: 10px; font-weight: 700; line-height: 1;',
        '  min-width: 16px; height: 16px; border-radius: 8px;',
        '  display: flex; align-items: center; justify-content: center;',
        '  padding: 0 3px; pointer-events: none;',
        '}',
        /* 드롭다운 패널 */
        '#asbNotifPanel {',
        '  position: fixed; top: 44px; right: 16px;',
        '  width: 320px; max-height: 420px;',
        '  background: #1e293b; border: 1px solid rgba(255,255,255,.12);',
        '  border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.45);',
        '  z-index: 999999; overflow: hidden;',
        '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
        '  display: none;',
        '}',
        '#asbNotifPanel .anp-header {',
        '  padding: 12px 16px 10px;',
        '  border-bottom: 1px solid rgba(255,255,255,.08);',
        '  font-size: 13px; font-weight: 700; color: #fff;',
        '  display: flex; align-items: center; justify-content: space-between;',
        '}',
        '#asbNotifPanel .anp-mark-all {',
        '  font-size: 11px; font-weight: 500; color: rgba(255,255,255,.5);',
        '  background: none; border: none; cursor: pointer; padding: 0;',
        '}',
        '#asbNotifPanel .anp-mark-all:hover { color: rgba(255,255,255,.85); }',
        '#asbNotifPanel .anp-list {',
        '  overflow-y: auto; max-height: 360px;',
        '}',
        '#asbNotifPanel .anp-item {',
        '  padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,.06);',
        '  cursor: pointer; transition: background .1s;',
        '  display: flex; gap: 10px; align-items: flex-start;',
        '}',
        '#asbNotifPanel .anp-item:hover { background: rgba(255,255,255,.07); }',
        '#asbNotifPanel .anp-item.unread { background: rgba(59,130,246,.1); }',
        '#asbNotifPanel .anp-item.unread:hover { background: rgba(59,130,246,.18); }',
        '#asbNotifPanel .anp-dot {',
        '  width: 7px; height: 7px; border-radius: 50%;',
        '  background: #3b82f6; flex-shrink: 0; margin-top: 5px;',
        '}',
        '#asbNotifPanel .anp-dot.read { background: transparent; }',
        '#asbNotifPanel .anp-title {',
        '  font-size: 12px; font-weight: 600; color: #f1f5f9; margin-bottom: 2px;',
        '}',
        '#asbNotifPanel .anp-body {',
        '  font-size: 11px; color: rgba(255,255,255,.55); margin-bottom: 2px;',
        '}',
        '#asbNotifPanel .anp-time {',
        '  font-size: 10px; color: rgba(255,255,255,.35);',
        '}',
        '#asbNotifPanel .anp-empty {',
        '  padding: 24px 16px; text-align: center;',
        '  font-size: 12px; color: rgba(255,255,255,.35);',
        '}',
        /* X 버튼 */
        '#asbNotifPanel .anp-del {',
        '  background: none; border: none; cursor: pointer;',
        '  color: rgba(255,255,255,.25); font-size: 14px; line-height: 1;',
        '  padding: 2px 4px; border-radius: 4px; flex-shrink: 0;',
        '  transition: color .1s, background .1s;',
        '  align-self: flex-start; margin-top: -1px;',
        '}',
        '#asbNotifPanel .anp-item:hover .anp-del { color: rgba(255,255,255,.6); }',
        '#asbNotifPanel .anp-del:hover { color: #ef4444 !important; background: rgba(239,68,68,.12); }',
        /* 전체 삭제 버튼 */
        '#asbNotifPanel .anp-del-all {',
        '  font-size: 11px; color: rgba(255,255,255,.35);',
        '  background: none; border: none; cursor: pointer; padding: 0;',
        '}',
        '#asbNotifPanel .anp-del-all:hover { color: #ef4444; }',
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

        // 벨 아이콘 — 상단 바 모드 로그인 사용자 공통
        var bellHtml = '';
        if (!CORNER) {
            bellHtml =
                '<div class="asb-notif-wrap">' +
                '<button class="asb-bell" id="asbBellBtn" title="알림">&#128276;' +
                '<span id="asbBellBadge" class="asb-badge" style="display:none;">0</span>' +
                '</button>' +
                '</div>';
        }

        // 코너 모드: brand 없이 유저 정보만
        var brandHtml = CORNER ? '' : '<a href="/" class="asb-brand">eformsign Tools Hub</a>';
        var spacerHtml = CORNER ? '' : '<span class="asb-spacer"></span>';

        el.innerHTML =
            brandHtml +
            spacerHtml +
            '<span class="asb-username">' + escHtml(user.username) + '</span>' +
            '<span class="asb-role ' + escHtml(user.role) + '">' + escHtml(user.role) + '</span>' +
            bellHtml +
            adminBtn +
            '<button class="asb-btn danger" id="asbBtnLogout">로그아웃</button>';

        document.getElementById('asbBtnLogout').addEventListener('click', function () {
            fetch('/api/logout', { method: 'POST' })
                .finally(function () { window.location.reload(); });
        });

        // 알림 초기화 (상단 바 모드에서만)
        if (!CORNER) {
            var bellBtn = document.getElementById('asbBellBtn');
            if (bellBtn) {
                bellBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var panel = document.getElementById('asbNotifPanel');
                    if (panel && panel.style.display === 'block') {
                        closeNotifPanel();
                    } else {
                        openNotifPanel();
                    }
                });
            }
            // 초기 미읽음 count 조회
            fetchUnreadCount();
            // 60초 폴링 (패널 열려있지 않을 때만)
            if (notifPollTimer) clearInterval(notifPollTimer);
            notifPollTimer = setInterval(function () {
                var panel = document.getElementById('asbNotifPanel');
                if (!panel || panel.style.display === 'none') {
                    fetchUnreadCount();
                }
            }, 60000);
        }
    }

    // ─── 알림 헬퍼 함수 ──────────────────────────────────────

    // 상대 시간 표시
    function formatRelativeTime(dateStr) {
        var diff = Date.now() - new Date(dateStr).getTime();
        var minutes = Math.floor(diff / 60000);
        if (minutes < 1) return '방금 전';
        if (minutes < 60) return minutes + '분 전';
        var hours = Math.floor(minutes / 60);
        if (hours < 24) return hours + '시간 전';
        var days = Math.floor(hours / 24);
        if (days <= 6) return days + '일 전';
        var d = new Date(dateStr);
        return (d.getMonth() + 1) + '월 ' + d.getDate() + '일';
    }

    function getNotificationDest(type) {
        if (type === 'signup_request') return '/app/admin?tab=signup-requests';
        if (type === 'bug_report') return '/app/admin?tab=bug-reports';
        if (type === 'bug_report_status') return '/community/bug-report.html#my-reports';
        if (type === 'bug_report_reply') return '/community/bug-report.html#my-reports';
        return '/app/admin';
    }

    // 전체 읽음 처리 후 패널 새로고침
    function markAllRead() {
        fetch('/api/notifications/read', { method: 'PATCH' })
            .then(function () { openNotifPanel(); })
            .catch(function () {});
    }

    // 단건 삭제
    function deleteNotifOne(id, itemEl) {
        fetch('/api/notifications/' + id, { method: 'DELETE' })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function () {
                if (itemEl) itemEl.remove();
                // 삭제된 항목이 unread였으면 배지 감소
                if (itemEl && itemEl.classList.contains('unread')) {
                    notifUnreadCount = Math.max(0, notifUnreadCount - 1);
                    var badge = document.getElementById('asbBellBadge');
                    if (badge) {
                        badge.textContent = notifUnreadCount > 99 ? '99+' : notifUnreadCount;
                        badge.style.display = notifUnreadCount > 0 ? 'flex' : 'none';
                    }
                }
                // 목록이 비었으면 빈 상태 표시
                var list = document.querySelector('#asbNotifPanel .anp-list');
                if (list && list.querySelectorAll('.anp-item').length === 0) {
                    list.outerHTML = '<div class="anp-empty">알림이 없습니다.</div>';
                    // 헤더 버튼들도 갱신
                    var delAllEl = document.getElementById('asbDelAllBtn');
                    if (delAllEl) delAllEl.remove();
                    var markAllEl = document.getElementById('asbMarkAllBtn');
                    if (markAllEl) markAllEl.remove();
                }
            })
            .catch(function () {});
    }

    // 전체 삭제
    function deleteNotifAll() {
        fetch('/api/notifications', { method: 'DELETE' })
            .then(function () { openNotifPanel(); })
            .catch(function () {});
    }

    // 드롭다운 패널 HTML 빌드 및 갱신
    function renderNotifPanel(notifications, unreadCount) {
        var panel = document.getElementById('asbNotifPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'asbNotifPanel';
            document.body.appendChild(panel);
        }

        var markAllBtn = unreadCount > 0
            ? '<button class="anp-mark-all" id="asbMarkAllBtn">모두 읽음</button>'
            : '';

        var delAllBtn = notifications && notifications.length > 0
            ? '<button class="anp-del-all" id="asbDelAllBtn">전체 삭제</button>'
            : '';

        var headerHtml =
            '<div class="anp-header">' +
            '<span>알림</span>' +
            '<span style="display:flex;gap:8px;align-items:center;">' +
            markAllBtn + delAllBtn +
            '</span>' +
            '</div>';

        var listHtml = '';
        if (!notifications || notifications.length === 0) {
            listHtml = '<div class="anp-empty">알림이 없습니다.</div>';
        } else {
            listHtml = '<div class="anp-list">';
            for (var i = 0; i < notifications.length; i++) {
                var n = notifications[i];
                var isUnread = !n.is_read;
                var itemClass = 'anp-item' + (isUnread ? ' unread' : '');
                var dotClass = 'anp-dot' + (isUnread ? '' : ' read');
                var dest = getNotificationDest(n.type);
                listHtml +=
                    '<div class="' + itemClass + '" data-notif-id="' + n.id + '" data-dest="' + escHtml(dest) + '">' +
                    '<div class="' + dotClass + '"></div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div class="anp-title">' + escHtml(n.title) + '</div>' +
                    (n.body ? '<div class="anp-body">' + escHtml(n.body) + '</div>' : '') +
                    '<div class="anp-time">' + formatRelativeTime(n.created_at) + '</div>' +
                    '</div>' +
                    '<button class="anp-del" data-del-id="' + n.id + '" title="알림 삭제">&#10005;</button>' +
                    '</div>';
            }
            listHtml += '</div>';
        }

        panel.innerHTML = headerHtml + listHtml;

        // "모두 읽음" 버튼 이벤트
        var markAllBtnEl = document.getElementById('asbMarkAllBtn');
        if (markAllBtnEl) {
            markAllBtnEl.addEventListener('click', function (e) {
                e.stopPropagation();
                markAllRead();
            });
        }

        // 알림 항목 클릭 이벤트
        var items = panel.querySelectorAll('.anp-item');
        for (var j = 0; j < items.length; j++) {
            (function (item) {
                item.addEventListener('click', function () {
                    var notifId = item.getAttribute('data-notif-id');
                    var dest = item.getAttribute('data-dest');
                    fetch('/api/notifications/' + notifId + '/read', { method: 'PATCH' })
                        .finally(function () {
                            window.location.href = dest;
                        });
                });
            })(items[j]);
        }

        // "전체 삭제" 버튼 이벤트
        var delAllBtnEl = document.getElementById('asbDelAllBtn');
        if (delAllBtnEl) {
            delAllBtnEl.addEventListener('click', function (e) {
                e.stopPropagation();
                deleteNotifAll();
            });
        }

        // X 버튼(개별 삭제) 이벤트
        var delBtns = panel.querySelectorAll('.anp-del');
        for (var k = 0; k < delBtns.length; k++) {
            (function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var id = btn.getAttribute('data-del-id');
                    deleteNotifOne(id, btn.closest('.anp-item'));
                });
            })(delBtns[k]);
        }
    }

    // 미읽음 count만 갱신 (폴링용)
    function fetchUnreadCount() {
        fetch('/api/notifications')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data) return;
                notifUnreadCount = data.unread_count || 0;
                var badge = document.getElementById('asbBellBadge');
                if (badge) {
                    badge.textContent = notifUnreadCount > 99 ? '99+' : notifUnreadCount;
                    badge.style.display = notifUnreadCount > 0 ? 'flex' : 'none';
                }
            })
            .catch(function () {});
    }

    // 패널 열기
    function openNotifPanel() {
        fetch('/api/notifications')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data) return;
                notifUnreadCount = data.unread_count || 0;
                renderNotifPanel(data.notifications || [], notifUnreadCount);
                var panel = document.getElementById('asbNotifPanel');
                if (panel) panel.style.display = 'block';
                // 배지 동기화
                var badge = document.getElementById('asbBellBadge');
                if (badge) {
                    badge.textContent = notifUnreadCount > 99 ? '99+' : notifUnreadCount;
                    badge.style.display = notifUnreadCount > 0 ? 'flex' : 'none';
                }
            })
            .catch(function () {});
    }

    // 패널 닫기
    function closeNotifPanel() {
        var panel = document.getElementById('asbNotifPanel');
        if (panel) panel.style.display = 'none';
    }

    // ─── /api/me 호출 ────────────────────────────────────────
    window.AUTH_STATUS_ME_PROMISE = window.AUTH_STATUS_ME_PROMISE || fetch('/api/me')
        .then(function (r) { return r.json(); })
        .catch(function () { return null; });

    window.AUTH_STATUS_ME_PROMISE.then(function (data) {
        var isAuth = data && data.authenticated !== false && data.username;
        render(isAuth ? data : null);
    });

    // 드롭다운 바깥 클릭 시 패널 닫기
    document.addEventListener('click', function (e) {
        var panel = document.getElementById('asbNotifPanel');
        var bell = document.getElementById('asbBellBtn');
        if (!panel || panel.style.display !== 'block') return;
        if (!panel.contains(e.target) && (!bell || !bell.contains(e.target))) {
            closeNotifPanel();
        }
    });
})();
