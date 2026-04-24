/**
 * controllers/developer-notes.js
 * 개발자 노트 API
 *
 * GET    /api/developer-notes
 * GET    /api/developer-notes/:id
 * POST   /api/developer-notes
 * PATCH  /api/developer-notes/:id
 * POST   /api/developer-notes/:id/update
 * DELETE /api/developer-notes/:id
 */

const { parse } = require('cookie');
const jwt = require('jsonwebtoken');
const { getDb } = require('./_shared/db');
const { insertAuditLog } = require('./_shared/audit');
const { methodNotAllowed, respondError } = require('./_shared/respond-error');

const ALLOWED_SORT = ['created_at', 'updated_at', 'pinned'];
const ALLOWED_DIR = ['ASC', 'DESC'];

function requireAdmin(req, res) {
  const cookies = parse(req.headers.cookie || '');
  const authToken = cookies.auth_token;
  if (!authToken) {
    respondError(req, res, 401, {
      code: 'AUTH_REQUIRED',
      logMessage: 'Developer notes admin API requires authentication',
    });
    return null;
  }

  let decoded;
  try {
    decoded = jwt.verify(authToken, process.env.JWT_SECRET);
  } catch (error) {
    respondError(req, res, 401, {
      code: error.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
      error,
      logMessage: 'Developer notes admin token verification failed',
    });
    return null;
  }

  if (decoded.role !== 'admin') {
    respondError(req, res, 403, {
      code: 'FORBIDDEN',
      message: '관리자 권한이 필요합니다.',
      reason: '현재 계정은 개발자 노트 관리 API를 사용할 수 없습니다.',
      action: '관리자 계정으로 로그인하세요.',
      logMessage: 'Admin role required for developer notes API',
    });
    return null;
  }

  return decoded;
}

function normalizePinned(value) {
  return value === true || value === 'true' || value === 1 || value === '1';
}

function buildListQuery(sql, sort, dir) {
  if (sort === 'updated_at') {
    return dir === 'ASC'
      ? sql`
          SELECT dn.id, dn.title, dn.content, dn.version, dn.author_id, dn.pinned, dn.created_at, dn.updated_at,
                 u.username AS author_username
          FROM developer_notes dn
          LEFT JOIN users u ON u.id = dn.author_id
          ORDER BY dn.pinned DESC, dn.updated_at ASC, dn.id DESC
        `
      : sql`
          SELECT dn.id, dn.title, dn.content, dn.version, dn.author_id, dn.pinned, dn.created_at, dn.updated_at,
                 u.username AS author_username
          FROM developer_notes dn
          LEFT JOIN users u ON u.id = dn.author_id
          ORDER BY dn.pinned DESC, dn.updated_at DESC, dn.id DESC
        `;
  }

  if (sort === 'pinned') {
    return dir === 'ASC'
      ? sql`
          SELECT dn.id, dn.title, dn.content, dn.version, dn.author_id, dn.pinned, dn.created_at, dn.updated_at,
                 u.username AS author_username
          FROM developer_notes dn
          LEFT JOIN users u ON u.id = dn.author_id
          ORDER BY dn.pinned DESC, dn.created_at ASC, dn.id DESC
        `
      : sql`
          SELECT dn.id, dn.title, dn.content, dn.version, dn.author_id, dn.pinned, dn.created_at, dn.updated_at,
                 u.username AS author_username
          FROM developer_notes dn
          LEFT JOIN users u ON u.id = dn.author_id
          ORDER BY dn.pinned DESC, dn.created_at DESC, dn.id DESC
        `;
  }

  return dir === 'ASC'
    ? sql`
        SELECT dn.id, dn.title, dn.content, dn.version, dn.author_id, dn.pinned, dn.created_at, dn.updated_at,
               u.username AS author_username
        FROM developer_notes dn
        LEFT JOIN users u ON u.id = dn.author_id
        ORDER BY dn.pinned DESC, dn.created_at ASC, dn.id DESC
      `
    : sql`
        SELECT dn.id, dn.title, dn.content, dn.version, dn.author_id, dn.pinned, dn.created_at, dn.updated_at,
               u.username AS author_username
        FROM developer_notes dn
        LEFT JOIN users u ON u.id = dn.author_id
        ORDER BY dn.pinned DESC, dn.created_at DESC, dn.id DESC
      `;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  const rawPath = (req.url || '').split('?')[0];
  const sql = getDb();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;

  if (req.method === 'GET' && rawPath === '/api/developer-notes') {
    const qs = new URL(req.url, 'http://localhost').searchParams;
    const sort = ALLOWED_SORT.includes(qs.get('sort')) ? qs.get('sort') : 'created_at';
    const dir = ALLOWED_DIR.includes((qs.get('dir') || '').toUpperCase())
      ? qs.get('dir').toUpperCase()
      : 'DESC';
    const notes = await buildListQuery(sql, sort, dir);
    return res.status(200).json({ notes });
  }

  const noteMatch = rawPath.match(/^\/api\/developer-notes\/(\d+)$/);
  const noteUpdateMatch = rawPath.match(/^\/api\/developer-notes\/(\d+)\/update$/);

  if (req.method === 'GET' && noteMatch) {
    const id = parseInt(noteMatch[1], 10);
    const rows = await sql`
      SELECT dn.id, dn.title, dn.content, dn.version, dn.author_id, dn.pinned, dn.created_at, dn.updated_at,
             u.username AS author_username
      FROM developer_notes dn
      LEFT JOIN users u ON u.id = dn.author_id
      WHERE dn.id = ${id}
      LIMIT 1
    `;
    if (!rows.length) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '개발자 노트를 찾을 수 없습니다.',
        reason: '대상 노트가 없거나 이미 삭제되었습니다.',
        action: '목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }
    return res.status(200).json({ note: rows[0] });
  }

  if (req.method === 'POST' && rawPath === '/api/developer-notes') {
    const decoded = requireAdmin(req, res);
    if (!decoded) return;

    const body = req.body || {};
    const title = String(body.title || '').trim();
    const content = String(body.content || '').trim();
    const version = String(body.version || '').trim() || null;
    const pinned = normalizePinned(body.pinned);

    if (!title || !content) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: 'title과 content는 필수입니다.',
        reason: '개발자 노트 생성에 필요한 값이 누락되었습니다.',
        action: '제목과 내용을 입력한 뒤 다시 시도하세요.',
      });
    }

    const rows = await sql`
      INSERT INTO developer_notes (title, content, version, author_id, pinned)
      VALUES (${title}, ${content}, ${version}, ${decoded.sub}, ${pinned})
      RETURNING id, title, content, version, author_id, pinned, created_at, updated_at
    `;

    await insertAuditLog({
      userId: decoded.sub,
      action: 'developer_note_created',
      target: String(rows[0].id),
      ipAddress: ip,
      result: 'success',
      metadata: { title, pinned, version },
    });

    return res.status(201).json({ note: rows[0] });
  }

  if ((req.method === 'PATCH' && noteMatch) || (req.method === 'POST' && noteUpdateMatch)) {
    const decoded = requireAdmin(req, res);
    if (!decoded) return;

    const id = parseInt((noteMatch || noteUpdateMatch)[1], 10);
    const body = req.body || {};
    const hasTitle = body.title !== undefined;
    const hasContent = body.content !== undefined;
    const hasVersion = body.version !== undefined;
    const hasPinned = body.pinned !== undefined;

    if (!hasTitle && !hasContent && !hasVersion && !hasPinned) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: '변경할 항목이 없습니다.',
        reason: '업데이트 가능한 필드가 요청 본문에 포함되지 않았습니다.',
        action: 'title, content, version, pinned 중 하나 이상을 전달하세요.',
      });
    }

    const title = hasTitle ? String(body.title || '').trim() : null;
    const content = hasContent ? String(body.content || '').trim() : null;
    const version = hasVersion ? (String(body.version || '').trim() || null) : null;
    const pinned = hasPinned ? normalizePinned(body.pinned) : false;

    if (hasTitle && !title) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: 'title은 비워둘 수 없습니다.',
        reason: '제목이 빈 문자열이면 노트를 식별하기 어렵습니다.',
        action: '제목을 입력한 뒤 다시 시도하세요.',
      });
    }
    if (hasContent && !content) {
      return respondError(req, res, 400, {
        code: 'VALIDATION_FAILED',
        message: 'content는 비워둘 수 없습니다.',
        reason: '본문이 비어 있으면 노트 내용을 표시할 수 없습니다.',
        action: '내용을 입력한 뒤 다시 시도하세요.',
      });
    }

    const rows = await sql`
      UPDATE developer_notes
      SET
        title = CASE WHEN ${hasTitle} THEN ${title} ELSE title END,
        content = CASE WHEN ${hasContent} THEN ${content} ELSE content END,
        version = CASE WHEN ${hasVersion} THEN ${version} ELSE version END,
        pinned = CASE WHEN ${hasPinned} THEN ${pinned} ELSE pinned END,
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, title, content, version, author_id, pinned, created_at, updated_at
    `;

    if (!rows.length) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '개발자 노트를 찾을 수 없습니다.',
        reason: '수정 대상 노트가 없거나 이미 삭제되었습니다.',
        action: '목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }

    await insertAuditLog({
      userId: decoded.sub,
      action: 'developer_note_updated',
      target: String(id),
      ipAddress: ip,
      result: 'success',
      metadata: { hasTitle, hasContent, hasVersion, hasPinned },
    });

    return res.status(200).json({ note: rows[0] });
  }

  if (req.method === 'DELETE' && noteMatch) {
    const decoded = requireAdmin(req, res);
    if (!decoded) return;

    const id = parseInt(noteMatch[1], 10);
    const rows = await sql`
      DELETE FROM developer_notes
      WHERE id = ${id}
      RETURNING id, title
    `;

    if (!rows.length) {
      return respondError(req, res, 404, {
        code: 'RESOURCE_NOT_FOUND',
        message: '개발자 노트를 찾을 수 없습니다.',
        reason: '삭제 대상 노트가 없거나 이미 삭제되었습니다.',
        action: '목록을 새로고침한 뒤 다시 시도하세요.',
      });
    }

    await insertAuditLog({
      userId: decoded.sub,
      action: 'developer_note_deleted',
      target: String(id),
      ipAddress: ip,
      result: 'success',
      metadata: { title: rows[0].title },
    });

    return res.status(200).json({ ok: true });
  }

  if (rawPath === '/api/developer-notes' || noteMatch || noteUpdateMatch) {
    return methodNotAllowed(req, res, ['GET', 'POST', 'PATCH', 'DELETE']);
  }

  return respondError(req, res, 404, {
    code: 'RESOURCE_NOT_FOUND',
    message: '요청한 개발자 노트 경로를 찾을 수 없습니다.',
    reason: '등록되지 않은 개발자 노트 API 경로입니다.',
    action: '호출 경로를 다시 확인하세요.',
  });
};
