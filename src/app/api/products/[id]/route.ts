import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function notFound() {
  return NextResponse.json({ error: "Not Found" }, { status: 404 });
}
function badRequest(message: string, issues?: any) {
  return NextResponse.json({ error: message, issues }, { status: 400 });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { rows } = await query(
      `SELECT id, business_id, sku, name, description, unit_price, tax_rate, tax_type, hsn_code, is_active, created_at, updated_at FROM products WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return notFound();
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("GET /api/products/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      sku,
      name,
      description,
      unit_price,
      tax_rate,
      tax_type,
      hsn_code,
      is_active,
    } = body ?? {};

    if (unit_price != null && isNaN(Number(unit_price))) return badRequest("unit_price must be a number");
    if (tax_rate != null && isNaN(Number(tax_rate))) return badRequest("tax_rate must be a number");

    const fields: string[] = [];
    const values: any[] = [];

    const set = (col: string, val: any) => {
      values.push(val);
      fields.push(`${col} = $${values.length}`);
    };

    if (sku !== undefined) set("sku", sku);
    if (name !== undefined) set("name", name);
    if (description !== undefined) set("description", description);
    if (unit_price !== undefined) set("unit_price", Number(unit_price));
    if (tax_rate !== undefined) set("tax_rate", Number(tax_rate));
    if (tax_type !== undefined) set("tax_type", tax_type);
    if (hsn_code !== undefined) set("hsn_code", hsn_code);
    if (is_active !== undefined) set("is_active", Boolean(is_active));

    if (fields.length === 0) return badRequest("No fields to update");

    values.push(id);
    const { rows } = await query(
      `UPDATE products SET ${fields.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING id, business_id, sku, name, description, unit_price, tax_rate, tax_type, hsn_code, is_active, created_at, updated_at`,
      values
    );

    if (!rows[0]) return notFound();
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("PUT /api/products/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { rows } = await query(`DELETE FROM products WHERE id = $1 RETURNING id`, [id]);
    if (!rows[0]) return notFound();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/products/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
