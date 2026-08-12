"use client";

import { useEffect, useState } from "react";

type Business = { id: string; name: string };
type Shop = { id: string; name: string };

export default function SuperadminClient() {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [shops, setShops] = useState<Record<string, Shop[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin creation
  const [adminEmail, setAdminEmail] = useState("");
  const [adminName, setAdminName] = useState("");
  const [adminBizId, setAdminBizId] = useState("");
  const [adminShopId, setAdminShopId] = useState("");
  const [generatedAdminPass, setGeneratedAdminPass] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/superadmin/businesses');
        const j = await res.json().catch(() => ({}));
        const list: Business[] = j?.data || [];
        setBusinesses(list);
        // Load shops per business
        const shopMap: Record<string, Shop[]> = {};
        for (const b of list) {
          const r = await fetch(`/api/superadmin/businesses/${b.id}/shops`).catch(() => null);
          const jj = await r?.json().catch(() => ({}));
          shopMap[b.id] = jj?.data || [];
        }
        setShops(shopMap);
      } catch (e: any) {
        setError(e?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function createBusiness() {
    const name = prompt('Business name?');
    if (!name) return;
    const res = await fetch('/api/superadmin/businesses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!res.ok) { alert('Failed'); return; }
    const j = await res.json();
    setBusinesses(prev => [j.data, ...prev]);
  }

  async function createShop(businessId: string) {
    const name = prompt('Shop name?');
    if (!name) return;
    const res = await fetch(`/api/superadmin/businesses/${businessId}/shops`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
    if (!res.ok) { alert('Failed'); return; }
    const j = await res.json();
    setShops(prev => ({ ...prev, [businessId]: [j.data, ...(prev[businessId] || [])] }));
  }

  async function createAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setGeneratedAdminPass(null);
    try {
      // 1) Create admin user (auto temp password)
      const res1 = await fetch('/api/superadmin/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: adminName, email: adminEmail })
      });
      const j1 = await res1.json().catch(() => ({}));
      if (!res1.ok) throw new Error(j1?.error || `Failed to create admin (${res1.status})`);
      const adminUser = j1?.data;
      const temp = j1?.generated_temp_password as string | undefined;

      // 2) Assign membership as ADMIN
      const res2 = await fetch('/api/superadmin/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: adminUser.id, role: 'ADMIN', business_id: adminBizId, shop_id: adminShopId || null })
      });
      const j2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error(j2?.error || `Failed to assign admin membership (${res2.status})`);

      setGeneratedAdminPass(temp || null);
      setAdminName(""); setAdminEmail(""); setAdminBizId(""); setAdminShopId("");
      alert('Admin created successfully');
    } catch (err: any) {
      alert(err?.message || 'Failed to create admin');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-sm text-zinc-500">Loading…</div>;
  if (error) return <div className="text-sm text-red-600">{error}</div>;

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50">
        <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 font-medium flex items-center justify-between">
          <span>Businesses</span>
          <button onClick={createBusiness} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">+ New</button>
        </div>
        <div className="divide-y divide-black/5 dark:divide-white/10">
          {businesses.map((b) => (
            <div key={b.id} className="px-4 py-3">
              <div className="font-semibold">{b.name}</div>
              <div className="mt-2">
                <div className="text-xs text-zinc-500 mb-1">Shops</div>
                <div className="flex flex-wrap gap-2 items-center">
                  {(shops[b.id] || []).map(s => (
                    <span key={s.id} className="inline-flex items-center rounded border border-zinc-300 bg-white px-2 py-0.5 text-xs dark:bg-zinc-800 dark:border-zinc-700">{s.name}</span>
                  ))}
                  <button onClick={() => createShop(b.id)} className="text-xs rounded-md border border-zinc-300 bg-white px-2 py-1 shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">+ Add Shop</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50">
        <div className="px-4 py-3 border-b border-black/5 dark:border-white/10 font-medium">Create Admin</div>
        <form onSubmit={createAdmin} className="p-4 grid gap-3">
          <label className="text-sm grid gap-1">
            <span className="text-zinc-600">Name (optional)</span>
            <input value={adminName} onChange={(e) => setAdminName(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-zinc-600">Email</span>
            <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} required className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-zinc-600">Business</span>
            <select value={adminBizId} onChange={(e) => { setAdminBizId(e.target.value); setAdminShopId(""); }} required className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700">
              <option value="" disabled>Select business</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </label>
          <label className="text-sm grid gap-1">
            <span className="text-zinc-600">Shop (optional)</span>
            <select value={adminShopId} onChange={(e) => setAdminShopId(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700">
              <option value="">Business-wide Admin</option>
              {(shops[adminBizId] || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <button type="submit" disabled={saving} className="rounded-md border border-indigo-300 bg-indigo-600 text-white px-4 py-2 text-sm shadow disabled:opacity-60 hover:bg-indigo-500">
            {saving ? 'Creating…' : 'Create Admin'}
          </button>
          {generatedAdminPass && (
            <div className="rounded border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
              Admin created. Temporary Password: <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">{generatedAdminPass}</code>
              <button type="button" className="ml-2 text-indigo-600 hover:underline" onClick={() => navigator.clipboard.writeText(generatedAdminPass)}>Copy</button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
