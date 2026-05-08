#!/usr/bin/env node
'use strict';

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MAX_TEXT_BYTES = 5 * 1024 * 1024;

const fileRules = [
  {
    id: 'tracked-certs-dir',
    test: (file) => /^certs\//i.test(file),
  },
  {
    id: 'tracked-pem-file',
    test: (file) => /\.pem$/i.test(file),
  },
  {
    id: 'tracked-env-file',
    test: (file) => /(^|\/)\.env($|\.)/i.test(file),
  },
];

const contentRules = [
  {
    id: 'private-key-pem-block',
    regex: /-{5}BEGIN\s+(?:(?:RSA|DSA|EC|OPENSSH|ENCRYPTED)\s+)?PRIVATE\s+KEY-{5}/i,
  },
  {
    id: 'certificate-pem-block',
    regex: /-{5}BEGIN\s+CERTIFICATE-{5}/i,
  },
  {
    id: 'saml-private-key-env',
    regex: /\bSAML_PRIVATE_KEY\b\s*[:=]\s*["']?[A-Za-z0-9+/=\\r\\n]{80,}/i,
  },
  {
    id: 'saml-public-cert-env',
    regex: /\bSAML_PUBLIC_CERT\b\s*[:=]\s*["']?[A-Za-z0-9+/=\\r\\n]{80,}/i,
  },
  {
    id: 'database-url',
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?):\/\/[^:\s"'<>]+:[^@\s"'<>]+@[^ \t\r\n"'<>]+/i,
  },
  {
    id: 'database-url-env',
    regex: /\b(?:DATABASE_URL|POSTGRES_URL|POSTGRES_PRISMA_URL|POSTGRES_URL_NON_POOLING)\b\s*[:=]\s*["']?[^"'\s]{20,}/i,
  },
  {
    id: 'pusher-secret',
    regex: /\bPUSHER_[A-Z0-9_]*SECRET\b\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}/i,
  },
  {
    id: 'jwt-secret',
    regex: /\bJWT(?:_[A-Z0-9]+)*_SECRET\b\s*[:=]\s*["']?[A-Za-z0-9_./+=-]{16,}/i,
  },
];

const placeholderPattern =
  /\b(?:process\.env|import\.meta\.env|CHANGE_ME|REPLACE_ME|REDACTED|EXAMPLE|PLACEHOLDER|DUMMY|YOUR[_-]?[A-Z0-9_-]*)\b|<[^>]+>/i;

function getTrackedFiles() {
  try {
    const output = execFileSync('git', ['ls-files', '-z'], { encoding: 'buffer' });
    return output.toString('utf8').split('\0').filter(Boolean);
  } catch (gitError) {
    try {
      return readGitIndexFiles();
    } catch (indexError) {
      throw new Error(
        `Unable to enumerate tracked files with git or .git/index. git: ${gitError.message}; index: ${indexError.message}`,
      );
    }
  }
}

function getGitDir() {
  const dotGit = path.resolve('.git');
  const stat = fs.statSync(dotGit);
  if (stat.isDirectory()) {
    return dotGit;
  }

  const content = fs.readFileSync(dotGit, 'utf8').trim();
  const match = /^gitdir:\s*(.+)$/i.exec(content);
  if (!match) {
    throw new Error('.git is neither a directory nor a gitdir file.');
  }

  return path.resolve(path.dirname(dotGit), match[1]);
}

function readGitIndexFiles() {
  const indexPath = path.join(getGitDir(), 'index');
  const buffer = fs.readFileSync(indexPath);
  if (buffer.toString('ascii', 0, 4) !== 'DIRC') {
    throw new Error('Unsupported git index signature.');
  }

  const version = buffer.readUInt32BE(4);
  if (version !== 2 && version !== 3) {
    throw new Error(`Unsupported git index version ${version}.`);
  }

  const entryCount = buffer.readUInt32BE(8);
  const files = [];
  let offset = 12;

  for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
    const entryStart = offset;
    offset += 40; // ctime, mtime, dev, ino, mode, uid, gid, and file size.
    offset += 20; // SHA-1 object id.

    const flags = buffer.readUInt16BE(offset);
    offset += 2;

    const hasExtendedFlags = version === 3 && (flags & 0x4000) !== 0;
    if (hasExtendedFlags) {
      offset += 2;
    }

    const pathStart = offset;
    const pathLength = flags & 0x0fff;
    if (pathLength < 0x0fff) {
      offset += pathLength;
    } else {
      while (buffer[offset] !== 0) {
        offset += 1;
      }
    }

    files.push(buffer.toString('utf8', pathStart, offset));
    offset += 1;

    const entryLength = offset - entryStart;
    const padding = (8 - (entryLength % 8)) % 8;
    offset += padding;
  }

  return files;
}

function isProbablyBinary(buffer) {
  const sampleLength = Math.min(buffer.length, 8000);
  if (sampleLength === 0) {
    return false;
  }

  let suspicious = 0;
  for (let index = 0; index < sampleLength; index += 1) {
    const byte = buffer[index];
    if (byte === 0) {
      return true;
    }
    if (byte < 7 || (byte > 14 && byte < 32)) {
      suspicious += 1;
    }
  }
  return suspicious / sampleLength > 0.3;
}

function scanFileContent(file, findings) {
  const stat = fs.statSync(file);
  if (stat.size > MAX_TEXT_BYTES) {
    return;
  }

  const buffer = fs.readFileSync(file);
  if (isProbablyBinary(buffer)) {
    return;
  }

  const lines = buffer.toString('utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    for (const rule of contentRules) {
      const match = rule.regex.exec(line);
      if (match && !placeholderPattern.test(match[0])) {
        findings.push({
          file,
          line: index + 1,
          rule: rule.id,
        });
      }
    }
  });
}

function main() {
  const files = getTrackedFiles();
  const findings = [];

  for (const file of files) {
    for (const rule of fileRules) {
      if (rule.test(file)) {
        findings.push({ file, rule: rule.id });
      }
    }

    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      scanFileContent(file, findings);
    }
  }

  if (findings.length > 0) {
    console.error('Secret scan failed. Values are intentionally not printed.');
    for (const finding of findings) {
      const location = finding.line ? `${finding.file}:${finding.line}` : finding.file;
      console.error(`- ${location} ${finding.rule}`);
    }
    process.exit(1);
  }

  console.log(`Secret scan passed: ${files.length} tracked files checked.`);
}

main();
