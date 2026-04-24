/**
 * assets/js/notification-bell.js
 * index.html 전용 알림 벨 독립 모듈
 *
 * 사용법:
 *   <script src="/assets/js/notification-bell.js"></script>
 *   window.NotifBell.init(containerEl);  // admin 로그인 확인 후 호출
 */
(function () {
    // 이미 로드된 경우 스킵
    if (window.NotifBell) return;

    // ─── CSS 주입 (1회만) ──────────────────────────────────────
    function _injectStyles() {
        if (document.getElementById('_nbStyles')) return;
        var style = document.createElement('style');
        style.id = '_nbStyles';
        style.textContent = [
            '._nb-bell-btn {',
            '  background: none; border: none; color: #fff; font-size: 16px;',
            '  cursor: pointer; padding: 4px 6px; border-radius: 6px;',
            '  transition: background .12s; position: relative;',
            '  display: inline-flex; align-items: center;',
            '  width: auto !important; flex-shrink: 0;',
            '}',
            '._nb-bell-btn:hover { background: rgba(255,255,255,.18); }',
            '._nb-badge {',
            '  position: absolute; top: -2px; right: -2px;',
            '  background: #ef4444; color: #fff;',
            '  font-size: 10px; font-weight: 700; line-height: 1;',
            '  min-width: 16px; height: 16px; border-radius: 8px;',
            '  display: flex; align-items: center; justify-content: center;',
            '  padding: 0 3px; pointer-events: none;',
            '}',
            '#_nbPanel {',
            '  position: fixed; width: 320px; max-height: 420px;',
            '  background: #1e293b; border: 1px solid rgba(255,255,255,.12);',
            '  border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,.45);',
            '  z-index: 999999; overflow: hidden; display: none;',
            '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;',
            '}',
            '#_nbPanel ._nb-ph {',
            '  padding: 12px 16px 10px;',
            '  border-bottom: 1px solid rgba(255,255,255,.08);',
            '  font-size: 13px; font-weight: 700; color: #fff;',
            '  display: flex; align-items: center; justify-content: space-between;',
            '}',
            '#_nbPanel ._nb-mark-all {',
            '  font-size: 11px; color: rgba(255,255,255,.5);',
            '  background: none; border: none; cursor: pointer; padding: 0;',
            '}',
            '#_nbPanel ._nb-mark-all:hover { color: rgba(255,255,255,.85); }',
            '#_nbPanel ._nb-list { overflow-y: auto; max-height: 360px; }',
            '#_nbPanel ._nb-item {',
            '  padding: 10px 16px; border-bottom: 1px solid rgba(255,255,255,.06);',
            '  cursor: pointer; transition: background .1s;',
            '  display: flex; gap: 10px; align-items: flex-start;',
            '}',
            '#_nbPanel ._nb-item:hover { background: rgba(255,255,255,.07); }',
            '#_nbPanel ._nb-item.unread { background: rgba(59,130,246,.1); }',
            '#_nbPanel ._nb-item.unread:hover { background: rgba(59,130,246,.18); }',
            '#_nbPanel ._nb-dot {',
            '  width: 7px; height: 7px; border-radius: 50%;',
            '  background: #3b82f6; flex-shrink: 0; margin-top: 5px;',
            '}',
            '#_nbPanel ._nb-dot.read { background: transparent; }',
            '#_nbPanel ._nb-item-title { font-size: 12px; font-weight: 600; color: #f1f5f9; margin-bottom: 2px; }',
            '#_nbPanel ._nb-item-body { font-size: 11px; color: rgba(255,255,255,.55); margin-bottom: 2px; }',
            '#_nbPanel ._nb-item-time { font-size: 10px; color: rgba(255,255,255,.35); }',
            '#_nbPanel ._nb-empty {',
            '  padding: 24px 16px; text-align: center;',
            '  font-size: 12px; color: rgba(255,255,255,.35);',
            '}',
        ].join('\n');
        document.head.appendChild(style);
    }

    // ─── 내부 상태 ────────────────────────────────────────────
    var _bellEl = null;
    var _badgeEl = null;
    var _pollTimer = null;
    var _unreadCount = 0;

    // ─── 헬퍼 함수 ────────────────────────────────────────────

    function _esc(str) {
        return String(str)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function _relTime(dateStr) {
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

    function _updateBadge(count) {
        if (!_badgeEl) return;
        _badgeEl.textContent = count > 99 ? '99+' : count;
        _badgeEl.style.display = count > 0 ? 'flex' : 'none';
    }

    function _positionPanel() {
        var panel = document.getElementById('_nbPanel');
        if (!panel || !_bellEl) return;
        var rect = _bellEl.getBoundingClientRect();
        panel.style.top = (rect.bottom + 4) + 'px';
        panel.style.right = (window.innerWidth - rect.right) + 'px';
        panel.style.left = 'auto';
    }

    // ─── API 함수 ─────────────────────────────────────────────

    function _fetchCount() {
        fetch('/api/notifications')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data) return;
                _unreadCount = data.unread_count || 0;
                _updateBadge(_unreadCount);
            })
            .catch(function () {});
    }

    function _renderPanel(notifications, unreadCount) {
        var panel = document.getElementById('_nbPanel');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = '_nbPanel';
            document.body.appendChild(panel);
        }

        var markAllBtn = unreadCount > 0
            ? '<button class="_nb-mark-all" id="_nbMarkAllBtn">모두 읽음</button>'
            : '';

        var headerHtml =
            '<div class="_nb-ph">' +
            '<span>알림</span>' +
            markAllBtn +
            '</div>';

        var listHtml = '';
        if (!notifications || notifications.length === 0) {
            listHtml = '<div class="_nb-empty">알림이 없습니다.</div>';
        } else {
            listHtml = '<div class="_nb-list">';
            for (var i = 0; i < notifications.length; i++) {
                var n = notifications[i];
                var isUnread = !n.is_read;
                var itemClass = '_nb-item' + (isUnread ? ' unread' : '');
                var dotClass = '_nb-dot' + (isUnread ? '' : ' read');
                var dest = n.type === 'signup_request'
                    ? '/app/admin?tab=signup-requests'
                    : '/app/admin';
                listHtml +=
                    '<div class="' + itemClass + '" data-notif-id="' + n.id + '" data-dest="' + _esc(dest) + '">' +
                    '<div class="' + dotClass + '"></div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div class="_nb-item-title">' + _esc(n.title) + '</div>' +
                    (n.body ? '<div class="_nb-item-body">' + _esc(n.body) + '</div>' : '') +
                    '<div class="_nb-item-time">' + _relTime(n.created_at) + '</div>' +
                    '</div>' +
                    '</div>';
            }
            listHtml += '</div>';
        }

        panel.innerHTML = headerHtml + listHtml;

        // "모두 읽음" 버튼 이벤트
        var markAllBtnEl = document.getElementById('_nbMarkAllBtn');
        if (markAllBtnEl) {
            markAllBtnEl.addEventListener('click', function (e) {
                e.stopPropagation();
                _markAllRead();
            });
        }

        // 알림 항목 클릭 이벤트
        var items = panel.querySelectorAll('._nb-item');
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
    }

    function _openPanel() {
        fetch('/api/notifications')
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
                if (!data) return;
                _unreadCount = data.unread_count || 0;
                _renderPanel(data.notifications || [], _unreadCount);
                var panel = document.getElementById('_nbPanel');
                if (panel) {
                    panel.style.display = 'block';
                    _positionPanel();
                }
                _updateBadge(_unreadCount);
            })
            .catch(function () {});
    }

    function _closePanel() {
        var panel = document.getElementById('_nbPanel');
        if (panel) panel.style.display = 'none';
    }

    function _markAllRead() {
        fetch('/api/notifications/read', { method: 'PATCH' })
            .then(function () { _openPanel(); })
            .catch(function () {});
    }

    // ─── 공개 인터페이스 ──────────────────────────────────────

    function init(containerEl) {
        _injectStyles();

        // 벨 버튼 삽입
        containerEl.innerHTML =
            '<button class="_nb-bell-btn" id="_nbBellBtn" title="알림">&#128276;' +
            '<span id="_nbBellBadge" class="_nb-badge" style="display:none;">0</span>' +
            '</button>';

        _bellEl = document.getElementById('_nbBellBtn');
        _badgeEl = document.getElementById('_nbBellBadge');

        // 벨 클릭 이벤트
        _bellEl.addEventListener('click', function (e) {
            e.stopPropagation();
            var panel = document.getElementById('_nbPanel');
            if (panel && panel.style.display === 'block') {
                _closePanel();
            } else {
                _openPanel();
            }
        });

        // 초기 미읽음 count 조회
        _fetchCount();

        // 60초 폴링 (패널 열려있지 않을 때만)
        if (_pollTimer) clearInterval(_pollTimer);
        _pollTimer = setInterval(function () {
            var panel = document.getElementById('_nbPanel');
            if (!panel || panel.style.display === 'none') _fetchCount();
        }, 60000);

        // 바깥 클릭 시 패널 닫기
        document.addEventListener('click', function (e) {
            var panel = document.getElementById('_nbPanel');
            if (!panel || panel.style.display !== 'block') return;
            if (!panel.contains(e.target) && (!_bellEl || !_bellEl.contains(e.target))) {
                _closePanel();
            }
        });

        // 리사이즈 시 패널 위치 재계산
        window.addEventListener('resize', function () {
            var panel = document.getElementById('_nbPanel');
            if (panel && panel.style.display === 'block') _positionPanel();
        });
    }

    window.NotifBell = { init: init };
})();
