"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";
import { useRouter } from "next/navigation";

export default function StatusEditor({ id, initial }: { id: string; initial: string }) {
  const [status, setStatus] = useState(initial);
  const [partialAmount, setPartialAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function save() {
    setSaving(true);
    try {
      // Build body depending on status
      let body: any = { status };
      if (status === 'PAID') {
        // Let server set amount_paid = grand_total
        body = {};
      } else if (status === 'PARTIALLY_PAID') {
        const val = Number(partialAmount);
        if (!(val > 0)) {
          toast.error("Enter a valid partial payment amount (> 0)");
          setSaving(false);
          return;
        }
        body = { amount_paid: val };
      }
        
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
      // Ensure the latest data is shown immediately
      router.refresh();
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
        <option value="PARTIALLY_PAID">PARTIAL PAID</option>
        <option value="PAID">PAID</option>
        <option value="OVERDUE">OVERDUE</option>
      </select>
      {status === 'PARTIALLY_PAID' && (
        <input
          type="number"
          min={0}
          step="0.01"
          value={partialAmount}
          onChange={(e) => setPartialAmount(e.target.value)}
          placeholder="Amount paid"
          className="w-36 rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-zinc-800 dark:border-zinc-700"
        />
      )}
      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow hover:bg-zinc-50 disabled:opacity-60 dark:bg-zinc-800 dark:border-zinc-700 dark:hover:bg-zinc-700 transition-colors"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}

