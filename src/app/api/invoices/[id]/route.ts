import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";

export const dynamic = "force-dynamic";

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// PUT /api/invoices/[id] - Full edit: updates invoice fields and replaces items
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const {
      business_id,
      shop_id,
      customer_id = null,
      issue_date = null,
      due_date = null,
      notes = null,
      status = "ISSUED",
      items = [],
    } = body ?? {};

    if (!business_id) return NextResponse.json({ error: "business_id is required" }, { status: 400 });
    if (!shop_id) return NextResponse.json({ error: "shop_id is required" }, { status: 400 });
    if (!Array.isArray(items) || items.length === 0) return NextResponse.json({ error: "items must be a non-empty array" }, { status: 400 });

    type Item = {
      product_id?: string | null;
      description: string;
      quantity: number;
      unit_price: number;
      discount?: number;
      tax_rate?: number;
      tax_type?: string;
    };

    const normalized: Item[] = items.map((it: any) => ({
      product_id: it.product_id ?? null,
      description: String(it.description ?? ""),
      quantity: Number(it.quantity ?? 1),
      unit_price: Number(it.unit_price ?? 0),
      discount: Number(it.discount ?? 0),
      tax_rate: Number(it.tax_rate ?? 0),
      tax_type: it.tax_type ?? "GST",
    }));

    if (normalized.some((it) => !it.description || isNaN(it.quantity) || isNaN(it.unit_price))) {
      return NextResponse.json({ error: "Each item requires description, quantity, and unit_price numbers" }, { status: 400 });
    }

    let subTotal = 0;
    let discountTotal = 0;
    let taxTotal = 0;
    for (const it of normalized) {
      const lineBase = it.quantity * it.unit_price;
      const lineDiscount = it.discount ?? 0;
      const taxable = Math.max(lineBase - lineDiscount, 0);
      const lineTax = (it.tax_type === "NONE" ? 0 : (taxable * (it.tax_rate ?? 0)) / 100);
      subTotal += lineBase;
      discountTotal += lineDiscount;
      taxTotal += lineTax;
    }
    const grandTotal = subTotal - discountTotal + taxTotal;

    await client.query("BEGIN");

    // Ensure invoice exists
    const existing = await client.query(`SELECT id FROM invoices WHERE id = $1`, [id]);
    if (!existing.rows[0]) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const invRes = await client.query(
      `UPDATE invoices
       SET shop_id = $1, business_id = $2, customer_id = $3, issue_date = COALESCE($4, issue_date), due_date = $5,
           status = $6, notes = $7,
           sub_total = $8, discount_total = $9, tax_total = $10, grand_total = $11,
           updated_at = NOW()
       WHERE id = $12
       RETURNING *`,
      [
        shop_id,
        business_id,
        customer_id,
        issue_date,
        due_date,
        status,
        notes,
        subTotal,
        discountTotal,
        taxTotal,
        grandTotal,
        id,
      ]
    );

    await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [id]);
    for (const it of normalized) {
      const lineBase = it.quantity * it.unit_price;
      const lineDiscount = it.discount ?? 0;
      const taxable = Math.max(lineBase - lineDiscount, 0);
      const lineTax = (it.tax_type === "NONE" ? 0 : (taxable * (it.tax_rate ?? 0)) / 100);
      const lineTotal = taxable + lineTax;
      await client.query(
        `INSERT INTO invoice_items (
          invoice_id, product_id, description, quantity, unit_price, discount, tax_rate, tax_type, line_total
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [id, it.product_id ?? null, it.description, it.quantity, it.unit_price, it.discount ?? 0, it.tax_rate ?? 0, it.tax_type ?? "GST", lineTotal]
      );
    }

    await client.query("COMMIT");
    return NextResponse.json({ data: invRes.rows[0] });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("PUT /api/invoices/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    // @ts-ignore
    try { await (client as any).release(); } catch {}
  }
}

// PATCH /api/invoices/[id]
// Body: { status?: string, amount_paid?: number }
// If body is empty, treat as mark-as-paid (status=PAID, amount_paid=grand_total)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    console.log('PATCH /api/invoices/[id] - Request body:', JSON.stringify(body, null, 2));
    
    await client.query("BEGIN");

    // Get current invoice data
    const { rows: [current] } = await client.query(
      `SELECT id, status, grand_total, amount_paid FROM invoices WHERE id = $1 FOR UPDATE`,
      [id]
    );
    
    if (!current) {
      await client.query("ROLLBACK");
      return notFound();
    }
    
    console.log('Current invoice data:', JSON.stringify(current, null, 2));
    
    // Determine what to update
    const status = body.status || current.status;
    let amount_paid = current.amount_paid;
    
    // If marking as PAID and no amount_paid is provided, set it to grand_total
    if (status === 'PAID' && (body.amount_paid === undefined || body.amount_paid === null)) {
      amount_paid = current.grand_total;
      console.log(`Marking as PAID - setting amount_paid to grand_total: ${amount_paid}`);
    } else if (body.amount_paid !== undefined) {
      amount_paid = body.amount_paid;
    }
    
    // Only update if something changed
    if (status === current.status && amount_paid === current.amount_paid) {
      console.log('No changes to apply');
      await client.query('ROLLBACK');
      return NextResponse.json({ data: current });
    }
    
    // Perform the update
    const { rows: [updated] } = await client.query(
      `UPDATE invoices 
       SET status = $1, 
           amount_paid = $2, 
           updated_at = NOW() 
       WHERE id = $3 
       RETURNING *`,
      [status, amount_paid, id]
    );
    
    if (!updated) {
      console.error('No rows updated');
      await client.query('ROLLBACK');
      return notFound();
    }
    
    console.log('Update successful:', JSON.stringify(updated, null, 2));
    await client.query('COMMIT');
    return NextResponse.json({ data: updated });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("PATCH /api/invoices/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    // @ts-ignore
    try { await (client as any).release(); } catch {}
  }
}

// GET /api/invoices/[id] -> invoice + items
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT i.*, c.name AS customer_name
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       WHERE i.id = $1
       LIMIT 1`,
      [id]
    );
    const invoice = rows[0];
    if (!invoice) return notFound();

    const { rows: items } = await query(
      `SELECT * FROM invoice_items WHERE invoice_id = $1 ORDER BY created_at ASC`,
      [id]
    );

    return NextResponse.json({ data: { invoice, items } });
  } catch (err) {
    console.error("GET /api/invoices/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// DELETE /api/invoices/[id]
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const client = await pool.connect();
  try {
    const { id } = await params;
    await client.query("BEGIN");
    await client.query(`DELETE FROM invoice_items WHERE invoice_id = $1`, [id]);
    const del = await client.query(`DELETE FROM invoices WHERE id = $1 RETURNING id`, [id]);
    await client.query("COMMIT");
    if (del.rowCount === 0) return notFound();
    return NextResponse.json({ success: true });
  } catch (err) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("DELETE /api/invoices/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    // @ts-ignore
    try { await (client as any).release(); } catch {}
  }
}
