"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

export default function StatusEditor({ id, initial }: { id: string; initial: string }) {
  const [status, setStatus] = useState(initial);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  async function save() {
    setSaving(true);
    try {
      // When marking as PAID, we'll let the server handle setting amount_paid to grand_total
      const body = status === 'PAID' 
        ? { status, amount_paid: null } // Let server calculate the full amount
        : { status };
        
      const res = await fetch(`/api/invoices/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Failed (${res.status})`);
      }
      toast.success("Status updated");
    } catch (e: any) {
      toast.error(e?.message || "Failed to update status");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={status}
        onChange={(e) => setStatus(e.target.value)}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
      >
        <option value="DRAFT">DRAFT</option>
        <option value="ISSUED">ISSUED</option>
        <option value="PAID">PAID</option>
        <option value="OVERDUE">OVERDUE</option>
      </select>
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow hover:bg-zinc-50 disabled:opacity-60 dark:bg-zinc-800 dark:border-zinc-700"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
