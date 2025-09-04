"use client";

export default function PrintButton({ className = "" }: { className?: string }) {
  return (
    <button
      onClick={() => window.print()}
      className={
        className ||
        "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700"
      }
    >
      Print / Save PDF
    </button>
  );
}
