"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type Toast = {
  id: string;
  title?: string;
  message: string;
  type?: "success" | "error" | "info" | "warning";
  duration?: number; // ms
};

type ToastContextValue = {
  add: (toast: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  const success = useCallback((message: string, title?: string) => ctx.add({ message, title, type: "success" }), [ctx]);
  const error = useCallback((message: string, title?: string) => ctx.add({ message, title, type: "error" }), [ctx]);
  const info = useCallback((message: string, title?: string) => ctx.add({ message, title, type: "info" }), [ctx]);
  const warning = useCallback((message: string, title?: string) => ctx.add({ message, title, type: "warning" }), [ctx]);
  return useMemo(() => ({ ...ctx, success, error, info, warning }), [ctx, success, error, info, warning]);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const add = useCallback((toast: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const full: Toast = { id, duration: 3000, type: "info", ...toast };
    setToasts((t) => [...t, full]);
    if (full.duration && full.duration > 0) {
      setTimeout(() => {
        setToasts((t) => t.filter((x) => x.id !== id));
      }, full.duration);
    }
  }, []);

  const remove = useCallback((id: string) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const value = useMemo(() => ({ add, remove }), [add, remove]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast viewport */}
      <div className="pointer-events-none fixed right-4 top-4 z-[1000] flex w-[360px] max-w-[90vw] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "pointer-events-auto rounded-md border px-3 py-2 shadow",
              t.type === "success" && "border-emerald-300 bg-emerald-50 text-emerald-900",
              t.type === "error" && "border-red-300 bg-red-50 text-red-800",
              t.type === "info" && "border-sky-300 bg-sky-50 text-sky-900",
              t.type === "warning" && "border-amber-300 bg-amber-50 text-amber-900",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {t.title && <div className="mb-0.5 text-sm font-semibold">{t.title}</div>}
                <div className="text-sm leading-snug">{t.message}</div>
              </div>
              <button
                onClick={() => remove(t.id)}
                className="rounded p-1 text-xs text-zinc-500 hover:bg-black/5 hover:text-zinc-700"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
