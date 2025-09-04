"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import SearchBar from "@/components/SearchBar";

type Product = {
  id: string;
  business_id: string;
  sku: string | null;
  name: string;
  description: string | null;
  unit_price: number;
  tax_rate: number;
  tax_type: "GST" | "VAT" | "NONE" | string;
  hsn_code: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function ProductsClient({ businessId }: { businessId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const search = (searchParams?.get("search") ?? "").trim();
  const [searchText, setSearchText] = useState(search);

  // Keep local input in sync with URL param
  useEffect(() => {
    setSearchText(search);
  }, [search]);

  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    sku: "",
    name: "",
    description: "",
    unit_price: "",
    tax_rate: "12",
    tax_type: "GST",
    hsn_code: "",
    is_active: true,
  });

  const load = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`/api/products`, window.location.origin);
        url.searchParams.set("businessId", businessId);
        if (search) url.searchParams.set("search", search);
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Failed to load products: ${res.status}`);
        const data = await res.json();
        setProducts(data.data ?? []);
      } catch (e: any) {
        setError(e?.message || "Failed to load products");
      } finally {
        setLoading(false);
      }
    },
    [businessId, search]
  );

  useEffect(() => {
    load();
  }, [load]);

  function applySearch(next: string) {
    const params = new URLSearchParams(searchParams ? Array.from(searchParams.entries()) : []);
    const trimmed = (next ?? "").trim();
    if (trimmed) params.set("search", trimmed);
    else params.delete("search");
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          sku: form.sku || null,
          name: form.name,
          description: form.description || null,
          unit_price: Number(form.unit_price),
          tax_rate: Number(form.tax_rate || 0),
          tax_type: form.tax_type || "GST",
          hsn_code: form.hsn_code || null,
          is_active: !!form.is_active,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Failed to create product (${res.status})`);
      }
      setShowForm(false);
      setForm({ sku: "", name: "", description: "", unit_price: "", tax_rate: "12", tax_type: "GST", hsn_code: "", is_active: true });
      await load();
    } catch (e: any) {
      setError(e?.message || "Failed to create product");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <SearchBar
          value={searchText}
          onChange={setSearchText}
          onSubmit={applySearch}
          onClear={() => applySearch("")}
          placeholder="Search products..."
        />
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={() => setShowForm(true)}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500"
          >
            New Product
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-zinc-50/70 dark:bg-zinc-900/60 text-left">
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">SKU</th>
              <th className="px-4 py-3 font-semibold">HSN</th>
              <th className="px-4 py-3 font-semibold">Price</th>
              <th className="px-4 py-3 font-semibold">Tax</th>
              <th className="px-4 py-3 font-semibold">Active</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-4" colSpan={6}>Loading…</td>
              </tr>
            ) : products.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={6}>No products found.</td>
              </tr>
            ) : (
              products.map((p) => (
                <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="px-4 py-3">{p.name}</td>
                  <td className="px-4 py-3">{p.sku || "-"}</td>
                  <td className="px-4 py-3">{p.hsn_code || "-"}</td>
                  <td className="px-4 py-3">₹ {Number(p.unit_price).toFixed(2)}</td>
                  <td className="px-4 py-3">{p.tax_type} {Number(p.tax_rate).toFixed(2)}%</td>
                  <td className="px-4 py-3">{p.is_active ? "Yes" : "No"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl rounded-lg border border-black/10 bg-white p-4 shadow-lg dark:bg-zinc-900 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">New Product</h2>
              <button className="text-zinc-500 hover:text-zinc-700" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={onSubmit} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="text-sm">SKU
                <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
              </label>
              <label className="text-sm sm:col-span-1">Name*
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
              </label>
              <label className="text-sm sm:col-span-2">Description
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
              </label>
              <label className="text-sm">Unit Price*
                <input required type="number" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
              </label>
              <label className="text-sm">Tax Rate %
                <input type="number" step="0.01" value={form.tax_rate} onChange={(e) => setForm({ ...form, tax_rate: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
              </label>
              <label className="text-sm">Tax Type
                <select value={form.tax_type} onChange={(e) => setForm({ ...form, tax_type: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700">
                  <option value="GST">GST</option>
                  <option value="VAT">VAT</option>
                  <option value="NONE">NONE</option>
                </select>
              </label>
              <label className="text-sm">HSN Code
                <input value={form.hsn_code} onChange={(e) => setForm({ ...form, hsn_code: e.target.value })} className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:bg-zinc-900 dark:border-zinc-700" />
              </label>
              <label className="flex items-center gap-2 text-sm sm:col-span-2">
                <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} /> Active
              </label>

              <div className="sm:col-span-2 mt-2 flex justify-end gap-2">
                <button type="button" className="rounded-md border border-zinc-300 px-3 py-2 text-sm" onClick={() => setShowForm(false)}>Cancel</button>
                <button disabled={saving} type="submit" className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:opacity-60">
                  {saving ? "Saving..." : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
