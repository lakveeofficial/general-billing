"use client";
import React, { useMemo, useState } from "react";
import { useToast } from "@/components/ToastProvider";

type Business = {
  id: string;
  name: string;
  legal_name?: string | null;
  gst_number?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  pincode?: string | null;
  currency: string;
  // New persisted settings
  default_tax_type?: string;
  default_tax_rate?: number;
  default_hsn?: string | null;
  invoice_prefix?: string;
  invoice_next_number?: number;
  invoice_number_padding?: number;
  brand_logo?: string | null;
  brand_color?: string | null;
};

type Shop = {
  id: string;
  business_id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
} | null;

export default function SettingsClient({ business, shop }: { business: Business; shop: Shop }) {
  const { success, error, info } = useToast();

  const [biz, setBiz] = useState<Business>(business);
  const [sh, setSh] = useState<Shop>(shop);
  // Settings states (persisted via Save Business)
  const [taxType, setTaxType] = useState<string>(business.default_tax_type ?? "GST");
  const [taxRate, setTaxRate] = useState<string>(
    business.default_tax_rate != null ? String(business.default_tax_rate) : "0"
  );
  const [defaultHsn, setDefaultHsn] = useState<string>(business.default_hsn ?? "");
  const [invPrefix, setInvPrefix] = useState<string>(business.invoice_prefix ?? "INV-");
  const [invNext, setInvNext] = useState<string>(
    business.invoice_next_number != null ? String(business.invoice_next_number) : "1"
  );
  const [invPad, setInvPad] = useState<string>(
    business.invoice_number_padding != null ? String(business.invoice_number_padding) : "5"
  );
  const [brandLogo, setBrandLogo] = useState<string>(business.brand_logo ?? "");
  const [brandColor, setBrandColor] = useState<string>(business.brand_color ?? "#0ea5e9");

  const currencyOptions = useMemo(
    () => ["INR", "USD", "EUR", "GBP", "JPY", "AUD", "CAD"],
    []
  );

  async function saveBusiness() {
    try {
      const res = await fetch(`/api/businesses/${biz.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...biz,
          default_tax_type: taxType,
          default_tax_rate: Number(taxRate || 0),
          default_hsn: defaultHsn || null,
          invoice_prefix: invPrefix,
          invoice_next_number: Number(invNext || 1),
          invoice_number_padding: Number(invPad || 0),
          brand_logo: brandLogo || null,
          brand_color: brandColor || null,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update business");
      const data = await res.json();
      const updated: Business = data.data;
      setBiz(updated);
      // refresh settings states from server response
      setTaxType(updated.default_tax_type ?? taxType);
      setTaxRate(updated.default_tax_rate != null ? String(updated.default_tax_rate) : taxRate);
      setDefaultHsn(updated.default_hsn ?? defaultHsn);
      setInvPrefix(updated.invoice_prefix ?? invPrefix);
      setInvNext(updated.invoice_next_number != null ? String(updated.invoice_next_number) : invNext);
      setInvPad(
        updated.invoice_number_padding != null ? String(updated.invoice_number_padding) : invPad
      );
      setBrandLogo(updated.brand_logo ?? brandLogo);
      setBrandColor(updated.brand_color ?? brandColor);
      success("Business updated", "Success");
    } catch (e: any) {
      error(e.message || "Failed to update business", "Error");
    }
  }

  async function saveShop() {
    if (!sh) return;
    try {
      const res = await fetch(`/api/shops/${sh.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sh),
      });
      if (!res.ok) throw new Error((await res.json()).error || "Failed to update shop");
      const data = await res.json();
      setSh(data.data);
      success("Shop updated", "Success");
    } catch (e: any) {
      error(e.message || "Failed to update shop", "Error");
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
      {/* Business */}
      <div className="rounded-xl border border-black/5 dark:border-white/10 p-4 sm:p-6 bg-white/60 dark:bg-zinc-900/40">
        <div className="mb-3 sm:mb-4 text-lg font-semibold text-gray-900 dark:text-white">Business</div>
        <div className="grid grid-cols-1 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600">Name</span>
            <input
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition"
              value={biz.name}
              onChange={(e) => setBiz({ ...biz, name: e.target.value })}
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600">Legal name</span>
            <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={biz.legal_name || ""} onChange={(e) => setBiz({ ...biz, legal_name: e.target.value })} />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">GST Number</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={biz.gst_number || ""} onChange={(e) => setBiz({ ...biz, gst_number: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Currency</span>
              <select
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition"
                value={biz.currency}
                onChange={(e) => setBiz({ ...biz, currency: e.target.value })}
              >
                {currencyOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Email</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={biz.email || ""} onChange={(e) => setBiz({ ...biz, email: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Phone</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={biz.phone || ""} onChange={(e) => setBiz({ ...biz, phone: e.target.value })} />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600">Address</span>
            <textarea className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition min-h-[80px]" value={biz.address || ""} onChange={(e) => setBiz({ ...biz, address: e.target.value })} />
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">City</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={biz.city || ""} onChange={(e) => setBiz({ ...biz, city: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">State</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={biz.state || ""} onChange={(e) => setBiz({ ...biz, state: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Pincode</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={biz.pincode || ""} onChange={(e) => setBiz({ ...biz, pincode: e.target.value })} />
            </label>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              onClick={saveBusiness} 
              className="w-full sm:w-auto rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              Save Business
            </button>
          </div>
        </div>
      </div>

      {/* Shop */}
      <div className="rounded-xl border border-black/5 dark:border-white/10 p-4 sm:p-6 bg-white/60 dark:bg-zinc-900/40">
        <div className="mb-3 sm:mb-4 text-lg font-semibold text-gray-900 dark:text-white">Shop</div>
        {sh ? (
          <div className="grid grid-cols-1 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Name</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={sh.name} onChange={(e) => setSh({ ...sh, name: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Email</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={sh.email || ""} onChange={(e) => setSh({ ...sh, email: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Phone</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={sh.phone || ""} onChange={(e) => setSh({ ...sh, phone: e.target.value })} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Address</span>
              <textarea className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition min-h-[80px]" value={sh.address || ""} onChange={(e) => setSh({ ...sh, address: e.target.value })} />
            </label>
            <div className="flex justify-end pt-2">
              <button 
                onClick={saveShop} 
                className="w-full sm:w-auto rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
              >
                Save Shop
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-zinc-500">No shop available for this business.</div>
        )}
      </div>

      {/* Tax presets (UI only) */}
      <div className="rounded-xl border border-black/5 dark:border-white/10 p-4 sm:p-6 bg-white/60 dark:bg-zinc-900/40">
        <div className="mb-3 sm:mb-4 text-lg font-semibold text-gray-900 dark:text-white">Tax Presets</div>
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Default tax type</span>
              <select
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition"
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
              >
                {['GST','VAT','NONE'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Default tax rate (%)</span>
              <input
                type="number"
                min={0}
                step={0.01}
                className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
              />
            </label>
          </div>
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600">Default HSN/SAC code</span>
            <input
              className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
              value={defaultHsn}
              onChange={(e) => setDefaultHsn(e.target.value)}
            />
          </label>
          <div className="flex justify-end pt-2">
            <button 
              onClick={saveBusiness} 
              className="w-full sm:w-auto rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              Save Tax Presets
            </button>
          </div>
        </div>
      </div>

      {/* Invoice numbering (UI only) */}
      <div className="rounded-xl border border-black/5 dark:border-white/10 p-4 sm:p-6 bg-white/60 dark:bg-zinc-900/40">
        <div className="mb-3 sm:mb-4 text-lg font-semibold text-gray-900 dark:text-white">Invoice Numbering</div>
        <div className="grid grid-cols-1 gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Prefix</span>
              <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={invPrefix} onChange={(e) => setInvPrefix(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Next number</span>
              <input type="number" min={1} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" value={invNext} onChange={(e) => setInvNext(e.target.value)} />
            </label>
            <label className="grid gap-1">
              <span className="text-xs text-zinc-600">Padding</span>
              <input type="number" min={0} max={10} className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900" value={invPad} onChange={(e) => setInvPad(e.target.value)} />
            </label>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              onClick={saveBusiness}
              className="w-full sm:w-auto rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              Save Numbering
            </button>
          </div>
        </div>
      </div>

      {/* Branding / logo (UI only) */}
      <div className="rounded-xl border border-black/5 dark:border-white/10 p-4 sm:p-6 bg-white/60 dark:bg-zinc-900/40">
        <div className="mb-3 sm:mb-4 text-lg font-semibold text-gray-900 dark:text-white">Branding</div>
        <div className="grid grid-cols-1 gap-3">
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600">Logo URL</span>
            <input className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900 focus:ring-2 focus:ring-offset-1 focus:ring-zinc-500 focus:outline-none transition" value={brandLogo} onChange={(e) => setBrandLogo(e.target.value)} placeholder="https://..." />
          </label>
          <label className="grid gap-1">
            <span className="text-xs text-zinc-600">Primary color</span>
            <input type="color" className="h-10 w-16 rounded-md border border-zinc-300 p-1 dark:border-zinc-700" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
          </label>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
            <div className="h-10 w-full sm:w-10 rounded border border-zinc-200 dark:border-zinc-700" style={{ backgroundColor: brandColor }} />
            <div className="text-xs text-zinc-600 dark:text-zinc-400">
              <div>Color Preview</div>
              <div className="font-mono text-xs opacity-80">{brandColor}</div>
            </div>
          </div>
          <div className="flex justify-end pt-2">
            <button 
              onClick={saveBusiness} 
              className="w-full sm:w-auto rounded-md bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 transition-colors"
            >
              Save Branding
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
