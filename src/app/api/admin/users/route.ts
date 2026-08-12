import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getSessionUser, hashPassword } from '@/lib/auth';
import { getUserMemberships, isSuperadmin } from '@/lib/permissions';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const me = await getSessionUser(req);
    if (!me) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!(isSuperadmin(me) || me.role === 'ADMIN')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const name = (body.name ?? '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    let temp_password = String(body.temp_password || '');
    if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    // Auto-generate strong temporary password if not provided (16 chars base64url-like)
    if (!temp_password) {
      temp_password = crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
    }

    // Optional: ensure email unique
    const { rows: existing } = await query<{ id: string }>(`SELECT id FROM users WHERE email = $1`, [email]);
    if (existing[0]) return NextResponse.json({ error: 'Email already in use' }, { status: 400 });

    // Only SUPERADMIN can freely create users; ADMIN must be scoped to a business via membership
    if (me.role === 'ADMIN' && !isSuperadmin(me)) {
      const memberships = await getUserMemberships(me.id);
      if (memberships.length === 0) return NextResponse.json({ error: 'No business scope' }, { status: 403 });
    }

    const password_hash = await hashPassword(temp_password);
    const { rows } = await query(
      `INSERT INTO users (name, email, password_hash, role, must_reset_password, is_active)
       VALUES ($1,$2,$3,'STAFF', true, true)
       RETURNING id, name, email, role, must_reset_password`,
      [name || null, email, password_hash]
    );

    // Return generated password once for admin to share securely
    return NextResponse.json({ data: rows[0], generated_temp_password: temp_password }, { status: 201 });
  } catch (err) {
    console.error('POST /api/admin/users failed', err);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
