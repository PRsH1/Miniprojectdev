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
            },
            custom: {
                label: "직접 입력",
                baseUrl: ""
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
                downloadDocumentId: ""
            },

            attachTemplateId: "",
            attachFieldId: "첨부 1",

            member: {
                id: "test.autorun@example.com"
            },

            commonFields: [],
            secondaryFields: []
        }
    };

    const STORAGE_KEY = "open-api-auto-test-config-v1";
    // localStorage 키 상수는 아래 readStoredConfig() 즉시 호출보다 먼저 선언해야 한다.
    // (아래쪽에 두면 TDZ ReferenceError가 catch되어 저장된 프로필이 무시되고 기본값으로 시작함 — D-1)
    const PROFILE_STORAGE_KEY = "open-api-auto-test-profiles-v1";
    const ACTIVE_PROFILE_KEY = "open-api-auto-test-active-profile-v1";
    const HISTORY_STORAGE_KEY = "open-api-auto-test-history-v1";
    // 프로필별 마지막 OPA 선택 (P1-11). 처음 방문하면 아무 것도 선택하지 않는다.
    const SELECTION_STORAGE_KEY = "open-api-auto-test-selection-v1";
    const DEFAULT_PROFILE_NAME = "Default";
    // step 요청 하나의 최대 대기 시간 (P1-11). 넘으면 요청을 취소하고 FAIL(TIMEOUT)로 기록한다.
    const REQUEST_TIMEOUT_MS = 60 * 1000;
    const storedConfig = readStoredConfig();
    // 구버전 저장본에 남은 비밀키·토큰이 메모리 config로 올라오지 않도록 제거한다 (P0-08).
    // init()의 migrateStoredSecrets()보다 먼저 실행되므로 여기서도 걸러야 한다.
    const config = merge(merge(clone(DEFAULT_CONFIG), window.OPEN_API_AUTO_TEST_CONFIG || {}), storedConfig ? stripSecrets(storedConfig) : {});
    const state = {
        activeCode: null,
        filteredCodes: [],
        selectedCodes: new Set(),
        running: false,
        shared: freshShared(),
        token: "",
        companyId: "",
        authMethod: "signature",
        viewMode: "group",
        lastReportData: null,
        selectedHistoryId: null,
        stopRequested: false,       // [중지] 클릭 후 true — 다음 step부터 SKIP("사용자 중지")
        cleanupPhase: false,        // 중지 후 정리 step 실행 중이면 true — 이때는 request()가 막지 않는다
        activeControllers: new Set(), // 진행 중 요청의 AbortController (중지 시 취소)
        resultFilter: "all",        // 결과 표 필터: all | FAIL | CHECK | SKIP (P1-12)
        expandedAll: false          // [모두 펼치기] 상태 (P1-12)
    };
    const els = {};
    const DUMMY_PDF_BASE64 = "JVBERi0xLjEKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9LaWRzIFszIDAgUl0gL0NvdW50IDEgPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL1BhZ2UgL1BhcmVudCAyIDAgUiAvTWVkaWFCb3ggWzAgMCAyMDAgMjAwXSA+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAp0cmFpbGVyCjw8IC9TaXplIDQgL1Jvb3QgMSAwIFIgPj4Kc3RhcnR4cmVmCjE5OQolJUVPRg==";
    const DUMMY_ATTACH_FILES = [{
        src: `data:application/pdf;base64,${DUMMY_PDF_BASE64}`,
        filetype: "pdf",
        filename: "auto_test_attach.pdf"
    }];

    // 회사 도장(OPA 026/028) 테스트용 임의 이미지를 canvas로 즉석 생성.
    // 반환값은 PNG data URL("data:image/png;base64,..."). stamp.path가 순수 base64만
    // 받는 환경이면 STAMP_USE_DATA_URI를 false로 바꿔 접두어를 제거한다.
    const STAMP_USE_DATA_URI = true;
    function makeStampImage() {
        const c = document.createElement("canvas");
        c.width = c.height = 120;
        const ctx = c.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 120, 120);
        ctx.strokeStyle = "#d64545";
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.arc(60, 60, 52, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = "#d64545";
        ctx.font = "bold 30px sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("自動", 60, 60);
        const dataUri = c.toDataURL("image/png");
        return STAMP_USE_DATA_URI ? dataUri : dataUri.replace(/^data:image\/png;base64,/, "");
    }
    const SEED_STEPS = new Set([
        "listFormsForSeed",
        "listDocsBasic",
        "listCompletedDocsForDownload"
    ]);

    // eformsign API가 정리/삭제 등에서 반환하는 4xx 중 "의도된 동작일 수 있어 사용자 확인이 필요한" 코드.
    // 이 코드들은 PASS가 아닌 CHECK(검토 필요)로 표시한다.
    // 404는 포함하지 않음 — 정리 step에서 404는 실제 오류이므로 FAIL로 떨어진다.
    const CHECK_STATUS_CODES = [400, 401, 402, 403];

    // 실행 확인 모달(P1-11)에 표시할 "계정에 변경을 남기는" step 분류.
    // 키에 없는 step은 조회 전용으로 본다.
    const WRITE_STEP_KINDS = {
        tryCreateAuto: "문서 작성",
        createDocWithAttach: "문서 작성",
        createExternalDoc: "외부 문서 작성",
        seedInternalDoc: "문서 작성",
        tryMassCreateAuto: "문서 일괄 작성",
        tryMassCreateMultiAuto: "문서 일괄 작성",
        massCreateDocs: "문서 일괄 작성",
        massCreateMultiDocs: "문서 일괄 작성",
        rerequestDoc: "수신자 재요청 발송",
        trySendPdfAuto: "완료 문서 PDF 발송",
        sendPdf: "완료 문서 PDF 발송",
        tryRefreshCompleteTokenAuto: "완료 토큰 기한 연장",
        refreshCompleteToken: "완료 토큰 기한 연장",
        cancelDocs: "문서 취소",
        deleteDocs: "문서 삭제",
        createMember: "멤버 추가",
        bulkCreateMembers: "멤버 일괄 추가",
        updateMember: "멤버 수정",
        deleteMember: "멤버 삭제",
        cleanupBulk1: "멤버 삭제",
        cleanupBulk2: "멤버 삭제",
        createGroup: "그룹 추가",
        updateGroup: "그룹 수정",
        deleteGroup: "그룹 삭제",
        createStamp: "도장 생성",
        deleteStamp: "도장 삭제"
    };

    // [중지] 후에도 실행하는 정리 step과, 정리할 자원이 실제로 있는지 판정하는 함수 (P1-11).
    // 선행 step FAIL 시의 동작(정리 step도 SKIP)은 바꾸지 않는다 — 기획서 0절 P0-13 제외 결정.
    const STOP_CLEANUP_TARGETS = {
        cancelDocs: () => state.shared.createdIdList.length > 0,
        deleteDocs: () => state.shared.createdIdList.length > 0,
        deleteGroup: () => has(state.shared.createdGroupId),
        deleteMember: () => state.shared.memberCreated === true,
        cleanupBulk1: () => has(state.shared.bulkMemberIds[0]),
        cleanupBulk2: () => has(state.shared.bulkMemberIds[1]),
        deleteStamp: () => has(state.shared.companyStampId)
    };
    const STOP_REASON = "사용자 중지";

    const scenarios = [
        { code: "OPA 003", group: "문서", method: "GET", name: "문서 정보 조회", desc: "작성 가능한 템플릿 목록에서 자동 추출한 ID로 문서를 생성한 뒤 기본/상세 조회를 검증합니다.", steps: ["listFormsForSeed", "tryCreateAuto", "docInfoBasic", "docInfoDetail", "cancelDocs", "deleteDocs"], keys: ["auth.mode"] },
        { code: "OPA 004", group: "문서", method: "GET", name: "문서 파일 다운로드", desc: "완료(status_type=003) 문서 목록을 조회하여 최대 5개의 문서 ID를 자동 수집한 뒤 순차적으로 다운로드를 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listCompletedDocsForDownload", "tryDownloadDocAuto"], keys: ["auth.mode"] },
        { code: "OPA 005", group: "문서", method: "POST", name: "새 문서 작성 (내부)", desc: "작성 가능한 템플릿 목록에서 최대 10개를 자동 추출한 뒤 순차적으로 문서 작성을 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listFormsForSeed", "tryCreateAuto", "cancelDocs", "deleteDocs"], keys: ["auth.mode"] },
        { code: "OPA 006", group: "문서", method: "GET", name: "문서 첨부 파일 다운로드", desc: "첨부 컴포넌트가 있는 템플릿으로 문서를 생성한 뒤, 해당 문서의 첨부 파일 다운로드를 검증합니다.", steps: ["createDocWithAttach", "downloadAttachAuto", "cancelDocs", "deleteDocs"], keys: ["auth.mode", "data.attachTemplateId", "data.attachFieldId"] },
        { code: "OPA 007", group: "문서", method: "POST", name: "새 문서 작성 (외부)", desc: "외부 문서를 생성하고 정리합니다. company_id와 API Key는 토큰 발급 정보에서 자동으로 채워집니다.", steps: ["createExternalDoc", "cancelDocs", "deleteDocs"], keys: ["auth.mode", "data.extTemplateId"] },
        { code: "OPA 008", group: "문서", method: "POST", name: "문서 목록 조회", desc: "문서 목록 기본/상세 조회를 검증합니다.", steps: ["listDocsBasic", "listDocsDetail"], keys: ["auth.mode"] },
        { code: "OPA 010", group: "멤버", method: "GET", name: "멤버 목록 조회", desc: "멤버 목록 조회를 검증합니다.", steps: ["listMembers"], keys: ["auth.mode"] },
        { code: "OPA 011", group: "멤버", method: "POST", name: "멤버 추가", desc: "테스트 멤버를 추가하고 정리합니다.", steps: ["createMember", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 012", group: "멤버", method: "PATCH", name: "멤버 수정", desc: "테스트 멤버를 생성, 수정 후 정리합니다.", steps: ["createMember", "updateMember", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 013", group: "멤버", method: "DELETE", name: "멤버 삭제", desc: "테스트 멤버를 생성한 뒤 삭제를 검증합니다.", steps: ["createMember", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 014", group: "문서", method: "POST", name: "수신자 문서 재요청", desc: "작성 가능한 템플릿 목록에서 자동 추출한 ID로 문서를 생성한 뒤 수신자 재요청을 검증합니다.", steps: ["listFormsForSeed", "tryCreateAuto", "rerequestDoc", "cancelDocs", "deleteDocs"], keys: ["auth.mode", "data.targetEmail"] },
        { code: "OPA 015", group: "문서", method: "GET", name: "작성 가능한 템플릿 목록", desc: "작성 가능한 템플릿 목록을 조회합니다.", steps: ["listForms"], keys: ["auth.mode"] },
        { code: "OPA 016", group: "문서", method: "POST", name: "문서 일괄 작성", desc: "작성 가능한 템플릿 목록에서 최대 10개를 자동 추출한 뒤 순차적으로 일괄 문서 작성을 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listFormsForSeed", "tryMassCreateAuto"], keys: ["auth.mode"] },
        { code: "OPA 017", group: "그룹", method: "GET", name: "그룹 목록 조회", desc: "그룹 목록 조회를 검증합니다.", steps: ["listGroups"], keys: ["auth.mode"] },
        { code: "OPA 018", group: "그룹", method: "POST", name: "그룹 추가", desc: "테스트 그룹 생성 후 정리합니다.", steps: ["createMember", "createGroup", "deleteGroup", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 019", group: "그룹", method: "PATCH", name: "그룹 수정", desc: "테스트 그룹 생성, 수정 후 정리합니다.", steps: ["createMember", "createGroup", "updateGroup", "deleteGroup", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 020", group: "그룹", method: "DELETE", name: "그룹 삭제", desc: "테스트 그룹 생성 후 삭제를 검증합니다.", steps: ["createMember", "createGroup", "deleteGroup", "deleteMember"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 021", group: "문서", method: "POST", name: "문서 일괄 작성 (멀티)", desc: "작성 가능한 템플릿 목록에서 최대 10개를 자동 추출한 뒤 2개씩 조합하여 멀티 일괄 문서 작성을 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listFormsForSeed", "tryMassCreateMultiAuto"], keys: ["auth.mode"] },
        { code: "OPA 025", group: "회사 도장", method: "GET", name: "회사 도장 정보 조회", desc: "도장 목록을 먼저 조회한 뒤 상세를 검증합니다.", steps: ["listStamps", "stampDetail"], keys: ["auth.mode"] },
        { code: "OPA 026", group: "회사 도장", method: "POST", name: "회사 도장 추가", desc: "임의 생성한 도장 이미지로 회사 도장을 추가한 뒤 삭제로 정리합니다. 별도 입력값이 필요 없습니다.", steps: ["createStamp", "deleteStamp"], keys: ["auth.mode"] },
        { code: "OPA 028", group: "회사 도장", method: "DELETE", name: "회사 도장 삭제", desc: "임의 생성한 도장 이미지로 회사 도장을 추가한 뒤 삭제 API를 검증합니다. 별도 입력값이 필요 없습니다.", steps: ["createStamp", "deleteStamp"], keys: ["auth.mode"] },
        { code: "OPA 029", group: "회사 도장", method: "GET", name: "회사 도장 목록 조회", desc: "회사 도장 목록 조회를 검증합니다.", steps: ["listStamps"], keys: ["auth.mode"] },
        { code: "OPA 030", group: "멤버", method: "POST", name: "멤버 일괄 추가", desc: "일괄 멤버 추가와 정리를 검증합니다.", steps: ["bulkCreateMembers", "cleanupBulk1", "cleanupBulk2"], keys: ["auth.mode", "data.memberId"] },
        { code: "OPA 037", group: "문서", method: "POST", name: "일괄 완료 문서 PDF 전송", desc: "완료 문서 최대 5개를 수집한 뒤 2개 조합으로 PDF 전송을 시도하고, 하나라도 성공하면 통과합니다. company_id는 토큰 발급 정보에서 자동으로 채워집니다.", steps: ["listDocsBasic", "trySendPdfAuto"], keys: ["auth.mode", "data.pdfTargetEmail|data.pdfTargetPhone"] },
        { code: "OPA 040", group: "문서", method: "POST", name: "문서 파일 일괄 다운로드", desc: "완료 문서 최대 5개를 수집한 뒤 2개 조합으로 일괄 다운로드를 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listDocsBasic", "tryDownloadMultiAuto"], keys: ["auth.mode"] },
        { code: "OPA 042", group: "문서", method: "POST", name: "문서 취소", desc: "작성 가능한 템플릿 목록에서 자동 추출한 ID로 문서를 생성한 뒤 취소 API를 검증합니다.", steps: ["listFormsForSeed", "tryCreateAuto", "cancelDocs", "deleteDocs"], keys: ["auth.mode"] },
        { code: "OPA 045", group: "문서", method: "POST", name: "완료 토큰 기한 연장", desc: "완료 문서 최대 5개를 수집한 뒤 순차적으로 기한 연장을 시도하고, 하나라도 성공하면 통과합니다.", steps: ["listDocsBasic", "tryRefreshCompleteTokenAuto"], keys: ["auth.mode"] }
    ];

    document.addEventListener("DOMContentLoaded", init);

    function init() {
        [
            "envSelect", "customUrlInput", "baseUrlBadge", "configBadge", "scenarioSearch", "scenarioList", "selectAllBtn", "clearAllBtn",
            "runActiveBtn", "runSelectedBtn", "openReportBtn", "selectedCount", "plannedStepCount", "readinessLabel", "lastRunSummary",
            "activeScenarioTitle", "activeScenarioDescription", "activeScenarioMissing", "missingSectionWrap", "pipelineList", "configStatusList", "progressText", "progressBar", "resultTableBody",
            "settingsEditor", "saveSettingsBtn", "reloadSettingsBtn", "resetSettingsBtn", "settingsStatusText",
            "openSettingsModalBtn", "openSettingsModalBtnInline", "closeSettingsModalBtn", "settingsModalCard", "settingsModalOverlay", "settingsSummaryText",
            "authPanelToggle", "authStatusBadge", "authCompanyIdDisplay", "authCompanyIdValue",
            "modalIssueTokenBtn", "modalClearTokenBtn", "modalTokenDisplay", "modalCompanyIdDisplay", "modalCompanyIdValue", "modalAuthMessage",
            "sortGroupBtn", "sortOpaBtn",
            "reportModal", "reportModalBody", "downloadReportMarkdownBtn", "downloadReportHtmlBtn", "closeReportBtn",
            "stopRunBtn", "runNotice", "runConfirmModal", "runConfirmBody", "runConfirmOkBtn", "runConfirmCancelBtn",
            "resultFilterBar", "expandAllBtn", "rerunFailedBtn"
        ].forEach((id) => { els[id] = document.getElementById(id); });

        // 이전 버전이 저장한 비밀키·토큰 제거 (1회 마이그레이션, 이후에는 저장 경로에서 항상 제외됨)
        if (migrateStoredSecrets()) {
            console.info("[OpenAPIAutoTest] localStorage에 남아 있던 비밀키·토큰을 제거했습니다. 비밀키는 [인증 저장]으로 서버에 암호화 저장하세요.");
        }

        Object.entries(config.environments || {}).forEach(([key, value]) => {
            els.envSelect.insertAdjacentHTML("beforeend", `<option value="${esc(key)}">${esc(value.label || key)}</option>`);
        });
        els.envSelect.value = config.defaultEnvironment in config.environments ? config.defaultEnvironment : Object.keys(config.environments)[0];

        // 처음 방문하면 선택 없음. 이전에 고른 OPA는 프로필별로 기억해 복원한다 (P1-11, Q12)
        restoreSelection();
        state.activeCode = scenarios[0] ? scenarios[0].code : null;

        initAuthPanel();

        els.envSelect.addEventListener("change", handleHeaderEnvironmentChange);
        els.customUrlInput.addEventListener("input", handleHeaderCustomUrlInput);
        els.scenarioSearch.addEventListener("input", refreshAll);
        els.selectAllBtn.addEventListener("click", () => { scenarios.forEach((s) => state.selectedCodes.add(s.code)); saveSelection(); hideRunNotice(); refreshAll(); });
        els.clearAllBtn.addEventListener("click", () => { state.selectedCodes.clear(); saveSelection(); refreshAll(); });
        els.sortGroupBtn.addEventListener("click", () => { state.viewMode = "group"; els.sortGroupBtn.classList.add("active"); els.sortOpaBtn.classList.remove("active"); renderList(); });
        els.sortOpaBtn.addEventListener("click", () => { state.viewMode = "opa"; els.sortOpaBtn.classList.add("active"); els.sortGroupBtn.classList.remove("active"); renderList(); });
        els.runSelectedBtn.addEventListener("click", () => requestRun([...state.selectedCodes]));
        els.runActiveBtn.addEventListener("click", () => requestRun(state.activeCode ? [state.activeCode] : []));
        if (els.stopRunBtn) els.stopRunBtn.addEventListener("click", requestStop);
        if (els.runConfirmModal) {
            els.runConfirmModal.addEventListener("click", (event) => { if (event.target === els.runConfirmModal) closeRunConfirm(false); });
            els.runConfirmCancelBtn.addEventListener("click", () => closeRunConfirm(false));
            els.runConfirmOkBtn.addEventListener("click", () => closeRunConfirm(true));
            document.addEventListener("keydown", (event) => {
                if (event.key === "Escape" && els.runConfirmModal.classList.contains("open")) closeRunConfirm(false);
            });
        }
        // 실행 중 탭 닫기·새로고침 경고 (진행 중 요청이 끊기면 정리 step이 실행되지 않는다)
        window.addEventListener("beforeunload", (event) => {
            if (!state.running) return;
            event.preventDefault();
            event.returnValue = "";
        });
        els.openReportBtn.addEventListener("click", openReportModal);
        els.downloadReportMarkdownBtn.addEventListener("click", () => downloadReport("md"));
        els.downloadReportHtmlBtn.addEventListener("click", () => downloadReport("html"));
        els.closeReportBtn.addEventListener("click", closeReportModal);
        els.reportModal.addEventListener("click", (event) => { if (event.target === els.reportModal) closeReportModal(); });
        els.saveSettingsBtn.addEventListener("click", saveSettingsFromEditor);
        els.reloadSettingsBtn.addEventListener("click", loadSettingsIntoEditor);
        els.resetSettingsBtn.addEventListener("click", resetStoredSettings);

        bindResultTable();
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
        els.plannedStepCount.textContent = `${totalScenarioSteps([...state.selectedCodes])}개`;
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
                saveSelection();
                if (state.selectedCodes.size) hideRunNotice();
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
            tryCreateAuto: ["POST", "새 문서 작성 (자동 선택 - 최대 10개 시도)"],
            tryMassCreateAuto: ["POST", "문서 일괄 작성 (자동 선택 - 최대 10개 시도)"],
            tryMassCreateMultiAuto: ["POST", "문서 일괄 작성 - 멀티 (자동 선택 조합 시도)"],
            docInfoBasic: ["GET", "문서 정보 조회 - 기본"],
            docInfoDetail: ["GET", "문서 정보 조회 - 상세"],
            listCompletedDocsForDownload: ["POST", "완료 문서 목록 조회 (자동 탐색 - status 003)"],
            tryDownloadDocAuto: ["GET", "문서 파일 다운로드 (자동 선택 - 최대 5개 시도)"],
            downloadDoc: ["GET", "문서 파일 다운로드"],
            createDocWithAttach: ["POST", "새 문서 작성 (첨부파일 포함)"],
            downloadAttachAuto: ["GET", "문서 첨부 파일 다운로드 (자동)"],
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
            createStamp: ["POST", "회사 도장 추가"],
            deleteStamp: ["DELETE", "회사 도장 삭제"],
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
        if (id === "createDocWithAttach") {
            const templateId = must(d.attachTemplateId, "첨부 템플릿 ID가 비어 있습니다.");
            const fieldId = d.attachFieldId || "첨부 1";
            const body = {
                document: {
                    document_name: "OPA 006 첨부파일 자동 테스트",
                    comment: "Auto Test - 첨부 파일 다운로드 검증용",
                    fields: [{
                        id: fieldId,
                        value: JSON.stringify(DUMMY_ATTACH_FILES)
                    }],
                    recipients: [],
                    parameters: [],
                    notification: []
                }
            };
            return request({ id, method: "POST", path: `/v2.0/api/documents?template_id=${encodeURIComponent(templateId)}`, body, ok: [200], after: (json) => rememberDoc(json) });
        }
        if (id === "downloadAttachAuto") return request({ id, method: "GET", path: `/v2.0/api/documents/${encodeURIComponent(must(state.shared.lastCreatedId, "첨부 문서가 생성되지 않았습니다."))}/download_attach_files`, ok: [200] });
        if (id === "createExternalDoc") return request({ id, method: "POST", useToken: false, headers: { Authorization: `Bearer ${btoa(must(d.companyApiKey, "companyApiKey가 비어 있습니다."))}` }, path: `/v2.0/api/documents/external?company_id=${encodeURIComponent(must(d.companyId, "companyId가 비어 있습니다."))}&template_id=${encodeURIComponent(must(d.extTemplateId, "extTemplateId가 비어 있습니다."))}`, body: docBody(), ok: [200], after: (json) => rememberDoc(json) });
        if (id === "listDocsBasic") return request({ id, method: "POST", path: "/v2.0/api/list_document", body: listBody(), ok: [200], after: (json) => { const docs = Array.isArray(json.documents) ? json.documents : []; state.shared.completedDocIds = docs.filter((doc) => doc.current_status && doc.current_status.status_type === "003").slice(0, 5).map((doc) => doc.id); } });
        if (id === "listDocsDetail") return request({ id, method: "POST", path: "/v2.0/api/list_document?include_fields=true&include_histories=true&include_previous_status=true&include_next_status=true&include_external_token=true&include_detail_template_info=true", body: listBody(), ok: [200] });
        if (id === "listMembers") return request({ id, method: "GET", path: "/v2.0/api/members", ok: [200] });
        if (id === "createMember") return request({ id, method: "POST", path: "/v2.0/api/members?mailOption=false", body: { account: { id: must(d.memberId, "memberId가 비어 있습니다."), password: "forcs1700!@", first_name: "자동", last_name: "테스트", external_sso_info: { uuid: "123", account_id: "test" } } }, ok: [200], check: CHECK_STATUS_CODES });
        if (id === "updateMember") return request({ id, method: "PATCH", path: `/v2.0/api/members/${encodeURIComponent(must(d.memberId, "memberId가 비어 있습니다."))}`, body: { account: { id: d.memberId, name: "자동수정 테스트", enabled: true, contact: { number: "010-1111-1111", tel: "02-1234-5678" }, department: "테스트팀", position: "자동화", role: ["template_manager"] } }, ok: [200] });
        if (id === "deleteMember") return request({ id, method: "DELETE", path: `/v2.0/api/members/${encodeURIComponent(must(d.memberId, "memberId가 비어 있습니다."))}`, ok: [200], check: CHECK_STATUS_CODES });
        if (id === "rerequestDoc") return request({ id, method: "POST", path: `/v2.0/api/documents/${must(state.shared.lastCreatedId, "재요청 대상 문서가 없습니다.")}/re_request_outsider`, body: rerequestBody(), ok: [200] });
        if (id === "listForms") return request({ id, method: "GET", path: "/v2.0/api/forms", ok: [200] });
        if (id === "listFormsForSeed") return request({ id, method: "GET", path: "/v2.0/api/forms", ok: [200], after: (json) => {
            const forms = Array.isArray(json.templates) ? json.templates : [];
            state.shared.candidateTemplateIds = forms.filter((f) => f.enabled !== false).slice(0, 10).map((f) => f.form_id);
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
        if (id === "deleteGroup") return request({ id, method: "DELETE", path: "/v2.0/api/groups", body: { group_ids: [must(state.shared.createdGroupId, "삭제할 그룹 ID가 없습니다.")] }, ok: [200], check: CHECK_STATUS_CODES });
        if (id === "massCreateMultiDocs") return request({ id, method: "POST", path: "/v2.0/api/forms/mass_multi_documents", body: multiMassBody(), ok: [200], after: collectDocs });
        if (id === "listStamps") return request({ id, method: "GET", path: "/v2.0/api/company_stamp", ok: [200], after: (json) => { const first = Array.isArray(json.company_stamps) ? json.company_stamps[0] : null; state.shared.companyStampId = first ? first.id : null; } });
        if (id === "stampDetail") return request({ id, method: "GET", path: `/v2.0/api/company_stamp/${must(state.shared.companyStampId, "조회할 회사 도장 ID가 없습니다.")}`, ok: [200] });
        if (id === "createStamp") return request({ id, method: "POST", path: "/v2.0/api/company_stamp", body: { company_stamp: { name: `OPA자동테스트_${Date.now()}`, description: "Open API 자동 테스트 도장", stamp: { path: makeStampImage() }, auth: { groups: [], members: [], allow_all_members: true } } }, ok: [200], after: (json) => { state.shared.companyStampId = (json && json.company_stamp && json.company_stamp.id) || null; } });
        if (id === "deleteStamp") return request({ id, method: "DELETE", path: `/v2.0/api/company_stamp/${encodeURIComponent(must(state.shared.companyStampId, "삭제할 회사 도장 ID가 없습니다."))}`, ok: [200] });
        if (id === "bulkCreateMembers") return request({ id, method: "POST", path: "/v2.0/api/list_members", body: bulkBody(), ok: [200], validate: (json) => { const members = Array.isArray(json.members) ? json.members : []; const failed = members.filter((m) => m.success === false); return failed.length ? `${failed.length}/${members.length}개 멤버 추가 실패 (success:false): ${failed.map((m) => m.id || m.name || "(미상)").join(", ")}` : null; } });
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
        if (id === "cleanupBulk1") return request({ id, method: "DELETE", path: `/v2.0/api/members/${encodeURIComponent(must(state.shared.bulkMemberIds[0], "정리할 bulk member 1이 없습니다."))}`, ok: [200], check: CHECK_STATUS_CODES });
        if (id === "cleanupBulk2") return request({ id, method: "DELETE", path: `/v2.0/api/members/${encodeURIComponent(must(state.shared.bulkMemberIds[1], "정리할 bulk member 2가 없습니다."))}`, ok: [200], check: CHECK_STATUS_CODES });
        if (id === "cancelDocs") return request({ id, method: "POST", path: "/v2.0/api/documents/cancel", body: { input: { document_ids: must(state.shared.createdIdList, "취소할 문서가 없습니다.") } }, ok: [200], check: CHECK_STATUS_CODES });
        if (id === "deleteDocs") return request({ id, method: "DELETE", path: "/v2.0/api/documents", body: { document_ids: must(state.shared.createdIdList, "삭제할 문서가 없습니다.") }, ok: [200], check: CHECK_STATUS_CODES });
        throw new Error(`정의되지 않은 step: ${id}`);
    }

    async function token() {
        if (state.token) return state.token;

        // 설정 모달 인증 입력값 우선 사용
        const { apiKey: panelApiKey, memberId: panelMemberId, secretKey: panelSecretKey } = authInputs();

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
        const domain = baseUrl();

        // 공유 모듈(assets/js/token-issuer.js): 브라우저 직접 호출을 1차로 두고,
        // 전송실패(CORS/네트워크)일 때만 /api/getToken 프록시로 재시도한다. 인증 거부는 즉시 실패.
        // (과거 b829055에서 프록시 단독 구조가 일부 on-premise 도메인 ConnectTimeout을 만들었던 이력 때문)
        const result = await window.issueAccessToken({ domain, apiKey, memberId, signature, execTime });
        if (!result.ok) throw new Error(result.message || "Access Token 발급에 실패했습니다.");

        state.token = must(result.token, "응답에서 access_token을 찾지 못했습니다.");
        const cid = result.data?.api_key?.company?.company_id;
        if (cid) state.companyId = cid;
        updateAuthPanelUI();
        attachTokenBadges(result);
        return state.token;
    }

    // 토큰 상태 배지 (assets/js/token-badge.js) — 인증 패널·설정 모달 두 곳
    const TOKEN_BADGE_IDS = ["#authTokenBadge", "#modalTokenBadge"];

    function attachTokenBadges(result) {
        if (!window.TokenBadge) return;
        // [토큰 재발급] → 설정 모달을 열고 모달의 토큰 발급을 실행 (실행 중에는 막는다)
        const onReissue = () => {
            if (state.running) { showRunNotice("실행 중에는 토큰을 재발급할 수 없습니다. 실행이 끝난 뒤 다시 시도해 주세요."); return; }
            openSettingsModal();
            if (els.modalIssueTokenBtn) els.modalIssueTokenBtn.click();
        };
        TOKEN_BADGE_IDS.forEach((sel) => window.TokenBadge.attach(sel, result, { onReissue }));
        updateAuthPanelUI();
    }

    function markTokenBadgesExpired() {
        if (!window.TokenBadge) return;
        TOKEN_BADGE_IDS.forEach((sel) => window.TokenBadge.markExpired(sel));
    }

    function clearTokenBadges() {
        if (!window.TokenBadge) return;
        TOKEN_BADGE_IDS.forEach((sel) => window.TokenBadge.clear(sel));
    }

    async function request({ id, method, path, body, ok, check, after, validate, headers, useToken = true }) {
        const requestHeaders = {
            "Content-Type": "application/json",
            ...(useToken ? { Authorization: `Bearer ${await token()}` } : {}),
            ...(headers || {})
        };
        // [중지] 후에는 정리 step 외의 요청을 보내지 않는다 (try* 반복 시도 중간에도 멈춤)
        if (state.stopRequested && !state.cleanupPhase) throw stopError();

        const options = { method, headers: requestHeaders };
        if (body !== undefined && body !== null) options.body = JSON.stringify(body);

        const url = `${baseUrl()}${path}`;
        // 요청마다 AbortController — 60초 넘으면 타임아웃 (P1-11).
        // [중지] 시에는 조회 요청만 즉시 취소한다. 쓰기(WRITE_STEP_KINDS) 요청은 서버가 이미 처리했을 수 있으므로
        // 취소하지 않고 완료를 기다려 결과(문서·멤버·그룹·도장 ID)를 정리 대상에 등록한다 (D-1).
        const controller = new AbortController();
        let timedOut = false;
        const timer = setTimeout(() => { timedOut = true; controller.abort(); }, REQUEST_TIMEOUT_MS);
        const abortOnStop = !WRITE_STEP_KINDS[id];
        if (abortOnStop) state.activeControllers.add(controller);
        options.signal = controller.signal;

        const start = performance.now();
        let response;
        let text = "";
        let json = null;
        try {
            response = await fetch(url, options);
            // 토큰을 실어 보낸 요청이 401이면 배지를 "만료됨 · [토큰 재발급]"으로 바꾼다
            if (useToken && response.status === 401) markTokenBadgesExpired();
            const type = response.headers.get("content-type") || "";
            if (["pdf", "zip", "octet-stream", "image"].some((keyword) => type.includes(keyword))) {
                const blob = await response.blob();
                text = `[Binary File] ${type} (${blob.size} bytes)`;
            } else {
                text = await response.text();
                try { json = JSON.parse(text); text = JSON.stringify(json, null, 2); } catch (error) {}
            }
        } catch (error) {
            if (timedOut) {
                return { statusType: "FAIL", responseStatus: "TIMEOUT", method, label: stepMeta(id).label, url, duration: `${Math.round(performance.now() - start)}ms`, requestBody: body, responseText: `요청이 ${REQUEST_TIMEOUT_MS / 1000}초 안에 끝나지 않아 취소했습니다. 네트워크 상태나 대상 서버를 확인해 주세요.` };
            }
            if (controller.signal.aborted) throw stopError(true);
            throw error;
        } finally {
            clearTimeout(timer);
            state.activeControllers.delete(controller);
        }
        const duration = `${Math.round(performance.now() - start)}ms`;
        let statusType;
        if (ok.includes(response.status)) statusType = "PASS";
        else if (Array.isArray(check) && check.includes(response.status)) statusType = "CHECK";
        else statusType = "FAIL";

        // 200 OK여도 응답 body가 실패를 나타내면(예: 일괄 처리의 success:false) FAIL로 전환한다.
        // body 원문은 유지하고 사유만 앞에 덧붙여, 어떤 항목이 실패했는지 확인할 수 있게 한다.
        let validationNote = "";
        if (statusType === "PASS" && typeof validate === "function") {
            const problem = validate(json || {});
            if (problem) { statusType = "FAIL"; validationNote = String(problem); }
        }
        if (statusType === "PASS" && typeof after === "function") after(json || {});
        const responseText = validationNote ? `[검증 실패] ${validationNote}\n\n${text}` : text;
        return { statusType, responseStatus: response.status, method, label: stepMeta(id).label, url, duration, requestBody: body, responseText };
    }

    // ── 결과 표 (P1-12: 필터·모두 펼치기·요청/응답/cURL 복사) ─────────────────
    // 행 데이터는 rowId → result 맵에 보관하고, 버튼 클릭은 tbody 하나의 위임 리스너로 처리한다.
    const resultRows = new Map();
    let resultGroupIndex = 0;

    function resetResultTable() {
        resultRows.clear();
        resultGroupIndex = 0;
        if (els.resultTableBody) els.resultTableBody.innerHTML = "";
        state.resultFilter = "all";
        state.expandedAll = false;
        updateResultToolbar();
    }

    function appendRow(index, result, stepId) {
        const rowId = `result-log-${index}`;
        const status = result.statusType || "FAIL";
        const statusClass = status === "PASS" ? "status-pass" : status === "CHECK" ? "status-check" : ["SKIP", "CACHE"].includes(status) ? "status-skip" : "status-fail";
        const row = { ...result, stepId: result.stepId || stepId || "" };
        resultRows.set(rowId, row);
        const canCurl = /^https?:\/\//i.test(row.url || "");
        els.resultTableBody.insertAdjacentHTML("beforeend", `
            <tr class="result-row" data-status="${esc(status)}" data-group="${resultGroupIndex}" data-row="${rowId}">
                <td>${index}</td>
                <td><div class="step-name">${esc(result.label)}</div><div class="step-url">${esc(result.url || "(URL 없음)")}</div></td>
                <td>${esc(result.method)}</td>
                <td><span class="status-pill ${statusClass}">${esc(status)} ${esc(String(result.responseStatus || ""))}</span></td>
                <td>${esc(result.duration)}</td>
                <td><button class="log-btn" type="button" data-log-target="${rowId}" aria-expanded="false">결과 보기</button></td>
            </tr>
            <tr class="log-row" data-for="${rowId}"><td colspan="6"><div class="log-box" id="${rowId}"${state.expandedAll ? ' style="display:block"' : ""}>
                <div class="log-actions">
                    <button class="log-btn" type="button" data-copy="request" data-row="${rowId}">요청 복사</button>
                    <button class="log-btn" type="button" data-copy="response" data-row="${rowId}">응답 복사</button>
                    <button class="log-btn" type="button" data-copy="curl" data-row="${rowId}"${canCurl ? "" : " disabled title=\"요청 URL이 없는 step입니다\""}>cURL로 복사</button>
                </div>
                <h3>Request Body</h3><pre>${esc(requestBodyText(result.requestBody, true) || "(Empty)")}</pre>
                <h3 style="margin-top:12px;">Response</h3><pre>${esc(result.responseText || "(Empty)")}</pre>
            </div></td></tr>
        `);
        if (state.expandedAll) {
            const btn = els.resultTableBody.querySelector(`[data-log-target="${rowId}"]`);
            if (btn) btn.setAttribute("aria-expanded", "true");
        }
        applyResultFilter();
    }

    function appendOpaDivider(scenario) {
        if (!els.resultTableBody || !scenario) return;
        resultGroupIndex += 1;
        els.resultTableBody.insertAdjacentHTML("beforeend", `
            <tr class="opa-divider-row" data-group="${resultGroupIndex}">
                <td colspan="6" style="background:#f1f5f9;color:#0f172a;font-weight:700;padding:8px 14px;border-bottom:1px solid #e2e8f0;">
                    ${esc(scenario.code)} — ${esc(scenario.name)}
                </td>
            </tr>
        `);
        applyResultFilter();
    }

    // requestBody는 객체이거나, 이력 스냅샷에서 절단된 문자열일 수 있다
    function requestBodyText(body, pretty) {
        if (body === undefined || body === null || body === "") return "";
        if (typeof body === "string") return body;
        return pretty ? JSON.stringify(body, null, 2) : JSON.stringify(body);
    }

    // [전체|FAIL|CHECK|SKIP] 필터. OPA 구분 행은 그 OPA에 보이는 행이 있을 때만 표시한다.
    function applyResultFilter() {
        if (!els.resultTableBody) return;
        const filter = state.resultFilter || "all";
        const visibleGroups = new Set();
        els.resultTableBody.querySelectorAll("tr.result-row").forEach((tr) => {
            const show = filter === "all" || tr.getAttribute("data-status") === filter;
            tr.hidden = !show;
            const logRow = els.resultTableBody.querySelector(`tr.log-row[data-for="${tr.getAttribute("data-row")}"]`);
            if (logRow) logRow.hidden = !show;
            if (show) visibleGroups.add(tr.getAttribute("data-group"));
        });
        els.resultTableBody.querySelectorAll("tr.opa-divider-row").forEach((tr) => {
            tr.hidden = filter !== "all" && !visibleGroups.has(tr.getAttribute("data-group"));
        });
        updateResultToolbar();
    }

    function updateResultToolbar() {
        if (!els.resultFilterBar) return;
        const counts = { all: 0, FAIL: 0, CHECK: 0, SKIP: 0 };
        resultRows.forEach((row) => {
            counts.all += 1;
            if (counts[row.statusType] !== undefined) counts[row.statusType] += 1;
        });
        els.resultFilterBar.querySelectorAll("[data-filter]").forEach((btn) => {
            const key = btn.getAttribute("data-filter");
            const active = (state.resultFilter || "all") === key;
            btn.classList.toggle("active", active);
            btn.setAttribute("aria-pressed", active ? "true" : "false");
            const count = btn.querySelector(".filter-count");
            if (count) count.textContent = String(counts[key] || 0);
        });
        if (els.expandAllBtn) {
            els.expandAllBtn.textContent = state.expandedAll ? "모두 접기" : "모두 펼치기";
            els.expandAllBtn.disabled = resultRows.size === 0;
        }
    }

    function toggleExpandAll() {
        state.expandedAll = !state.expandedAll;
        els.resultTableBody.querySelectorAll(".log-box").forEach((box) => { box.style.display = state.expandedAll ? "block" : "none"; });
        els.resultTableBody.querySelectorAll("[data-log-target]").forEach((btn) => btn.setAttribute("aria-expanded", state.expandedAll ? "true" : "false"));
        updateResultToolbar();
    }

    // cURL 명령 — 인증 헤더는 항상 플레이스홀더. 실제 토큰·API Key는 넣지 않는다.
    // (OpenAPITester 스니펫 생성기는 C3 소유라 재사용하지 않고 여기서 독립 구현)
    function shellQuote(value) {
        return `'${String(value).replace(/'/g, "'\\''")}'`;
    }

    function buildCurl(row) {
        const authPlaceholder = row.stepId === "createExternalDoc" ? "<BASE64_COMPANY_API_KEY>" : "<ACCESS_TOKEN>";
        const lines = [
            `curl -X ${String(row.method || "GET").toUpperCase()} ${shellQuote(row.url)}`,
            `  -H ${shellQuote("Content-Type: application/json")}`,
            `  -H ${shellQuote(`Authorization: Bearer ${authPlaceholder}`)}`
        ];
        const body = requestBodyText(row.requestBody, false);
        if (body) lines.push(`  --data-raw ${shellQuote(body)}`);
        return lines.join(" \\\n");
    }

    function copyPayload(row, kind) {
        if (kind === "curl") return buildCurl(row);
        if (kind === "response") return row.responseText || "";
        const body = requestBodyText(row.requestBody, true);
        return `${row.method || ""} ${row.url || "(URL 없음)"}\n\n${body || "(본문 없음)"}`;
    }

    async function copyText(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (error) {
            // 아래 대체 경로로 진행
        }
        try {
            const ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            const ok = document.execCommand("copy");
            ta.remove();
            return ok;
        } catch (error) {
            return false;
        }
    }

    function bindResultTable() {
        if (!els.resultTableBody) return;
        els.resultTableBody.addEventListener("click", async (event) => {
            const toggle = event.target.closest("[data-log-target]");
            if (toggle) {
                const box = document.getElementById(toggle.getAttribute("data-log-target"));
                if (!box) return;
                const open = box.style.display !== "block";
                box.style.display = open ? "block" : "none";
                toggle.setAttribute("aria-expanded", open ? "true" : "false");
                return;
            }
            const copyBtn = event.target.closest("[data-copy]");
            if (!copyBtn || copyBtn.disabled) return;
            const row = resultRows.get(copyBtn.getAttribute("data-row"));
            if (!row) return;
            const original = copyBtn.textContent;
            const ok = await copyText(copyPayload(row, copyBtn.getAttribute("data-copy")));
            copyBtn.textContent = ok ? "복사됨" : "복사 실패";
            setTimeout(() => { copyBtn.textContent = original; }, 1200);
        });
        if (els.resultFilterBar) {
            els.resultFilterBar.addEventListener("click", (event) => {
                const btn = event.target.closest("[data-filter]");
                if (!btn) return;
                state.resultFilter = btn.getAttribute("data-filter");
                applyResultFilter();
            });
        }
        if (els.expandAllBtn) els.expandAllBtn.addEventListener("click", toggleExpandAll);
        if (els.rerunFailedBtn) els.rerunFailedBtn.addEventListener("click", rerunFailedOpas);
        updateResultToolbar();
    }

    // ── 재실행 (P1-12) ───────────────────────────────────────────────────
    function failedOpaCodes(report) {
        if (!report || !Array.isArray(report.opaSummary)) return [];
        const known = new Set(scenarios.map((s) => s.code));
        return report.opaSummary.filter((opa) => opa.result === "FAIL" && known.has(opa.code)).map((opa) => opa.code);
    }

    function updateRerunFailedButton() {
        if (!els.rerunFailedBtn) return;
        const codes = failedOpaCodes(state.lastReportData);
        els.rerunFailedBtn.style.display = codes.length ? "" : "none";
        els.rerunFailedBtn.textContent = `실패 OPA만 재실행 (${codes.length})`;
    }

    // 지정한 OPA 집합을 선택 상태로 바꾸고 실행 확인 모달을 연다
    function selectAndRequestRun(codes) {
        if (state.running) { showRunNotice("이미 실행 중입니다. 실행이 끝난 뒤 다시 시도해 주세요."); return; }
        const known = new Set(scenarios.map((s) => s.code));
        const runCodes = (codes || []).filter((code) => known.has(code));
        if (!runCodes.length) { showRunNotice("다시 실행할 OPA가 없습니다.", "info"); return; }
        state.selectedCodes = new Set(runCodes);
        saveSelection();
        refreshAll();
        requestRun(runCodes);
    }

    function rerunFailedOpas() {
        selectAndRequestRun(failedOpaCodes(state.lastReportData));
    }

    // 본문이 limit를 초과하면 자르고 생략 안내를 덧붙인다. 본문이 없으면 빈 문자열 반환.
    function truncateBody(text, limit = 16384) {
        const str = String(text == null ? "" : text);
        if (!str) return "";
        if (str.length <= limit) return str;
        return `${str.slice(0, limit)}\n…(총 ${str.length}자 중 일부 생략)`;
    }

    // reportData.stepDetails 항목 → appendRow가 먹는 result 형태로 매핑한다.
    function stepDetailToRow(detail) {
        return {
            statusType: detail.status,
            responseStatus: detail.httpStatus,
            method: detail.method,
            label: detail.label,
            url: detail.url,
            duration: detail.duration,
            requestBody: detail.requestBody,
            responseText: detail.responseBody,
            stepId: detail.stepId
        };
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

    // keys 항목 하나가 채워졌는지. "a|b" 형태는 둘 중 하나만 채워져도 된다 (예: OPA 037 email 또는 phone — D-2)
    function keyFilled(key) {
        if (key.includes("|")) return key.split("|").some((alt) => keyFilled(alt));
        if (key.startsWith("data.")) return has(getByPath(data(), key.slice(5)));
        return has(getByPath(config, key));
    }

    function readiness(scenario) {
        const missing = (scenario.keys || [])
            .filter((key) => key !== "auth.mode" && !keyFilled(key))
            .map((key) => key.split("|").join(" 또는 "));
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

    function totalScenarioSteps(codes) {
        return codes.reduce((sum, code) => {
            const scenario = scenarios.find((item) => item.code === code);
            return sum + (scenario ? scenario.steps.length : 0);
        }, 0);
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
            companyApiKey: raw.companyApiKey || raw.externalCompanyApiKey || authInputs().apiKey || config.auth.apiKey || "",
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
            attachTemplateId: raw.attachTemplateId || "",
            attachFieldId: raw.attachFieldId || "첨부 1",

            memberId: raw.memberId || (raw.member && raw.member.id) || "test.autorun@example.com",
            commonFields: raw.commonFields || [],
            doc2Fields: raw.doc2Fields || raw.secondaryFields || []
        };
    }
    function normalizeBaseUrl(value) {
        return String(value || "").trim().replace(/\/+$/, "");
    }

    function ensureCustomEnvironment() {
        config.environments = config.environments || {};
        config.environments.custom = config.environments.custom || { label: "직접 입력", baseUrl: "" };
        config.environments.custom.label = config.environments.custom.label || "직접 입력";
        config.environments.custom.baseUrl = normalizeBaseUrl(config.environments.custom.baseUrl);
    }

    function syncEnvironmentControls(source) {
        ensureCustomEnvironment();
        const keys = Object.keys(config.environments);
        const selectedEnv = config.defaultEnvironment in config.environments ? config.defaultEnvironment : keys[0];
        config.defaultEnvironment = selectedEnv;
        if (source !== "header" && els.envSelect) els.envSelect.value = selectedEnv;
        if (source !== "form" && els.formDefaultEnvironment) els.formDefaultEnvironment.value = selectedEnv;
        if (source !== "header" && els.customUrlInput) els.customUrlInput.value = config.environments.custom.baseUrl || "";
        if (source !== "form" && els.formCustomUrl) els.formCustomUrl.value = config.environments.custom.baseUrl || "";
        const showCustom = selectedEnv === "custom";
        if (els.customUrlInput) els.customUrlInput.style.display = showCustom ? "" : "none";
        if (els.formCustomUrlWrap) els.formCustomUrlWrap.style.display = showCustom ? "" : "none";
    }

    function handleHeaderEnvironmentChange() {
        config.defaultEnvironment = els.envSelect.value;
        syncEnvironmentControls("header");
        updateEditorFromConfig();
        refreshAll();
    }

    function handleHeaderCustomUrlInput() {
        ensureCustomEnvironment();
        config.environments.custom.baseUrl = normalizeBaseUrl(els.customUrlInput.value);
        syncEnvironmentControls("header");
        updateEditorFromConfig();
        refreshStatus();
    }

    function baseUrl() {
        const selectedEnv = els.envSelect ? els.envSelect.value : config.defaultEnvironment;
        if (selectedEnv === "custom") return normalizeBaseUrl(els.customUrlInput ? els.customUrlInput.value : config.environments?.custom?.baseUrl);
        const env = config.environments[selectedEnv];
        return env ? normalizeBaseUrl(env.baseUrl) : "";
    }
    // memberCreated: 이 OPA에서 createMember가 PASS/CHECK로 끝났는지 — [중지] 후 deleteMember 정리 여부 판정용 (P1-11)
    function freshShared() { return { lastCreatedId: null, createdIdList: [], createdGroupId: null, companyStampId: null, bulkMemberIds: [], memberCreated: false, completedDocIds: [], candidateTemplateIds: [], candidateDocIds: [] }; }
    function restoreSeedCache(seedCache) { Object.values(seedCache).forEach((cached) => Object.assign(state.shared, clone(cached))); }
    function extractSeedData(stepId) {
        if (stepId === "listFormsForSeed") return { candidateTemplateIds: [...(state.shared.candidateTemplateIds || [])] };
        if (stepId === "listDocsBasic") return { completedDocIds: [...(state.shared.completedDocIds || [])] };
        if (stepId === "listCompletedDocsForDownload") return { candidateDocIds: [...(state.shared.candidateDocIds || [])] };
        return {};
    }
    function toggleButtons(disabled) { els.runActiveBtn.disabled = disabled; els.runSelectedBtn.disabled = disabled; els.selectAllBtn.disabled = disabled; els.clearAllBtn.disabled = disabled; }

    // 실행 중 잠금 (P1-11): 환경·Custom URL·설정 모달·프로필 전환을 막고 [중지]를 보인다.
    // baseUrl()은 요청마다 다시 읽으므로 실행 도중 환경이 바뀌면 다른 서버로 요청이 가게 된다.
    function setRunLock(locked) {
        ensureProfileElements();
        toggleButtons(locked);
        [els.envSelect, els.customUrlInput, els.openSettingsModalBtn, els.openSettingsModalBtnInline, els.profileSelect].forEach((el) => { if (el) el.disabled = locked; });
        if (els.authPanelToggle) {
            els.authPanelToggle.setAttribute("aria-disabled", locked ? "true" : "false");
            els.authPanelToggle.classList.toggle("locked", locked);
        }
        if (els.stopRunBtn) {
            els.stopRunBtn.style.display = locked ? "" : "none";
            els.stopRunBtn.disabled = false;
            els.stopRunBtn.innerHTML = '<i class="fa-solid fa-stop fa-sm"></i> 중지';
        }
        if (locked) closeSettingsModal();
    }

    // ── 실행 안내 메시지 (alert 대체, P1-11/P1-12) ─────────────────────────
    function showRunNotice(message, tone = "warn") {
        if (!els.runNotice) return;
        els.runNotice.textContent = message;
        els.runNotice.className = `run-notice ${tone}`;
        els.runNotice.hidden = false;
    }

    function hideRunNotice() {
        if (els.runNotice) els.runNotice.hidden = true;
    }

    // ── 프로필별 OPA 선택 기억 (P1-11) ─────────────────────────────────────
    function readSelectionMap() {
        try {
            const parsed = JSON.parse(localStorage.getItem(SELECTION_STORAGE_KEY) || "{}");
            return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
        } catch (error) {
            return {};
        }
    }

    function saveSelection() {
        try {
            const map = readSelectionMap();
            map[currentProfileName()] = [...state.selectedCodes];
            localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(map));
        } catch (error) {
            // 저장 실패(사생활 보호 모드 등)는 무시 — 선택은 현재 탭에서만 유지된다
        }
    }

    function restoreSelection() {
        const saved = readSelectionMap()[currentProfileName()];
        const known = new Set(scenarios.map((s) => s.code));
        state.selectedCodes = new Set(Array.isArray(saved) ? saved.filter((code) => known.has(code)) : []);
    }

    // ── 실행 요청 → 확인 모달 → runSet (P1-11) ──────────────────────────────
    async function requestRun(codes) {
        if (state.running) return;
        const known = new Set(scenarios.map((s) => s.code));
        const runCodes = (codes || []).filter((code) => known.has(code));
        if (!runCodes.length) {
            showRunNotice("실행할 OPA를 1개 이상 선택해 주세요. 왼쪽 목록의 체크박스로 고를 수 있습니다.");
            return;
        }
        hideRunNotice();
        const confirmed = await confirmRun(runCodes);
        if (confirmed) await runSet(runCodes);
    }

    // 데이터 설정 누락만 본다 — 인증은 실행 첫 단계(토큰 준비)에서 따로 검사한다
    function missingDataKeys(scenario) {
        return readiness(scenario).missing.filter((key) => key !== "auth.panel");
    }

    function writeKindsOf(scenario) {
        const kinds = [];
        scenario.steps.forEach((stepId) => {
            const kind = WRITE_STEP_KINDS[stepId];
            if (kind && !kinds.includes(kind)) kinds.push(kind);
        });
        return kinds;
    }

    let runConfirmResolver = null;

    function confirmRun(codes) {
        if (!els.runConfirmModal) return Promise.resolve(true);
        const runScenarios = codes.map((code) => scenarios.find((s) => s.code === code)).filter(Boolean);
        const envKey = els.envSelect ? els.envSelect.value : config.defaultEnvironment;
        const env = (config.environments && config.environments[envKey]) || {};
        const url = baseUrl();
        const auth = authSnapshot();
        const body = els.runConfirmBody;
        body.textContent = "";

        const addRow = (label, value, tone) => {
            const row = document.createElement("div");
            row.className = "confirm-row";
            const key = document.createElement("span");
            key.className = "confirm-key";
            key.textContent = label;
            const val = document.createElement("span");
            val.className = `confirm-value${tone ? ` ${tone}` : ""}`;
            val.textContent = value;
            row.append(key, val);
            body.appendChild(row);
        };
        const addList = (title, items, tone) => {
            const wrap = document.createElement("div");
            wrap.className = `confirm-list${tone ? ` ${tone}` : ""}`;
            const head = document.createElement("div");
            head.className = "confirm-list-title";
            head.textContent = title;
            const ul = document.createElement("ul");
            items.forEach((text) => {
                const li = document.createElement("li");
                li.textContent = text;
                ul.appendChild(li);
            });
            wrap.append(head, ul);
            body.appendChild(wrap);
        };

        if (envKey === "saas") {
            const warn = document.createElement("p");
            warn.className = "confirm-warn";
            warn.textContent = "운영(SaaS) 환경입니다. 아래 쓰기 작업은 실제 회사 계정에 문서·멤버·그룹·도장을 만들거나 지웁니다. 지정된 테스트 회사의 인증 정보인지 확인하세요.";
            body.appendChild(warn);
        }
        addRow("대상 환경", `${env.label || envKey} — ${url || "(Base URL 없음)"}`, url ? "" : "danger");
        addRow("회사 (company_id)", state.companyId || "아직 토큰을 발급하지 않았습니다 — 실행 첫 단계에서 확인됩니다");
        addRow("프로필 / 인증", `${currentProfileName()} / ${auth.mode === "bearer" ? "Bearer" : "Signature"}${auth.ready ? "" : " (인증 정보 입력 필요)"}`, auth.ready ? "" : "danger");
        addRow("실행 OPA", `${runScenarios.length}개 (step ${totalScenarioSteps(codes)}개)`);

        const skipped = runScenarios.filter((s) => missingDataKeys(s).length);
        const runnable = runScenarios.filter((s) => !missingDataKeys(s).length);
        const writes = runnable.filter((s) => writeKindsOf(s).length);
        if (writes.length) {
            addList(`쓰기 작업이 있는 OPA (${writes.length}개)`, writes.map((s) => `${s.code} ${s.name} — ${writeKindsOf(s).join(", ")}`), "write");
        } else {
            addList("쓰기 작업", ["없음 — 조회만 실행합니다."]);
        }
        if (skipped.length) {
            addList(`설정 필요로 건너뛸 OPA (${skipped.length}개)`, skipped.map((s) => `${s.code} ${s.name} — 설정 필요: ${missingDataKeys(s).join(", ")}`), "skip");
        }
        addRow("중지", "실행 중 [중지]를 누르면 다음 step부터 건너뛰고, 이미 만든 문서·멤버·그룹·도장의 정리 step은 실행합니다.");

        els.runConfirmOkBtn.disabled = !url;
        els.runConfirmOkBtn.textContent = runnable.length ? `${runScenarios.length}개 OPA 실행` : "실행 (모두 건너뜀)";
        els.runConfirmModal.classList.add("open");
        document.body.style.overflow = "hidden";
        // 실수로 Enter를 눌러 실행되지 않도록 [취소]에 포커스
        setTimeout(() => els.runConfirmCancelBtn.focus(), 0);
        return new Promise((resolve) => { runConfirmResolver = resolve; });
    }

    function closeRunConfirm(confirmed) {
        if (!els.runConfirmModal || !els.runConfirmModal.classList.contains("open")) return;
        els.runConfirmModal.classList.remove("open");
        document.body.style.overflow = "";
        const resolve = runConfirmResolver;
        runConfirmResolver = null;
        if (resolve) resolve(!!confirmed);
    }

    // ── 중지 (P1-11) ─────────────────────────────────────────────────────
    function stopError(aborted) {
        const error = new Error(STOP_REASON);
        error.isStop = true;
        error.aborted = aborted === true; // true: 진행 중이던 조회 요청을 취소함, false: 요청을 보내기 전에 멈춤
        return error;
    }

    function requestStop() {
        if (!state.running || state.stopRequested) return;
        state.stopRequested = true;
        if (els.stopRunBtn) {
            els.stopRunBtn.disabled = true;
            els.stopRunBtn.textContent = "중지 중…";
        }
        // 진행 중인 조회 요청만 취소한다. 쓰기 요청은 activeControllers에 넣지 않으므로 완료를 기다린다 (D-1)
        state.activeControllers.forEach((controller) => controller.abort());
        progress(parseInt(els.progressBar.style.width, 10) || 0, "중지 요청됨 — 진행 중인 생성 요청은 완료를 기다린 뒤, 남은 step은 건너뛰고 정리 step만 실행합니다");
    }

    function stopCleanupEligible(stepId) {
        const check = STOP_CLEANUP_TARGETS[stepId];
        return typeof check === "function" && check();
    }

    function skipResult(stepId, reason) {
        const meta = stepMeta(stepId);
        return { statusType: "SKIP", responseStatus: "-", method: meta.method, label: meta.label, url: "", duration: "-", requestBody: null, responseText: reason };
    }
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
        if (!codes.length) { showRunNotice("실행할 OPA를 1개 이상 선택해 주세요."); return; }

        state.running = true;
        state.stopRequested = false;
        state.cleanupPhase = false;
        state.shared = freshShared();
        state.token = "";
        state.companyId = state.companyId || "";  // 인증 패널에서 발급된 companyId는 유지
        state.lastReportData = null;
        closeReportModal();
        hideHistoryBanner();  // 새 실행은 라이브 결과이므로 과거-이력 배너/선택 해제
        hideRunNotice();
        if (els.openReportBtn) els.openReportBtn.style.display = "none";
        if (els.rerunFailedBtn) els.rerunFailedBtn.style.display = "none";
        resetResultTable();
        setRunLock(true);
        progress(0, "토큰과 실행 계획 준비 중");

        const totalSteps = totalScenarioSteps(codes);
        const seedCache = {};
        const allOpaResults = [];
        const reportData = createReportData(codes);
        let pass = 0;
        let fail = 0;
        let check = 0;
        let skip = 0;
        let globalStepIndex = 0;

        try {
            try {
                await token();
            } catch (error) {
                const authResult = {
                    statusType: "FAIL",
                    responseStatus: "ERROR",
                    method: "AUTH",
                    label: "사전 준비 실패",
                    url: baseUrl(),
                    duration: "-",
                    requestBody: null,
                    responseText: error.message || String(error)
                };
                fail += 1;
                appendRow(1, authResult, "auth");
                addReportStep(reportData, "auth", 1, authResult, "사전 준비");
                return;
            }

            for (const code of codes) {
                const scenario = scenarios.find((item) => item.code === code);
                if (!scenario) continue;

                state.shared = freshShared();
                restoreSeedCache(seedCache);
                appendOpaDivider(scenario);

                const opaStepResults = [];
                let opaFailed = false;
                // readiness 미충족 OPA는 실행하지 않고 SKIP("설정 필요: <누락 키>")으로 기록한다 (P1-11)
                const missing = missingDataKeys(scenario);
                const notReadyReason = missing.length ? `설정 필요: ${missing.join(", ")}` : "";

                for (const stepId of scenario.steps) {
                    globalStepIndex += 1;
                    const progressLabel = state.stopRequested ? "중지 처리 중" : "실행 중";
                    progress(Math.round((globalStepIndex / Math.max(totalSteps, 1)) * 100), `${progressLabel}: ${code} — ${stepMeta(stepId).label}`);

                    let result;
                    if (notReadyReason) {
                        result = skipResult(stepId, notReadyReason);
                    } else if (opaFailed) {
                        // 선행 FAIL 시 정리 step까지 SKIP하는 기존 동작은 유지 (기획서 0절: P0-13 제외)
                        result = skippedAfterFailureResult(stepId);
                    } else if (state.stopRequested && !stopCleanupEligible(stepId)) {
                        result = skipResult(stepId, STOP_CLEANUP_TARGETS[stepId] ? `${STOP_REASON} (정리 대상 없음)` : STOP_REASON);
                    } else if (SEED_STEPS.has(stepId) && seedCache[stepId]) {
                        Object.assign(state.shared, clone(seedCache[stepId]));
                        result = cachedSeedResult(stepId);
                    } else {
                        const cleanupAfterStop = state.stopRequested;
                        state.cleanupPhase = cleanupAfterStop;
                        try {
                            result = await runStep(stepId);
                        } catch (error) {
                            if (error && error.isStop) {
                                result = skipResult(stepId, error.aborted
                                    ? `${STOP_REASON} — 진행 중이던 조회 요청을 취소했습니다.`
                                    : `${STOP_REASON} — 남은 요청을 보내지 않았습니다.`);
                            } else {
                                result = { statusType: "FAIL", responseStatus: "ERROR", method: stepMeta(stepId).method, label: stepMeta(stepId).label, url: "", duration: "-", requestBody: null, responseText: error.message || String(error) };
                            }
                        } finally {
                            state.cleanupPhase = false;
                        }
                        if (cleanupAfterStop) result = { ...result, label: `${result.label} · 중지 후 정리` };
                        // 실행 중 [중지]됐지만 쓰기 요청이라 끝까지 기다린 step — 만든 자원은 아래 정리 step이 지운다 (D-1)
                        else if (state.stopRequested && result.statusType !== "SKIP") result = { ...result, label: `${result.label} · 중지 전 시작된 요청 완료` };
                        if (SEED_STEPS.has(stepId) && result.statusType === "PASS") seedCache[stepId] = extractSeedData(stepId);
                        if (stepId === "createMember" && (result.statusType === "PASS" || result.statusType === "CHECK")) state.shared.memberCreated = true;
                        if (result.statusType === "FAIL") opaFailed = true;
                    }

                    if (result.statusType === "PASS" || result.statusType === "CACHE") pass += 1;
                    else if (result.statusType === "CHECK") check += 1;
                    else if (result.statusType === "SKIP") skip += 1;
                    else fail += 1;

                    appendRow(globalStepIndex, result, stepId);
                    opaStepResults.push(addReportStep(reportData, stepId, globalStepIndex, result, code));
                }

                allOpaResults.push({ code, scenario, steps: opaStepResults });
            }
        } finally {
            finalizeReportData(reportData, codes, allOpaResults);
            state.lastReportData = reportData;
            pass = reportData.totalSummary.passedSteps;
            fail = reportData.totalSummary.failedSteps;
            check = reportData.totalSummary.checkSteps;
            skip = reportData.totalSummary.skippedSteps;
            const stopped = state.stopRequested;
            reportData.meta.stopped = stopped;
            state.running = false;
            state.stopRequested = false;
            state.cleanupPhase = false;
            setRunLock(false);
            els.lastRunSummary.textContent = `PASS ${pass} / FAIL ${fail} / CHECK ${check} / SKIP ${skip}`;
            progress(100, `${stopped ? "중지됨" : "완료"}: PASS ${pass}, FAIL ${fail}, CHECK ${check}, SKIP ${skip}`);
            if (els.openReportBtn) els.openReportBtn.style.display = "";
            updateRerunFailedButton();
            saveRunHistory({
                id: String(Date.now()),
                when: new Date().toLocaleString("ko-KR", { hour12: false }),
                codes: codes.slice(),
                stopped,
                pass,
                fail,
                check,
                skip,
                environment: els.envSelect ? els.envSelect.value : config.defaultEnvironment,
                authMode: config.auth && config.auth.mode ? config.auth.mode : "-",
                report: snapshotReportForHistory(reportData)
            });
        }
    }

    function cachedSeedResult(stepId) {
        const meta = stepMeta(stepId);
        return {
            statusType: "CACHE",
            responseStatus: "",
            method: meta.method,
            label: `${meta.label} (캐시)`,
            url: "",
            duration: "-",
            requestBody: null,
            responseText: "이전 OPA의 탐색 결과를 재사용했습니다."
        };
    }

    function skippedAfterFailureResult(stepId) {
        const meta = stepMeta(stepId);
        return {
            statusType: "SKIP",
            responseStatus: "-",
            method: meta.method,
            label: meta.label,
            url: "",
            duration: "-",
            requestBody: null,
            responseText: "선행 step 실패로 스킵됨"
        };
    }

    function createReportData(codes) {
        const envKey = els.envSelect ? els.envSelect.value : config.defaultEnvironment;
        const env = config.environments && config.environments[envKey] ? config.environments[envKey] : {};
        const auth = authSnapshot();
        return {
            meta: {
                executedAt: formatDateTime(new Date()),
                environment: envKey,
                environmentLabel: env.label || envKey,
                baseUrl: baseUrl(),
                customUrl: envKey === "custom" ? baseUrl() : null,
                profile: currentProfileName(),
                authMode: auth.mode === "bearer" ? "Bearer" : "Signature",
                codes: codes.slice()
            },
            opaSummary: [],
            stepDetails: [],
            failures: [],
            checks: [],
            totalSummary: {
                totalOpa: 0,
                passedOpa: 0,
                failedOpa: 0,
                checkOpa: 0,
                skippedOpa: 0,
                totalSteps: 0,
                passedSteps: 0,
                failedSteps: 0,
                checkSteps: 0,
                skippedSteps: 0
            }
        };
    }

    function addReportStep(reportData, stepId, index, result, opaCode) {
        const error = (result.statusType === "FAIL" || result.statusType === "CHECK") ? parseErrorInfo(result.responseText) : null;
        const detail = {
            index,
            opaCode,
            sharedOpaCodes: [opaCode],
            stepId,
            label: result.label || stepMeta(stepId).label,
            method: result.method || stepMeta(stepId).method,
            status: result.statusType || "FAIL",
            httpStatus: result.responseStatus || "-",
            duration: result.duration || "-",
            url: result.url || "",
            requestBody: result.requestBody === undefined ? null : result.requestBody,
            responseBody: result.responseText || "",
            error
        };
        reportData.stepDetails.push(detail);
        if (detail.status === "FAIL") reportData.failures.push(toFailure(detail));
        else if (detail.status === "CHECK") reportData.checks.push(toFailure(detail));
        return detail;
    }

    function finalizeReportData(reportData, codes, allOpaResults) {
        const summaries = [];
        const opaResultMap = new Map(allOpaResults.map((item) => [item.code, item]));
        codes.forEach((code) => {
            const scenario = scenarios.find((item) => item.code === code);
            if (!scenario) return;
            const opaResult = opaResultMap.get(code);
            const steps = scenario.steps.map((stepId, index) => {
                const executed = opaResult && opaResult.steps[index];
                return executed ? { ...executed, opaCode: code, opaIndex: index + 1 } : skippedReportStep(stepId, code, index + 1);
            });
            const passed = steps.filter((step) => step.status === "PASS" || step.status === "CACHE").length;
            const failed = steps.filter((step) => step.status === "FAIL").length;
            const checked = steps.filter((step) => step.status === "CHECK").length;
            const skipped = steps.filter((step) => step.status === "SKIP").length;
            // 판정 우선순위: FAIL > CHECK(검토 필요) > SKIP > PASS
            let result;
            if (failed > 0) result = "FAIL";
            else if (checked > 0) result = "CHECK";
            else if (steps.length > 0 && skipped === steps.length) result = "SKIP";
            else result = "PASS";
            summaries.push({
                code: scenario.code,
                name: scenario.name,
                result,
                totalSteps: steps.length,
                passed,
                failed,
                checked,
                skipped,
                steps
            });
        });
        reportData.opaSummary = summaries;
        reportData.totalSummary = {
            totalOpa: summaries.length,
            passedOpa: summaries.filter((item) => item.result === "PASS").length,
            failedOpa: summaries.filter((item) => item.result === "FAIL").length,
            checkOpa: summaries.filter((item) => item.result === "CHECK").length,
            skippedOpa: summaries.filter((item) => item.result === "SKIP").length,
            totalSteps: summaries.reduce((sum, item) => sum + item.totalSteps, 0) + preflightStepCount(reportData),
            passedSteps: summaries.reduce((sum, item) => sum + item.passed, 0),
            failedSteps: summaries.reduce((sum, item) => sum + item.failed, 0) + preflightFailCount(reportData),
            checkSteps: summaries.reduce((sum, item) => sum + item.checked, 0),
            skippedSteps: summaries.reduce((sum, item) => sum + item.skipped, 0)
        };
    }

    function preflightStepCount(reportData) {
        return reportData.stepDetails.filter((step) => step.opaCode === "사전 준비").length;
    }

    function preflightFailCount(reportData) {
        return reportData.stepDetails.filter((step) => step.opaCode === "사전 준비" && step.status === "FAIL").length;
    }

    function skippedReportStep(stepId, opaCode, opaIndex) {
        const meta = stepMeta(stepId);
        return {
            index: "-",
            opaIndex,
            opaCode,
            sharedOpaCodes: [opaCode],
            stepId,
            label: meta.label,
            method: meta.method,
            status: "SKIP",
            httpStatus: "-",
            duration: "-",
            url: "",
            requestBody: null,
            responseBody: "",
            error: null
        };
    }

    function toFailure(detail) {
        return {
            opaCode: detail.opaCode,
            opaCodes: detail.sharedOpaCodes && detail.sharedOpaCodes.length ? detail.sharedOpaCodes : [detail.opaCode],
            stepId: detail.stepId,
            label: detail.label,
            method: detail.method,
            httpStatus: detail.httpStatus,
            duration: detail.duration,
            url: detail.url,
            errorCode: detail.error && detail.error.code ? detail.error.code : "-",
            errorMessage: detail.error && detail.error.message ? detail.error.message : "-",
            responseBody: detail.responseBody || ""
        };
    }

    // 에러 코드 레퍼런스(utils/error-codes.html?q=) 링크 — 리포트 파일을 따로 열어도 동작하도록 절대 URL 사용
    function errorCodeLookupUrl(code) {
        const clean = String(code || "").trim();
        if (!clean || clean === "-") return "";
        if (window.ApiError && typeof window.ApiError.lookupUrl === "function") {
            return window.ApiError.lookupUrl(clean, { absolute: true });
        }
        return `${window.location.origin}/utils/error-codes.html?q=${encodeURIComponent(clean)}`;
    }

    function errorCodeLinkHtml(code) {
        const href = errorCodeLookupUrl(code);
        return href ? ` <a href="${esc(href)}" target="_blank" rel="noopener">에러 코드 찾아보기 →</a>` : "";
    }

    function parseErrorInfo(responseText) {
        const text = String(responseText || "").trim();
        if (!text) return { code: "", message: "" };
        let parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch (error) {
            const objectStart = text.indexOf("{");
            const objectEnd = text.lastIndexOf("}");
            if (objectStart >= 0 && objectEnd > objectStart) {
                try { parsed = JSON.parse(text.slice(objectStart, objectEnd + 1)); } catch (innerError) {}
            }
        }
        if (parsed && typeof parsed === "object") {
            return {
                code: findDeepValue(parsed, ["code", "error_code", "errorCode", "ErrorCode", "status_code", "statusCode"]) || "",
                message: findDeepValue(parsed, ["ErrorMessage", "error_message", "errorMessage", "message", "Message", "description", "detail"]) || ""
            };
        }
        const codeMatch = text.match(/(?:code|error_code|errorCode)\s*[:=]\s*["']?([A-Za-z0-9_-]+)/i);
        return {
            code: codeMatch ? codeMatch[1] : "",
            message: text.split(/\r?\n/).find(Boolean) || ""
        };
    }

    function findDeepValue(value, keys) {
        if (!value || typeof value !== "object") return "";
        if (Array.isArray(value)) {
            for (const item of value) {
                const found = findDeepValue(item, keys);
                if (found) return found;
            }
            return "";
        }
        for (const key of keys) {
            if (value[key] !== undefined && value[key] !== null && String(value[key]).trim() !== "") return String(value[key]);
        }
        for (const child of Object.values(value)) {
            const found = findDeepValue(child, keys);
            if (found) return found;
        }
        return "";
    }

    function openReportModal() {
        if (!state.lastReportData) { showRunNotice("표시할 리포트가 없습니다. 테스트 실행 후 다시 시도해 주세요.", "info"); return; }
        els.reportModalBody.innerHTML = generateReportHtml(state.lastReportData);
        els.reportModal.classList.add("open");
        document.body.style.overflow = "hidden";
    }

    function closeReportModal() {
        if (els.reportModal) els.reportModal.classList.remove("open");
        if (els.reportModalBody) els.reportModalBody.innerHTML = "";
        if (!els.settingsModalCard || !els.settingsModalCard.classList.contains("modal-open")) document.body.style.overflow = "";
    }

    function downloadReport(format) {
        if (!state.lastReportData) { showRunNotice("다운로드할 리포트가 없습니다. 테스트 실행 후 다시 시도해 주세요.", "info"); return; }
        const report = state.lastReportData;
        const isHtml = format === "html";
        const content = isHtml ? generateReportHtmlFile(report) : generateReportMarkdown(report);
        const blob = new Blob([content], { type: isHtml ? "text/html;charset=utf-8" : "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = reportFilename(report, isHtml ? "html" : "md");
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    function generateReportHtml(report) {
        const summary = report.totalSummary;
        const opaPercent = summary.totalOpa ? Math.round((summary.passedOpa / summary.totalOpa) * 100) : 0;
        const stepPercent = summary.totalSteps ? Math.round((summary.passedSteps / summary.totalSteps) * 100) : 0;
        return `
            <section class="report-section">
                <h3>실행 정보</h3>
                <div class="report-info-grid">
                    <div class="report-info-item"><span>일시</span><strong>${esc(report.meta.executedAt)}</strong></div>
                    <div class="report-info-item"><span>환경</span><strong>${esc(report.meta.environmentLabel)} - ${esc(report.meta.baseUrl || "-")}</strong></div>
                    <div class="report-info-item"><span>프로필</span><strong>${esc(report.meta.profile)}</strong></div>
                    <div class="report-info-item"><span>인증 방식</span><strong>${esc(report.meta.authMode)}</strong></div>
                </div>
            </section>
            <section class="report-section">
                <h3>전체 요약</h3>
                <div class="report-summary-card">
                    <p>OPA: ${esc(summary.totalOpa)}개 — 성공 ${esc(summary.passedOpa)} / 실패 ${esc(summary.failedOpa)} / 검토필요 ${esc(summary.checkOpa)} / 스킵 ${esc(summary.skippedOpa)} (성공률 ${esc(opaPercent)}%)</p>
                    <p>Step: ${esc(summary.totalSteps)}개 — 성공 ${esc(summary.passedSteps)} / 실패 ${esc(summary.failedSteps)} / 검토필요 ${esc(summary.checkSteps)} / 스킵 ${esc(summary.skippedSteps)}</p>
                    <div class="report-progress-bg"><div class="report-progress-fill" style="width:${stepPercent}%"></div></div>
                </div>
            </section>
            <section class="report-section">
                <h3>OPA별 결과</h3>
                ${report.opaSummary.map((opa) => `
                    <div class="report-opa-card">
                        <div class="report-opa-head">
                            <div class="report-opa-title">${esc(opa.code)} ${esc(opa.name)}</div>
                            <span class="report-pill ${reportStatusClass(opa.result)}">${esc(opa.result)} ${esc(opa.passed)}/${esc(opa.totalSteps)}</span>
                        </div>
                        <table class="report-table">
                            <thead><tr><th>#</th><th>Step</th><th>Method</th><th>Status</th><th>Duration</th><th>Result</th></tr></thead>
                            <tbody>
                                ${opa.steps.map((step, index) => `
                                    <tr>
                                        <td>${index + 1}</td>
                                        <td>${esc(step.label)}${sharedOpaText(step)}</td>
                                        <td>${esc(step.method)}</td>
                                        <td>${esc(String(step.httpStatus || "-"))}</td>
                                        <td>${esc(step.duration)}</td>
                                        <td><span class="report-pill ${reportStatusClass(step.status)}">${esc(step.status)}</span></td>
                                    </tr>
                                    <tr class="report-detail-row"><td colspan="6">
                                        <details>
                                            <summary>요청 / 응답 보기</summary>
                                            <h5>Request Body</h5>
                                            <pre>${esc(truncateBody(step.requestBody ? JSON.stringify(step.requestBody, null, 2) : "")) || "(본문 없음)"}</pre>
                                            <h5>Response</h5>
                                            <pre>${esc(truncateBody(step.responseBody)) || "(본문 없음)"}</pre>
                                        </details>
                                    </td></tr>
                                `).join("")}
                            </tbody>
                        </table>
                    </div>
                `).join("")}
            </section>
            <section class="report-section">
                <h3>실패 상세</h3>
                ${report.failures.length ? report.failures.map((failure) => `
                    <div class="report-failure-card">
                        <h4>${esc(failure.opaCodes.join(", "))} &gt; ${esc(failure.label)}</h4>
                        <div class="report-failure-meta">
                            ${esc(failure.method)} ${esc(failure.url || "(URL 없음)")}<br>
                            HTTP ${esc(String(failure.httpStatus))} | ${esc(failure.duration)}<br>
                            에러: [${esc(failure.errorCode)}] ${esc(failure.errorMessage)}${errorCodeLinkHtml(failure.errorCode)}
                        </div>
                        <pre>${esc(failure.responseBody || "(Empty)")}</pre>
                    </div>
                `).join("") : `<div class="report-failure-card"><div class="report-failure-meta">실패한 step이 없습니다.</div></div>`}
            </section>
            <section class="report-section">
                <h3>검토 필요 상세 (CHECK)</h3>
                ${report.checks && report.checks.length ? report.checks.map((item) => `
                    <div class="report-failure-card">
                        <h4>${esc(item.opaCodes.join(", "))} &gt; ${esc(item.label)}</h4>
                        <div class="report-failure-meta">
                            ${esc(item.method)} ${esc(item.url || "(URL 없음)")}<br>
                            HTTP ${esc(String(item.httpStatus))} | ${esc(item.duration)}<br>
                            응답 코드: [${esc(item.errorCode)}] ${esc(item.errorMessage)}${errorCodeLinkHtml(item.errorCode)}<br>
                            <strong>의도된 응답(예: 이미 정리된 리소스)인지 실제 오류인지 확인이 필요합니다.</strong>
                        </div>
                        <pre>${esc(item.responseBody || "(Empty)")}</pre>
                    </div>
                `).join("") : `<div class="report-failure-card"><div class="report-failure-meta">검토가 필요한 step이 없습니다.</div></div>`}
            </section>
        `;
    }

    function generateReportMarkdown(report) {
        const summary = report.totalSummary;
        const opaPercent = summary.totalOpa ? Math.round((summary.passedOpa / summary.totalOpa) * 100) : 0;
        const lines = [
            "# eformsign Open API 테스트 리포트",
            "",
            "## 실행 정보",
            "",
            "| 항목 | 값 |",
            "|---|---|",
            `| 일시 | ${md(report.meta.executedAt)} |`,
            `| 환경 | ${md(report.meta.environmentLabel)} - ${md(report.meta.baseUrl || "-")} |`,
            `| 프로필 | ${md(report.meta.profile)} |`,
            `| 인증 방식 | ${md(report.meta.authMode)} |`,
            "",
            "## 전체 요약",
            "",
            `- **OPA**: ${summary.totalOpa}개 — 성공 ${summary.passedOpa} / 실패 ${summary.failedOpa} / 검토필요 ${summary.checkOpa} / 스킵 ${summary.skippedOpa} (성공률 ${opaPercent}%)`,
            `- **Step**: ${summary.totalSteps}개 — 성공 ${summary.passedSteps} / 실패 ${summary.failedSteps} / 검토필요 ${summary.checkSteps} / 스킵 ${summary.skippedSteps}`,
            "",
            "## OPA별 결과",
            ""
        ];
        report.opaSummary.forEach((opa) => {
            lines.push(`### ${opa.code} - ${opa.name} (${opa.result} ${opa.passed}/${opa.totalSteps})`);
            lines.push("");
            lines.push("| # | Step | Method | Status | Duration | Result |");
            lines.push("|---|---|---|---|---|---|");
            opa.steps.forEach((step, index) => {
                lines.push(`| ${index + 1} | ${md(step.label)}${md(sharedOpaPlainText(step))} | ${md(step.method)} | ${md(step.httpStatus)} | ${md(step.duration)} | ${md(step.status)} |`);
            });
            lines.push("");
            // step별 요청/응답을 GitHub 호환 <details>로 펼침 제공
            opa.steps.forEach((step, index) => {
                const reqText = step.requestBody ? JSON.stringify(step.requestBody, null, 2) : "";
                const reqBody = reqText ? safeFence(truncateBody(reqText)) : "(본문 없음)";
                const resBody = step.responseBody ? safeFence(truncateBody(step.responseBody)) : "(본문 없음)";
                lines.push(`<details><summary>${opa.code} > ${index + 1}. ${step.label} (${step.method} ${step.httpStatus || "-"}) — 요청/응답</summary>`);
                lines.push("");
                lines.push("**Request Body**");
                lines.push("```json");
                lines.push(reqBody);
                lines.push("```");
                lines.push("**Response**");
                lines.push("```json");
                lines.push(resBody);
                lines.push("```");
                lines.push("");
                lines.push("</details>");
                lines.push("");
            });
        });
        lines.push("## 실패 상세");
        lines.push("");
        if (!report.failures.length) {
            lines.push("실패한 step이 없습니다.");
            lines.push("");
        } else {
            report.failures.forEach((failure) => {
                lines.push(`### ${failure.opaCodes.join(", ")} > ${failure.label}`);
                lines.push("");
                lines.push(`- **URL**: ${failure.method} ${failure.url || "(URL 없음)"}`);
                lines.push(`- **HTTP Status**: ${failure.httpStatus}`);
                lines.push(`- **Duration**: ${failure.duration}`);
                lines.push(`- **에러 코드**: ${failure.errorCode}${errorCodeLookupUrl(failure.errorCode) ? ` ([에러 코드 찾아보기](${errorCodeLookupUrl(failure.errorCode)}))` : ""}`);
                lines.push(`- **에러 메시지**: ${failure.errorMessage}`);
                lines.push("");
                lines.push("**Response:**");
                lines.push("```json");
                lines.push(safeFence(failure.responseBody || "(Empty)"));
                lines.push("```");
                lines.push("");
            });
        }
        lines.push("## 검토 필요 상세 (CHECK)");
        lines.push("");
        if (!report.checks || !report.checks.length) {
            lines.push("검토가 필요한 step이 없습니다.");
            lines.push("");
        } else {
            report.checks.forEach((item) => {
                lines.push(`### ${item.opaCodes.join(", ")} > ${item.label}`);
                lines.push("");
                lines.push(`- **URL**: ${item.method} ${item.url || "(URL 없음)"}`);
                lines.push(`- **HTTP Status**: ${item.httpStatus}`);
                lines.push(`- **응답 코드**: [${item.errorCode}] ${item.errorMessage}`);
                lines.push(`- **확인 사항**: 의도된 응답(예: 이미 정리된 리소스)인지 실제 오류인지 확인이 필요합니다.`);
                lines.push("");
                lines.push("**Response:**");
                lines.push("```json");
                lines.push(safeFence(item.responseBody || "(Empty)"));
                lines.push("```");
                lines.push("");
            });
        }
        return lines.join("\n");
    }

    function generateReportHtmlFile(report) {
        return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>eformsign Open API 테스트 리포트</title>
<style>
body{margin:0;background:#f8fafc;color:#0f172a;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;line-height:1.5}
.report-body{max-width:1120px;margin:0 auto;padding:28px}
.report-section+ .report-section{margin-top:22px}
.report-section h3{font-size:18px;margin:0 0 10px}
.report-info-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.report-info-item,.report-summary-card,.report-opa-card,.report-failure-card{border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:12px}
.report-info-item span{display:block;color:#64748b;font-size:12px;margin-bottom:4px}.report-info-item strong{word-break:break-all}
.report-progress-bg{width:100%;height:10px;border-radius:999px;background:#e2e8f0;overflow:hidden;margin-top:10px}.report-progress-fill{height:100%;background:#1f9d55}
.report-opa-card+ .report-opa-card,.report-failure-card+ .report-failure-card{margin-top:12px}.report-opa-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}.report-opa-title{font-weight:700}
.report-pill{display:inline-flex;align-items:center;justify-content:center;min-width:70px;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700}.report-pill.pass{background:#e9f9ef;color:#1f9d55}.report-pill.fail{background:#fdecec;color:#d64545}.report-pill.skip{background:#fff7df;color:#c78b07}.report-pill.check{background:#ffedd5;color:#c2410c}
.report-table{width:100%;border-collapse:collapse;font-size:13px}.report-table th,.report-table td{padding:8px 9px;border-bottom:1px solid #eef2f7;text-align:left;vertical-align:top}.report-table th{color:#475569;background:#f8fafc;font-size:12px;text-transform:uppercase}
.report-failure-meta{color:#475569;font-size:13px;line-height:1.5;margin-bottom:8px;word-break:break-all}.report-failure-card pre{white-space:pre-wrap;word-break:break-word;background:#0f172a;color:#e2e8f0;padding:12px;border-radius:8px;font-size:12px;line-height:1.45;overflow:auto}
.report-detail-row td{padding:0 9px 10px;border-bottom:1px solid #eef2f7}
.report-detail-row details{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px 10px}
.report-detail-row summary{cursor:pointer;font-size:12px;color:#475569;font-weight:600}
.report-detail-row h5{margin:8px 0 4px;font-size:12px;color:#334155}
.report-detail-row pre{white-space:pre-wrap;word-break:break-word;background:#0f172a;color:#e2e8f0;padding:10px;border-radius:6px;font-size:12px;line-height:1.45;margin:0;overflow:auto}
@media(max-width:760px){.report-info-grid{grid-template-columns:1fr}.report-body{padding:16px}}
</style>
</head>
<body><main class="report-body">${generateReportHtml(report)}</main></body>
</html>`;
    }

    function reportStatusClass(status) {
        if (status === "CACHE") return "skip";
        return String(status).toLowerCase();
    }

    function sharedOpaText(step) {
        if (!step.sharedOpaCodes || step.sharedOpaCodes.length <= 1) return "";
        return ` <span style="color:#64748b;font-size:0.72rem;">(공유: ${esc(step.sharedOpaCodes.join(", "))})</span>`;
    }

    function sharedOpaPlainText(step) {
        if (!step.sharedOpaCodes || step.sharedOpaCodes.length <= 1) return "";
        return ` (공유: ${step.sharedOpaCodes.join(", ")})`;
    }

    function md(value) {
        return String(value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, "<br>");
    }

    function safeFence(value) {
        return String(value ?? "").replace(/```/g, "'''");
    }

    function reportFilename(report, ext) {
        return `OPA_Report_${safeFilename(report.meta.profile)}_${fileDateTime(new Date())}.${ext}`;
    }

    function safeFilename(value) {
        return String(value || "Default").replace(/[^\w.-]+/g, "_") || "Default";
    }

    function formatDateTime(date) {
        return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
    }

    function fileDateTime(date) {
        return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}_${pad2(date.getHours())}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
    }

    function pad2(value) {
        return String(value).padStart(2, "0");
    }
    function getByPath(obj, path) { return path.split(".").reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), obj); }
    function has(value) { return Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && String(value).trim() !== ""; }
    function must(value, message) { if (!has(value)) throw new Error(message); return value; }
    function mask(value) { if (!has(value)) return "설정 필요"; const str = String(value); return str.length <= 8 ? "*".repeat(str.length) : `${str.slice(0, 4)}...${str.slice(-4)}`; }
    function methodClass(method) { return ({ GET: "method-get", POST: "method-post", PATCH: "method-patch", DELETE: "method-delete" })[String(method).toUpperCase()] || ""; }
    function esc(value) { return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function merge(target, source) { Object.keys(source || {}).forEach((key) => { const value = source[key]; if (value && typeof value === "object" && !Array.isArray(value)) { if (!target[key] || typeof target[key] !== "object" || Array.isArray(target[key])) target[key] = {}; merge(target[key], value); } else target[key] = value; }); return target; }
    // PROFILE_STORAGE_KEY / ACTIVE_PROFILE_KEY / HISTORY_STORAGE_KEY / DEFAULT_PROFILE_NAME은 파일 상단(STORAGE_KEY 옆)에 선언
    const PROFILE_FIELD_IDS = [
        "profileSelect", "profileNameInput", "saveProfileBtn", "deleteProfileBtn", "exportProfileBtn", "importProfileBtn",
        "importProfileFile", "clearHistoryBtn", "historyList", "historyViewBanner",
        "openSettingsModalBtn", "openSettingsModalBtnInline", "closeSettingsModalBtn", "settingsModalCard", "settingsModalOverlay", "settingsSummaryText",
        "formDefaultEnvironment", "formCustomUrl", "formCustomUrlWrap", "formAuthMode", "formExternalTemplateId", "formAttachTemplateId", "formAttachFieldId",
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

    // ── 비밀값 저장 제외 (P0-08) ─────────────────────────────────────────
    // 프로필·설정·Export에는 비밀키(ECDSA hex)와 Access Token을 절대 기록하지 않는다.
    // 비밀키는 설정 모달의 [인증 저장](서버 AES-256-GCM 암호화)으로만 보관한다.
    // 메모리상의 config(현재 탭 실행용)는 그대로 두고, 저장되는 사본에서만 제거한다.
    function stripSecrets(cfg) {
        const copy = clone(cfg || {});
        if (copy.auth && typeof copy.auth === "object") {
            copy.auth.secretKey = "";
            copy.auth.accessToken = "";
        }
        return copy;
    }

    function hasStoredSecret(cfg) {
        return !!(cfg && cfg.auth && (has(cfg.auth.secretKey) || has(cfg.auth.accessToken)));
    }

    function writeStoredConfig(cfg) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stripSecrets(cfg)));
    }

    // 이전 버전이 localStorage에 남긴 비밀키·토큰을 1회 제거한다 (페이지 로드 시)
    function migrateStoredSecrets() {
        let removed = false;
        try {
            const profiles = readProfiles();
            if (Object.values(profiles).some(hasStoredSecret)) {
                writeProfiles(profiles);
                removed = true;
            }
            const legacyRaw = localStorage.getItem(STORAGE_KEY);
            if (legacyRaw) {
                const legacy = JSON.parse(legacyRaw);
                if (hasStoredSecret(legacy)) {
                    writeStoredConfig(legacy);
                    removed = true;
                }
            }
        } catch (error) {
            return false;
        }
        return removed;
    }

    function writeProfiles(profiles) {
        const safeProfiles = {};
        Object.keys(profiles || {}).forEach((name) => { safeProfiles[name] = stripSecrets(profiles[name]); });
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(safeProfiles));
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

    // 인증 입력값은 설정 모달 필드(formApiKey/formAuthMemberId/formSecretKey)가 유일한 원본이다.
    // (예전에는 항상 숨겨진 인라인 인증 패널에 값을 복사해 두고 읽었다 — P1-12에서 패널 삭제)
    function authInputs() {
        ensureProfileElements();
        const read = (id) => (els[id] ? String(els[id].value || "").trim() : "");
        return { apiKey: read("formApiKey"), memberId: read("formAuthMemberId"), secretKey: read("formSecretKey") };
    }

    function authSnapshot() {
        const auth = config.auth || {};
        const mode = normalizedAuthMode(state.authMethod || auth.mode);
        const { apiKey: panelApiKey, memberId: panelMemberId, secretKey: panelSecretKey } = authInputs();
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
        ensureProfileElements();
        state.authMethod = normalizedAuthMode(mode);
        if (els.formSecretKey) els.formSecretKey.placeholder = state.authMethod === "bearer" ? "발급된 Access Token 직접 입력" : "비밀 키 입력 (Hex 형식)";
        if (els.formAuthMode) els.formAuthMode.value = state.authMethod;
    }

    function populateAuthPanelFromConfig() {
        const auth = config.auth || {};
        applyAuthModeUi(auth.mode || "signature");
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
        setInputValue("formCustomUrl", config.environments?.custom?.baseUrl);
        setInputValue("formExternalTemplateId", dataConfig.extTemplateId);
        setInputValue("formAttachTemplateId", dataConfig.attachTemplateId);
        setInputValue("formAttachFieldId", dataConfig.attachFieldId);
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
        syncEnvironmentControls();
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
            ? history.map((item) => {
                const hasReport = !!item.report;
                const idAttr = item.id ? ` data-history-id="${esc(String(item.id))}"` : "";
                const rowClass = `config-row${hasReport ? " clickable" : ""}${state.selectedHistoryId && String(item.id) === String(state.selectedHistoryId) ? " selected" : ""}`;
                const noteHint = hasReport ? "" : `<br><span class="history-no-detail">상세 데이터 없음</span>`;
                return `
                <div class="${rowClass}"${idAttr}>
                    <span class="config-key">${esc(item.when)}${item.stopped ? " (중지됨)" : ""}<br>${esc(item.codes.join(", "))}${noteHint}</span>
                    <span class="config-value ${item.fail > 0 ? "missing" : "ready"}">PASS ${esc(String(item.pass))} / FAIL ${esc(String(item.fail))} / CHECK ${esc(String(item.check || 0))} / SKIP ${esc(String(item.skip))}<br>${esc(item.environment)} / ${esc(item.authMode)}${item.id ? `<br><button class="history-rerun-btn" type="button" data-rerun-id="${esc(String(item.id))}">같은 OPA 다시 실행</button>` : ""}</span>
                </div>`;
            }).join("")
            : `<div class="config-row"><span class="config-key">최근 실행 이력이 없습니다.</span><span class="config-value">-</span></div>`;
        // report를 가진 행은 클릭 시 우측 결과 패널에 과거 결과를 복원
        els.historyList.querySelectorAll(".config-row.clickable").forEach((row) => {
            row.addEventListener("click", () => loadHistoryRun(row.getAttribute("data-history-id")));
        });
        // [같은 OPA 다시 실행] → 그 이력의 OPA 집합을 선택하고 실행 확인 모달을 연다 (P1-12)
        els.historyList.querySelectorAll(".history-rerun-btn").forEach((button) => {
            button.addEventListener("click", (event) => {
                event.stopPropagation();
                const entry = history.find((item) => String(item.id) === button.getAttribute("data-rerun-id"));
                if (entry) selectAndRequestRun(entry.codes);
            });
        });
    }

    // report를 가진 이력 엔트리는 용량이 크므로 localStorage 저장 시 본문을 절단해 보관한다.
    function snapshotReportForHistory(report) {
        const snap = clone(report);
        const truncDetail = (detail) => {
            if (!detail) return;
            if (typeof detail.responseBody === "string") detail.responseBody = truncateBody(detail.responseBody);
            if (detail.requestBody) {
                const serialized = JSON.stringify(detail.requestBody);
                if (serialized.length > 16384) detail.requestBody = truncateBody(serialized);
            }
        };
        (snap.stepDetails || []).forEach(truncDetail);
        (snap.opaSummary || []).forEach((opa) => (opa.steps || []).forEach(truncDetail));
        (snap.failures || []).forEach((item) => { if (typeof item.responseBody === "string") item.responseBody = truncateBody(item.responseBody); });
        (snap.checks || []).forEach((item) => { if (typeof item.responseBody === "string") item.responseBody = truncateBody(item.responseBody); });
        return snap;
    }

    // QuotaExceededError 시 가장 오래된 엔트리부터 제거하며 재시도 (최소 1건 남을 때까지)
    function persistHistoryMap(historyMap, profileName) {
        while (true) {
            try {
                writeHistoryMap(historyMap);
                return true;
            } catch (error) {
                const list = historyMap[profileName] || [];
                if (list.length > 1) {
                    list.pop();  // unshift로 추가하므로 배열 끝이 가장 오래된 엔트리
                    historyMap[profileName] = list;
                } else {
                    return false;
                }
            }
        }
    }

    function saveRunHistory(entry) {
        const historyMap = readHistoryMap();
        const name = currentProfileName();
        const list = historyMap[name] || [];
        list.unshift(entry);
        historyMap[name] = list.slice(0, 10);
        if (!persistHistoryMap(historyMap, name)) {
            // 1건만 남겨도 실패하면 report를 제거한 요약-only 엔트리로 저장
            const summaryOnly = { ...entry };
            delete summaryOnly.report;
            historyMap[name] = [summaryOnly];
            try { writeHistoryMap(historyMap); } catch (error) {}
        }
        renderHistory();
    }

    function loadHistoryRun(id) {
        if (state.running) {
            showRunNotice("실행 중에는 과거 이력을 열 수 없습니다. 실행이 끝난 뒤 다시 시도해 주세요.");
            return;
        }
        const historyMap = readHistoryMap();
        const list = historyMap[currentProfileName()] || [];
        const entry = list.find((item) => String(item.id) === String(id));
        if (!entry || !entry.report) {
            showRunNotice("이 이력은 상세 데이터가 없습니다. [다시 실행]으로 같은 OPA를 다시 돌릴 수는 있습니다.", "info");
            return;
        }
        const report = entry.report;
        hideRunNotice();
        resetResultTable();
        let lastOpaCode = null;
        (report.stepDetails || []).forEach((detail, index) => {
            if (detail.opaCode && detail.opaCode !== lastOpaCode) {
                lastOpaCode = detail.opaCode;
                const scenario = scenarios.find((item) => item.code === detail.opaCode);
                if (scenario) appendOpaDivider(scenario);  // 사전 준비 등 비-시나리오 코드는 divider 생략
            }
            appendRow(index + 1, stepDetailToRow(detail));
        });
        state.lastReportData = report;
        if (els.openReportBtn) els.openReportBtn.style.display = "";
        updateRerunFailedButton();
        showHistoryBanner(entry.when);
        state.selectedHistoryId = String(id);
        renderHistory();
    }

    function showHistoryBanner(when) {
        if (!els.historyViewBanner) return;
        els.historyViewBanner.textContent = `⏱ 과거 이력 보기 — 실행: ${when} (현재 라이브 결과 아님)`;
        els.historyViewBanner.style.display = "";
    }

    function hideHistoryBanner() {
        state.selectedHistoryId = null;
        if (els.historyViewBanner) els.historyViewBanner.style.display = "none";
    }

    function applyFormValues(targetConfig) {
        const next = merge(clone(baseDefaultConfig()), targetConfig || {});
        next.defaultEnvironment = getInputValue("formDefaultEnvironment") || next.defaultEnvironment;
        next.environments = next.environments || {};
        next.environments.custom = next.environments.custom || { label: "직접 입력", baseUrl: "" };
        next.environments.custom.label = next.environments.custom.label || "직접 입력";
        next.environments.custom.baseUrl = normalizeBaseUrl(getInputValue("formCustomUrl"));
        next.auth = next.auth || {};
        next.auth.mode = normalizedAuthMode(getInputValue("formAuthMode") || next.auth.mode || "signature");
        next.auth.apiKey = getInputValue("formApiKey");
        next.auth.memberId = getInputValue("formAuthMemberId");
        next.auth.secretKey = next.auth.mode === "signature" ? getInputValue("formSecretKey") : "";
        next.auth.accessToken = next.auth.mode === "bearer" ? getInputValue("formSecretKey") : (state.token || next.auth.accessToken || "");
        next.data = next.data || {};
        next.data.externalTemplateId = getInputValue("formExternalTemplateId");
        next.data.attachTemplateId = getInputValue("formAttachTemplateId");
        next.data.attachFieldId = getInputValue("formAttachFieldId") || "첨부 1";
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
        const next = applyFormValues(config);
        replaceConfig(next);
        syncEnvironmentControls("form");
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
        restoreSelection();  // 프로필마다 마지막 OPA 선택을 따로 기억한다 (P1-11)
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
        writeStoredConfig(finalConfig);
        replaceConfig(finalConfig);
        setCurrentProfileName(profileName);
        populateProfileSelect();
        populateSettingsFormFromConfig();
        updateEditorFromConfig();
        refreshAll();
        setSettingsStatus(`프로필 "${profileName}"을 저장했습니다. (비밀키·토큰은 저장되지 않음 — [인증 저장]을 사용하세요)`);
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
        const fields = ["formApiKey", "formSecretKey"];
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
        // 실행 중에는 설정을 바꿀 수 없다 (P1-11) — 바뀐 값이 진행 중인 요청에 섞이는 것을 막는다
        if (state.running) {
            showRunNotice("테스트 실행 중에는 입력값 설정을 열 수 없습니다. 실행이 끝나거나 [중지]한 뒤 다시 시도해 주세요.");
            return;
        }
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
            // Export 파일에도 비밀키·토큰을 넣지 않는다
            config: stripSecrets(config)
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
        setSettingsStatus(`프로필 "${profileName}"을 export 했습니다. (비밀키·토큰 제외)`);
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
                // 구버전 Export 파일에 비밀키가 있어도 저장소에는 기록하지 않는다 (현재 탭 메모리에만 반영)
                writeProfiles(profiles);
                writeStoredConfig(finalConfig);
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
        hideHistoryBanner();
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
            "formDefaultEnvironment", "formCustomUrl", "formAuthMode", "formExternalTemplateId", "formAttachTemplateId", "formAttachFieldId",
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
        localStorage.removeItem(SELECTION_STORAGE_KEY);
        state.selectedCodes.clear();
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

    // ── AUTH (헤더 런처 + 설정 모달) ─────────────────────────────────────────
    // 인증 입력·토큰 발급은 설정 모달에서만 한다. 헤더 "사용자 설정" 줄은 모달을 여는 런처이며
    // 토큰 상태 배지(token-badge.js)와 Company ID를 보여 준다 (P1-12 — 숨겨진 인라인 패널 삭제).
    function showModalAuthMessage(message, tone = "error") {
        ensureProfileElements();
        if (!els.modalAuthMessage) return;
        els.modalAuthMessage.textContent = message;
        els.modalAuthMessage.className = `run-notice ${tone}`;
        els.modalAuthMessage.hidden = false;
    }

    function hideModalAuthMessage() {
        if (els.modalAuthMessage) els.modalAuthMessage.hidden = true;
    }

    function clearIssuedToken() {
        state.token = "";
        state.companyId = "";
        syncConfigFromAuthPanel();
        updateEditorFromConfig();
        updateAuthPanelUI();
        refreshAll();
    }

    function initAuthPanel() {
        if (!els.authPanelToggle) return;

        // 런처 → 설정 모달 (실행 중에는 openSettingsModal()이 막는다)
        els.authPanelToggle.addEventListener("click", (event) => {
            // 배지의 [토큰 재발급] 버튼은 token-badge가 처리한다
            if (event.target.closest && event.target.closest(".tb-reissue")) return;
            openSettingsModal();
        });
        els.authPanelToggle.addEventListener("keydown", (event) => {
            if (event.target !== els.authPanelToggle) return;  // 안쪽 [토큰 재발급] 버튼의 키 입력은 그대로 둔다
            if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openSettingsModal();
            }
        });

        const handleIssueTokenFromModal = async (button) => {
            const authMode = normalizedAuthMode(els.formAuthMode ? els.formAuthMode.value : state.authMethod);
            const { apiKey, memberId, secretKey } = authInputs();
            hideModalAuthMessage();

            if (!secretKey) { showModalAuthMessage(authMode === "bearer" ? "Access Token을 입력해 주세요." : "비밀 키(Secret Key)를 입력해 주세요."); return; }
            if (authMode !== "bearer" && (!apiKey || !memberId)) { showModalAuthMessage("API Key와 Auth Member ID를 입력해 주세요."); return; }

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
                    await issueTokenFromPanel(apiKey, memberId, secretKey);
                }
                syncConfigFromAuthPanel();
                updateEditorFromConfig();
                refreshAll();
                showModalAuthMessage(authMode === "bearer" ? "입력한 Access Token을 사용합니다." : "토큰을 발급했습니다.", "info");
            } catch (err) {
                updateAuthPanelUI();
                showModalAuthMessage(`토큰 발급 실패: ${err.message || String(err)}`);
            } finally {
                button.disabled = false;
                button.innerHTML = '<i class="fa-solid fa-rotate fa-sm"></i> 토큰 발급';
            }
        };

        if (els.modalIssueTokenBtn) {
            els.modalIssueTokenBtn.addEventListener("click", () => handleIssueTokenFromModal(els.modalIssueTokenBtn));
        }

        if (els.modalClearTokenBtn) {
            els.modalClearTokenBtn.addEventListener("click", () => { hideModalAuthMessage(); clearIssuedToken(); });
        }

        if (els.modalTokenDisplay) {
            els.modalTokenDisplay.addEventListener("click", () => {
                if (!state.token) return;
                copyText(state.token).then((ok) => {
                    const orig = els.modalTokenDisplay.textContent;
                    els.modalTokenDisplay.textContent = ok ? "복사됨" : "복사 실패";
                    setTimeout(() => { els.modalTokenDisplay.textContent = orig; }, 1200);
                });
            });
        }

        populateAuthPanelFromConfig();
    }

    function updateAuthPanelUI() {
        if (!state.token) clearTokenBadges();
        if (els.authStatusBadge) {
            // 발급 결과가 있으면 token-badge가 남은 시간을 보여 준다. 그 외 상태만 텍스트로 표시한다.
            const badgeShown = !!(state.token && document.querySelector("#authTokenBadge .tb-badge"));
            let text = "";
            let tone = "no-token";
            if (!state.token) text = "토큰 없음 · 클릭해 입력값 설정에서 발급";
            else if (state.authMethod === "bearer") { text = "Bearer 토큰 입력됨 (만료 시각 알 수 없음)"; tone = "has-token"; }
            else if (!badgeShown) { text = "토큰 보유"; tone = "has-token"; }
            els.authStatusBadge.textContent = text;
            els.authStatusBadge.className = `auth-status ${tone}`;
            els.authStatusBadge.hidden = !text;
        }

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

        [[els.modalCompanyIdDisplay, els.modalCompanyIdValue], [els.authCompanyIdDisplay, els.authCompanyIdValue]].forEach(([wrap, value]) => {
            if (!wrap || !value) return;
            wrap.style.display = state.companyId ? "" : "none";
            value.textContent = state.companyId || "-";
        });
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
                    <li><strong>직접 입력</strong> — 원하는 API URL을 직접 입력합니다. 커스텀 서버나 개발 환경 테스트에 활용할 수 있습니다.</li>
                    <li>환경이 맞지 않으면 토큰 발급 단계에서 인증 오류가 발생합니다.</li>
                </ul>
            </div>
            <div class="guide-step">
                <div class="guide-step-num">2</div>
                <i class="fa-solid fa-key guide-step-icon"></i>
                <h3>인증 설정 및 토큰 발급</h3>
                <p><strong>입력값 설정</strong> 모달을 열고, 하단의 "인증 및 외부 API 설정" 섹션에서 인증 방식을 선택한 뒤 값을 입력합니다.</p>
                <ul>
                    <li><strong>Signature</strong> — API Key + Auth Member ID + Secret Key를 입력하고 "토큰 발급" 버튼을 클릭합니다. 발급 성공 시 Company ID가 자동으로 채워집니다.</li>
                    <li><strong>Bearer Token</strong> — 이미 보유한 Access Token을 Secret Key / Bearer Token 필드에 직접 붙여넣습니다. 토큰 발급 버튼 없이 바로 사용됩니다.</li>
                    <li>발급된 토큰과 Company ID는 인증 섹션 하단에서 확인할 수 있으며, 클릭하면 클립보드에 복사됩니다. 화면 위쪽 <strong>사용자 설정</strong> 줄에도 토큰 남은 시간과 Company ID가 표시됩니다.</li>
                    <li><strong>인증 저장</strong> 버튼으로 현재 인증 정보를 DB에 저장해두면, <strong>인증 불러오기</strong>로 다음 테스트 시 재입력 없이 바로 불러올 수 있습니다. (로그인 필요)</li>
                </ul>
            </div>
            <div class="guide-step">
                <div class="guide-step-num">3</div>
                <i class="fa-solid fa-file-pen guide-step-icon"></i>
                <h3>테스트 데이터 입력</h3>
                <p><strong>입력값 설정</strong> 모달의 "일반 설정" 섹션에서 테스트에 필요한 값을 채웁니다. 실행하려는 OPA에 따라 필요한 항목이 다릅니다.</p>
                <ul>
                    <li><strong>외부 Template ID</strong> — OPA 007(외부 문서 작성)에 필요. Company ID와 API Key는 토큰 발급 정보에서 자동으로 채워집니다.</li>
                    <li><strong>첨부 템플릿 ID / 첨부 필드 ID</strong> — OPA 006(첨부 파일 다운로드)에 사용. 첨부 컴포넌트가 있는 템플릿과 해당 필드 ID를 입력해야 합니다.</li>
                    <li><strong>테스트 멤버 ID</strong> — 멤버·그룹 관련 OPA(011~013, 018~020, 030)에 필요합니다.</li>
                    <li><strong>기본 수신자 (이름/이메일/휴대폰)</strong> — OPA 014(재요청) 시나리오에서 수신자 정보로 사용됩니다.</li>
                    <li><strong>PDF 수신자 (이름/이메일)</strong> — OPA 037(완료 문서 PDF 전송)에 필요합니다.</li>
                    <li>문서 생성·취소·다운로드 관련 OPA(003, 004, 005, 016, 021, 040, 042, 045)는 템플릿·완료 문서를 자동 탐색하므로 별도 ID 입력이 불필요합니다.</li>
                    <li>설정을 프로필로 저장해두면 다음 테스트 시 재입력 없이 바로 불러올 수 있습니다.</li>
                </ul>
            </div>
            <div class="guide-step">
                <div class="guide-step-num">4</div>
                <i class="fa-solid fa-list-check guide-step-icon"></i>
                <h3>OPA 선택</h3>
                <p>모달을 닫고 좌측 사이드바에서 실행할 OPA를 선택합니다. 각 항목의 상태 배지를 확인하세요.</p>
                <ul>
                    <li>처음 열면 아무 OPA도 선택되어 있지 않습니다. 마지막으로 고른 OPA는 프로필별로 기억됩니다.</li>
                    <li><strong class="guide-ready">준비됨</strong> — 현재 입력된 설정으로 바로 실행 가능합니다.</li>
                    <li><strong class="guide-warn">설정 필요</strong> — 누락된 값이 있습니다. 항목을 클릭하면 우측 상세 패널에서 어떤 설정이 부족한지 확인할 수 있습니다.</li>
                    <li>여러 OPA를 선택하면 OPA별로 독립 실행됩니다. 각 OPA의 문서 생명주기(생성 → 검증 → 정리)가 격리되어 서로 영향을 주지 않습니다.</li>
                    <li>템플릿·완료 문서 탐색 결과는 OPA 간 캐싱되어 중복 API 호출 없이 재사용됩니다.</li>
                </ul>
            </div>
            <div class="guide-step">
                <div class="guide-step-num">5</div>
                <i class="fa-solid fa-play guide-step-icon"></i>
                <h3>실행 및 결과 확인</h3>
                <p>실행 버튼을 누르면 토큰 준비부터 정리 단계까지 자동으로 처리됩니다. 각 step의 결과가 테이블로 표시됩니다.</p>
                <ul>
                    <li><strong>현재 OPA만 실행</strong> — 사이드바에서 선택(클릭)된 OPA 하나만 실행합니다.</li>
                    <li><strong>선택한 OPA 실행</strong> — 체크박스로 선택된 OPA 전체를 OPA 단위로 순차 실행합니다.</li>
                    <li>실행 전 <strong>확인 창</strong>에서 대상 환경·회사·OPA 수, 문서·멤버를 만들거나 지우는 OPA, 설정이 빠져 건너뛸 OPA를 확인합니다. 설정이 빠진 OPA는 실패가 아니라 <strong>SKIP(설정 필요)</strong>으로 기록됩니다.</li>
                    <li>실행 중에는 환경·입력값 설정·프로필을 바꿀 수 없습니다. <strong>중지</strong>를 누르면 남은 step은 건너뛰고, 이미 만든 문서·멤버·그룹·도장의 정리 step만 실행합니다. 요청 하나가 60초를 넘으면 FAIL(TIMEOUT)로 처리됩니다.</li>
                    <li>결과 위쪽의 <strong>전체 / FAIL / CHECK / SKIP</strong> 필터와 <strong>모두 펼치기</strong>로 결과를 좁혀 볼 수 있고, 결과 보기 안에서 <strong>요청 복사 · 응답 복사 · cURL로 복사</strong>를 쓸 수 있습니다(cURL의 인증 헤더는 <code>&lt;ACCESS_TOKEN&gt;</code> 플레이스홀더).</li>
                    <li><strong>실패 OPA만 재실행</strong>은 FAIL로 끝난 OPA만 다시 선택해 실행합니다. 실행 이력의 <strong>같은 OPA 다시 실행</strong>도 같은 확인 창을 거칩니다.</li>
                    <li><strong>PASS / CHECK / FAIL / SKIP</strong> — step 단위로 결과가 표시됩니다. <strong>CHECK(검토 필요)</strong>는 정리·삭제 단계 등에서 400~403 응답이 온 경우로, 의도된 동작인지 실제 오류인지 결과 보기로 직접 확인해야 합니다(404는 실제 오류로 보아 FAIL 처리). 200 OK여도 응답 body가 실패(예: 일괄 처리의 success:false)를 나타내면 사유와 함께 FAIL로 처리됩니다. 선행 step 실패 시 같은 OPA의 후속 step은 자동으로 SKIP됩니다. FAIL·CHECK 모두 결과 보기로 요청 바디와 응답 전문을 확인할 수 있습니다.</li>
                    <li>실행 완료 후 <strong>리포트 보기</strong> 버튼이 나타납니다. 리포트 모달에서 OPA별/Step별 결과 요약과 실패 상세를 확인할 수 있습니다.</li>
                    <li>리포트를 <strong>Markdown</strong> 또는 <strong>HTML</strong> 파일로 다운로드하여 공유할 수 있습니다.</li>
                </ul>
            </div>
        `;

        tip.innerHTML = `<strong>팁:</strong> OPA 003·004·005·016·021·040·042·045는 템플릿 또는 완료 문서를 자동으로 탐색하므로 ID를 별도로 입력하지 않아도 됩니다. OPA 016·021(일괄 작성)은 작성 검증만 수행하며 문서 정리(취소/삭제) 단계가 없습니다. OPA 037(PDF 전송), OPA 040(일괄 다운로드), OPA 045(완료 토큰 연장), OPA 004(단건 다운로드)는 계정에 완료 상태(status_type=003) 문서가 없으면 실행해도 의미 있는 검증이 되지 않습니다. OPA 006은 첨부 컴포넌트가 있는 템플릿으로 테스트 문서를 생성한 뒤 첨부 파일 다운로드를 자동 검증합니다.`;
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
