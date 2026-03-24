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
