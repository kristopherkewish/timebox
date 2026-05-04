import { argon2id } from '@noble/hashes/argon2';
import { eq } from 'drizzle-orm';
import { session, user, userSettings } from './schema';
import { getDb } from './db';
import { randomToken, uuid } from './ids';
import type { Env } from '../types';
import type { DB } from './db';

const ARGON_OPTS = { t: 2, m: 4096, p: 1, dkLen: 32 };
const SESSION_DURATION_REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;
const SESSION_DURATION_DEFAULT_MS = 24 * 60 * 60 * 1000;

const enc = new TextEncoder();

function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function hashPassword(password: string): string {
  const salt = new Uint8Array(16);
  crypto.getRandomValues(salt);
  const hash = argon2id(enc.encode(password), salt, ARGON_OPTS);
  return `argon2id$${ARGON_OPTS.t}$${ARGON_OPTS.m}$${ARGON_OPTS.p}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split('$');
  if (parts.length !== 6 || parts[0] !== 'argon2id') return false;
  const t = Number(parts[1]);
  const m = Number(parts[2]);
  const p = Number(parts[3]);
  if (!Number.isFinite(t) || !Number.isFinite(m) || !Number.isFinite(p)) return false;
  const salt = hexToBytes(parts[4]);
  const expected = hexToBytes(parts[5]);
  const computed = argon2id(enc.encode(password), salt, { t, m, p, dkLen: expected.length });
  return constantTimeEqual(computed, expected);
}

export const SESSION_COOKIE = 'sid';

export interface CreatedSession {
  id: string;
  expiresAt: number;
  cookie: string;
}

export async function createSession(
  db: DB,
  userId: string,
  rememberMe: boolean,
): Promise<CreatedSession> {
  const id = randomToken(32);
  const now = Date.now();
  const expiresAt = now + (rememberMe ? SESSION_DURATION_REMEMBER_MS : SESSION_DURATION_DEFAULT_MS);
  await db.insert(session).values({ id, userId, expiresAt, createdAt: now });
  const maxAge = rememberMe ? Math.floor(SESSION_DURATION_REMEMBER_MS / 1000) : undefined;
  const parts = [
    `${SESSION_COOKIE}=${id}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
  ];
  if (maxAge !== undefined) parts.push(`Max-Age=${maxAge}`);
  return { id, expiresAt, cookie: parts.join('; ') };
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export function readCookie(req: Request, name: string): string | null {
  const header = req.headers.get('Cookie');
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    const k = part.slice(0, eq).trim();
    if (k === name) return part.slice(eq + 1).trim();
  }
  return null;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  username: string;
}

export async function readSession(
  db: DB,
  req: Request,
): Promise<{ user: AuthenticatedUser; sessionId: string } | null> {
  const sid = readCookie(req, SESSION_COOKIE);
  if (!sid) return null;
  const row = await db
    .select({
      id: user.id,
      email: user.email,
      username: user.username,
      expiresAt: session.expiresAt,
    })
    .from(session)
    .innerJoin(user, eq(session.userId, user.id))
    .where(eq(session.id, sid))
    .get();
  if (!row) return null;
  if (row.expiresAt <= Date.now()) {
    await db.delete(session).where(eq(session.id, sid));
    return null;
  }
  return {
    user: { id: row.id, email: row.email, username: row.username },
    sessionId: sid,
  };
}

export async function deleteSession(db: DB, sessionId: string): Promise<void> {
  await db.delete(session).where(eq(session.id, sessionId));
}

export async function deleteOtherSessions(db: DB, userId: string, keep: string): Promise<void> {
  const all = await db.select().from(session).where(eq(session.userId, userId)).all();
  for (const s of all) {
    if (s.id !== keep) {
      await db.delete(session).where(eq(session.id, s.id));
    }
  }
}

export async function createUser(
  env: Env,
  args: { email: string; username: string; password: string },
): Promise<AuthenticatedUser> {
  const db = getDb(env);
  const id = uuid();
  const now = Date.now();
  await db.insert(user).values({
    id,
    email: args.email,
    username: args.username,
    passwordHash: hashPassword(args.password),
    createdAt: now,
  });
  await db.insert(userSettings).values({ userId: id });
  return { id, email: args.email, username: args.username };
}
