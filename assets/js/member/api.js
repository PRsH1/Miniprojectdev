// assets/js/member/api.js
// 토큰 발급 + 멤버/그룹 API 호출 함수 모음
// 다른 파일에 의존하지 않음 — 전역 함수로 노출

'use strict';

// ─── 멤버 목록 캐시 & 페이지네이션 상태 ─────────────────
let _membersCache = [];
const MEMBER_PAGE_SIZE = 25;
let _memberCurrentPage = 1;
let _memberCurrentView = 'table';

// ─── 결과 배지 표시 헬퍼 ─────────────────────────────────
function setResultBadge(badgeId, isOk) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  badge.textContent = isOk ? '200 OK' : 'Error';
  badge.className = 'result-status-badge ' + (isOk ? 'status-ok' : 'status-err');
  badge.style.display = '';
}

// ─── API 에러 요약 (assets/js/api-error.js) ──────────────
// HTTP 에러 응답을 status·본문과 함께 Error로 만든다 (메시지 형식은 기존과 동일: "400: {본문}")
function apiHttpError(res, bodyText) {
  const err = new Error(`${res.status}: ${bodyText || ''}`);
  err.status = res.status;
  err.bodyText = bodyText || '';
  return err;
}

// 결과 영역 바로 위에 "HTTP 400 · [코드] 메시지 + 에러 코드 찾아보기" 박스를 표시한다
function showApiErrorSummary(resultSelector, err) {
  // 401이면 토큰 배지를 "만료됨 · [토큰 재발급]"으로 바꾼다
  if (err && err.status === 401 && window.TokenBadge) window.TokenBadge.markExpired('#tokenBadge');
  const $target = $(resultSelector);
  if (!$target.length || typeof window.renderApiError !== 'function') return;
  let $box = $target.prev('.member-api-error');
  if (!$box.length) $box = $('<div class="member-api-error"></div>').insertBefore($target);
  if (err && err.status) {
    window.renderApiError($box[0], { status: err.status, bodyText: err.bodyText });
  } else {
    const m = /^(\d{3}): ([\s\S]*)$/.exec(String(err && err.message !== undefined ? err.message : err));
    if (m) window.renderApiError($box[0], { status: Number(m[1]), bodyText: m[2] });
    else window.renderApiError($box[0], { error: err });
  }
}

function clearApiErrorSummary(resultSelector) {
  $(resultSelector).prev('.member-api-error').remove();
}

// ─── 입력값 헬퍼 (P1-15) ─────────────────────────────────
// 엑셀 셀 값이 "입력됨"인지 — FALSE·0 같은 값도 입력으로 본다 (truthy 검사로는 enabled=FALSE가 빠진다)
function hasValue(v) {
  return v !== undefined && v !== null && String(v).trim() !== '';
}

// 콤마 구분 문자열(또는 엑셀 셀 값)을 배열로
function splitList(v) {
  return hasValue(v) ? String(v).split(',').map(s => s.trim()).filter(s => s) : [];
}

// 그룹 수정 PATCH 본문 — 입력한 필드만 담는다. clearMembers면 members: [] (의도적으로 비우기)
function buildGroupPatch({ name, description, members, clearMembers }) {
  const group = {};
  if (hasValue(name)) group.name = String(name).trim();
  if (hasValue(description)) group.description = String(description).trim();
  if (clearMembers) group.members = [];
  else if (hasValue(members)) group.members = splitList(members);
  return group;
}

// ─── 엑셀 파일 읽기 (P1-15) ──────────────────────────────
// 형식 확인(xlsx=ZIP, xls=OLE 시그니처) + 파싱 실패를 안내 문구로 바꾼다.
// 이전에는 그룹 검증에 try/catch가 없어 잘못된 파일이면 스피너가 멈추지 않았다.
const EXCEL_READ_ERROR = '엑셀 파일을 읽을 수 없습니다. .xlsx 또는 .xls 형식의 파일인지 확인해 주세요.';
function readExcelRows(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const bytes = new Uint8Array(e.target.result);
        const isZip = bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;
        const isOle = bytes.length >= 4 && bytes[0] === 0xD0 && bytes[1] === 0xCF && bytes[2] === 0x11 && bytes[3] === 0xE0;
        if (!isZip && !isOle) throw new Error('엑셀 형식이 아님');
        const wb = XLSX.read(bytes, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) throw new Error('시트 없음');
        resolve(XLSX.utils.sheet_to_json(sheet));
      } catch (err) {
        reject(new Error(EXCEL_READ_ERROR));
      }
    };
    reader.onerror = () => reject(new Error(EXCEL_READ_ERROR));
    reader.readAsArrayBuffer(file);
  });
}

// 엑셀 검증 공통 흐름: 파일 확인 → 읽기 → validate(rows) → 결과 표시. 실패해도 스피너는 항상 해제된다.
// validate는 { summary, validCount }를 반환한다.
async function runExcelValidation({ inputId, resultId, executeSectionId, button, validate }) {
  const input = document.getElementById(inputId);
  if (!input || !input.files || !input.files.length) return alert('엑셀 파일을 선택해주세요.');
  if (button) showLoading(button);
  const $result = $('#' + resultId);
  const $exec = $('#' + executeSectionId);
  try {
    const rows = await readExcelRows(input.files[0]);
    if (!rows.length) {
      $exec.hide();
      $result.text('엑셀에 데이터 행이 없습니다. 첫 행은 헤더, 둘째 행부터 데이터를 입력하세요.');
      return;
    }
    const { summary, validCount } = validate(rows);
    $result.text(summary);
    $exec.toggle(validCount > 0);
    if (typeof resetBulkJob === 'function') resetBulkJob(executeSectionId);
  } catch (err) {
    $exec.hide();
    $result.text(err.message || EXCEL_READ_ERROR);
    if (typeof showToast === 'function') showToast(err.message || EXCEL_READ_ERROR, 3500);
  } finally {
    if (button) hideLoading(button);
  }
}

// ─── 상수 ───────────────────────────────────────────────
// 토큰 발급 도메인 (경로는 공유 모듈 token-issuer.js가 붙인다)
const tokenDomainMap = {
  op_saas: 'https://kr-api.eformsign.com',
  csap:    'https://www.gov-eformsign.com/Service',
};
const memberUrlMap = {
  op_saas: 'https://kr-api.eformsign.com/v2.0/api/members',
  csap:    'https://www.gov-eformsign.com/Service/v2.0/api/members',
};
const groupUrlMap = {
  op_saas: 'https://kr-api.eformsign.com/v2.0/api/groups',
  csap:    'https://www.gov-eformsign.com/Service/v2.0/api/groups',
};

// ─── URL 헬퍼 ────────────────────────────────────────────
function getMemberBaseUrl() {
  const env = $('#envSelection').val();
  if (env === 'custom') {
    return ($('#customEnvUrl').val().trim().replace(/\/$/, '') || '') + '/v2.0/api/members';
  }
  return memberUrlMap[env];
}

function getGroupBaseUrl() {
  const env = $('#envSelection').val();
  if (env === 'custom') {
    return ($('#customEnvUrl').val().trim().replace(/\/$/, '') || '') + '/v2.0/api/groups';
  }
  return groupUrlMap[env];
}

// ─── 로딩 상태 헬퍼 ─────────────────────────────────────
function showLoading(button) {
  if (!button) return;
  const $b = $(button);
  if (!$b.data('original-html')) $b.data('original-html', $b.html());
  $b.html('<span class="spinner"></span>처리 중...').addClass('loading').prop('disabled', true);
}

function hideLoading(button) {
  if (!button) return;
  const $b = $(button);
  if ($b.data('original-html')) $b.html($b.data('original-html'));
  $b.removeClass('loading').prop('disabled', false);
}

// ─── Access Token 발급 ───────────────────────────────────
async function getAccessToken(button) {
  showLoading(button);

  const env = $('#envSelection').val();
  // custom은 Base URL 또는 전체 토큰 URL 모두 허용 (token-issuer.js의 normalizeDomain이 경로를 정리)
  const domain = env === 'custom'
    ? $('#customEnvUrl').val().trim().replace(/\/$/, '')
    : tokenDomainMap[env];
  if (!domain) {
    hideLoading(button);
    return alert('사용자 지정 Base URL을 입력하세요.');
  }

  const execution_time = Date.now() + '';
  const privateKeyInput = $('#privateKeyHex').val().trim();
  const user_id = $('#user_id_token').val().trim();
  const apiKey = $('#apiKey').val().trim();

  if (!privateKeyInput || !user_id || !apiKey) {
    hideLoading(button);
    return alert('API-KEY, 비밀 키/토큰, User ID 모두 입력해주세요.');
  }

  let signatureValue = '';
  const method = $('input[name="secretKeyMethod"]:checked').val();
  if (method === 'signature') {
    try {
      const privateKey = KEYUTIL.getKeyFromPlainPrivatePKCS8Hex(privateKeyInput);
      const s_sig = new KJUR.crypto.Signature({ alg: 'SHA256withECDSA' });
      s_sig.init(privateKey);
      s_sig.updateString(execution_time);
      signatureValue = s_sig.sign();
    } catch (e) {
      hideLoading(button);
      return alert('서명 생성 중 오류: ' + e);
    }
  } else {
    signatureValue = 'Bearer ' + privateKeyInput;
  }

  $('#tokenResult').text('Access Token 발급 요청 중...');

  try {
    // 공유 모듈: direct 호출 → CORS/네트워크 실패 시에만 /api/getToken 프록시로 재시도
    const result = await window.issueAccessToken({
      domain,
      apiKey,
      memberId: user_id,
      signature: signatureValue,
      execTime: parseInt(execution_time, 10),
    });
    if (!result.ok) {
      // 실패 메시지는 결과 영역에 남겨 둔다 (사용자가 다시 발급할 때까지 유지)
      $('#tokenResult').text(`Access Token 발급 실패.\n${result.message || '알 수 없는 오류'}` +
        (result.data ? `\n응답:\n${JSON.stringify(result.data, null, 2)}` : ''));
      setResultBadge('tokenResultBadge', false);
      alert(`발급 실패:\n${result.message || '알 수 없는 오류'}`);
      return;
    }
    const data = result.data || {};
    $('#accessToken').val(result.token);
    $('#refreshToken').val((data.oauth_token && data.oauth_token.refresh_token) || '');
    $('#companyId').val((data.api_key && data.api_key.company && data.api_key.company.company_id) || '');
    $('#tokenResult').text(`Access Token 발급 성공${result.via === 'proxy' ? ' (via proxy)' : ''}.\n` + JSON.stringify(data, null, 2));
    setResultBadge('tokenResultBadge', true);
    if (window.TokenBadge) {
      window.TokenBadge.attach('#tokenBadge', result, { onReissue: () => getAccessToken(document.getElementById('btnGetToken')) });
    }
    // 사이드바 토큰 상태 업데이트
    updateTokenStatus(result.token, env);
  } finally {
    hideLoading(button);
  }
}

// ─── 멤버 추가 ───────────────────────────────────────────
function addMember(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }

  const id = $('#accountId').val().trim();
  const pw = $('#accountPassword').val().trim();
  const fn = $('#accountFirstName').val().trim();
  if (!id || !pw || !fn) { hideLoading(button); return alert('id, password, first_name은 필수 입력입니다.'); }

  let account = { id, password: pw, first_name: fn };
  const tel = $('#contactTel').val().trim();
  const num = $('#contactNumber').val().trim();
  const ccn = $('#contactCountryNumber').val().trim();
  let contact = {};
  if (tel) contact.tel = tel;
  if (num) contact.number = num;
  if (ccn) contact.country_number = ccn;
  if (Object.keys(contact).length) account.contact = contact;

  const dept = $('#department').val().trim(); if (dept) account.department = dept;
  const pos = $('#position').val().trim(); if (pos) account.position = pos;
  if ($('#agreementMarketing').is(':checked')) account.agreement = { marketing: true };
  const roles = $('#role').val().trim();
  if (roles) account.role = roles.split(',').map(r => r.trim()).filter(r => r);

  let external = {};
  const extUuid = $('#externalUuid').val().trim();
  const extIdpName = $('#externalIdpName').val().trim();
  const extAcc = $('#externalAccountId').val().trim();
  if (extUuid) external.uuid = extUuid;
  if (extIdpName) external.idp_name = extIdpName;
  if (extAcc) external.account_id = extAcc;
  if (Object.keys(external).length) account.external_sso_info = external;

  const baseUrl = getMemberBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력하세요.'); }

  let url = baseUrl;
  if ($('input[name="mailOption"]:checked').val() === 'false') url += '?mailOption=false';

  $('#result').text(`실행 URL: ${url}\n멤버 추가 중...`);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ account }),
  })
    .then(res => { if (!res.ok) return res.text().then(t => { throw apiHttpError(res, t); }); return res.json(); })
    .then(data => { clearApiErrorSummary('#result'); $('#result').text('멤버 추가 성공.\n' + JSON.stringify(data, null, 2)); setResultBadge('addResultBadge', true); })
    .catch(err => { showApiErrorSummary('#result', err); $('#result').text('Error: ' + err); setResultBadge('addResultBadge', false); })
    .finally(() => hideLoading(button));
}

// ─── 멤버 삭제 ───────────────────────────────────────────
function deleteMember(button) {
  const memberId = $('#deleteMemberId').val().trim();
  if (!memberId) return alert('삭제할 member_id를 입력해주세요.');
  if (!confirm(`멤버 "${memberId}"를 삭제하시겠습니까?\n삭제 시 이메일이 발송되며 되돌릴 수 없습니다.`)) return;

  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }

  const baseUrl = getMemberBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력하세요.'); }

  let url = `${baseUrl}/${encodeURIComponent(memberId)}`;
  if ($('input[name="mailOptionDelete"]:checked').val() === 'false') url += '?mailOption=false';

  $('#deleteResult').text(`실행 URL: ${url}\n삭제 중...`);
  fetch(url, {
    method: 'DELETE',
    headers: { 'Accept': '*/*', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({}),
  })
    .then(res => { if (!res.ok) return res.text().then(t => { throw apiHttpError(res, t); }); return res.text().then(t => t ? JSON.parse(t) : {}); })
    .then(data => { clearApiErrorSummary('#deleteResult'); $('#deleteResult').text('삭제 성공.\n' + JSON.stringify(data, null, 2)); setResultBadge('deleteResultBadge', true); })
    .catch(err => { showApiErrorSummary('#deleteResult', err); $('#deleteResult').text('Error: ' + err); setResultBadge('deleteResultBadge', false); })
    .finally(() => hideLoading(button));
}

// ─── 멤버 수정 ───────────────────────────────────────────
function updateMember(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }

  const memberId = $('#updateMemberId').val().trim();
  if (!memberId) { hideLoading(button); return alert('수정할 member_id를 입력해주세요.'); }

  let account = { id: memberId };
  const name = $('#updateName').val().trim(); if (name) account.name = name;
  // enabled는 "변경 안 함"(빈 값)이 기본 — 사용자가 true/false를 고른 경우에만 보낸다 (P1-15)
  // 항상 보내면 비활성 멤버의 이름만 바꿔도 다시 활성화된다
  const enabledSel = $('#updateEnabled').val();
  if (enabledSel === 'true' || enabledSel === 'false') account.enabled = (enabledSel === 'true');
  const num = $('#updateContactNumber').val().trim();
  const tel = $('#updateContactTel').val().trim();
  if (num || tel) {
    account.contact = {};
    if (num) account.contact.number = num;
    if (tel) account.contact.tel = tel;
  }
  const dept = $('#updateDepartment').val().trim(); if (dept) account.department = dept;
  const pos = $('#updatePosition').val().trim(); if (pos) account.position = pos;
  const roles = $('#updateRole').val().trim();
  if (roles) account.role = roles.split(',').map(r => r.trim()).filter(r => r);

  const baseUrl = getMemberBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력하세요.'); }
  const url = `${baseUrl}/${encodeURIComponent(memberId)}`;

  $('#updateResult').text(`실행 URL: ${url}\n수정 중...`);
  fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ account }),
  })
    .then(res => { if (!res.ok) return res.text().then(t => { throw apiHttpError(res, t); }); return res.json(); })
    .then(data => { clearApiErrorSummary('#updateResult'); $('#updateResult').text('수정 성공.\n' + JSON.stringify(data, null, 2)); setResultBadge('updateResultBadge', true); })
    .catch(err => { showApiErrorSummary('#updateResult', err); $('#updateResult').text('Error: ' + err); setResultBadge('updateResultBadge', false); })
    .finally(() => hideLoading(button));
}

// ─── 구성원 목록 조회 ────────────────────────────────────
function listMembers(viewType, button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }

  _memberCurrentView = viewType || _memberCurrentView;
  _memberCurrentPage = 1;

  const baseUrl = getMemberBaseUrl();
  const params = new URLSearchParams();
  const q = $('#memberSearchInput').val().trim();
  if (q) params.set('eb_name_search', q);
  if ($('#includeDeleted').is(':checked')) params.set('include_delete', 'true');

  const url = params.toString() ? `${baseUrl}?${params}` : baseUrl;

  fetch(url, { method: 'GET', headers: { 'Authorization': 'Bearer ' + token } })
    // 상태 코드를 먼저 확인한다 — 401 등을 "검색 결과 없음"으로 보이지 않게 (P1-15)
    .then(res => { if (!res.ok) return res.text().then(t => { throw apiHttpError(res, t); }); return res.json(); })
    .then(data => {
      clearApiErrorSummary('#memberCountLabel');
      const members = data.members || [];
      members.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
      _membersCache = members;
      _renderMemberView();
    })
    .catch(err => {
      _membersCache = [];
      _renderListFailure('#memberCountLabel', '#jsonContainer', '#tableContainer', '#listResultTable', '#memberPaginator', err);
    })
    .finally(() => hideLoading(button));
}

// 목록 조회 실패 — 표/JSON 영역을 비우고 라벨 위에 에러 요약(api-error)을 보여 준다
function _renderListFailure(labelSel, jsonSel, tableSel, tableId, paginatorSel, err) {
  $(jsonSel).hide();
  $(tableSel).hide();
  $(`${tableId} tbody`).empty();
  if (paginatorSel) $(paginatorSel).empty();
  $(labelSel).text('조회 실패 — 위 에러 내용을 확인하세요.');
  showApiErrorSummary(labelSel, err);
}

function _renderMemberView() {
  const total = _membersCache.length;
  const totalPages = Math.max(1, Math.ceil(total / MEMBER_PAGE_SIZE));
  if (_memberCurrentPage > totalPages) _memberCurrentPage = totalPages;

  const start = (_memberCurrentPage - 1) * MEMBER_PAGE_SIZE;
  const pageData = _membersCache.slice(start, start + MEMBER_PAGE_SIZE);

  $('#memberCountLabel').text(
    total > 0
      ? `총 ${total}명 중 ${start + 1}–${start + pageData.length}번째`
      : '검색 결과 없음'
  );

  if (_memberCurrentView === 'json') {
    $('#jsonContainer').show();
    $('#tableContainer').hide();
    $('#listResultJson').text(JSON.stringify({ members: pageData }, null, 2));
  } else {
    $('#jsonContainer').hide();
    $('#tableContainer').show();
    renderMemberTable(pageData);
  }

  _renderMemberPaginator(totalPages);
}

function _renderMemberPaginator(totalPages) {
  const $p = $('#memberPaginator');
  $p.empty();
  if (totalPages <= 1) return;

  const cur = _memberCurrentPage;

  const mkBtn = (label, page, disabled) => {
    const $b = $(`<button class="btn-secondary" style="height:32px;padding:0 12px;font-size:12px;width:auto;">${label}</button>`);
    if (disabled) $b.prop('disabled', true);
    else $b.on('click', () => { _memberCurrentPage = page; _renderMemberView(); });
    return $b;
  };

  $p.append(mkBtn('←', cur - 1, cur === 1));

  const pages = new Set([1, totalPages, cur - 1, cur, cur + 1].filter(p => p >= 1 && p <= totalPages));
  let prev = 0;
  Array.from(pages).sort((a, b) => a - b).forEach(p => {
    if (prev && p - prev > 1) $p.append($('<span style="padding:0 4px;color:var(--text-muted);">…</span>'));
    const $b = $(`<button style="height:32px;padding:0 12px;font-size:12px;border-radius:8px;border:1px solid var(--border);background:${p === cur ? 'var(--primary)' : 'var(--page-bg)'};color:${p === cur ? '#fff' : 'var(--text-main)'};width:auto;">${p}</button>`);
    if (p !== cur) $b.on('click', () => { _memberCurrentPage = p; _renderMemberView(); });
    $p.append($b);
    prev = p;
  });

  $p.append(mkBtn('→', cur + 1, cur === totalPages));
}

// ─── 멤버 테이블 렌더링 ──────────────────────────────────
function renderMemberTable(members) {
  const tbody = document.querySelector('#listResultTable tbody');
  if (!tbody) return;
  tbody.innerHTML = '';
  members.forEach(m => {
    const date = new Date(m.create_date).toLocaleString();
    const phone = (m.contact && m.contact.number) ? m.contact.number : '-';
    const roles = Array.isArray(m.role) && m.role.length ? m.role.join(', ') : '-';
    const tr = document.createElement('tr');
    [m.id, m.name || '-', m.department || '-', m.position || '-', phone, roles, date, String(m.enabled)].forEach(val => {
      const td = document.createElement('td');
      td.textContent = val;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

// ─── 그룹 추가 ───────────────────────────────────────────
function addGroup(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }

  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  const name = $('#groupName').val().trim();
  if (!name) { hideLoading(button); return alert('그룹 이름을 입력해주세요.'); }
  const description = $('#groupDescription').val().trim();
  const membersText = $('#groupMembers').val().trim();
  const members = membersText ? membersText.split(',').map(s => s.trim()).filter(s => s) : [];

  document.getElementById('groupResult').innerText = '그룹 추가 중...';
  fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ group: { name, description, members } }),
  })
    .then(res => { if (!res.ok) return res.text().then(txt => { throw apiHttpError(res, txt); }); return res.json(); })
    .then(json => { clearApiErrorSummary('#groupResult'); $('#groupResult').text(JSON.stringify({ message: '그룹 추가 성공', response: json }, null, 2)); setResultBadge('groupAddResultBadge', true); })
    .catch(err => { showApiErrorSummary('#groupResult', err); $('#groupResult').text(JSON.stringify({ message: '그룹 추가 실패', error: err.toString() }, null, 2)); setResultBadge('groupAddResultBadge', false); })
    .finally(() => hideLoading(button));
}

// ─── 그룹 수정 ───────────────────────────────────────────
function updateGroup(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }

  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  const groupId = $('#updGroupId').val().trim();
  if (!groupId) { hideLoading(button); return alert('수정할 그룹 ID를 입력해주세요.'); }
  const url = `${baseUrl}/${encodeURIComponent(groupId)}`;

  // 빈 필드는 보내지 않는다 — PATCH에 빈 이름·설명·멤버를 보내면 그룹이 비워질 수 있다 (P1-15)
  // 멤버를 의도적으로 비우려면 "멤버 비우기" 체크박스를 쓴다
  const group = buildGroupPatch({
    name: $('#updGroupName').val(),
    description: $('#updGroupDescription').val(),
    members: $('#updGroupMembers').val(),
    clearMembers: $('#updGroupClearMembers').is(':checked'),
  });
  if (!Object.keys(group).length) {
    hideLoading(button);
    return alert('수정할 항목(이름·설명·멤버)을 하나 이상 입력하거나 "멤버 비우기"를 선택해주세요.');
  }
  if (group.members && !group.members.length &&
      !confirm('그룹의 멤버를 모두 비웁니다. 계속하시겠습니까?')) {
    hideLoading(button);
    return;
  }
  const body = { group };

  $('#groupUpdateResult').text('수정 중...');
  fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(body),
  })
    .then(res => { if (!res.ok) return res.text().then(t => { throw apiHttpError(res, t); }); return res.json(); })
    .then(json => { clearApiErrorSummary('#groupUpdateResult'); $('#groupUpdateResult').text(JSON.stringify({ message: '그룹 수정 성공', response: json }, null, 2)); setResultBadge('groupUpdateResultBadge', true); })
    .catch(err => { showApiErrorSummary('#groupUpdateResult', err); $('#groupUpdateResult').text(JSON.stringify({ message: '그룹 수정 실패', error: err.toString() }, null, 2)); setResultBadge('groupUpdateResultBadge', false); })
    .finally(() => hideLoading(button));
}

// ─── 그룹 삭제 ───────────────────────────────────────────
function deleteGroups(button) {
  const ids = $('#delGroupIds').val().split(',').map(s => s.trim()).filter(s => s);
  if (!ids.length) return alert('삭제할 그룹 ID를 입력해주세요.');
  if (!confirm(`그룹 ${ids.length}개를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;

  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }

  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  $('#groupDeleteResult').text('삭제 중...');
  fetch(baseUrl, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ group_ids: ids }),
  })
    .then(res => { if (!res.ok) return res.text().then(txt => { throw apiHttpError(res, txt); }); return res.json(); })
    .then(json => { clearApiErrorSummary('#groupDeleteResult'); $('#groupDeleteResult').text(JSON.stringify({ message: '그룹 삭제 성공', response: json }, null, 2)); setResultBadge('groupDeleteResultBadge', true); })
    .catch(err => { showApiErrorSummary('#groupDeleteResult', err); $('#groupDeleteResult').text(JSON.stringify({ message: '그룹 삭제 실패', error: err.toString() }, null, 2)); setResultBadge('groupDeleteResultBadge', false); })
    .finally(() => hideLoading(button));
}

// ─── 그룹 목록 조회 ─────────────────────────────────────
function listGroups(viewType, button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급받아주세요.'); }

  const env = $('#envSelection').val();
  const base = env === 'custom'
    ? $('#customEnvUrl').val().trim().replace(/\/$/, '')
    : (env === 'op_saas' ? 'https://kr-api.eformsign.com' : 'https://www.gov-eformsign.com/Service');
  let url = `${base}/v2.0/api/groups`;
  const params = [];
  if ($('#toggleIncludeMember').hasClass('on')) params.push('include_member=true');
  if ($('#toggleIncludeField').hasClass('on')) params.push('include_field=true');
  if (params.length) url += '?' + params.join('&');

  fetch(url, { method: 'GET', headers: { 'Authorization': 'Bearer ' + token } })
    .then(res => { if (!res.ok) return res.text().then(t => { throw apiHttpError(res, t); }); return res.json(); })
    .then(data => {
      clearApiErrorSummary('#groupCountLabel');
      const total = (data.groups || []).length;
      $('#groupCountLabel').text(total > 0 ? `총 ${total}개` : '검색 결과 없음');
      (data.groups || []).sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
      if (viewType === 'json') {
        $('#groupJsonContainer').show();
        $('#groupTableContainer').hide();
        $('#groupListResultJson').text(JSON.stringify(data, null, 2));
      } else {
        $('#groupJsonContainer').hide();
        $('#groupTableContainer').show();
        $('#groupListResultTable tbody').empty();
        (data.groups || []).forEach(g => {
          const date = new Date(g.create_date).toLocaleString();
          const memberCount = Array.isArray(g.members) ? g.members.length : '-';
          // 그룹 이름·설명은 고객이 입력한 값이므로 셀은 textContent로만 채운다 (XSS 방지)
          const $tr = $('<tr>');
          [g.id, g.name, g.description || '-', memberCount, date].forEach(v => {
            $('<td>').text(v === undefined || v === null ? '' : String(v)).appendTo($tr);
          });
          $('#groupListResultTable tbody').append($tr);
        });
      }
    })
    .catch(err => {
      _renderListFailure('#groupCountLabel', '#groupJsonContainer', '#groupTableContainer', '#groupListResultTable', null, err);
    })
    .finally(() => hideLoading(button));
}

// ─── 엑셀 템플릿 다운로드 ────────────────────────────────
function s2ab(s) {
  const buf = new ArrayBuffer(s.length), view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
  return buf;
}
function xlsxDownload(wsData, filename, sheetName) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

function downloadTemplate() {
  xlsxDownload([
    ['id','password','first_name','contact_tel','contact_number','contact_country_number','department','position','agreement_marketing','role','external_uuid','external_idp_name','external_account_id'],
    ['example@forcs.com','1111','Example','01012345678','01087654321','+82','연구소','연구원','true','company_manager,template_manager','123456','google','example@sso.com'],
  ], '멤버추가_템플릿.xlsx', 'Template');
}
function downloadDeleteTemplate() {
  xlsxDownload([['id'],['example@forcs.com']], '멤버삭제_템플릿.xlsx', 'DeleteTemplate');
}
function downloadUpdateTemplate() {
  xlsxDownload([
    ['id','name','enabled','contact_number','contact_tel','department','position','role'],
    ['example@forcs.com','홍길동','true','01023456789','01012345678','연구소','연구원','company_manager,template_manager'],
  ], '멤버수정_템플릿.xlsx', 'UpdateTemplate');
}
function downloadGroupTemplate() {
  xlsxDownload([
    ['name','description','members'],
    ['테스트그룹','클라우드팀','test1@forcs.com,test2@forcs.com'],
  ], 'group_template.xlsx', 'GroupTemplate');
}
function downloadGroupDeleteTemplate() {
  xlsxDownload([
    ['group_ids'],
    ['a1b1f52d896044f6a651624f0f5114ab,b2c2d63e907155g7h762735g1h6225bc'],
  ], 'group_delete_template.xlsx', 'DeleteTemplate');
}
function downloadGroupUpdateTemplate() {
  xlsxDownload([
    ['group_id','name','description','members'],
    ['a1b1f52d896044f6a651624f0f5114ab','테스트그룹2','클라우드2팀','test1@forcs.com,test2@forcs.com'],
  ], 'group_update_template.xlsx', 'UpdateTemplate');
}

// ─── 엑셀 검증/실행 (멤버 추가) ─────────────────────────
// 검증 통과 행은 { rowNumber(엑셀 행 번호), row(원본) }로 보관한다
let validExcelRows = [], invalidExcelRows = [];
function validateExcelFile(button) {
  return runExcelValidation({
    inputId: 'excelFileInput', resultId: 'excelResult', executeSectionId: 'excelExecuteSection', button,
    validate: rows => {
      validExcelRows = []; invalidExcelRows = [];
      rows.forEach((row, i) => {
        const missing = [];
        if (!hasValue(row['id']) && !hasValue(row['account_id'])) missing.push('id');
        if (!hasValue(row['password'])) missing.push('password');
        if (!hasValue(row['first_name'])) missing.push('first_name');
        if (missing.length) invalidExcelRows.push({ rowNumber: i + 2, missing });
        else validExcelRows.push({ rowNumber: i + 2, row });
      });
      let summary = `검증 완료\n총:${rows.length} 유효:${validExcelRows.length} 오류:${invalidExcelRows.length}\n`;
      if (invalidExcelRows.length) {
        summary += '오류행:\n' + invalidExcelRows.map(x => `행 ${x.rowNumber}: ${x.missing.join(',')} 누락`).join('\n');
      }
      return { summary, validCount: validExcelRows.length };
    },
  });
}

function executeExcelMemberAddition(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }
  const baseUrl = getMemberBaseUrl();
  let url = baseUrl;
  if ($('input[name="mailOption"]:checked').val() === 'false') url += '?mailOption=false';

  Promise.all(validExcelRows.map(({ row }) => {
    let account = { id: row['id'] || row['account_id'] || '', password: row['password'] || '', first_name: row['first_name'] || '' };
    if (row['contact_tel']) account.contact = { tel: row['contact_tel'] };
    if (row['contact_number']) account.contact = Object.assign(account.contact || {}, { number: row['contact_number'] });
    if (row['contact_country_number']) account.contact = Object.assign(account.contact || {}, { country_number: row['contact_country_number'] });
    if (row['department']) account.department = row['department'];
    if (row['position']) account.position = row['position'];
    if (row['agreement_marketing'] === 'true' || row['agreement_marketing'] === true) account.agreement = { marketing: true };
    if (row['role']) account.role = splitList(row['role']);
    if (row['external_uuid']) account.external_sso_info = Object.assign(account.external_sso_info || {}, { uuid: row['external_uuid'] });
    if (row['external_idp_name']) account.external_sso_info = Object.assign(account.external_sso_info || {}, { idp_name: row['external_idp_name'] });
    if (row['external_account_id']) account.external_sso_info = Object.assign(account.external_sso_info || {}, { account_id: row['external_account_id'] });
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ account }),
    })
      .then(res => { if (!res.ok) return res.text().then(t => ({ error: `${res.status}`, response: t, row })); return res.json().then(data => ({ success: true, data, row })); })
      .catch(err => ({ error: err.toString(), row }));
  })).then(results => {
    const successCount = results.filter(r => r.success).length;
    document.getElementById('excelResult').innerText =
      `엑셀 처리 완료 (추가) 성공:${successCount} 실패:${results.length - successCount}\n\n` + JSON.stringify(results, null, 2);
  }).finally(() => hideLoading(button));
}

// ─── 엑셀 검증/실행 (멤버 삭제) ─────────────────────────
let validDeleteRows = [], invalidDeleteRows = [];
function validateExcelFileForDeletion(button) {
  return runExcelValidation({
    inputId: 'excelFileDeleteInput', resultId: 'excelDeleteResult', executeSectionId: 'excelDeleteExecuteSection', button,
    validate: rows => {
      validDeleteRows = []; invalidDeleteRows = [];
      rows.forEach((row, i) => {
        if (hasValue(row['id']) || hasValue(row['account_id'])) validDeleteRows.push({ rowNumber: i + 2, row });
        else invalidDeleteRows.push({ rowNumber: i + 2 });
      });
      let s = `검증 완료 삭제\n총:${rows.length} 유효:${validDeleteRows.length} 오류:${invalidDeleteRows.length}\n`;
      if (invalidDeleteRows.length) s += '오류 행 번호(id 누락):\n' + invalidDeleteRows.map(x => `행 ${x.rowNumber}`).join('\n');
      return { summary: s, validCount: validDeleteRows.length };
    },
  });
}

function executeExcelMemberDeletion(button) {
  // 일괄 삭제는 단건 삭제처럼 건수를 보여 주고 확인을 받는다 (P1-15) — 취소하면 요청 0건
  if (!validDeleteRows.length) return alert('삭제할 행이 없습니다. 먼저 파일을 검증해주세요.');
  if (!confirm(`멤버 ${validDeleteRows.length}명을 삭제합니다.\n삭제 시 이메일이 발송될 수 있으며 되돌릴 수 없습니다. 계속하시겠습니까?`)) return;
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }
  const baseUrl = getMemberBaseUrl();
  const mailOpt = $('input[name="mailOptionDeleteExcel"]:checked').val();

  Promise.all(validDeleteRows.map(({ row }) => {
    let url = `${baseUrl}/${encodeURIComponent(row['id'] || row['account_id'])}`;
    if (mailOpt === 'false') url += '?mailOption=false';
    return fetch(url, {
      method: 'DELETE',
      headers: { 'accept': '*/*', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({}),
    })
      .then(res => { if (!res.ok) return res.text().then(t => ({ error: `${res.status}`, response: t, row })); return res.text().then(t => t ? JSON.parse(t) : {}).then(data => ({ success: true, data, row })); })
      .catch(err => ({ error: err.toString(), row }));
  })).then(results => {
    const successCount = results.filter(r => r.success).length;
    document.getElementById('excelDeleteResult').innerText =
      `엑셀 처리 완료 (삭제) 성공:${successCount} 실패:${results.length - successCount}\n\n` + JSON.stringify(results, null, 2);
  }).finally(() => hideLoading(button));
}

// ─── 엑셀 검증/실행 (멤버 수정) ─────────────────────────
const MEMBER_UPDATE_FIELDS = ['name', 'enabled', 'contact_number', 'contact_tel', 'department', 'position', 'role'];
let validUpdateRows = [], invalidUpdateRows = [];
function validateExcelFileForUpdate(button) {
  return runExcelValidation({
    inputId: 'excelFileUpdateInput', resultId: 'excelUpdateResult', executeSectionId: 'excelUpdateExecuteSection', button,
    validate: rows => {
      validUpdateRows = []; invalidUpdateRows = [];
      rows.forEach((row, i) => {
        const hasField = MEMBER_UPDATE_FIELDS.some(k => hasValue(row[k]));
        if (hasValue(row['id']) && hasField) validUpdateRows.push({ rowNumber: i + 2, row });
        else invalidUpdateRows.push({ rowNumber: i + 2 });
      });
      let s = `검증 완료 수정\n총:${rows.length} 유효:${validUpdateRows.length} 오류:${invalidUpdateRows.length}\n`;
      if (invalidUpdateRows.length) s += '오류 행 번호(id 또는 수정 항목 누락):\n' + invalidUpdateRows.map(x => `행 ${x.rowNumber}`).join('\n');
      return { summary: s, validCount: validUpdateRows.length };
    },
  });
}

// 엑셀 멤버 수정 본문 — 값이 있는 열만 보낸다. enabled는 셀에 값이 있을 때만(FALSE 포함)
function buildMemberUpdateAccount(row) {
  const updateObj = { id: String(row['id']).trim() };
  if (hasValue(row['name'])) updateObj.name = String(row['name']).trim();
  if (hasValue(row['enabled'])) updateObj.enabled = (String(row['enabled']).trim().toLowerCase() === 'true');
  if (hasValue(row['contact_number'])) updateObj.contact = Object.assign(updateObj.contact || {}, { number: String(row['contact_number']) });
  if (hasValue(row['contact_tel'])) updateObj.contact = Object.assign(updateObj.contact || {}, { tel: String(row['contact_tel']) });
  if (hasValue(row['department'])) updateObj.department = String(row['department']);
  if (hasValue(row['position'])) updateObj.position = String(row['position']);
  if (hasValue(row['role'])) updateObj.role = splitList(row['role']);
  return updateObj;
}

function executeExcelMemberUpdate(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }
  const baseUrl = getMemberBaseUrl();

  Promise.all(validUpdateRows.map(({ row }) => {
    const updateObj = buildMemberUpdateAccount(row);
    return fetch(`${baseUrl}/${encodeURIComponent(updateObj.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ account: updateObj }),
    })
      .then(res => { if (!res.ok) return res.text().then(t => ({ error: `${res.status}`, response: t, row })); return res.json().then(data => ({ success: true, data, row })); })
      .catch(err => ({ error: err.toString(), row }));
  })).then(results => {
    const successCount = results.filter(r => r.success).length;
    document.getElementById('excelUpdateResult').innerText =
      `엑셀 처리 완료 (수정) 성공:${successCount} 실패:${results.length - successCount}\n\n` + JSON.stringify(results, null, 2);
  }).finally(() => hideLoading(button));
}

// ─── 엑셀 검증/실행 (그룹 추가) ─────────────────────────
let validGroupRows = [], invalidGroupRows = [];
function validateExcelGroupFile(button) {
  return runExcelValidation({
    inputId: 'excelGroupFileInput', resultId: 'excelGroupResult', executeSectionId: 'excelGroupExecuteSection', button,
    validate: rows => {
      validGroupRows = []; invalidGroupRows = [];
      rows.forEach((row, idx) => {
        if (hasValue(row.name) && hasValue(row.members)) validGroupRows.push({ rowNumber: idx + 2, row });
        else invalidGroupRows.push(idx + 2);
      });
      let msg = `검증 완료\n총 행: ${rows.length}\n유효 행: ${validGroupRows.length}\n오류 행: ${invalidGroupRows.length}`;
      if (invalidGroupRows.length) msg += '\n오류 행 번호(name 또는 members 누락): ' + invalidGroupRows.join(', ');
      return { summary: msg, validCount: validGroupRows.length };
    },
  });
}

function executeExcelGroupAddition(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }
  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  Promise.all(validGroupRows.map(({ row }) => {
    return fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ group: { name: String(row.name).trim(), description: hasValue(row.description) ? String(row.description) : '', members: splitList(row.members) } }),
    })
      .then(res => { if (!res.ok) return res.text().then(txt => { throw new Error(txt || `HTTP ${res.status}`); }); return res.json(); })
      .then(json => ({ success: true, row, response: json }))
      .catch(err => ({ success: false, row, error: err.toString() }));
  })).then(results => {
    const ok = results.filter(r => r.success).length;
    $('#excelGroupResult').text(JSON.stringify({ summary: `엑셀 그룹 추가 완료 (성공 ${ok}건, 실패 ${results.length - ok}건)`, details: results }, null, 2));
  }).finally(() => hideLoading(button));
}

// ─── 엑셀 검증/실행 (그룹 삭제) ─────────────────────────
// 한 행의 group_ids(콤마 구분)를 한 번의 DELETE로 보낸다
let validGroupDeleteRows = [], invalidGroupDeleteRows = [];
function validateExcelGroupDeleteFile(button) {
  return runExcelValidation({
    inputId: 'excelGroupDeleteFileInput', resultId: 'excelGroupDeleteResult', executeSectionId: 'excelGroupDeleteExecuteSection', button,
    validate: rows => {
      validGroupDeleteRows = []; invalidGroupDeleteRows = [];
      rows.forEach((r, i) => {
        const ids = splitList(r.group_ids);
        if (ids.length) validGroupDeleteRows.push({ rowNumber: i + 2, row: r, ids });
        else invalidGroupDeleteRows.push(i + 2);
      });
      const idCount = validGroupDeleteRows.reduce((n, e) => n + e.ids.length, 0);
      let msg = `검증 완료\n총행:${rows.length} 유효행:${validGroupDeleteRows.length}(그룹 ${idCount}개) 오류행:${invalidGroupDeleteRows.length}`;
      if (invalidGroupDeleteRows.length) msg += `\n오류행 번호(group_ids 누락): ${invalidGroupDeleteRows.join(',')}`;
      return { summary: msg, validCount: validGroupDeleteRows.length };
    },
  });
}

function executeExcelGroupDeletion(button) {
  if (!validGroupDeleteRows.length) return alert('삭제할 행이 없습니다. 먼저 파일을 검증해주세요.');
  const idCount = validGroupDeleteRows.reduce((n, e) => n + e.ids.length, 0);
  if (!confirm(`그룹 ${idCount}개(엑셀 ${validGroupDeleteRows.length}행)를 삭제합니다.\n이 작업은 되돌릴 수 없습니다. 계속하시겠습니까?`)) return;
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }
  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  Promise.all(validGroupDeleteRows.map(({ ids }) =>
    fetch(baseUrl, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ group_ids: ids }),
    })
      .then(res => { if (!res.ok) return res.text().then(txt => { throw new Error(txt || `HTTP ${res.status}`); }); return res.json(); })
      .then(json => ({ success: true, ids, response: json }))
      .catch(err => ({ success: false, ids, error: err.toString() }))
  )).then(results => {
    const ok = results.filter(r => r.success).length;
    $('#excelGroupDeleteResult').text(JSON.stringify({ summary: `엑셀 그룹 삭제 완료 (성공 ${ok}건, 실패 ${results.length - ok}건)`, details: results }, null, 2));
  }).finally(() => hideLoading(button));
}

// ─── 엑셀 검증/실행 (그룹 수정) ─────────────────────────
// 수동 수정과 같은 규칙: 값이 있는 열만 보낸다 (빈 description·members로 그룹을 비우지 않음)
let validGroupUpdateRows = [], invalidGroupUpdateRows = [];
function validateExcelGroupUpdateFile(button) {
  return runExcelValidation({
    inputId: 'excelGroupUpdateFileInput', resultId: 'excelGroupUpdateResult', executeSectionId: 'excelGroupUpdateExecuteSection', button,
    validate: rows => {
      validGroupUpdateRows = []; invalidGroupUpdateRows = [];
      rows.forEach((r, i) => {
        const group = buildGroupPatch({ name: r.name, description: r.description, members: r.members });
        if (hasValue(r.group_id) && Object.keys(group).length) {
          validGroupUpdateRows.push({ rowNumber: i + 2, row: r, groupId: String(r.group_id).trim(), group });
        } else {
          invalidGroupUpdateRows.push(i + 2);
        }
      });
      let msg = `검증 완료\n총:${rows.length} 유효:${validGroupUpdateRows.length} 오류:${invalidGroupUpdateRows.length}`;
      if (invalidGroupUpdateRows.length) msg += `\n오류행(group_id 또는 수정 항목 누락):${invalidGroupUpdateRows.join(',')}`;
      return { summary: msg, validCount: validGroupUpdateRows.length };
    },
  });
}

function executeExcelGroupUpdate(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }
  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  Promise.all(validGroupUpdateRows.map(r =>
    fetch(`${baseUrl}/${encodeURIComponent(r.groupId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ group: r.group }),
    })
      .then(res => { if (!res.ok) return res.text().then(t => { throw new Error(t || `HTTP ${res.status}`); }); return res.json(); })
      .then(json => ({ success: true, row: r.row, response: json }))
      .catch(err => ({ success: false, row: r.row, error: err.toString() }))
  )).then(results => {
    const ok = results.filter(r => r.success).length;
    $('#excelGroupUpdateResult').text(JSON.stringify({ summary: `엑셀 그룹 수정 완료 (성공 ${ok}건, 실패 ${results.length - ok}건)`, details: results }, null, 2));
  }).finally(() => hideLoading(button));
}

// ─── 사이드바 토큰 상태 업데이트 (ui.js에서도 호출 가능) ──
function updateTokenStatus(token, env) {
  const preview = token ? token.substring(0, 20) + '...' : '미발급';
  const envLabel = { op_saas: '운영(SaaS)', csap: '공공(CSAP)', custom: '사용자 지정' }[env] || env;
  $('#sbTokenPreview').text(preview);
  $('#sbTokenEnv').text(envLabel);
  $('#sbTokenStatus').removeClass('status-none status-ok').addClass(token ? 'status-ok' : 'status-none');
}
