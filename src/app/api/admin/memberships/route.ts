import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getUserMemberships, isSuperadmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Create a membership for a user within the ADMIN's business/shop scope
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser(req);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(isSuperadmin(me) || me.role === 'ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const user_id = String(body.user_id || '');
    const role = String(body.role || 'STAFF');
    const business_id = String(body.business_id || '');
    const shop_id = body.shop_id ? String(body.shop_id) : null;

    if (!user_id || !business_id) {
      return NextResponse.json({ error: 'user_id and business_id are required' }, { status: 400 });
    }

    if (!isSuperadmin(me)) {
      // Ensure the admin has scope over this business (and shop if provided)
      const memberships = await getUserMemberships(me.id);
      const hasBiz = memberships.some(m => m.business_id === business_id && (m.shop_id === null || !shop_id || m.shop_id === shop_id));
      if (!hasBiz) return NextResponse.json({ error: 'Forbidden: out of scope' }, { status: 403 });
    }

    if (shop_id) {
      // Validate shop belongs to business
      const { rows: s } = await query<{ id: string }>(`SELECT id FROM shops WHERE id = $1 AND business_id = $2`, [shop_id, business_id]);
      if (!s[0]) return NextResponse.json({ error: 'Invalid shop for business' }, { status: 400 });
    }

    const { rows } = await query(
      `INSERT INTO memberships (user_id, business_id, shop_id, role)
       VALUES ($1,$2,$3,$4)
       RETURNING id, user_id, business_id, shop_id, role`,
      [user_id, business_id, shop_id, role]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/memberships failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
