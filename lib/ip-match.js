/**
 * lib/ip-match.js
 * IP 화이트리스트 공용 파서·매처 (P0b-03)
 *
 * middleware.js(Edge, ESM import)와 controllers/_shared/ip-whitelist.js·adminIpWhitelist.js(Node, require)가
 * 같은 구현을 쓰도록 한곳에 둔다. 이전에는 두 곳의 ipToInt가 서로 달라
 * IPv6('2001:db8::1' → 2001)·쓰레기 값('x.y.z.w' → 0 → 0.0.0.0/8 일치)이 잘못 매칭됐다.
 *
 * 원칙
 * - 의존성 없음(Edge 런타임 호환: Node 전용 모듈 net 등을 쓰지 않는다)
 * - 해석할 수 없는 IP·CIDR은 어떤 규칙과도 일치하지 않는다(= 스코프가 켜져 있으면 차단)
 * - IPv4-mapped IPv6(::ffff:1.2.3.4)는 IPv4로 취급한다
 * - 경로 패턴 비교는 정규화(디코딩·역슬래시·중복 슬래시·점 구간·대소문자·끝 슬래시) 후 수행한다
 */

const IPV4_OCTET = /^(0|[1-9]\d{0,2})$/;
const HEXTET = /^[0-9a-fA-F]{1,4}$/;

/** '1.2.3.4' → [1,2,3,4] (선행 0·범위 초과·공백 거부) */
function parseIPv4Bytes(text) {
  const parts = text.split('.');
  if (parts.length !== 4) return null;
  const bytes = [];
  for (const part of parts) {
    if (!IPV4_OCTET.test(part)) return null;
    const n = Number(part);
    if (n > 255) return null;
    bytes.push(n);
  }
  return bytes;
}

/** IPv6 텍스트 → 16바이트 배열. '::' 압축·끝의 IPv4 표기 지원, zone id(%)는 거부 */
function parseIPv6Bytes(text) {
  if (!text.includes(':') || text.includes('%')) return null;

  let head = text;
  let tailV4 = null;
  const lastColon = text.lastIndexOf(':');
  const lastPart = text.slice(lastColon + 1);
  if (lastPart.includes('.')) {
    tailV4 = parseIPv4Bytes(lastPart);
    if (!tailV4) return null;
    head = text.slice(0, lastColon + 1);
    // 'x::1.2.3.4' → head 'x::' / '::ffff:1.2.3.4' → head '::ffff:' → 끝 콜론 하나 제거('::'는 유지)
    if (head.endsWith(':') && !head.endsWith('::')) head = head.slice(0, -1);
  }

  const doubleColon = head.split('::');
  if (doubleColon.length > 2) return null;

  const toGroups = (s) => (s === '' ? [] : s.split(':'));
  const left = toGroups(doubleColon[0]);
  const right = doubleColon.length === 2 ? toGroups(doubleColon[1]) : [];
  for (const g of [...left, ...right]) {
    if (!HEXTET.test(g)) return null;
  }

  const groupsNeeded = tailV4 ? 6 : 8;
  let groups;
  if (doubleColon.length === 2) {
    const missing = groupsNeeded - left.length - right.length;
    if (missing < 1) return null;
    groups = [...left, ...Array(missing).fill('0'), ...right];
  } else {
    if (left.length !== groupsNeeded) return null;
    groups = left;
  }

  const bytes = [];
  for (const g of groups) {
    const n = parseInt(g, 16);
    bytes.push((n >> 8) & 0xff, n & 0xff);
  }
  if (tailV4) bytes.push(...tailV4);
  return bytes.length === 16 ? bytes : null;
}

function isV4Mapped(bytes) {
  for (let i = 0; i < 10; i += 1) if (bytes[i] !== 0) return false;
  return bytes[10] === 0xff && bytes[11] === 0xff;
}

/**
 * IP 문자열 → { version: 4|6, bytes } 또는 null
 * IPv4-mapped IPv6는 { version: 4 }로 정규화한다.
 */
function parseIp(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  if (!text || text.length > 64) return null;

  const v4 = parseIPv4Bytes(text);
  if (v4) return { version: 4, bytes: v4 };

  const v6 = parseIPv6Bytes(text);
  if (!v6) return null;
  if (isV4Mapped(v6)) return { version: 4, bytes: v6.slice(12) };
  return { version: 6, bytes: v6 };
}

/**
 * CIDR(또는 단일 IP) 문자열 → { version, bytes, bits } 또는 null
 * 단일 IP는 /32(IPv4)·/128(IPv6)로 본다. IPv4-mapped IPv6 CIDR(/96 이상)은 IPv4 CIDR로 변환한다.
 */
function parseCidr(value) {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  const slash = text.indexOf('/');
  const addrText = slash === -1 ? text : text.slice(0, slash);
  const bitsText = slash === -1 ? null : text.slice(slash + 1);

  if (bitsText !== null && !/^(0|[1-9]\d{0,2})$/.test(bitsText)) return null;

  // IPv4-mapped 여부를 판단하려고 IPv6 원형을 먼저 본다
  const rawV6 = addrText.includes(':') ? parseIPv6Bytes(addrText) : null;
  if (rawV6) {
    const bits = bitsText === null ? 128 : Number(bitsText);
    if (bits > 128) return null;
    if (isV4Mapped(rawV6) && bits >= 96) {
      return { version: 4, bytes: rawV6.slice(12), bits: bits - 96 };
    }
    return { version: 6, bytes: rawV6, bits };
  }

  const v4 = parseIPv4Bytes(addrText);
  if (!v4) return null;
  const bits = bitsText === null ? 32 : Number(bitsText);
  if (bits > 32) return null;
  return { version: 4, bytes: v4, bits };
}

function isValidIpCidr(value) {
  return parseCidr(value) !== null;
}

/** 앞 bits 비트가 같은지 비교 */
function prefixEquals(a, b, bits) {
  const fullBytes = Math.floor(bits / 8);
  for (let i = 0; i < fullBytes; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  const rest = bits % 8;
  if (rest === 0) return true;
  const mask = (0xff << (8 - rest)) & 0xff;
  return (a[fullBytes] & mask) === (b[fullBytes] & mask);
}

/** clientIp가 cidr 범위 안인지. 둘 중 하나라도 해석할 수 없거나 IP 버전이 다르면 false */
function isIpInCidr(clientIp, cidr) {
  const ip = parseIp(clientIp);
  const range = parseCidr(cidr);
  if (!ip || !range || ip.version !== range.version) return false;
  return prefixEquals(ip.bytes, range.bytes, range.bits);
}

/** 루프백(127.0.0.1 / ::1, IPv4-mapped 포함) 여부 — vercel dev 자기 잠금 방지용 */
function isLoopback(clientIp) {
  const ip = parseIp(clientIp);
  if (!ip) return false;
  if (ip.version === 4) return ip.bytes.join('.') === '127.0.0.1';
  return ip.bytes.slice(0, 15).every((b) => b === 0) && ip.bytes[15] === 1;
}

/**
 * x-forwarded-for 첫 값 → x-real-ip 순으로 클라이언트 IP 추출. 없으면 ''
 * getHeader(name) → string|undefined (Node req.headers / Edge Headers 모두 지원)
 */
function clientIpFromHeaders(getHeader) {
  const forwarded = String(getHeader('x-forwarded-for') || '').split(',')[0].trim();
  if (forwarded) return forwarded;
  return String(getHeader('x-real-ip') || '').trim();
}

/**
 * 요청 경로 정규화 — 화이트리스트 비교 전용
 * 퍼센트 디코딩(최대 2회), 역슬래시→슬래시, 중복 슬래시 축약, '.'/'..' 구간 해석, 소문자화, 끝 슬래시 제거
 * (라우터보다 넓게 정규화한다. 넓게 일치할수록 더 많이 차단되므로 우회 방지 쪽으로 안전하다)
 */
function normalizeRequestPath(value) {
  let p = String(value || '').split('?')[0].split('#')[0];
  for (let i = 0; i < 2; i += 1) {
    try {
      const decoded = decodeURIComponent(p);
      if (decoded === p) break;
      p = decoded;
    } catch {
      break;
    }
  }
  p = p.replace(/\\/g, '/');
  const out = [];
  for (const seg of p.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') { out.pop(); continue; }
    out.push(seg);
  }
  return `/${out.join('/')}`.toLowerCase();
}

/**
 * 경로 스코프 패턴 매칭
 * - '/api/admin/*' : '/api/admin' 자체와 그 하위 전체
 * - '/app*'        : 정규화한 경로가 접두어로 시작
 * - '/api/login'   : 그 경로 자체와 하위 경로(예: '/api/login/', '/api/login/x')
 *   라우터는 '/api/login/x'도 login 컨트롤러로 보내므로, 정확 일치만 보면 끝 슬래시·하위 경로로 우회된다.
 */
function matchesPathPattern(reqPath, pattern) {
  if (typeof pattern !== 'string' || !pattern.trim()) return false;
  const p = normalizeRequestPath(reqPath);
  const pat = pattern.trim();

  const underBase = (base) => base === '/' || p === base || p.startsWith(`${base}/`);

  if (pat.endsWith('/*')) return underBase(normalizeRequestPath(pat.slice(0, -2)));
  if (pat.endsWith('*')) {
    const rawPrefix = pat.slice(0, -1);
    const prefix = normalizeRequestPath(rawPrefix);
    // '/app*' → '/app' 접두어. 'abc/*'처럼 끝이 슬래시였으면 하위 경로 기준으로 본다
    if (rawPrefix.endsWith('/')) return underBase(prefix);
    return p.startsWith(prefix);
  }
  return underBase(normalizeRequestPath(pat));
}

module.exports = {
  clientIpFromHeaders,
  isIpInCidr,
  isLoopback,
  isValidIpCidr,
  matchesPathPattern,
  normalizeRequestPath,
  parseCidr,
  parseIp,
};
