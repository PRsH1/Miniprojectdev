/**
 * protected_pages seed, index.html 카드, 실제 파일 존재 여부를 비교하는 진단 스크립트.
 *
 * 실행:
 *   node scripts/check-protected-pages.js
 */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const MIGRATE_PATH = path.join(ROOT_DIR, 'scripts', 'migrate.js');
const INDEX_PATH = path.join(ROOT_DIR, 'index.html');

// 운영 DB에서 수동 관리되는 보호 페이지가 있고 seed 불일치를 의도적으로 허용하려면 여기에 추가한다.
const ALLOWED_PROTECTED_PATHS = new Set([]);

const errors = [];
const warnings = [];

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    errors.push(`파일을 읽을 수 없습니다: ${toProjectPath(filePath)} (${error.message})`);
    return '';
  }
}

function toProjectPath(filePath) {
  return path.relative(ROOT_DIR, filePath).split(path.sep).join('/');
}

function getLineNumber(source, index) {
  return source.slice(0, index).split(/\r?\n/).length;
}

function extractArrayLiteral(source, variableName) {
  const declaration = new RegExp(`\\bconst\\s+${variableName}\\s*=\\s*\\[`);
  const match = declaration.exec(source);

  if (!match) {
    throw new Error(
      `scripts/migrate.js에서 "const ${variableName} = [...]" 형태의 seed 배열을 찾지 못했습니다. ` +
      '배열 이름이나 선언 방식이 바뀌었다면 이 스크립트의 추출 로직을 갱신해야 합니다.'
    );
  }

  const start = source.indexOf('[', match.index);
  let depth = 0;
  let quote = null;
  let escaped = false;

  for (let i = start; i < source.length; i += 1) {
    const char = source[i];

    if (quote) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === '`') {
      quote = char;
      continue;
    }

    if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;
      if (depth === 0) {
        return source.slice(start, i + 1);
      }
    }
  }

  throw new Error(`scripts/migrate.js에서 "${variableName}" 배열의 닫는 대괄호를 찾지 못했습니다.`);
}

function extractSeedPages(source) {
  let arrayLiteral;

  try {
    arrayLiteral = extractArrayLiteral(source, 'pages');
  } catch (error) {
    errors.push(error.message);
    return [];
  }

  let pages;
  try {
    pages = vm.runInNewContext(`(${arrayLiteral})`, Object.freeze({}), { timeout: 1000 });
  } catch (error) {
    errors.push(
      'scripts/migrate.js의 protected_pages seed 배열을 해석하지 못했습니다. ' +
      `객체 리터럴/문자열 배열 형태인지 확인하세요. 원인: ${error.message}`
    );
    return [];
  }

  if (!Array.isArray(pages)) {
    errors.push('scripts/migrate.js의 pages seed가 배열이 아닙니다.');
    return [];
  }

  return pages.map((page, index) => {
    const missingFields = ['path', 'name', 'required_role', 'file_path'].filter((field) => {
      return !page || typeof page[field] !== 'string' || page[field].trim() === '';
    });

    if (missingFields.length > 0) {
      errors.push(`seed #${index + 1}에 필수 필드가 없습니다: ${missingFields.join(', ')}`);
    }

    return {
      index,
      path: page && typeof page.path === 'string' ? page.path.trim() : '',
      name: page && typeof page.name === 'string' ? page.name.trim() : '',
      required_role: page && typeof page.required_role === 'string' ? page.required_role.trim() : '',
      file_path: page && typeof page.file_path === 'string' ? page.file_path.trim() : '',
    };
  });
}

function parseAttributes(tag) {
  const attributes = {};
  const attributePattern = /([:@A-Za-z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let match;

  while ((match = attributePattern.exec(tag)) !== null) {
    const name = match[1].toLowerCase();
    if (name === 'a') {
      continue;
    }
    attributes[name] = match[2] ?? match[3] ?? match[4] ?? '';
  }

  return attributes;
}

function extractCardTitle(html, tagStartIndex) {
  const closeIndex = html.indexOf('</a>', tagStartIndex);
  if (closeIndex === -1) {
    return '(제목 확인 불가)';
  }

  const cardHtml = html.slice(tagStartIndex, closeIndex);
  const titleMatch = /<div\b[^>]*class=["'][^"']*\bcard-title\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i.exec(cardHtml);
  if (!titleMatch) {
    return '(제목 없음)';
  }

  return titleMatch[1]
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '(제목 없음)';
}

function extractIndexCards(source) {
  const cards = [];
  const tagPattern = /<a\b[^>]*>/gi;
  let match;

  while ((match = tagPattern.exec(source)) !== null) {
    const attributes = parseAttributes(match[0]);
    const isCard = Object.prototype.hasOwnProperty.call(attributes, 'data-card') ||
      /\bcard\b/.test(attributes.class || '');

    if (!isCard) {
      continue;
    }

    const protectedPath = attributes['data-protected-path'];
    const originalUrl = attributes['data-original-url'];

    if (protectedPath === undefined && originalUrl === undefined) {
      continue;
    }

    cards.push({
      line: getLineNumber(source, match.index),
      title: extractCardTitle(source, match.index),
      href: attributes.href || '',
      protectedPath: protectedPath ? protectedPath.trim() : '',
      originalUrl: originalUrl ? originalUrl.trim() : '',
    });
  }

  return cards;
}

function normalizeRelativeFilePath(rawValue) {
  const value = rawValue.trim();
  if (!value || /^javascript:/i.test(value)) {
    return null;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
    return null;
  }

  const withoutHash = value.split('#')[0];
  const withoutQuery = withoutHash.split('?')[0];
  const withoutLeadingSlash = withoutQuery.replace(/^\/+/, '');

  if (!withoutLeadingSlash) {
    return null;
  }

  return withoutLeadingSlash;
}

function resolveProjectFile(rawValue) {
  const relativeFilePath = normalizeRelativeFilePath(rawValue);
  if (!relativeFilePath) {
    return null;
  }

  const resolved = path.resolve(ROOT_DIR, relativeFilePath);
  if (resolved !== ROOT_DIR && !resolved.startsWith(ROOT_DIR + path.sep)) {
    return {
      relativeFilePath,
      resolved,
      exists: false,
      escapedRoot: true,
    };
  }

  return {
    relativeFilePath,
    resolved,
    exists: fs.existsSync(resolved),
    escapedRoot: false,
  };
}

function addDuplicateFindings(items, keyName, label, severity) {
  const seen = new Map();

  for (const item of items) {
    const key = item[keyName];
    if (!key) {
      continue;
    }

    if (!seen.has(key)) {
      seen.set(key, []);
    }
    seen.get(key).push(item);
  }

  for (const [key, duplicates] of seen) {
    if (duplicates.length <= 1) {
      continue;
    }

    const locations = duplicates.map((item) => {
      if (item.line) {
        return `index.html:${item.line}`;
      }
      return `seed #${item.index + 1}`;
    }).join(', ');
    const message = `${label} 중복: ${key} (${locations})`;

    if (severity === 'warning') {
      warnings.push(message);
    } else {
      errors.push(message);
    }
  }
}

function printSeedPages(seedPages) {
  console.log('\n[protected_pages seed]');
  if (seedPages.length === 0) {
    console.log('- 추출된 seed가 없습니다.');
    return;
  }

  for (const page of seedPages) {
    console.log(
      `- ${page.path || '(path 없음)'} | ${page.name || '(name 없음)'} | ` +
      `role=${page.required_role || '(role 없음)'} | file=${page.file_path || '(file_path 없음)'}`
    );
  }
}

function printProtectedCards(cards) {
  const protectedCards = cards.filter((card) => card.protectedPath);

  console.log('\n[index.html data-protected-path 카드]');
  if (protectedCards.length === 0) {
    console.log('- 추출된 보호 카드가 없습니다.');
    return;
  }

  for (const card of protectedCards) {
    console.log(
      `- index.html:${card.line} | ${card.protectedPath} | ${card.title} | ` +
      `href=${card.href || '(없음)'} | data-original-url=${card.originalUrl || '(없음)'}`
    );
  }
}

function main() {
  const migrateSource = readText(MIGRATE_PATH);
  const indexSource = readText(INDEX_PATH);

  const seedPages = migrateSource ? extractSeedPages(migrateSource) : [];
  const cards = indexSource ? extractIndexCards(indexSource) : [];
  const protectedCards = cards.filter((card) => card.protectedPath);

  printSeedPages(seedPages);
  printProtectedCards(cards);

  const seedByPath = new Map(seedPages.filter((page) => page.path).map((page) => [page.path, page]));
  const protectedCardByPath = new Map(protectedCards.map((card) => [card.protectedPath, card]));

  for (const page of seedPages) {
    if (!page.file_path) {
      continue;
    }

    const file = resolveProjectFile(page.file_path);
    if (!file) {
      errors.push(`seed file_path가 검사 가능한 파일 경로가 아닙니다: ${page.path} -> ${page.file_path}`);
      continue;
    }

    if (file.escapedRoot) {
      errors.push(`seed file_path가 프로젝트 루트 밖을 가리킵니다: ${page.path} -> ${page.file_path}`);
    } else if (!file.exists) {
      errors.push(`seed file_path 파일이 없습니다: ${page.path} -> ${file.relativeFilePath}`);
    }
  }

  for (const card of protectedCards) {
    if (!seedByPath.has(card.protectedPath) && !ALLOWED_PROTECTED_PATHS.has(card.protectedPath)) {
      errors.push(
        `index.html:${card.line} 보호 카드가 seed에 없음: ${card.protectedPath} (${card.title}). ` +
        '운영 DB에 수동 등록되어 있다면 의도된 상태일 수 있습니다.'
      );
    }
  }

  for (const page of seedPages) {
    if (page.path && !protectedCardByPath.has(page.path)) {
      warnings.push(
        `seed에는 있지만 index.html 보호 카드가 없습니다: ${page.path} (${page.name || 'name 없음'}). ` +
        '숨김/internal page라면 의도된 상태일 수 있습니다.'
      );
    }
  }

  for (const card of cards.filter((item) => item.originalUrl)) {
    const file = resolveProjectFile(card.originalUrl);
    if (!file) {
      continue;
    }

    if (file.escapedRoot) {
      errors.push(`index.html:${card.line} data-original-url이 프로젝트 루트 밖을 가리킵니다: ${card.originalUrl}`);
    } else if (!file.exists) {
      errors.push(`index.html:${card.line} data-original-url 파일이 없습니다: ${file.relativeFilePath} (${card.title})`);
    }
  }

  addDuplicateFindings(seedPages, 'path', 'protected_pages seed path', 'error');
  addDuplicateFindings(protectedCards, 'protectedPath', 'index.html data-protected-path', 'error');

  console.log('\n[검사 결과]');
  if (warnings.length > 0) {
    console.log(`\n경고 ${warnings.length}건`);
    for (const warning of warnings) {
      console.log(`- ${warning}`);
    }
  } else {
    console.log('\n경고 없음');
  }

  if (errors.length > 0) {
    console.log(`\n오류 ${errors.length}건`);
    for (const error of errors) {
      console.log(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('\n오류 없음');
}

main();
