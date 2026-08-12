import { NextRequest, NextResponse } from 'next/server';
import { destroySession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const token = req.cookies.get('session')?.value;
    if (token) {
      await destroySession(token);
    }
    const res = NextResponse.json({ success: true });
    res.cookies.set('session', '', { path: '/', maxAge: 0 });
    res.cookies.set('force_reset', '', { path: '/', maxAge: 0 });
    return res;
  } catch (err) {
    console.error('POST /api/auth/logout failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
