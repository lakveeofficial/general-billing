import { query } from "@/lib/db";
import EditInvoiceClient from "./EditInvoiceClient";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch invoice and items
  const { rows: invRows } = await query(
    `SELECT i.*, c.name AS customer_name
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.id = $1
     LIMIT 1`,
    [id]
  );
  const invoice = invRows[0];
  if (!invoice) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Edit Invoice</h1>
        <div className="rounded-xl border border-red-300/50 bg-red-50 text-red-900 p-4 text-sm">Invoice not found.</div>
      </div>
    );
  }

  const { rows: itemRows } = await query(
    `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`,
    [id]
  );

  // Customers for selection
  const { rows: customers } = await query<{ id: string; name: string }>(
    `SELECT id, name FROM customers ORDER BY name ASC LIMIT 200`
  );

  // Normalize dates to YYYY-MM-DD for input[type=date]
  const fmtDate = (d: any): string => {
    if (!d) return "";
    try {
      const s = String(d);
      // If already a date-only string, use it as-is to avoid TZ shifts
      if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
      if (/^\d{4}-\d{2}-\d{2}T/.test(s)) return s.slice(0, 10);
      const date = d instanceof Date ? d : new Date(s);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    } catch {
      return "";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Edit Invoice</h1>
      </div>
      <EditInvoiceClient
        invoiceId={invoice.id}
        businessId={invoice.business_id}
        shopId={invoice.shop_id}
        customers={customers}
        initial={
          {
            customer_id: invoice.customer_id || "",
            issue_date: fmtDate(invoice.issue_date),
            due_date: fmtDate(invoice.due_date),
            notes: invoice.notes || "",
            status: invoice.status,
            items: itemRows.map((it: any) => ({
              product_id: it.product_id || null,
              description: it.description,
              quantity: Number(it.quantity),
              unit_price: Number(it.unit_price),
              discount: Number(it.discount || 0),
              tax_rate: Number(it.tax_rate || 0),
              tax_type: it.tax_type || "GST",
            })),
          }
        }
      />
    </div>
  );
}
