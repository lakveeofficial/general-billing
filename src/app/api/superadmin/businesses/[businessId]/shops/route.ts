import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: { businessId: string } }) {
  try {
    const me = await getSessionUser(req);
    if (!me || me.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const businessId = params.businessId;
    const { rows } = await query(`SELECT id, name, phone, email, address, created_at FROM shops WHERE business_id = $1 ORDER BY created_at DESC`, [businessId]);
    return NextResponse.json({ data: rows });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { businessId: string } }) {
  try {
    const me = await getSessionUser(req);
    if (!me || me.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const businessId = params.businessId;
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    const phone = body.phone ? String(body.phone) : null;
    const email = body.email ? String(body.email) : null;
    const address = body.address ? String(body.address) : null;
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const { rows } = await query(
      `INSERT INTO shops (business_id, name, phone, email, address) VALUES ($1,$2,$3,$4,$5) RETURNING id, name, phone, email, address, created_at`,
      [businessId, name, phone, email, address]
    );
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
