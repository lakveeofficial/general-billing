import { query } from "@/lib/db";
import Link from "next/link";
import HeaderActionsClient from "./HeaderActionsClient";

export default async function InvoiceDetailsPage({ params }: { params: { id: string } }) {
  const id = params.id;

  const { rows } = await query(
    `SELECT i.*, c.name AS customer_name
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.id = $1
     LIMIT 1`,
    [id]
  );
  const invoice = rows[0];

  if (!invoice) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Invoice</h1>
        <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-red-800">Invoice not found.</div>
        <Link href="/invoices" className="inline-block rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm shadow hover:bg-zinc-50 dark:bg-zinc-800 dark:border-zinc-700">Back to Invoices</Link>
      </div>
    );
  }

  const { rows: items } = await query(
    `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`,
    [id]
  );

  // Fetch business + shop for header branding
  const [{ rows: bizRows }, { rows: shopRows }] = await Promise.all([
    query<{ id: string; name: string; brand_logo: string | null; brand_color: string | null; phone: string | null; email: string | null; gst_number: string | null }>(
      `SELECT id, name, brand_logo, brand_color, phone, email, gst_number FROM businesses WHERE id = $1`,
      [invoice.business_id]
    ),
    query<{ id: string; name: string; phone: string | null; email: string | null; address: string | null }>(
      `SELECT id, name, phone, email, address FROM shops WHERE id = $1`,
      [invoice.shop_id]
    ),
  ]);
  const business = bizRows[0] || null;
  const shop = shopRows[0] || null;
  const brandColor = business?.brand_color || "#2563EB"; // indigo-600 fallback
  const rawLogo = business?.brand_logo || "/logo.png";
  const logoUrl = (() => {
    if (!rawLogo) return "/logo.png";
    const s = String(rawLogo);
    if (s.startsWith("http://") || s.startsWith("https://") || s.startsWith("data:")) return s;
    return s.startsWith("/") ? s : `/${s}`;
  })();

  return (
    <div className="space-y-4 md:space-y-6 print-container px-2 sm:px-0">
      {/* Colorful Header */}
      <div className="rounded-xl overflow-hidden border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50 print-break-inside-avoid">
        <div
          className="px-3 sm:px-6 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4"
          style={{ background: `linear-gradient(135deg, ${brandColor} 0%, #1e293b 100%)` }}
        >
          <div className="flex items-center gap-2 sm:gap-3">
            <img 
              src={logoUrl} 
              alt="Logo" 
              className="h-9 w-9 sm:h-12 sm:w-12 rounded bg-white p-1 shadow ring-1 ring-white/30" 
            />
            <div className="text-white">
              <div className="text-lg sm:text-xl font-semibold leading-tight">{business?.name || "Business"}</div>
              {shop?.name && <div className="text-[11px] sm:text-xs opacity-90">{shop.name}</div>}
            </div>
          </div>
          <div className="text-right text-white mt-2 sm:mt-0">
            <div className="text-xl sm:text-2xl font-bold tracking-wide">INVOICE</div>
            <div className="text-[11px] sm:text-xs opacity-90">#{invoice.number}</div>
            <div className="text-[11px] sm:text-xs opacity-90">
              {invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : "-"}
              {invoice.due_date && ` • Due: ${new Date(invoice.due_date).toLocaleDateString()}`}
            </div>
          </div>
        </div>

        {/* Meta Row */}
        <div className="px-3 sm:px-6 py-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs sm:text-sm text-zinc-500">Invoice To</div>
            <div className="text-sm sm:text-base font-medium">{invoice.customer_name || "-"}</div>
          </div>
          <div className="text-xs sm:text-sm text-zinc-600 mt-1 sm:mt-0 sm:text-right space-y-0.5">
            {shop?.phone && <div className="truncate">📞 {shop.phone}</div>}
            {shop?.email && <div className="truncate">✉️ {shop.email}</div>}
            {shop?.address && <div className="truncate" title={shop.address}>📍 {shop.address}</div>}
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-lg sm:text-xl font-semibold">Invoice Details</h1>
        <div className="w-full sm:w-auto">
          <HeaderActionsClient id={id} number={invoice.number} status={invoice.status} />
        </div>
      </div>

      {/* Items Table */}
      <div className="overflow-hidden rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50 print-break-inside-avoid">
        <div className="overflow-x-auto -mx-2 sm:mx-0">
          <table className="w-full text-xs sm:text-sm min-w-[600px] sm:min-w-full">
            <thead style={{ backgroundColor: brandColor }}>
              <tr className="text-left text-white/95">
                <th className="px-3 py-2 sm:px-4 sm:py-3 w-10">#</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 min-w-[150px]">Description</th>
                <th className="px-2 py-2 sm:px-3 sm:py-3 w-16 text-right">Qty</th>
                <th className="px-2 py-2 sm:px-3 sm:py-3 w-20 text-right">Price</th>
                <th className="px-2 py-2 sm:px-3 sm:py-3 w-16 text-center">Tax</th>
                <th className="px-3 py-2 sm:px-4 sm:py-3 w-24 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td className="px-4 py-4 text-center text-zinc-500" colSpan={6}>No items found</td>
                </tr>
              ) : (
                items.map((it: any, idx: number) => (
                  <tr 
                    key={it.id} 
                    className="border-t border-black/5 dark:border-white/10 odd:bg-zinc-50/50 dark:odd:bg-white/5"
                  >
                    <td className="px-3 py-2 sm:px-4 sm:py-3 tabular-nums text-zinc-500">
                      {String(idx + 1).padStart(2, "0")}
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 font-medium">
                      <div className="line-clamp-2">{it.description}</div>
                    </td>
                    <td className="px-2 py-2 sm:px-3 sm:py-3 text-right tabular-nums">
                      {parseFloat(it.quantity).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 sm:px-3 sm:py-3 text-right tabular-nums">
                      ₹{Number(it.unit_price || 0).toLocaleString()}
                    </td>
                    <td className="px-2 py-2 sm:px-3 sm:py-3 text-center text-xs">
                      <span className="inline-block px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded">
                        {it.tax_type || "GST"} {Number(it.tax_rate || 0)}%
                      </span>
                    </td>
                    <td className="px-3 py-2 sm:px-4 sm:py-3 text-right font-medium tabular-nums">
                      ₹{Number(it.line_total || 0).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Info + Signature */}
      <div className="grid gap-4 sm:grid-cols-2 print-break-inside-avoid">
        <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50 p-4">
          <div className="text-sm font-medium mb-2" style={{ color: brandColor }}>Payment Information</div>
          <div className="space-y-2 text-xs sm:text-sm">
            <div className="flex justify-between">
              <span className="text-zinc-500">Business</span>
              <span className="font-medium text-right max-w-[60%] truncate" title={business?.name}>
                {business?.name || "-"}
              </span>
            </div>
            {business?.gst_number && (
              <div className="flex justify-between">
                <span className="text-zinc-500">GSTIN</span>
                <span className="font-mono text-right">{business.gst_number}</span>
              </div>
            )}
            {business?.phone && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Phone</span>
                <a href={`tel:${business.phone}`} className="hover:underline">
                  {business.phone}
                </a>
              </div>
            )}
            {business?.email && (
              <div className="flex justify-between">
                <span className="text-zinc-500">Email</span>
                <a href={`mailto:${business.email}`} className="hover:underline text-right truncate max-w-[70%]">
                  {business.email}
                </a>
              </div>
            )}
            {shop?.address && (
              <div className="flex justify-between items-start">
                <span className="text-zinc-500 pt-0.5">Address</span>
                <span className="text-right max-w-[70%]">
                  {shop.address.split(',').map((line, i) => (
                    <span key={i} className="block">{line.trim()}</span>
                  ))}
                </span>
              </div>
            )}
          </div>
        </div>
        
        <div className="grid gap-4">
          <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50 p-4">
            <div className="text-sm font-medium mb-2" style={{ color: brandColor }}>Payment Summary</div>
            <div className="space-y-1.5 text-xs sm:text-sm">
              <div className="flex justify-between">
                <span>Sub Total</span>
                <span>₹{Number(invoice.sub_total || 0).toLocaleString()}</span>
              </div>
              {Number(invoice.discount_total) > 0 && (
                <div className="flex justify-between text-red-600 dark:text-red-400">
                  <span>Discount</span>
                  <span>- ₹{Number(invoice.discount_total || 0).toLocaleString()}</span>
                </div>
              )}
              {Number(invoice.tax_total) > 0 && (
                <div className="flex justify-between">
                  <span>Tax</span>
                  <span>₹{Number(invoice.tax_total || 0).toLocaleString()}</span>
                </div>
              )}
              <div className="border-t border-black/10 dark:border-white/10 pt-2 mt-2">
                <div className="flex justify-between font-semibold text-base">
                  <span>Grand Total</span>
                  <span>₹{Number(invoice.grand_total || 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span>Amount Paid</span>
                  <span className={Number(invoice.amount_paid) > 0 ? "text-green-600 dark:text-green-400" : ""}>
                    ₹{Number(invoice.amount_paid || 0).toLocaleString()}
                  </span>
                </div>
                {Number(invoice.amount_paid) < Number(invoice.grand_total) && (
                  <div className="flex justify-between font-medium text-sm mt-1 text-amber-600 dark:text-amber-400">
                    <span>Balance Due</span>
                    <span>₹{(Number(invoice.grand_total || 0) - Number(invoice.amount_paid || 0)).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50 p-4 flex items-end">
            <div className="w-full text-center">
              <div className="h-8"></div>
              <div className="border-t-2 border-dashed border-zinc-300 dark:border-zinc-600"></div>
              <div className="mt-1 text-xs text-zinc-500">Authorized Signature</div>
            </div>
          </div>
        </div>
      </div>

      {/* Terms & Conditions */}
      <div className="rounded-xl border border-black/5 dark:border-white/10 bg-white/80 dark:bg-zinc-900/50 p-4 print-break-inside-avoid">
        <div className="text-sm font-medium mb-2" style={{ color: brandColor }}>Terms & Conditions</div>
        <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed">
          • Payment is due within {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'the due date'}.<br />
          • Please include invoice number {invoice.number} with your payment.<br />
          • For any queries, please contact {shop?.email ? (
            <a href={`mailto:${shop.email}`} className="text-blue-600 dark:text-blue-400 hover:underline">{shop.email}</a>
          ) : 'our support team'}.
        </p>
      </div>

      {/* Footer note */}
      <div className="text-center text-[10px] sm:text-xs text-zinc-400 dark:text-zinc-600 py-2 border-t border-zinc-100 dark:border-zinc-800">
        <p>This is a computer generated invoice. No signature is required.</p>
        <p className="mt-1">Generated on {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
}
