"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import SearchBar from "@/components/SearchBar";

type Invoice = {
  id: string;
  number: string;
  status: string;
  issue_date: string | null;
  due_date: string | null;
  sub_total: number;
  discount_total: number;
  tax_total: number;
  grand_total: number;
  amount_paid: number;
  customer_name: string | null;
  created_at: string;
};

export default function InvoicesClient({ businessId }: { businessId: string }) {
  const router = useRouter();
  const sp = useSearchParams();
  const toast = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Invoice[]>([]);
  const [limit, setLimit] = useState<number>(parseInt(sp?.get("limit") || "20", 10));
  const [page, setPage] = useState<number>(parseInt(sp?.get("page") || "1", 10) - 1); // zero-based
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState<string>(sp?.get("search") ?? "");
  const [debouncedSearch, setDebouncedSearch] = useState<string>(sp?.get("search") ?? "");

  const load = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL(`/api/invoices`, window.location.origin);
        url.searchParams.set("businessId", businessId);
        url.searchParams.set("limit", String(limit));
        url.searchParams.set("offset", String(page * limit));
        if (debouncedSearch.trim()) url.searchParams.set("search", debouncedSearch.trim());
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error(`Failed to load invoices: ${res.status}`);
        const data = await res.json();
        setRows(data.data ?? []);
        setTotal(typeof data.total === "number" ? data.total : parseInt(data.total || "0", 10));
      } catch (e: any) {
        setError(e?.message || "Failed to load invoices");
      } finally {
        setLoading(false);
      }
    },
    [businessId, limit, page, debouncedSearch]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Sync URL on page/limit/search changes (debounced value)
  useEffect(() => {
    const params = new URLSearchParams(Array.from(sp?.entries?.() ?? []));
    params.set("page", String(page + 1));
    params.set("limit", String(limit));
    if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
    else params.delete("search");
    router.replace(`?${params.toString()}`);
  }, [router, sp, page, limit, debouncedSearch]);

  async function remove(id: string) {
    if (!confirm("Delete this invoice? This action cannot be undone.")) return;
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Failed: ${res.status}`);
      // If last row on page and not page 0, step back; else reload
      if (rows.length === 1 && page > 0) setPage((p) => p - 1);
      else await load();
      toast.success("Invoice deleted");
    } catch (e: any) {
      toast.error(e?.message || "Failed to delete invoice");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(0); }}
          onSubmit={(v) => { setSearch(v); setDebouncedSearch(v); setPage(0); }}
          onClear={() => { setSearch(""); setDebouncedSearch(""); setPage(0); }}
          placeholder="Search invoices by number or customer…"
        />
        <Link
          href="/invoices/new"
          className="shrink-0 rounded-md border border-indigo-300 bg-indigo-600 text-white px-3 py-2 text-sm shadow hover:bg-indigo-500"
        >
          New Invoice
        </Link>
      </div>

      {error && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">{error}</div>
      )}

      <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="px-4 py-3">Number</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Issue Date</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Grand Total</th>
              <th className="px-4 py-3">Paid</th>
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
                <td className="px-4 py-6 text-zinc-500" colSpan={7}>No invoices found.</td>
              </tr>
            ) : (
              rows.map((inv) => (
                <tr key={inv.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="px-4 py-3 font-medium">{inv.number}</td>
                  <td className="px-4 py-3">{inv.customer_name || "-"}</td>
                  <td className="px-4 py-3">{inv.issue_date ? new Date(inv.issue_date).toLocaleDateString() : "-"}</td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                        inv.status === "PAID" && "border-emerald-300 bg-emerald-50 text-emerald-800",
                        inv.status === "OVERDUE" && "border-red-300 bg-red-50 text-red-700",
                        inv.status === "DRAFT" && "border-zinc-300 bg-zinc-50 text-zinc-700",
                        inv.status === "ISSUED" && "border-sky-300 bg-sky-50 text-sky-800",
                      ].filter(Boolean).join(" ")}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">₹{(inv.grand_total ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">₹{(inv.amount_paid ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      {inv.status !== "PAID" && (
                        <button
                          onClick={async () => {
                            if (!confirm("Mark this invoice as PAID?")) return;
                            try {
                              const res = await fetch(`/api/invoices/${inv.id}`, { method: "PATCH" });
                              if (!res.ok) throw new Error("Failed");
                              toast.success("Invoice marked as paid");
                              setTimeout(() => window.location.reload(), 400);
                            } catch (e) {
                              toast.error("Failed to mark as paid");
                            }
                          }}
                          className="rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1.5 text-xs text-emerald-700 shadow hover:bg-emerald-100"
                        >
                          Mark as Paid
                        </button>
                      )}
                      <Link href={`/invoices/${inv.id}`} className="rounded-md border border-zinc-300 bg-white px-2.5 py-1.5 text-xs shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">
                        View
                      </Link>
                      <button
                        onClick={() => remove(inv.id)}
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
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0 || loading}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 shadow disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(Math.max(0, Math.ceil(total / limit) - 1), p + 1))}
            disabled={loading || page + 1 >= Math.ceil(total / limit)}
            className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 shadow disabled:opacity-50 dark:bg-zinc-800 dark:border-zinc-700"
          >
            Next
          </button>
          <select
            value={limit}
            onChange={(e) => { setLimit(Number(e.target.value)); setPage(0); }}
            className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow text-xs dark:bg-zinc-800 dark:border-zinc-700"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>
    </div>
  );
}
