/**
 * controllers/_shared/page-file.js
 * 보호 페이지(protected_pages.file_path) 경로 검증 공통 모듈
 *
 * - 등록 시(adminPages.js)와 서빙 시(auth-middleware.js) 모두 같은 규칙을 쓴다.
 * - 허용 디렉터리는 함수 번들(vercel.json includeFiles)에 포함되는 private/, utils/ 뿐이다.
 *   (errors/는 번들에 있지만 보호 페이지 대상이 아니므로 제외)
 * - `../`, 절대 경로, 드라이브 문자, NUL, .html 외 확장자는 모두 거부한다.
 */

const path = require('path');
const { promises: fs } = require('fs');

const ALLOWED_PAGE_DIRS = Object.freeze(['private', 'utils']);
const MAX_FILE_PATH_LENGTH = 255;

/**
 * file_path 문자열을 정규화·검증
 * @returns {{ ok: true, relPath: string } | { ok: false, reason: string }}
 *   relPath: 앞 슬래시를 제거한 POSIX 상대 경로 (예: 'private/Admin.html') — DB 저장값으로 사용
 */
function normalizePageFilePath(filePath) {
  if (typeof filePath !== 'string' || !filePath.trim()) {
    return { ok: false, reason: 'file_path가 비어 있습니다.' };
  }
  const raw = filePath.trim();
  if (raw.length > MAX_FILE_PATH_LENGTH) {
    return { ok: false, reason: `file_path는 ${MAX_FILE_PATH_LENGTH}자 이하여야 합니다.` };
  }
  if (/[\0\r\n]/.test(raw)) {
    return { ok: false, reason: 'file_path에 허용되지 않는 문자가 있습니다.' };
  }
  if (raw.includes('\\')) {
    return { ok: false, reason: 'file_path에는 역슬래시(\\)를 쓸 수 없습니다. 슬래시(/)를 사용하세요.' };
  }
  if (/^[A-Za-z]:/.test(raw) || raw.startsWith('//')) {
    return { ok: false, reason: 'file_path는 프로젝트 기준 상대 경로여야 합니다.' };
  }

  // 앞 슬래시 1개는 허용(카드 data-original-url 관례와 동일하게 제거해 저장)
  const withoutLead = raw.startsWith('/') ? raw.slice(1) : raw;
  const segments = withoutLead.split('/');
  if (segments.some((s) => s === '..' || s === '.' || s === '')) {
    return { ok: false, reason: 'file_path에 ., .., 빈 경로 구간을 쓸 수 없습니다.' };
  }

  const top = segments[0];
  if (segments.length < 2 || !ALLOWED_PAGE_DIRS.includes(top)) {
    return { ok: false, reason: `file_path는 ${ALLOWED_PAGE_DIRS.map((d) => `${d}/`).join(' 또는 ')} 아래의 파일이어야 합니다.` };
  }
  if (!/\.html$/i.test(withoutLead)) {
    return { ok: false, reason: 'file_path는 .html 파일이어야 합니다.' };
  }

  return { ok: true, relPath: segments.join('/') };
}

/**
 * 서빙용 절대 경로 계산 + 루트 이탈 재확인
 * @param {string} filePath DB의 file_path
 * @param {string} [rootDir] 프로젝트 루트 (기본 process.cwd())
 * @returns {{ ok: true, relPath: string, fullPath: string } | { ok: false, reason: string }}
 */
function resolvePageFilePath(filePath, rootDir = process.cwd()) {
  const normalized = normalizePageFilePath(filePath);
  if (!normalized.ok) return normalized;

  const root = path.resolve(rootDir);
  const top = normalized.relPath.split('/')[0];
  const allowedRoot = path.resolve(root, top);
  const fullPath = path.resolve(root, ...normalized.relPath.split('/'));

  if (!fullPath.startsWith(allowedRoot + path.sep)) {
    return { ok: false, reason: '허용된 디렉터리를 벗어난 경로입니다.' };
  }
  return { ok: true, relPath: normalized.relPath, fullPath };
}

/**
 * 보호 페이지 HTML 읽기 — 심볼릭 링크로 허용 디렉터리를 벗어나는 경우도 차단
 * @returns {Promise<string>} HTML
 * @throws {Error} code 'PAGE_PATH_INVALID' (검증 실패) 또는 fs 오류(ENOENT 등)
 */
async function readProtectedPageFile(filePath, rootDir = process.cwd()) {
  const resolved = resolvePageFilePath(filePath, rootDir);
  if (!resolved.ok) {
    const err = new Error(resolved.reason);
    err.code = 'PAGE_PATH_INVALID';
    throw err;
  }

  const real = await fs.realpath(resolved.fullPath);
  const realRoot = await fs.realpath(path.resolve(rootDir, resolved.relPath.split('/')[0]));
  if (!real.startsWith(realRoot + path.sep)) {
    const err = new Error('허용된 디렉터리를 벗어난 실제 경로입니다.');
    err.code = 'PAGE_PATH_INVALID';
    throw err;
  }
  return fs.readFile(real, 'utf8');
}

module.exports = {
  ALLOWED_PAGE_DIRS,
  normalizePageFilePath,
  readProtectedPageFile,
  resolvePageFilePath,
};
