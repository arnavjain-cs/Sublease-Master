import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db, publicUser } from './db.js';

const cookieName = 'sm_session';
const sessionDays = 30;

export function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function checkPassword(password, stored) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected) return false;
  const actual = scryptSync(password, salt, 64);
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actual.length === expectedBuffer.length && timingSafeEqual(actual, expectedBuffer);
}

function getCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const cookie of raw.split(';')) {
    const [key, ...value] = cookie.trim().split('=');
    if (key === name) return decodeURIComponent(value.join('='));
  }
  return null;
}

export async function currentUser(req) {
  const token = getCookie(req, cookieName);
  if (!token) return null;
  const row = await db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND datetime(s.expires_at) > CURRENT_TIMESTAMP
  `).get(hash(token));
  return row || null;
}

export async function attachUser(req, _res, next) {
  try {
    req.user = await currentUser(req);
    next();
  } catch (error) { next(error); }
}

export function requireUser(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
  next();
}

export function requireVerified(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Sign in to continue.' });
  if (!req.user.verified_at) return res.status(403).json({ error: 'Verify your school email to continue.', code: 'EMAIL_UNVERIFIED' });
  next();
}

export async function createSession(res, userId) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionDays * 86400_000).toISOString();
  await db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(hash(token), userId, expiresAt);
  res.cookie(cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: sessionDays * 86400_000,
  });
}

export async function clearSession(req, res) {
  const token = getCookie(req, cookieName);
  if (token) await db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(hash(token));
  res.clearCookie(cookieName, { path: '/' });
}

export function userResponse(user) {
  return { user: publicUser(user) };
}
