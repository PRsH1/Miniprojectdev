(function () {
    const DEFAULT_CONFIG = {
        defaultEnvironment: "saas",
        environments: {
            saas: {
                label: "운영 (SaaS)",
                baseUrl: "https://kr-api.eformsign.com"
            },
            csap: {
                label: "공공 (CSAP)",
                baseUrl: "https://www.gov-eformsign.com/Service"
            }
        },
        auth: {
            mode: "accessToken",
            accessToken: "",
            apiKey: "",
            memberId: "",
            secretKey: ""
        },
        data: {
            internalTemplateId: "",
            externalCompanyId: "",
            externalTemplateId: "",
            externalCompanyApiKey: "",
            secondaryTemplateId: "",

            targetRecipient: {
                email: "",
                name: "",
                phone: ""
            },
            secondaryRecipient: {
                email: "",
                name: "",
                phone: ""
            },
            pdfRecipient: {
                name: "PDF 수신자",
                email: "",
                phone: ""
            },

            lookupTargets: {
                downloadDocumentId: "",
                attachDocumentId: ""
            },

            member: {
                id: "test.autorun@example.com"
            },

            commonFields: [],
            secondaryFields: []
        }
    };

    const STORAGE_KEY = "open-api-auto-test-config-v1";
    const storedConfig = readStoredConfig();
    const config = merge(merge(clone(DEFAULT_CONFIG), window.OPEN_API_AUTO_TEST_CONFIG || {}), storedConfig || {});
    const state = {
        activeCode: null,
        filteredCodes: [],
        selectedCodes: new Set(),
        running: false,
        shared: freshShared(),
        token: "",
        companyId: "",
        authMethod: "signature",
        viewMode: "group"
    };
    const els = {};

    const scenarios = [
        { code: "OPA 003", group: "문서", method: "GET", name: "문서 정보 조회", desc: "작성 가능한 템플릿 목록에서 자동 추출한 ID로 문서를 생성한 뒤 기본/상세 조회를 검증합니다.", steps: ["listFormsForSeed", "tryCreateAuto", "docInfoBasic", "docInfoDetail", "cancelDocs", "deleteDocs"], keys: ["auth.mode"] },
        { code: "OPA 004", group: "문서", method: "GET", name: "문서 파일 다운로드", desc: "완료(status_type=003) 문서 목록을 조회하여 최대 5개의 문서 ID를 자동 수집한 뒤 순차적으로 다운로드를 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listCompletedDocsForDownload", "tryDownloadDocAuto"], keys: ["auth.mode"] },
        { code: "OPA 005", group: "문서", method: "POST", name: "새 문서 작성 (내부)", desc: "작성 가능한 템플릿 목록에서 최대 3개를 자동 추출한 뒤 순차적으로 문서 작성을 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listFormsForSeed", "tryCreateAuto", "cancelDocs", "deleteDocs"], keys: ["auth.mode"] },
        { code: "OPA 006", group: "문서", method: "GET", name: "문서 첨부 파일 다운로드", desc: "첨부 파일 포함 문서의 첨부 다운로드를 검증합니다.", steps: ["downloadAttach"], keys: ["auth.mode", "data.attachDocId"] },
        { code: "OPA 007", group: "문서", method: "POST", name: "새 문서 작성 (외부)", desc: "외부 문서를 생성하고 정리합니다. company_id와 API Key는 토큰 발급 정보에서 자동으로 채워집니다.", steps: ["createExternalDoc", "cancelDocs", "deleteDocs"], keys: ["auth.mode", "data.extTemplateId"] },
        { code: "OPA 008", group: "문서", method: "POST", name: "문서 목록 조회", desc: "문서 목록 기본/상세 조회를 검증합니다.", steps: ["listDocsBasic", "listDocsDetail"], keys: ["auth.mode"] },
        { code: "OPA 010", group: "멤버", method: "GET", name: "멤버 목록 조회", desc: "멤버 목록 조회를 검증합니다.", steps: ["listMembers"], keys: ["auth.mode"] },
        { code: "OPA 011", group: "멤버", method: "POST", name: "멤버 추가", desc: "테스트 멤버를 추가하고 정리합니다.", steps: ["createMember", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 012", group: "멤버", method: "PATCH", name: "멤버 수정", desc: "테스트 멤버를 생성, 수정 후 정리합니다.", steps: ["createMember", "updateMember", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 013", group: "멤버", method: "DELETE", name: "멤버 삭제", desc: "테스트 멤버를 생성한 뒤 삭제를 검증합니다.", steps: ["createMember", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 014", group: "문서", method: "POST", name: "수신자 문서 재요청", desc: "작성 가능한 템플릿 목록에서 자동 추출한 ID로 문서를 생성한 뒤 수신자 재요청을 검증합니다.", steps: ["listFormsForSeed", "tryCreateAuto", "rerequestDoc", "cancelDocs", "deleteDocs"], keys: ["auth.mode", "data.targetEmail"] },
        { code: "OPA 015", group: "문서", method: "GET", name: "작성 가능한 템플릿 목록", desc: "작성 가능한 템플릿 목록을 조회합니다.", steps: ["listForms"], keys: ["auth.mode"] },
        { code: "OPA 016", group: "문서", method: "POST", name: "문서 일괄 작성", desc: "작성 가능한 템플릿 목록에서 최대 3개를 자동 추출한 뒤 순차적으로 일괄 문서 작성을 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listFormsForSeed", "tryMassCreateAuto", "cancelDocs", "deleteDocs"], keys: ["auth.mode"] },
        { code: "OPA 017", group: "그룹", method: "GET", name: "그룹 목록 조회", desc: "그룹 목록 조회를 검증합니다.", steps: ["listGroups"], keys: ["auth.mode"] },
        { code: "OPA 018", group: "그룹", method: "POST", name: "그룹 추가", desc: "테스트 그룹 생성 후 정리합니다.", steps: ["createMember", "createGroup", "deleteGroup", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 019", group: "그룹", method: "PATCH", name: "그룹 수정", desc: "테스트 그룹 생성, 수정 후 정리합니다.", steps: ["createMember", "createGroup", "updateGroup", "deleteGroup", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 020", group: "그룹", method: "DELETE", name: "그룹 삭제", desc: "테스트 그룹 생성 후 삭제를 검증합니다.", steps: ["createMember", "createGroup", "deleteGroup", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 021", group: "문서", method: "POST", name: "문서 일괄 작성 (멀티)", desc: "작성 가능한 템플릿 목록에서 자동 추출한 ID 조합으로 멀티 일괄 문서 작성을 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listFormsForSeed", "tryMassCreateMultiAuto", "cancelDocs", "deleteDocs"], keys: ["auth.mode"] },
        { code: "OPA 025", group: "회사 도장", method: "GET", name: "회사 도장 정보 조회", desc: "도장 목록을 먼저 조회한 뒤 상세를 검증합니다.", steps: ["listStamps", "stampDetail"], keys: ["auth.mode"] },
        { code: "OPA 029", group: "회사 도장", method: "GET", name: "회사 도장 목록 조회", desc: "회사 도장 목록 조회를 검증합니다.", steps: ["listStamps"], keys: ["auth.mode"] },
        { code: "OPA 030", group: "멤버", method: "POST", name: "멤버 일괄 추가", desc: "일괄 멤버 추가와 정리를 검증합니다.", steps: ["bulkCreateMembers", "cleanupBulk1", "cleanupBulk2"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 037", group: "문서", method: "POST", name: "일괄 완료 문서 PDF 전송", desc: "완료 문서 최대 5개를 수집한 뒤 2개 조합으로 PDF 전송을 시도하고, 하나라도 성공하면 통과합니다. company_id는 토큰 발급 정보에서 자동으로 채워집니다.", steps: ["listDocsBasic", "trySendPdfAuto"], keys: ["auth.mode", "data.pdfTargetEmail"] },
        { code: "OPA 040", group: "문서", method: "POST", name: "문서 파일 일괄 다운로드", desc: "완료 문서 최대 5개를 수집한 뒤 2개 조합으로 일괄 다운로드를 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listDocsBasic", "tryDownloadMultiAuto"], keys: ["auth.mode"] },
        { code: "OPA 042", group: "문서", method: "POST", name: "문서 취소", desc: "작성 가능한 템플릿 목록에서 자동 추출한 ID로 문서를 생성한 뒤 취소 API를 검증합니다.", steps: ["listFormsForSeed", "tryCreateAuto", "cancelDocs", "deleteDocs"], keys: ["auth.mode"] },
        { code: "OPA 045", group: "문서", method: "POST", name: "완료 토큰 기한 연장", desc: "완료 문서 최대 5개를 수집한 뒤 순차적으로 기한 연장을 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listDocsBasic", "tryRefreshCompleteTokenAuto"], keys: ["auth.mode"] }
    ];

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        [
            "envSelect", "baseUrlBadge", "configBadge", "scenarioSearch", "scenarioList", "selectAllBtn", "clearAllBtn",
            "runActiveBtn", "runSelectedBtn", "selectedCount", "plannedStepCount", "readinessLabel", "lastRunSummary",
            "activeScenarioTitle", "activeScenarioDescription", "activeScenarioMissing", "missingSectionWrap", "pipelineList", "configStatusList", "progressText", "progressBar", "resultTableBody",
            "settingsEditor", "saveSettingsBtn", "reloadSettingsBtn", "resetSettingsBtn", "settingsStatusText",
            "openSettingsModalBtn", "openSettingsModalBtnInline", "closeSettingsModalBtn", "settingsModalCard", "settingsModalOverlay", "settingsSummaryText",
            "authPanelToggle", "authPanelBody", "authChevron", "authStatusBadge",
            "authApiKey", "authMemberId", "authSecretKey", "authSecretLabel",
            "authTabSignature", "authTabBearer",
            "btnIssueToken", "btnClearToken", "authTokenDisplay", "authCompanyIdDisplay", "authCompanyIdValue",
            "modalIssueTokenBtn", "modalClearTokenBtn", "modalTokenDisplay", "modalCompanyIdDisplay", "modalCompanyIdValue",
            "sortGroupBtn", "sortOpaBtn"
        ].forEach((id) => { els[id] = document.getElementById(id); });

        Object.entries(config.environments || {}).forEach(([key, value]) => {
            els.envSelect.insertAdjacentHTML("beforeend", `<option value="${esc(key)}">${esc(value.label || key)}</option>`);
        });
        els.envSelect.value = config.defaultEnvironment in config.environments ? config.defaultEnvironment : Object.keys(config.environments)[0];

        scenarios.forEach((scenario) => state.selectedCodes.add(scenario.code));
        state.activeCode = scenarios[0] ? scenarios[0].code : null;

        initAuthPanel();

        els.envSelect.addEventListener("change", refreshStatus);
        els.scenarioSearch.addEventListener("input", refreshAll);
        els.selectAllBtn.addEventListener("click", () => { scenarios.forEach((s) => state.selectedCodes.add(s.code)); refreshAll(); });
        els.clearAllBtn.addEventListener("click", () => { state.selectedCodes.clear(); refreshAll(); });
        els.sortGroupBtn.addEventListener("click", () => { state.viewMode = "group"; els.sortGroupBtn.classList.add("active"); els.sortOpaBtn.classList.remove("active"); renderList(); });
        els.sortOpaBtn.addEventListener("click", () => { state.viewMode = "opa"; els.sortOpaBtn.classList.add("active"); els.sortGroupBtn.classList.remove("active"); renderList(); });
        els.runSelectedBtn.addEventListener("click", () => runSet([...state.selectedCodes]));
        els.runActiveBtn.addEventListener("click", () => state.activeCode && runSet([state.activeCode]));
        els.saveSettingsBtn.addEventListener("click", saveSettingsFromEditor);
        els.reloadSettingsBtn.addEventListener("click", loadSettingsIntoEditor);
        els.resetSettingsBtn.addEventListener("click", resetStoredSettings);

        hydrateGuideContent();
        loadSettingsIntoEditor();
        refreshAll();
    }

    function refreshAll() {
        renderList();
        renderDetail();
        renderConfig();
        renderHistory();
        renderSettingsSummary();
        refreshStatus();
    }

    function refreshStatus() {
        const checks = globalChecks();
        const readyCount = scenarios.filter((s) => readiness(s).ready).length;
        els.baseUrlBadge.textContent = baseUrl();
        els.configBadge.textContent = checks.every((c) => c.ready) ? "자동 실행 가능" : `설정 ${checks.filter((c) => !c.ready).length}개 누락`;
        els.configBadge.style.color = checks.every((c) => c.ready) ? "#84f2b2" : "#ffd269";
        els.selectedCount.textContent = `${state.selectedCodes.size}개`;
        els.plannedStepCount.textContent = `${plan([...state.selectedCodes]).length}개`;
        els.readinessLabel.textContent = `${readyCount}/${scenarios.length} 준비`;
    }

    function renderList() {
        const keyword = (els.scenarioSearch.value || "").trim().toLowerCase();
        const filtered = scenarios.filter((s) => !keyword || [s.code, s.name, s.group].some((v) => v.toLowerCase().includes(keyword)));
        state.filteredCodes = filtered.map((scenario) => scenario.code);
        if (!filtered.length) {
            state.activeCode = null;
        } else if (!state.activeCode || !state.filteredCodes.includes(state.activeCode)) {
            state.activeCode = filtered[0].code;
        }
        let listHtml;
        if (state.viewMode === "opa") {
            const sorted = [...filtered].sort((a, b) => {
                const numA = parseInt(a.code.replace(/\D/g, ""), 10);
                const numB = parseInt(b.code.replace(/\D/g, ""), 10);
                return numA - numB;
            });
            listHtml = sorted.map(renderItem).join("") || `<div class="api-group-header">검색 결과 없음</div>`;
        } else {
            const groups = filtered.reduce((acc, item) => {
                (acc[item.group] ||= []).push(item);
                return acc;
            }, {});
            listHtml = Object.keys(groups).sort().map((group) => `
                <div class="api-group">
                    <div class="api-group-header">${esc(group)}</div>
                    ${groups[group].map(renderItem).join("")}
                </div>
            `).join("") || `<div class="api-group-header">검색 결과 없음</div>`;
        }

        els.scenarioList.innerHTML = listHtml;

        els.scenarioList.querySelectorAll(".scenario-item").forEach((item) => {
            const code = item.getAttribute("data-code");
            const checkbox = item.querySelector("input");
            item.addEventListener("click", (event) => {
                if (event.target !== checkbox) {
                    state.activeCode = code;
                    renderList();
                    renderDetail();
                    refreshStatus();
                }
            });
            checkbox.addEventListener("click", (event) => {
                event.stopPropagation();
                if (checkbox.checked) state.selectedCodes.add(code);
                else state.selectedCodes.delete(code);
                renderList();
                renderDetail();
                refreshStatus();
            });
        });
    }

    function renderItem(s) {
        const r = readiness(s);
        return `<div class="scenario-item ${state.activeCode === s.code ? "active" : ""}" data-code="${esc(s.code)}">
            <div class="scenario-check">
                <input type="checkbox" ${state.selectedCodes.has(s.code) ? "checked" : ""}>
                <div class="scenario-main">
                    <div class="scenario-top">
                        <span class="scenario-code">${esc(s.code)}</span>
                        <span class="method-chip ${methodClass(s.method)}">${esc(s.method)}</span>
                    </div>
                    <div class="scenario-name">${esc(s.name)}</div>
                    <div class="scenario-meta">
                        <span class="mini-badge ${r.ready ? "ready" : "warn"}">${r.ready ? "준비됨" : "설정 필요"}</span>
                        <span class="mini-badge">${s.steps.length} steps</span>
                    </div>
                </div>
            </div>
        </div>`;
    }

    function renderConfig() {
        els.configStatusList.innerHTML = globalChecks().map((check) => `
            <div class="config-row">
                <span class="config-key">${esc(check.label)}</span>
                <span class="config-value ${check.ready ? "ready" : "missing"}">${esc(check.message)}</span>
            </div>
        `).join("");
    }

    function stepMeta(id) {
        const dict = {
            seedInternalDoc: ["POST", "새 문서 작성 (OPA 005 - 내부 seed)"],
            listFormsForSeed: ["GET", "작성 가능한 템플릿 목록 조회 (자동 탐색)"],
            tryCreateAuto: ["POST", "새 문서 작성 (자동 선택 - 최대 3개 시도)"],
            tryMassCreateAuto: ["POST", "문서 일괄 작성 (자동 선택 - 최대 3개 시도)"],
            tryMassCreateMultiAuto: ["POST", "문서 일괄 작성 - 멀티 (자동 선택 조합 시도)"],
            docInfoBasic: ["GET", "문서 정보 조회 - 기본"],
            docInfoDetail: ["GET", "문서 정보 조회 - 상세"],
            listCompletedDocsForDownload: ["POST", "완료 문서 목록 조회 (자동 탐색 - status 003)"],
            tryDownloadDocAuto: ["GET", "문서 파일 다운로드 (자동 선택 - 최대 5개 시도)"],
            downloadDoc: ["GET", "문서 파일 다운로드"],
            downloadAttach: ["GET", "문서 첨부 파일 다운로드"],
            createExternalDoc: ["POST", "새 문서 작성 (외부)"],
            listDocsBasic: ["POST", "문서 목록 조회 - 기본"],
            listDocsDetail: ["POST", "문서 목록 조회 - 상세"],
            listMembers: ["GET", "멤버 목록 조회"],
            createMember: ["POST", "멤버 추가"],
            updateMember: ["PATCH", "멤버 수정"],
            deleteMember: ["DELETE", "멤버 삭제"],
            rerequestDoc: ["POST", "수신자 문서 재요청"],
            listForms: ["GET", "작성 가능한 템플릿 목록 조회"],
            massCreateDocs: ["POST", "문서 일괄 작성"],
            listGroups: ["GET", "그룹 목록 조회"],
            createGroup: ["POST", "그룹 추가"],
            updateGroup: ["PATCH", "그룹 수정"],
            deleteGroup: ["DELETE", "그룹 삭제"],
            massCreateMultiDocs: ["POST", "문서 일괄 작성 - 멀티 템플릿"],
            listStamps: ["GET", "회사 도장 목록 조회"],
            stampDetail: ["GET", "회사 도장 정보 조회"],
            bulkCreateMembers: ["POST", "멤버 일괄 추가"],
            tryRefreshCompleteTokenAuto: ["POST", "완료 토큰 기한 연장 (자동 선택 - 최대 5개 시도)"],
            tryDownloadMultiAuto: ["POST", "문서 파일 일괄 다운로드 (자동 선택 - 2개 조합 시도)"],
            trySendPdfAuto: ["POST", "일괄 완료 문서 PDF 전송 (자동 선택 - 2개 조합 시도)"],
            sendPdf: ["POST", "일괄 완료 문서 PDF 전송"],
            downloadMulti: ["POST", "문서 파일 일괄 다운로드"],
            refreshCompleteToken: ["POST", "완료 토큰 기한 연장"],
            cleanupBulk1: ["DELETE", "일괄 멤버 정리 1"],
            cleanupBulk2: ["DELETE", "일괄 멤버 정리 2"],
            cancelDocs: ["POST", "문서 취소 정리"],
            deleteDocs: ["DELETE", "문서 삭제 정리"]
        };
        const meta = dict[id] || ["GET", id];
        return { method: meta[0], label: meta[1] };
    }

    async function runStep(id) {
        const d = data();
        if (id === "seedInternalDoc") return request({ id, method: "POST", path: `/v2.0/api/documents?template_id=${encodeURIComponent(must(d.targetTemplateId, "Template ID가 비어 있습니다."))}`, body: docBody(), ok: [200], after: (json) => rememberDoc(json) });
        if (id === "docInfoBasic") return request({ id, method: "GET", path: `/v2.0/api/documents/${must(state.shared.lastCreatedId, "조회할 문서 ID가 없습니다.")}`, ok: [200] });
        if (id === "docInfoDetail") return request({ id, method: "GET", path: `/v2.0/api/documents/${must(state.shared.lastCreatedId, "조회할 문서 ID가 없습니다.")}?include_fields=true&include_histories=true&include_previous_status=true&include_next_status=true&include_external_token=true&include_detail_template_info=true`, ok: [200] });
        if (id === "listCompletedDocsForDownload") return request({ id, method: "POST", path: "/v2.0/api/list_document", body: listBody(), ok: [200], after: (json) => {
            const docs = Array.isArray(json.documents) ? json.documents : [];
            state.shared.candidateDocIds = docs.filter((doc) => doc.current_status && doc.current_status.status_type === "003").slice(0, 5).map((doc) => doc.id);
            if (!state.shared.candidateDocIds.length) throw new Error("다운로드 가능한 완료 문서(status_type=003)가 없습니다. 계정에 완료된 문서가 있는지 확인해 주세요.");
        } });
        if (id === "tryDownloadDocAuto") {
            const candidates = state.shared.candidateDocIds || [];
            if (!candidates.length) throw new Error("시도할 문서 ID가 없습니다. listCompletedDocsForDownload 단계가 먼저 실행되어야 합니다.");
            const attemptLog = [];
            for (const docId of candidates) {
                const result = await request({ id, method: "GET", path: `/v2.0/api/documents/${encodeURIComponent(docId)}/download_files?file_type=document,audit_trail`, ok: [200] });
                attemptLog.push(`[${docId}] → ${result.statusType} ${result.responseStatus}`);
                if (result.statusType === "PASS") {
                    return { ...result, label: `문서 파일 다운로드 (자동 선택: ...${docId.slice(-8)})`, responseText: `시도 결과 (${candidates.length}개 중 성공):\n${attemptLog.join("\n")}\n\n--- 응답 ---\n${result.responseText}` };
                }
            }
            return { statusType: "FAIL", responseStatus: "ALL_FAIL", method: "GET", label: stepMeta(id).label, url: `${baseUrl()}/v2.0/api/documents/.../download_files`, duration: "-", requestBody: null, responseText: `${candidates.length}개 문서 모두 실패:\n${attemptLog.join("\n")}` };
        }
        if (id === "downloadDoc") return request({ id, method: "GET", path: `/v2.0/api/documents/${encodeURIComponent(must(d.downloadDocId, "downloadDocId가 비어 있습니다."))}/download_files?file_type=document,audit_trail`, ok: [200] });
        if (id === "downloadAttach") return request({ id, method: "GET", path: `/v2.0/api/documents/${encodeURIComponent(must(d.attachDocId, "attachDocId가 비어 있습니다."))}/download_attach_files`, ok: [200] });
        if (id === "createExternalDoc") return request({ id, method: "POST", useToken: false, headers: { Authorization: `Bearer ${btoa(must(d.companyApiKey, "companyApiKey가 비어 있습니다."))}` }, path: `/v2.0/api/documents/external?company_id=${encodeURIComponent(must(d.companyId, "companyId가 비어 있습니다."))}&template_id=${encodeURIComponent(must(d.extTemplateId, "extTemplateId가 비어 있습니다."))}`, body: docBody(), ok: [200], after: (json) => rememberDoc(json) });
        if (id === "listDocsBasic") return request({ id, method: "POST", path: "/v2.0/api/list_document", body: listBody(), ok: [200], after: (json) => { const docs = Array.isArray(json.documents) ? json.documents : []; state.shared.completedDocIds = docs.filter((doc) => doc.current_status && doc.current_status.status_type === "003").slice(0, 5).map((doc) => doc.id); } });
        if (id === "listDocsDetail") return request({ id, method: "POST", path: "/v2.0/api/list_document?include_fields=true&include_histories=true&include_previous_status=true&include_next_status=true&include_external_token=true&include_detail_template_info=true", body: listBody(), ok: [200] });
        if (id === "listMembers") return request({ id, method: "GET", path: "/v2.0/api/members", ok: [200] });
        if (id === "createMember") return request({ id, method: "POST", path: "/v2.0/api/members?mailOption=false", body: { account: { id: must(d.memberId, "memberId가 비어 있습니다."), password: "forcs1700!@", first_name: "자동", last_name: "테스트", external_sso_info: { uuid: "123", account_id: "test" } } }, ok: [200, 400] });
        if (id === "updateMember") return request({ id, method: "PATCH", path: `/v2.0/api/members/${encodeURIComponent(must(d.memberId, "memberId가 비어 있습니다."))}`, body: { account: { id: d.memberId, name: "자동수정 테스트", enabled: true, contact: { number: "010-1111-1111", tel: "02-1234-5678" }, department: "테스트팀", position: "자동화", role: ["template_manager"] } }, ok: [200] });
        if (id === "deleteMember") return request({ id, method: "DELETE", path: `/v2.0/api/members/${encodeURIComponent(must(d.memberId, "memberId가 비어 있습니다."))}`, ok: [200, 400, 404] });
        if (id === "rerequestDoc") return request({ id, method: "POST", path: `/v2.0/api/documents/${must(state.shared.lastCreatedId, "재요청 대상 문서가 없습니다.")}/re_request_outsider`, body: rerequestBody(), ok: [200] });
        if (id === "listForms") return request({ id, method: "GET", path: "/v2.0/api/forms", ok: [200] });
        if (id === "listFormsForSeed") return request({ id, method: "GET", path: "/v2.0/api/forms", ok: [200], after: (json) => {
            const forms = Array.isArray(json.templates) ? json.templates : [];
            state.shared.candidateTemplateIds = forms.filter((f) => f.enabled !== false).slice(0, 3).map((f) => f.form_id);
            if (!state.shared.candidateTemplateIds.length) throw new Error("작성 가능한 템플릿이 없습니다. 계정에 활성화된 템플릿을 확인해 주세요.");
        } });
        if (id === "tryCreateAuto") {
            const candidates = state.shared.candidateTemplateIds || [];
            if (!candidates.length) throw new Error("시도할 템플릿 ID가 없습니다. listFormsForSeed 단계가 먼저 실행되어야 합니다.");
            const attemptLog = [];
            for (const templateId of candidates) {
                const result = await request({ id, method: "POST", path: `/v2.0/api/documents?template_id=${encodeURIComponent(templateId)}`, body: docBody(), ok: [200], after: (json) => rememberDoc(json) });
                attemptLog.push(`[${templateId}] → ${result.statusType} ${result.responseStatus}`);
                if (result.statusType === "PASS") {
                    return { ...result, label: `새 문서 작성 (자동 선택: ${templateId})`, responseText: `시도 결과 (${candidates.length}개 중 성공):\n${attemptLog.join("\n")}\n\n--- 응답 ---\n${result.responseText}` };
                }
            }
            return { statusType: "FAIL", responseStatus: "ALL_FAIL", method: "POST", label: stepMeta(id).label, url: `${baseUrl()}/v2.0/api/documents`, duration: "-", requestBody: null, responseText: `${candidates.length}개 템플릿 모두 실패:\n${attemptLog.join("\n")}` };
        }
        if (id === "tryMassCreateAuto") {
            const candidates = state.shared.candidateTemplateIds || [];
            if (!candidates.length) throw new Error("시도할 템플릿 ID가 없습니다. listFormsForSeed 단계가 먼저 실행되어야 합니다.");
            const attemptLog = [];
            for (const templateId of candidates) {
                const result = await request({ id, method: "POST", path: `/v2.0/api/forms/mass_documents?template_id=${encodeURIComponent(templateId)}`, body: massBody(), ok: [200], after: collectDocs });
                attemptLog.push(`[${templateId}] → ${result.statusType} ${result.responseStatus}`);
                if (result.statusType === "PASS") {
                    return { ...result, label: `문서 일괄 작성 (자동 선택: ${templateId})`, responseText: `시도 결과 (${candidates.length}개 중 성공):\n${attemptLog.join("\n")}\n\n--- 응답 ---\n${result.responseText}` };
                }
            }
            return { statusType: "FAIL", responseStatus: "ALL_FAIL", method: "POST", label: stepMeta(id).label, url: `${baseUrl()}/v2.0/api/forms/mass_documents`, duration: "-", requestBody: null, responseText: `${candidates.length}개 템플릿 모두 실패:\n${attemptLog.join("\n")}` };
        }
        if (id === "tryMassCreateMultiAuto") {
            const candidates = state.shared.candidateTemplateIds || [];
            if (!candidates.length) throw new Error("시도할 템플릿 ID가 없습니다. listFormsForSeed 단계가 먼저 실행되어야 합니다.");
            const combos = [];
            for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) combos.push([candidates[i], candidates[j]]);
            if (!combos.length) combos.push([candidates[0], candidates[0]]);
            const attemptLog = [];
            for (const [tId1, tId2] of combos) {
                const body = { documents: [
                    { template_id: tId1, ...innerDoc(d.targetEmail, d.targetName, d.targetPhone, d.commonFields || []) },
                    { template_id: tId2, ...innerDoc(d.targetEmail2, d.targetName2, d.targetPhone2, d.doc2Fields || []) }
                ] };
                const result = await request({ id, method: "POST", path: "/v2.0/api/forms/mass_multi_documents", body, ok: [200], after: collectDocs });
                attemptLog.push(`[${tId1} + ${tId2}] → ${result.statusType} ${result.responseStatus}`);
                if (result.statusType === "PASS") {
                    return { ...result, label: `문서 일괄 작성 - 멀티 (자동 선택: ${tId1.slice(-8)} + ${tId2.slice(-8)})`, responseText: `시도 결과:\n${attemptLog.join("\n")}\n\n--- 응답 ---\n${result.responseText}` };
                }
            }
            return { statusType: "FAIL", responseStatus: "ALL_FAIL", method: "POST", label: stepMeta(id).label, url: `${baseUrl()}/v2.0/api/forms/mass_multi_documents`, duration: "-", requestBody: null, responseText: `${combos.length}개 조합 모두 실패:\n${attemptLog.join("\n")}` };
        }
        if (id === "massCreateDocs") return request({ id, method: "POST", path: `/v2.0/api/forms/mass_documents?template_id=${encodeURIComponent(must(d.targetTemplateId, "Template ID가 비어 있습니다."))}`, body: massBody(), ok: [200], after: collectDocs });
        if (id === "listGroups") return request({ id, method: "GET", path: "/v2.0/api/groups", ok: [200] });
        if (id === "createGroup") return request({ id, method: "POST", path: "/v2.0/api/groups", body: { group: { name: "자동테스트 그룹", description: "Open API 자동 테스트", members: [must(d.memberId, "memberId가 비어 있습니다.")] } }, ok: [200], after: (json) => { if (json.group && json.group.id) state.shared.createdGroupId = json.group.id; } });
        if (id === "updateGroup") return request({ id, method: "PATCH", path: `/v2.0/api/groups/${must(state.shared.createdGroupId, "수정할 그룹 ID가 없습니다.")}`, body: { group: { name: "자동테스트 그룹 수정", description: "Open API 자동 테스트 수정", members: [must(d.memberId, "memberId가 비어 있습니다.")] } }, ok: [200] });
        if (id === "deleteGroup") return request({ id, method: "DELETE", path: "/v2.0/api/groups", body: { group_ids: [must(state.shared.createdGroupId, "삭제할 그룹 ID가 없습니다.")] }, ok: [200, 400, 404] });
        if (id === "massCreateMultiDocs") return request({ id, method: "POST", path: "/v2.0/api/forms/mass_multi_documents", body: multiMassBody(), ok: [200], after: collectDocs });
        if (id === "listStamps") return request({ id, method: "GET", path: "/v2.0/api/company_stamp", ok: [200], after: (json) => { const first = Array.isArray(json.company_stamps) ? json.company_stamps[0] : null; state.shared.companyStampId = first ? first.id : null; } });
        if (id === "stampDetail") return request({ id, method: "GET", path: `/v2.0/api/company_stamp/${must(state.shared.companyStampId, "조회할 회사 도장 ID가 없습니다.")}`, ok: [200] });
        if (id === "bulkCreateMembers") return request({ id, method: "POST", path: "/v2.0/api/list_members", body: bulkBody(), ok: [200], after: (json) => { const failed = (json.members || []).filter((m) => m.success === false); if (failed.length) throw new Error("일괄 멤버 추가 응답에 success:false 항목이 포함되었습니다."); } });
        if (id === "tryRefreshCompleteTokenAuto") {
            const candidates = state.shared.completedDocIds || [];
            if (!candidates.length) throw new Error("시도할 완료 문서가 없습니다. listDocsBasic 단계가 먼저 실행되어야 합니다.");
            const attemptLog = [];
            for (const docId of candidates) {
                const result = await request({ id, method: "POST", path: `/v2.0/api/documents/${encodeURIComponent(docId)}/refresh_complete_token`, body: { step_seq: [] }, ok: [200] });
                attemptLog.push(`[...${docId.slice(-8)}] → ${result.statusType} ${result.responseStatus}`);
                if (result.statusType === "PASS") {
                    return { ...result, label: `완료 토큰 기한 연장 (자동: ...${docId.slice(-8)})`, responseText: `시도 결과 (${candidates.length}개 중 성공):\n${attemptLog.join("\n")}\n\n--- 응답 ---\n${result.responseText}` };
                }
            }
            return { statusType: "FAIL", responseStatus: "ALL_FAIL", method: "POST", label: stepMeta(id).label, url: `${baseUrl()}/v2.0/api/documents/.../refresh_complete_token`, duration: "-", requestBody: null, responseText: `${candidates.length}개 문서 모두 실패:\n${attemptLog.join("\n")}` };
        }
        if (id === "tryDownloadMultiAuto") {
            const candidates = state.shared.completedDocIds || [];
            if (!candidates.length) throw new Error("시도할 완료 문서가 없습니다. listDocsBasic 단계가 먼저 실행되어야 합니다.");
            const pairs = [];
            for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) pairs.push([candidates[i], candidates[j]]);
            if (!pairs.length) pairs.push([candidates[0]]);
            const attemptLog = [];
            for (const pair of pairs) {
                const body = { document_ids: pair, file_type: ["document", "audit_trail"] };
                const result = await request({ id, method: "POST", path: "/v2.0/api/documents/download_multi_files", body, ok: [200] });
                attemptLog.push(`[${pair.map((pid) => "..." + pid.slice(-8)).join(" + ")}] → ${result.statusType} ${result.responseStatus}`);
                if (result.statusType === "PASS") {
                    return { ...result, label: `문서 파일 일괄 다운로드 (자동: ${pair.length}개)`, responseText: `시도 결과:\n${attemptLog.join("\n")}\n\n--- 응답 ---\n${result.responseText}` };
                }
            }
            return { statusType: "FAIL", responseStatus: "ALL_FAIL", method: "POST", label: stepMeta(id).label, url: `${baseUrl()}/v2.0/api/documents/download_multi_files`, duration: "-", requestBody: null, responseText: `${pairs.length}개 조합 모두 실패:\n${attemptLog.join("\n")}` };
        }
        if (id === "trySendPdfAuto") {
            const candidates = state.shared.completedDocIds || [];
            if (!candidates.length) throw new Error("시도할 완료 문서가 없습니다. listDocsBasic 단계가 먼저 실행되어야 합니다.");
            const pairs = [];
            for (let i = 0; i < candidates.length; i++) for (let j = i + 1; j < candidates.length; j++) pairs.push([candidates[i], candidates[j]]);
            if (!pairs.length) pairs.push([candidates[0], candidates[0]]);
            const attemptLog = [];
            for (const [docId1, docId2] of pairs) {
                const sendPdfs = [];
                if (d.pdfTargetEmail) sendPdfs.push({ document_id: docId1, pdf_send_infos: [{ name: d.pdfTargetName || "PDF 수신자", method: "email", method_info: d.pdfTargetEmail, sms_option: {} }] });
                if (d.pdfTargetPhone) sendPdfs.push({ document_id: docId2, pdf_send_infos: [{ name: d.pdfTargetName || "PDF 수신자", method: "sms", method_info: d.pdfTargetPhone, code: "+82", sms_option: {} }] });
                if (!sendPdfs.length) throw new Error("pdfTargetEmail 또는 pdfTargetPhone 중 하나는 필요합니다.");
                const body = { input: { send_pdfs: sendPdfs } };
                const result = await request({ id, method: "POST", path: `/v2.0/api/companies/${encodeURIComponent(must(d.companyId, "companyId가 비어 있습니다."))}/send_multiple_completed_document`, body, ok: [200] });
                attemptLog.push(`[...${docId1.slice(-8)} + ...${docId2.slice(-8)}] → ${result.statusType} ${result.responseStatus}`);
                if (result.statusType === "PASS") {
                    return { ...result, label: `일괄 완료 문서 PDF 전송 (자동: 2개)`, responseText: `시도 결과:\n${attemptLog.join("\n")}\n\n--- 응답 ---\n${result.responseText}` };
                }
            }
            return { statusType: "FAIL", responseStatus: "ALL_FAIL", method: "POST", label: stepMeta(id).label, url: `${baseUrl()}/v2.0/api/companies/.../send_multiple_completed_document`, duration: "-", requestBody: null, responseText: `${pairs.length}개 조합 모두 실패:\n${attemptLog.join("\n")}` };
        }
        if (id === "sendPdf") return request({ id, method: "POST", path: `/v2.0/api/companies/${encodeURIComponent(must(d.companyId, "companyId가 비어 있습니다."))}/send_multiple_completed_document`, body: sendPdfBody(), ok: [200] });
        if (id === "downloadMulti") return request({ id, method: "POST", path: "/v2.0/api/documents/download_multi_files", body: multiDownloadBody(), ok: [200] });
        if (id === "refreshCompleteToken") return request({ id, method: "POST", path: `/v2.0/api/documents/${pickCompleted()}/refresh_complete_token`, body: { step_seq: [] }, ok: [200] });
        if (id === "cleanupBulk1") return request({ id, method: "DELETE", path: `/v2.0/api/members/${encodeURIComponent(must(state.shared.bulkMemberIds[0], "정리할 bulk member 1이 없습니다."))}`, ok: [200, 404] });
        if (id === "cleanupBulk2") return request({ id, method: "DELETE", path: `/v2.0/api/members/${encodeURIComponent(must(state.shared.bulkMemberIds[1], "정리할 bulk member 2가 없습니다."))}`, ok: [200, 404] });
        if (id === "cancelDocs") return request({ id, method: "POST", path: "/v2.0/api/documents/cancel", body: { input: { document_ids: must(state.shared.createdIdList, "취소할 문서가 없습니다.") } }, ok: [200, 400] });
        if (id === "deleteDocs") return request({ id, method: "DELETE", path: "/v2.0/api/documents", body: { document_ids: must(state.shared.createdIdList, "삭제할 문서가 없습니다.") }, ok: [200, 400] });
        throw new Error(`정의되지 않은 step: ${id}`);
    }

    async function token() {
        if (state.token) return state.token;

        // 인증 패널 우선 사용
        const panelApiKey = els.authApiKey ? els.authApiKey.value.trim() : "";
        const panelMemberId = els.authMemberId ? els.authMemberId.value.trim() : "";
        const panelSecretKey = els.authSecretKey ? els.authSecretKey.value.trim() : "";

        if (state.authMethod === "bearer" && panelSecretKey) {
            state.token = panelSecretKey;
            updateAuthPanelUI();
            return state.token;
        }

        if (state.authMethod === "signature" && panelApiKey && panelMemberId && panelSecretKey) {
            return await issueTokenFromPanel(panelApiKey, panelMemberId, panelSecretKey);
        }

        // 인증 패널 미입력 시 설정(config) 폴백
        const auth = config.auth || {};
        if (auth.mode === "accessToken" || auth.mode === "bearer") {
            state.token = must(auth.accessToken, "auth.accessToken이 비어 있습니다. 상단 인증 패널에서 토큰을 발급받으세요.");
            return state.token;
        }
        if (auth.mode !== "signature") throw new Error("상단 인증 패널에서 인증 정보를 입력하고 토큰을 발급받으세요.");
        return await issueTokenFromPanel(
            must(auth.apiKey, "API Key가 비어 있습니다. 상단 인증 패널에서 입력하세요."),
            must(auth.memberId, "Member ID가 비어 있습니다. 상단 인증 패널에서 입력하세요."),
            must(auth.secretKey, "Secret Key가 비어 있습니다. 상단 인증 패널에서 입력하세요.")
        );
    }

    async function issueTokenFromPanel(apiKey, memberId, secretKey) {
        const execTime = Date.now();
        const keyObj = KEYUTIL.getKeyFromPlainPrivatePKCS8Hex(secretKey);
        const sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
        sig.init(keyObj);
        sig.updateString(execTime.toString());
        const signature = sig.sign();

        const response = await fetch("/api/getToken", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ domain: baseUrl(), apiKey, memberId, signature, execTime })
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.message || payload.ErrorMessage || "Access Token 발급에 실패했습니다.");
        state.token = must(payload?.oauth_token?.access_token, "응답에서 access_token을 찾지 못했습니다.");
        const cid = payload?.api_key?.company?.company_id;
        if (cid) state.companyId = cid;
        updateAuthPanelUI();
        return state.token;
    }

    async function request({ id, method, path, body, ok, after, headers, useToken = true }) {
        const requestHeaders = {
            "Content-Type": "application/json",
            ...(useToken ? { Authorization: `Bearer ${await token()}` } : {}),
            ...(headers || {})
        };
        const options = { method, headers: requestHeaders };
        if (body !== undefined && body !== null) options.body = JSON.stringify(body);

        const url = `${baseUrl()}${path}`;
        const start = performance.now();
        const response = await fetch(url, options);
        const duration = `${Math.round(performance.now() - start)}ms`;
        const type = response.headers.get("content-type") || "";
        let text = "";
        let json = null;
        if (["pdf", "zip", "octet-stream", "image"].some((keyword) => type.includes(keyword))) {
            const blob = await response.blob();
            text = `[Binary File] ${type} (${blob.size} bytes)`;
        } else {
            text = await response.text();
            try { json = JSON.parse(text); text = JSON.stringify(json, null, 2); } catch (error) {}
        }
        const statusType = ok.includes(response.status) ? "PASS" : "FAIL";
        if (statusType === "PASS" && typeof after === "function") after(json || {});
        return { statusType, responseStatus: response.status, method, label: stepMeta(id).label, url, duration, requestBody: body, responseText: text };
    }

    function appendRow(index, result) {
        const rowId = `result-log-${index}`;
        const statusClass = result.statusType === "PASS" ? "status-pass" : result.statusType === "SKIP" ? "status-skip" : "status-fail";
        els.resultTableBody.insertAdjacentHTML("beforeend", `
            <tr>
                <td>${index}</td>
                <td><div class="step-name">${esc(result.label)}</div><div class="step-url">${esc(result.url || "(URL 없음)")}</div></td>
                <td>${esc(result.method)}</td>
                <td><span class="status-pill ${statusClass}">${esc(result.statusType)} ${esc(String(result.responseStatus || ""))}</span></td>
                <td>${esc(result.duration)}</td>
                <td><button class="log-btn" data-log-target="${rowId}">결과 보기</button></td>
            </tr>
            <tr class="log-row"><td colspan="6"><div class="log-box" id="${rowId}">
                <h3>Request Body</h3><pre>${esc(result.requestBody ? JSON.stringify(result.requestBody, null, 2) : "(Empty)")}</pre>
                <h3 style="margin-top:12px;">Response</h3><pre>${esc(result.responseText || "(Empty)")}</pre>
            </div></td></tr>
        `);
        const button = els.resultTableBody.querySelector(`[data-log-target="${rowId}"]`);
        const box = document.getElementById(rowId);
        button.addEventListener("click", () => { box.style.display = box.style.display === "block" ? "none" : "block"; });
    }

    function globalChecks() {
        const auth = authSnapshot();

        return [
            { label: "Base URL", ready: !!baseUrl(), message: baseUrl() || "환경 선택 필요" },
            { label: "인증 방식", ready: true, message: auth.mode === "bearer" ? "Bearer" : "Signature" },
            { label: "토큰 / 인증 정보", ready: auth.ready, message: state.token ? "토큰 보유" : auth.ready ? "인증 정보 입력됨" : "인증 패널에서 입력 필요" },
            { label: "회사 정보", ready: has(data().companyId), message: `company_id: ${mask(data().companyId)} (토큰 발급 시 자동)` }
        ];
    }

    function readiness(scenario) {
        const missing = (scenario.keys || []).filter((key) => {
            if (key === "auth.mode") return false;
            if (key.startsWith("data.")) return !has(getByPath(data(), key.slice(5)));
            if (key === "data.companyId") return !has(data().companyId);
            return !has(getByPath(config, key));
        });
        if (scenario.keys.includes("auth.mode")) {
            if (!authSnapshot().ready && !missing.includes("auth.panel")) missing.push("auth.panel");
        }
        return { ready: missing.length === 0, missing };
    }

    function plan(codes) {
        const order = [];
        const seen = new Set();
        codes.forEach((code) => {
            const s = scenarios.find((item) => item.code === code);
            if (!s) return;
            s.steps.forEach((step) => {
                if (!seen.has(step)) {
                    seen.add(step);
                    order.push(step);
                }
            });
        });
        return order;
    }

    function rememberDoc(json) {
        const id = json && json.document && json.document.id;
        if (id) {
            state.shared.lastCreatedId = id;
            state.shared.createdIdList.push(id);
        }
    }

    function collectDocs(json) {
        (json.documents || []).forEach((doc) => { if (doc.id) state.shared.createdIdList.push(doc.id); });
    }

    function docBody() {
        const d = data();
        return { document: innerDoc(d.targetEmail, d.targetName, d.targetPhone, d.commonFields || []) };
    }

    function massBody() {
        const d = data();
        const inner = innerDoc(d.targetEmail, d.targetName, d.targetPhone, d.commonFields || []);
        return { documents: [{ ...inner, select_group_name: "" }, { ...inner, select_group_name: "" }] };
    }

    function multiMassBody() {
        const d = data();
        must(d.targetTemplateId, "첫 번째 Template ID가 비어 있습니다.");
        must(d.targetTemplateId2, "두 번째 Template ID가 비어 있습니다.");
        return { documents: [
            { template_id: d.targetTemplateId, ...innerDoc(d.targetEmail, d.targetName, d.targetPhone, d.commonFields || []) },
            { template_id: d.targetTemplateId2, ...innerDoc(d.targetEmail2, d.targetName2, d.targetPhone2, d.doc2Fields || []) }
        ] };
    }

    function bulkBody() {
        const id = must(data().memberId, "memberId가 비어 있습니다.");
        state.shared.bulkMemberIds = [`bulk1_${id}`, `bulk2_${id}`];
        return [
            { id: state.shared.bulkMemberIds[0], password: "forcs1321!@", name: "Bulk One", contact: { tel: "0233334444", number: "01022223333", country_number: "+82" }, department: "QA", position: "Manager", role: ["template_manager"] },
            { id: state.shared.bulkMemberIds[1], password: "forcs1321!@", name: "Bulk Two", contact: { tel: "0312223333", number: "01023456789", country_number: "+82" }, department: "QA", position: "Engineer", role: ["template_manager"] }
        ];
    }

    function sendPdfBody() {
        const d = data();
        must(state.shared.completedDocIds.length, "완료 문서가 없습니다.");
        const ids = state.shared.completedDocIds.slice(0, 2);
        const sendPdfs = [];
        if (ids[0] && d.pdfTargetEmail) sendPdfs.push({ document_id: ids[0], pdf_send_infos: [{ name: d.pdfTargetName || "PDF 수신자", method: "email", method_info: d.pdfTargetEmail, sms_option: {} }] });
        if (ids[1] && d.pdfTargetPhone) sendPdfs.push({ document_id: ids[1], pdf_send_infos: [{ name: d.pdfTargetName || "PDF 수신자", method: "sms", method_info: d.pdfTargetPhone, code: "+82", sms_option: {} }] });
        must(sendPdfs.length, "pdfTargetEmail 또는 pdfTargetPhone 중 하나는 필요합니다.");
        return { input: { send_pdfs: sendPdfs } };
    }

    function multiDownloadBody() {
        must(state.shared.completedDocIds.length, "완료 문서가 없습니다.");
        return { document_ids: state.shared.completedDocIds.slice(0, 2), file_type: ["document", "audit_trail"] };
    }

    function rerequestBody() {
        const d = data();
        must(d.targetEmail, "targetEmail이 비어 있습니다.");
        return { input: { next_steps: [{ step_type: "05", step_seq: "2", recipients: [{ member: { name: d.targetName, id: d.targetEmail, sms: { country_code: "+82", phone_number: d.targetPhone } }, use_mail: true, use_sms: true }], comment: "Open API 자동 테스트 재요청입니다." }] } };
    }

    function listBody() { return { type: "04", title_and_content: "", title: "", content: "", limit: "100", skip: "0" }; }
    function innerDoc(email, name, phone, fields) { return { fields, recipients: email || name || phone ? [{ step_type: "05", use_mail: true, use_sms: true, member: { id: email, name, sms: { country_code: "+82", phone_number: phone } }, auth: { password: "", valid: { day: 0, hour: 0 } } }] : [], parameters: [], notification: [] }; }
    function pickCompleted() { const ids = must(state.shared.completedDocIds, "완료 문서가 없습니다."); return ids[Math.floor(Math.random() * ids.length)]; }
    function data() {
        const raw = config.data || {};
        return {
            targetTemplateId: raw.targetTemplateId || raw.internalTemplateId || "",
            companyId: state.companyId || raw.companyId || raw.externalCompanyId || "",
            extTemplateId: raw.extTemplateId || raw.externalTemplateId || "",
            companyApiKey: raw.companyApiKey || raw.externalCompanyApiKey || (els.authApiKey && els.authApiKey.value.trim()) || config.auth.apiKey || "",
            targetTemplateId2: raw.targetTemplateId2 || raw.secondaryTemplateId || "",

            targetEmail: raw.targetEmail || (raw.targetRecipient && raw.targetRecipient.email) || "",
            targetName: raw.targetName || (raw.targetRecipient && raw.targetRecipient.name) || "",
            targetPhone: raw.targetPhone || (raw.targetRecipient && raw.targetRecipient.phone) || "",

            targetEmail2: raw.targetEmail2 || (raw.secondaryRecipient && raw.secondaryRecipient.email) || "",
            targetName2: raw.targetName2 || (raw.secondaryRecipient && raw.secondaryRecipient.name) || "",
            targetPhone2: raw.targetPhone2 || (raw.secondaryRecipient && raw.secondaryRecipient.phone) || "",

            pdfTargetName: raw.pdfTargetName || (raw.pdfRecipient && raw.pdfRecipient.name) || "PDF 수신자",
            pdfTargetEmail: raw.pdfTargetEmail || (raw.pdfRecipient && raw.pdfRecipient.email) || "",
            pdfTargetPhone: raw.pdfTargetPhone || (raw.pdfRecipient && raw.pdfRecipient.phone) || "",

            downloadDocId: raw.downloadDocId || (raw.lookupTargets && raw.lookupTargets.downloadDocumentId) || "",
            attachDocId: raw.attachDocId || (raw.lookupTargets && raw.lookupTargets.attachDocumentId) || "",

            memberId: raw.memberId || (raw.member && raw.member.id) || "test.autorun@example.com",
            commonFields: raw.commonFields || [],
            doc2Fields: raw.doc2Fields || raw.secondaryFields || []
        };
    }
    function baseUrl() { const env = config.environments[els.envSelect.value]; return env ? env.baseUrl.replace(/\/$/, "") : ""; }
    function freshShared() { return { lastCreatedId: null, createdIdList: [], createdGroupId: null, companyStampId: null, bulkMemberIds: [], completedDocIds: [], candidateTemplateIds: [], candidateDocIds: [] }; }
    function toggleButtons(disabled) { els.runActiveBtn.disabled = disabled; els.runSelectedBtn.disabled = disabled; els.selectAllBtn.disabled = disabled; els.clearAllBtn.disabled = disabled; }
    function progress(width, text) { els.progressBar.style.width = `${width}%`; els.progressText.textContent = text; }
    function renderDetail() {
        const scenario = scenarios.find((item) => item.code === state.activeCode);
        if (!scenario) {
            if (els.activeScenarioTitle) els.activeScenarioTitle.textContent = "선택된 OPA";
            els.activeScenarioDescription.textContent = state.filteredCodes.length
                ? "왼쪽에서 OPA 항목을 선택하면 시나리오 설명과 실행 파이프라인이 표시됩니다."
                : "검색 결과가 없습니다. 검색어를 조정해 주세요.";
            if (els.missingSectionWrap) els.missingSectionWrap.style.display = "none";
            if (els.activeScenarioMissing) els.activeScenarioMissing.textContent = "";
            els.pipelineList.innerHTML = "";
            return;
        }
        const ready = readiness(scenario);
        if (els.activeScenarioTitle) els.activeScenarioTitle.textContent = `${scenario.code} — ${scenario.name}`;
        els.activeScenarioDescription.textContent = scenario.desc;
        if (els.missingSectionWrap && els.activeScenarioMissing) {
            if (ready.ready) {
                els.missingSectionWrap.style.display = "none";
                els.activeScenarioMissing.textContent = "";
            } else {
                els.missingSectionWrap.style.display = "";
                els.activeScenarioMissing.textContent = ready.missing.join(", ");
            }
        }
        els.pipelineList.innerHTML = scenario.steps.map((stepId, index) => `<div class="pipeline-row"><span class="pipeline-label">${index + 1}. ${stepMeta(stepId).label}</span><span class="pipeline-value">${stepMeta(stepId).method}</span></div>`).join("");
    }
    async function runSet(codes) {
        if (state.running) return;
        if (!codes.length) return alert("실행할 OPA를 하나 이상 선택해 주세요.");

        state.running = true;
        state.shared = freshShared();
        state.token = "";
        state.companyId = state.companyId || "";  // 인증 패널에서 발급된 companyId는 유지
        els.resultTableBody.innerHTML = "";
        toggleButtons(true);
        progress(0, "토큰과 실행 계획 준비 중");

        const stepIds = plan(codes);
        let pass = 0;
        let fail = 0;
        let skip = 0;

        try {
            try {
                await token();
            } catch (error) {
                fail += 1;
                appendRow(1, {
                    statusType: "FAIL",
                    responseStatus: "ERROR",
                    method: "AUTH",
                    label: "사전 준비 실패",
                    url: baseUrl(),
                    duration: "-",
                    requestBody: null,
                    responseText: error.message || String(error)
                });
                return;
            }

            for (let i = 0; i < stepIds.length; i += 1) {
                const id = stepIds[i];
                progress(Math.round(((i + 1) / stepIds.length) * 100), `실행 중: ${stepMeta(id).label}`);
                let result;
                try {
                    result = await runStep(id);
                } catch (error) {
                    result = { statusType: "FAIL", responseStatus: "ERROR", method: stepMeta(id).method, label: stepMeta(id).label, url: "", duration: "-", requestBody: null, responseText: error.message || String(error) };
                }
                if (result.statusType === "PASS") pass += 1;
                else if (result.statusType === "SKIP") skip += 1;
                else fail += 1;
                appendRow(i + 1, result);
            }
        } finally {
            state.running = false;
            toggleButtons(false);
            els.lastRunSummary.textContent = `PASS ${pass} / FAIL ${fail} / SKIP ${skip}`;
            progress(100, `완료: PASS ${pass}, FAIL ${fail}, SKIP ${skip}`);
            saveRunHistory({
                when: new Date().toLocaleString("ko-KR", { hour12: false }),
                codes: codes.slice(),
                pass,
                fail,
                skip,
                environment: els.envSelect ? els.envSelect.value : config.defaultEnvironment,
                authMode: config.auth && config.auth.mode ? config.auth.mode : "-"
            });
        }
    }
    function getByPath(obj, path) { return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj); }
    function has(value) { return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && String(value).trim() !== ""; }
    function must(value, message) { if (!has(value)) throw new Error(message); return value; }
    function mask(value) { if (!has(value)) return "설정 필요"; const str = String(value); return str.length <= 8 ? "*".repeat(str.length) : `${str.slice(0, 4)}...${str.slice(-4)}`; }
    function methodClass(method) { return ({ GET: "method-get", POST: "method-post", PATCH: "method-patch", DELETE: "method-delete" })[String(method).toUpperCase()] || ""; }
    function esc(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function merge(target, source) { Object.keys(source || {}).forEach((key) => { const value = source[key]; if (value && typeof value === "object" && !Array.isArray(value)) { if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) target[key] = {}; merge(target[key], value); } else target[key] = value; }); return target; }
    const PROFILE_STORAGE_KEY = "open-api-auto-test-profiles-v1";
    const ACTIVE_PROFILE_KEY = "open-api-auto-test-active-profile-v1";
    const HISTORY_STORAGE_KEY = "open-api-auto-test-history-v1";
    const DEFAULT_PROFILE_NAME = "Default";
    const PROFILE_FIELD_IDS = [
        "profileSelect", "profileNameInput", "saveProfileBtn", "deleteProfileBtn", "exportProfileBtn", "importProfileBtn",
        "importProfileFile", "clearHistoryBtn", "historyList",
        "openSettingsModalBtn", "openSettingsModalBtnInline", "closeSettingsModalBtn", "settingsModalCard", "settingsModalOverlay", "settingsSummaryText",
        "formDefaultEnvironment", "formAuthMode", "formExternalTemplateId", "formAttachDocumentId",
        "formMemberId", "formPdfRecipientName", "formTargetEmail", "formTargetPhone", "formTargetName",
        "formPdfRecipientEmail", "formApiKey", "formAuthMemberId", "formSecretKey"
    ];

    function baseDefaultConfig() {
        return merge(clone(DEFAULT_CONFIG), window.OPEN_API_AUTO_TEST_CONFIG || {});
    }

    function replaceConfig(nextConfig) {
        Object.keys(config).forEach((key) => delete config[key]);
        merge(config, clone(nextConfig));
    }

    function profileNameList() {
        const profiles = readProfiles();
        const names = Object.keys(profiles);
        return names.length ? names.sort((a, b) => a.localeCompare(b)) : [DEFAULT_PROFILE_NAME];
    }

    function currentProfileName() {
        try {
            return localStorage.getItem(ACTIVE_PROFILE_KEY) || DEFAULT_PROFILE_NAME;
        } catch (error) {
            return DEFAULT_PROFILE_NAME;
        }
    }

    function setCurrentProfileName(name) {
        try {
            localStorage.setItem(ACTIVE_PROFILE_KEY, name);
        } catch (error) {
            return;
        }
    }

    function readProfiles() {
        try {
            const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
        } catch (error) {
            return {};
        }
        return {};
    }

    function writeProfiles(profiles) {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
    }

    function readHistoryMap() {
        try {
            const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
            const parsed = raw ? JSON.parse(raw) : {};
            if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed;
        } catch (error) {
            return {};
        }
        return {};
    }

    function writeHistoryMap(historyMap) {
        localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyMap));
    }

    function ensureProfileElements() {
        PROFILE_FIELD_IDS.forEach((id) => {
            if (!els[id]) els[id] = document.getElementById(id);
        });
    }

    function populateProfileSelect() {
        ensureProfileElements();
        if (!els.profileSelect) return;
        const activeName = currentProfileName();
        els.profileSelect.innerHTML = profileNameList().map((name) => `<option value="${esc(name)}">${esc(name)}</option>`).join("");
        els.profileSelect.value = profileNameList().includes(activeName) ? activeName : profileNameList()[0];
        if (els.profileNameInput) els.profileNameInput.value = els.profileSelect.value;
    }

    function normalizedAuthMode(value) {
        return value === "bearer" ? "bearer" : "signature";
    }

    function authSnapshot() {
        const auth = config.auth || {};
        const mode = normalizedAuthMode(state.authMethod || auth.mode);
        const panelApiKey = els.authApiKey ? els.authApiKey.value.trim() : "";
        const panelMemberId = els.authMemberId ? els.authMemberId.value.trim() : "";
        const panelSecretKey = els.authSecretKey ? els.authSecretKey.value.trim() : "";
        const bearerToken = mode === "bearer" ? (state.token || panelSecretKey || auth.accessToken || "") : (state.token || auth.accessToken || "");
        const apiKey = panelApiKey || auth.apiKey || "";
        const memberId = panelMemberId || auth.memberId || "";
        const secretKey = mode === "signature" ? (panelSecretKey || auth.secretKey || "") : "";
        const ready = mode === "bearer" ? has(bearerToken) : has(apiKey) && has(memberId) && has(secretKey);
        return { mode, bearerToken, apiKey, memberId, secretKey, ready };
    }

    function syncConfigFromAuthPanel() {
        const auth = authSnapshot();
        config.auth = config.auth || {};
        config.auth.mode = auth.mode;
        config.auth.apiKey = auth.apiKey;
        config.auth.memberId = auth.memberId;
        config.auth.secretKey = auth.secretKey;
        config.auth.accessToken = auth.bearerToken;
        config.data = config.data || {};
        if (state.companyId && !has(config.data.externalCompanyId)) config.data.externalCompanyId = state.companyId;
    }

    function applyAuthModeUi(mode) {
        state.authMethod = normalizedAuthMode(mode);
        if (els.authTabSignature) els.authTabSignature.classList.toggle("active", state.authMethod === "signature");
        if (els.authTabBearer) els.authTabBearer.classList.toggle("active", state.authMethod === "bearer");
        if (els.authSecretLabel) {
            els.authSecretLabel.textContent = state.authMethod === "bearer" ? "Access Token (Bearer)" : "비밀 키 (Secret Key, Hex)";
        }
        if (els.authSecretKey) {
            els.authSecretKey.placeholder = state.authMethod === "bearer" ? "발급된 Access Token 직접 입력" : "비밀 키 입력 (Hex 형식)";
            els.authSecretKey.type = "password";
        }
        [els.authApiKey, els.authMemberId].forEach((el) => {
            if (el && el.closest(".auth-field")) el.closest(".auth-field").style.display = state.authMethod === "bearer" ? "none" : "";
        });
        if (els.formAuthMode) els.formAuthMode.value = state.authMethod;
    }

    function populateAuthPanelFromConfig() {
        const auth = config.auth || {};
        applyAuthModeUi(auth.mode || "signature");
        if (els.authApiKey) els.authApiKey.value = auth.apiKey || "";
        if (els.authMemberId) els.authMemberId.value = auth.memberId || "";
        if (els.authSecretKey) els.authSecretKey.value = state.authMethod === "bearer" ? (auth.accessToken || "") : (auth.secretKey || "");
        state.token = state.authMethod === "bearer" ? (auth.accessToken || "") : "";
        state.companyId = (config.data && config.data.externalCompanyId) || state.companyId || "";
        updateAuthPanelUI();
    }

    function populateSettingsFormFromConfig() {
        ensureProfileElements();
        if (!els.formDefaultEnvironment) return;
        const dataConfig = data();
        fillOptions(els.formDefaultEnvironment, Object.entries(config.environments || {}).map(([key, value]) => ({ value: key, label: value.label || key })));
        fillOptions(els.formAuthMode, [
            { value: "signature", label: "Signature" },
            { value: "bearer", label: "Bearer Token" }
        ]);
        setInputValue("formDefaultEnvironment", config.defaultEnvironment);
        setInputValue("formAuthMode", normalizedAuthMode(config.auth && config.auth.mode));
        setInputValue("formExternalTemplateId", dataConfig.extTemplateId);
        setInputValue("formAttachDocumentId", dataConfig.attachDocId);
        setInputValue("formMemberId", dataConfig.memberId);
        setInputValue("formPdfRecipientName", dataConfig.pdfTargetName);
        setInputValue("formTargetEmail", dataConfig.targetEmail);
        setInputValue("formTargetPhone", dataConfig.targetPhone);
        setInputValue("formTargetName", dataConfig.targetName);
        setInputValue("formPdfRecipientEmail", dataConfig.pdfTargetEmail);
        setInputValue("formApiKey", config.auth && config.auth.apiKey);
        setInputValue("formAuthMemberId", config.auth && config.auth.memberId);
        setInputValue("formSecretKey", normalizedAuthMode(config.auth && config.auth.mode) === "bearer" ? config.auth && config.auth.accessToken : config.auth && config.auth.secretKey);
        if (els.envSelect) els.envSelect.value = config.defaultEnvironment in config.environments ? config.defaultEnvironment : Object.keys(config.environments)[0];
        populateAuthPanelFromConfig();
    }

    function updateEditorFromConfig() {
        if (els.settingsEditor) els.settingsEditor.value = JSON.stringify(config, null, 2);
    }

    function renderHistory() {
        ensureProfileElements();
        if (!els.historyList) return;
        const historyMap = readHistoryMap();
        const history = historyMap[currentProfileName()] || [];
        els.historyList.innerHTML = history.length
            ? history.map((item) => `
                <div class="config-row">
                    <span class="config-key">${esc(item.when)}<br>${esc(item.codes.join(", "))}</span>
                    <span class="config-value ${item.fail > 0 ? "missing" : "ready"}">PASS ${esc(String(item.pass))} / FAIL ${esc(String(item.fail))} / SKIP ${esc(String(item.skip))}<br>${esc(item.environment)} / ${esc(item.authMode)}</span>
                </div>
            `).join("")
            : `<div class="config-row"><span class="config-key">최근 실행 이력이 없습니다.</span><span class="config-value">-</span></div>`;
    }

    function saveRunHistory(entry) {
        const historyMap = readHistoryMap();
        const name = currentProfileName();
        const list = historyMap[name] || [];
        list.unshift(entry);
        historyMap[name] = list.slice(0, 10);
        writeHistoryMap(historyMap);
        renderHistory();
    }

    function applyFormValues(targetConfig) {
        const next = merge(clone(baseDefaultConfig()), targetConfig || {});
        next.defaultEnvironment = getInputValue("formDefaultEnvironment") || next.defaultEnvironment;
        next.auth = next.auth || {};
        next.auth.mode = normalizedAuthMode(getInputValue("formAuthMode") || next.auth.mode || "signature");
        next.auth.apiKey = getInputValue("formApiKey");
        next.auth.memberId = getInputValue("formAuthMemberId");
        next.auth.secretKey = next.auth.mode === "signature" ? getInputValue("formSecretKey") : "";
        next.auth.accessToken = next.auth.mode === "bearer" ? getInputValue("formSecretKey") : (state.token || next.auth.accessToken || "");
        next.data = next.data || {};
        next.data.externalTemplateId = getInputValue("formExternalTemplateId");
        next.data.lookupTargets = next.data.lookupTargets || {};
        next.data.lookupTargets.attachDocumentId = getInputValue("formAttachDocumentId");
        next.data.member = next.data.member || {};
        next.data.member.id = getInputValue("formMemberId");
        next.data.targetRecipient = next.data.targetRecipient || {};
        next.data.targetRecipient.email = getInputValue("formTargetEmail");
        next.data.targetRecipient.phone = getInputValue("formTargetPhone");
        next.data.targetRecipient.name = getInputValue("formTargetName");
        next.data.pdfRecipient = next.data.pdfRecipient || {};
        next.data.pdfRecipient.name = getInputValue("formPdfRecipientName");
        next.data.pdfRecipient.email = getInputValue("formPdfRecipientEmail");
        return next;
    }

    function syncConfigFromForm() {
        if (els.formAuthMode) applyAuthModeUi(els.formAuthMode.value);
        if (els.authApiKey && els.formApiKey) els.authApiKey.value = els.formApiKey.value;
        if (els.authMemberId && els.formAuthMemberId) els.authMemberId.value = els.formAuthMemberId.value;
        if (els.authSecretKey && els.formSecretKey) els.authSecretKey.value = els.formSecretKey.value;
        const next = applyFormValues(config);
        replaceConfig(next);
        syncConfigFromAuthPanel();
        updateEditorFromConfig();
        refreshAll();
    }

    function loadProfile(name) {
        const profiles = readProfiles();
        const nextName = name && profiles[name] ? name : DEFAULT_PROFILE_NAME;
        const nextConfig = profiles[nextName] ? merge(clone(baseDefaultConfig()), profiles[nextName]) : baseDefaultConfig();
        replaceConfig(nextConfig);
        setCurrentProfileName(nextName);
        populateProfileSelect();
        populateSettingsFormFromConfig();
        updateEditorFromConfig();
        refreshAll();
        setSettingsStatus(`프로필 "${nextName}" 설정을 불러왔습니다.`);
    }

    function saveCurrentProfile() {
        ensureProfileElements();
        const profileName = (els.profileNameInput && els.profileNameInput.value.trim()) || (els.profileSelect && els.profileSelect.value) || DEFAULT_PROFILE_NAME;
        let draft = clone(config);
        if (els.settingsEditor && els.settingsEditor.value.trim()) {
            draft = merge(clone(baseDefaultConfig()), JSON.parse(els.settingsEditor.value));
        }
        const finalConfig = applyFormValues(draft);
        replaceConfig(finalConfig);
        syncConfigFromAuthPanel();
        merge(finalConfig, clone(config));
        const profiles = readProfiles();
        profiles[profileName] = finalConfig;
        writeProfiles(profiles);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(finalConfig));
        replaceConfig(finalConfig);
        setCurrentProfileName(profileName);
        populateProfileSelect();
        populateSettingsFormFromConfig();
        updateEditorFromConfig();
        refreshAll();
        setSettingsStatus(`프로필 "${profileName}"을 저장했습니다.`);
    }

    function deleteCurrentProfile() {
        ensureProfileElements();
        const profileName = (els.profileSelect && els.profileSelect.value) || currentProfileName();
        const profiles = readProfiles();
        if (!profiles[profileName]) {
            setSettingsStatus(`삭제할 프로필 "${profileName}"이 없습니다.`, true);
            return;
        }
        delete profiles[profileName];
        if (Object.keys(profiles).length) writeProfiles(profiles);
        else localStorage.removeItem(PROFILE_STORAGE_KEY);
        localStorage.removeItem(STORAGE_KEY);
        const historyMap = readHistoryMap();
        delete historyMap[profileName];
        if (Object.keys(historyMap).length) writeHistoryMap(historyMap);
        else localStorage.removeItem(HISTORY_STORAGE_KEY);
        setCurrentProfileName(DEFAULT_PROFILE_NAME);
        loadProfile(profileNameList()[0]);
        setSettingsStatus(`프로필 "${profileName}"을 삭제했습니다.`);
    }

    function toggleSensitiveFields() {
        ensureProfileElements();
        const fields = ["formApiKey", "formSecretKey", "authSecretKey"];
        const show = fields.some((id) => els[id] && els[id].type === "password");
        fields.forEach((id) => {
            if (els[id]) els[id].type = show ? "text" : "password";
        });
    }

    function renderSettingsSummary() {
        ensureProfileElements();
        if (!els.settingsSummaryText) return;
        const auth = authSnapshot();
        const info = [];
        info.push(`프로필: ${currentProfileName()}`);
        info.push(`인증: ${auth.mode === "bearer" ? "Bearer" : "Signature"}${auth.ready ? " 준비됨" : " 입력 필요"}`);
        if (has(data().companyId)) info.push(`Company ${mask(data().companyId)}`);
        else info.push("토큰 발급 후 Company ID가 자동으로 채워집니다.");
        els.settingsSummaryText.textContent = info.join(" | ");
    }

    function openSettingsModal() {
        ensureProfileElements();
        if (els.settingsModalOverlay) els.settingsModalOverlay.classList.add("open");
        if (els.settingsModalCard) els.settingsModalCard.classList.add("modal-open");
        document.body.style.overflow = "hidden";
    }

    function closeSettingsModal() {
        ensureProfileElements();
        if (els.settingsModalOverlay) els.settingsModalOverlay.classList.remove("open");
        if (els.settingsModalCard) els.settingsModalCard.classList.remove("modal-open");
        document.body.style.overflow = "";
    }

    function exportCurrentProfile() {
        const profileName = currentProfileName();
        const payload = {
            profileName,
            exportedAt: new Date().toISOString(),
            config: clone(config)
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `${profileName.replace(/[^\w.-]+/g, "_") || "profile"}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        setSettingsStatus(`프로필 "${profileName}"을 export 했습니다.`);
    }

    function importProfileFromFile(file) {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
            try {
                const parsed = JSON.parse(String(reader.result || "{}"));
                const importedConfig = parsed.config && typeof parsed.config === "object" ? parsed.config : parsed;
                const profileName = (parsed.profileName || file.name.replace(/\.json$/i, "") || DEFAULT_PROFILE_NAME).trim();
                const finalConfig = merge(clone(baseDefaultConfig()), importedConfig);
                const profiles = readProfiles();
                profiles[profileName] = finalConfig;
                writeProfiles(profiles);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(finalConfig));
                setCurrentProfileName(profileName);
                replaceConfig(finalConfig);
                populateProfileSelect();
                populateSettingsFormFromConfig();
                updateEditorFromConfig();
                refreshAll();
                setSettingsStatus(`프로필 "${profileName}"을 import 했습니다.`);
            } catch (error) {
                setSettingsStatus(`프로필 import 실패: ${error.message}`, true);
            } finally {
                if (els.importProfileFile) els.importProfileFile.value = "";
            }
        };
        reader.readAsText(file, "utf-8");
    }

    function clearCurrentHistory() {
        const historyMap = readHistoryMap();
        const name = currentProfileName();
        if (!historyMap[name] || !historyMap[name].length) {
            setSettingsStatus(`프로필 "${name}"의 실행 이력이 없습니다.`, true);
            return;
        }
        delete historyMap[name];
        if (Object.keys(historyMap).length) writeHistoryMap(historyMap);
        else localStorage.removeItem(HISTORY_STORAGE_KEY);
        renderHistory();
        setSettingsStatus(`프로필 "${name}"의 실행 이력을 삭제했습니다.`);
    }

    function fillOptions(selectEl, items) {
        if (!selectEl) return;
        const currentValue = selectEl.value;
        selectEl.innerHTML = items.map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`).join("");
        if (items.some((item) => item.value === currentValue)) selectEl.value = currentValue;
    }

    function setInputValue(id, value) {
        if (els[id]) els[id].value = value || "";
    }

    function getInputValue(id) {
        return els[id] ? String(els[id].value || "").trim() : "";
    }

    function bindSettingsInputs() {
        ensureProfileElements();
        [
            "formDefaultEnvironment", "formAuthMode", "formExternalTemplateId", "formAttachDocumentId",
            "formMemberId", "formPdfRecipientName", "formTargetEmail", "formTargetPhone", "formTargetName",
            "formPdfRecipientEmail", "formApiKey", "formAuthMemberId", "formSecretKey"
        ].forEach((id) => {
            if (!els[id] || els[id].dataset.bound === "true") return;
            const eventName = els[id].tagName === "SELECT" ? "change" : "input";
            els[id].addEventListener(eventName, syncConfigFromForm);
            els[id].dataset.bound = "true";
        });
        if (els.profileSelect && els.profileSelect.dataset.bound !== "true") {
            els.profileSelect.addEventListener("change", () => loadProfile(els.profileSelect.value));
            els.profileSelect.dataset.bound = "true";
        }
        if (els.saveProfileBtn && els.saveProfileBtn.dataset.bound !== "true") {
            els.saveProfileBtn.addEventListener("click", () => {
                try {
                    saveCurrentProfile();
                } catch (error) {
                    setSettingsStatus(`프로필 저장 실패: ${error.message}`, true);
                }
            });
            els.saveProfileBtn.dataset.bound = "true";
        }
        if (els.deleteProfileBtn && els.deleteProfileBtn.dataset.bound !== "true") {
            els.deleteProfileBtn.addEventListener("click", deleteCurrentProfile);
            els.deleteProfileBtn.dataset.bound = "true";
        }
        if (els.exportProfileBtn && els.exportProfileBtn.dataset.bound !== "true") {
            els.exportProfileBtn.addEventListener("click", exportCurrentProfile);
            els.exportProfileBtn.dataset.bound = "true";
        }
        if (els.importProfileBtn && els.importProfileBtn.dataset.bound !== "true") {
            els.importProfileBtn.addEventListener("click", () => els.importProfileFile && els.importProfileFile.click());
            els.importProfileBtn.dataset.bound = "true";
        }
        if (els.importProfileFile && els.importProfileFile.dataset.bound !== "true") {
            els.importProfileFile.addEventListener("change", (event) => importProfileFromFile(event.target.files && event.target.files[0]));
            els.importProfileFile.dataset.bound = "true";
        }
        if (els.clearHistoryBtn && els.clearHistoryBtn.dataset.bound !== "true") {
            els.clearHistoryBtn.addEventListener("click", clearCurrentHistory);
            els.clearHistoryBtn.dataset.bound = "true";
        }
        [els.openSettingsModalBtn, els.openSettingsModalBtnInline].forEach((button) => {
            if (!button || button.dataset.bound === "true") return;
            button.addEventListener("click", openSettingsModal);
            button.dataset.bound = "true";
        });
        if (els.closeSettingsModalBtn && els.closeSettingsModalBtn.dataset.bound !== "true") {
            els.closeSettingsModalBtn.addEventListener("click", closeSettingsModal);
            els.closeSettingsModalBtn.dataset.bound = "true";
        }
        if (els.settingsModalOverlay && els.settingsModalOverlay.dataset.bound !== "true") {
            els.settingsModalOverlay.addEventListener("click", closeSettingsModal);
            els.settingsModalOverlay.dataset.bound = "true";
        }
    }

    function bootstrapSettingsUi() {
        ensureProfileElements();
        bindSettingsInputs();
        populateProfileSelect();
        populateSettingsFormFromConfig();
        updateEditorFromConfig();
        renderHistory();
        renderSettingsSummary();
    }

    function loadSettingsIntoEditor() {
        bootstrapSettingsUi();
        setSettingsStatus(readStoredConfig() ? "저장된 사용자 설정을 불러왔습니다." : "현재 설정을 표시 중입니다. 저장하면 이 브라우저에 유지됩니다.");
    }

    function saveSettingsFromEditor() {
        try {
            saveCurrentProfile();
        } catch (error) {
            setSettingsStatus(`저장 실패: ${error.message}`, true);
        }
    }

    function resetStoredSettings() {
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(PROFILE_STORAGE_KEY);
        localStorage.removeItem(ACTIVE_PROFILE_KEY);
        localStorage.removeItem(HISTORY_STORAGE_KEY);
        replaceConfig(baseDefaultConfig());
        bootstrapSettingsUi();
        refreshAll();
        setSettingsStatus("저장된 사용자 설정, 프로필, 실행 이력을 모두 초기화했습니다.");
    }

    function setSettingsStatus(message, isError = false) {
        if (!els.settingsStatusText) return;
        els.settingsStatusText.textContent = message;
        els.settingsStatusText.style.color = isError ? "#d64545" : "#64748b";
    }

    function readStoredConfig() {
        try {
            const activeName = localStorage.getItem(ACTIVE_PROFILE_KEY);
            const profiles = readProfiles();
            if (activeName && profiles[activeName]) return profiles[activeName];
            if (profiles[DEFAULT_PROFILE_NAME]) return profiles[DEFAULT_PROFILE_NAME];
            const legacyRaw = localStorage.getItem(STORAGE_KEY);
            return legacyRaw ? JSON.parse(legacyRaw) : null;
        } catch (error) {
            return null;
        }
    }

    // ── AUTH PANEL ──────────────────────────────────────────────────────────
    function initAuthPanel() {
        if (!els.authPanelToggle) return;

        // 패널 토글
        els.authPanelToggle.addEventListener("click", () => openSettingsModal());
        els.authPanelToggle.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openSettingsModal();
            }
        });

        // 인증 방식 탭
        [els.authTabSignature, els.authTabBearer].forEach((tab) => {
            if (!tab) return;
            tab.addEventListener("click", () => {
                applyAuthModeUi(tab.getAttribute("data-method"));
                syncConfigFromAuthPanel();
                updateEditorFromConfig();
                refreshAll();
            });
        });

        [els.authApiKey, els.authMemberId, els.authSecretKey].forEach((input) => {
            if (!input) return;
            input.addEventListener("input", () => {
                if (els.formApiKey) els.formApiKey.value = els.authApiKey ? els.authApiKey.value : "";
                if (els.formAuthMemberId) els.formAuthMemberId.value = els.authMemberId ? els.authMemberId.value : "";
                if (els.formSecretKey) els.formSecretKey.value = els.authSecretKey ? els.authSecretKey.value : "";
                syncConfigFromAuthPanel();
                updateEditorFromConfig();
                refreshAll();
            });
        });

        const handleIssueTokenFromModal = async (button) => {
            const authMode = normalizedAuthMode(els.formAuthMode ? els.formAuthMode.value : state.authMethod);
            const apiKey = els.formApiKey ? els.formApiKey.value.trim() : "";
            const memberId = els.formAuthMemberId ? els.formAuthMemberId.value.trim() : "";
            const secretKey = els.formSecretKey ? els.formSecretKey.value.trim() : "";

            if (!secretKey) { alert("인증 값이 비어 있습니다."); return; }

            if (els.authApiKey) els.authApiKey.value = apiKey;
            if (els.authMemberId) els.authMemberId.value = memberId;
            if (els.authSecretKey) els.authSecretKey.value = secretKey;
            applyAuthModeUi(authMode);

            state.token = "";
            state.companyId = "";
            button.disabled = true;
            button.innerHTML = '<i class="fa-solid fa-spinner fa-spin fa-sm"></i> 토큰 발급 중';

            try {
                if (authMode === "bearer") {
                    state.token = secretKey;
                    updateAuthPanelUI();
                } else {
                    if (!apiKey || !memberId) { alert("API Key와 User ID를 입력해 주세요."); return; }
                    await issueTokenFromPanel(apiKey, memberId, secretKey);
                }
                syncConfigFromAuthPanel();
                updateEditorFromConfig();
                refreshAll();
            } catch (err) {
                alert("토큰 발급 실패: " + (err.message || String(err)));
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="fa-solid fa-rotate fa-sm"></i> 토큰 발급';
            }
        };

        if (els.modalIssueTokenBtn) {
            els.modalIssueTokenBtn.addEventListener("click", () => handleIssueTokenFromModal(els.modalIssueTokenBtn));
        }

        // 토큰 발급 버튼
        if (els.btnIssueToken) {
            els.btnIssueToken.addEventListener("click", async () => {
                const apiKey = els.authApiKey ? els.authApiKey.value.trim() : "";
                const memberId = els.authMemberId ? els.authMemberId.value.trim() : "";
                const secretKey = els.authSecretKey ? els.authSecretKey.value.trim() : "";

                if (!secretKey) { alert("인증 정보를 입력해 주세요."); return; }

                state.token = "";
                state.companyId = "";
                els.btnIssueToken.disabled = true;
                els.btnIssueToken.innerHTML = '<i class="fa-solid fa-spinner fa-spin fa-sm"></i> 발급 중...';

                try {
                    if (state.authMethod === "bearer") {
                        state.token = secretKey;
                        updateAuthPanelUI();
                    } else {
                        if (!apiKey || !memberId) { alert("API Key와 User ID를 입력해 주세요."); return; }
                        await issueTokenFromPanel(apiKey, memberId, secretKey);
                    }
                        syncConfigFromAuthPanel();
                    updateEditorFromConfig();
                    refreshStatus();
                } catch (err) {
                    alert("토큰 발급 실패: " + (err.message || String(err)));
                } finally {
                    els.btnIssueToken.disabled = false;
                    els.btnIssueToken.innerHTML = '<i class="fa-solid fa-rotate fa-sm"></i> 토큰 발급';
                }
            });
        }

        // 초기화 버튼
        if (els.btnClearToken) {
            els.btnClearToken.addEventListener("click", () => {
                state.token = "";
                state.companyId = "";
                syncConfigFromAuthPanel();
                updateEditorFromConfig();
                updateAuthPanelUI();
                refreshAll();
            });
        }

        if (els.modalClearTokenBtn) {
            els.modalClearTokenBtn.addEventListener("click", () => {
                state.token = "";
                state.companyId = "";
                syncConfigFromAuthPanel();
                updateEditorFromConfig();
                updateAuthPanelUI();
                refreshAll();
            });
        }

        // 토큰 표시 클릭 → 복사
        if (els.authTokenDisplay) {
            els.authTokenDisplay.addEventListener("click", () => {
                if (!state.token) return;
                navigator.clipboard.writeText(state.token).then(() => {
                    const orig = els.authTokenDisplay.textContent;
                    els.authTokenDisplay.textContent = "복사됨!";
                    setTimeout(() => { els.authTokenDisplay.textContent = orig; }, 1200);
                }).catch(() => {});
            });
        }

        if (els.modalTokenDisplay) {
            els.modalTokenDisplay.addEventListener("click", () => {
                if (!state.token) return;
                navigator.clipboard.writeText(state.token).then(() => {
                    const orig = els.modalTokenDisplay.textContent;
                    els.modalTokenDisplay.textContent = "복사됨";
                    setTimeout(() => { els.modalTokenDisplay.textContent = orig; }, 1200);
                }).catch(() => {});
            });
        }

        populateAuthPanelFromConfig();
    }

    function updateAuthPanelUI() {
        if (!els.authStatusBadge) return;
        if (state.token) {
            const short = state.token.length > 40 ? state.token.slice(0, 40) + "..." : state.token;
            if (els.authTokenDisplay) {
                els.authTokenDisplay.textContent = short;
                els.authTokenDisplay.classList.add("has-token");
            }
        } else {
            if (els.authTokenDisplay) {
                els.authTokenDisplay.textContent = "토큰을 발급받아 주세요";
                els.authTokenDisplay.classList.remove("has-token");
            }
        }
        els.authStatusBadge.textContent = "사용자 설정";
        els.authStatusBadge.className = "auth-status action";

        if (els.modalTokenDisplay) {
            if (state.token) {
                const short = state.token.length > 40 ? state.token.slice(0, 40) + "..." : state.token;
                els.modalTokenDisplay.textContent = short;
                els.modalTokenDisplay.classList.add("has-token");
            } else {
                els.modalTokenDisplay.textContent = "토큰을 발급받은 뒤 확인하세요.";
                els.modalTokenDisplay.classList.remove("has-token");
            }
        }

        if (els.modalCompanyIdDisplay && els.modalCompanyIdValue) {
            if (state.companyId) {
                els.modalCompanyIdDisplay.style.display = "";
                els.modalCompanyIdValue.textContent = state.companyId;
            } else {
                els.modalCompanyIdDisplay.style.display = "none";
            }
        }

        if (els.authCompanyIdDisplay && els.authCompanyIdValue) {
            if (state.companyId) {
                els.authCompanyIdDisplay.style.display = "";
                els.authCompanyIdValue.textContent = state.companyId;
            } else {
                els.authCompanyIdDisplay.style.display = "none";
            }
        }
    }

    // ── GUIDE ────────────────────────────────────────────────────────────────
    function hydrateGuideContent() {
        const root = document.getElementById("guideModal");
        if (!root) return;

        const header = root.querySelector(".guide-header-text");
        const steps = root.querySelector(".guide-steps");
        const tip = root.querySelector(".guide-tip p");
        if (!header || !steps || !tip) return;

        header.innerHTML = `
            <h2>Open API Auto Test 사용 가이드</h2>
            <p>eformsign Open API의 주요 기능을 시나리오 단위로 자동 검증하는 도구입니다. 각 OPA 항목은 생성 → 검증 → 정리 단계를 자동으로 묶어서 실행합니다.</p>
        `;

        steps.innerHTML = `
            <div class="guide-step">
                <div class="guide-step-num">1</div>
                <i class="fa-solid fa-globe guide-step-icon"></i>
                <h3>환경 선택</h3>
                <p>상단 드롭다운에서 테스트 대상 환경을 먼저 선택합니다. API Key가 해당 환경용인지 확인하세요.</p>
                <ul>
                    <li><strong>운영 (SaaS)</strong> — kr-api.eformsign.com</li>
                    <li><strong>공공 (CSAP)</strong> — www.gov-eformsign.com</li>
                    <li>환경이 맞지 않으면 토큰 발급 단계에서 인증 오류가 발생합니다.</li>
                </ul>
            </div>
            <div class="guide-step">
                <div class="guide-step-num">2</div>
                <i class="fa-solid fa-key guide-step-icon"></i>
                <h3>인증 설정 및 토큰 발급</h3>
                <p>상단의 <strong>사용자 설정</strong>을 클릭해 모달을 열고, 인증 방식을 선택한 뒤 값을 입력합니다.</p>
                <ul>
                    <li><strong>Signature</strong> — API Key + User ID + Secret Key(Hex)를 입력하고 토큰 발급 버튼을 클릭합니다. 발급 성공 시 Company ID가 자동으로 채워집니다.</li>
                    <li><strong>Bearer Token</strong> — 이미 보유한 Access Token을 직접 붙여넣습니다. 토큰 발급 버튼 없이 바로 입력값을 사용합니다.</li>
                    <li>발급된 토큰과 Company ID는 모달 하단에서 확인할 수 있으며, 클릭하면 클립보드에 복사됩니다.</li>
                </ul>
            </div>
            <div class="guide-step">
                <div class="guide-step-num">3</div>
                <i class="fa-solid fa-file-pen guide-step-icon"></i>
                <h3>테스트 데이터 입력</h3>
                <p>사용자 설정 모달의 일반 설정 섹션에서 테스트에 필요한 값을 채웁니다. 실행하려는 OPA에 따라 필요한 항목이 다릅니다.</p>
                <ul>
                    <li><strong>외부 Template ID</strong> — OPA 007(외부 문서 작성)에 필요. Company ID와 API Key는 토큰 발급 정보에서 자동으로 채워집니다.</li>
                    <li><strong>첨부 문서 ID</strong> — OPA 006(첨부 파일 다운로드)에 사용. 실제 첨부 파일이 있는 완료 문서 ID를 입력해야 합니다.</li>
                    <li><strong>테스트 멤버 ID</strong> — 멤버·그룹 관련 OPA(011~013, 018~020, 030)에 필요합니다.</li>
                    <li><strong>기본 수신자 (이름/이메일/휴대폰)</strong> — OPA 014(재요청) 시나리오에서 수신자 정보로 사용됩니다.</li>
                    <li><strong>PDF 수신자 (이름/이메일)</strong> — OPA 037(완료 문서 PDF 전송)에 필요</li>
                    <li>문서 생성·취소·다운로드 관련 OPA(003, 004, 005, 016, 021, 040, 042, 045)는 템플릿·완료 문서를 자동 탐색하므로 별도 ID 입력 불필요</li>
                    <li>설정을 프로필로 저장해두면 다음 테스트 시 재입력 없이 바로 불러올 수 있습니다.</li>
                </ul>
            </div>
            <div class="guide-step">
                <div class="guide-step-num">4</div>
                <i class="fa-solid fa-list-check guide-step-icon"></i>
                <h3>OPA 선택</h3>
                <p>모달을 닫고 좌측 사이드바에서 실행할 OPA를 선택합니다. 각 항목의 상태 배지를 확인하세요.</p>
                <ul>
                    <li><strong class="guide-ready">준비됨</strong> — 현재 입력된 설정으로 바로 실행 가능합니다.</li>
                    <li><strong class="guide-warn">설정 필요</strong> — 누락된 값이 있습니다. 항목을 클릭하면 우측 상세 패널에서 어떤 설정이 부족한지 확인할 수 있습니다.</li>
                    <li>체크박스로 여러 OPA를 선택하면 step이 중복되지 않도록 자동으로 최적화하여 순서대로 실행합니다.</li>
                    <li>우측 실행 파이프라인 패널에서 어떤 단계들이 실제로 실행될지 미리 확인할 수 있습니다.</li>
                </ul>
            </div>
            <div class="guide-step">
                <div class="guide-step-num">5</div>
                <i class="fa-solid fa-play guide-step-icon"></i>
                <h3>실행 및 결과 확인</h3>
                <p>실행 버튼을 누르면 토큰 준비부터 정리 단계까지 자동으로 처리됩니다. 각 step의 결과가 테이블로 표시됩니다.</p>
                <ul>
                    <li><strong>현재 OPA만 실행</strong> — 사이드바에서 선택(클릭)된 OPA 하나만 실행합니다.</li>
                    <li><strong>선택한 OPA 실행</strong> — 체크박스로 선택된 OPA 전체를 연속 실행합니다.</li>
                    <li><strong>PASS / FAIL</strong> — step 단위로 결과가 표시됩니다. FAIL 시 <strong>결과 보기</strong>를 클릭하면 요청 바디와 응답 전문을 확인할 수 있습니다.</li>
                    <li>실행 이력은 프로필별로 최근 10회까지 사용자 설정 모달에서 확인할 수 있습니다.</li>
                </ul>
            </div>
        `;

        tip.innerHTML = `<strong>팁:</strong> OPA 003·004·005·016·021·040·042·045는 템플릿 또는 완료 문서를 자동으로 탐색하므로 ID를 별도로 입력하지 않아도 됩니다. OPA 037(PDF 전송), OPA 040(일괄 다운로드), OPA 045(완료 토큰 연장), OPA 004(단건 다운로드)는 계정에 완료 상태(status_type=003) 문서가 없으면 실행해도 의미 있는 검증이 되지 않습니다. OPA 006은 실제 첨부 파일이 있는 완료 문서 ID를 첨부 문서 ID에 직접 입력해야 합니다.`;
    }

    window.openGuide = function () {
        const el = document.getElementById("guideModal");
        if (el) el.classList.add("open");
    };
    window.closeGuide = function () {
        const el = document.getElementById("guideModal");
        if (el) el.classList.remove("open");
    };
    window.closeGuideOutside = function (event) {
        if (event.target === document.getElementById("guideModal")) window.closeGuide();
    };
})();
