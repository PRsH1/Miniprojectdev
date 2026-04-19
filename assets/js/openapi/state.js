// ──────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────
const DOMAINS = {
    op_saas: 'https://kr-api.eformsign.com',
    csap: 'https://www.gov-eformsign.com/Service'
};

// ──────────────────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────────────────
let state = {
    accessToken: '',
    authUser: null,
    authMethod: 'signature',   // 'signature' | 'bearer'
    currentEndpoint: null,
    currentHistoryId: null,
};

// 엔드포인트별 응답 캐시 { [endpointId]: { statusText, statusClass, time, size, bodyHtml } }
const responseCache = {};

function saveResponseState(epId) {
    if (!epId || !$('#responseBody').is(':visible')) return;
    responseCache[epId] = {
        statusText:  $('#statusBadge').text(),
        statusClass: $('#statusBadge').attr('class'),
        time:        $('#responseTime').text(),
        size:        $('#responseSize').text(),
        bodyHtml:    $('#responseBody').html(),
    };
}

function restoreResponseState(epId) {
    const cached = responseCache[epId];
    if (cached) {
        $('#statusBadge').text(cached.statusText).attr('class', cached.statusClass).show();
        $('#responseTime').text(cached.time);
        $('#responseSize').text(cached.size);
        $('#responseMeta').show();
        $('#responseBody').html(cached.bodyHtml).show();
        $('#responsePlaceholder').hide();
        $('#btnCopyResponse').show();
        $('#btnClearResponse').show();
    } else {
        clearResponse();
    }
}

// ──────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────
function getBaseUrl() {
    const env = $('#envSelect').val();
    if (env === 'custom') {
        return $('#customDomainInput').val().trim().replace(/\/+$/, '');
    }
    return DOMAINS[env] || '';
}

function methodClass(method) {
    return 'm-' + (method || 'get').toLowerCase();
}

function methodBadge(method) {
    return `<span class="m-badge ${methodClass(method)}">${method}</span>`;
}

function showToast(msg, duration = 2000) {
    const $t = $('#toast');
    $t.text(msg).addClass('show');
    setTimeout(() => $t.removeClass('show'), duration);
}

function formatJsonSyntax(json) {
    if (typeof json !== 'string') json = JSON.stringify(json, null, 2);
    return json
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/("(?:[^"\\]|\\.)*")(\s*:)/g, '<span class="json-key">$1</span>$2')
        .replace(/:\s*("(?:[^"\\]|\\.)*")/g, ': <span class="json-string">$1</span>')
        .replace(/:\s*(-?\d+\.?\d*(?:[eE][+-]?\d+)?)/g, ': <span class="json-number">$1</span>')
        .replace(/:\s*(true|false)/g, ': <span class="json-bool">$1</span>')
        .replace(/:\s*(null)/g, ': <span class="json-null">$1</span>');
}

// ──────────────────────────────────────────────────────────────────────────
// HISTORY (localStorage)
// ──────────────────────────────────────────────────────────────────────────
const HISTORY_KEY = 'openapi_tester_history';
const HISTORY_MAX = 100;

function historyLoad() {
    try {
        return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
    } catch { return []; }
}

function historySave(entries) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

function historyCaptureAndSave(customName) {
    const ep = state.currentEndpoint;
    if (!ep) return;

    const pathParams = [];
    $('#pathBody tr').each(function() {
        pathParams.push({ key: $(this).find('.param-key').val(), value: $(this).find('.param-val').val() });
    });

    const queryParams = [];
    $('#queryBody tr').each(function() {
        queryParams.push({ enabled: $(this).find('.param-enabled').is(':checked'), key: $(this).find('.param-key').val(), value: $(this).find('.param-val').val() });
    });

    const headers = [];
    $('#headersBody tr').each(function() {
        headers.push({ enabled: $(this).find('.header-enabled').is(':checked'), key: $(this).find('.header-key').val(), value: $(this).find('.header-val').val() });
    });

    let response = null;
    if ($('#statusBadge').is(':visible')) {
        response = {
            statusText: $('#statusBadge').text(),
            statusClass: $('#statusBadge').attr('class'),
            time: $('#responseTime').text(),
            size: $('#responseSize').text()
        };
    }

    const entry = {
        id: Date.now().toString(),
        savedAt: Date.now(),
        name: customName || ep.name,
        endpointId: ep.id,
        method: ep.method,
        environment: $('#envSelect').val(),
        url: $('#urlInput').val(),
        pathParams,
        queryParams,
        headers,
        body: $('#bodyEditor').val(),
        response
    };

    const list = historyLoad();
    list.unshift(entry);
    if (list.length > HISTORY_MAX) list.splice(HISTORY_MAX);
    historySave(list);
    return entry;
}

function historyDelete(id) {
    const list = historyLoad().filter(e => e.id !== id);
    historySave(list);
}

function historyClear() {
    localStorage.removeItem(HISTORY_KEY);
}

// 특정 엔드포인트에 저장된 히스토리 항목 반환 (최신순)
function historyByEndpoint(endpointId) {
    return historyLoad().filter(e => e.endpointId === endpointId);
}

// ─── 크리덴셜 저장/불러오기 ───────────────────────────────

async function loadCredentialList() {
    try {
        const res = await fetch('/api/credentials');
        if (!res.ok) return;
        const list = await res.json();
        renderCredentialLoadModal(list);
    } catch (e) {}
}

function renderCredentialLoadModal(list) {
    const container = document.getElementById('credentialLoadList');
    if (!container) return;

    const envMap = { op_saas: '운영(SaaS)', csap: '공공(CSAP)', custom: '직접 입력' };

    if (!list.length) {
        container.innerHTML = '<div style="text-align:center;padding:40px 0;color:var(--text-muted,#888);font-size:13px;">저장된 인증 정보가 없습니다.<br>인증 저장 버튼으로 저장하세요.</div>';
        return;
    }

    container.innerHTML = list.map((c, i) => `
        <div style="${i < list.length - 1 ? 'border-bottom:1px solid var(--border,#e5e7eb);' : ''}padding:14px 16px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:700;background:var(--bg-elevated,#f0f4ff);color:var(--primary,#1a73e8);">${escHtml(envMap[c.environment] || c.environment)}</span>
                <span style="flex:1;"></span>
                <button onclick="applyCredentialTester('${c.id}')" style="padding:4px 12px;font-size:12px;background:var(--primary,#1a73e8);color:#fff;border:none;border-radius:5px;cursor:pointer;white-space:nowrap;">선택</button>
                <button onclick="deleteCredentialTester('${c.id}')" style="padding:4px 8px;font-size:12px;background:none;border:1px solid var(--border,#ccc);border-radius:5px;cursor:pointer;color:var(--danger,#d32f2f);white-space:nowrap;">삭제</button>
            </div>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
                <tr>
                    <td style="width:80px;padding:3px 0;color:var(--text-muted,#888);font-size:12px;vertical-align:top;white-space:nowrap;">인증 이름</td>
                    <td style="padding:3px 0;word-break:break-all;"><strong>${escHtml(c.name)}</strong></td>
                </tr>
                <tr>
                    <td style="width:80px;padding:3px 0;color:var(--text-muted,#888);font-size:12px;vertical-align:top;white-space:nowrap;">API Key</td>
                    <td style="padding:3px 0;word-break:break-all;font-family:monospace;font-size:12px;">${escHtml(c.api_key)}</td>
                </tr>
                <tr>
                    <td style="width:80px;padding:3px 0;color:var(--text-muted,#888);font-size:12px;vertical-align:top;white-space:nowrap;">User ID</td>
                    <td style="padding:3px 0;word-break:break-all;font-family:monospace;font-size:12px;">${escHtml(c.eform_user_id)}</td>
                </tr>
                <tr>
                    <td style="width:80px;padding:3px 0;color:var(--text-muted,#888);font-size:12px;vertical-align:top;white-space:nowrap;">비밀 키</td>
                    <td style="padding:3px 0;font-size:12px;">${c.has_secret_key ? '저장됨 🔑' : '미저장 🔓'}</td>
                </tr>
            </table>
        </div>
    `).join('');
}

function escHtml(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

async function applyCredentialTester(id) {
    try {
        const res = await fetch(`/api/credentials/${id}`);
        if (!res.ok) return alert('불러오기 실패');
        const c = await res.json();

        // 환경 선택
        const $env = document.getElementById('envSelect');
        if ($env) { $env.value = c.environment; $env.dispatchEvent(new Event('change')); }
        if (c.environment === 'custom' && c.custom_url) {
            const $cu = document.getElementById('customDomainInput');
            if ($cu) $cu.value = c.custom_url;
        }
        // 인증 필드
        const $apiKey = document.getElementById('apiKey');
        const $userId = document.getElementById('userId');
        const $secretKey = document.getElementById('secretKey');
        if ($apiKey) $apiKey.value = c.api_key;
        if ($userId) $userId.value = c.eform_user_id;

        // 인증 방식 탭 전환
        const methodTab = document.querySelector(`[data-method="${c.secret_method}"]`);
        if (methodTab) methodTab.click();

        if (c.secret_key) {
            if ($secretKey) $secretKey.value = c.secret_key;
            showToast(`"${c.name}" 인증 정보를 불러왔습니다.`);
        } else {
            if ($secretKey) $secretKey.value = '';
            showToast(`"${c.name}" 불러오기 완료  비밀 키를 직접 입력해주세요.`);
        }

        closeCredentialLoadModal();
    } catch (e) {
        alert('불러오기 중 오류가 발생했습니다.');
    }
}

function showAuthRequiredModal() {
    const loginBtn = document.getElementById('authRequiredLoginBtn');
    if (loginBtn) {
        loginBtn.href = '/auth/login.html?next=' + encodeURIComponent(window.location.pathname);
    }
    document.getElementById('authRequiredModal').style.display = 'flex';
}

function closeAuthRequiredModal() {
    document.getElementById('authRequiredModal').style.display = 'none';
}

async function refreshAuthUser() {
    try {
        const r = await fetch('/api/me');
        const data = await r.json();
        state.authUser = (data && data.authenticated !== false && data.username) ? data : null;
    } catch (e) {
        state.authUser = null;
    }
    return state.authUser;
}

async function ensureCredentialAuth() {
    if (state.authUser) return true;
    await refreshAuthUser();
    return !!state.authUser;
}

async function openCredentialLoadModal() {
    if (!await ensureCredentialAuth()) { showAuthRequiredModal(); return; }
    await loadCredentialList();
    document.getElementById('credentialLoadModal').style.display = 'flex';
}

function closeCredentialLoadModal() {
    document.getElementById('credentialLoadModal').style.display = 'none';
}

async function openCredentialSaveModal() {
    if (!await ensureCredentialAuth()) { showAuthRequiredModal(); return; }
    const nameInput = document.getElementById('credentialSaveNameInput');
    if (nameInput) nameInput.value = '';

    const apiKeyVal = document.getElementById('apiKey')?.value || '';
    const userIdVal = document.getElementById('userId')?.value || '';
    const secretKeyVal = document.getElementById('secretKey')?.value || '';
    const el = document.getElementById('credentialSaveApiKey');
    if (el) el.value = apiKeyVal;
    const el2 = document.getElementById('credentialSaveUserId');
    if (el2) el2.value = userIdVal;
    const el3 = document.getElementById('credentialSaveSecretKey');
    if (el3) { el3.value = secretKeyVal; el3.type = 'password'; }
    const toggleBtn = el3?.nextElementSibling;
    if (toggleBtn) toggleBtn.textContent = '표시';

    const cb = document.getElementById('saveSecretKey');
    if (cb) cb.checked = false;
    document.getElementById('credentialSaveModal').style.display = 'flex';
    setTimeout(() => nameInput && nameInput.focus(), 50);
}

function closeCredentialSaveModal() {
    document.getElementById('credentialSaveModal').style.display = 'none';
}

async function confirmCredentialSave() {
    const name = document.getElementById('credentialSaveNameInput')?.value.trim();
    if (!name) {
        document.getElementById('credentialSaveNameInput')?.focus();
        return;
    }

    const env = document.getElementById('envSelect')?.value || 'op_saas';
    const apiKey = document.getElementById('credentialSaveApiKey')?.value.trim() || '';
    const eformUserId = document.getElementById('credentialSaveUserId')?.value.trim() || '';
    const activeTab = document.querySelector('.auth-method-tab.active,[data-method].active');
    const secretMethod = activeTab?.dataset?.method || state.authMethod || 'signature';
    const saveSecret = document.getElementById('saveSecretKey')?.checked;
    const secretKey = saveSecret ? (document.getElementById('credentialSaveSecretKey')?.value.trim() || null) : null;

    if (!apiKey || !eformUserId) {
        alert('API Key와 User ID를 입력해주세요.');
        return;
    }

    const body = {
        name,
        environment: env,
        custom_url: env === 'custom' ? (document.getElementById('customDomainInput')?.value.trim() || null) : null,
        api_key: apiKey,
        eform_user_id: eformUserId,
        secret_method: secretMethod,
        secret_key: secretKey,
    };

    try {
        const res = await fetch('/api/credentials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        if (!res.ok) {
            const e = await res.json().catch(() => ({}));
            alert('저장 실패: ' + (e.error?.message || res.status));
            return;
        }
        closeCredentialSaveModal();
        showToast(`"${name}" 인증 정보가 저장되었습니다.`);
    } catch (e) {
        alert('저장 중 오류가 발생했습니다.');
    }
}

async function deleteCredentialTester(id) {
    if (!confirm('이 인증 정보를 삭제하시겠습니까?')) return;
    try {
        const res = await fetch(`/api/credentials/${id}`, { method: 'DELETE' });
        if (!res.ok) return alert('삭제 실패');
        await loadCredentialList();
    } catch (e) {
        alert('삭제 중 오류가 발생했습니다.');
    }
}
