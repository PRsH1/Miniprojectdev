// assets/js/csv-export.js (브라우저 IIFE) 단위 테스트 — vm 샌드박스에 최소 window/document만 주입한다
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadCsvExport() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'assets', 'js', 'csv-export.js'), 'utf8');
  const window = {};
  vm.runInNewContext(source, { window, document: {} });
  return window.CsvExport;
}

test('build: 모든 값을 큰따옴표로 감싸고 내부 따옴표는 두 번 쓴다 (CRLF 줄 구분)', () => {
  const csv = loadCsvExport();
  const text = csv.build(['문서 ID', '제목'], [['a1', '계약서 "최종", 1부'], ['a2', '줄\n바꿈']]);
  assert.equal(text, '"문서 ID","제목"\r\n"a1","계약서 ""최종"", 1부"\r\n"a2","줄\n바꿈"\r\n');
});

test('build: 수식으로 해석될 수 있는 값 앞에 작은따옴표를 붙인다 (CSV 수식 주입 방지)', () => {
  const csv = loadCsvExport();
  const text = csv.build(null, [['=SUM(A1)', '+1', '-2', '@cmd', '\tx', '정상']]);
  assert.equal(text, `"'=SUM(A1)","'+1","'-2","'@cmd","'\tx","정상"\r\n`);
});

test('build: null·undefined는 빈 칸, 숫자는 문자열로', () => {
  const csv = loadCsvExport();
  assert.equal(csv.build(['a', 'b', 'c'], [[null, undefined, 3]]), '"a","b","c"\r\n"","","3"\r\n');
});

test('formatDate: epoch ms를 로컬 YYYY-MM-DD HH:mm:ss로, 잘못된 값은 빈 문자열', () => {
  const csv = loadCsvExport();
  const d = new Date(2026, 9, 31, 9, 5, 7).getTime();
  assert.equal(csv.formatDate(d), '2026-10-31 09:05:07');
  assert.equal(csv.formatDate(String(d)), '2026-10-31 09:05:07');
  assert.equal(csv.formatDate(undefined), '');
  assert.equal(csv.formatDate('abc'), '');
  assert.equal(csv.formatDate(0), '');
});

test('BOM 상수는 UTF-8 BOM(U+FEFF)이다', () => {
  const csv = loadCsvExport();
  assert.equal(csv.BOM, '﻿');
});
