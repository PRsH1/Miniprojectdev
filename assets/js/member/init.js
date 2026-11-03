// assets/js/member/init.js
// 이벤트 바인딩, 초기화, showSection() 정의
// api.js + ui.js 이후에 로드됨

'use strict';

// 기존 코드와 호환: showSection()은 전역 함수로 노출
function showSection(id) {
  renderSection(id);
  syncSidebarActive(id);
}

$(document).ready(function () {
  // 초기 URL 표시
  updateUrlDisplay();
  updateTokenStatus('', $('#envSelection').val());

  // 환경 선택 변경
  $('#envSelection').on('change', function () {
    if (this.value === 'custom') $('#customEnvUrlField').slideDown();
    else $('#customEnvUrlField').slideUp();
    updateUrlDisplay();
  });
  $('#customEnvUrl').on('input', updateUrlDisplay);

  // secretKey 방식 토글
  $('input[name="secretKeyMethod"]').on('change', function () {
    // 라벨 문구만 바꾸고 필수(*) 표시는 유지한다
    const $star = $('<span class="required">*</span>');
    if (this.value === 'signature') {
      $('#secretKeyLabel').empty().append(document.createTextNode('비밀 키 (Secret key, Hex) '), $star);
      $('#privateKeyHex').attr('placeholder', '예: 30... (Signature 방식)');
    } else {
      $('#secretKeyLabel').empty().append(document.createTextNode('비밀 토큰 '), $star);
      $('#privateKeyHex').attr('placeholder', '예: test (Bearer token 방식)');
    }
  });

  // 추가 옵션 토글
  $('#toggleOptionalBtn').on('click', function () {
    $('#optionalFields').slideToggle();
    $(this).text($(this).text() === '추가 옵션 보기' ? '추가 옵션 숨기기' : '추가 옵션 보기');
  });

  // 엑셀 업로드 토글 (멤버 추가)
  $('#toggleExcelUploadBtn').on('click', function () {
    $('#excelUploadSection').slideToggle();
    $(this).text($(this).text() === '엑셀 파일 업로드 보기' ? '엑셀 파일 업로드 숨기기' : '엑셀 파일 업로드 보기');
  });

  // 엑셀 업로드 토글 (멤버 삭제)
  $('#toggleExcelDeleteUploadBtn').on('click', function () {
    $('#excelDeleteUploadSection').slideToggle();
    $(this).text($(this).text() === '엑셀 파일 업로드 보기 (삭제)' ? '엑셀 파일 업로드 숨기기 (삭제)' : '엑셀 파일 업로드 보기 (삭제)');
  });

  // 엑셀 업로드 토글 (멤버 수정)
  $('#toggleExcelUpdateUploadBtn').on('click', function () {
    $('#excelUpdateUploadSection').slideToggle();
    $(this).text($(this).text() === '엑셀 파일 업로드 보기 (수정)' ? '엑셀 파일 업로드 숨기기 (수정)' : '엑셀 파일 업로드 보기 (수정)');
  });

  // 엑셀 업로드 토글 (그룹 추가)
  $('#toggleGroupExcelBtn').on('click', function () {
    $('#excelGroupUploadSection').slideToggle();
    const showing = $('#excelGroupUploadSection').is(':visible');
    $(this).text(showing ? '엑셀 업로드 숨기기' : '엑셀 업로드 보기');
  });

  // 엑셀 업로드 토글 (그룹 수정)
  $('#toggleGroupUpdateExcelBtn').on('click', function () {
    $('#excelGroupUpdateSection').slideToggle();
    const showing = $('#excelGroupUpdateSection').is(':visible');
    $(this).text(showing ? '엑셀 업로드 숨기기 (수정)' : '엑셀 업로드 보기 (수정)');
  });

  // 엑셀 업로드 토글 (그룹 삭제)
  $('#toggleGroupExcelDeleteBtn').on('click', function () {
    $('#excelGroupDeleteSection').slideToggle();
    const showing = $('#excelGroupDeleteSection').is(':visible');
    $(this).text(showing ? '엑셀 업로드 숨기기 (삭제)' : '엑셀 업로드 보기 (삭제)');
  });

  // updateMemberId 자동 복사
  $('#updateMemberId').on('change', function () {
    $('#updateAccountId').val($(this).val().trim());
  });

  // 엑셀 파일 선택 시 upload-area 레이블 업데이트
  const fileInputIds = [
    'excelFileInput', 'excelFileDeleteInput', 'excelFileUpdateInput',
    'excelGroupFileInput', 'excelGroupUpdateFileInput', 'excelGroupDeleteFileInput'
  ];
  fileInputIds.forEach(function (id) {
    $('#' + id).on('change', function () {
      const label = $(this).closest('.upload-area');
      const $input = $(this).detach(); // label.html() 전에 분리해야 DOM에서 파괴되지 않음
      const iconHtml = '<span style="display:block;font-size:20px;margin-bottom:6px;"><i class="fa-solid fa-file-excel"></i></span>';
      if (this.files && this.files.length) {
        // 파일명은 사용자 환경에서 온 문자열이므로 텍스트로만 삽입
        label.html(iconHtml).append($('<strong>').text(this.files[0].name));
        label.css({ borderColor: 'var(--primary)', background: '#f0f6ff', color: 'var(--primary)' });
      } else {
        label.html(iconHtml + '클릭하여 엑셀 파일 선택 (.xlsx, .xls)');
        label.css({ borderColor: '', background: '', color: '' });
      }
      label.append($input); // 원본 input 요소(id, 파일 선택 상태 포함) 복원
    });
  });

  // 그룹 목록 토글 버튼
  $('#toggleIncludeMember').on('click', function () {
    $(this).toggleClass('on off').text($(this).hasClass('on') ? 'ON' : 'OFF');
  });
  $('#toggleIncludeField').on('click', function () {
    $(this).toggleClass('on off').text($(this).hasClass('on') ? 'ON' : 'OFF');
  });

  // 멤버 검색 — 300ms 디바운스 후 API 재호출
  let _memberSearchTimer = null;
  $('#memberSearchInput').on('input', function () {
    clearTimeout(_memberSearchTimer);
    _memberSearchTimer = setTimeout(() => {
      const token = $('#accessToken').val().trim();
      if (!token) return;
      listMembers(_memberCurrentView);
    }, 300);
  });

  $('#includeDeleted').on('change', function () {
    const token = $('#accessToken').val().trim();
    if (!token) return;
    listMembers(_memberCurrentView);
  });

  // 사이드바 메뉴 클릭
  // 좁은 화면(드로어)에서는 메뉴를 고르면 드로어를 닫는다 (P1-19)
  function closeMobileSidebar() {
    $('.sidebar').removeClass('open');
    $('#sidebarBackdrop').removeClass('open');
  }

  $('.sidebar-menu-item').on('click', function () {
    const sec = $(this).data('section');
    if (sec) showSection(sec);
    closeMobileSidebar();
  });

  // 토큰 섹션 사이드바 버튼
  $('#sbTokenBtn').on('click', function () {
    showSection('tokenSection');
    closeMobileSidebar();
  });

  // 세션 만료 시 입력 보존 훅 (P1-21 — auth-status.js가 읽는다)
  // 입력 중인 값이 있거나 엑셀 일괄 처리가 진행 중이면 true → 자동 새로고침 대신 배너로 안내된다
  window.AUTH_STATUS_HAS_UNSAVED = function () {
    if (typeof isBulkRunning === 'function' && isBulkRunning()) return true;
    return $('.main-panel').find('input, textarea').toArray().some(function (el) {
      if (el.readOnly || el.disabled) return false;
      if (el.type === 'file') return !!(el.files && el.files.length);
      if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'hidden') return false;
      return el.value.trim() !== '' && el.value !== el.defaultValue;
    });
  };

  // 초기 섹션
  showSection('memberAddSection');
});
