"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import SearchBar from "@/components/SearchBar";

type Customer = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  gst_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  pincode: string | null;
  created_at: string;
  updated_at: string;
};

export default function CustomersClient({ businessId }: { businessId: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Customer[]>([]);
  const [search, setSearch] = useState<string>(sp?.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState<string>(sp?.get("search") ?? "");
  const [limit, setLimit] = useState<number>(parseInt(sp?.get("limit") || "20", 10));
  const [page, setPage] = useState<number>(parseInt(sp?.get("page") || "1", 10) - 1); // zero-based
  const [total, setTotal] = useState<number>(0);

  // Edit modal state
  const [editing, setEditing] = useState<Customer | null>(null);
  const [creating, setCreating] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    gst_number: "",
    address: "",
    city: "",
    state: "",
    country: "IN",
    pincode: "",
  });
  const [formErrors, setFormErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  function validateForm() {
    const errs: typeof formErrors = {};
    if (!form.name.trim()) errs.name = "Name is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = "Invalid email";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const load = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`/api/customers`, window.location.origin);
        url.searchParams.set("businessId", businessId);
        if (debouncedSearch.trim()) url.searchParams.set("search", debouncedSearch.trim());
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("offset", String(page * limit));
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Failed to load customers: ${res.status}`);
        const data = await res.json();
        setRows(data.data ?? []);
        setTotal(typeof data.total === "number" ? data.total : parseInt(data.total || "0", 10));
      } catch (e: any) {
        setError(e?.message || "Failed to load customers");
      } finally {
        setLoading(false);
      }
    },
    [businessId, debouncedSearch, page, limit]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Sync local state from URL on navigation/back/forward
  useEffect(() => {
    const s = sp?.get("search") ?? "";
    const l = parseInt(sp?.get("limit") || "20", 10);
    const p = Math.max(0, parseInt(sp?.get("page") || "1", 10) - 1);
    setSearch(s);
    setDebouncedSearch(s);
    setLimit(l);
    setPage(p);
  }, [sp]);

  // Debounce search typing -> debouncedSearch (300ms)
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // When debouncedSearch, page, or limit change, push URL state
  useEffect(() => {
    const q = new URLSearchParams(sp?.toString());
    if (debouncedSearch.trim()) q.set("search", debouncedSearch.trim()); else q.delete("search");
    q.set("page", String(page + 1));
    q.set("limit", String(limit));
    router.push(`/customers?${q.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, page, limit]);

  function openEdit(c: Customer) {
    setEditing(c);
    setForm({
      name: c.name ?? "",
      email: c.email ?? "",
      phone: c.phone ?? "",
      gst_number: c.gst_number ?? "",
      address: c.address ?? "",
      city: c.city ?? "",
      state: c.state ?? "",
      country: c.country ?? "IN",
      pincode: c.pincode ?? "",
    });
  }

  function openCreate() {
    setCreating(true);
    setForm({
      name: "",
      email: "",
      phone: "",
      gst_number: "",
      address: "",
      city: "",
      state: "",
      country: "IN",
      pincode: "",
    });
  }

  async function saveEdit() {
    if (!editing) return;
    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers/${editing.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(`Failed to update: ${res.status}`);
      setEditing(null);
      await load();
      toast.success("Customer updated");
    } catch (e: any) {
      setError(e?.message || "Failed to update customer");
      toast.error("Failed to update customer");
    } finally {
      setSaving(false);
    }
  }

  async function saveCreate() {
    if (!validateForm()) {
      toast.error("Please fix validation errors");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/customers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ business_id: businessId, ...form }),
      });
      if (!res.ok) throw new Error(`Failed to create: ${res.status}`);
      setCreating(false);
      // After adding, go to first page to ensure visibility
      setPage(0);
      await load();
      toast.success("Customer created");
    } catch (e: any) {
      setError(e?.message || "Failed to create customer");
      toast.error("Failed to create customer");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this customer? This action cannot be undone.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/customers/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
      // If we deleted last item on a page and not on first page, go back a page
      if (rows.length === 1 && page > 0) setPage((p) => p - 1);
      else await load();
      toast.success("Customer deleted");
    } catch (e: any) {
      setError(e?.message || "Failed to delete customer");
      toast.error("Failed to delete customer");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          onSubmit={(v) => { setSearch(v); setDebouncedSearch(v); setPage(0); }}
          onClear={() => { setSearch(""); setDebouncedSearch(""); setPage(0); }}
          placeholder="Search name, email or phone"
        />
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={openCreate}
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500"
          >
            Add Customer
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">GST</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6" colSpan={7}>Loading…</td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-zinc-500" colSpan={7}>No customers found.</td>
              </tr>
            ) : (
              rows.map((c) => (
                <tr key={c.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3">{c.phone || "-"}</td>
                  <td className="px-4 py-3">{c.email || "-"}</td>
                  <td className="px-4 py-3">{c.gst_number || "-"}</td>
                  <td className="px-4 py-3">{c.city || "-"}</td>
                  <td className="px-4 py-3">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => remove(c.id)}
                        className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 shadow hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between gap-2 text-sm">
        <div className="text-zinc-600 dark:text-zinc-300">
          Page {page + 1} of {Math.max(1, Math.ceil(total / limit))}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              const next = Math.max(0, page - 1);
              setPage(next);
            }}
            disabled={page === 0 || loading}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 shadow disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700"
          >
            Previous
          </button>
          <button
            onClick={() => {
              const maxPage = Math.max(0, Math.ceil(total / limit) - 1);
              const next = Math.min(maxPage, page + 1);
              if (next === page) return;
              setPage(next);
            }}
            disabled={loading || page + 1 >= Math.ceil(total / limit)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 shadow disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700"
          >
            Next
          </button>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(0);
            }}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow text-xs dark:bg-zinc-800 dark:border-zinc-700"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {(creating || editing) && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-lg rounded-xl border border-black/10 bg-white p-4 shadow-lg dark:bg-zinc-900 dark:border-white/10">
            <div className="mb-3 text-base font-semibold">{creating ? "Add Customer" : "Edit Customer"}</div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm">
                <span>Name</span>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  autoFocus
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                />
                {formErrors.name && <span className="text-xs text-red-600">{formErrors.name}</span>}
              </label>
              <label className="grid gap-1 text-sm">
                <span>Phone</span>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                />
                {formErrors.email && <span className="text-xs text-red-600">{formErrors.email}</span>}
              </label>
              <label className="grid gap-1 text-sm">
                <span>GST</span>
                <input
                  value={form.gst_number}
                  onChange={(e) => setForm({ ...form, gst_number: e.target.value })}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </label>
              <label className="grid gap-1 text-sm sm:col-span-2">
                <span>Address</span>
                <input
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>City</span>
                <input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>State</span>
                <input
                  value={form.state}
                  onChange={(e) => setForm({ ...form, state: e.target.value })}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Country</span>
                <input
                  value={form.country}
                  onChange={(e) => setForm({ ...form, country: e.target.value })}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </label>
              <label className="grid gap-1 text-sm">
                <span>Pincode</span>
                <input
                  value={form.pincode}
                  onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
                />
              </label>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  if (creating) setCreating(false);
                  else setEditing(null);
                }}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
              >
                Cancel
              </button>
              <button
                onClick={creating ? saveCreate : saveEdit}
                disabled={saving}
                className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow hover:bg-indigo-500 disabled:opacity-50"
              >
                {creating ? "Create" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
