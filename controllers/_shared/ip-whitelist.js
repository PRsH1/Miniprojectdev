/**
 * controllers/_shared/ip-whitelist.js
 * IP 화이트리스트 체크 공통 모듈
 *
 * - 서버리스 warm instance에서 모듈 캐시 재사용 (60초 TTL)
 * - DB 오류 시 fail-open (차단하지 않음)
 * - IPv4·IPv6 모두 지원 (IPv4-mapped IPv6는 IPv4로 취급), 해석 불가 IP는 어떤 규칙과도 불일치
 * - 경로 패턴은 정규화 후 비교 ('/api/login' 규칙은 '/api/login/'·'/API//login'·하위 경로까지 포함)
 */

const { getDb } = require('./db');

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000;

function invalidateCache() {
  _cache = null;
  _cacheAt = 0;
}

function isIpWhitelistEnabled(value = process.env.IP_WHITELIST_ENABLED) {
  return value === '1' || value === 'true';
}

async function loadData() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;
  const sql = getDb();
  const [scopes, rules] = await Promise.all([
    sql`SELECT * FROM ip_whitelist_scopes`,
    sql`SELECT * FROM ip_whitelist WHERE is_active = TRUE`,
  ]);
  _cache = { scopes, rules };
  _cacheAt = Date.now();
  return _cache;
}

// IP 파싱·CIDR 매칭·경로 패턴 매칭은 middleware.js와 같은 구현(lib/ip-match.js)을 쓴다 (P0b-03)
const { isIpInCidr, isLoopback, matchesPathPattern } = require('../../lib/ip-match');

/**
 * IP 허용 여부 체크
 *
 * @param {string} clientIp
 * @param {string|null} requestPath
 * @param {'global_and_path'|'protected_only'} mode
 * @param {Function} loadDataFn
 * @returns {Promise<{allowed: boolean, blockedBy?: 'global'|'path'|'protected'}>}
 */
async function checkIpAllowed(clientIp, requestPath, mode = 'global_and_path', loadDataFn = loadData) {
  if (!isIpWhitelistEnabled()) return { allowed: true };

  // IP를 알 수 없으면(undefined 등) 빈 문자열로 평가 — 어떤 규칙과도 일치하지 않으므로
  // 스코프가 켜져 있으면 차단된다(이전에는 TypeError → 호출부 catch → fail-open).
  clientIp = typeof clientIp === 'string' ? clientIp : '';

  // 로컬호스트(vercel dev 환경 포함)는 항상 허용
  if (isLoopback(clientIp)) {
    return { allowed: true };
  }

  let data;
  try {
    data = await loadDataFn();
  } catch (err) {
    console.error('[ip-whitelist] DB 로드 오류 (fail-open):', err);
    return { allowed: true };
  }

  if (mode === 'global_and_path') {
    const globalScope = data.scopes.find(s => s.scope_type === 'global');
    if (globalScope?.is_enabled) {
      const rules = data.rules.filter(r => r.scope_type === 'global');
      if (!rules.some(r => isIpInCidr(clientIp, r.ip_cidr))) {
        return { allowed: false, blockedBy: 'global' };
      }
    }

    const matchedPathScopes = data.scopes.filter(s =>
      s.scope_type === 'path' && s.is_enabled && matchesPathPattern(requestPath, s.scope_path)
    );
    if (matchedPathScopes.length > 0) {
      const scopePaths = new Set(matchedPathScopes.map(s => s.scope_path));
      const rules = data.rules.filter(r => r.scope_type === 'path' && scopePaths.has(r.scope_path));
      if (!rules.some(r => isIpInCidr(clientIp, r.ip_cidr))) {
        return { allowed: false, blockedBy: 'path' };
      }
    }
  }

  if (mode === 'protected_only') {
    const protectedScope = data.scopes.find(s => s.scope_type === 'protected');
    if (protectedScope?.is_enabled) {
      const rules = data.rules.filter(r => r.scope_type === 'protected');
      if (!rules.some(r => isIpInCidr(clientIp, r.ip_cidr))) {
        return { allowed: false, blockedBy: 'protected' };
      }
    }
  }

  return { allowed: true };
}

module.exports = {
  checkIpAllowed,
  invalidateCache,
  isIpInCidr,
  isIpWhitelistEnabled,
  matchesPathPattern,
};
