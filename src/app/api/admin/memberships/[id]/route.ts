import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getUserMemberships, isSuperadmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// Update membership flags within ADMIN's scope
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const me = await getSessionUser(req);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(isSuperadmin(me) || me.role === 'ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const id = params.id;
    const body = await req.json().catch(() => ({}));

    // Load target membership to verify scope
    const { rows: mrows } = await query<{ id: string; business_id: string }>(
      `SELECT id, business_id FROM memberships WHERE id = $1 LIMIT 1`,
      [id]
    );
    const target = mrows[0];
    if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!isSuperadmin(me)) {
      const memberships = await getUserMemberships(me.id);
      const canEdit = memberships.some(m => m.business_id === target.business_id);
      if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const patch: string[] = [];
    const values: any[] = [];
    if (typeof body.can_delete_invoices === 'boolean') { values.push(body.can_delete_invoices); patch.push(`can_delete_invoices = $${values.length}`); }
    if (typeof body.can_delete_products === 'boolean') { values.push(body.can_delete_products); patch.push(`can_delete_products = $${values.length}`); }
    if (typeof body.can_manage_products === 'boolean') { values.push(body.can_manage_products); patch.push(`can_manage_products = $${values.length}`); }
    if (typeof body.can_view_reports === 'boolean') { values.push(body.can_view_reports); patch.push(`can_view_reports = $${values.length}`); }

    if (patch.length === 0) return NextResponse.json({ error: 'No changes' }, { status: 400 });
    values.push(id);

    const { rows } = await query(
      `UPDATE memberships SET ${patch.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );

    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error('PUT /api/admin/memberships/[id] failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
