// ──────────────────────────────────────────────────────────────────────────
// TABS
// ──────────────────────────────────────────────────────────────────────────
$(document).on('click', '.tab-btn', function() {
    const tab = $(this).data('tab');
    $('.tab-btn').removeClass('active');
    $(this).addClass('active');
    $('.tab-pane').removeClass('active');
    $(`#tab-${tab}`).addClass('active');
});

// ──────────────────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────────────────
$(document).ready(function() {
    updateBaseUrlBadge();

    // Auth panel toggle — 토큰이 없으면 처음부터 펼쳐 둔다 (P1-08)
    setAuthPanelOpen(!state.accessToken);
    $('#authPanelToggle').on('click', function() {
        setAuthPanelOpen(!$('#authPanelBody').hasClass('open'));
    });

    // Auth method tabs
    $('.auth-method-tab').on('click', function() {
        state.authMethod = $(this).data('method');
        $('.auth-method-tab').removeClass('active');
        $(this).addClass('active');
        if (state.authMethod === 'signature') {
            $('#secretKeyLabel').text('비밀 키 (Secret Key, Hex)');
            $('#secretKey').attr('placeholder', '비밀 키 입력 (Hex 형식)');
        } else {
            $('#secretKeyLabel').text('Bearer 토큰');
            $('#secretKey').attr('placeholder', 'Bearer 토큰 값 입력');
        }
    });

    // Get token button
    $('#btnGetToken').on('click', getAccessToken);

    // Clear token
    $('#btnClearToken').on('click', function() {
        clearAccessToken();
        showToast('토큰이 초기화되었습니다');
    });

    // 토큰 발급 당시와 API Key·Member ID가 달라지면 "다른 설정으로 발급됨" 표시 (P1-08)
    $('#apiKey, #userId').on('input change', updateAuthUI);

    // Copy token
    $('#tokenDisplay').on('click', function() {
        if (!state.accessToken) return;
        navigator.clipboard.writeText(state.accessToken).then(() => showToast('토큰이 복사되었습니다'));
    });

    // Env change
    $('#envSelect').on('change', function() {
        const v = $(this).val();
        $('#customDomainWrap').toggle(v === 'custom');
        updateBaseUrlBadge();
        updateUrlPreview();
        updateAuthUI();
        persistDraftSession();
    });
    $('#customDomainInput').on('input', function() {
        updateBaseUrlBadge();
        updateUrlPreview();
        updateAuthUI();
        scheduleDraftPersist();
    });

    // 새로고침 전 편집 내용(sessionStorage) — 환경은 바로, API·draft는 사이드바를 만든 뒤 복원 (P1-09)
    const savedSession = readDraftSession();
    if (savedSession) {
        if (savedSession.customDomain) $('#customDomainInput').val(savedSession.customDomain);
        if (savedSession.env && $('#envSelect option').filter((i, o) => o.value === savedSession.env).length) {
            $('#envSelect').val(savedSession.env).trigger('change');
        }
    }

    // 파라미터·헤더·Body·Method 편집 내용을 draft로 보관
    $('#requestArea').on('input change', 'input, textarea, select', scheduleDraftPersist);

    // 전송 전 검증 오류 표시는 해당 입력을 고치면 바로 지운다
    $(document).on('input change', '#requestArea .kv-input.has-error', function() {
        clearFieldError($(this));
    });
    $(document).on('change', '#queryBody .param-enabled', function() {
        clearFieldError($(this).closest('tr').find('.param-val'));
    });

    $('#bodyEditor').on('input', _validateBodyJson);
    document.getElementById('bodyEditor').addEventListener('scroll', syncBackdropScroll, { passive: true });

    // Sidebar search
    $('#sidebarSearch').on('input', function() {
        buildSidebar($(this).val());
    });

    // Sidebar view mode
    $('#sidebarViewToggle').on('click', '.view-btn', function() {
        currentViewMode = $(this).data('view');
        $('#sidebarViewToggle .view-btn').removeClass('active');
        $(this).addClass('active');
        buildSidebar($('#sidebarSearch').val());
    });

    // Send 드롭다운 토글
    $('#btnSendArrow').on('click', function(e) {
        e.stopPropagation();
        $('#sendDropdownMenu').toggleClass('open');
    });
    $(document).on('click', function() {
        $('#sendDropdownMenu').removeClass('open');
    });

    // 모바일 사이드바 백드롭 클릭 시 닫기
    $('#sidebarBackdrop').on('click', closeMobileSidebar);

    $(document).on('keydown', function(e) {
        if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            if ($('#tab-body').hasClass('active')) formatBody();
        }
    });

    // 사이드바 탭 전환
    $(document).on('click', '.sidebar-tab', function() {
        const tab = $(this).data('sidebar-tab');
        $('.sidebar-tab').removeClass('active');
        $(this).addClass('active');
        if (tab === 'api') {
            $('#sidebarApiPanel').show();
            $('#sidebarHistoryPanel').hide();
        } else {
            $('#sidebarApiPanel').hide();
            $('#sidebarHistoryPanel').show();
            buildHistoryPanel();
        }
    });

    // 로그인 상태 캐시 후 DB 히스토리 초기화
    refreshAuthUser().then(() => initHistory()).then(() => {
        buildSidebar();
        restoreDraftSession(savedSession);
    });
});

// ──────────────────────────────────────────────────────────────────────────
// HORIZONTAL RESIZER (Request ↕ Response)
// ──────────────────────────────────────────────────────────────────────────
(function() {
    const hResizer = document.getElementById('hResizer');
    const tabsContainer = document.getElementById('tabsContainer');

    hResizer.addEventListener('mousedown', function(e) {
        e.preventDefault();
        const startY = e.clientY;
        const startH = tabsContainer.offsetHeight;
        hResizer.classList.add('dragging');
        document.body.style.cursor = 'row-resize';
        document.body.style.userSelect = 'none';

        function onMouseMove(e) {
            const newH = Math.max(80, Math.min(600, startH + e.clientY - startY));
            tabsContainer.style.height = newH + 'px';
        }

        function onMouseUp() {
            hResizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
})();

// ──────────────────────────────────────────────────────────────────────────
// SIDEBAR RESIZE
// ──────────────────────────────────────────────────────────────────────────
(function() {
    const resizer = document.getElementById('sidebarResizer');
    const sidebar = document.getElementById('sidebar');
    let startX, startW;

    resizer.addEventListener('mousedown', function(e) {
        startX = e.clientX;
        startW = sidebar.offsetWidth;
        resizer.classList.add('dragging');
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        function onMouseMove(e) {
            const delta = e.clientX - startX;
            const newW = Math.min(520, Math.max(160, startW + delta));
            sidebar.style.width = newW + 'px';
        }

        function onMouseUp() {
            resizer.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);
    });
})();

// 새로고침 전에 보던 API와 편집 내용을 복원한다 (인증 헤더 값은 저장하지 않았으므로 현재 토큰 사용)
function restoreDraftSession(saved) {
    if (!saved || !saved.drafts || typeof saved.drafts !== 'object') return;
    Object.keys(saved.drafts).forEach(id => {
        if (!requestDraftCache[id] && API_LIST.some(ep => ep.id === id)) requestDraftCache[id] = saved.drafts[id];
    });
    if (!state.currentEndpoint && saved.current && API_LIST.some(ep => ep.id === saved.current)) {
        selectEndpoint(saved.current);
        if (saved.drafts[saved.current]) showToast('새로고침 전 편집 내용을 복원했습니다 (인증 헤더 값 제외)', 3000);
    }
}

function updateBaseUrlBadge() {
    const url = getBaseUrl();
    $('#baseUrlBadge').text(url || '(도메인 미지정)');
}

// ──────────────────────────────────────────────────────────────────────────
// 모바일 사이드바 토글
// ──────────────────────────────────────────────────────────────────────────
function toggleMobileSidebar() {
    const isOpen = $('#sidebar').hasClass('mobile-open');
    if (isOpen) {
        closeMobileSidebar();
    } else {
        $('#sidebar').addClass('mobile-open');
        $('#sidebarBackdrop').addClass('open');
        $('#btnMenu i').removeClass('fa-bars').addClass('fa-xmark');
    }
}

function closeMobileSidebar() {
    $('#sidebar').removeClass('mobile-open');
    $('#sidebarBackdrop').removeClass('open');
    $('#btnMenu i').removeClass('fa-xmark').addClass('fa-bars');
}


// ──────────────────────────────────────────────────────────────────────────
// API 명세 모달
// ──────────────────────────────────────────────────────────────────────────
let currentSpecTab = 'request';

function showSpecModal() {
    const ep = state.currentEndpoint;
    if (!ep) return;
    const spec = API_SPECS[ep.opaCode];

    // 헤더 정보 채우기
    $('#specModalTitle').text(`${ep.name}`);
    $('#specModalOpa').text(ep.opaCode || '');
    $('#specModalOpa').toggle(!!ep.opaCode);

    const methodColors = { GET: '#27ae60', POST: '#2980b9', PUT: '#e67e22', PATCH: '#8e44ad', DELETE: '#e74c3c' };
    const methodHtml = `<span style="font-family:monospace;font-weight:800;color:${methodColors[ep.method] || '#333'}">${ep.method}</span>`;
    $('#specModalPath').html(methodHtml + ' ' + ep.path);

    // 탭 초기화
    currentSpecTab = 'request';
    $('.spec-tab-btn').removeClass('active');
    $('[data-spec-tab="request"]').addClass('active');

    renderSpecContent(ep, spec);
    $('#specModal').addClass('open');
}

function renderSpecContent(ep, spec) {
    const $body = $('#specModalBody').empty();

    if (currentSpecTab === 'request') {
        // ── 헤더 ──
        const headers = (spec && spec.requestHeaders && spec.requestHeaders.length)
            ? spec.requestHeaders
            : (ep.defaultHeaders || []).map(h => ({ key: h.key, required: false, description: h.description, example: h.value }));
        const headersHasNote = headers.some(h => h.note);
        $body.append(makeSpecSection('fa-heading', '요청 헤더 (Request Headers)', makeSpecTable(
            headersHasNote ? ['헤더', '필수', '설명', '예시', '비고'] : ['헤더', '필수', '설명', '예시'],
            headers.map(h => {
                const cols = [
                    `<span class="spec-field-key">${h.key}</span>`,
                    reqBadge(h.required),
                    `<span class="spec-desc">${h.description || ''}</span>`,
                    h.example ? `<code style="font-size:0.78rem;color:#666">${h.example}</code>` : '',
                ];
                if (headersHasNote) cols.push(`<span class="spec-note">${h.note || ''}</span>`);
                return cols;
            })
        )));

        // ── Path 파라미터 ──
        const pathParams = ep.pathParams || [];
        if (pathParams.length) {
            const pathHasNote = pathParams.some(p => p.note);
            $body.append(makeSpecSection('fa-route', 'Path 파라미터', makeSpecTable(
                pathHasNote ? ['파라미터', '필수', '설명', '비고'] : ['파라미터', '필수', '설명'],
                pathParams.map(p => {
                    const cols = [
                        `<span class="spec-field-key">{${p.key}}</span>`,
                        reqBadge(p.required),
                        `<span class="spec-desc">${p.description || ''}</span>`,
                    ];
                    if (pathHasNote) cols.push(`<span class="spec-note">${p.note || ''}</span>`);
                    return cols;
                })
            )));
        }

        // ── Query 파라미터 ──
        const qp = (spec && spec.queryParams) || ep.queryParams || [];
        if (qp.length) {
            const qpHasNote = qp.some(p => p.note);
            $body.append(makeSpecSection('fa-question-circle', 'Query 파라미터', makeSpecTable(
                qpHasNote ? ['파라미터', '타입', '필수', '설명', '비고'] : ['파라미터', '타입', '필수', '설명'],
                qp.map(p => {
                    const cols = [
                        `<span class="spec-field-key">${p.key}</span>`,
                        typeBadge(p.type),
                        reqBadge(p.required),
                        `<span class="spec-desc">${p.description || ''}</span>`,
                    ];
                    if (qpHasNote) cols.push(`<span class="spec-note">${p.note || ''}</span>`);
                    return cols;
                })
            )));
        }

        // ── Request Body ──
        const body = (spec && spec.requestBody) || [];
        if (body.length) {
            const bodyHasNote = body.some(f => f.note);
            $body.append(makeSpecSection('fa-file-code', 'Request Body', makeSpecTable(
                bodyHasNote ? ['필드', '타입', '필수', '설명', '비고'] : ['필드', '타입', '필수', '설명'],
                body.map(f => {
                    const cols = [
                        `<span class="spec-field-key">${f.key}</span>`,
                        typeBadge(f.type),
                        reqBadge(f.required),
                        `<span class="spec-desc">${f.description || ''}</span>`,
                    ];
                    if (bodyHasNote) cols.push(`<span class="spec-note">${f.note || ''}</span>`);
                    return cols;
                })
            )));
        } else if (!pathParams.length && !qp.length) {
            $body.append(`<p class="spec-empty">이 API는 추가 Request 파라미터가 없습니다.</p>`);
        }

    } else {
        // ── Response Fields ──
        const rf = (spec && spec.responseFields) || [];
        if (rf.length) {
            const rfHasNote = rf.some(f => f.note);
            $body.append(makeSpecSection('fa-arrow-right-from-bracket', '응답 필드 (Success)', makeSpecTable(
                rfHasNote ? ['필드', '타입', '설명', '비고'] : ['필드', '타입', '설명'],
                rf.map(f => {
                    const cols = [
                        `<span class="spec-field-key">${f.key}</span>`,
                        typeBadge(f.type),
                        `<span class="spec-desc">${f.description || ''}</span>`,
                    ];
                    if (rfHasNote) cols.push(`<span class="spec-note">${f.note || ''}</span>`);
                    return cols;
                })
            )));
        }

        // ── Error Codes ──
        const errs = (spec && spec.errorCodes) || [];
        if (errs.length) {
            $body.append(makeSpecSection('fa-triangle-exclamation', '에러 코드', makeSpecTable(
                ['코드', '메시지', '설명'],
                errs.map(e => [
                    `<span class="spec-error-code">${e.code}</span>`,
                    `<span class="spec-error-msg">${e.message}</span>`,
                    `<span class="spec-desc">${e.description || ''}</span>`,
                ])
            )));
        }

        if (!rf.length && !errs.length) {
            $body.append(`<p class="spec-empty">명세 정보가 없습니다.</p>`);
        }
    }
}

function makeSpecSection(icon, title, content) {
    return $(`<div class="spec-section">
        <div class="spec-section-title"><i class="fa-solid ${icon} fa-xs"></i> ${title}</div>
    </div>`).append(content);
}

function makeSpecTable(headers, rows) {
    if (!rows.length) return $(`<p class="spec-empty">항목이 없습니다.</p>`);
    const $table = $(`<table class="spec-table"><thead><tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody></tbody></table>`);
    const $tbody = $table.find('tbody');
    rows.forEach(cols => {
        $tbody.append(`<tr>${cols.map(c => `<td>${c}</td>`).join('')}</tr>`);
    });
    return $table;
}

function typeBadge(type) {
    const t = (type || 'string').toLowerCase();
    return `<span class="spec-type-badge spec-type-${t}">${t}</span>`;
}

function reqBadge(required) {
    return required
        ? `<span class="spec-required-badge spec-required-y">필수</span>`
        : `<span class="spec-required-badge spec-required-n">선택</span>`;
}

function closeSpecModal() {
    $('#specModal').removeClass('open');
}

function closeSpecOutside(e) {
    if ($(e.target).is('#specModal')) closeSpecModal();
}

// 탭 전환
$(document).on('click', '.spec-tab-btn', function() {
    currentSpecTab = $(this).data('spec-tab');
    $('.spec-tab-btn').removeClass('active');
    $(this).addClass('active');
    const ep = state.currentEndpoint;
    if (ep) renderSpecContent(ep, API_SPECS[ep.opaCode]);
});
