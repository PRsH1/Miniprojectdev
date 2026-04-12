// assets/js/member/api.js
// 토큰 발급 + 멤버/그룹 API 호출 함수 모음
// 다른 파일에 의존하지 않음 — 전역 함수로 노출

'use strict';

// ─── 멤버 목록 캐시 ─────────────────────────────────────
let _membersCache = [];

// ─── 결과 배지 표시 헬퍼 ─────────────────────────────────
function setResultBadge(badgeId, isOk) {
  const badge = document.getElementById(badgeId);
  if (!badge) return;
  badge.textContent = isOk ? '200 OK' : 'Error';
  badge.className = 'result-status-badge ' + (isOk ? 'status-ok' : 'status-err');
  badge.style.display = '';
}

// ─── 상수 ───────────────────────────────────────────────
const tokenUrlMap = {
  op_saas: 'https://kr-api.eformsign.com/v2.0/api_auth/access_token',
  csap:    'https://www.gov-eformsign.com/Service/v2.0/api_auth/access_token',
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
function getAccessToken(button) {
  showLoading(button);

  const env = $('#envSelection').val();
  let requestURL;
  if (env === 'custom') {
    const base = $('#customEnvUrl').val().trim().replace(/\/$/, '');
    requestURL = base.includes('/api_auth/access_token')
      ? base
      : `${base}/v2.0/api_auth/access_token`;
  } else {
    requestURL = tokenUrlMap[env];
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

  const requestBody = { execution_time: parseInt(execution_time), member_id: user_id };
  $('#tokenResult').html('Access Token 발급 요청 중...');

  $.ajax({
    url: requestURL,
    type: 'POST',
    contentType: 'application/json; charset=UTF-8',
    data: JSON.stringify(requestBody),
    beforeSend: req => {
      req.setRequestHeader('Authorization', 'Bearer ' + btoa(apiKey));
      req.setRequestHeader('eformsign_signature', signatureValue);
    },
    success: data => {
      $('#accessToken').val(data.oauth_token.access_token);
      $('#refreshToken').val(data.oauth_token.refresh_token);
      $('#companyId').val(data.api_key.company.company_id);
      $('#tokenResult').html('Access Token 발급 성공.\n' + JSON.stringify(data, null, 2));
      setResultBadge('tokenResultBadge', true);
      // 사이드바 토큰 상태 업데이트
      updateTokenStatus(data.oauth_token.access_token, env);
    },
    error: (jqXHR) => {
      let resp;
      try { resp = JSON.parse(jqXHR.responseText); } catch { resp = { message: '파싱 오류' }; }
      const code = resp.code || jqXHR.status || 'Unknown';
      const msg = resp.ErrorMessage || jqXHR.statusText;
      alert(`발급 실패:\n코드: ${code}\n메시지: ${msg}`);
      $('#tokenResult').html(`Access Token 발급 실패.\n코드: ${code}\n응답:\n${JSON.stringify(resp, null, 2)}`);
      setResultBadge('tokenResultBadge', false);
    },
    complete: () => hideLoading(button),
  });
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

  $('#result').html(`실행 URL: ${url}\n멤버 추가 중...`);
  fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ account }),
  })
    .then(res => { if (!res.ok) return res.text().then(t => { throw new Error(`${res.status}: ${t}`); }); return res.json(); })
    .then(data => { $('#result').html('멤버 추가 성공.\n' + JSON.stringify(data, null, 2)); setResultBadge('addResultBadge', true); })
    .catch(err => { $('#result').html('Error: ' + err); setResultBadge('addResultBadge', false); })
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

  $('#deleteResult').html(`실행 URL: ${url}\n삭제 중...`);
  fetch(url, {
    method: 'DELETE',
    headers: { 'Accept': '*/*', 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({}),
  })
    .then(res => { if (!res.ok) return res.text().then(t => { throw new Error(`${res.status}: ${t}`); }); return res.text().then(t => t ? JSON.parse(t) : {}); })
    .then(data => { $('#deleteResult').html('삭제 성공.\n' + JSON.stringify(data, null, 2)); setResultBadge('deleteResultBadge', true); })
    .catch(err => { $('#deleteResult').html('Error: ' + err); setResultBadge('deleteResultBadge', false); })
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
  account.enabled = ($('#updateEnabled').val() === 'true');
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

  $('#updateResult').html(`실행 URL: ${url}\n수정 중...`);
  fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify({ account }),
  })
    .then(res => { if (!res.ok) return res.text().then(t => { throw new Error(`${res.status}: ${t}`); }); return res.json(); })
    .then(data => { $('#updateResult').html('수정 성공.\n' + JSON.stringify(data, null, 2)); setResultBadge('updateResultBadge', true); })
    .catch(err => { $('#updateResult').html('Error: ' + err); setResultBadge('updateResultBadge', false); })
    .finally(() => hideLoading(button));
}

// ─── 구성원 목록 조회 ────────────────────────────────────
function listMembers(viewType, button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }

  const baseUrl = getMemberBaseUrl();
  fetch(baseUrl, {
    method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token },
  })
    .then(res => res.json())
    .then(data => {
      data.members.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko'));
      _membersCache = data.members;
      if (viewType === 'json') {
        $('#jsonContainer').show();
        $('#tableContainer').hide();
        $('#listResultJson').text(JSON.stringify(data, null, 2));
      } else {
        $('#jsonContainer').hide();
        $('#tableContainer').show();
        filterAndRenderMembers();
      }
    })
    .catch(err => { $('#listResultJson').text('조회 실패: ' + err); })
    .finally(() => hideLoading(button));
}

// ─── 멤버 테이블 렌더링 / 검색 필터 ────────────────────
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

function filterAndRenderMembers() {
  const nameQ = ($('#searchMemberName').val() || '').trim().toLowerCase();
  const idQ   = ($('#searchMemberId').val()   || '').trim().toLowerCase();
  const filtered = _membersCache.filter(m => {
    const nameMatch = !nameQ || (m.name || '').toLowerCase().includes(nameQ);
    const idMatch   = !idQ   || (m.id   || '').toLowerCase().includes(idQ);
    return nameMatch && idMatch;
  });
  renderMemberTable(filtered);
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
    .then(res => { if (!res.ok) return res.text().then(txt => { throw new Error(txt || `HTTP ${res.status}`); }); return res.json(); })
    .then(json => { $('#groupResult').text(JSON.stringify({ message: '그룹 추가 성공', response: json }, null, 2)); setResultBadge('groupAddResultBadge', true); })
    .catch(err => { $('#groupResult').text(JSON.stringify({ message: '그룹 추가 실패', error: err.toString() }, null, 2)); setResultBadge('groupAddResultBadge', false); })
    .finally(() => hideLoading(button));
}

// ─── 그룹 수정 ───────────────────────────────────────────
function updateGroup(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }

  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  const url = `${baseUrl}/${encodeURIComponent($('#updGroupId').val().trim())}`;
  const members = $('#updGroupMembers').val().split(',').map(s => s.trim()).filter(s => s);
  const body = { group: { name: $('#updGroupName').val().trim(), description: $('#updGroupDescription').val().trim(), members } };

  $('#groupUpdateResult').text('수정 중...');
  fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
    body: JSON.stringify(body),
  })
    .then(res => { if (!res.ok) return res.text().then(t => { throw new Error(t || `HTTP ${res.status}`); }); return res.json(); })
    .then(json => { $('#groupUpdateResult').text(JSON.stringify({ message: '그룹 수정 성공', response: json }, null, 2)); setResultBadge('groupUpdateResultBadge', true); })
    .catch(err => { $('#groupUpdateResult').text(JSON.stringify({ message: '그룹 수정 실패', error: err.toString() }, null, 2)); setResultBadge('groupUpdateResultBadge', false); })
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
    .then(res => { if (!res.ok) return res.text().then(txt => { throw new Error(txt || `HTTP ${res.status}`); }); return res.json(); })
    .then(json => { $('#groupDeleteResult').text(JSON.stringify({ message: '그룹 삭제 성공', response: json }, null, 2)); setResultBadge('groupDeleteResultBadge', true); })
    .catch(err => { $('#groupDeleteResult').text(JSON.stringify({ message: '그룹 삭제 실패', error: err.toString() }, null, 2)); setResultBadge('groupDeleteResultBadge', false); })
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
    .then(res => res.json())
    .then(data => {
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
          $('#groupListResultTable tbody').append(`
            <tr>
              <td>${g.id}</td>
              <td>${g.name}</td>
              <td>${g.description || '-'}</td>
              <td>${memberCount}</td>
              <td>${date}</td>
            </tr>
          `);
        });
      }
    })
    .catch(err => { $('#groupListResultJson').text('조회 실패: ' + err); })
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
let validExcelRows = [], invalidExcelRows = [];
function validateExcelFile(button) {
  const fileInput = document.getElementById('excelFileInput');
  if (!fileInput.files || !fileInput.files.length) return alert('엑셀 파일을 선택해주세요.');
  if (button) showLoading(button);
  const reader = new FileReader();
  reader.onload = e => {
    let workbook;
    try { workbook = XLSX.read(e.target.result, { type: 'binary' }); }
    catch (err) { alert('파싱 오류: ' + err); if (button) hideLoading(button); return; }
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
    if (!rows.length) { alert('데이터 없음'); if (button) hideLoading(button); return; }
    validExcelRows = []; invalidExcelRows = [];
    rows.forEach((row, i) => {
      const id = row['id'] || row['account_id'] || '';
      if (id && row['password'] && row['first_name']) validExcelRows.push(row);
      else invalidExcelRows.push({ rowNumber: i + 2, row });
    });
    let summary = `검증 완료\n총:${rows.length} 유효:${validExcelRows.length} 오류:${invalidExcelRows.length}\n`;
    if (invalidExcelRows.length) {
      summary += '오류행:\n';
      invalidExcelRows.forEach(x => {
        const missing = [];
        if (!x.row['id'] && !x.row['account_id']) missing.push('id');
        if (!x.row['password']) missing.push('password');
        if (!x.row['first_name']) missing.push('first_name');
        summary += `행 ${x.rowNumber}: ${missing.join(',')}\n`;
      });
    }
    document.getElementById('excelResult').innerText = summary;
    document.getElementById('excelExecuteSection').style.display = validExcelRows.length > 0 ? 'block' : 'none';
    if (button) hideLoading(button);
  };
  reader.onerror = err => { alert('읽기 오류: ' + err); if (button) hideLoading(button); };
  reader.readAsBinaryString(fileInput.files[0]);
}

function executeExcelMemberAddition(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }
  const baseUrl = getMemberBaseUrl();
  let url = baseUrl;
  if ($('input[name="mailOption"]:checked').val() === 'false') url += '?mailOption=false';

  Promise.all(validExcelRows.map(row => {
    let account = { id: row['id'] || row['account_id'] || '', password: row['password'] || '', first_name: row['first_name'] || '' };
    if (row['contact_tel']) account.contact = { tel: row['contact_tel'] };
    if (row['contact_number']) account.contact = Object.assign(account.contact || {}, { number: row['contact_number'] });
    if (row['contact_country_number']) account.contact = Object.assign(account.contact || {}, { country_number: row['contact_country_number'] });
    if (row['department']) account.department = row['department'];
    if (row['position']) account.position = row['position'];
    if (row['agreement_marketing'] === 'true' || row['agreement_marketing'] === true) account.agreement = { marketing: true };
    if (row['role']) account.role = row['role'].split(',').map(s => s.trim());
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
  const fileInput = document.getElementById('excelFileDeleteInput');
  if (!fileInput.files || !fileInput.files.length) return alert('파일 선택');
  if (button) showLoading(button);
  const reader = new FileReader();
  reader.onload = e => {
    let wb;
    try { wb = XLSX.read(e.target.result, { type: 'binary' }); }
    catch (err) { alert('파싱 오류:' + err); if (button) hideLoading(button); return; }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    validDeleteRows = []; invalidDeleteRows = [];
    rows.forEach((row, i) => {
      if (row['id'] || row['account_id']) validDeleteRows.push(row);
      else invalidDeleteRows.push({ rowNumber: i + 2 });
    });
    let s = `검증 완료 삭제\n총:${rows.length} 유효:${validDeleteRows.length} 오류:${invalidDeleteRows.length}\n`;
    if (invalidDeleteRows.length) s += '오류 행 번호:\n' + invalidDeleteRows.map(x => `행 ${x.rowNumber}`).join('\n');
    document.getElementById('excelDeleteResult').innerText = s;
    document.getElementById('excelDeleteExecuteSection').style.display = validDeleteRows.length > 0 ? 'block' : 'none';
    if (button) hideLoading(button);
  };
  reader.onerror = err => { alert('읽기 오류:' + err); if (button) hideLoading(button); };
  reader.readAsBinaryString(fileInput.files[0]);
}

function executeExcelMemberDeletion(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }
  const baseUrl = getMemberBaseUrl();
  const mailOpt = $('input[name="mailOptionDeleteExcel"]:checked').val();

  Promise.all(validDeleteRows.map(row => {
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
let validUpdateRows = [], invalidUpdateRows = [];
function validateExcelFileForUpdate(button) {
  const fileInput = document.getElementById('excelFileUpdateInput');
  if (!fileInput.files || !fileInput.files.length) return alert('파일 선택');
  if (button) showLoading(button);
  const reader = new FileReader();
  reader.onload = e => {
    let wb;
    try { wb = XLSX.read(e.target.result, { type: 'binary' }); }
    catch (err) { alert('파싱 오류:' + err); if (button) hideLoading(button); return; }
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    validUpdateRows = []; invalidUpdateRows = [];
    rows.forEach((row, i) => {
      const hasField = row['name'] || row['enabled'] || row['contact_number'] || row['contact_tel'] || row['department'] || row['position'] || row['role'];
      if (row['id'] && hasField) validUpdateRows.push(row);
      else invalidUpdateRows.push({ rowNumber: i + 2 });
    });
    let s = `검증 완료 수정\n총:${rows.length} 유효:${validUpdateRows.length} 오류:${invalidUpdateRows.length}\n`;
    if (invalidUpdateRows.length) s += '오류 행 번호:\n' + invalidUpdateRows.map(x => `행 ${x.rowNumber}`).join('\n');
    document.getElementById('excelUpdateResult').innerText = s;
    document.getElementById('excelUpdateExecuteSection').style.display = validUpdateRows.length > 0 ? 'block' : 'none';
    if (button) hideLoading(button);
  };
  reader.onerror = err => { alert('읽기 오류:' + err); if (button) hideLoading(button); };
  reader.readAsBinaryString(fileInput.files[0]);
}

function executeExcelMemberUpdate(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token 발급해주세요.'); }
  const baseUrl = getMemberBaseUrl();

  Promise.all(validUpdateRows.map(row => {
    const id = row['id'] || '';
    let updateObj = { id };
    if (row['name']) updateObj.name = row['name'];
    if (row['enabled']) updateObj.enabled = (row['enabled'].toString().toLowerCase() === 'true');
    if (row['contact_number']) updateObj.contact = Object.assign(updateObj.contact || {}, { number: row['contact_number'] });
    if (row['contact_tel']) updateObj.contact = Object.assign(updateObj.contact || {}, { tel: row['contact_tel'] });
    if (row['department']) updateObj.department = row['department'];
    if (row['position']) updateObj.position = row['position'];
    if (row['role']) updateObj.role = row['role'].split(',').map(s => s.trim());
    return fetch(`${baseUrl}/${encodeURIComponent(id)}`, {
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
  const fileInput = document.getElementById('excelGroupFileInput');
  if (!fileInput.files || !fileInput.files.length) return alert('엑셀 파일을 선택해주세요.');
  if (button) showLoading(button);
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, { type: 'binary' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    validGroupRows = []; invalidGroupRows = [];
    rows.forEach((row, idx) => {
      if (row.name && row.members) validGroupRows.push(row);
      else invalidGroupRows.push(idx + 2);
    });
    let msg = `검증 완료\n총 행: ${rows.length}\n유효 행: ${validGroupRows.length}\n오류 행: ${invalidGroupRows.length}`;
    if (invalidGroupRows.length) msg += '\n오류 행 번호: ' + invalidGroupRows.join(', ');
    document.getElementById('excelGroupResult').innerText = msg;
    document.getElementById('excelGroupExecuteSection').style.display = validGroupRows.length ? 'block' : 'none';
    if (button) hideLoading(button);
  };
  reader.readAsBinaryString(fileInput.files[0]);
}

function executeExcelGroupAddition(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }
  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  Promise.all(validGroupRows.map(row => {
    const members = row.members.split(',').map(s => s.trim());
    return fetch(baseUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ group: { name: row.name, description: row.description || '', members } }),
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
let validGroupDeleteRows = [], invalidGroupDeleteRows = [];
function validateExcelGroupDeleteFile(button) {
  const input = document.getElementById('excelGroupDeleteFileInput');
  if (!input.files.length) return alert('파일을 선택해주세요.');
  if (button) showLoading(button);
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, { type: 'binary' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    validGroupDeleteRows = []; invalidGroupDeleteRows = [];
    rows.forEach((r, i) => {
      if (r.group_ids) validGroupDeleteRows.push(r.group_ids.split(',').map(s => s.trim()).filter(s => s));
      else invalidGroupDeleteRows.push(i + 2);
    });
    let msg = `검증 완료\n총행:${rows.length} 유효행:${validGroupDeleteRows.length} 오류행:${invalidGroupDeleteRows.length}`;
    if (invalidGroupDeleteRows.length) msg += `\n오류행 번호: ${invalidGroupDeleteRows.join(',')}`;
    $('#excelGroupDeleteResult').text(msg);
    $('#excelGroupDeleteExecuteSection').toggle(validGroupDeleteRows.length > 0);
    if (button) hideLoading(button);
  };
  reader.readAsBinaryString(input.files[0]);
}

function executeExcelGroupDeletion(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }
  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  Promise.all(validGroupDeleteRows.map(ids =>
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
let validGroupUpdateRows = [], invalidGroupUpdateRows = [];
function validateExcelGroupUpdateFile(button) {
  const input = document.getElementById('excelGroupUpdateFileInput');
  if (!input.files.length) return alert('파일을 선택해주세요.');
  if (button) showLoading(button);
  const reader = new FileReader();
  reader.onload = e => {
    const wb = XLSX.read(e.target.result, { type: 'binary' });
    const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
    validGroupUpdateRows = []; invalidGroupUpdateRows = [];
    rows.forEach((r, i) => {
      if (r.group_id && r.name && r.members) {
        validGroupUpdateRows.push({ group_id: r.group_id, name: r.name, description: r.description || '', members: r.members.split(',').map(s => s.trim()) });
      } else {
        invalidGroupUpdateRows.push(i + 2);
      }
    });
    let msg = `검증 완료\n총:${rows.length} 유효:${validGroupUpdateRows.length} 오류:${invalidGroupUpdateRows.length}`;
    if (invalidGroupUpdateRows.length) msg += `\n오류행:${invalidGroupUpdateRows.join(',')}`;
    $('#excelGroupUpdateResult').text(msg);
    $('#excelGroupUpdateExecuteSection').toggle(validGroupUpdateRows.length > 0);
    if (button) hideLoading(button);
  };
  reader.readAsBinaryString(input.files[0]);
}

function executeExcelGroupUpdate(button) {
  showLoading(button);
  const token = $('#accessToken').val().trim();
  if (!token) { hideLoading(button); return alert('먼저 Access Token을 발급받아주세요.'); }
  const baseUrl = getGroupBaseUrl();
  if (!baseUrl.startsWith('http')) { hideLoading(button); return alert('사용자 지정 Base URL을 입력해주세요.'); }

  Promise.all(validGroupUpdateRows.map(r =>
    fetch(`${baseUrl}/${encodeURIComponent(r.group_id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ group: { name: r.name, description: r.description, members: r.members } }),
    })
      .then(res => { if (!res.ok) return res.text().then(t => { throw new Error(t || `HTTP ${res.status}`); }); return res.json(); })
      .then(json => ({ success: true, row: r, response: json }))
      .catch(err => ({ success: false, row: r, error: err.toString() }))
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
