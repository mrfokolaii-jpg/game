import crypto from 'node:crypto';
import { createSession, getSession } from '../store.js';

const COOKIE_NAME = 'ic_session';

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1) out[part.slice(0, idx).trim()] = decodeURIComponent(part.slice(idx + 1).trim());
  }
  return out;
}

/** سشن سبک بدون وابستگی خارجی؛ شناسه در کوکی امضانشده اما تصادفی (۲۵۶ بیت) */
export function sessionMiddleware(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  let id = cookies[COOKIE_NAME];
  if (!id || !getSession(id)) {
    id = crypto.randomBytes(32).toString('hex');
    createSession(id);
    res.setHeader('Set-Cookie',
      `${COOKIE_NAME}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`);
  }
  req.sessionId = id;
  next();
}
