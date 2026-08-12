import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getUserMemberships } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser(req);
    if (!me) return NextResponse.json({ user: null, memberships: [] });
    const memberships = await getUserMemberships(me.id);
    return NextResponse.json({ user: me, memberships });
  } catch (e) {
    return NextResponse.json({ user: null, memberships: [] });
  }
}
