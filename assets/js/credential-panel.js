/**
 * assets/js/credential-panel.js
 * eformsign 인증 저장/불러오기 공유 모듈 (IIFE)
 *
 * 사용법:
 *   <script>
 *   window.CREDENTIAL_CONFIG = {
 *       apiKeyId:         'apiKey',
 *       userIdId:         'user_id_token',
 *       secretKeyId:      'privateKeyHex',
 *       envId:            'envSelection',   // null이면 envFixed 사용
 *       envFixed:         null,             // 'op_saas' | 'csap' (envId가 null일 때)
 *       envSaveMap:       null,             // 페이지값→DB값 맵. null이면 1:1
 *       envLoadMap:       null,             // DB값→페이지값 맵. null이면 1:1
 *       customUrlId:      null,             // custom 환경 URL 입력 필드 ID
 *       secretMethodId:   'secretKeyMethod',// null이면 signature 고정
 *       secretMethodType: 'radio',          // 'radio'|'select'|'tab'|null
 *       darkMode:         false,            // true면 다크 테마 모달 사용
 *   };
 *   </script>
 *   <script src="/assets/js/credential-panel.js"></script>
 */
(function () {
    'use strict';

    var cfg = window.CREDENTIAL_CONFIG || {};
    var _authUser = null;

    // 다크 모드 색상
    var _c = cfg.darkMode ? {
        bg:         '#1e1e1e',
        bgInner:    '#2d2d2d',
        border:     '#444',
        text:       '#e0e0e0',
        textMuted:  '#999',
        inputBg:    '#2d2d2d',
        inputBorder:'#555',
        btnBg:      '#333',
        btnBorder:  '#555',
        btnText:    '#e0e0e0',
        tagBg:      '#1a3a5c',
        tagColor:   '#7ab4f5',
    } : {
        bg:         '#fff',
        bgInner:    '#fff',
        border:     '#e5e7eb',
        text:       '#111',
        textMuted:  '#888',
        inputBg:    '#fff',
        inputBorder:'#d1d5db',
        btnBg:      '#f9fafb',
        btnBorder:  '#d1d5db',
        btnText:    '#333',
        tagBg:      '#f0f4ff',
        tagColor:   '#1a73e8',
    };

    // 초기화
    function _init() {
        _injectStyles();
        _injectModals();
        fetch('/api/me')
            .then(function (r) { return r.json(); })
            .then(function (d) {
                _authUser = (d && d.authenticated !== false && d.username) ? d : null;
            })
            .catch(function () { _authUser = null; });
    }

    async function _ensureAuth() {
        if (_authUser) return true;
        try {
            var r = await fetch('/api/me');
            var d = await r.json();
            _authUser = (d && d.authenticated !== false && d.username) ? d : null;
        } catch (e) { _authUser = null; }
        return !!_authUser;
    }

    // 스타일 격리 — 호스트 페이지 CSS 오염 방지
    function _injectStyles() {
        var s = document.createElement('style');
        s.textContent = [
            '#_cpLoadModal,#_cpSaveModal,#_cpAuthModal{',
                'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
                'font-size:14px;color:' + _c.text + ';',
            '}',
            '#_cpLoadModal *,#_cpSaveModal *,#_cpAuthModal *{',
                'box-sizing:border-box;',
            '}',
            '#_cpLoadModal button,#_cpSaveModal button,#_cpAuthModal button{',
                'all:revert;',
                'font-family:inherit;',
                'cursor:pointer;',
                'line-height:normal;',
                'display:inline-block;',
                'box-sizing:border-box;',
            '}',
            '#_cpLoadModal input,#_cpSaveModal input{',
                'all:revert;',
                'font-family:inherit;',
                'box-sizing:border-box;',
                'width:100%;',
                'display:block;',
            '}',
            '#_cpSaveModal select{',
                'all:revert;',
                'font-family:inherit;',
                'box-sizing:border-box;',
                'width:100%;',
                'display:block;',
            '}',
        ].join('');
        document.head.appendChild(s);
    }

    // 토스트
    function _showToast(msg, duration) {
        if (typeof window.showToast === 'function') {
            window.showToast(msg, duration || 2000);
            return;
        }
        var t = document.getElementById('_cp_toast');
        if (!t) {
            t = document.createElement('div');
            t.id = '_cp_toast';
            t.style.cssText = [
                'position:fixed', 'bottom:80px', 'right:20px',
                'background:rgba(30,30,30,0.92)', 'color:#fff',
                'padding:10px 18px', 'border-radius:8px',
                'font-size:13px', 'z-index:999999',
                'opacity:0', 'transition:opacity 0.2s',
                'pointer-events:none', 'max-width:320px',
                'word-break:break-word', 'line-height:1.5',
            ].join(';');
            document.body.appendChild(t);
        }
        t.textContent = msg;
        t.style.opacity = '1';
        clearTimeout(t._timer);
        t._timer = setTimeout(function () { t.style.opacity = '0'; }, duration || 2000);
    }

    // DOM 헬퍼
    function _getVal(id) {
        var el = id ? document.getElementById(id) : null;
        return el ? el.value.trim() : '';
    }

    function _setVal(id, val) {
        var el = id ? document.getElementById(id) : null;
        if (!el) return;
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true }));
    }

    function _esc(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;')
            .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // 환경값 변환
    function _envToDb(pageVal) {
        return (cfg.envSaveMap && cfg.envSaveMap[pageVal]) || pageVal;
    }
    function _envFromDb(dbVal) {
        return (cfg.envLoadMap && cfg.envLoadMap[dbVal]) || dbVal;
    }

    // 페이지 → 크리덴셜 읽기
    function _readFromPage() {
        var env, customUrl = null;
        if (cfg.envId) {
            env = _envToDb(_getVal(cfg.envId));
            if (env === 'custom' && cfg.customUrlId) {
                customUrl = _getVal(cfg.customUrlId);
            }
        } else {
            env = cfg.envFixed || 'op_saas';
        }

        var secretMethod = 'signature';
        if (cfg.secretMethodType === 'radio' && cfg.secretMethodId) {
            var chk = document.querySelector('[name="' + cfg.secretMethodId + '"]:checked');
            if (chk) secretMethod = chk.value;
        } else if (cfg.secretMethodType === 'select' && cfg.secretMethodId) {
            secretMethod = _getVal(cfg.secretMethodId) || 'signature';
        } else if (cfg.secretMethodType === 'tab') {
            var tab = document.querySelector('[data-method].active, .auth-method-tab.active');
            if (tab) secretMethod = tab.dataset.method || 'signature';
        }

        if (secretMethod !== 'bearer') secretMethod = 'signature';

        return {
            apiKey: _getVal(cfg.apiKeyId),
            userId: _getVal(cfg.userIdId),
            secretKey: _getVal(cfg.secretKeyId),
            env: env,
            customUrl: customUrl,
            secretMethod: secretMethod,
        };
    }

    // 크리덴셜 → 페이지 적용
    function _applyToPage(c) {
        _setVal(cfg.apiKeyId, c.api_key);
        _setVal(cfg.userIdId, c.eform_user_id);

        if (cfg.envId) {
            _setVal(cfg.envId, _envFromDb(c.environment));
        }
        if (c.environment === 'custom' && c.custom_url && cfg.customUrlId) {
            _setVal(cfg.customUrlId, c.custom_url);
        }

        if (cfg.secretMethodType === 'radio' && cfg.secretMethodId) {
            var radios = document.querySelectorAll('[name="' + cfg.secretMethodId + '"]');
            radios.forEach(function (r) {
                if (r.value === c.secret_method) {
                    r.checked = true;
                    r.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        } else if (cfg.secretMethodType === 'select' && cfg.secretMethodId) {
            _setVal(cfg.secretMethodId, c.secret_method);
        } else if (cfg.secretMethodType === 'tab') {
            var btn = document.querySelector('[data-method="' + c.secret_method + '"]');
            if (btn) btn.click();
        }

        if (c.secret_key) {
            _setVal(cfg.secretKeyId, c.secret_key);
            _showToast('"' + _esc(c.name) + '" 인증 정보를 불러왔습니다.');
        } else {
            _setVal(cfg.secretKeyId, '');
            _showToast('"' + _esc(c.name) + '" 불러오기 완료 — 비밀 키를 직접 입력해주세요.', 3500);
        }
    }

    // custom 환경 포함 환경 레이블 반환
    function _envLabel(c) {
        if (c.environment === 'op_saas') return '운영(SaaS)';
        if (c.environment === 'csap') return '공공(CSAP)';
        if (c.environment === 'custom') {
            return c.custom_url ? '직접 입력 · ' + _esc(c.custom_url) : '직접 입력';
        }
        return _esc(c.environment);
    }

    // 불러오기 목록 렌더링
    function _renderList(list) {
        var el = document.getElementById('_cpLoadList');
        if (!el) return;
        if (!list.length) {
            el.innerHTML = '<div style="text-align:center;padding:40px 0;color:' + _c.textMuted + ';font-size:13px;">저장된 인증 정보가 없습니다.<br>인증 저장 버튼으로 저장하세요.</div>';
            return;
        }
        el.innerHTML = list.map(function (c, i) {
            var border = i < list.length - 1 ? 'border-bottom:1px solid ' + _c.border + ';' : '';
            return '<div style="' + border + 'padding:14px 16px;">' +
                '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">' +
                    '<span style="padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:' + _c.tagBg + ';color:' + _c.tagColor + ';max-width:320px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;vertical-align:middle;">' +
                    _envLabel(c) + '</span>' +
                    '<span style="flex:1"></span>' +
                    '<button type="button" onclick="_cpApplyCredential(\'' + c.id + '\')" style="padding:4px 12px;font-size:12px;background:#1a73e8;color:#fff;border:none;border-radius:5px;cursor:pointer;white-space:nowrap;font-weight:600;">선택</button>' +
                    '<button type="button" onclick="_cpDeleteCredential(\'' + c.id + '\')" style="padding:4px 8px;font-size:12px;background:none;border:1px solid ' + _c.btnBorder + ';border-radius:5px;cursor:pointer;color:#d32f2f;white-space:nowrap;">삭제</button>' +
                '</div>' +
                '<table style="width:100%;border-collapse:collapse;font-size:13px;color:' + _c.text + ';">' +
                    '<tr><td style="width:80px;padding:3px 0;color:' + _c.textMuted + ';font-size:12px;white-space:nowrap;">인증 이름</td><td style="padding:3px 0;word-break:break-all;"><strong>' + _esc(c.name) + '</strong></td></tr>' +
                    '<tr><td style="width:80px;padding:3px 0;color:' + _c.textMuted + ';font-size:12px;white-space:nowrap;">API Key</td><td style="padding:3px 0;word-break:break-all;font-family:monospace;font-size:12px;">' + _esc(c.api_key) + '</td></tr>' +
                    '<tr><td style="width:80px;padding:3px 0;color:' + _c.textMuted + ';font-size:12px;white-space:nowrap;">User ID</td><td style="padding:3px 0;word-break:break-all;font-family:monospace;font-size:12px;">' + _esc(c.eform_user_id) + '</td></tr>' +
                    '<tr><td style="width:80px;padding:3px 0;color:' + _c.textMuted + ';font-size:12px;white-space:nowrap;">비밀 키</td><td style="padding:3px 0;font-size:12px;">' + (c.has_secret_key ? '저장됨 🔑' : '미저장 🔓') + '</td></tr>' +
                '</table></div>';
        }).join('');
    }

    // 공통 모달 헤더 HTML
    function _modalHeader(title, closeFn) {
        return '<div style="padding:20px 24px;border-bottom:1px solid ' + _c.border + ';display:flex;align-items:center;justify-content:space-between;flex-shrink:0;">' +
            '<h3 style="margin:0;font-size:16px;font-weight:700;white-space:nowrap;flex-shrink:0;color:' + _c.text + ';">' + title + '</h3>' +
            '<button type="button" onclick="' + closeFn + '()" style="background:none;border:none;font-size:22px;line-height:1;cursor:pointer;color:' + _c.textMuted + ';padding:0 0 0 12px;flex-shrink:0;">\u00d7</button>' +
        '</div>';
    }

    // 공통 인풋 스타일
    function _inputStyle(extra) {
        return 'width:100%;padding:8px 12px;border:1px solid ' + _c.inputBorder + ';border-radius:6px;font-size:13px;background:' + _c.inputBg + ';color:' + _c.text + ';' + (extra || '');
    }

    // 공통 버튼 스타일
    function _btnStyle(primary) {
        if (primary) return 'padding:8px 16px;border:none;border-radius:6px;background:#1a73e8;color:#fff;cursor:pointer;font-size:13px;font-weight:600;';
        return 'padding:8px 16px;border:1px solid ' + _c.btnBorder + ';border-radius:6px;background:' + _c.btnBg + ';color:' + _c.btnText + ';cursor:pointer;font-size:13px;';
    }

    // 모달 HTML 주입
    function _injectModals() {
        var wrap = document.createElement('div');
        wrap.innerHTML = [
            // 불러오기 모달
            '<div id="_cpLoadModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99990;align-items:center;justify-content:center;">',
                '<div style="background:' + _c.bg + ';border-radius:12px;width:90%;max-width:720px;max-height:90vh;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.3);">',
                    _modalHeader('인증 불러오기', '_cpCloseLoadModal'),
                    '<div id="_cpLoadList" style="overflow-y:auto;max-height:480px;"></div>',
                '</div>',
            '</div>',

            // 저장 모달
            '<div id="_cpSaveModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99990;align-items:center;justify-content:center;">',
                '<div style="background:' + _c.bg + ';border-radius:12px;width:90%;max-width:520px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">',
                    _modalHeader('인증 저장', '_cpCloseSaveModal'),
                    '<div style="padding:20px 24px;">',
                        '<div style="margin-bottom:14px;">',
                            '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:' + _c.text + ';">저장 이름 <span style="color:#e53e3e;">*</span></label>',
                            '<input id="_cpSaveName" type="text" placeholder="예: 운영 계정" style="' + _inputStyle() + '">',
                        '</div>',
                        '<div style="margin-bottom:14px;">',
                            '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:' + _c.text + ';">환경</label>',
                            '<select id="_cpSaveEnv" onchange="_cpSaveEnvChange()" style="' + _inputStyle('padding:8px 10px;') + '">',
                                '<option value="op_saas">운영(SaaS)</option>',
                                '<option value="csap">공공(CSAP)</option>',
                                '<option value="custom">직접 입력</option>',
                            '</select>',
                        '</div>',
                        '<div id="_cpSaveCustomUrlWrap" style="display:none;margin-bottom:14px;">',
                            '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:' + _c.text + ';">Custom URL <span style="color:#e53e3e;">*</span></label>',
                            '<input id="_cpSaveCustomUrl" type="text" placeholder="https://your-domain.com/Service" style="' + _inputStyle() + '">',
                        '</div>',
                        '<div style="margin-bottom:14px;">',
                            '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:' + _c.text + ';">API Key</label>',
                            '<input id="_cpSaveApiKey" type="text" style="' + _inputStyle('font-family:monospace;') + '">',
                        '</div>',
                        '<div style="margin-bottom:14px;">',
                            '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:' + _c.text + ';">User ID</label>',
                            '<input id="_cpSaveUserId" type="text" style="' + _inputStyle('font-family:monospace;') + '">',
                        '</div>',
                        '<div style="margin-bottom:14px;">',
                            '<label style="display:block;font-size:13px;font-weight:600;margin-bottom:6px;color:' + _c.text + ';">비밀 키</label>',
                            '<div style="display:flex;gap:6px;width:100%;">',
                                '<input id="_cpSaveSecretKey" type="password" style="flex:1;min-width:0;padding:8px 12px;border:1px solid ' + _c.inputBorder + ';border-radius:6px;font-size:13px;font-family:monospace;background:' + _c.inputBg + ';color:' + _c.text + ';">',
                                '<button type="button" id="_cpToggleBtn" onclick="_cpToggleSecret()" style="flex-shrink:0;padding:8px 12px;border:1px solid ' + _c.btnBorder + ';border-radius:6px;background:' + _c.btnBg + ';cursor:pointer;font-size:12px;white-space:nowrap;color:' + _c.btnText + ';">표시</button>',
                            '</div>',
                        '</div>',
                        '<div style="margin-bottom:20px;">',
                            '<label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:13px;color:' + _c.text + ';font-weight:normal;">',
                                '<input id="_cpSaveSecretCheck" type="checkbox" style="width:auto;display:inline-block;margin:0;flex-shrink:0;">',
                                '<span>비밀 키도 함께 저장합니다</span>',
                            '</label>',
                        '</div>',
                        '<div style="display:flex;gap:8px;justify-content:flex-end;">',
                            '<button type="button" onclick="_cpCloseSaveModal()" style="' + _btnStyle(false) + '">취소</button>',
                            '<button type="button" onclick="_cpConfirmSave()" style="' + _btnStyle(true) + '">저장</button>',
                        '</div>',
                    '</div>',
                '</div>',
            '</div>',

            // 비로그인 모달
            '<div id="_cpAuthModal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99990;align-items:center;justify-content:center;">',
                '<div style="background:' + _c.bg + ';border-radius:12px;width:90%;max-width:380px;box-shadow:0 20px 60px rgba(0,0,0,0.3);">',
                    _modalHeader('로그인 필요', '_cpCloseAuthModal'),
                    '<div style="padding:24px 28px;text-align:center;">',
                        '<div style="font-size:2.5rem;margin-bottom:12px;">🔒</div>',
                        '<p style="margin:0 0 24px;font-size:13px;color:' + _c.textMuted + ';line-height:1.6;">인증 저장/불러오기 기능은<br>로그인한 사용자만 사용할 수 있습니다.</p>',
                        '<div style="display:flex;gap:8px;justify-content:center;">',
                            '<button type="button" onclick="_cpCloseAuthModal()" style="' + _btnStyle(false) + '">닫기</button>',
                            '<a id="_cpAuthLoginBtn" href="/auth/login.html" style="padding:8px 16px;border:none;border-radius:6px;background:#1a73e8;color:#fff;cursor:pointer;font-size:13px;font-weight:600;text-decoration:none;display:inline-flex;align-items:center;line-height:normal;">로그인하기</a>',
                        '</div>',
                    '</div>',
                '</div>',
            '</div>',
        ].join('');
        document.body.appendChild(wrap);
    }

    // 전역 함수
    window.openCredentialLoadModal = async function () {
        if (!await _ensureAuth()) { _showAuthModal(); return; }
        try {
            var res = await fetch('/api/credentials');
            if (!res.ok) return;
            _renderList(await res.json());
            document.getElementById('_cpLoadModal').style.display = 'flex';
        } catch (e) { _showToast('불러오기 중 오류가 발생했습니다.', 2500); }
    };

    window.openCredentialSaveModal = async function () {
        if (!await _ensureAuth()) { _showAuthModal(); return; }
        var cur = _readFromPage();
        document.getElementById('_cpSaveName').value = '';
        document.getElementById('_cpSaveApiKey').value = cur.apiKey;
        document.getElementById('_cpSaveUserId').value = cur.userId;
        document.getElementById('_cpSaveSecretKey').value = cur.secretKey;
        document.getElementById('_cpSaveSecretKey').type = 'password';
        document.getElementById('_cpToggleBtn').textContent = '표시';
        document.getElementById('_cpSaveSecretCheck').checked = false;
        // 환경 select 초기값 세팅
        var saveEnv = document.getElementById('_cpSaveEnv');
        var saveCustomUrl = document.getElementById('_cpSaveCustomUrl');
        var saveCustomUrlWrap = document.getElementById('_cpSaveCustomUrlWrap');
        if (saveEnv) {
            saveEnv.value = cur.env || 'op_saas';
            saveEnv.disabled = !!cfg.envFixed;
        }
        if (saveCustomUrl) saveCustomUrl.value = cur.customUrl || '';
        if (saveCustomUrlWrap) saveCustomUrlWrap.style.display = cur.env === 'custom' ? '' : 'none';
        document.getElementById('_cpSaveModal').style.display = 'flex';
        setTimeout(function () { document.getElementById('_cpSaveName').focus(); }, 50);
    };

    // 저장 모달 환경 select 변경 시 Custom URL 래퍼 토글
    window._cpSaveEnvChange = function () {
        var env = document.getElementById('_cpSaveEnv').value;
        var wrap = document.getElementById('_cpSaveCustomUrlWrap');
        if (wrap) wrap.style.display = env === 'custom' ? '' : 'none';
    };

    window._cpCloseLoadModal = function () {
        document.getElementById('_cpLoadModal').style.display = 'none';
    };
    window._cpCloseSaveModal = function () {
        document.getElementById('_cpSaveModal').style.display = 'none';
    };
    window._cpCloseAuthModal = function () {
        document.getElementById('_cpAuthModal').style.display = 'none';
    };

    window._cpToggleSecret = function () {
        var el = document.getElementById('_cpSaveSecretKey');
        var btn = document.getElementById('_cpToggleBtn');
        if (el.type === 'password') { el.type = 'text'; btn.textContent = '숨김'; }
        else { el.type = 'password'; btn.textContent = '표시'; }
    };

    window._cpApplyCredential = async function (id) {
        try {
            var res = await fetch('/api/credentials/' + id);
            if (!res.ok) { alert('불러오기 실패'); return; }
            _applyToPage(await res.json());
            window._cpCloseLoadModal();
        } catch (e) { _showToast('불러오기 중 오류가 발생했습니다.', 2500); }
    };

    window._cpDeleteCredential = async function (id) {
        if (!confirm('이 인증 정보를 삭제하시겠습니까?')) return;
        try {
            await fetch('/api/credentials/' + id, { method: 'DELETE' });
            var res = await fetch('/api/credentials');
            if (res.ok) _renderList(await res.json());
        } catch (e) { _showToast('삭제 중 오류가 발생했습니다.', 2500); }
    };

    window._cpConfirmSave = async function () {
        var name = document.getElementById('_cpSaveName').value.trim();
        if (!name) { document.getElementById('_cpSaveName').focus(); return; }
        var apiKey = document.getElementById('_cpSaveApiKey').value.trim();
        var userId = document.getElementById('_cpSaveUserId').value.trim();
        if (!apiKey || !userId) { alert('API Key와 User ID를 입력해주세요.'); return; }
        var saveSecret = document.getElementById('_cpSaveSecretCheck').checked;
        var secretKey = saveSecret ? (document.getElementById('_cpSaveSecretKey').value.trim() || null) : null;
        // 환경값은 모달 select에서 직접 읽음 (DB 형식: op_saas/csap/custom)
        var modalEnv = (document.getElementById('_cpSaveEnv') || {}).value || _readFromPage().env;
        var modalCustomUrl = modalEnv === 'custom'
            ? ((document.getElementById('_cpSaveCustomUrl') || {}).value || '').trim()
            : null;
        if (modalEnv === 'custom' && !modalCustomUrl) {
            var urlEl = document.getElementById('_cpSaveCustomUrl');
            if (urlEl) urlEl.focus();
            return;
        }
        var cur = _readFromPage(); // secretMethod 읽기용
        try {
            var res = await fetch('/api/credentials', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name,
                    environment: modalEnv,
                    custom_url: modalCustomUrl,
                    api_key: apiKey,
                    eform_user_id: userId,
                    secret_method: cur.secretMethod,
                    secret_key: secretKey,
                }),
            });
            if (!res.ok) {
                var err = await res.json().catch(function () { return {}; });
                alert('저장 실패: ' + ((err.error && err.error.message) || res.status));
                return;
            }
            window._cpCloseSaveModal();
            _showToast('"' + _esc(name) + '" 인증 정보가 저장되었습니다.');
        } catch (e) { _showToast('저장 중 오류가 발생했습니다.', 2500); }
    };

    function _showAuthModal() {
        var btn = document.getElementById('_cpAuthLoginBtn');
        if (btn) btn.href = '/auth/login.html?next=' + encodeURIComponent(window.location.pathname);
        document.getElementById('_cpAuthModal').style.display = 'flex';
    }

    // 실행
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', _init);
    } else {
        _init();
    }
})();
