import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Fetch invoice + items
  const { rows: invRows } = await query(
    `SELECT i.*, c.name AS customer_name
     FROM invoices i
     LEFT JOIN customers c ON c.id = i.customer_id
     WHERE i.id = $1
     LIMIT 1`,
    [id]
  );
  const invoice = invRows[0];
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { rows: items } = await query(
    `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY id ASC`,
    [id]
  );
  // Try to use Playwright if installed
  let playwright: any;
  try {
    // dynamic import so typecheck works even if not installed yet
    // @ts-ignore - optional dependency, only present if installed
    playwright = (await import("playwright")).chromium;
  } catch {
    return NextResponse.json(
      { error: "PDF renderer not available. Install Playwright: npm i -D playwright && npx playwright install chromium" },
      { status: 501 }
    );
  }

  const html = renderInvoiceHtml(invoice, items);

  const browser = await playwright.launch({ headless: true });
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
    });
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename=invoice-${invoice.number || id}.pdf`,
      },
    });
  } finally {
    await browser.close();
  }
}

function esc(s: any) {
  return String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
}

function renderInvoiceHtml(invoice: any, items: any[]) {
  const rows = items.map((it) => `
    <tr>
      <td class="py-6">${esc(it.description)}</td>
      <td>${Number(it.quantity || 0)}</td>
      <td>₹${Number(it.unit_price || 0).toLocaleString()}</td>
      <td>₹${Number(it.discount || 0).toLocaleString()}</td>
      <td>${esc(it.tax_type || "GST")} ${Number(it.tax_rate || 0)}%</td>
      <td>₹${Number(it.line_total || 0).toLocaleString()}</td>
    </tr>
  `).join("");

  return `<!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <title>Invoice ${esc(invoice.number || "")}</title>
      <style>
        body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, Noto Sans, "Apple Color Emoji","Segoe UI Emoji"; color: #111827; }
        .container { max-width: 800px; margin: 24px auto; }
        .muted { color: #6b7280; }
        .card { border: 1px solid #e5e7eb; border-radius: 12px; padding: 16px; background: #fff; }
        h1 { font-size: 20px; margin: 0; }
        table { width: 100%; border-collapse: collapse; }
        th, td { text-align: left; padding: 8px 12px; border-bottom: 1px solid #f1f5f9; }
        th { color: #6b7280; font-weight: 600; }
        .totals { margin-top: 12px; }
        .totals .row { display: flex; justify-content: space-between; margin: 4px 0; }
        .totals .strong { font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div style="display:flex; justify-content: space-between; align-items:center; margin-bottom:16px;">
          <div>
            <div style="font-size:18px; font-weight:600;">General Billing</div>
            <div class="muted">Invoice #${esc(invoice.number || "")}</div>
          </div>
          <div class="muted">${new Date(invoice.issue_date).toLocaleDateString()}</div>
        </div>

        <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
          <div class="card">
            <div class="muted">Customer</div>
            <div style="font-weight:600;">${esc(invoice.customer_name || "-")}</div>
            <div style="margin-top:8px; font-size: 12px;">
              <div><span class="muted">Issue:</span> ${invoice.issue_date ? new Date(invoice.issue_date).toLocaleDateString() : "-"}</div>
              <div><span class="muted">Due:</span> ${invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "-"}</div>
              <div><span class="muted">Status:</span> ${esc(invoice.status)}</div>
            </div>
          </div>
          <div class="card">
            <div class="muted">Totals</div>
            <div class="totals">
              <div class="row"><span>Subtotal</span><span>₹${Number(invoice.sub_total || 0).toLocaleString()}</span></div>
              <div class="row"><span>Discount</span><span>- ₹${Number(invoice.discount_total || 0).toLocaleString()}</span></div>
              <div class="row"><span>Tax</span><span>₹${Number(invoice.tax_total || 0).toLocaleString()}</span></div>
              <div class="row strong"><span>Grand Total</span><span>₹${Number(invoice.grand_total || 0).toLocaleString()}</span></div>
              <div class="row"><span class="muted">Amount Paid</span><span>₹${Number(invoice.amount_paid || 0).toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        <div class="card">
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th>Qty</th>
                <th>Unit Price</th>
                <th>Discount</th>
                <th>Tax</th>
                <th>Line Total</th>
              </tr>
            </thead>
            <tbody>
              ${rows || `<tr><td class="py-6 muted" colspan="6">No items.</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>
    </body>
  </html>`;
}
