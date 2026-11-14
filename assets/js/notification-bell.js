/**
 * assets/js/notification-bell.js
 * index.html 전용 알림 벨 독립 모듈
 *
 * 사용법:
 *   <script src="/assets/js/notification-bell.js"></script>
 *   window.NotifBell.init(containerEl, meData);  // 로그인 확인 후 호출 (역할 무관, P1-18)
 *
 * - admin: private-notifications-admin 채널 (가입·재설정 요청, 버그 접수)
 * - 그 외 로그인 사용자: private-notifications-{id} 채널 (내 버그 리포트 상태 변경·답변)
 * - /api/notifications가 역할별로 목록을 나눠 주므로 API 호출은 같다
 * - 이동 경로는 auth-status.js의 getNotificationDest와 같은 규칙 (수정 시 함께 변경)
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
            /* X 버튼 */
            '#_nbPanel ._nb-del {',
            '  background: none; border: none; cursor: pointer;',
            '  color: rgba(255,255,255,.25); font-size: 14px; line-height: 1;',
            '  padding: 2px 4px; border-radius: 4px; flex-shrink: 0;',
            '  transition: color .1s, background .1s;',
            '  align-self: flex-start; margin-top: -1px;',
            '}',
            '#_nbPanel ._nb-item:hover ._nb-del { color: rgba(255,255,255,.6); }',
            '#_nbPanel ._nb-del:hover { color: #ef4444 !important; background: rgba(239,68,68,.12); }',
            /* 전체 삭제 버튼 */
            '#_nbPanel ._nb-del-all {',
            '  font-size: 11px; color: rgba(255,255,255,.35);',
            '  background: none; border: none; cursor: pointer; padding: 0;',
            '}',
            '#_nbPanel ._nb-del-all:hover { color: #ef4444; }',
        ].join('\n');
        document.head.appendChild(style);
    }

    // ─── 내부 상태 ────────────────────────────────────────────
    var _isAdmin = false;
    var _bellEl = null;
    var _badgeEl = null;
    // Pusher를 쓸 수 없을 때의 대체 조회 (P1-24) — 10분 간격, 탭이 숨겨진 동안은 멈춘다(Neon idle suspend 유지)
    var FALLBACK_INTERVAL_MS = 600000;
    var _fallbackWanted = false;   // 대체 조회가 필요한 상태(Pusher 미사용·연결 실패)인지
    var _fallbackTimer = null;     // setInterval 핸들
    var _fallbackKickoff = null;   // 복귀 후 남은 시간을 기다리는 setTimeout 핸들
    var _lastFetchAt = 0;          // 마지막 /api/notifications 요청 시각
    var _authLost = false;         // /api/notifications가 401을 준 뒤에는 다시 조회하지 않는다
    var _visibilityBound = false;
    var _pusherClient = null;
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
        _unreadCount = count || 0;
        if (!_badgeEl) return;
        _badgeEl.textContent = _unreadCount > 99 ? '99+' : _unreadCount;
        _badgeEl.style.display = _unreadCount > 0 ? 'flex' : 'none';
    }

    // reference_id가 숫자(버그 리포트 id)일 때만 경로에 붙인다
    function _reportId(n) {
        var ref = n && n.reference_id != null ? String(n.reference_id) : '';
        return /^[0-9]{1,10}$/.test(ref) ? ref : '';
    }

    function _notificationDest(n) {
        var type = n && n.type;
        var reportId = _reportId(n);
        if (type === 'signup_request') return '/app/admin?tab=signup-requests';
        if (type === 'bug_report') return '/app/admin?tab=bug-reports' + (reportId ? '&report=' + reportId : '');
        if (type === 'password_reset_request') return '/app/admin?tab=users';
        if (type === 'bug_report_status' || type === 'bug_report_reply') {
            return '/community/bug-report.html#my-reports' + (reportId ? '/' + reportId : '');
        }
        return _isAdmin ? '/app/admin' : '/';
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

    // /api/notifications 401 — 로그아웃·세션 만료 상태에서 계속 두드리지 않도록 대체 조회를 멈춘다.
    // (index.html은 auth-status.js를 쓰지 않으므로 새로고침 안내는 하지 않는다)
    function _handleAuthLost(r) {
        if (!r || r.status !== 401) return false;
        _authLost = true;
        _stopFallbackPolling();
        return true;
    }

    function _fetchCount() {
        _lastFetchAt = Date.now();
        fetch('/api/notifications')
            .then(function (r) {
                if (_handleAuthLost(r)) return null;
                return r.ok ? r.json() : null;
            })
            .then(function (data) {
                if (!data) return;
                _updateBadge(data.unread_count || 0);
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

        var delAllBtn = notifications && notifications.length > 0
            ? '<button class="_nb-del-all" id="_nbDelAllBtn">전체 삭제</button>'
            : '';

        var headerHtml =
            '<div class="_nb-ph">' +
            '<span>알림</span>' +
            '<span style="display:flex;gap:8px;align-items:center;">' +
            markAllBtn + delAllBtn +
            '</span>' +
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
                var dest = _notificationDest(n);
                listHtml +=
                    '<div class="' + itemClass + '" data-notif-id="' + _esc(n.id) + '" data-dest="' + _esc(dest) + '">' +
                    '<div class="' + dotClass + '"></div>' +
                    '<div style="flex:1;min-width:0;">' +
                    '<div class="_nb-item-title">' + _esc(n.title) + '</div>' +
                    (n.body ? '<div class="_nb-item-body">' + _esc(n.body) + '</div>' : '') +
                    '<div class="_nb-item-time">' + _relTime(n.created_at) + '</div>' +
                    '</div>' +
                    '<button class="_nb-del" data-del-id="' + _esc(n.id) + '" title="알림 삭제">&#10005;</button>' +
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

        // "전체 삭제" 버튼 이벤트
        var delAllBtnEl = document.getElementById('_nbDelAllBtn');
        if (delAllBtnEl) {
            delAllBtnEl.addEventListener('click', function (e) {
                e.stopPropagation();
                // 되돌릴 수 없으므로 확인을 받는다 (P1-18)
                if (!window.confirm('알림을 모두 삭제할까요? 삭제한 알림은 되돌릴 수 없습니다.')) return;
                _deleteAll();
            });
        }

        // X 버튼(개별 삭제) 이벤트
        var delBtns = panel.querySelectorAll('._nb-del');
        for (var k = 0; k < delBtns.length; k++) {
            (function (btn) {
                btn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    var id = btn.getAttribute('data-del-id');
                    _deleteOne(id, btn.closest('._nb-item'));
                });
            })(delBtns[k]);
        }
    }

    function _openPanel() {
        _lastFetchAt = Date.now();
        fetch('/api/notifications')
            .then(function (r) {
                if (_handleAuthLost(r)) return null;
                return r.ok ? r.json() : null;
            })
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

    function _deleteOne(id, itemEl) {
        fetch('/api/notifications/' + id, { method: 'DELETE' })
            .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
            .then(function () {
                if (itemEl) itemEl.remove();
                // 삭제된 항목이 unread였으면 배지 감소
                if (itemEl && itemEl.classList.contains('unread')) {
                    _updateBadge(Math.max(0, _unreadCount - 1));
                }
                // 목록이 비었으면 빈 상태 표시
                var list = document.querySelector('#_nbPanel ._nb-list');
                if (list && list.querySelectorAll('._nb-item').length === 0) {
                    list.outerHTML = '<div class="_nb-empty">알림이 없습니다.</div>';
                    // 헤더 버튼들도 갱신
                    var delAllEl = document.getElementById('_nbDelAllBtn');
                    if (delAllEl) delAllEl.remove();
                    var markAllEl = document.getElementById('_nbMarkAllBtn');
                    if (markAllEl) markAllEl.remove();
                }
            })
            .catch(function () {});
    }

    function _deleteAll() {
        fetch('/api/notifications', { method: 'DELETE' })
            .then(function () { _openPanel(); })
            .catch(function () {});
    }

    function _fallbackTick() {
        var panel = document.getElementById('_nbPanel');
        if (!panel || panel.style.display === 'none') _fetchCount();
    }

    function _clearFallbackTimers() {
        if (_fallbackKickoff) {
            clearTimeout(_fallbackKickoff);
            _fallbackKickoff = null;
        }
        if (_fallbackTimer) {
            clearInterval(_fallbackTimer);
            _fallbackTimer = null;
        }
    }

    // 마지막 조회 시각 기준으로 다음 조회를 잡는다 — 600초가 이미 지났으면 바로 1회 조회
    function _armFallbackTimer() {
        _clearFallbackTimers();
        var wait = FALLBACK_INTERVAL_MS - (Date.now() - _lastFetchAt);
        if (wait <= 0) {
            _fallbackTick();
            _fallbackTimer = setInterval(_fallbackTick, FALLBACK_INTERVAL_MS);
            return;
        }
        _fallbackKickoff = setTimeout(function () {
            _fallbackKickoff = null;
            _fallbackTick();
            _fallbackTimer = setInterval(_fallbackTick, FALLBACK_INTERVAL_MS);
        }, wait);
    }

    function _startFallbackPolling() {
        if (_authLost) return;
        _fallbackWanted = true;
        if (document.hidden || _fallbackTimer || _fallbackKickoff) return;
        _armFallbackTimer();
    }

    function _stopFallbackPolling() {
        _fallbackWanted = false;
        _clearFallbackTimers();
    }

    // 탭이 숨겨지면 타이머만 멈추고(대체 조회 필요 상태는 유지), 다시 보이면 재개한다
    function _onVisibilityChange() {
        if (document.hidden) {
            _clearFallbackTimers();
            return;
        }
        if (!_fallbackWanted || _authLost || _fallbackTimer || _fallbackKickoff) return;
        _armFallbackTimer();
    }

    function _setupRealtime(meData) {
        _stopFallbackPolling();
        if (_pusherClient) {
            try { _pusherClient.disconnect(); } catch (e) {}
            _pusherClient = null;
        }

        var channelName = _isAdmin
            ? 'private-notifications-admin'
            : (meData && meData.id ? 'private-notifications-' + meData.id : '');

        if (!window.Pusher || !meData || !meData.pusher_key || !meData.pusher_cluster || !channelName) {
            _startFallbackPolling();
            return;
        }

        try {
            _pusherClient = new Pusher(meData.pusher_key, {
                cluster: meData.pusher_cluster,
                authEndpoint: '/api/pusher/auth',
            });

            var channel = _pusherClient.subscribe(channelName);

            channel.bind('new-notification', function (data) {
                if (data && typeof data.unread_count === 'number') {
                    _updateBadge(data.unread_count);
                } else {
                    _fetchCount();
                }
            });
            channel.bind('notification-read', function (data) {
                _updateBadge(data && data.unread_count);
            });
            channel.bind('notifications-read', function (data) {
                _updateBadge(data && data.unread_count);
            });
            channel.bind('notification-deleted', function (data) {
                _updateBadge(data && data.unread_count);
            });
            channel.bind('notifications-cleared', function (data) {
                _updateBadge(data && data.unread_count);
            });
            channel.bind('pusher:subscription_error', function () {
                _startFallbackPolling();
            });

            _pusherClient.connection.bind('unavailable', function () {
                _startFallbackPolling();
            });
            _pusherClient.connection.bind('connected', function () {
                _stopFallbackPolling();
            });
        } catch (error) {
            console.error('알림 Pusher 초기화 오류:', error);
            _startFallbackPolling();
        }
    }

    // ─── 공개 인터페이스 ──────────────────────────────────────

    function init(containerEl, meData) {
        _injectStyles();
        _isAdmin = !!(meData && meData.role === 'admin');

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

        _setupRealtime(meData);

        if (!_visibilityBound) {
            _visibilityBound = true;
            document.addEventListener('visibilitychange', _onVisibilityChange);
        }

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
