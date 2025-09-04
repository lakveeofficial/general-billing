"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type Customer = { id: string; name: string };

type Item = {
  description: string;
  quantity: number;
  unit_price: number;
  discount?: number;
  tax_rate?: number;
  tax_type?: string;
  product_id?: string | null;
};

export default function EditInvoiceClient({
  invoiceId,
  businessId,
  shopId,
  customers,
  initial,
}: {
  invoiceId: string;
  businessId: string;
  shopId: string;
  customers: Customer[];
  initial: {
    customer_id: string;
    issue_date: string;
    due_date: string;
    notes: string;
    status: string;
    items: Item[];
  };
}) {
  const router = useRouter();
  const toast = useToast();

  const [customerId, setCustomerId] = useState<string>(initial.customer_id || "");
  const [issueDate, setIssueDate] = useState<string>(initial.issue_date || "");
  const [dueDate, setDueDate] = useState<string>(initial.due_date || "");
  const [notes, setNotes] = useState<string>(initial.notes || "");
  const [status, setStatus] = useState<string>(initial.status || "ISSUED");

  const [items, setItems] = useState<Item[]>(initial.items?.length ? initial.items : [
    { description: "", quantity: 1, unit_price: 0, discount: 0, tax_rate: 0, tax_type: "GST" },
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [attempted, setAttempted] = useState(false);

  const totals = useMemo(() => {
    let subTotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    for (const it of items) {
      const q = Number(it.quantity || 0);
      const up = Number(it.unit_price || 0);
      const disc = Number(it.discount || 0);
      const rate = Number(it.tax_rate || 0);
      const base = q * up;
      const taxable = Math.max(base - disc, 0);
      const tax = (it.tax_type === "NONE" ? 0 : taxable * rate / 100);
      subTotal += base;
      discountTotal += disc;
      taxTotal += tax;
    }
    const grandTotal = subTotal - discountTotal + taxTotal;
    return { subTotal, discountTotal, taxTotal, grandTotal };
  }, [items]);

  function updateItem(idx: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, { description: "", quantity: 1, unit_price: 0, discount: 0, tax_rate: 0, tax_type: "GST" }]);
  }
  function removeItem(idx: number) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        (document.getElementById("submit-invoice-btn") as HTMLButtonElement | null)?.click();
      } else if (e.altKey && (e.key === "a" || e.key === "A")) {
        e.preventDefault();
        addItem();
      } else if (e.altKey && e.key === "Backspace") {
        e.preventDefault();
        if (items.length > 1) removeItem(items.length - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length]);

  async function onSubmit(e: React.FormEvent, override?: { status?: string }) {
    e.preventDefault();
    setAttempted(true);
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }
    if (!items.every((it) => it.description && it.quantity > 0)) {
      toast.error("Each item needs description and quantity > 0");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/invoices/${invoiceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_id: businessId,
          shop_id: shopId,
          customer_id: customerId || null,
          issue_date: issueDate || null,
          due_date: dueDate || null,
          notes: notes || null,
          status: override?.status ?? status,
          items: items.map((it) => ({
            description: it.description,
            quantity: Number(it.quantity || 0),
            unit_price: Number(it.unit_price || 0),
            discount: Number(it.discount || 0),
            tax_rate: Number(it.tax_rate || 0),
            tax_type: it.tax_type || "GST",
            product_id: it.product_id ?? null,
          })),
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed (${res.status})`);
      }
      toast.success("Invoice updated");
      router.push(`/invoices/${invoiceId}`);
    } catch (err: any) {
      toast.error(err?.message || "Failed to update invoice");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={(e) => onSubmit(e)} className="space-y-6">
      {/* Header fields */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-black/5 dark:border-white/10 p-4 bg-white/60 dark:bg-zinc-900/40">
          <div className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">Customer</div>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
          >
            <option value="">Walk-in / Unspecified</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <label className="grid gap-1">
              <span className="text-zinc-600">Issue Date</span>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
            </label>
            <label className="grid gap-1">
              <span className="text-zinc-600">Due Date</span>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
            </label>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <label className="grid gap-1">
              <span className="text-zinc-600">Status</span>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700">
                <option value="DRAFT">DRAFT</option>
                <option value="ISSUED">ISSUED</option>
                <option value="PAID">PAID</option>
                <option value="OVERDUE">OVERDUE</option>
              </select>
            </label>
          </div>
          <label className="grid gap-1 mt-3 text-sm">
            <span className="text-zinc-600">Notes</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
          </label>
        </div>
        <div className="rounded-xl border border-black/5 dark:border-white/10 p-4 bg-white/60 dark:bg-zinc-900/40">
          <div className="text-sm text-zinc-600 dark:text-zinc-300 mb-2">Totals</div>
          <div className="text-sm space-y-1">
            <div className="flex justify-between"><span>Subtotal</span><span>₹{totals.subTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Discount</span><span>- ₹{totals.discountTotal.toFixed(2)}</span></div>
            <div className="flex justify-between"><span>Tax</span><span>₹{totals.taxTotal.toFixed(2)}</span></div>
            <div className="pt-1 flex justify-between font-semibold text-base"><span>Grand Total</span><span>₹{totals.grandTotal.toFixed(2)}</span></div>
          </div>
        </div>
      </div>

      {/* Items table */}
      <div className="overflow-x-auto rounded-xl border border-black/5 dark:border-white/10 bg-white/60 dark:bg-zinc-900/40">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="px-3 py-2">Item / Description</th>
              <th className="px-3 py-2">Qty</th>
              <th className="px-3 py-2">Unit Price</th>
              <th className="px-3 py-2">Discount</th>
              <th className="px-3 py-2">Tax %</th>
              <th className="px-3 py-2">Tax Type</th>
              <th className="px-3 py-2">Line Total</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, idx) => {
              const base = Number(it.quantity || 0) * Number(it.unit_price || 0);
              const taxable = Math.max(base - Number(it.discount || 0), 0);
              const lineTax = (it.tax_type === "NONE" ? 0 : taxable * Number(it.tax_rate || 0) / 100);
              const lineTotal = taxable + lineTax;
              const invalidDesc = attempted && !it.description;
              const invalidQty = attempted && !(Number(it.quantity) > 0);
              return (
                <tr key={idx} className="border-t border-black/5 dark:border-white/10 align-top">
                  <td className="px-3 py-2 w-[320px]">
                    <div className="grid gap-1">
                      <ProductPicker
                        businessId={businessId}
                        value={it}
                        onPick={(p) => {
                          updateItem(idx, {
                            product_id: p.id,
                            description: p.name,
                            unit_price: Number(p.unit_price || 0),
                            tax_rate: Number(p.tax_rate || 0),
                            tax_type: p.tax_type || "GST",
                          });
                        }}
                        onDescriptionChange={(v) => updateItem(idx, { description: v })}
                      />
                      {invalidDesc && (<div className="text-xs text-red-600">Description required</div>)}
                    </div>
                  </td>
                <td className="px-3 py-2">
                  <input type="number" min={0} value={it.quantity}
                    onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) })}
                    className="w-24 rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
                  {invalidQty && (<div className="text-xs text-red-600 mt-1">Qty must be &gt; 0</div>)}
                </td>
                <td className="px-3 py-2">
                  <input type="number" min={0} step="0.01" value={it.unit_price}
                    onChange={(e) => updateItem(idx, { unit_price: Number(e.target.value) })}
                    className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min={0} step="0.01" value={it.discount || 0}
                    onChange={(e) => updateItem(idx, { discount: Number(e.target.value) })}
                    className="w-28 rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
                </td>
                <td className="px-3 py-2">
                  <input type="number" min={0} step="0.01" value={it.tax_rate || 0}
                    onChange={(e) => updateItem(idx, { tax_rate: Number(e.target.value) })}
                    className="w-24 rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700" />
                </td>
                <td className="px-3 py-2">
                  <select value={it.tax_type || "GST"} onChange={(e) => updateItem(idx, { tax_type: e.target.value })}
                    className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700">
                    <option value="GST">GST</option>
                    <option value="VAT">VAT</option>
                    <option value="NONE">NONE</option>
                  </select>
                </td>
                <td className="px-3 py-2 whitespace-nowrap">₹{lineTotal.toFixed(2)}</td>
                <td className="px-3 py-2 text-right">
                  <button type="button" onClick={() => removeItem(idx)}
                    className="rounded-md border border-red-300 bg-red-50 px-2.5 py-1.5 text-xs text-red-700 shadow hover:bg-red-100">
                    Remove
                  </button>
                </td>
              </tr>
            );})}
            <tr>
              <td className="px-3 py-3" colSpan={8}>
                <button type="button" onClick={addItem}
                  className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">
                  + Add Item
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => router.push(`/invoices/${invoiceId}`)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">
          Cancel
        </button>
        <button type="button" disabled={submitting}
          onClick={(e) => onSubmit(e as any, { status: "DRAFT" })}
          className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">
          {submitting ? "Saving…" : "Save as Draft"}
        </button>
        <button id="submit-invoice-btn" type="submit" disabled={submitting}
          className="rounded-md border border-indigo-300 bg-indigo-600 text-white px-4 py-2 text-sm shadow disabled:opacity-60 hover:bg-indigo-500">
          {submitting ? "Updating…" : "Update Invoice"}
        </button>
      </div>
    </form>
  );
}

type Product = {
  id: string;
  name: string;
  unit_price: number;
  tax_rate?: number;
  tax_type?: string;
  sku?: string | null;
};

function ProductPicker({
  businessId,
  value,
  onPick,
  onDescriptionChange,
}: {
  businessId: string;
  value: Item;
  onPick: (p: Product) => void;
  onDescriptionChange: (v: string) => void;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const timer = useRef<number | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    return () => document.removeEventListener("click", onDocClick);
  }, []);

  useEffect(() => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(async () => {
      const queryStr = q.trim();
      if (!queryStr) { setResults([]); return; }
      try {
        const url = new URL(`/api/products`, window.location.origin);
        url.searchParams.set("businessId", businessId);
        url.searchParams.set("search", queryStr);
        url.searchParams.set("limit", "10");
        const res = await fetch(url.toString());
        if (!res.ok) throw new Error("Failed");
        const j = await res.json();
        setResults(j?.data ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      }
    }, 250);
    return () => { if (timer.current) window.clearTimeout(timer.current); };
  }, [q, businessId]);

  return (
    <div className="relative" ref={containerRef}>
      <div className="flex gap-2">
        <input
          value={value.description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Item description"
          className="w-full rounded-md border border-zinc-300 bg-white px-2 py-1.5 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search products…"
          className="w-40 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
          onFocus={() => q && setOpen(true)}
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-56 w-[min(520px,90vw)] overflow-auto rounded-md border border-black/10 bg-white shadow-lg dark:bg-zinc-900 dark:border-white/10">
          {results.map((p) => (
            <button
              type="button"
              key={p.id}
              onClick={() => { onPick(p); setOpen(false); setQ(""); }}
              className="w-full text-left px-3 py-2 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/40"
            >
              <div className="flex justify-between gap-3">
                <div className="truncate">
                  <div className="font-medium truncate">{p.name}</div>
                  {p.sku ? <div className="text-xs text-zinc-500">SKU: {p.sku}</div> : null}
                </div>
                <div className="text-sm whitespace-nowrap">₹{Number(p.unit_price || 0).toFixed(2)}</div>
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">Tax: {Number(p.tax_rate || 0)}% {p.tax_type || "GST"}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
