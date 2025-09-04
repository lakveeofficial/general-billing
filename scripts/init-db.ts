import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Pool } from 'pg';

const root = process.cwd();
const localPath = path.join(root, '.env.local');
const defaultPath = path.join(root, '.env');
dotenv.config({ path: fs.existsSync(localPath) ? localPath : defaultPath });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is missing. Add it to .env.local');
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function ensureEnum(name: string, values: string[]) {
  const client = await pool.connect();
  try {
    // Check if enum exists
    const exists = await client.query(
      `SELECT 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = $1 AND n.nspname = 'public' LIMIT 1`,
      [name]
    );
    if (exists.rowCount === 0) {
      const enumVals = values.map((v) => `'${v}'`).join(',');
      await client.query(`CREATE TYPE ${name} AS ENUM (${enumVals});`);
      console.log(`Created enum ${name}`);
      return;
    }

    // Add missing values if any
    const { rows } = await client.query(
      `SELECT e.enumlabel AS label
       FROM pg_type t
       JOIN pg_enum e ON t.oid = e.enumtypid
       JOIN pg_namespace n ON n.oid = t.typnamespace
       WHERE n.nspname = 'public' AND t.typname = $1
       ORDER BY e.enumsortorder`,
      [name]
    );
    const existing = new Set(rows.map((r: any) => r.label));
    for (const val of values) {
      if (!existing.has(val)) {
        // Note: ALTER TYPE ... ADD VALUE cannot be undone; safe to try/catch for concurrent runs
        try {
          await client.query(`ALTER TYPE ${name} ADD VALUE '${val}';`);
          console.log(`Added value '${val}' to enum ${name}`);
        } catch (e) {
          // ignore if already exists due to race conditions
        }
      }
    }
  } finally {
    client.release();
  }
}

async function run() {
  const client = await pool.connect();
  try {
    console.log('Initializing database schema...');
    await client.query('BEGIN');

    // Try enabling extensions (optional)
    try {
      await client.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');
    } catch {}

    // Enums
    await ensureEnum('tax_type', ['NONE', 'GST', 'VAT']);
    await ensureEnum('invoice_status', ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'VOID']);

    // Tables (use gen_random_uuid from pgcrypto)
    await client.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name text NOT NULL,
        legal_name text,
        gst_number text UNIQUE,
        email text,
        phone text,
        address text,
        city text,
        state text,
        country text DEFAULT 'IN',
        pincode text,
        currency text NOT NULL DEFAULT 'INR',
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS shops (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name text NOT NULL,
        address text,
        phone text,
        email text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS products (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        sku text UNIQUE,
        name text NOT NULL,
        description text,
        unit_price numeric(12,2) NOT NULL,
        tax_rate numeric(5,2) NOT NULL DEFAULT 0.00,
        tax_type tax_type NOT NULL DEFAULT 'GST',
        hsn_code text,
        is_active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS customers (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        name text NOT NULL,
        email text,
        phone text,
        gst_number text,
        address text,
        city text,
        state text,
        country text DEFAULT 'IN',
        pincode text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS invoices (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        shop_id uuid NOT NULL REFERENCES shops(id) ON DELETE CASCADE,
        business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
        customer_id uuid REFERENCES customers(id),
        number text UNIQUE NOT NULL,
        issue_date date NOT NULL DEFAULT CURRENT_DATE,
        due_date date,
        status invoice_status NOT NULL DEFAULT 'DRAFT',
        notes text,
        sub_total numeric(12,2) NOT NULL DEFAULT 0.00,
        discount_total numeric(12,2) NOT NULL DEFAULT 0.00,
        tax_total numeric(12,2) NOT NULL DEFAULT 0.00,
        grand_total numeric(12,2) NOT NULL DEFAULT 0.00,
        amount_paid numeric(12,2) NOT NULL DEFAULT 0.00,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS invoice_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        product_id uuid REFERENCES products(id),
        description text NOT NULL,
        quantity numeric(12,3) NOT NULL DEFAULT 1.000,
        unit_price numeric(12,2) NOT NULL,
        discount numeric(12,2) NOT NULL DEFAULT 0.00,
        tax_rate numeric(5,2) NOT NULL DEFAULT 0.00,
        tax_type tax_type NOT NULL DEFAULT 'GST',
        line_total numeric(12,2) NOT NULL DEFAULT 0.00
      );

      CREATE TABLE IF NOT EXISTS payments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        amount numeric(12,2) NOT NULL,
        method text NOT NULL,
        reference text,
        paid_at timestamptz NOT NULL DEFAULT now(),
        notes text
      );
    `);

    // Helper checks for index/column existence to avoid errors in partially-created schemas
    const columnExists = async (table: string, column: string) => {
      const r = await client.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2 LIMIT 1`,
        [table, column]
      );
      return r.rowCount === 1;
    };
    const indexExists = async (name: string) => {
      const r = await client.query(
        `SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = $1 LIMIT 1`,
        [name]
      );
      return r.rowCount === 1;
    };

    // Indices (guarded)
    if ((await columnExists('products', 'business_id')) && !(await indexExists('idx_products_business'))) {
      await client.query(`CREATE INDEX idx_products_business ON products(business_id);`);
    }
    if ((await columnExists('customers', 'business_id')) && !(await indexExists('idx_customers_business'))) {
      await client.query(`CREATE INDEX idx_customers_business ON customers(business_id);`);
    }
    if ((await columnExists('invoices', 'business_id')) && !(await indexExists('idx_invoices_business'))) {
      await client.query(`CREATE INDEX idx_invoices_business ON invoices(business_id);`);
    }
    if ((await columnExists('invoices', 'shop_id')) && !(await indexExists('idx_invoices_shop'))) {
      await client.query(`CREATE INDEX idx_invoices_shop ON invoices(shop_id);`);
    }
    if ((await columnExists('invoice_items', 'invoice_id')) && !(await indexExists('idx_invoice_items_invoice'))) {
      await client.query(`CREATE INDEX idx_invoice_items_invoice ON invoice_items(invoice_id);`);
    }
    if ((await columnExists('payments', 'invoice_id')) && !(await indexExists('idx_payments_invoice'))) {
      await client.query(`CREATE INDEX idx_payments_invoice ON payments(invoice_id);`);
    }

    // Settings columns on businesses (guarded)
    if (!(await columnExists('businesses', 'default_tax_type'))) {
      await client.query(`ALTER TABLE businesses ADD COLUMN default_tax_type tax_type NOT NULL DEFAULT 'GST';`);
    }
    if (!(await columnExists('businesses', 'default_tax_rate'))) {
      await client.query(`ALTER TABLE businesses ADD COLUMN default_tax_rate numeric(5,2) NOT NULL DEFAULT 0.00;`);
    }
    if (!(await columnExists('businesses', 'default_hsn'))) {
      await client.query(`ALTER TABLE businesses ADD COLUMN default_hsn text;`);
    }
    if (!(await columnExists('businesses', 'invoice_prefix'))) {
      await client.query(`ALTER TABLE businesses ADD COLUMN invoice_prefix text NOT NULL DEFAULT 'INV-';`);
    }
    if (!(await columnExists('businesses', 'invoice_next_number'))) {
      await client.query(`ALTER TABLE businesses ADD COLUMN invoice_next_number integer NOT NULL DEFAULT 1;`);
    }
    if (!(await columnExists('businesses', 'invoice_number_padding'))) {
      await client.query(`ALTER TABLE businesses ADD COLUMN invoice_number_padding integer NOT NULL DEFAULT 5;`);
    }
    if (!(await columnExists('businesses', 'brand_logo'))) {
      await client.query(`ALTER TABLE businesses ADD COLUMN brand_logo text;`);
    }
    if (!(await columnExists('businesses', 'brand_color'))) {
      await client.query(`ALTER TABLE businesses ADD COLUMN brand_color text;`);
    }

    // Add missing created_at on invoice_items because queries order by it
    if (!(await columnExists('invoice_items', 'created_at'))) {
      await client.query(`ALTER TABLE invoice_items ADD COLUMN created_at timestamptz NOT NULL DEFAULT now();`);
    }

    await client.query('COMMIT');
    console.log('Database initialized successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Failed to initialize database:', err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
