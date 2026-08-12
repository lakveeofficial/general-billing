import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, hashPassword } from '@/lib/auth';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser(req);
    if (!me || me.role !== 'SUPERADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    const body = await req.json().catch(() => ({}));
    const name = (body.name ?? '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    let temp_password = String(body.temp_password || '');
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });

    // Ensure unique
    const { rows: existing } = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing[0]) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });

    // Auto-generate temp password if not provided
    if (!temp_password) {
      temp_password = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    }
    const password_hash = await hashPassword(temp_password);

    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, must_reset_password, is_active)
       VALUES ($1,$2,$3,'ADMIN', true, true)
       RETURNING id, name, email, role, must_reset_password`,
      [name || null, email, password_hash]
    );

    return NextResponse.json({ data: rows[0], generated_temp_password: temp_password }, { status: 201 });
  } catch (e) {
    console.error('POST /api/superadmin/admins failed', e);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
