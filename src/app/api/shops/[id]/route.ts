import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function badRequest(message: string, issues?: any) {
  return NextResponse.json({ error: message, issues }, { status: 400 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await query(
    `SELECT id, business_id, name, address, phone, email, created_at, updated_at
     FROM shops WHERE id = $1 LIMIT 1`,
    [id]
  );
  const shop = rows[0];
  if (!shop) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: shop });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { name, address, phone, email } = body ?? {};

  if (name != null && String(name).trim() === "") return badRequest("name cannot be empty");

  const fields: string[] = [];
  const values: any[] = [];
  function set(col: string, val: any) {
    values.push(val);
    fields.push(`${col} = $${values.length}`);
  }
  if (name !== undefined) set("name", name);
  if (address !== undefined) set("address", address);
  if (phone !== undefined) set("phone", phone);
  if (email !== undefined) set("email", email);

  if (fields.length === 0) return badRequest("No fields to update");

  values.push(id);
  const idIdx = values.length;

  const { rows } = await query(
    `UPDATE shops SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idIdx}
     RETURNING id, business_id, name, address, phone, email, created_at, updated_at`,
    values
  );
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}
