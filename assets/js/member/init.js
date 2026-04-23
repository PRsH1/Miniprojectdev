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
    if (this.value === 'signature') {
      $('#secretKeyLabel').text('비밀 키 (Secret key, Hex):');
      $('#privateKeyHex').attr('placeholder', '예: 30... (Signature 방식)');
    } else {
      $('#secretKeyLabel').text('비밀 토큰:');
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
      const iconHtml = '<span style="display:block;font-size:20px;margin-bottom:6px;"><i class="fa-solid fa-file-excel"></i></span>';
      if (this.files && this.files.length) {
        label.html(iconHtml + '<strong>' + this.files[0].name + '</strong>');
        label.css({ borderColor: 'var(--primary)', background: '#f0f6ff', color: 'var(--primary)' });
      } else {
        label.html(iconHtml + '클릭하여 엑셀 파일 선택 (.xlsx, .xls)');
        label.css({ borderColor: '', background: '', color: '' });
      }
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
  $('.sidebar-menu-item').on('click', function () {
    const sec = $(this).data('section');
    if (sec) showSection(sec);
  });

  // 토큰 섹션 사이드바 버튼
  $('#sbTokenBtn').on('click', function () {
    showSection('tokenSection');
  });

  // 초기 섹션
  showSection('memberAddSection');
});
