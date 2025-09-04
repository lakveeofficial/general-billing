import { query } from "@/lib/db";
import NewInvoiceClient from "./NewInvoiceClient";

export default async function NewInvoicePage() {
  // Get default business and its first shop
  const { rows: businesses } = await query<{ id: string }>(
    `SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1`
  );
  const businessId = businesses[0]?.id || null;

  let shopId: string | null = null;
  if (businessId) {
    const { rows: shops } = await query<{ id: string }>(
      `SELECT id FROM shops WHERE business_id = $1 ORDER BY created_at ASC LIMIT 1`,
      [businessId]
    );
    shopId = shops[0]?.id || null;
  }

  // Fetch customers to choose from (optional)
  const { rows: customers } = await query<{ id: string; name: string }>(
    `SELECT id, name FROM customers ORDER BY created_at DESC LIMIT 200`
  );

  if (!businessId || !shopId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">New Invoice</h1>
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 text-amber-900 p-4 text-sm">
          No business/shop found. Run the seed script to create defaults:
          <pre className="mt-2 rounded bg-amber-100 p-2 text-xs">npx tsx scripts/seed.ts</pre>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">New Invoice</h1>
      </div>
      <NewInvoiceClient
        businessId={businessId}
        shopId={shopId}
        customers={customers}
      />
    </div>
  );
}
