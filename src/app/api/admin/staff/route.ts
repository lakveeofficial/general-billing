import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { getUserMemberships, isSuperadmin } from '@/lib/permissions';

export const dynamic = 'force-dynamic';

// List staff within the ADMIN's business scope, optional shopId filter
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser(req);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(isSuperadmin(me) || me.role === 'ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get('businessId') || undefined;
    const shopId = searchParams.get('shopId') || undefined;

    let allowedBusinessIds: string[] = [];
    if (isSuperadmin(me)) {
      if (businessId) allowedBusinessIds = [businessId];
      else {
        const { rows } = await query<{ id: string }>(`SELECT id FROM businesses ORDER BY created_at ASC`);
        allowedBusinessIds = rows.map(r => r.id);
      }
    } else {
      const memberships = await getUserMemberships(me.id);
      allowedBusinessIds = memberships.map(m => m.business_id);
      if (businessId && !allowedBusinessIds.includes(businessId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const params: any[] = [];
    const where: string[] = [];
    if (businessId) {
      params.push(businessId);
      where.push(`m.business_id = $${params.length}`);
    } else if (allowedBusinessIds.length) {
      // IN clause
      const idxs = allowedBusinessIds.map((_, i) => `$${i + 1}`).join(',');
      where.push(`m.business_id IN (${idxs})`);
      params.push(...allowedBusinessIds);
    }
    if (shopId) {
      params.push(shopId);
      where.push(`(m.shop_id = $${params.length} OR m.shop_id IS NULL)`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT u.id, u.name, u.email,
              m.id AS membership_id, m.role, m.business_id, m.shop_id,
              m.can_delete_invoices, m.can_delete_products, m.can_manage_products, m.can_view_reports,
              s.name AS shop_name
       FROM memberships m
       JOIN users u ON u.id = m.user_id
       LEFT JOIN shops s ON s.id = m.shop_id
       ${whereSql}
       AND m.role = 'STAFF'
       ORDER BY u.created_at DESC
       LIMIT 200`,
      params
    );

    return NextResponse.json({ data: rows });
  } catch (err) {
    console.error('GET /api/admin/staff failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
