/**
 * assets/js/csv-export.js
 * CSV 내보내기 공유 모듈 (IIFE → window.CsvExport) — 의존성 없음(jQuery 불필요)
 *
 * 사용법:
 *   <script src="/assets/js/csv-export.js"></script>
 *
 *   CsvExport.download('listdocuments', ['문서 ID', '제목'], [['abc', '계약서'], ...]);
 *   // → listdocuments_YYYYMMDD_HHmmss.csv (UTF-8 BOM 포함 — Excel에서 한글이 깨지지 않음)
 *
 *   const text = CsvExport.build(headers, rows);   // 문자열만 필요할 때 (BOM 미포함)
 *
 * 규칙:
 *   - 모든 값은 큰따옴표로 감싸고 내부 큰따옴표는 두 번 쓴다(RFC 4180). 줄바꿈 포함 값도 안전하다.
 *   - 외부 문자열(문서 제목·템플릿 이름 등)이 =, +, -, @, 탭, CR로 시작하면 앞에 '를 붙여
 *     Excel이 수식으로 실행하지 않게 한다(CSV 수식 주입 방지).
 *   - 줄 구분은 CRLF (Excel 호환).
 */
(function (window, document) {
    'use strict';

    var BOM = '﻿';
    var FORMULA_PREFIX = /^[=+\-@\t\r]/;

    function pad(n) { return n < 10 ? '0' + n : String(n); }

    // YYYYMMDD_HHmmss (로컬 시각) — result-panel.js와 같은 형식
    function timestamp(d) {
        d = d || new Date();
        return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '_' +
            pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
    }

    function cell(value) {
        var text = value === undefined || value === null ? '' : String(value);
        // "-" 한 글자는 빈 값 자리표시자 — 수식이 될 수 없으므로 그대로 둔다 (D-16)
        if (text !== '-' && FORMULA_PREFIX.test(text)) text = "'" + text;
        return '"' + text.replace(/"/g, '""') + '"';
    }

    function build(headers, rows) {
        var lines = [];
        if (headers && headers.length) lines.push(headers.map(cell).join(','));
        (rows || []).forEach(function (row) {
            lines.push((row || []).map(cell).join(','));
        });
        return lines.join('\r\n') + '\r\n';
    }

    function safePrefix(prefix) {
        return String(prefix || 'export').replace(/[\\/:*?"<>|\s]+/g, '_');
    }

    /**
     * CSV 파일 다운로드. filenamePrefix 뒤에 _YYYYMMDD_HHmmss.csv를 붙인다.
     * @returns {string} 실제 파일명
     */
    function download(filenamePrefix, headers, rows) {
        var filename = safePrefix(filenamePrefix) + '_' + timestamp() + '.csv';
        var blob = new Blob([BOM + build(headers, rows)], { type: 'text/csv;charset=utf-8' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 0);
        return filename;
    }

    /** epoch ms → 'YYYY-MM-DD HH:mm:ss' (로컬 시각). 숫자가 아니면 빈 문자열 */
    function formatDate(value) {
        var n = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
        if (typeof n !== 'number' || !isFinite(n) || n <= 0) return '';
        var d = new Date(n);
        if (isNaN(d.getTime())) return '';
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
            pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
    }

    window.CsvExport = {
        build: build,
        download: download,
        formatDate: formatDate,
        timestamp: timestamp,
        BOM: BOM
    };
})(window, document);
