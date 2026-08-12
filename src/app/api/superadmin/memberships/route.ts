import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// SUPERADMIN: assign memberships (typically ADMIN) scoped to a business (and optional shop)
export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser(req);
    if (!me || me.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const user_id = String(body.user_id || '');
    const role = String(body.role || 'ADMIN');
    const business_id = String(body.business_id || '');
    const shop_id = body.shop_id ? String(body.shop_id) : null;

    if (!user_id || !business_id) return NextResponse.json({ error: 'user_id and business_id are required' }, { status: 400 });
    if (!['ADMIN','STAFF'].includes(role)) return NextResponse.json({ error: 'Invalid role' }, { status: 400 });

    if (shop_id) {
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
  } catch (e) {
    console.error('POST /api/superadmin/memberships failed', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
