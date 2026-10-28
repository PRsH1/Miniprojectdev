/**
 * controllers/_shared/password.js
 * 비밀번호 해시(scrypt) 생성·검증 공통 모듈
 *
 * 저장 형식: `{salt_hex}:{hash_hex}` (scrypt, keylen 64)
 * login.js(검증), change-password.js(현재 비밀번호 확인 + 새 해시), signup.js(새 해시)가 같은 구현을 쓴다.
 */

const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);
const KEY_LENGTH = 64;

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `${salt}:${hash.toString('hex')}`;
}

/** 비밀번호 해시 검증 (salt:hash 형식). 형식이 맞지 않으면 false */
async function verifyPassword(password, stored) {
  if (typeof password !== 'string' || typeof stored !== 'string') return false;
  const colonIdx = stored.indexOf(':');
  if (colonIdx === -1) return false;
  const salt = stored.slice(0, colonIdx);
  const hash = stored.slice(colonIdx + 1);
  const hashBuffer = Buffer.from(hash, 'hex');
  const inputHash = await scryptAsync(password, salt, KEY_LENGTH);
  if (hashBuffer.length !== inputHash.length) return false;
  return crypto.timingSafeEqual(hashBuffer, inputHash);
}

/**
 * 계정이 없을 때 대신 검증할 더미 해시 (P0b-01 계정 열거 완화)
 * 존재하지 않는 아이디도 같은 scrypt 비용을 치르게 해 응답 지연으로 계정 존재 여부가 드러나지 않게 한다.
 * 해시 부분은 난수라 어떤 비밀번호와도 일치하지 않는다. 프로세스마다 새로 만든다(비밀값 아님).
 */
const DUMMY_PASSWORD_HASH = `${crypto.randomBytes(16).toString('hex')}:${crypto.randomBytes(KEY_LENGTH).toString('hex')}`;

module.exports = {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPassword,
};
