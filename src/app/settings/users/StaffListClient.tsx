"use client";

import { useEffect, useState } from "react";

export default function StaffListClient({ businessId }: { businessId: string }) {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const url = new URL('/api/admin/staff', window.location.origin);
        // Let server infer allowed businesses from memberships; do not pass businessId to avoid 403 if out of scope
        const res = await fetch(url.toString(), { cache: 'no-store' });
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(j?.error || `Failed (${res.status})`);
        setRows(j?.data || []);
        setErr(null);
      } catch {
        setErr('Failed to load staff (insufficient permissions or no data).');
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [businessId]);

  if (loading) {
    return <div className="p-4 text-sm text-zinc-500">Loading…</div>;
  }

  async function toggleFlag(membership_id: string, field: 'can_delete_invoices' | 'can_delete_products' | 'can_manage_products' | 'can_view_reports', value: boolean) {
    setSavingId(membership_id);
    // Optimistic update
    setRows(prev => prev.map(r => r.membership_id === membership_id ? { ...r, [field]: value } : r));
    try {
      const res = await fetch(`/api/admin/memberships/${membership_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      if (!res.ok) {
        throw new Error('Failed to update');
      }
    } catch {
      // Revert on error
      setRows(prev => prev.map(r => r.membership_id === membership_id ? { ...r, [field]: !value } : r));
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      {err && <div className="p-3 text-sm rounded border border-amber-300 bg-amber-50 text-amber-800 mb-2">{err}</div>}
      <div className="divide-y divide-black/5 dark:divide-white/10">
        {rows.length === 0 ? (
          <div className="p-4 text-sm text-zinc-500">No staff yet.</div>
        ) : rows.map((r) => (
          <div key={r.id + (r.shop_id || '')} className="px-4 py-3 grid grid-cols-1 md:grid-cols-4 gap-3 text-sm items-center">
            <div className="min-w-0">
              <div className="font-medium">{r.name || r.email}</div>
              <div className="text-xs text-zinc-500">{r.email}</div>
            </div>
            <div className="text-xs sm:text-sm whitespace-nowrap">
              <span className="inline-flex items-center gap-1 rounded-full border border-zinc-300 px-2 py-0.5">{r.role}</span>
              <div className="mt-1 text-[11px] text-zinc-500">{r.shop_id ? (r.shop_name || 'Shop-scoped') : 'Business-wide'}</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!!r.can_view_reports} onChange={(e) => toggleFlag(r.membership_id, 'can_view_reports', e.target.checked)} disabled={savingId === r.membership_id} />
                View Reports
              </label>
              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!!r.can_manage_products} onChange={(e) => toggleFlag(r.membership_id, 'can_manage_products', e.target.checked)} disabled={savingId === r.membership_id} />
                Manage Products
              </label>
              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!!r.can_delete_invoices} onChange={(e) => toggleFlag(r.membership_id, 'can_delete_invoices', e.target.checked)} disabled={savingId === r.membership_id} />
                Delete Invoices
              </label>
              <label className="inline-flex items-center gap-2 text-xs">
                <input type="checkbox" checked={!!r.can_delete_products} onChange={(e) => toggleFlag(r.membership_id, 'can_delete_products', e.target.checked)} disabled={savingId === r.membership_id} />
                Delete Products
              </label>
            </div>
            <div className="text-xs text-zinc-500 md:text-right">ID: {r.membership_id}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
