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
      `SELECT id, business_id, name, email, phone, gst_number, address, city, state, country, pincode, created_at, updated_at FROM customers WHERE id = $1`,
      [id]
    );
    if (!rows[0]) return notFound();
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("GET /api/customers/[id] failed", err);
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
    const { name, email, phone, gst_number, address, city, state, country, pincode } = body ?? {};

    const fields: string[] = [];
    const values: any[] = [];

    const set = (col: string, val: any) => {
      values.push(val);
      fields.push(`${col} = $${values.length}`);
    };

    if (name !== undefined) set("name", name);
    if (email !== undefined) set("email", email);
    if (phone !== undefined) set("phone", phone);
    if (gst_number !== undefined) set("gst_number", gst_number);
    if (address !== undefined) set("address", address);
    if (city !== undefined) set("city", city);
    if (state !== undefined) set("state", state);
    if (country !== undefined) set("country", country);
    if (pincode !== undefined) set("pincode", pincode);

    if (fields.length === 0) return badRequest("No fields to update");

    values.push(id);
    const { rows } = await query(
      `UPDATE customers SET ${fields.join(", ")}, updated_at = now() WHERE id = $${values.length} RETURNING id, business_id, name, email, phone, gst_number, address, city, state, country, pincode, created_at, updated_at`,
      values
    );

    if (!rows[0]) return notFound();
    return NextResponse.json({ data: rows[0] });
  } catch (err) {
    console.error("PUT /api/customers/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { rows } = await query(`DELETE FROM customers WHERE id = $1 RETURNING id`, [id]);
    if (!rows[0]) return notFound();
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/customers/[id] failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
