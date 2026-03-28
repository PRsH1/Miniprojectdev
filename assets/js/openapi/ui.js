// ──────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ──────────────────────────────────────────────────────────────────────────
let currentViewMode = 'group';

function buildSidebar(filter = '') {
    const $list = $('#sidebarList').empty();
    const q = filter.toLowerCase();
    const filtered = q
        ? API_LIST.filter(ep => ep.name.toLowerCase().includes(q) || ep.path.toLowerCase().includes(q) || (ep.opaCode || '').toLowerCase().includes(q))
        : API_LIST;

    if (currentViewMode === 'group') {
        const groups = {};
        filtered.forEach(ep => {
            if (!groups[ep.group]) groups[ep.group] = { icon: ep.groupIcon, items: [] };
            groups[ep.group].items.push(ep);
        });
        Object.entries(groups).forEach(([groupName, { icon, items }]) => {
            _appendGroup($list, groupName, icon, items);
        });

    } else if (currentViewMode === 'code') {
        const sorted = [...filtered].sort((a, b) => {
            const na = a.opaCode ? parseInt(a.opaCode.replace('OPA2_', ''), 10) : 99999;
            const nb = b.opaCode ? parseInt(b.opaCode.replace('OPA2_', ''), 10) : 99999;
            return na - nb;
        });
        sorted.forEach(ep => {
            const opaBadge = ep.opaCode ? `<span class="opa-code">${ep.opaCode}</span>` : '';
            const $item = $(`
                <div class="endpoint-item endpoint-item--flat" data-id="${ep.id}">
                    ${methodBadge(ep.method)}
                    ${opaBadge}
                    <span class="ep-name">${ep.name}</span>
                </div>`);
            $item.on('click', () => selectEndpoint(ep.id));
            $list.append($item);
        });

    } else if (currentViewMode === 'method') {
        const methodOrder = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
        const methodIcon  = { GET: 'fa-magnifying-glass', POST: 'fa-paper-plane', PUT: 'fa-pen', PATCH: 'fa-pen-nib', DELETE: 'fa-trash' };
        const groups = {};
        filtered.forEach(ep => {
            if (!groups[ep.method]) groups[ep.method] = [];
            groups[ep.method].push(ep);
        });
        [...methodOrder, ...Object.keys(groups).filter(m => !methodOrder.includes(m))].forEach(method => {
            if (!groups[method]?.length) return;
            _appendGroup($list, method, methodIcon[method] || 'fa-circle', groups[method]);
        });
    }

    // 선택된 항목 하이라이트 복원
    if (state.currentEndpoint) {
        $(`.endpoint-item[data-id="${state.currentEndpoint.id}"]`).addClass('active');
    }
}

function _appendGroup($list, groupName, icon, items) {
    const groupId = 'group-' + groupName.replace(/\s+/g, '-');
    const $group = $('<div class="api-group">');
    const $header = $(`
        <div class="api-group-header" data-group="${groupId}">
            <i class="fa-solid ${icon} fa-xs"></i>
            ${groupName}
            <i class="fa-solid fa-chevron-down chevron fa-xs"></i>
        </div>`);
    const $endpoints = $(`<div class="api-group-endpoints" id="${groupId}">`);
    items.forEach(ep => {
        const opaBadge = ep.opaCode ? `<span class="opa-code">${ep.opaCode}</span>` : '';
        const $item = $(`
            <div class="endpoint-item" data-id="${ep.id}">
                ${methodBadge(ep.method)}
                ${opaBadge}
                <span class="ep-name">${ep.name}</span>
            </div>`);
        $item.on('click', () => selectEndpoint(ep.id));
        $endpoints.append($item);
    });
    $header.on('click', function() {
        $(this).toggleClass('collapsed');
        $endpoints.toggleClass('hidden');
    });
    $group.append($header, $endpoints);
    $list.append($group);
}

function selectEndpoint(id) {
    const ep = API_LIST.find(e => e.id === id);
    if (!ep) return;

    // 이전 엔드포인트 응답 저장
    if (state.currentEndpoint) {
        saveResponseState(state.currentEndpoint.id);
    }

    state.currentEndpoint = ep;

    // Sidebar highlight
    $('.endpoint-item').removeClass('active');
    $(`.endpoint-item[data-id="${id}"]`).addClass('active');

    // 모바일: API 선택 후 사이드바 자동 닫기
    if (window.innerWidth <= 768) {
        $('#sidebar').removeClass('mobile-open');
        $('#sidebarBackdrop').removeClass('open');
        $('#btnMenu i').removeClass('fa-xmark').addClass('fa-bars');
    }

    // Show request area
    $('#emptyState').hide();
    $('#requestArea').css('display', 'flex');

    // Method & URL
    $('#methodSelect').val(ep.method);
    updateMethodStyle();
    $('#requestDesc').text(ep.description || '');

    // Build params table first, then update URL (order matters)
    buildParamsTable(ep);
    updateUrlPreview();

    // Default body
    if (ep.defaultBody && ['POST','PUT','PATCH','DELETE'].includes(ep.method)) {
        $('#bodyEditor').val(JSON.stringify(ep.defaultBody, null, 2));
    } else {
        $('#bodyEditor').val('');
    }

    // 탭 자동 전환: Path 파라미터 있으면 Path → Body 있으면 Body → 기본 Query
    if (ep.pathParams && ep.pathParams.length > 0) {
        $('[data-tab="path"]').click();
    } else if (ep.defaultBody && ['POST','PUT','PATCH','DELETE'].includes(ep.method)) {
        $('[data-tab="body"]').click();
    } else {
        $('[data-tab="query"]').click();
    }

    // Headers (auto-set Authorization if requiresAuth)
    buildHeadersTable(ep);

    updateParamsBadge();
    updateHeadersBadge();

    // 현재 엔드포인트 응답 복원 (없으면 초기화)
    $('#exampleResponsePanel').hide();
    restoreResponseState(ep.id);
    updateExampleResponseBtn(ep);
}

// ──────────────────────────────────────────────────────────────────────────
// URL PREVIEW
// ──────────────────────────────────────────────────────────────────────────
function updateUrlPreview() {
    const ep = state.currentEndpoint;
    if (!ep) return;
    const base = (ep.saasBaseUrl && $('#envSelect').val() === 'op_saas') ? ep.saasBaseUrl : getBaseUrl();
    let path = ep.path;

    // Fill path params from pathBody
    $('#pathBody tr').each(function() {
        const key = $(this).find('.param-key').val();
        const val = $(this).find('.param-val').val();
        if (val) path = path.replace(`{${key}}`, val);
    });

    // Build query string from queryBody
    const qp = [];
    $('#queryBody tr').each(function() {
        const enabled = $(this).find('.param-enabled').is(':checked');
        const key = $(this).find('.param-key').val();
        const val = $(this).find('.param-val').val();
        // URL 표시용: 공백·제어문자 등 필수 인코딩만 적용, ,/@/: 등은 그대로 표시
        const encodeForDisplay = v => encodeURIComponent(v).replace(/%2C/gi, ',').replace(/%40/gi, '@').replace(/%3A/gi, ':').replace(/%2F/gi, '/');
        if (enabled && key && val) qp.push(`${encodeForDisplay(key)}=${encodeForDisplay(val)}`);
    });

    let url = base + path;
    if (qp.length) url += '?' + qp.join('&');
    $('#urlInput').val(url);
}

// ──────────────────────────────────────────────────────────────────────────
// PARAMS TABLE
// ──────────────────────────────────────────────────────────────────────────
function buildParamsTable(ep) {
    // Path params
    const $pathTbody = $('#pathBody').empty();
    const pathParams = ep.pathParams || [];
    pathParams.forEach(p => {
        $pathTbody.append(makePathRow(p.key, p.default || '', p.description, p.required));
    });
    $('#pathEmptyMsg').toggle(pathParams.length === 0);

    // Query params
    const $queryTbody = $('#queryBody').empty();
    (ep.queryParams || []).forEach(p => {
        $queryTbody.append(makeQueryRow(p.key, p.default || '', p.description, p.required, true));
    });
}

function makePathRow(key = '', value = '', desc = '', required = false) {
    const $tr = $(`<tr>
        <td class="col-key">
            <input class="kv-input param-key" value="${key}" readonly>
            ${desc ? `<div class="param-desc">${desc}${required ? '<span class="required-star">*</span>' : ''}</div>` : ''}
        </td>
        <td class="col-value"><input class="kv-input param-val" value="${value}" placeholder="값 입력"></td>
    </tr>`);
    $tr.find('.param-val').on('input', () => { updateUrlPreview(); updateParamsBadge(); });
    return $tr;
}

function makeQueryRow(key = '', value = '', desc = '', required = false, enabled = true, userAdded = false) {
    const checkedAttr = enabled ? 'checked' : '';
    const keyField = userAdded
        ? `<input class="kv-input param-key" value="${key}" placeholder="키">`
        : `<input class="kv-input param-key" value="${key}" readonly>`;
    const deleteBtn = userAdded ? `<button class="btn-icon" onclick="removeRow(this)" title="삭제"><i class="fa-solid fa-xmark"></i></button>` : '';

    const $tr = $(`<tr data-user-added="${userAdded}">
        <td class="col-check"><input type="checkbox" class="param-enabled" ${checkedAttr}></td>
        <td class="col-key">
            ${keyField}
            ${desc ? `<div class="param-desc">${desc}${required ? '<span class="required-star">*</span>' : ''}</div>` : ''}
        </td>
        <td class="col-value"><input class="kv-input param-val" value="${value}" placeholder="값"></td>
        <td class="col-action">${deleteBtn}</td>
    </tr>`);

    $tr.find('.param-val, .param-key').on('input', () => { updateUrlPreview(); updateParamsBadge(); });
    $tr.find('.param-enabled').on('change', () => { updateUrlPreview(); updateParamsBadge(); });
    return $tr;
}

function addQueryRow() {
    $('#queryBody').append(makeQueryRow('', '', '', false, true, true));
    updateParamsBadge();
}

function removeRow(btn) {
    $(btn).closest('tr').remove();
    updateUrlPreview();
    updateParamsBadge();
}

function updateParamsBadge() {
    // Path 배지: 값 입력 여부와 무관하게 존재하는 파라미터 수
    $('#pathBadge').text($('#pathBody tr').length);

    let queryCount = 0;
    $('#queryBody tr').each(function() {
        if ($(this).find('.param-enabled').is(':checked') && $(this).find('.param-key').val()) queryCount++;
    });
    $('#queryBadge').text(queryCount);
}

// ──────────────────────────────────────────────────────────────────────────
// HEADERS TABLE
// ──────────────────────────────────────────────────────────────────────────
function buildHeadersTable(ep) {
    const $tbody = $('#headersBody').empty();
    // Always add Content-Type
    $tbody.append(makeHeaderRow('Content-Type', 'application/json', false));
    // API별 defaultHeaders (e.g. OPA2_001)
    if (ep && ep.defaultHeaders) {
        ep.defaultHeaders.forEach(h => {
            const val = h.autoFill ? h.autoFill() : (h.value || '');
            $tbody.append(makeHeaderRow(h.key, val, false, h.description));
        });
    }
    // Add Authorization if required
    if (ep && ep.requiresAuth) {
        const token = state.accessToken ? `Bearer ${state.accessToken}` : '';
        $tbody.append(makeHeaderRow('Authorization', token, false));
    }
    updateHeadersBadge();
}

function makeHeaderRow(key = '', value = '', userAdded = true, description = '') {
    const readonlyKey = !userAdded ? 'readonly' : '';
    const deleteBtn = userAdded ? `<button class="btn-icon" onclick="removeRow(this)" title="삭제"><i class="fa-solid fa-xmark"></i></button>` : '';
    const descHtml = description ? `<div class="param-desc">${description}</div>` : '';
    const $tr = $(`<tr data-user-added="${userAdded}">
        <td class="col-check"><input type="checkbox" class="header-enabled" checked></td>
        <td class="col-key">
            <input class="kv-input header-key" value="${key}" ${readonlyKey} placeholder="키">
            ${descHtml}
        </td>
        <td class="col-value"><input class="kv-input header-val" value="${value}" placeholder="값"></td>
        <td class="col-action">${deleteBtn}</td>
    </tr>`);
    $tr.find('.header-val, .header-key').on('input', updateHeadersBadge);
    $tr.find('.header-enabled').on('change', updateHeadersBadge);
    return $tr;
}

function addHeaderRow() {
    $('#headersBody').append(makeHeaderRow());
    updateHeadersBadge();
}

function updateHeadersBadge() {
    let count = 0;
    $('#headersBody tr').each(function() {
        if ($(this).find('.header-enabled').is(':checked') && $(this).find('.header-key').val()) count++;
    });
    $('#headersBadge').text(count);
}

// ──────────────────────────────────────────────────────────────────────────
// BODY EDITOR
// ──────────────────────────────────────────────────────────────────────────
function formatBody() {
    const raw = $('#bodyEditor').val().trim();
    if (!raw) return;
    try {
        $('#bodyEditor').val(JSON.stringify(JSON.parse(raw), null, 2));
    } catch { showToast('JSON 형식이 올바르지 않습니다', 2000); }
}

function clearBody() {
    $('#bodyEditor').val('');
}

// ──────────────────────────────────────────────────────────────────────────
// METHOD STYLE
// ──────────────────────────────────────────────────────────────────────────
function updateMethodStyle() {
    const m = $('#methodSelect').val().toLowerCase();
    const el = $('#methodSelect')[0];
    el.className = 'method-badge-select method-' + m;
}

// ──────────────────────────────────────────────────────────────────────────
// AUTH
// ──────────────────────────────────────────────────────────────────────────
async function getAccessToken() {
    const execTime = Date.now();
    const apiKey = $('#apiKey').val().trim();
    const secretKey = $('#secretKey').val().trim();
    const memberId = $('#userId').val().trim();
    const domain = getBaseUrl();

    if (!domain) { showToast('환경을 선택하거나 도메인을 입력해주세요'); return; }
    if (!apiKey || !secretKey || !memberId) { showToast('API Key, 비밀 키, User ID를 모두 입력해주세요'); return; }

    $('#btnGetToken').prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin fa-sm"></i> 발급 중...');

    let signature;
    if (state.authMethod === 'signature') {
        try {
            const keyObj = KEYUTIL.getKeyFromPlainPrivatePKCS8Hex(secretKey);
            const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
            sig.init(keyObj);
            sig.updateString(execTime.toString());
            signature = sig.sign();
        } catch (e) {
            showToast('서명 생성 오류: ' + e.message, 3000);
            $('#btnGetToken').prop('disabled', false).html('<i class="fa-solid fa-rotate fa-sm"></i> 토큰 발급');
            return;
        }
    } else {
        signature = 'Bearer ' + secretKey;
    }

    const url = `${domain}/v2.0/api_auth/access_token`;
    try {
        const res = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=UTF-8',
                'Authorization': 'Bearer ' + btoa(apiKey),
                'eformsign_signature': signature
            },
            body: JSON.stringify({ execution_time: execTime, member_id: memberId })
        });
        const data = await res.json();
        if (data.oauth_token && data.oauth_token.access_token) {
            state.accessToken = data.oauth_token.access_token;
            updateAuthUI();
            // Auto-update Authorization header in current request if open
            $('#headersBody tr').each(function() {
                const key = $(this).find('.header-key').val();
                if (key === 'Authorization') {
                    $(this).find('.header-val').val(`Bearer ${state.accessToken}`);
                }
            });
            showToast('토큰이 발급되었습니다');
        } else {
            showToast('토큰 발급 실패: ' + JSON.stringify(data), 3000);
        }
    } catch (e) {
        showToast('요청 오류: ' + e.message, 3000);
    }
    $('#btnGetToken').prop('disabled', false).html('<i class="fa-solid fa-rotate fa-sm"></i> 토큰 발급');
}

function updateAuthUI() {
    if (state.accessToken) {
        const short = state.accessToken.substring(0, 40) + '...';
        $('#tokenDisplay').text(short).addClass('has-token');
        $('#authStatusBadge').text('토큰 보유').removeClass('no-token').addClass('has-token');
    } else {
        $('#tokenDisplay').text('토큰을 발급받아 주세요').removeClass('has-token');
        $('#authStatusBadge').text('토큰 없음').removeClass('has-token').addClass('no-token');
    }
}

// ──────────────────────────────────────────────────────────────────────────
// SEND REQUEST
// ──────────────────────────────────────────────────────────────────────────
async function sendRequest(forceDownload = false) {
    const url = $('#urlInput').val().trim();
    const method = $('#methodSelect').val();
    if (!url) { showToast('URL이 비어있습니다'); return; }
    $('#sendDropdownMenu').removeClass('open');

    // Build headers
    const headers = {};
    $('#headersBody tr').each(function() {
        if ($(this).find('.header-enabled').is(':checked')) {
            const k = $(this).find('.header-key').val().trim();
            const v = $(this).find('.header-val').val().trim();
            if (k) headers[k] = v;
        }
    });

    // Build body
    let body = undefined;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const raw = $('#bodyEditor').val().trim();
        if (raw) {
            try { body = raw; JSON.parse(raw); } // validate
            catch { showToast('Body의 JSON 형식이 올바르지 않습니다'); return; }
        }
    }

    $('#btnSend').prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin fa-sm"></i>');
    clearResponse();
    $('#responsePlaceholder').show().find('p').text('요청 전송 중...');

    const startTime = Date.now();
    try {
        const opts = { method, headers };
        if (body !== undefined) opts.body = body;

        const res = await fetch(url, opts);
        const elapsed = Date.now() - startTime;
        const contentType = res.headers.get('Content-Type') || '';

        // Status badge (공통)
        const statusClass = res.status >= 500 ? 'status-5xx'
            : res.status >= 400 ? 'status-4xx'
            : res.status >= 300 ? 'status-3xx' : 'status-2xx';
        $('#statusBadge').text(`${res.status} ${res.statusText}`).attr('class', `status-badge ${statusClass}`).show();
        $('#responseMeta').show();
        $('#responseTime').text(`${elapsed}ms`);
        $('#btnClearResponse').show();
        $('#responsePlaceholder').hide();

        // 파일 다운로드 처리: PDF/ZIP 응답이거나 Send and Download 선택 시
        const isFileResponse = res.ok && (contentType.includes('application/pdf') || contentType.includes('application/zip'));
        if (isFileResponse || (forceDownload && res.ok)) {
            const blob = await res.blob();

            // 파일 확장자 결정
            let ext = '.bin';
            if (contentType.includes('application/pdf')) ext = '.pdf';
            else if (contentType.includes('application/zip')) ext = '.zip';
            else if (contentType.includes('application/json')) ext = '.json';
            else if (contentType.includes('text/')) ext = '.txt';
            const isZip = ext === '.zip';

            // 파일명 결정: Content-Disposition → document_id → 기본값
            let filename = 'download' + ext;
            const disposition = res.headers.get('Content-Disposition') || '';
            // RFC 5987: filename*=UTF-8''encoded-name 우선 처리
            const rfc5987Match = disposition.match(/filename\*\s*=\s*UTF-8''([^;\s]+)/i);
            const plainMatch   = disposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;\s]+))/i);
            if (rfc5987Match) {
                filename = decodeURIComponent(rfc5987Match[1]) || filename;
            } else if (plainMatch) {
                filename = (plainMatch[1] || plainMatch[2] || '').trim() || filename;
            } else {
                const docId = $('#pathBody tr').first().find('.param-val').val();
                if (docId) filename = docId + ext;
            }

            // 다운로드 트리거
            const objectUrl = URL.createObjectURL(blob);
            const $a = $('<a>').attr({ href: objectUrl, download: filename }).appendTo('body');
            $a[0].click();
            $a.remove();
            URL.revokeObjectURL(objectUrl);

            $('#responseSize').text(formatBytes(blob.size));
            $('#responseBody').show().text(
                `파일 다운로드 완료\n` +
                `파일명: ${filename}\n` +
                `형식: ${isZip ? (state.currentEndpoint && state.currentEndpoint.id === 'doc_download_attach' ? 'ZIP (첨부 파일)' : 'ZIP (문서 + 감사추적 파일)') : contentType || ext}\n` +
                `크기: ${formatBytes(blob.size)}\n` +
                `Content-Type: ${contentType}`
            );
            showToast(`${filename} 다운로드 완료`);

        } else {
            // 일반 텍스트 / JSON 응답 처리
            const text = await res.text();
            let parsed;
            try { parsed = JSON.parse(text); } catch { parsed = null; }

            $('#responseSize').text(formatBytes(text.length));
            $('#btnCopyResponse').show();

            const $pre = $('#responseBody').show();
            if (parsed !== null) {
                $pre.html(formatJsonSyntax(JSON.stringify(parsed, null, 2)));
            } else {
                $pre.text(text || '(응답 없음)');
            }
        }

    } catch (e) {
        $('#responsePlaceholder').show().find('p').text('요청 실패: ' + e.message);
        showToast('요청 실패: ' + e.message, 3000);
    }

    $('#btnSend').prop('disabled', false).html('<i class="fa-solid fa-paper-plane fa-sm"></i> Send');
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// ──────────────────────────────────────────────────────────────────────────
// RESPONSE UTILITIES
// ──────────────────────────────────────────────────────────────────────────
function copyResponse() {
    const text = $('#responseBody').text();
    navigator.clipboard.writeText(text).then(() => showToast('응답이 복사되었습니다'));
}

function clearResponse() {
    $('#statusBadge').hide();
    $('#responseMeta').hide();
    $('#btnCopyResponse').hide();
    $('#btnClearResponse').hide();
    $('#responseBody').hide().html('');
    $('#exampleResponsePanel').hide();
    $('#responsePlaceholder').show().find('p').text('요청을 보내면 응답이 여기에 표시됩니다');
    if (state.currentEndpoint) {
        delete responseCache[state.currentEndpoint.id];
    }
}

function toggleExampleResponse() {
    const $panel = $('#exampleResponsePanel');
    const $placeholder = $('#responsePlaceholder');
    const $body = $('#responseBody');

    if ($panel.is(':visible')) {
        $panel.hide();
        if (!$body.is(':visible')) $placeholder.show();
    } else {
        $placeholder.hide();
        $panel.show();
    }
}

function updateExampleResponseBtn(ep) {
    if (ep && ep.exampleResponse) {
        const ex = ep.exampleResponse;
        let html = '';

        if (ex.success) {
            html += `
                <div style="padding:6px 20px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;font-size:0.78rem;font-weight:700;color:#15803d;display:flex;align-items:center;gap:5px;">
                    <i class="fa-solid fa-circle-check fa-xs"></i> 성공 응답 (200)
                </div>
                <pre class="response-pre">${formatJsonSyntax(JSON.stringify(ex.success, null, 2))}</pre>`;
        }

        if (ex.successEmpty) {
            html += `
                <div style="padding:6px 20px;background:#f0fdf4;border-bottom:1px solid #bbf7d0;font-size:0.78rem;font-weight:700;color:#15803d;display:flex;align-items:center;gap:5px;">
                    <i class="fa-solid fa-circle-check fa-xs"></i> 성공 응답 — 조회 결과 없음 (200)
                </div>
                <pre class="response-pre">${formatJsonSyntax(JSON.stringify(ex.successEmpty, null, 2))}</pre>`;
        }

        if (ex.errors && ex.errors.length) {
            ex.errors.forEach(err => {
                html += `
                    <div style="padding:6px 20px;background:#fef2f2;border-top:1px solid #fecaca;border-bottom:1px solid #fecaca;font-size:0.78rem;font-weight:700;color:#b91c1c;display:flex;align-items:center;gap:5px;">
                        <i class="fa-solid fa-circle-xmark fa-xs"></i> 실패 응답 — ${err.title}
                    </div>
                    <pre class="response-pre">${formatJsonSyntax(JSON.stringify(err.body, null, 2))}</pre>`;
            });
        }

        $('#exampleResponseBody').html(html);
        $('#btnExampleResponse').show();
    } else {
        $('#btnExampleResponse').hide();
        $('#exampleResponsePanel').hide();
    }
}

// ──────────────────────────────────────────────────────────────────────────
// CODE SNIPPET
// ──────────────────────────────────────────────────────────────────────────
let currentLang = 'curl';

function showCodeModal() {
    if (!state.currentEndpoint) { showToast('API를 먼저 선택해주세요'); return; }
    currentLang = 'curl';
    $('#langTabs .lang-tab').removeClass('active');
    $('#langTabs .lang-tab[data-lang="curl"]').addClass('active');
    renderSnippet();
    $('#codeModal').addClass('open');
}

function closeCodeModal() {
    $('#codeModal').removeClass('open');
}

// ──────────────────────────────────────────────────────────────────────────
// GUIDE MODAL
// ──────────────────────────────────────────────────────────────────────────
function openGuide() {
    $('#guideModal').addClass('open');
}

function closeGuide() {
    $('#guideModal').removeClass('open');
}

function closeGuideOutside(e) {
    if ($(e.target).is('#guideModal')) closeGuide();
}

function copyCodeSnippet() {
    const text = $('#codeSnippetPre').text();
    navigator.clipboard.writeText(text).then(() => showToast('코드가 복사되었습니다'));
}

function renderSnippet() {
    const url    = $('#urlInput').val().trim();
    const method = $('#methodSelect').val();

    // 활성화된 헤더 수집
    const headers = {};
    $('#headersBody tr').each(function() {
        if ($(this).find('.header-enabled').is(':checked')) {
            const k = $(this).find('.header-key').val().trim();
            const v = $(this).find('.header-val').val().trim();
            if (k) headers[k] = v;
        }
    });

    // Body (POST/PUT/PATCH)
    const bodyRaw = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)
        ? $('#bodyEditor').val().trim() : '';

    let snippet = '';
    switch (currentLang) {
        case 'curl':    snippet = snippetCurl(url, method, headers, bodyRaw);    break;
        case 'fetch':   snippet = snippetFetch(url, method, headers, bodyRaw);   break;
        case 'jquery':  snippet = snippetJQuery(url, method, headers, bodyRaw);  break;
        case 'python':  snippet = snippetPython(url, method, headers, bodyRaw);  break;
        case 'java':    snippet = snippetJava(url, method, headers, bodyRaw);    break;
    }
    $('#codeSnippetPre').text(snippet);
}

function snippetCurl(url, method, headers, body) {
    const lines = [`curl --location --request ${method} '${url}'`];
    Object.entries(headers).forEach(([k, v]) => {
        lines.push(`  --header '${k}: ${v}'`);
    });
    if (body) {
        lines.push(`  --data-raw '${body}'`);
    }
    return lines.join(' \\\n');
}

function snippetFetch(url, method, headers, body) {
    const headersJson = JSON.stringify(headers, null, 2).replace(/^/gm, '  ');
    let code = `const response = await fetch('${url}', {\n`;
    code += `  method: '${method}',\n`;
    code += `  headers: ${headersJson}`;
    if (body) {
        code += `,\n  body: \`${body}\``;
    }
    code += `\n});\n\n`;
    code += `const data = await response.json();\nconsole.log(data);`;
    return code;
}

function snippetJQuery(url, method, headers, body) {
    // Content-Type은 jQuery contentType 옵션으로 분리
    const ct = headers['Content-Type'] || 'application/json';
    const otherHeaders = Object.fromEntries(
        Object.entries(headers).filter(([k]) => k !== 'Content-Type')
    );
    const headersJson = JSON.stringify(otherHeaders, null, 4).replace(/^/gm, '    ');

    let code = `$.ajax({\n`;
    code += `    url: '${url}',\n`;
    code += `    method: '${method}',\n`;
    code += `    contentType: '${ct}',\n`;
    if (Object.keys(otherHeaders).length) {
        code += `    headers: ${headersJson},\n`;
    }
    if (body) {
        code += `    data: JSON.stringify(${body}),\n`;
    }
    code += `    success: function(data) {\n        console.log(data);\n    },\n`;
    code += `    error: function(err) {\n        console.error(err);\n    }\n`;
    code += `});`;
    return code;
}

function snippetPython(url, method, headers, body) {
    const headersRepr = JSON.stringify(headers, null, 4).replace(/^/gm, '    ').trimStart();
    let code = `import requests\n\n`;
    code += `url = "${url}"\n\n`;
    code += `headers = ${headersRepr}\n\n`;
    if (body) {
        code += `payload = ${body}\n\n`;
        code += `response = requests.${method.toLowerCase()}(url, headers=headers, data=payload)\n`;
    } else {
        code += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
    }
    code += `print(response.json())`;
    return code;
}

function snippetJava(url, method, headers, body) {
    let code = `import java.net.URI;\n`;
    code += `import java.net.http.HttpClient;\n`;
    code += `import java.net.http.HttpRequest;\n`;
    code += `import java.net.http.HttpResponse;\n\n`;
    code += `HttpClient client = HttpClient.newHttpClient();\n\n`;

    // 헤더 빌더 체인
    const headerLines = Object.entries(headers)
        .map(([k, v]) => `        .header("${k}", "${v}")`).join('\n');

    code += `HttpRequest request = HttpRequest.newBuilder()\n`;
    code += `        .uri(URI.create("${url}"))\n`;
    if (headerLines) code += `${headerLines}\n`;

    if (body) {
        code += `        .method("${method}", HttpRequest.BodyPublishers.ofString("""\n`;
        code += `                ${body.replace(/\n/g, '\n                ')}\n`;
        code += `                """))\n`;
    } else {
        code += `        .method("${method}", HttpRequest.BodyPublishers.noBody())\n`;
    }
    code += `        .build();\n\n`;
    code += `HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());\n`;
    code += `System.out.println(response.body());`;
    return code;
}

// 언어탭 클릭
$(document).on('click', '.lang-tab', function() {
    currentLang = $(this).data('lang');
    $('.lang-tab').removeClass('active');
    $(this).addClass('active');
    renderSnippet();
});

// 모달 바깥 클릭 시 닫기
$(document).on('click', '#codeModal', function(e) {
    if ($(e.target).is('#codeModal')) closeCodeModal();
});
