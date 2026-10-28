/**
 * P0b-12 — 운영 스크립트 안전장치
 * - create-admin: 기존 계정이면 잠금 해제·must_change 처리·refresh 토큰 폐기
 * - seed-developer-notes: 기존 노트가 있으면 --force 없이는 아무것도 바꾸지 않고 중단
 * (DB 없이 sql 목으로 쿼리 텍스트·순서만 검증)
 */
const test = require('node:test');
const assert = require('node:assert/strict');

const { makeSql } = require('./helpers/http-mocks');
const { upsertAdmin } = require('../scripts/create-admin');
const { seedNotes } = require('../scripts/seed-developer-notes');

const ADMIN_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const silent = () => {};

test('create-admin: 신규 계정이면 INSERT만 하고 토큰 폐기 쿼리는 실행하지 않는다', async () => {
  const sql = makeSql([
    { match: /INSERT INTO users/, rows: [{ id: ADMIN_ID, username: 'admin', email: 'a@x.test', role: 'admin', created: true }] },
  ]);
  const result = await upsertAdmin(sql, { username: 'admin', email: 'a@x.test', passwordHash: 'DUMMY-hash' });
  assert.equal(result.created, true);
  assert.equal(result.revokedTokens, 0);
  assert.equal(sql.calls.length, 1);
});

test('create-admin: 기존 계정이면 잠금·실패 카운트·must_change를 재설정하고 활성 refresh 토큰을 모두 폐기한다', async () => {
  const sql = makeSql([
    { match: /INSERT INTO users/, rows: [{ id: ADMIN_ID, username: 'admin', email: 'a@x.test', role: 'admin', created: false }] },
    { match: /UPDATE refresh_tokens/, rows: [{ id: 'r1' }, { id: 'r2' }] },
  ]);
  const result = await upsertAdmin(sql, { username: 'admin', email: 'a@x.test', passwordHash: 'DUMMY-hash' });

  const upsert = sql.calls[0].text;
  assert.match(upsert, /ON CONFLICT \(username\) DO UPDATE/);
  assert.match(upsert, /failed_login_count\s*=\s*0/);
  assert.match(upsert, /locked_until\s*=\s*NULL/);
  assert.match(upsert, /is_active\s*=\s*true/);
  assert.match(upsert, /must_change_password = EXCLUDED\.must_change_password/);
  assert.equal(sql.calls[0].values.includes(false), true, '기본은 must_change_password=false');

  const revoke = sql.calls[1];
  assert.match(revoke.text, /SET revoked_at = now\(\)/);
  assert.doesNotMatch(revoke.text, /replaced_by/, 'replaced_by 없이 폐기해야 grace 재인증이 막힌다');
  assert.match(revoke.text, /revoked_at IS NULL/);
  assert.deepEqual(revoke.values, [ADMIN_ID]);
  assert.equal(result.created, false);
  assert.equal(result.revokedTokens, 2);
});

test('create-admin: --must-change 옵션이면 must_change_password=true로 기록', async () => {
  const sql = makeSql([
    { match: /INSERT INTO users/, rows: [{ id: ADMIN_ID, created: false }] },
  ]);
  await upsertAdmin(sql, { username: 'admin', email: 'a@x.test', passwordHash: 'DUMMY-hash', mustChangePassword: true });
  assert.equal(sql.calls[0].values.includes(true), true);
});

const NOTES = [
  { title: 't1', content: 'c1', version: 'v1', pinned: false, created_at: '2026-01-01' },
  { title: 't2', content: 'c2', version: 'v2', pinned: true, created_at: '2026-02-01' },
];

test('seed-developer-notes: 기존 노트가 있으면 --force 없이는 DELETE·INSERT 없이 중단', async () => {
  const sql = makeSql([
    { match: /FROM users/, rows: [{ id: ADMIN_ID, username: 'admin' }] },
    { match: /COUNT\(\*\)/, rows: [{ cnt: 7 }] },
  ]);
  const result = await seedNotes(sql, { notes: NOTES, log: silent });
  assert.equal(result.status, 'aborted');
  assert.equal(result.existing, 7);
  assert.equal(sql.calls.some((c) => /DELETE|INSERT/.test(c.text)), false);
});

test('seed-developer-notes: --force면 기존 노트 삭제 후 재삽입', async () => {
  const sql = makeSql([
    { match: /FROM users/, rows: [{ id: ADMIN_ID, username: 'admin' }] },
    { match: /COUNT\(\*\)/, rows: [{ cnt: 7 }] },
  ]);
  const result = await seedNotes(sql, { notes: NOTES, force: true, log: silent });
  assert.equal(result.status, 'seeded');
  assert.equal(result.deleted, 7);
  assert.equal(result.inserted, 2);
  assert.equal(sql.calls.filter((c) => /DELETE FROM developer_notes/.test(c.text)).length, 1);
});

test('seed-developer-notes: 빈 테이블이면 --force 없이도 삽입하고 DELETE는 하지 않는다', async () => {
  const sql = makeSql([
    { match: /FROM users/, rows: [{ id: ADMIN_ID, username: 'admin' }] },
    { match: /COUNT\(\*\)/, rows: [{ cnt: 0 }] },
  ]);
  const result = await seedNotes(sql, { notes: NOTES, log: silent });
  assert.equal(result.status, 'seeded');
  assert.equal(result.inserted, 2);
  assert.equal(sql.calls.some((c) => /DELETE/.test(c.text)), false);
});

test('seed-developer-notes: admin 계정이 없으면 예외', async () => {
  const sql = makeSql([]);
  await assert.rejects(seedNotes(sql, { notes: NOTES, log: silent }), /admin 계정/);
});
