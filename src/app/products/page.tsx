import { query } from "@/lib/db";
import ProductsClient from "./ProductsClient";

export default async function ProductsPage() {
  // Fetch a default business to scope products
  const { rows: businesses } = await query<{ id: string }>(
    `SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1`
  );
  const businessId = businesses[0]?.id;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Products</h1>
      <p className="text-sm text-zinc-600 dark:text-zinc-300">Manage medicines and general store items with tax rates.</p>
      {!businessId ? (
        <div className="rounded-xl border border-amber-300/50 bg-amber-50 text-amber-900 p-4 text-sm">
          No business found. Run the seed script to create a default business and shop:
          <pre className="mt-2 rounded bg-amber-100 p-2 text-xs">npx tsx scripts/seed.ts</pre>
        </div>
      ) : (
        <ProductsClient businessId={businessId} />
      )}
    </div>
  );
}
