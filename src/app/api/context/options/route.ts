import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getUserMemberships, isSuperadmin } from '@/lib/permissions';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Returns accessible businesses and their shops for the logged-in user
export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser(req);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    let businessRows: { id: string; name: string }[] = [];
    if (isSuperadmin(me)) {
      const { rows } = await query<{ id: string; name: string }>(`SELECT id, name FROM businesses ORDER BY created_at ASC LIMIT 200`);
      businessRows = rows;
    } else {
      const memberships = await getUserMemberships(me.id);
      const ids = memberships.map(m => m.business_id);
      if (ids.length) {
        const { rows } = await query<{ id: string; name: string }>(
          `SELECT id, name FROM businesses WHERE id = ANY($1::uuid[]) ORDER BY created_at ASC`,
          [ids]
        );
        businessRows = rows;
      }
    }

    // Load shops grouped by business
    let shopsByBiz: Record<string, { id: string; name: string }[]> = {};
    if (businessRows.length) {
      const ids = businessRows.map(b => b.id);
      const { rows: shops } = await query<{ id: string; name: string; business_id: string }>(
        `SELECT id, name, business_id FROM shops WHERE business_id = ANY($1::uuid[]) ORDER BY created_at ASC`,
        [ids]
      );
      for (const s of shops) {
        shopsByBiz[s.business_id] = shopsByBiz[s.business_id] || [];
        shopsByBiz[s.business_id].push({ id: s.id, name: s.name });
      }
    }

    return NextResponse.json({ data: { businesses: businessRows, shopsByBiz } });
  } catch (e) {
    console.error('GET /api/context/options failed', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
