/**
 * controllers/adminIpWhitelist.js
 * 관리자 IP 화이트리스트 관리 API
 *
 * GET    /api/admin/ip-whitelist              → { master_enabled, scopes, rules }
 * POST   /api/admin/ip-whitelist/rules        → 규칙 추가
 * PATCH  /api/admin/ip-whitelist/rules/:id    → 규칙 수정
 * DELETE /api/admin/ip-whitelist/rules/:id    → 규칙 삭제
 * PUT    /api/admin/ip-whitelist/scopes/:id   → 스코프 활성화/비활성화
 * POST   /api/admin/ip-whitelist/scopes       → path 스코프 추가
 * DELETE /api/admin/ip-whitelist/scopes/:id   → path 스코프 삭제
 * POST   /api/admin/ip-whitelist/test         → IP 허용 여부 테스트
 */

const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const { respondError } = require('./_shared/respond-error');
const { requireRole } = require('./_shared/session');
const { requireUuid } = require('./_shared/validate');
const { invalidateCache, isIpWhitelistEnabled } = require('./_shared/ip-whitelist');
// 규칙 검증·테스트 매칭도 실제 차단 로직과 같은 구현을 쓴다 (P0b-03 — IPv4/IPv6 CIDR)
const { isIpInCidr, isValidIpCidr: isValidCidrText, matchesPathPattern } = require('../lib/ip-match');

function isValidIpCidr(value) {
  // ip_cidr 컬럼은 VARCHAR(50). 앞뒤 공백도 저장되므로 원문 그대로 형식을 검사한다
  return typeof value === 'string' && value.length <= 50 && value === value.trim() && isValidCidrText(value);
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const decoded = await requireRole(req, res, 'admin');
  if (!decoded) return;

  const rawPath = req.url.split('?')[0];
  const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
  const sql = getDb();

  // GET /api/admin/ip-whitelist
  if (req.method === 'GET' && rawPath === '/api/admin/ip-whitelist') {
    const [scopes, rules] = await Promise.all([
      sql`SELECT id, scope_type, scope_path, label, is_enabled, created_at FROM ip_whitelist_scopes ORDER BY scope_type, created_at`,
      sql`SELECT id, label, ip_cidr, scope_type, scope_path, is_active, created_at FROM ip_whitelist ORDER BY scope_type, created_at`,
    ]);
    return res.status(200).json({ master_enabled: isIpWhitelistEnabled(), scopes, rules });
  }

  // POST /api/admin/ip-whitelist/rules
  if (req.method === 'POST' && rawPath === '/api/admin/ip-whitelist/rules') {
    const body = req.body || {};
    const { label, ip_cidr, scope_type, scope_path } = body;

    if (!label || !ip_cidr || !scope_type) {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: 'label, ip_cidr, scope_type는 필수입니다.', reason: '규칙 추가에 필요한 값이 누락되었습니다.', action: '필수 항목을 모두 입력한 뒤 다시 시도하세요.' });
    }
    if (!['global', 'path', 'protected'].includes(scope_type)) {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: '유효하지 않은 scope_type입니다.', reason: 'scope_type은 global, path, protected 중 하나여야 합니다.', action: '올바른 스코프 타입을 선택하세요.' });
    }
    if (scope_type === 'path' && !scope_path) {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: 'path 스코프에는 scope_path가 필수입니다.', reason: 'scope_type이 path인 경우 경로 패턴을 지정해야 합니다.', action: 'scope_path를 입력하세요.' });
    }
    if (!isValidIpCidr(ip_cidr)) {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: '유효하지 않은 IP/CIDR 형식입니다.', reason: 'IPv4·IPv6 단일 주소(예: 1.2.3.4, 2001:db8::1) 또는 CIDR 표기법(예: 192.168.0.0/24, 2001:db8::/32) 형식이어야 합니다.', action: '올바른 IP 주소 또는 CIDR 범위를 입력하세요.' });
    }

    const rows = await sql`
      INSERT INTO ip_whitelist (label, ip_cidr, scope_type, scope_path)
      VALUES (${label}, ${ip_cidr}, ${scope_type}, ${scope_path || null})
      RETURNING *
    `;
    invalidateCache();
    await insertAuditLog({ userId: decoded.sub, action: 'ip_whitelist_rule_added', target: ip_cidr, ipAddress: clientIp, result: 'success', metadata: { label, scope_type, scope_path } });
    return res.status(201).json({ rule: rows[0] });
  }

  // PATCH /api/admin/ip-whitelist/rules/:id
  const rulesPatchMatch = rawPath.match(/^\/api\/admin\/ip-whitelist\/rules\/([^/]+)$/);
  if (req.method === 'PATCH' && rulesPatchMatch) {
    const ruleId = rulesPatchMatch[1];
    if (!requireUuid(req, res, ruleId, '규칙 ID')) return undefined;
    const body = req.body || {};
    const updates = [];
    const values = [];

    if (body.label !== undefined) { updates.push('label'); values.push(body.label); }
    if (body.ip_cidr !== undefined) {
      if (!isValidIpCidr(body.ip_cidr)) {
        return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: '유효하지 않은 IP/CIDR 형식입니다.', reason: 'IPv4·IPv6 단일 주소 또는 CIDR 표기법 형식이어야 합니다.', action: '올바른 IP 주소 또는 CIDR 범위를 입력하세요.' });
      }
      updates.push('ip_cidr'); values.push(body.ip_cidr);
    }
    if (body.is_active !== undefined) { updates.push('is_active'); values.push(body.is_active); }

    if (updates.length === 0) {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: '수정할 필드가 없습니다.', reason: 'label, ip_cidr, is_active 중 하나 이상을 제공하세요.', action: '수정할 항목을 입력하세요.' });
    }

    const existing = await sql`SELECT id FROM ip_whitelist WHERE id = ${ruleId}`;
    if (!existing.length) {
      return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '규칙을 찾을 수 없습니다.', reason: '수정 대상 규칙이 존재하지 않습니다.', action: '목록을 새로고침한 뒤 다시 시도하세요.' });
    }

    if (updates.includes('label') || updates.includes('ip_cidr')) {
      const label = values[updates.indexOf('label')] ?? undefined;
      const ip_cidr = values[updates.indexOf('ip_cidr')] ?? undefined;
      if (label !== undefined && ip_cidr !== undefined) {
        await sql`UPDATE ip_whitelist SET label = ${label}, ip_cidr = ${ip_cidr}, updated_at = now() WHERE id = ${ruleId}`;
      } else if (label !== undefined) {
        await sql`UPDATE ip_whitelist SET label = ${label}, updated_at = now() WHERE id = ${ruleId}`;
      } else if (ip_cidr !== undefined) {
        await sql`UPDATE ip_whitelist SET ip_cidr = ${ip_cidr}, updated_at = now() WHERE id = ${ruleId}`;
      }
    }
    if (updates.includes('is_active')) {
      const is_active = values[updates.indexOf('is_active')];
      await sql`UPDATE ip_whitelist SET is_active = ${is_active}, updated_at = now() WHERE id = ${ruleId}`;
    }

    invalidateCache();
    await insertAuditLog({ userId: decoded.sub, action: 'ip_whitelist_rule_updated', target: ruleId, ipAddress: clientIp, result: 'success', metadata: Object.fromEntries(updates.map((k, i) => [k, values[i]])) });
    return res.status(200).json({ ok: true });
  }

  // DELETE /api/admin/ip-whitelist/rules/:id
  const rulesDeleteMatch = rawPath.match(/^\/api\/admin\/ip-whitelist\/rules\/([^/]+)$/);
  if (req.method === 'DELETE' && rulesDeleteMatch) {
    const ruleId = rulesDeleteMatch[1];
    if (!requireUuid(req, res, ruleId, '규칙 ID')) return undefined;
    const rows = await sql`DELETE FROM ip_whitelist WHERE id = ${ruleId} RETURNING ip_cidr`;
    if (!rows.length) {
      return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '규칙을 찾을 수 없습니다.', reason: '삭제 대상 규칙이 존재하지 않습니다.', action: '목록을 새로고침한 뒤 다시 시도하세요.' });
    }
    invalidateCache();
    await insertAuditLog({ userId: decoded.sub, action: 'ip_whitelist_rule_deleted', target: rows[0].ip_cidr, ipAddress: clientIp, result: 'success' });
    return res.status(200).json({ ok: true });
  }

  // PUT /api/admin/ip-whitelist/scopes/:id
  const scopesPutMatch = rawPath.match(/^\/api\/admin\/ip-whitelist\/scopes\/([^/]+)$/);
  if (req.method === 'PUT' && scopesPutMatch) {
    const scopeId = scopesPutMatch[1];
    if (!requireUuid(req, res, scopeId, '스코프 ID')) return undefined;
    const body = req.body || {};
    if (typeof body.is_enabled !== 'boolean') {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: 'is_enabled는 boolean 필수입니다.', reason: '스코프 활성화 여부를 true 또는 false로 지정해야 합니다.', action: 'is_enabled 값을 올바르게 입력하세요.' });
    }
    const existing = await sql`SELECT id, scope_type FROM ip_whitelist_scopes WHERE id = ${scopeId}`;
    if (!existing.length) {
      return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '스코프를 찾을 수 없습니다.', reason: '수정 대상 스코프가 존재하지 않습니다.', action: '목록을 새로고침한 뒤 다시 시도하세요.' });
    }
    await sql`UPDATE ip_whitelist_scopes SET is_enabled = ${body.is_enabled}, updated_at = now() WHERE id = ${scopeId}`;
    invalidateCache();
    await insertAuditLog({ userId: decoded.sub, action: 'ip_whitelist_scope_toggled', target: scopeId, ipAddress: clientIp, result: 'success', metadata: { is_enabled: body.is_enabled, scope_type: existing[0].scope_type } });
    return res.status(200).json({ ok: true });
  }

  // POST /api/admin/ip-whitelist/scopes
  if (req.method === 'POST' && rawPath === '/api/admin/ip-whitelist/scopes') {
    const body = req.body || {};
    const { scope_path, label } = body;
    if (!scope_path || !label) {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: 'scope_path, label은 필수입니다.', reason: '경로 패턴 스코프 추가에 필요한 값이 누락되었습니다.', action: '필수 항목을 모두 입력한 뒤 다시 시도하세요.' });
    }
    const dup = await sql`SELECT id FROM ip_whitelist_scopes WHERE scope_type = 'path' AND scope_path = ${scope_path}`;
    if (dup.length) {
      return respondError(req, res, 409, { code: 'VALIDATION_FAILED', message: '이미 등록된 경로 패턴입니다.', reason: '동일한 scope_path를 가진 스코프가 이미 존재합니다.', action: '다른 경로 패턴을 사용하거나 기존 스코프를 수정하세요.' });
    }
    const rows = await sql`
      INSERT INTO ip_whitelist_scopes (scope_type, scope_path, label, is_enabled)
      VALUES ('path', ${scope_path}, ${label}, false)
      RETURNING *
    `;
    invalidateCache();
    await insertAuditLog({ userId: decoded.sub, action: 'ip_whitelist_scope_added', target: scope_path, ipAddress: clientIp, result: 'success', metadata: { label } });
    return res.status(201).json({ scope: rows[0] });
  }

  // DELETE /api/admin/ip-whitelist/scopes/:id
  const scopesDeleteMatch = rawPath.match(/^\/api\/admin\/ip-whitelist\/scopes\/([^/]+)$/);
  if (req.method === 'DELETE' && scopesDeleteMatch) {
    const scopeId = scopesDeleteMatch[1];
    if (!requireUuid(req, res, scopeId, '스코프 ID')) return undefined;
    const existing = await sql`SELECT id, scope_type, scope_path FROM ip_whitelist_scopes WHERE id = ${scopeId}`;
    if (!existing.length) {
      return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '스코프를 찾을 수 없습니다.', reason: '삭제 대상 스코프가 존재하지 않습니다.', action: '목록을 새로고침한 뒤 다시 시도하세요.' });
    }
    const scope = existing[0];
    if (scope.scope_type !== 'path') {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: 'global/protected 스코프는 삭제할 수 없습니다.', reason: '기본 스코프(global, protected)는 삭제 보호됩니다.', action: '비활성화만 가능합니다.' });
    }
    // 해당 스코프의 규칙도 함께 삭제
    await sql`DELETE FROM ip_whitelist WHERE scope_type = 'path' AND scope_path = ${scope.scope_path}`;
    await sql`DELETE FROM ip_whitelist_scopes WHERE id = ${scopeId}`;
    invalidateCache();
    await insertAuditLog({ userId: decoded.sub, action: 'ip_whitelist_scope_deleted', target: scope.scope_path, ipAddress: clientIp, result: 'success' });
    return res.status(200).json({ ok: true });
  }

  // POST /api/admin/ip-whitelist/test
  if (req.method === 'POST' && rawPath === '/api/admin/ip-whitelist/test') {
    const body = req.body || {};
    const { ip, path: testPath } = body;
    if (!ip || typeof ip !== 'string') {
      return respondError(req, res, 400, { code: 'VALIDATION_FAILED', message: 'ip는 필수입니다.', reason: '테스트할 IP 주소가 누락되었습니다.', action: 'ip 값을 입력하세요.' });
    }

    // 테스트용: 캐시 무효화 후 fresh 데이터로 체크
    invalidateCache();

    const [globalCheck, pathCheck, protectedCheck] = await Promise.all([
      (async () => {
        const { getDb } = require('./_shared/db');
        const sql = getDb();
        const [scopes, rules] = await Promise.all([
          sql`SELECT * FROM ip_whitelist_scopes WHERE scope_type = 'global'`,
          sql`SELECT * FROM ip_whitelist WHERE scope_type = 'global' AND is_active = TRUE`,
        ]);
        const scope = scopes[0];
        if (!scope?.is_enabled) return { enabled: false, matched: false, allowed: true };
        const matched = rules.some(r => isIpInCidr(ip, r.ip_cidr));
        return { enabled: true, matched, allowed: matched };
      })(),
      (async () => {
        if (!testPath) return { enabled: false, matched: false, allowed: true };
        const { getDb } = require('./_shared/db');
        const sql = getDb();
        const [scopes, rules] = await Promise.all([
          sql`SELECT * FROM ip_whitelist_scopes WHERE scope_type = 'path' AND is_enabled = TRUE`,
          sql`SELECT * FROM ip_whitelist WHERE scope_type = 'path' AND is_active = TRUE`,
        ]);
        const matchedScopes = scopes.filter(s => matchesPathPattern(String(testPath), s.scope_path));
        if (!matchedScopes.length) return { enabled: scopes.length > 0, matched: false, allowed: true };
        const scopePaths = new Set(matchedScopes.map(s => s.scope_path));
        const scopeRules = rules.filter(r => scopePaths.has(r.scope_path));
        const allowed = scopeRules.some(r => isIpInCidr(ip, r.ip_cidr));
        return { enabled: true, matched: true, allowed };
      })(),
      (async () => {
        const { getDb } = require('./_shared/db');
        const sql = getDb();
        const [scopes, rules] = await Promise.all([
          sql`SELECT * FROM ip_whitelist_scopes WHERE scope_type = 'protected'`,
          sql`SELECT * FROM ip_whitelist WHERE scope_type = 'protected' AND is_active = TRUE`,
        ]);
        const scope = scopes[0];
        if (!scope?.is_enabled) return { enabled: false, matched: false, allowed: true };
        const matched = rules.some(r => isIpInCidr(ip, r.ip_cidr));
        return { enabled: true, matched, allowed: matched };
      })(),
    ]);

    const allowed = globalCheck.allowed && pathCheck.allowed && protectedCheck.allowed;
    return res.status(200).json({
      allowed,
      detail: { global: globalCheck, path: pathCheck, protected: protectedCheck },
    });
  }

  return respondError(req, res, 404, { code: 'RESOURCE_NOT_FOUND', message: '요청한 IP 화이트리스트 API를 찾을 수 없습니다.', reason: '등록되지 않은 하위 경로입니다.', action: '올바른 경로인지 확인하세요.' });
};
