/**
 * middleware.js — Vercel Edge Middleware
 *
 * 모든 요청에서 정적 파일 서빙 이전에 실행됩니다.
 * global scope IP 화이트리스트만 여기서 체크합니다.
 * (path/protected scope는 api/index.js, auth-middleware.js에서 처리)
 */
import { neon } from '@neondatabase/serverless';

export const config = {
  matcher: '/((?!_vercel).*)',
};

let _cache = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000;

function ipToInt(ip) {
  return ip.split('.').reduce((acc, o) => (acc * 256 + parseInt(o, 10)) >>> 0, 0);
}

function isInCidr(clientIp, cidr) {
  const ip = clientIp.replace(/^::ffff:/, '');
  if (!cidr.includes('/')) return ip === cidr;
  const [net, bits] = cidr.split('/');
  const b = parseInt(bits, 10);
  if (b === 0) return true;
  const mask = (~0 << (32 - b)) >>> 0;
  return (ipToInt(ip) & mask) === (ipToInt(net) & mask);
}

async function loadGlobalCheck() {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;
  const sql = neon(process.env.POSTGRES_URL);
  const [scopes, rules] = await Promise.all([
    sql`SELECT is_enabled FROM ip_whitelist_scopes WHERE scope_type = 'global' LIMIT 1`,
    sql`SELECT ip_cidr FROM ip_whitelist WHERE scope_type = 'global' AND is_active = TRUE`,
  ]);
  _cache = { enabled: scopes[0]?.is_enabled ?? false, rules };
  _cacheAt = Date.now();
  return _cache;
}

export default async function middleware(request) {
  const forwarded = request.headers.get('x-forwarded-for') || '';
  const ip = forwarded.split(',')[0].trim() || '127.0.0.1';
  const cleanIp = ip.replace(/^::ffff:/, '');

  // 로컬호스트 항상 허용
  if (cleanIp === '127.0.0.1' || cleanIp === '::1') return;

  try {
    const data = await loadGlobalCheck();
    if (data.enabled && !data.rules.some(r => isInCidr(ip, r.ip_cidr))) {
      return new Response(
        '이 IP 주소에서는 접근이 허용되지 않습니다.\nIP 화이트리스트에 등록되지 않은 주소입니다.',
        { status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }
      );
    }
  } catch (err) {
    console.error('[Middleware] IP check error (fail-open):', err.message);
  }
}
