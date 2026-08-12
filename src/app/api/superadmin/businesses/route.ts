import { NextRequest, NextResponse } from 'next/server';
import { pool, query } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const me = await getSessionUser(req);
    if (!me || me.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const { rows } = await query(`SELECT id, name, created_at FROM businesses ORDER BY created_at DESC LIMIT 200`);
    return NextResponse.json({ data: rows });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser(req);
    if (!me || me.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const name = String(body.name || '').trim();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const { rows } = await query(
      `INSERT INTO businesses (name) VALUES ($1) RETURNING id, name, created_at`,
      [name]
    );
    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
