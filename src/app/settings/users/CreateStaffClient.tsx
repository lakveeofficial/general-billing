"use client";

import { useState } from "react";

export default function CreateStaffClient({ businessId, shops }: { businessId: string; shops: { id: string; name: string }[] }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [shopId, setShopId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [generated, setGenerated] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setGenerated(null);
    setLoading(true);
    try {
      // 1) Create user with auto-generated password
      const res1 = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email })
      });
      const j1 = await res1.json().catch(() => ({}));
      if (!res1.ok) throw new Error(j1?.error || `Failed to create user (${res1.status})`);
      const user = j1?.data;
      const temp = j1?.generated_temp_password as string | undefined;

      // 2) Create membership as STAFF for selected shop or business
      const res2 = await fetch('/api/admin/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, role: 'STAFF', business_id: businessId, shop_id: shopId || null })
      });
      const j2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error(j2?.error || `Failed to assign membership (${res2.status})`);

      setGenerated(temp || null);
      setSuccess('Staff created successfully.');
      setName("");
      setEmail("");
      setShopId("");
    } catch (err: any) {
      setError(err?.message || 'Failed to create staff');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="p-4 space-y-4">
      {error && <div className="rounded border border-red-200 bg-red-50 text-red-800 px-3 py-2 text-sm">{error}</div>}
      {success && (
        <div className="rounded border border-emerald-200 bg-emerald-50 text-emerald-800 px-3 py-2 text-sm">
          {success}
          {generated && (
            <div className="mt-2 text-xs">
              Temporary Password: <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">{generated}</code>
              <button type="button" className="ml-2 text-indigo-600 hover:underline" onClick={() => navigator.clipboard.writeText(generated)}>Copy</button>
            </div>
          )}
          <div className="mt-1 text-xs text-zinc-600">User will be forced to reset password at first login.</div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm grid gap-1">
          <span className="text-zinc-600">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
        </label>
        <label className="text-sm grid gap-1">
          <span className="text-zinc-600">Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
        </label>
      </div>
      <label className="text-sm grid gap-1">
        <span className="text-zinc-600">Assign to Shop (optional)</span>
        <select value={shopId} onChange={(e) => setShopId(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700">
          <option value="">Business-wide Staff</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </label>
      <div className="pt-2">
        <button type="submit" disabled={loading} className="rounded-md border border-indigo-300 bg-indigo-600 text-white px-4 py-2 text-sm shadow disabled:opacity-60 hover:bg-indigo-500">
          {loading ? 'Creating…' : 'Create Staff'}
        </button>
      </div>
    </form>
  );
}
