import { query } from "@/lib/db";
import SettingsClient from "./SettingsClient";

export default async function SettingsPage() {
  // Get first business and its first shop for editing defaults
  const { rows: businesses } = await query<{ id: string }>(
    `SELECT id FROM businesses ORDER BY id ASC LIMIT 1`
  );
  const businessId = businesses[0]?.id || null;

  let shopId: string | null = null;
  if (businessId) {
    const { rows: shops } = await query<{ id: string }>(
      `SELECT id FROM shops WHERE business_id = $1 ORDER BY id ASC LIMIT 1`,
      [businessId]
    );
    shopId = shops[0]?.id || null;
  }

  if (!businessId) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 text-amber-900 p-4 text-sm">
          No business found. Run the seed script to create defaults:
          <pre className="mt-2 rounded bg-amber-100 p-2 text-xs">npx tsx scripts/seed.ts</pre>
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Configure business, shop, taxes, and invoice preferences.</p>
      <SettingsClient business={business} shop={shop} />
    </div>
  );
}
