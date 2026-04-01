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

  // 그룹 목록 토글 버튼
  $('#toggleIncludeMember').on('click', function () {
    $(this).toggleClass('on off').text($(this).hasClass('on') ? 'ON' : 'OFF');
  });
  $('#toggleIncludeField').on('click', function () {
    $(this).toggleClass('on off').text($(this).hasClass('on') ? 'ON' : 'OFF');
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
