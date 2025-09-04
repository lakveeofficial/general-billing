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
      where.push(`(name ILIKE $${values.length} OR email ILIKE $${values.length} OR phone ILIKE $${values.length})`);
    }

    // Prepare values for count (before limit/offset)
    const countValues = [...values];

    values.push(limit);
    const limitIdx = values.length;
    values.push(offset);
    const offsetIdx = values.length;

    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const { rows } = await query(
      `SELECT id, business_id, name, email, phone, gst_number, address, city, state, country, pincode, created_at, updated_at
       FROM customers
       ${whereSql}
       ORDER BY created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values
    );

    // Total count
    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM customers ${whereSql}`,
      countValues
    );
    const total = parseInt(countRows[0]?.count || "0", 10);

    return NextResponse.json({ data: rows, total });
  } catch (err: any) {
    console.error("GET /api/customers failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      business_id,
      name,
      email = null,
      phone = null,
      gst_number = null,
      address = null,
      city = null,
      state = null,
      country = "IN",
      pincode = null,
    } = body ?? {};

    if (!business_id) return badRequest("business_id is required");
    if (!name) return badRequest("name is required");

    const { rows } = await query(
      `INSERT INTO customers (business_id, name, email, phone, gst_number, address, city, state, country, pincode)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING id, business_id, name, email, phone, gst_number, address, city, state, country, pincode, created_at, updated_at`,
      [business_id, name, email, phone, gst_number, address, city, state, country, pincode]
    );

    return NextResponse.json({ data: rows[0] }, { status: 201 });
  } catch (err: any) {
    console.error("POST /api/customers failed", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
