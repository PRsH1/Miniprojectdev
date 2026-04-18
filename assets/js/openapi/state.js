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
        renderCredentialListTester(list);
    } catch (e) {}
}

function renderCredentialListTester(list) {
    const wrap = document.getElementById('credentialListWrap');
    const container = document.getElementById('credentialList');
    if (!wrap || !container) return;

    if (!list.length) { wrap.style.display = 'none'; return; }

    wrap.style.display = '';
    const envMap = { op_saas: '운영(SaaS)', csap: '공공(CSAP)', custom: '직접 입력' };
    container.innerHTML = list.map(c => `
        <div style="display:flex;align-items:center;gap:6px;padding:6px 10px;background:var(--bg-elevated,#f5f5f5);border-radius:6px;font-size:12px;">
            <span style="flex:1;">
                <strong>${escHtml(c.name)}</strong>
                <span style="color:var(--text-muted,#888);margin-left:5px;">${envMap[c.environment] || c.environment}</span>
                <span style="margin-left:3px;" title="${c.has_secret_key ? '비밀 키 저장됨' : '비밀 키 미저장'}">${c.has_secret_key ? '🔑' : '🔓'}</span>
            </span>
            <button onclick="applyCredentialTester('${c.id}')" style="padding:3px 8px;font-size:11px;background:var(--primary,#1a73e8);color:#fff;border:none;border-radius:4px;cursor:pointer;">불러오기</button>
            <button onclick="deleteCredentialTester('${c.id}')" style="padding:3px 6px;font-size:11px;background:none;border:1px solid var(--border,#ccc);border-radius:4px;cursor:pointer;color:var(--danger,#d32f2f);">삭제</button>
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
        } else {
            if ($secretKey) $secretKey.value = '';
            alert(`"${c.name}" 인증 정보를 불러왔습니다.\n비밀 키는 저장되지 않았으므로 직접 입력해주세요.`);
        }
    } catch (e) {
        alert('불러오기 중 오류가 발생했습니다.');
    }
}

async function saveCredential() {
    const name = prompt('저장할 이름을 입력하세요.\n예: 홍길동 - 운영환경');
    if (!name || !name.trim()) return;

    const env = document.getElementById('envSelect')?.value || 'op_saas';
    const apiKey = document.getElementById('apiKey')?.value.trim() || '';
    const eformUserId = document.getElementById('userId')?.value.trim() || '';
    // 현재 활성 방식 탭에서 method 추출
    const activeTab = document.querySelector('.auth-method-tab.active,[data-method].active');
    const secretMethod = activeTab?.dataset?.method || state.authMethod || 'signature';
    const saveSecret = document.getElementById('saveSecretKey')?.checked;
    const secretKey = saveSecret ? (document.getElementById('secretKey')?.value.trim() || null) : null;

    if (!apiKey || !eformUserId) return alert('API Key와 User ID를 입력해주세요.');

    const body = {
        name: name.trim(),
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
        if (!res.ok) { const e = await res.json().catch(() => ({})); return alert('저장 실패: ' + (e.error || res.status)); }
        await loadCredentialList();
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
