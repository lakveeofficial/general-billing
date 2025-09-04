import { NextRequest, NextResponse } from "next/server";
import { pool, query } from "@/lib/db";

export const dynamic = "force-dynamic";

function badRequest(message: string, issues?: any) {
  return NextResponse.json({ error: message, issues }, { status: 400 });
}

// List invoices (basic pagination + optional business/shop filter)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const businessId = searchParams.get("businessId");
    const shopId = searchParams.get("shopId");
    const search = searchParams.get("search");

    const values: any[] = [];
    const where: string[] = [];
    if (businessId) {
      values.push(businessId);
      where.push(`i.business_id = $${values.length}`);
    }
    if (shopId) {
      values.push(shopId);
      where.push(`i.shop_id = $${values.length}`);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      values.push(s);
      // match by invoice number or customer name
      where.push(`(i.number ILIKE $${values.length} OR c.name ILIKE $${values.length})`);
    }

    values.push(limit);
    const limitIdx = values.length;
    values.push(offset);
    const offsetIdx = values.length;

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT i.id, i.number, i.status, i.issue_date, i.due_date,
              i.sub_total, i.discount_total, i.tax_total, i.grand_total, i.amount_paid,
              i.business_id, i.shop_id, i.customer_id, i.created_at, i.updated_at,
              c.name AS customer_name
       FROM invoices i
       LEFT JOIN customers c ON c.id = i.customer_id
       ${whereSql}
       ORDER BY i.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values
    );

    // Total count
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM invoices i
       ${whereSql}`,
      values.slice(0, values.length - 2) // exclude limit & offset
    );
    const total = parseInt(countRows[0]?.count || "0", 10);

    return NextResponse.json({ data: rows, total });
  } catch (err: any) {
    console.error("GET /api/invoices failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// Create invoice with items in a transaction, generate invoice number: INV-YYYY-XXXX
export async function POST(req: NextRequest) {
  const client = await pool.connect();
  try {
    const body = await req.json();
    const {
      business_id,
      shop_id,
      customer_id = null,
      issue_date = null,
      due_date = null,
      notes = null,
      items = [],
      status = "ISSUED",
    } = body ?? {};

    if (!business_id) return badRequest("business_id is required");
    if (!shop_id) return badRequest("shop_id is required");
    if (!Array.isArray(items) || items.length === 0) return badRequest("items must be a non-empty array");

    // Compute totals from items
    type Item = {
      product_id?: string | null;
      description: string;
      quantity: number;
      unit_price: number;
      discount?: number;
      tax_rate?: number;
      tax_type?: "GST" | "VAT" | "NONE" | string;
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
      return badRequest("Each item requires description, quantity, and unit_price numbers");
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

    // Generate invoice number using business settings under row lock
    const { rows: bizRows } = await client.query(
      `SELECT invoice_prefix, invoice_next_number, invoice_number_padding
       FROM businesses WHERE id = $1 FOR UPDATE`,
      [business_id]
    );
    const prefix: string = bizRows[0]?.invoice_prefix ?? "INV-";
    const nextNum: number = bizRows[0]?.invoice_next_number ?? 1;
    const pad: number = bizRows[0]?.invoice_number_padding ?? 4;
    const number = `${prefix}${String(nextNum).padStart(pad, "0")}`;

    const invRes = await client.query(
      `INSERT INTO invoices (
        shop_id, business_id, customer_id, number, issue_date, due_date, status, notes,
        sub_total, discount_total, tax_total, grand_total, amount_paid
      ) VALUES ($1,$2,$3,$4,COALESCE($5, CURRENT_DATE),$6,$7,$8,$9,$10,$11,$12,0)
      RETURNING *`,
      [
        shop_id,
        business_id,
        customer_id,
        number,
        issue_date,
        due_date,
        status,
        notes,
        subTotal,
        discountTotal,
        taxTotal,
        grandTotal,
      ]
    );
    const invoice = invRes.rows[0];

    // Increment next invoice number for the business
    await client.query(
      `UPDATE businesses SET invoice_next_number = COALESCE(invoice_next_number, 1) + 1, updated_at = NOW()
       WHERE id = $1`,
      [business_id]
    );

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
        [
          invoice.id,
          it.product_id ?? null,
          it.description,
          it.quantity,
          it.unit_price,
          it.discount ?? 0,
          it.tax_rate ?? 0,
          it.tax_type ?? "GST",
          lineTotal,
        ]
      );
    }

    await client.query("COMMIT");

    return NextResponse.json({ data: { ...invoice } }, { status: 201 });
  } catch (err: any) {
    await pool.query("ROLLBACK").catch(() => {});
    console.error("POST /api/invoices failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  } finally {
    // @ts-ignore
    try { await (client as any).release(); } catch {}
  }
}
