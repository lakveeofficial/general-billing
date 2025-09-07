import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  async function load() {
    // Determine default business (first created)
    const { rows: businesses } = await query<{ id: string }>(
      `SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1`
    );
    const businessId = businesses[0]?.id || null;

    if (!businessId) {
      return {
        businessId: null,
        todaySales: 0,
        outstanding: 0,
        invoicesCount: 0,
        customersCount: 0,
        overdue: { count: 0, amount: 0 },
        recent: [],
        sales7: [],
        topCustomers: [],
      } as const;
    }

    const [
      // Today sales from payments
      { rows: todayRows },
      // Outstanding = sum(grand_total - amount_paid) for active invoices
      { rows: outRows },
      // Counts
      { rows: invCntRows },
      { rows: custCntRows },
      // Overdue summary
      { rows: overdueRows },
      // Recent invoices
      { rows: recentRows },
      // Sales last 7 days by payment date
      { rows: sales7Rows },
      // Top customers last 30 days by payments
      { rows: topCustRows },
    ] = await Promise.all([
      query<{ total: string }>(
        `SELECT COALESCE(SUM(p.amount), 0)::text AS total
         FROM payments p
         JOIN invoices i ON i.id = p.invoice_id
         WHERE i.business_id = $1 AND CAST(p.paid_at AS date) = CURRENT_DATE`,
        [businessId]
      ),
      query<{ amount: string }>(
        `SELECT COALESCE(SUM(i.grand_total - i.amount_paid), 0)::text AS amount
         FROM invoices i
         WHERE i.business_id = $1 AND i.status IN ('ISSUED','OVERDUE','PARTIALLY_PAID')`,
        [businessId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM invoices WHERE business_id = $1`,
        [businessId]
      ),
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM customers WHERE business_id = $1`,
        [businessId]
      ),
      query<{ count: string; amount: string }>(
        `SELECT COUNT(*)::text AS count, COALESCE(SUM(i.grand_total - i.amount_paid), 0)::text AS amount
         FROM invoices i
         WHERE i.business_id = $1 AND i.status = 'OVERDUE'`,
        [businessId]
      ),
      query<{ id: string; number: string; status: string; grand_total: number; amount_paid: number; customer_name: string | null; created_at: string }>(
        `SELECT i.id, i.number, i.status, i.grand_total, i.amount_paid, c.name AS customer_name, i.created_at
         FROM invoices i
         LEFT JOIN customers c ON c.id = i.customer_id
         WHERE i.business_id = $1
         ORDER BY i.created_at DESC
         LIMIT 8`,
        [businessId]
      ),
      query<{ d: string; total: string }>(
        `WITH days AS (
           SELECT generate_series(CURRENT_DATE - INTERVAL '6 day', CURRENT_DATE, INTERVAL '1 day')::date AS d
         )
         SELECT d::text, COALESCE(SUM(p.amount),0)::text AS total
         FROM days
         LEFT JOIN payments p ON CAST(p.paid_at AS date) = d
         LEFT JOIN invoices i ON i.id = p.invoice_id AND i.business_id = $1
         GROUP BY d
         ORDER BY d ASC`,
        [businessId]
      ),
      query<{ customer_id: string | null; customer_name: string | null; total: string }>(
        `SELECT i.customer_id, c.name AS customer_name, COALESCE(SUM(p.amount),0)::text AS total
         FROM payments p
         JOIN invoices i ON i.id = p.invoice_id AND i.business_id = $1
         LEFT JOIN customers c ON c.id = i.customer_id
         WHERE p.paid_at >= NOW() - INTERVAL '30 day'
         GROUP BY i.customer_id, c.name
         ORDER BY SUM(p.amount) DESC
         LIMIT 5`,
        [businessId]
      ),
    ]);

    const toNum = (s?: string) => Number(s || 0);

    return {
      businessId,
      todaySales: toNum(todayRows[0]?.total),
      outstanding: toNum(outRows[0]?.amount),
      invoicesCount: Number(invCntRows[0]?.count || 0),
      customersCount: Number(custCntRows[0]?.count || 0),
      overdue: { count: Number(overdueRows[0]?.count || 0), amount: toNum(overdueRows[0]?.amount) },
      recent: recentRows,
      sales7: sales7Rows.map(r => ({ date: r.d, total: toNum(r.total) })),
      topCustomers: topCustRows.map(r => ({ id: r.customer_id, name: r.customer_name || 'Walk-in / Unspecified', total: toNum(r.total) })),
    } as const;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      {/* Metrics */}
      <Metrics />
      {/* Reports */}
      <Reports />
    </div>
  );

  async function Metrics() {
    const data = await load();
    const fmt = (n: number) => `₹ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 border border-indigo-500/20">
          <div className="text-sm text-zinc-500">Today Sales</div>
          <div className="text-2xl font-bold">{fmt(data.todaySales)}</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
          <div className="text-sm text-zinc-500">Outstanding</div>
          <div className="text-2xl font-bold">{fmt(data.outstanding)}</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <div className="text-sm text-zinc-500">Invoices</div>
          <div className="text-2xl font-bold">{data.invoicesCount}</div>
        </div>
        <div className="p-4 rounded-xl bg-gradient-to-br from-sky-500/10 to-indigo-500/10 border border-sky-500/20">
          <div className="text-sm text-zinc-500">Customers</div>
          <div className="text-2xl font-bold">{data.customersCount}</div>
        </div>
      </div>
    );
  }

  async function Reports() {
    const data = await load();
    const fmt = (n: number) => `₹ ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Invoices */}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/40">
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 font-medium">Recent Invoices</div>
          <div className="divide-y divide-black/5 dark:divide-white/10">
            {data.recent.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500">No invoices yet.</div>
            ) : data.recent.map((r) => (
              <div key={r.id} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0">
                  <div className="font-medium truncate">#{r.number} • {r.customer_name || 'Walk-in / Unspecified'}</div>
                  <div className="text-zinc-500 text-xs">{new Date(r.created_at).toLocaleString()}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-medium">{fmt(Number(r.grand_total || 0))}</div>
                  <div className="text-xs text-zinc-500">Paid: {fmt(Number(r.amount_paid || 0))}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Overdue Summary + Top Customers */}
        <div className="grid gap-4">
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/40 p-4">
            <div className="font-medium mb-1">Overdue</div>
            <div className="text-sm text-zinc-600">{data.overdue.count} invoice(s)</div>
            <div className="text-2xl font-semibold mt-1">{fmt(data.overdue.amount)}</div>
          </div>
          <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/40">
            <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 font-medium">Top Customers (30 days)</div>
            <div className="divide-y divide-black/5 dark:divide-white/10">
              {data.topCustomers.length === 0 ? (
                <div className="p-4 text-sm text-zinc-500">No payments yet.</div>
              ) : data.topCustomers.map((c) => (
                <div key={c.id || 'none'} className="px-4 py-3 flex items-center justify-between gap-3 text-sm">
                  <div className="truncate">{c.name}</div>
                  <div className="font-medium">{fmt(c.total)}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Sales Last 7 Days */}
        <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/40 lg:col-span-2">
          <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 font-medium">Sales (Last 7 Days)</div>
          <div className="p-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 text-sm">
            {data.sales7.map((d) => (
              <div key={d.date} className="rounded-lg border border-black/5 dark:border-white/10 p-3">
                <div className="text-xs text-zinc-500">{new Date(d.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                <div className="mt-1 font-semibold">{fmt(d.total)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
}
