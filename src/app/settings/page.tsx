import { query } from "@/lib/db";
import SettingsClient from "./SettingsClient";
import { cookies } from "next/headers";
import { getUserBySessionToken } from "@/lib/auth";
import { getUserMemberships, isSuperadmin } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function SettingsPage({ searchParams }: { searchParams: { [key: string]: string | string[] | undefined } }) {
  // Require ADMIN or SUPERADMIN
  const token = (await cookies()).get("session")?.value;
  const me = token ? await getUserBySessionToken(token) : null;
  const allowed = me && (me.role === "ADMIN" || me.role === "SUPERADMIN");
  if (!allowed) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 text-amber-900 p-4 text-sm">
          Access restricted. Only Admins can access Settings.
        </div>
      </div>
    );
  }

  // Determine business scope
  const requestedBiz = (Array.isArray(searchParams?.businessId) ? searchParams?.businessId[0] : searchParams?.businessId) || (await cookies()).get('ctx_biz')?.value || null;
  let businessId: string | null = null;
  if (me && isSuperadmin(me)) {
    const { rows: businesses } = await query<{ id: string }>(
      `SELECT id FROM businesses ORDER BY id ASC LIMIT 1`
    );
    businessId = (requestedBiz as string) || businesses[0]?.id || null;
  } else if (me) {
    const memberships = await getUserMemberships(me.id);
    const allowed = memberships.map(m => m.business_id);
    if (requestedBiz && allowed.includes(requestedBiz)) businessId = requestedBiz;
    else businessId = memberships[0]?.business_id || null;
  }

  let shopId: string | null = (await cookies()).get('ctx_shop')?.value || null;
  if (businessId) {
    // Ensure ctx_shop belongs to business, else pick first
    if (shopId) {
      const { rows: chk } = await query<{ id: string }>(`SELECT id FROM shops WHERE id = $1 AND business_id = $2`, [shopId, businessId]);
      if (!chk[0]) shopId = null;
    }
    if (!shopId) {
      const { rows: shops } = await query<{ id: string }>(
        `SELECT id FROM shops WHERE business_id = $1 ORDER BY id ASC LIMIT 1`,
        [businessId]
      );
      shopId = shops[0]?.id || null;
    }
  }

  if (!businessId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 text-amber-900 p-4 text-sm">
          No business found in your scope.
        </div>
      </div>
    );
  }

  // fetch details for forms
  const [{ rows: bizRows }, { rows: shopRows }] = await Promise.all([
    query<{
      id: string;
      name: string;
      legal_name: string | null;
      gst_number: string | null;
      email: string | null;
      phone: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
      pincode: string | null;
      currency: string;
      default_tax_type: string;
      default_tax_rate: number;
      default_hsn: string | null;
      invoice_prefix: string;
      invoice_next_number: number;
      invoice_number_padding: number;
      brand_logo: string | null;
      brand_color: string | null;
    }>(
      `SELECT id, name, legal_name, gst_number, email, phone, address, city, state, country, pincode, currency,
              default_tax_type, default_tax_rate, default_hsn,
              invoice_prefix, invoice_next_number, invoice_number_padding,
              brand_logo, brand_color
       FROM businesses WHERE id = $1`,
      [businessId]
    ),
    shopId
      ? query<{
          id: string;
          business_id: string;
          name: string;
          address: string | null;
          phone: string | null;
          email: string | null;
        }>(
          `SELECT id, business_id, name, address, phone, email FROM shops WHERE id = $1`,
          [shopId]
        )
      : Promise.resolve({ rows: [] as any[] }),
  ]);

  const business = bizRows[0];
  const shop = shopRows[0] || null;

  // Build accessible business list for quick switching
  let accessible: { id: string; name: string }[] = [];
  if (me && isSuperadmin(me)) {
    const { rows } = await query<{ id: string; name: string }>(`SELECT id, name FROM businesses ORDER BY created_at ASC LIMIT 50`);
    accessible = rows;
  } else if (me) {
    const memberships = await getUserMemberships(me.id);
    const ids = memberships.map(m => m.business_id);
    if (ids.length) {
      const { rows } = await query<{ id: string; name: string }>(`SELECT id, name FROM businesses WHERE id = ANY($1::uuid[])`, [ids]);
      accessible = rows;
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      {accessible.length > 1 && (
        <div className="text-sm text-zinc-600 dark:text-zinc-300 flex flex-wrap gap-2 items-center">
          <span>Select business:</span>
          {accessible.map(b => (
            <a key={b.id} href={`?businessId=${b.id}`} className={`inline-flex items-center rounded border px-2 py-1 ${b.id === businessId ? 'bg-indigo-600 text-white border-indigo-600' : 'border-zinc-300 dark:border-zinc-700'}`}>{b.name}</a>
          ))}
        </div>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Configure business, shop, taxes, and invoice preferences.</p>
      <SettingsClient business={business} shop={shop} />
    </div>
  );
}
