import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

function badRequest(message: string, issues?: any) {
  return NextResponse.json({ error: message, issues }, { status: 400 });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { rows } = await query(
    `SELECT id, name, legal_name, gst_number, email, phone, address, city, state, country, pincode, currency,
            default_tax_type, default_tax_rate, default_hsn,
            invoice_prefix, invoice_next_number, invoice_number_padding,
            brand_logo, brand_color,
            created_at, updated_at
     FROM businesses WHERE id = $1 LIMIT 1`,
    [id]
  );
  const business = rows[0];
  if (!business) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: business });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const {
    name,
    legal_name,
    gst_number,
    email,
    phone,
    address,
    city,
    state,
    country,
    pincode,
    currency,
    default_tax_type,
    default_tax_rate,
    default_hsn,
    invoice_prefix,
    invoice_next_number,
    invoice_number_padding,
    brand_logo,
    brand_color,
  } = body ?? {};

  if (name != null && String(name).trim() === "") return badRequest("name cannot be empty");

  const fields: string[] = [];
  const values: any[] = [];
  function set(col: string, val: any) {
    values.push(val);
    fields.push(`${col} = $${values.length}`);
  }
  if (name != null) set("name", name);
  if (legal_name !== undefined) set("legal_name", legal_name);
  if (gst_number !== undefined) set("gst_number", gst_number);
  if (email !== undefined) set("email", email);
  if (phone !== undefined) set("phone", phone);
  if (address !== undefined) set("address", address);
  if (city !== undefined) set("city", city);
  if (state !== undefined) set("state", state);
  if (country !== undefined) set("country", country);
  if (pincode !== undefined) set("pincode", pincode);
  if (currency !== undefined) set("currency", currency);
  if (default_tax_type !== undefined) set("default_tax_type", default_tax_type);
  if (default_tax_rate !== undefined) set("default_tax_rate", Number(default_tax_rate));
  if (default_hsn !== undefined) set("default_hsn", default_hsn);
  if (invoice_prefix !== undefined) set("invoice_prefix", invoice_prefix);
  if (invoice_next_number !== undefined) set("invoice_next_number", Number(invoice_next_number));
  if (invoice_number_padding !== undefined) set("invoice_number_padding", Number(invoice_number_padding));
  if (brand_logo !== undefined) set("brand_logo", brand_logo);
  if (brand_color !== undefined) set("brand_color", brand_color);

  if (fields.length === 0) return badRequest("No fields to update");

  values.push(id);
  const idIdx = values.length;

  const { rows } = await query(
    `UPDATE businesses SET ${fields.join(", ")}, updated_at = NOW() WHERE id = $${idIdx}
     RETURNING id, name, legal_name, gst_number, email, phone, address, city, state, country, pincode, currency,
               default_tax_type, default_tax_rate, default_hsn,
               invoice_prefix, invoice_next_number, invoice_number_padding,
               brand_logo, brand_color,
               created_at, updated_at`,
    values
  );
  if (!rows[0]) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: rows[0] });
}
