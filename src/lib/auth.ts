import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { pool, query } from '@/lib/db';

export type SessionUser = {
  id: string;
  name: string | null;
  email: string;
  role: 'SUPERADMIN' | 'ADMIN' | 'STAFF' | string;
  is_active: boolean;
  must_reset_password: boolean;
};

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32);
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  try {
    const [algo, saltHex, hashHex] = stored.split(':');
    if (algo !== 'scrypt' || !saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(expected, derived);
  } catch {
    return false;
  }
}

export async function createSession(userId: string, ttlDays = 7): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO user_sessions (user_id, token, expires_at, created_at) VALUES ($1,$2,$3, now())`,
    [userId, token, expiresAt]
  );
  return token;
}

export async function destroySession(token: string): Promise<void> {
  await pool.query(`DELETE FROM user_sessions WHERE token = $1`, [token]);
}

export async function getUserBySessionToken(token: string): Promise<SessionUser | null> {
  const { rows } = await query<SessionUser & { role: string }>(
    `SELECT u.id, u.name, u.email, u.role, u.is_active, u.must_reset_password
     FROM user_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token = $1 AND s.expires_at > now()
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get('session')?.value;
  if (!token) return null;
  return await getUserBySessionToken(token);
}

export async function setSessionCookie(token: string) {
  // usable in server actions/route handlers after mutation
  const c = await cookies();
  c.set('session', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.set('session', '', { path: '/', maxAge: 0 });
}
