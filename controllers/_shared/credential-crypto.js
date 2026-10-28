/**
 * controllers/_shared/credential-crypto.js
 * eformsign 크리덴셜 secret_key 암호화/복호화 (AES-256-GCM) — P0b-05
 *
 * 저장 형식
 * - v1 (신규 저장):  `v1:{iv_hex(12B)}:{authTag_hex(16B)}:{ciphertext_hex}`
 *     · authTagLength 16 고정 — 잘린(짧은) 태그를 받아들이지 않는다
 *     · AAD = `eformsign_credentials:{user_id}` — 암호문을 다른 사용자 행으로 옮기면 복호화 실패
 * - legacy (기존 데이터): `{iv_hex}:{authTag_hex}:{ciphertext_hex}` — AAD 없음. 읽기만 지원(하위 호환)
 *     · 기존 행을 v1로 바꾸는 마이그레이션은 하지 않는다. 새로 저장하는 값부터 v1이 된다.
 * - 평문 (암호화 도입 이전 데이터): 위 두 형식과 정확히 일치하지 않으면 평문으로 보고 그대로 반환한다.
 *     · 예전에는 "콜론 2개"만 보고 암호문으로 판단해 콜론이 든 평문이 500을 냈다(A2-#16).
 *
 * 키: CREDENTIAL_ENCRYPTION_KEY (hex 64자 = 32바이트, 앞뒤 공백·개행 무시, 대소문자 무관)
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const TAG_BYTES = 16;
const V1_PREFIX = 'v1:';

const HEX = '[0-9a-fA-F]';
const V1_RE = new RegExp(`^v1:(${HEX}{${IV_BYTES * 2}}):(${HEX}{${TAG_BYTES * 2}}):((?:${HEX}{2})*)$`);
const LEGACY_RE = new RegExp(`^(${HEX}{${IV_BYTES * 2}}):(${HEX}{${TAG_BYTES * 2}}):((?:${HEX}{2})*)$`);

/**
 * 환경변수에서 32바이트 키 버퍼 반환. 미설정·형식 오류 시 예외 throw
 * - 앞뒤 공백·개행은 제거한다(D-4). 대시보드·.env에 값을 붙여 넣을 때 끝 개행이 섞이기 쉽고,
 *   예전 `Buffer.from(hex, 'hex')`는 이를 무시하고 동작했으므로 같은 값이 계속 동작해야 한다.
 * - 대문자 hex도 허용하고 소문자로 정규화한다(같은 바이트).
 * - 중간에 섞인 공백·hex가 아닌 문자·길이 불일치는 여전히 예외 — 잘못된 키로 조용히 암호화하지 않는다.
 */
function getEncryptionKey() {
  const raw = process.env.CREDENTIAL_ENCRYPTION_KEY;
  const hex = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (!hex) throw new Error('CREDENTIAL_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.');
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error('CREDENTIAL_ENCRYPTION_KEY는 hex 64자(32바이트)여야 합니다.');
  }
  return Buffer.from(hex, 'hex');
}

function aadFor(userId) {
  if (!userId) throw new Error('크리덴셜 암호화에는 user_id가 필요합니다.');
  return Buffer.from(`eformsign_credentials:${userId}`, 'utf8');
}

/** 저장 값의 형식: 'v1' | 'legacy' | 'plain' */
function detectFormat(stored) {
  if (typeof stored !== 'string') return 'plain';
  if (stored.startsWith(V1_PREFIX)) return V1_RE.test(stored) ? 'v1' : 'invalid-v1';
  return LEGACY_RE.test(stored) ? 'legacy' : 'plain';
}

/** 암호문(v1 또는 legacy) 여부 — 마이그레이션 스크립트의 "이미 암호화됨" 판정용 */
function isEncryptedValue(stored) {
  const format = detectFormat(stored);
  return format === 'v1' || format === 'legacy' || format === 'invalid-v1';
}

/** plaintext → `v1:{iv}:{tag}:{ct}` (AAD = user_id) */
function encryptSecret(plaintext, userId) {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_BYTES });
  cipher.setAAD(aadFor(userId));
  const encrypted = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${V1_PREFIX}${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decryptParts(ivHex, tagHex, ctHex, aad) {
  const key = getEncryptionKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'), { authTagLength: TAG_BYTES });
  if (aad) decipher.setAAD(aad);
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8');
}

/**
 * 저장 값 → { plaintext, format }
 * - v1: AAD(user_id) 포함 복호화
 * - legacy: AAD 없이 복호화(태그 16바이트 강제)
 * - plain: 그대로 반환
 * 복호화 실패(키 변경·변조·다른 사용자 행)나 깨진 v1 값은 예외 throw
 */
function decryptSecret(stored, userId) {
  const format = detectFormat(stored);
  if (format === 'plain') return { plaintext: stored, format };
  if (format === 'invalid-v1') throw new Error('v1 암호문 형식이 올바르지 않습니다.');
  if (format === 'v1') {
    const [, ivHex, tagHex, ctHex] = stored.match(V1_RE);
    return { plaintext: decryptParts(ivHex, tagHex, ctHex, aadFor(userId)), format };
  }
  const [, ivHex, tagHex, ctHex] = stored.match(LEGACY_RE);
  return { plaintext: decryptParts(ivHex, tagHex, ctHex, null), format };
}

module.exports = {
  TAG_BYTES,
  decryptSecret,
  detectFormat,
  encryptSecret,
  getEncryptionKey,
  isEncryptedValue,
};
