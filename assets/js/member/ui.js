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
  $('#urlDisplay').html(`Access Token URL: ${tokenUrl}<br>멤버 API URL: ${memberUrl}`);
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
