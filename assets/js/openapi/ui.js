// ──────────────────────────────────────────────────────────────────────────
// SIDEBAR
// ──────────────────────────────────────────────────────────────────────────
let currentViewMode = 'group';

// 펼쳐진 엔드포인트 ID를 기억 — buildSidebar 재호출 후에도 상태 유지
const expandedSaveEndpoints = new Set();

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
            const $wrap = _makeEndpointWrap(ep);
            $wrap.find('.endpoint-item').addClass('endpoint-item--flat');
            $list.append($wrap);
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
    if (state.currentHistoryId) {
        $(`.save-item[data-history-id="${state.currentHistoryId}"]`).addClass('active');
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
        $endpoints.append(_makeEndpointWrap(ep));
    });
    $header.on('click', function() {
        $(this).toggleClass('collapsed');
        $endpoints.toggleClass('hidden');
    });
    $group.append($header, $endpoints);
    $list.append($group);
}

function _makeEndpointWrap(ep) {
    const opaBadge = ep.opaCode ? `<span class="opa-code">${ep.opaCode}</span>` : '';
    const saves = historyByEndpoint(ep.id);
    const hasSaves = saves.length > 0;
    const isExpanded = expandedSaveEndpoints.has(ep.id);

    const $wrap = $('<div class="endpoint-wrap">');

    // 저장 항목이 있을 때만 토글 버튼 추가
    const toggleHtml = hasSaves ? `
        <button class="saves-toggle ${isExpanded ? 'expanded' : ''}" data-ep-id="${ep.id}"
            title="저장된 요청 ${isExpanded ? '접기' : '펼치기'}">
            <span class="saves-count">${saves.length}</span>
            <i class="fa-solid fa-chevron-right fa-xs saves-chevron"></i>
        </button>` : '';

    const $item = $(`
        <div class="endpoint-item" data-id="${ep.id}">
            ${methodBadge(ep.method)}
            ${opaBadge}
            <span class="ep-name">${ep.name}</span>
            ${toggleHtml}
        </div>`);
    $item.on('click', () => selectEndpoint(ep.id));

    // 토글 버튼 클릭은 selectEndpoint와 독립 동작
    if (hasSaves) {
        $item.find('.saves-toggle').on('click', function(e) {
            e.stopPropagation();
            const epId = $(this).data('ep-id');
            if (expandedSaveEndpoints.has(epId)) {
                expandedSaveEndpoints.delete(epId);
            } else {
                expandedSaveEndpoints.add(epId);
            }
            $(this).toggleClass('expanded');
            $wrap.find('.endpoint-saves').slideToggle(150);
        });
    }

    $wrap.append($item);

    // 저장된 요청 하위 항목 (기본 숨김, 펼침 상태면 표시)
    if (hasSaves) {
        const $saves = $('<div class="endpoint-saves">').toggle(isExpanded);
        saves.forEach(entry => {
            const $saveItem = $(`
                <div class="save-item" data-history-id="${escHtml(entry.id)}">
                    <i class="fa-solid fa-floppy-disk fa-xs save-item-icon"></i>
                    <span class="save-item-name">${escHtml(entry.name)}</span>
                    <button class="save-item-delete" data-id="${escHtml(entry.id)}" title="삭제">
                        <i class="fa-solid fa-xmark fa-xs"></i>
                    </button>
                </div>`);

            $saveItem.on('click', function(e) {
                if ($(e.target).closest('.save-item-delete').length) return;
                loadHistoryEntry(entry);
            });

            $saveItem.find('.save-item-delete').on('click', async function(e) {
                e.stopPropagation();
                const deleted = await historyDelete(entry.id);
                if (!deleted) return;
                if (historyByEndpoint(ep.id).length === 0) {
                    expandedSaveEndpoints.delete(ep.id);
                }
                buildSidebar($('#sidebarSearch').val());
                if ($('#sidebarHistoryPanel').is(':visible')) buildHistoryPanel();
            });

            $saves.append($saveItem);
        });
        $wrap.append($saves);
    }

    return $wrap;
}

function debounce(fn, delay) {
    let t;
    return function(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), delay);
    };
}

// options.skipDraft: 저장된 편집 내용(draft)을 복원하지 않고 기본값으로 연다 (저장 항목 불러오기용)
function selectEndpoint(id, options = {}) {
    const ep = API_LIST.find(e => e.id === id);
    if (!ep) return;

    // 보고 있는 API를 다시 클릭한 경우 — 화면은 그대로 두고 진행 중인 요청도 취소하지 않는다 (D-11)
    // (저장 항목 불러오기는 skipDraft로 같은 API도 다시 그려야 하므로 제외)
    if (state.currentEndpoint && state.currentEndpoint.id === id && !options.skipDraft) {
        // API 항목 직접 클릭은 "불러온 저장 항목" 상태를 해제한다 (기존 동작 유지)
        state.currentHistoryId = null;
        $('.save-item').removeClass('active');
        $(`.endpoint-item[data-id="${id}"]`).addClass('active');
        if (window.innerWidth <= 768 && typeof closeMobileSidebar === 'function') closeMobileSidebar();
        return;
    }

    // 다른 API로 옮기면 진행 중인 요청은 취소한다 — 그대로 두면 응답이 새로 연 API 화면에 표시된다
    if (state.inFlight && typeof cancelInFlightRequest === 'function') {
        cancelInFlightRequest('switch');
    }

    // 이전 엔드포인트 응답·편집 내용 저장 (P1-09)
    if (state.currentEndpoint) {
        saveResponseState(state.currentEndpoint.id);
        requestDraftCache[state.currentEndpoint.id] = captureRequestSnapshot();
    }

    state.currentEndpoint = ep;
    state.currentHistoryId = null;

    // Sidebar highlight
    $('.endpoint-item').removeClass('active');
    $(`.endpoint-item[data-id="${id}"]`).addClass('active');
    $('.save-item').removeClass('active');

    // 모바일: API 선택 후 사이드바 자동 닫기
    if (window.innerWidth <= 768) {
        $('#sidebar').removeClass('mobile-open');
        $('#sidebarBackdrop').removeClass('open');
        $('#btnMenu i').removeClass('fa-xmark').addClass('fa-bars');
    }

    // 이전 API의 전송 전 검증 표시 제거
    clearRequestValidation();

    // Show request area
    $('#emptyState').hide();
    $('#requestArea').css('display', 'flex');

    $('#requestDesc').text(ep.description || '');

    // 기본값으로 요청 구성 → 이 API에서 편집하던 내용이 있으면 덮어 복원
    renderEndpointDefaults(ep);
    const draft = options.skipDraft ? null : requestDraftCache[ep.id];
    if (draft) applyRequestSnapshot(draft);

    // 탭 자동 전환: Path 파라미터 있으면 Path → Body 있으면 Body → 기본 Query
    if (ep.pathParams && ep.pathParams.length > 0) {
        $('[data-tab="path"]').click();
    } else if (ep.defaultBody && ['POST','PUT','PATCH','DELETE'].includes(ep.method)) {
        $('[data-tab="body"]').click();
    } else {
        $('[data-tab="query"]').click();
    }

    // 현재 엔드포인트 응답 복원 (없으면 초기화)
    $('#exampleResponsePanel').hide();
    hideResponseNotice();
    restoreResponseState(ep.id);
    updateExampleResponseBtn(ep);

    persistDraftSession();
}

// API 정의의 기본값으로 method·파라미터·Body·헤더를 다시 만든다
function renderEndpointDefaults(ep) {
    $('#methodSelect').val(ep.method);
    updateMethodStyle();

    // Build params table first, then update URL (order matters)
    buildParamsTable(ep);
    updateUrlPreview();

    // Default body
    if (ep.defaultBody && ['POST','PUT','PATCH','DELETE'].includes(ep.method)) {
        $('#bodyEditor').val(JSON.stringify(ep.defaultBody, null, 2));
    } else {
        $('#bodyEditor').val('');
    }
    clearBodyError();

    // Headers (auto-set Authorization if requiresAuth)
    buildHeadersTable(ep);

    updateParamsBadge();
    updateHeadersBadge();
}

// [기본값 복원] — 이 API의 편집 내용(draft)을 버리고 API 정의 기본값으로 되돌린다
function resetRequestToDefault() {
    const ep = state.currentEndpoint;
    if (!ep) return;
    if (!confirm('이 API의 파라미터·헤더·Body 편집 내용을 버리고 기본값으로 되돌릴까요?')) return;
    clearRequestValidation();
    renderEndpointDefaults(ep);
    delete requestDraftCache[ep.id];
    persistDraftSession();
    showToast('기본값으로 되돌렸습니다');
}

// 저장 항목·draft 스냅샷을 현재 화면(기본값으로 만든 상태)에 덮어 적용한다 (P1-09)
//  - path·query·헤더는 행 순서가 아니라 key로 맞춘다. 정의에 없는 key는 사용자 추가 행으로 복원한다
//  - Authorization(requiresAuth API)은 저장 값 대신 현재 발급된 토큰을 유지한다 (P0-08)
//  - 값이 비어 있는 인증 헤더(저장 시 마스킹됨)는 기본값을 유지한다
function applyRequestSnapshot(snap) {
    const ep = state.currentEndpoint;
    if (!snap || !ep) return;

    if (snap.method && $(`#methodSelect option[value="${String(snap.method).replace(/[^A-Z]/gi, '')}"]`).length) {
        $('#methodSelect').val(snap.method);
        updateMethodStyle();
    }

    const savedPath = Array.isArray(snap.pathParams) ? snap.pathParams : [];
    $('#pathBody tr').each(function() {
        const key = $(this).find('.param-key').val();
        const saved = savedPath.find(p => p && p.key === key);
        if (saved) $(this).find('.param-val').val(saved.value == null ? '' : saved.value);
    });

    const savedQuery = (Array.isArray(snap.queryParams) ? snap.queryParams : []).filter(q => q && (q.key || q.value));
    const usedQuery = new Set();
    $('#queryBody tr').each(function() {
        if ($(this).attr('data-user-added') === 'true') return;
        const key = $(this).find('.param-key').val();
        const idx = savedQuery.findIndex((q, i) => !usedQuery.has(i) && q.key === key);
        if (idx < 0) return;
        usedQuery.add(idx);
        $(this).find('.param-enabled').prop('checked', savedQuery[idx].enabled !== false);
        $(this).find('.param-val').val(savedQuery[idx].value == null ? '' : savedQuery[idx].value);
    });
    savedQuery.forEach((q, i) => {
        if (usedQuery.has(i)) return;
        $('#queryBody').append(makeQueryRow(q.key || '', q.value == null ? '' : q.value, '', false, q.enabled !== false, true));
    });

    const savedHeaders = (Array.isArray(snap.headers) ? snap.headers : []).filter(h => h && (h.key || h.value));
    const usedHeaders = new Set();
    $('#headersBody tr').each(function() {
        if ($(this).attr('data-user-added') === 'true') return;
        const key = $(this).find('.header-key').val();
        const idx = savedHeaders.findIndex((h, i) => !usedHeaders.has(i) && h.key === key);
        if (idx < 0) return;
        usedHeaders.add(idx);
        const saved = savedHeaders[idx];
        $(this).find('.header-enabled').prop('checked', saved.enabled !== false);
        const keepCurrent = (ep.requiresAuth && key === 'Authorization') || (isSensitiveHeaderKey(key) && !saved.value);
        if (!keepCurrent) $(this).find('.header-val').val(saved.value == null ? '' : saved.value);
    });
    savedHeaders.forEach((h, i) => {
        if (usedHeaders.has(i)) return;
        const $row = makeHeaderRow(h.key || '', h.value == null ? '' : h.value, true);
        $row.find('.header-enabled').prop('checked', h.enabled !== false);
        $('#headersBody').append($row);
    });

    if (typeof snap.body === 'string') $('#bodyEditor').val(snap.body);
    clearBodyError();

    updateUrlPreview();
    updateParamsBadge();
    updateHeadersBadge();
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
            <input class="kv-input param-key" value="${escHtml(key)}" readonly>
            ${desc ? `<div class="param-desc">${desc}${required ? '<span class="required-star">*</span>' : ''}</div>` : ''}
        </td>
        <td class="col-value"><input class="kv-input param-val" value="${escHtml(value)}" placeholder="값 입력"></td>
    </tr>`);
    $tr.find('.param-val').on('input', () => { updateUrlPreview(); updateParamsBadge(); });
    return $tr;
}

function makeQueryRow(key = '', value = '', desc = '', required = false, enabled = true, userAdded = false) {
    const checkedAttr = enabled ? 'checked' : '';
    const keyField = userAdded
        ? `<input class="kv-input param-key" value="${escHtml(key)}" placeholder="키">`
        : `<input class="kv-input param-key" value="${escHtml(key)}" readonly>`;
    const deleteBtn = userAdded ? `<button class="btn-icon" onclick="removeRow(this)" title="삭제"><i class="fa-solid fa-xmark"></i></button>` : '';

    const $tr = $(`<tr data-user-added="${userAdded}" data-required="${required ? 'true' : 'false'}">
        <td class="col-check"><input type="checkbox" class="param-enabled" ${checkedAttr}></td>
        <td class="col-key">
            ${keyField}
            ${desc ? `<div class="param-desc">${desc}${required ? '<span class="required-star">*</span>' : ''}</div>` : ''}
        </td>
        <td class="col-value"><input class="kv-input param-val" value="${escHtml(value)}" placeholder="값"></td>
        <td class="col-action">${deleteBtn}</td>
    </tr>`);

    $tr.find('.param-val, .param-key').on('input', () => { updateUrlPreview(); updateParamsBadge(); });
    $tr.find('.param-enabled').on('change', () => { updateUrlPreview(); updateParamsBadge(); });
    return $tr;
}

function addQueryRow() {
    $('#queryBody').append(makeQueryRow('', '', '', false, true, true));
    updateParamsBadge();
    scheduleDraftPersist();
}

function removeRow(btn) {
    $(btn).closest('tr').remove();
    updateUrlPreview();
    updateParamsBadge();
    updateHeadersBadge();
    scheduleDraftPersist();
}

// 편집 내용을 sessionStorage에 보관 (입력이 멈춘 뒤 0.4초) — P1-09
const scheduleDraftPersist = debounce(() => rememberCurrentDraft(), 400);

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
            <input class="kv-input header-key" value="${escHtml(key)}" ${readonlyKey} placeholder="키">
            ${descHtml}
        </td>
        <td class="col-value"><input class="kv-input header-val" value="${escHtml(value)}" placeholder="값"></td>
        <td class="col-action">${deleteBtn}</td>
    </tr>`);
    $tr.find('.header-val, .header-key').on('input', updateHeadersBadge);
    $tr.find('.header-enabled').on('change', updateHeadersBadge);
    return $tr;
}

function addHeaderRow() {
    $('#headersBody').append(makeHeaderRow());
    updateHeadersBadge();
    scheduleDraftPersist();
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
function _escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function _getErrorRange(str, pos) {
    if (pos < 0 || pos >= str.length) return null;
    const delim = /[\s,\[\]{}:]/;
    let start = pos;
    let end = pos + 1;

    while (start > 0 && !delim.test(str[start - 1])) start--;
    while (end < str.length && !delim.test(str[end])) end++;
    if (start === end) end = Math.min(start + 1, str.length);

    return { start, end };
}

function _buildHighlightHtml(raw, errorRange) {
    if (!errorRange) return _escapeHtml(raw);

    const { start, end } = errorRange;
    const before = _escapeHtml(raw.slice(0, start));
    const token = _escapeHtml(raw.slice(start, end));
    const after = _escapeHtml(raw.slice(end));

    return before + '<mark class="err-token">' + token + '</mark>' + after + '\n';
}

function _updateBackdrop(raw, errorRange) {
    const $highlights = $('#bodyHighlights');
    if (!$highlights.length) return;

    if (!raw) {
        $highlights.html('');
        return;
    }

    $highlights.html(_buildHighlightHtml(raw, errorRange));

    const ta = document.getElementById('bodyEditor');
    if (!ta) return;
    $highlights[0].scrollTop = ta.scrollTop;
    $highlights[0].scrollLeft = ta.scrollLeft;
}

function syncBackdropScroll() {
    const ta = this;
    const hl = document.getElementById('bodyHighlights');
    if (!hl) return;
    hl.scrollTop = ta.scrollTop;
    hl.scrollLeft = ta.scrollLeft;
}

function _inferErrorRangeFromMessage(raw, clean) {
    const posMatch = clean.match(/\bposition\s+(\d+)/i);
    if (posMatch) {
        const pos = parseInt(posMatch[1], 10);
        return Number.isNaN(pos) ? null : _getErrorRange(raw, pos);
    }

    const tokenMatch = clean.match(/Unexpected token ['"]?([^'" ]+)['"]?/i);
    if (tokenMatch && tokenMatch[1]) {
        const token = tokenMatch[1];
        if (token.length > 1) {
            const idx = raw.indexOf(token);
            if (idx >= 0) return _getErrorRange(raw, idx);
        } else {
            const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const valuePattern = new RegExp(':\\s*(' + escaped + '[^,\\]\\}\\s]*)');
            const m = raw.match(valuePattern);
            if (m) {
                const idx = raw.indexOf(m[1]);
                if (idx >= 0) return _getErrorRange(raw, idx);
            }
        }
    }

    const barewordMatch = raw.match(/:\s*((?!true\b|false\b|null\b)[A-Za-z_$][\w$-]*)/);
    if (barewordMatch && barewordMatch[1]) {
        const idx = raw.indexOf(barewordMatch[1]);
        if (idx >= 0) return _getErrorRange(raw, idx);
    }

    return null;
}

function showBodyError(msg) {
    const clean = String(msg || 'JSON 형식이 올바르지 않습니다')
        .replace(/^JSON\.parse:\s*/i, '')
        .replace(/^SyntaxError:\s*/i, '');

    const raw = $('#bodyEditor').val();
    const errorRange = _inferErrorRangeFromMessage(raw, clean);
    _updateBackdrop(raw, errorRange);

    $('#bodyEditor').removeClass('is-valid').addClass('has-error');
    $('#bodyErrorMsg')
        .html('<i class="fa-solid fa-circle-exclamation fa-xs"></i><span>' + _escapeHtml(clean) + '</span>')
        .show();
}

function clearBodyError() {
    $('#bodyEditor').removeClass('has-error is-valid');
    $('#bodyErrorMsg').hide().empty();
    _updateBackdrop('', null);
}

function markBodyValid() {
    $('#bodyEditor').removeClass('has-error').addClass('is-valid');
    $('#bodyErrorMsg').hide().empty();
    _updateBackdrop('', null);
}

const _validateBodyJson = debounce(function() {
    const raw = $('#bodyEditor').val().trim();
    if (!raw) {
        clearBodyError();
        return;
    }

    try {
        JSON.parse(raw);
        markBodyValid();
    } catch (e) {
        showBodyError(e.message);
    }
}, 300);

function formatBody() {
    const raw = $('#bodyEditor').val().trim();
    if (!raw) {
        clearBodyError();
        return;
    }

    try {
        $('#bodyEditor').val(JSON.stringify(JSON.parse(raw), null, 2));
        markBodyValid();
        scheduleDraftPersist();
    } catch (e) {
        showBodyError(e.message);
    }
}

function clearBody() {
    $('#bodyEditor').val('');
    clearBodyError();
    scheduleDraftPersist();
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
    const execTime  = Date.now();
    const apiKey    = $('#apiKey').val().trim();
    const secretKey = $('#secretKey').val().trim();
    const memberId  = $('#userId').val().trim();
    const domain    = getBaseUrl();

    if (!domain) { showToast('환경을 선택하거나 도메인을 입력해주세요'); return; }
    if (!apiKey || !secretKey || !memberId) { showToast('API Key, 비밀 키, User ID를 모두 입력해주세요'); return; }

    let signature;
    if (state.authMethod === 'signature') {
        try {
            const keyObj = KEYUTIL.getKeyFromPlainPrivatePKCS8Hex(secretKey);
            const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
            sig.init(keyObj); sig.updateString(execTime.toString());
            signature = sig.sign();
        } catch (e) {
            showToast('서명 생성 오류: ' + e.message, 3000);
            return;
        }
    } else {
        signature = 'Bearer ' + secretKey;
    }

    // 발급 요청 시점의 설정을 기억한다 — 이후 환경·API Key·Member ID가 바뀌면 "다른 설정으로 발급됨" (P1-08)
    const issuedContext = currentTokenContext();

    $('#btnGetToken').prop('disabled', true).html('<i class="fa-solid fa-spinner fa-spin fa-sm"></i> 발급 중...');
    try {
        // 공유 모듈(assets/js/token-issuer.js): direct → CORS/네트워크 실패 시에만 /api/getToken 프록시
        const result = await window.issueAccessToken({ domain, apiKey, memberId, signature, execTime });
        if (result.ok) {
            hideTokenError();
            applyIssuedToken(result.token, issuedContext);
            if (window.TokenBadge) {
                window.TokenBadge.attach('#tokenBadge', result, { onReissue: () => getAccessToken() });
            }
            showToast('토큰이 발급되었습니다' + (result.via === 'proxy' ? ' (via proxy)' : ''));
        } else {
            // "[4030004] The signature is invalid." 형태 — 사용자가 닫을 때까지 남긴다
            showTokenError('토큰 발급 실패: ' + (result.message || '알 수 없는 오류'));
        }
        return result;
    } finally {
        $('#btnGetToken').prop('disabled', false).html('<i class="fa-solid fa-rotate fa-sm"></i> 토큰 발급');
    }
}

// 토큰 발급 실패 메시지 — 토스트(자동 사라짐) 대신 인증 패널 아래에 [닫기] 전까지 고정 표시
function showTokenError(message) {
    const el = document.getElementById('tokenErrorMsg');
    if (!el) { showToast(message, 5000); return; }
    el.textContent = '';
    el.style.cssText = 'display:flex;align-items:flex-start;gap:8px;margin:8px 0 0;padding:8px 12px;border:1px solid #f3c2bd;border-left:4px solid #d93025;border-radius:6px;background:#fdf3f2;color:#8a1c14;font-size:0.82rem;line-height:1.5;word-break:break-word;';
    const text = document.createElement('span');
    text.style.flex = '1';
    text.textContent = message;
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '닫기';
    close.style.cssText = 'flex-shrink:0;padding:2px 10px;border:1px solid #d9a5a0;border-radius:5px;background:#fff;color:#a50e0e;cursor:pointer;font-size:0.78rem;';
    close.addEventListener('click', hideTokenError);
    el.appendChild(text);
    el.appendChild(close);
}

function hideTokenError() {
    const el = document.getElementById('tokenErrorMsg');
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
}

// 현재 화면의 Authorization 헤더 행에 토큰 값을 넣는다.
// requiresAuth:false API(OPA2_007/048 — base64 회사 API Key를 직접 입력)는 사용자가 넣은 값을 건드리지 않는다.
function syncAuthorizationHeader() {
    const ep = state.currentEndpoint;
    if (!ep || !ep.requiresAuth) return;
    $('#headersBody tr').each(function() {
        if ($(this).attr('data-user-added') === 'true') return;
        if ($(this).find('.header-key').val() === 'Authorization') {
            const $val = $(this).find('.header-val');
            $val.val(state.accessToken ? `Bearer ${state.accessToken}` : '');
            if (state.accessToken) clearFieldError($val);
        }
    });
}

function applyIssuedToken(token, context) {
    state.accessToken = token;
    state.tokenContext = context || currentTokenContext();
    updateAuthUI();
    syncAuthorizationHeader();
}

// 토큰 비우기 — [초기화] 버튼, "다른 설정으로 발급됨" 상태에서 Send 확인창의 기본 동작
function clearAccessToken() {
    state.accessToken = '';
    state.tokenContext = null;
    updateAuthUI();
    syncAuthorizationHeader();
}

// ── 토큰 발급 설정 추적 (P1-08) ────────────────────────────────────────────
// 토큰은 발급할 때의 환경(도메인)·API Key·Member ID에 묶인다. 이 중 하나라도 바뀌면
// 그 토큰으로 보낸 요청은 다른 계정·다른 환경으로 간다 — "다른 설정으로 발급됨"으로 표시하고 Send 때 확인한다.
function currentTokenContext() {
    return {
        baseUrl:  getBaseUrl(),
        apiKey:   String($('#apiKey').val() || '').trim(),
        memberId: String($('#userId').val() || '').trim(),
    };
}

function tokenContextChanges() {
    if (!state.accessToken || !state.tokenContext) return [];
    const now = currentTokenContext();
    const prev = state.tokenContext;
    const changes = [];
    if (now.baseUrl !== prev.baseUrl) changes.push('환경/도메인');
    if (now.apiKey !== prev.apiKey) changes.push('API Key');
    if (now.memberId !== prev.memberId) changes.push('Member ID');
    return changes;
}

function isTokenStale() {
    return tokenContextChanges().length > 0;
}

function setAuthPanelOpen(open) {
    $('#authPanelBody').toggleClass('open', !!open);
    $('#authChevron').css('transform', open ? 'rotate(180deg)' : '');
}

function updateAuthUI() {
    if (!state.accessToken && window.TokenBadge) window.TokenBadge.clear('#tokenBadge');
    const changes = tokenContextChanges();
    const stale = changes.length > 0;
    const $status = $('#authStatusBadge').removeClass('has-token no-token stale-token');
    if (state.accessToken) {
        const short = state.accessToken.substring(0, 40) + '...';
        $('#tokenDisplay').text(short).addClass('has-token');
        if (stale) $status.text('다른 설정으로 발급됨').addClass('stale-token');
        else $status.text('토큰 보유').addClass('has-token');
    } else {
        $('#tokenDisplay').text('토큰을 발급받아 주세요').removeClass('has-token');
        $status.text('토큰 없음').addClass('no-token');
    }
    // 유효 시간 배지(token-badge.js) 대신 "다른 설정으로 발급됨" 안내를 보여 준다
    $('#tokenBadge').toggle(!stale);
    renderTokenStaleNotice(changes);
}

function renderTokenStaleNotice(changes) {
    const el = document.getElementById('tokenStaleNotice');
    if (!el) return;
    el.textContent = '';
    if (!changes || !changes.length) { el.style.display = 'none'; return; }

    const strong = document.createElement('strong');
    strong.textContent = '다른 설정으로 발급됨';
    const text = document.createElement('span');
    text.style.flex = '1';
    text.textContent = ` · 변경: ${changes.join(', ')} — 이 토큰으로 보내면 발급 당시의 계정·환경으로 요청됩니다.`;
    const reissue = document.createElement('button');
    reissue.type = 'button';
    reissue.textContent = '현재 설정으로 재발급';
    reissue.addEventListener('click', () => getAccessToken());
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = '토큰 비우기';
    clear.addEventListener('click', () => { clearAccessToken(); showToast('토큰이 초기화되었습니다'); });

    const head = document.createElement('span');
    head.appendChild(strong);
    head.appendChild(text);
    el.appendChild(head);
    el.appendChild(reissue);
    el.appendChild(clear);
    el.style.display = '';
}

// ── 선택 확인 모달 (#choiceModal) ─────────────────────────────────────────
// showChoiceModal({ title, message, choices: [{ value, label, primary }] }) → Promise<value | 'cancel'>
let _choiceResolver = null;

function showChoiceModal({ title, message, choices }) {
    return new Promise(resolve => {
        if (_choiceResolver) _choiceResolver('cancel');
        _choiceResolver = resolve;
        $('#choiceModalTitle').text(title || '확인');
        $('#choiceModalBody').text(message || '');
        const $actions = $('#choiceModalActions').empty();
        (choices || []).forEach(c => {
            $('<button type="button">')
                .addClass(c.primary ? 'btn-primary' : 'btn-ghost')
                .attr('data-choice', c.value)
                .text(c.label)
                .on('click', () => resolveChoiceModal(c.value))
                .appendTo($actions);
        });
        $('#choiceModal').addClass('open');
        setTimeout(() => $actions.find('.btn-primary').first().trigger('focus'), 30);
    });
}

function resolveChoiceModal(value) {
    $('#choiceModal').removeClass('open');
    const resolve = _choiceResolver;
    _choiceResolver = null;
    if (resolve) resolve(value || 'cancel');
}

// ──────────────────────────────────────────────────────────────────────────
// SEND REQUEST
// ──────────────────────────────────────────────────────────────────────────
// ── 전송 전 검증 (P1-08) ────────────────────────────────────────────────
// 필수 path/query 값, 토큰(requiresAuth), 헤더 플레이스홀더, Body JSON을 확인하고
// 문제가 있으면 해당 입력에 빨간 테두리 + 메시지를 표시하고 전송하지 않는다.
function clearFieldError($input) {
    $input.removeClass('has-error');
    $input.closest('td').find('.param-error-msg').remove();
}

function markFieldError($input, message) {
    $input.addClass('has-error');
    const $cell = $input.closest('td');
    $cell.find('.param-error-msg').remove();
    $('<div class="param-error-msg">').text(message).appendTo($cell);
}

function clearRequestValidation() {
    $('#requestArea .kv-input.has-error').removeClass('has-error');
    $('#requestArea .param-error-msg').remove();
    $('#requestValidationMsg').hide().empty();
}

function findAuthorizationRow() {
    let $row = null;
    $('#headersBody tr').each(function() {
        if ($row) return;
        if (String($(this).find('.header-key').val() || '').trim().toLowerCase() === 'authorization') $row = $(this);
    });
    return $row;
}

function validateRequestBeforeSend() {
    clearRequestValidation();
    const ep = state.currentEndpoint;
    const errors = [];   // { tab, message, $input, auth }

    $('#pathBody tr').each(function() {
        const key = $(this).find('.param-key').val();
        const $val = $(this).find('.param-val');
        if (!String($val.val() || '').trim()) {
            markFieldError($val, '필수 값입니다');
            errors.push({ tab: 'path', $input: $val, message: `Path 파라미터 {${key}}가 비어 있습니다` });
        }
    });

    $('#queryBody tr').each(function() {
        if ($(this).attr('data-required') !== 'true') return;
        const key = $(this).find('.param-key').val();
        const $val = $(this).find('.param-val');
        const enabled = $(this).find('.param-enabled').is(':checked');
        if (!enabled) {
            markFieldError($val, '필수 파라미터입니다 — 체크하고 값을 입력하세요');
            errors.push({ tab: 'query', $input: $val, message: `필수 Query 파라미터 ${key}의 체크가 해제되어 있습니다` });
        } else if (!String($val.val() || '').trim()) {
            markFieldError($val, '필수 값입니다');
            errors.push({ tab: 'query', $input: $val, message: `필수 Query 파라미터 ${key}가 비어 있습니다` });
        }
    });

    if (ep && ep.requiresAuth) {
        const $row = findAuthorizationRow();
        const value = $row ? String($row.find('.header-val').val() || '').trim() : '';
        const enabled = $row ? $row.find('.header-enabled').is(':checked') : false;
        if (!enabled || !value || /^bearer\s*$/i.test(value)) {
            if ($row) markFieldError($row.find('.header-val'), 'Access Token이 없습니다');
            errors.push({ tab: 'headers', auth: true, message: 'Access Token이 없습니다 — 인증 패널에서 [토큰 발급]을 눌러 주세요' });
        }
    }

    $('#headersBody tr').each(function() {
        if (!$(this).find('.header-enabled').is(':checked')) return;
        const key = String($(this).find('.header-key').val() || '').trim();
        const $val = $(this).find('.header-val');
        const m = String($val.val() || '').match(/\{[A-Za-z0-9_]+\}/);
        if (key && m && !$val.hasClass('has-error')) {
            markFieldError($val, `${m[0]}를 실제 값으로 바꾸세요`);
            errors.push({ tab: 'headers', $input: $val, message: `${key} 헤더의 ${m[0]}를 실제 값으로 바꾸세요` });
        }
    });

    const method = $('#methodSelect').val();
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const raw = String($('#bodyEditor').val() || '').trim();
        if (raw) {
            try { JSON.parse(raw); }
            catch (e) {
                showBodyError(e.message);
                errors.push({ tab: 'body', $input: $('#bodyEditor'), message: 'Body의 JSON 형식이 올바르지 않습니다' });
            }
        }
    }

    if (!errors.length) return true;

    // 토큰이 없으면 인증 패널을 펼친다. 그 밖의 첫 오류는 해당 탭으로 이동해 포커스
    if (errors.some(e => e.auth)) setAuthPanelOpen(true);
    const firstField = errors.find(e => !e.auth) || errors[0];
    if (firstField.tab) $(`.tab-btn[data-tab="${firstField.tab}"]`).click();
    if (firstField.$input) firstField.$input.trigger('focus');
    else if (firstField.auth) {
        const $empty = ['#apiKey', '#userId', '#secretKey'].map(s => $(s)).find($el => !String($el.val() || '').trim());
        ($empty || $('#btnGetToken')).trigger('focus');
    }

    const $msg = $('#requestValidationMsg').empty();
    $('<i class="fa-solid fa-circle-exclamation fa-sm" style="margin-top:3px"></i>').appendTo($msg);
    const $wrap = $('<div>').appendTo($msg);
    $('<strong>').text('요청을 보내지 않았습니다 — 아래 항목을 확인하세요').appendTo($wrap);
    const $ul = $('<ul>').appendTo($wrap);
    errors.forEach(e => $('<li>').text(e.message).appendTo($ul));
    $msg.show();
    return false;
}

// ── 요청 취소·타임아웃 (P1-10) ─────────────────────────────────────────────
const REQUEST_TIMEOUT_MS = 60 * 1000;

// reason: 'user'(취소 버튼) | 'switch'(다른 API 선택) — 타임아웃은 sendRequest 내부 타이머가 처리
function cancelInFlightRequest(reason = 'user') {
    const inflight = state.inFlight;
    if (!inflight) return;
    inflight.reason = reason;
    inflight.controller.abort();
}

function setSendButtonBusy(busy) {
    const $btn = $('#btnSend');
    if (busy) {
        $btn.addClass('is-cancel').attr('title', '요청 취소')
            .html('<i class="fa-solid fa-spinner fa-spin fa-sm"></i> 취소');
    } else {
        $btn.removeClass('is-cancel').attr('title', 'Send (Ctrl+Enter)')
            .html('<i class="fa-solid fa-paper-plane fa-sm"></i> Send');
    }
    $btn.prop('disabled', false);
    $('#btnSendArrow').prop('disabled', !!busy);
}

async function sendRequest(forceDownload = false) {
    $('#sendDropdownMenu').removeClass('open');
    // 진행 중이면 Send 버튼은 [취소]로 동작한다
    if (state.inFlight) { cancelInFlightRequest('user'); return; }
    if (!state.currentEndpoint) { showToast('API를 먼저 선택해주세요'); return; }
    if (!validateRequestBeforeSend()) return;

    // 다른 설정(환경·API Key·Member ID)으로 발급된 토큰이면 확인한다. 기본 동작은 토큰 비움 + 재발급 안내
    if (state.currentEndpoint.requiresAuth && isTokenStale()) {
        const changes = tokenContextChanges();
        const choice = await showChoiceModal({
            title: '다른 설정으로 발급된 토큰',
            message: `현재 토큰은 지금과 다른 설정으로 발급되었습니다 (변경: ${changes.join(', ')}).\n`
                + '이대로 보내면 발급 당시의 계정·환경 권한으로 요청됩니다.\n\n'
                + '토큰을 비우고 현재 설정으로 다시 발급하는 것을 권장합니다.',
            choices: [
                { value: 'cancel', label: '취소' },
                { value: 'send', label: '그대로 전송' },
                { value: 'reissue', label: '토큰 비우고 재발급', primary: true },
            ],
        });
        if (choice === 'reissue') {
            clearAccessToken();
            setAuthPanelOpen(true);
            $('#btnGetToken').trigger('focus');
            showToast('토큰을 비웠습니다. [토큰 발급]으로 다시 발급한 뒤 전송하세요', 3500);
            return;
        }
        if (choice !== 'send') return;
    }

    const url = $('#urlInput').val().trim();
    const method = $('#methodSelect').val();
    if (!url) { showToast('URL이 비어있습니다'); return; }

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

    clearResponse();
    $('#responsePlaceholder').show().find('p').text('요청 전송 중... (중단하려면 [취소])');

    // AbortController + 60초 타임아웃. 응답 본문을 읽는 동안에도 취소할 수 있다
    const inflight = { controller: new AbortController(), reason: null };
    state.inFlight = inflight;
    const timer = setTimeout(() => {
        inflight.reason = 'timeout';
        inflight.controller.abort();
    }, REQUEST_TIMEOUT_MS);
    setSendButtonBusy(true);

    const startTime = Date.now();
    try {
        const opts = { method, headers, signal: inflight.controller.signal };
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

            // 4xx/5xx: 응답 패널 위에 "HTTP 400 · [코드] 메시지" 요약 + 에러 코드 찾아보기 링크
            // 401이면 "토큰이 만료되었거나 유효하지 않습니다 [토큰 재발급]" 배너를 함께 띄운다
            if (res.status >= 400) {
                showResponseNotice({ status: res.status, bodyText: text, url });
            }
        }

    } catch (e) {
        if (e && e.name === 'AbortError') {
            // 사용자 취소·타임아웃 — CORS 안내를 띄우지 않는다
            if (inflight.reason === 'switch') {
                showToast('API를 바꿔 진행 중이던 요청을 취소했습니다', 2500);
            } else {
                const msg = inflight.reason === 'timeout'
                    ? `응답이 ${REQUEST_TIMEOUT_MS / 1000}초 안에 오지 않아 요청을 취소했습니다`
                    : '요청이 취소되었습니다';
                clearResponse();
                $('#responsePlaceholder').show().find('p').text(msg);
                showToast(msg, 3000);
            }
        } else {
            $('#responsePlaceholder').show().find('p').text('요청 실패: ' + e.message);
            // Failed to fetch → CORS·도메인 오타·네트워크 안내 + CorsTest 링크
            showResponseNotice({ error: e, url });
            showToast('요청 실패: ' + e.message, 3000);
        }
    } finally {
        clearTimeout(timer);
        if (state.inFlight === inflight) state.inFlight = null;
        setSendButtonBusy(false);
    }
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

// ──────────────────────────────────────────────────────────────────────────
// RESPONSE NOTICE (응답 에러 요약 — assets/js/api-error.js)
// ──────────────────────────────────────────────────────────────────────────
function showResponseNotice(info) {
    const el = document.getElementById('responseNotice');
    if (!el) return;
    if (typeof window.renderApiError === 'function') {
        window.renderApiError(el, info);
    } else {
        el.textContent = info && info.error ? String(info.error.message || info.error) : `HTTP ${info && info.status}`;
    }
    if (info && info.status === 401) {
        if (window.TokenBadge) window.TokenBadge.markExpired('#tokenBadge');
        el.insertBefore(buildTokenExpiredBanner(), el.firstChild);
    }
    el.style.display = '';
}

// 401 배너: [토큰 재발급] 클릭 → getAccessToken() 성공 시 배너 제거
function buildTokenExpiredBanner() {
    const banner = document.createElement('div');
    banner.id = 'tokenExpiredBanner';
    banner.style.cssText = 'display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:10px 0 0;padding:8px 12px;border:1px solid #f5d48a;border-left:4px solid #e8a200;border-radius:6px;background:#fffaeb;color:#5c4300;font-size:0.82rem;font-weight:600;';
    const text = document.createElement('span');
    text.textContent = '토큰이 만료되었거나 유효하지 않습니다';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = '토큰 재발급';
    btn.style.cssText = 'padding:3px 10px;border:1px solid #e6c46e;border-radius:5px;background:#fff;color:#7a5600;cursor:pointer;font-size:0.78rem;font-weight:600;';
    btn.addEventListener('click', async () => {
        btn.disabled = true;
        btn.textContent = '재발급 중…';
        const result = await getAccessToken();
        if (result && result.ok) {
            banner.remove();
            showToast('토큰을 재발급했습니다. 요청을 다시 보내세요.', 3000);
        } else {
            btn.disabled = false;
            btn.textContent = '토큰 재발급';
            // 인증 정보가 비어 있으면 인증 패널을 보여 준다
            setAuthPanelOpen(true);
        }
    });
    banner.appendChild(text);
    banner.appendChild(btn);
    return banner;
}

function hideResponseNotice() {
    const el = document.getElementById('responseNotice');
    if (!el) return;
    el.textContent = '';
    el.style.display = 'none';
}

function clearResponse() {
    hideResponseNotice();
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

// ── 스니펫 문자열 이스케이프 (P1-10) ─────────────────────────────────────
// bash 작은따옴표: ' → '\''
function shellQuote(v) {
    return "'" + String(v).replace(/'/g, "'\\''") + "'";
}

// JS 템플릿 리터럴 본문: \ ` ${ 이스케이프
function jsTemplateEscape(v) {
    return String(v).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${');
}

// Java 문자열(큰따옴표)
function javaQuote(v) {
    return '"' + String(v).replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r/g, '\\r').replace(/\n/g, '\\n') + '"';
}

function snippetCurl(url, method, headers, body) {
    const lines = [`curl --location --request ${method} ${shellQuote(url)}`];
    Object.entries(headers).forEach(([k, v]) => {
        lines.push(`  --header ${shellQuote(`${k}: ${v}`)}`);
    });
    if (body) {
        lines.push(`  --data-raw ${shellQuote(body)}`);
    }
    return lines.join(' \\\n');
}

function snippetFetch(url, method, headers, body) {
    const headersJson = JSON.stringify(headers, null, 2).replace(/^/gm, '  ').trimStart();
    let code = `const response = await fetch(${JSON.stringify(url)}, {\n`;
    code += `  method: '${method}',\n`;
    code += `  headers: ${headersJson}`;
    if (body) {
        code += `,\n  body: \`${jsTemplateEscape(body)}\``;
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
    const headersJson = JSON.stringify(otherHeaders, null, 4).replace(/^/gm, '    ').trimStart();

    let code = `$.ajax({\n`;
    code += `    url: ${JSON.stringify(url)},\n`;
    code += `    method: '${method}',\n`;
    code += `    contentType: ${JSON.stringify(ct)},\n`;
    if (Object.keys(otherHeaders).length) {
        code += `    headers: ${headersJson},\n`;
    }
    if (body) {
        // Body 원문을 문자열 그대로 보낸다 (따옴표·백틱이 있어도 스니펫이 깨지지 않게)
        code += `    data: \`${jsTemplateEscape(body)}\`,\n`;
    }
    code += `    success: function(data) {\n        console.log(data);\n    },\n`;
    code += `    error: function(err) {\n        console.error(err);\n    }\n`;
    code += `});`;
    return code;
}

// Python: JSON을 파이썬 리터럴로 내보내면 true/null에서 NameError → json.loads로 파싱해 json=로 보낸다
function snippetPython(url, method, headers, body) {
    // JSON 문자열 이스케이프(\" \\ \n \uXXXX)는 파이썬 문자열 리터럴과 호환된다 (헤더 값은 문자열뿐)
    const headersRepr = JSON.stringify(headers, null, 4);
    let code = body ? `import json\nimport requests\n\n` : `import requests\n\n`;
    code += `url = ${JSON.stringify(url)}\n\n`;
    code += `headers = ${headersRepr}\n\n`;
    if (body) {
        // r'''…''' 원문 그대로. ''' 가 들어 있거나 ' 또는 \ 로 끝나면 한 줄 문자열 리터럴로 대체
        const rawSafe = !body.includes("'''") && !/['\\]$/.test(body);
        const literal = rawSafe ? `r'''${body}'''` : JSON.stringify(body);
        code += `payload = json.loads(${literal})\n\n`;
        code += `response = requests.${method.toLowerCase()}(url, headers=headers, json=payload)\n`;
    } else {
        code += `response = requests.${method.toLowerCase()}(url, headers=headers)\n`;
    }
    code += `print(response.status_code)\nprint(response.text)`;
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
        .map(([k, v]) => `        .header(${javaQuote(k)}, ${javaQuote(v)})`).join('\n');

    code += `HttpRequest request = HttpRequest.newBuilder()\n`;
    code += `        .uri(URI.create(${javaQuote(url)}))\n`;
    if (headerLines) code += `${headerLines}\n`;

    if (body) {
        // 텍스트 블록: \ 와 """ 만 이스케이프
        const block = body.replace(/\\/g, '\\\\').replace(/"""/g, '\\"""');
        code += `        .method("${method}", HttpRequest.BodyPublishers.ofString("""\n`;
        code += `                ${block.replace(/\n/g, '\n                ')}\n`;
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

// ──────────────────────────────────────────────────────────────────────────
// SAVE MODAL
// ──────────────────────────────────────────────────────────────────────────
// 저장된 요청을 불러온 상태에서 Save → [덮어쓰기]/[새로 저장] 선택 (P1-09)
let saveModalReplaceId = null;

function currentLoadedHistoryEntry() {
    const ep = state.currentEndpoint;
    if (!ep || !state.currentHistoryId) return null;
    return historyLoad().find(e => e.id === state.currentHistoryId && e.endpointId === ep.id) || null;
}

function openSaveModal() {
    const ep = state.currentEndpoint;
    if (!ep) { showToast('API를 먼저 선택해주세요'); return; }
    const loaded = currentLoadedHistoryEntry();
    saveModalReplaceId = loaded ? loaded.id : null;
    $('#saveNameInput').val(loaded ? loaded.name : ep.name);
    if (loaded) {
        $('#saveOverwriteHint').text(`불러온 저장 항목 "${loaded.name}"을(를) 지금 내용으로 덮어쓰거나, 새 항목으로 저장할 수 있습니다.`).show();
        $('#btnSaveConfirmLabel').text('덮어쓰기');
        $('#btnSaveAsNew').show();
    } else {
        $('#saveOverwriteHint').hide().text('');
        $('#btnSaveConfirmLabel').text('저장');
        $('#btnSaveAsNew').hide();
    }
    $('#saveModal').addClass('open');
    setTimeout(() => $('#saveNameInput').select(), 50);
}

function closeSaveModal() {
    $('#saveModal').removeClass('open');
}

// mode: 'new'면 항상 새 항목, 생략하면 열 때 정한 기본 동작(불러온 항목이 있으면 덮어쓰기)
let _saveInProgress = false;
async function confirmSave(mode) {
    if (_saveInProgress) return;
    const name = $('#saveNameInput').val().trim() || state.currentEndpoint?.name;
    const replaceId = mode === 'new' ? null : saveModalReplaceId;
    _saveInProgress = true;
    let entry;
    try {
        entry = await historyCaptureAndSave(name, { replaceId });
    } finally {
        _saveInProgress = false;
    }
    if (!entry) return;
    closeSaveModal();
    if (entry.replaceFailed) {
        // 새 항목은 저장됐지만 이전 항목 DELETE 실패 — 목록에 두 항목이 남았음을 알린다 (D-3)
        showToast(`"${name}" 새 내용은 저장했지만 이전 항목을 지우지 못했습니다 — 목록에서 직접 삭제하세요`, 5000);
    } else {
        showToast(replaceId ? `"${name}" 덮어씀` : `"${name}" 저장됨`);
    }
    // 방금 저장한 항목을 "불러온 항목"으로 삼아 다음 저장 때 덮어쓰기를 고를 수 있게 한다
    state.currentHistoryId = entry.id;
    if (state.currentEndpoint) {
        expandedSaveEndpoints.add(state.currentEndpoint.id);
    }
    buildSidebar($('#sidebarSearch').val());
    if ($('#sidebarHistoryPanel').is(':visible')) buildHistoryPanel();
}

// ──────────────────────────────────────────────────────────────────────────
// HISTORY PANEL
// ──────────────────────────────────────────────────────────────────────────
function buildHistoryPanel() {
    const list = historyLoad();
    const $panel = $('#historyList').empty();

    if (!list.length) {
        $panel.html('<div class="history-empty"><i class="fa-solid fa-clock-rotate-left"></i><p>저장된 요청이 없습니다</p></div>');
        return;
    }

    list.forEach(entry => {
        const date = new Date(entry.savedAt);
        const timeStr = date.toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
            + ' ' + date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });

        const statusHtml = entry.response
            ? `<span class="history-status ${entry.response.statusClass.includes('2xx') ? 'ok' : 'err'}">${escHtml(entry.response.statusText)}</span>`
            : '';

        const $item = $(`
            <div class="history-item" data-history-id="${escHtml(entry.id)}">
                <div class="history-item-top">
                    ${methodBadge(entry.method)}
                    <span class="history-item-name">${escHtml(entry.name)}</span>
                    <button class="history-delete-btn" data-id="${escHtml(entry.id)}" title="삭제">
                        <i class="fa-solid fa-xmark fa-xs"></i>
                    </button>
                </div>
                <div class="history-item-meta">
                    <span class="history-time">${timeStr}</span>
                    ${statusHtml}
                </div>
            </div>`);

        $item.on('click', function(e) {
            if ($(e.target).closest('.history-delete-btn').length) return;
            loadHistoryEntry(entry);
        });

        $item.find('.history-delete-btn').on('click', async function(e) {
            e.stopPropagation();
            const deleted = await historyDelete(entry.id);
            if (!deleted) return;
            buildHistoryPanel();
            buildSidebar($('#sidebarSearch').val());
        });

        $panel.append($item);
    });
}

function loadHistoryEntry(entry) {
    const ep = API_LIST.find(e => e.id === entry.endpointId);
    if (!ep) { showToast('해당 API를 찾을 수 없습니다'); return; }

    // 저장 당시 환경으로 맞춘다 — 바뀌면 토스트로 알린다 (예전에는 말없이 바뀌었다)
    const $env = $('#envSelect');
    const prevEnvLabel = $env.find('option:selected').text();
    let envChanged = false;
    if (entry.environment && entry.environment !== $env.val()
        && $env.find('option').filter((i, o) => o.value === entry.environment).length) {
        if (entry.environment === 'custom' && !String($('#customDomainInput').val() || '').trim() && entry.url) {
            // 직접 입력 환경인데 도메인이 비어 있으면 저장된 URL에서 도메인 부분을 가져온다
            const idx = String(entry.url).indexOf('/v2.0/');
            if (idx > 0) $('#customDomainInput').val(String(entry.url).slice(0, idx));
        }
        $env.val(entry.environment).trigger('change');
        envChanged = true;
    }

    // 다른 draft가 섞이지 않게 기본값에서 시작해 저장 항목을 적용한다
    selectEndpoint(ep.id, { skipDraft: true });
    state.currentHistoryId = entry.id;
    $('.save-item').removeClass('active');
    $(`.save-item[data-history-id="${entry.id}"]`).addClass('active');

    // path·query·헤더는 key로 맞추고, 사용자가 추가한 query·헤더 행도 복원한다.
    // 인증 헤더(Authorization, eformsign_signature 등)는 저장 항목 값으로 덮어쓰지 않는다 (P0-08).
    applyRequestSnapshot(entry);
    rememberCurrentDraft();

    if (envChanged) {
        showToast(`"${entry.name}" 불러옴 · 환경 변경: ${prevEnvLabel} → ${$env.find('option:selected').text()}`, 3500);
    } else {
        showToast(`"${entry.name}" 불러옴`);
    }
}

async function historyClearConfirm() {
    if (!confirm('저장된 요청을 모두 삭제할까요?')) return;
    const cleared = await historyClear();
    if (!cleared) return;
    expandedSaveEndpoints.clear();
    buildHistoryPanel();
    buildSidebar($('#sidebarSearch').val());
}
