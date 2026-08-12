import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Sets ctx_biz and ctx_shop cookies to persist active context
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const biz = body.business_id ? String(body.business_id) : '';
    const shop = body.shop_id ? String(body.shop_id) : '';

    const res = NextResponse.json({ ok: true });
    const maxAge = 60 * 60 * 24 * 7; // 7 days
    if (biz) res.cookies.set('ctx_biz', biz, { path: '/', httpOnly: false, sameSite: 'lax', maxAge });
    else res.cookies.set('ctx_biz', '', { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 0 });
    if (shop) res.cookies.set('ctx_shop', shop, { path: '/', httpOnly: false, sameSite: 'lax', maxAge });
    else res.cookies.set('ctx_shop', '', { path: '/', httpOnly: false, sameSite: 'lax', maxAge: 0 });
    return res;
  } catch (e) {
    return NextResponse.json({ error: 'Bad Request' }, { status: 400 });
  }
}
