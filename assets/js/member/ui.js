// assets/js/member/ui.js
// 렌더링 함수 전담 — 이벤트 리스너는 등록하지 않음
// api.js 이후에 로드됨

'use strict';

// URL 표시 업데이트
function updateUrlDisplay() {
  const env = $('#envSelection').val();
  const tokenUrlMap = {
    op_saas: 'https://kr-api.eformsign.com/v2.0/api_auth/access_token',
    csap:    'https://www.gov-eformsign.com/Service/v2.0/api_auth/access_token',
  };
  const memberUrlMap = {
    op_saas: 'https://kr-api.eformsign.com/v2.0/api/members',
    csap:    'https://www.gov-eformsign.com/Service/v2.0/api/members',
  };
  let tokenUrl, memberUrl;
  if (env === 'custom') {
    const base = $('#customEnvUrl').val().trim().replace(/\/$/, '');
    tokenUrl  = base ? `${base}/v2.0/api_auth/access_token` : '(Base URL 입력 필요)';
    memberUrl = base ? `${base}/v2.0/api/members` : '(Base URL 입력 필요)';
  } else {
    tokenUrl  = tokenUrlMap[env];
    memberUrl = memberUrlMap[env];
  }
  // 사용자 입력 URL이 섞이므로 텍스트 노드 + <br>로 조립 (XSS 방지)
  $('#urlDisplay').empty().append(
    document.createTextNode(`Access Token URL: ${tokenUrl}`),
    $('<br>'),
    document.createTextNode(`멤버 API URL: ${memberUrl}`)
  );
}

// 사이드바 활성 메뉴 동기화
function syncSidebarActive(sectionId) {
  $('.sidebar-menu-item').removeClass('active');
  $(`.sidebar-menu-item[data-section="${sectionId}"]`).addClass('active');
}

// 섹션 전환 (기존 showSection과 동일 — init.js에서 wrapping)
function renderSection(id) {
  ['tokenSection','memberAddSection','memberDeleteSection','memberUpdateSection',
   'memberListSection','groupAddSection','groupListSection','groupDeleteSection','groupUpdateSection']
    .forEach(sec => {
      const el = document.getElementById(sec);
      if (el) el.style.display = 'none';
    });
  const target = document.getElementById(id);
  if (target) target.style.display = 'block';
}

// ─── 토스트 (P1-15) ──────────────────────────────────────
// 전역 showToast가 있으면 credential-panel.js·auth-status.js도 같은 토스트를 쓴다
function showToast(msg, duration) {
  let t = document.getElementById('memberToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'memberToast';
    t.className = 'member-toast';
    t.setAttribute('role', 'status');
    t.setAttribute('aria-live', 'polite');
    document.body.appendChild(t);
  }
  t.textContent = String(msg);   // 외부 문자열이 섞일 수 있으므로 textContent
  t.classList.add('show');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => t.classList.remove('show'), duration || 2000);
}

// 결과 영역 복사 — 성공/실패를 토스트로 알려 준다 (이전에는 피드백 없음)
function copyResultText(elementId) {
  const el = document.getElementById(elementId);
  const text = el ? (el.innerText || el.textContent || '') : '';
  if (!text.trim()) { showToast('복사할 내용이 없습니다.'); return; }
  const done = () => showToast('복사했습니다.');
  const fail = () => showToast('복사하지 못했습니다. 직접 선택해 복사하세요.', 3000);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done, fail);
  } else {
    fail();
  }
}

// ─── 엑셀 일괄 처리 진행 패널 (P1-16) ────────────────────
// 실행 섹션(#excel…ExecuteSection) 안에 진행률 막대·건수·[중지]·[재시도]·[결과 엑셀]을 그린다.
// 상태 계산은 api.js(bulkCounts 등), 여기서는 DOM만 다룬다. 모든 문자열은 textContent.
function _bulkButton(label, cls, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = cls;
  b.textContent = label;
  b.addEventListener('click', onClick);
  return b;
}

function removeBulkPanel(sectionId) {
  const section = document.getElementById(sectionId);
  const panel = section && section.querySelector('.bulk-panel');
  if (panel) panel.remove();
}

function renderBulkPanel(job) {
  const section = document.getElementById(job.cfg.sectionId);
  if (!section) return;
  let panel = section.querySelector('.bulk-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'bulk-panel';
    panel.setAttribute('aria-live', 'polite');
    panel.innerHTML =
      '<div class="bulk-head"><span class="bulk-state"></span><span class="bulk-progress-text"></span></div>' +
      '<div class="bulk-bar" role="progressbar" aria-valuemin="0"><div class="bulk-bar-ok"></div><div class="bulk-bar-fail"></div></div>' +
      '<div class="bulk-stats"></div>' +
      '<div class="bulk-note"></div>' +
      '<div class="bulk-actions"></div>';
    section.appendChild(panel);
  }
  const c = bulkCounts(job);
  const done = c.success + c.fail;
  const pct = n => (c.total ? (n / c.total) * 100 : 0);

  let state, stateCls;
  if (job.running) {
    state = job.stopReason ? '중지 중…' : '진행 중';
    stateCls = 'running';
  } else if (c.skipped) {
    state = `중지됨 (미실행 ${c.skipped}건)`;
    stateCls = 'warn';
  } else if (c.fail) {
    state = `완료 (실패 ${c.fail}건)`;
    stateCls = 'warn';
  } else {
    state = '완료';
    stateCls = 'ok';
  }
  panel.className = 'bulk-panel bulk-' + stateCls;
  panel.querySelector('.bulk-state').textContent = state;
  panel.querySelector('.bulk-progress-text').textContent = `${done} / ${c.total}`;
  const bar = panel.querySelector('.bulk-bar');
  bar.setAttribute('aria-valuemax', String(c.total));
  bar.setAttribute('aria-valuenow', String(done));
  panel.querySelector('.bulk-bar-ok').style.width = pct(c.success) + '%';
  panel.querySelector('.bulk-bar-fail').style.width = pct(c.fail) + '%';
  panel.querySelector('.bulk-stats').textContent =
    `성공 ${c.success} · 실패 ${c.fail} · 미실행 ${c.skipped}` + (job.running ? ` · 대기 ${c.pending + c.running}` : '') + ` · 총 ${c.total}`;
  panel.querySelector('.bulk-note').textContent = job.stopReason || '';

  const actions = panel.querySelector('.bulk-actions');
  actions.textContent = '';
  if (job.running) {
    const stop = _bulkButton('중지', 'btn-secondary bulk-stop', () => stopBulkJob(job.key));
    if (job.stopReason) stop.disabled = true;
    actions.appendChild(stop);
  } else {
    if (c.fail) actions.appendChild(_bulkButton(`실패 건만 재시도 (${c.fail})`, 'btn-secondary', () => retryBulkJob(job.key, 'fail')));
    if (c.skipped) actions.appendChild(_bulkButton(`미실행 건 이어서 실행 (${c.skipped})`, 'btn-secondary', () => retryBulkJob(job.key, 'skipped')));
    actions.appendChild(_bulkButton('결과 엑셀 다운로드', 'btn-teal', () => downloadBulkResult(job.key)));
  }
}

// 비밀 키 표시/숨기기 토글
function toggleSecretVisibility(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const show = input.type === 'password';
  input.type = show ? 'text' : 'password';
  if (button) {
    button.textContent = show ? '숨기기' : '표시';
    button.setAttribute('aria-pressed', show ? 'true' : 'false');
  }
}
