import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { createSession, setSessionCookie, verifyPassword } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const password = String(body.password || '');
    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
    }

    const { rows } = await query<{ id: string; name: string | null; email: string; password_hash: string; role: string; is_active: boolean; must_reset_password: boolean }>(
      `SELECT id, name, email, password_hash, role, is_active, must_reset_password FROM users WHERE email = $1 LIMIT 1`,
      [email]
    );
    const user = rows[0];
    if (!user || !user.is_active) {
      // Generic error to avoid account enumeration
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.password_hash);
    if (!ok) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await createSession(user.id, 7);
    await setSessionCookie(token);

    const res = NextResponse.json({ success: true, mustReset: !!user.must_reset_password });
    if (user.must_reset_password) {
      res.cookies.set('force_reset', '1', { httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 });
    } else {
      res.cookies.set('force_reset', '', { path: '/', maxAge: 0 });
    }
    return res;
  } catch (err) {
    console.error('POST /api/auth/login failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
