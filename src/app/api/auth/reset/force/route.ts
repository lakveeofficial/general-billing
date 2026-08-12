import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { clearSessionCookie, createSession, getSessionUser, hashPassword, setSessionCookie } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const new_password = String(body.new_password || '');

    if (!new_password || new_password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const me = await getSessionUser(req);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure user is required to reset or allow regardless
    if (!me.must_reset_password) {
      return NextResponse.json({ success: true });
    }

    const password_hash = await hashPassword(new_password);
    await pool.query(
      `UPDATE users SET password_hash = $1, must_reset_password = false, updated_at = now() WHERE id = $2`,
      [password_hash, me.id]
    );

    // Rotate session
    const token = await createSession(me.id, 7);
    const res = NextResponse.json({ success: true });
    await setSessionCookie(token);
    // Clear force_reset cookie if present
    res.cookies.set('force_reset', '', { path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('POST /api/auth/reset/force failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
