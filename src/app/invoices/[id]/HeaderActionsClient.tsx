"use client";

import PrintButton from "@/components/PrintButton";
import StatusEditor from "./StatusEditor";
import DownloadPdfButton from "./DownloadPdfButton";
import Link from "next/link";

export default function HeaderActionsClient({ id, number, status }: { id: string; number?: string | null; status: string }) {
  return (
    <div className="flex items-center gap-2 no-print">
      <PrintButton />
      <DownloadPdfButton id={id} number={number ?? undefined} />
      <Link href={`/invoices/${id}/edit`} className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">Edit</Link>
      <div className="hidden sm:block">
        <StatusEditor id={id} initial={status} />
      </div>
    </div>
  );
}
