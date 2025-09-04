"use client";

import { useState } from "react";
import { useToast } from "@/components/ToastProvider";

export default function DownloadPdfButton({ id, number }: { id: string; number?: string | null }) {
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  async function download() {
    setLoading(true);
    try {
      const res = await fetch(`/api/invoices/${id}/pdf`);
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (res.status === 501) {
          toast.error(j?.error || "PDF renderer is not installed. Install Playwright.");
        } else {
          toast.error(j?.error || `Failed (${res.status})`);
        }
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `invoice-${number || id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error(e?.message || "Failed to download PDF");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={download}
      disabled={loading}
      className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow hover:bg-zinc-50 disabled:opacity-60 dark:bg-zinc-800 dark:border-zinc-700"
    >
      {loading ? "Preparing…" : "Download PDF"}
    </button>
  );
}
