import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import { Pool } from "pg";

const root = process.cwd();
const localPath = path.join(root, ".env.local");
const defaultPath = path.join(root, ".env");
dotenv.config({ path: fs.existsSync(localPath) ? localPath : defaultPath });

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is missing. Add it to .env.local");
  process.exit(1);
}

const pool = new Pool({ connectionString: DATABASE_URL });

async function main() {
  const client = await pool.connect();
  try {
    console.log("Seeding default business and shop...");
    await client.query("BEGIN");

    const bizName = "Medical Billing Co";
    const shopName = "Main Branch";

    const bizRes = await client.query(
      `INSERT INTO businesses (name, legal_name, currency)
       VALUES ($1, $2, 'INR')
       ON CONFLICT (gst_number) DO NOTHING
       RETURNING id`,
      [bizName, bizName]
    );

    let businessId: string | undefined = bizRes.rows[0]?.id;

    if (!businessId) {
      // If we didn't insert (no gst_number provided, so conflict path won't trigger), try to find an existing by name
      const existing = await client.query(`SELECT id FROM businesses WHERE name = $1 LIMIT 1`, [bizName]);
      if (existing.rows[0]) businessId = existing.rows[0].id;
    }

    if (!businessId) {
      // As a fallback, just insert ensuring a unique name by suffix
      const fallback = await client.query(
        `INSERT INTO businesses (name, legal_name, currency) VALUES ($1, $2, 'INR') RETURNING id`,
        [bizName + " " + Date.now(), bizName]
      );
      businessId = fallback.rows[0].id;
    }

    const shopRes = await client.query(
      `INSERT INTO shops (business_id, name)
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [businessId, shopName]
    );

    let shopId: string | undefined = shopRes.rows[0]?.id;
    if (!shopId) {
      const existingShop = await client.query(
        `SELECT id FROM shops WHERE business_id = $1 AND name = $2 LIMIT 1`,
        [businessId, shopName]
      );
      if (existingShop.rows[0]) shopId = existingShop.rows[0].id;
    }

    await client.query("COMMIT");
    console.log("Seed complete:");
    console.log("business_id:", businessId);
    console.log("shop_id:", shopId);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed failed:", err);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

main();
