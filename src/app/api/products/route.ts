import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function badRequest(message: string, issues?: any) {
  return NextResponse.json({ error: message, issues }, { status: 400 });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search")?.trim() ?? "";
    const limit = Math.min(parseInt(searchParams.get("limit") || "20", 10), 100);
    const offset = parseInt(searchParams.get("offset") || "0", 10);
    const businessId = searchParams.get("businessId");

    const values: any[] = [];
    const where: string[] = [];

    if (businessId) {
      values.push(businessId);
      where.push(`business_id = $${values.length}`);
    }
    if (search) {
      values.push(`%${search}%`);
      where.push(`(name ILIKE $${values.length} OR sku ILIKE $${values.length})`);
    }

    values.push(limit);
    const limitIdx = values.length;
    values.push(offset);
    const offsetIdx = values.length;

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT id, business_id, sku, name, description, unit_price, tax_rate, tax_type, hsn_code, is_active, created_at, updated_at
       FROM products
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values
    );

    return NextResponse.json({ data: rows });
  } catch (err: any) {
    console.error("GET /api/products failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      business_id,
      sku = null,
      name,
      description = null,
      unit_price,
      tax_rate = 0,
      tax_type = "GST",
      hsn_code = null,
      is_active = true,
    } = body ?? {};

    if (!business_id) return badRequest("business_id is required");
    if (!name) return badRequest("name is required");
    if (unit_price == null || isNaN(Number(unit_price))) return badRequest("unit_price must be a number");

    const { rows } = await query(
      `INSERT INTO products (business_id, sku, name, description, unit_price, tax_rate, tax_type, hsn_code, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id, business_id, sku, name, description, unit_price, tax_rate, tax_type, hsn_code, is_active, created_at, updated_at`,
      [
        business_id,
        sku,
        name,
        description,
        Number(unit_price),
        Number(tax_rate ?? 0),
        tax_type,
        hsn_code,
        Boolean(is_active),
      ]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/products failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
