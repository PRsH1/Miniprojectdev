/**
 * controllers/_shared/ip-whitelist.js
 * IP 화이트리스트 체크 공통 모듈
 *
 * - 서버리스 warm instance에서 모듈 캐시 재사용 (60초 TTL)
 * - DB 오류 시 fail-open (차단하지 않음)
 * - IPv4 전용 (::ffff: 접두어 자동 제거)
 */

const { getDb } = require('./db');

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000;

function invalidateCache() {
  _cache = null;
  _cacheAt = 0;
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

function ipToInt(ip) {
  const parts = ip.split('.');
  if (parts.length !== 4) return -1;
  return parts.reduce((acc, o) => acc * 256 + parseInt(o, 10), 0) >>> 0;
}

function isIpInCidr(clientIp, cidr) {
  const ip = clientIp.replace(/^::ffff:/, '');
  if (!cidr.includes('/')) return ip === cidr;
  const [network, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (bits === 0) return true;
  const mask = (~0 << (32 - bits)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
}

function matchesPathPattern(reqPath, pattern) {
  if (pattern.endsWith('/*')) return reqPath.startsWith(pattern.slice(0, -1)) || reqPath === pattern.slice(0, -2);
  if (pattern.endsWith('*'))  return reqPath.startsWith(pattern.slice(0, -1));
  return reqPath === pattern;
}

/**
 * IP 허용 여부 체크
 *
 * @param {string} clientIp
 * @param {string|null} requestPath
 * @param {'global_and_path'|'protected_only'} mode
 * @returns {Promise<{allowed: boolean, blockedBy?: 'global'|'path'|'protected'}>}
 */
async function checkIpAllowed(clientIp, requestPath, mode = 'global_and_path') {
  let data;
  try {
    data = await loadData();
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

module.exports = { checkIpAllowed, invalidateCache };
