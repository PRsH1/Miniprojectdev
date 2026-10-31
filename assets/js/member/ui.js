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
