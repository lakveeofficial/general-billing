import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import crypto from 'crypto';
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

function hashPasswordScrypt(password: string): string {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(password, salt, 32);
  return `scrypt:${salt.toString('hex')}:${derived.toString('hex')}`;
}

function genTempPassword(): string {
  return crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
}

async function ensureBusiness(client: any, name: string) {
  const { rows } = await client.query(`SELECT id FROM businesses WHERE name = $1 LIMIT 1`, [name]);
  if (rows[0]) return rows[0].id as string;
  const r2 = await client.query(`INSERT INTO businesses (name) VALUES ($1) RETURNING id`, [name]);
  return r2.rows[0].id as string;
}

async function ensureShop(client: any, businessId: string, name: string) {
  const { rows } = await client.query(`SELECT id FROM shops WHERE business_id = $1 AND name = $2 LIMIT 1`, [businessId, name]);
  if (rows[0]) return rows[0].id as string;
  const r2 = await client.query(`INSERT INTO shops (business_id, name) VALUES ($1,$2) RETURNING id`, [businessId, name]);
  return r2.rows[0].id as string;
}

async function ensureUser(client: any, email: string, role: 'SUPERADMIN'|'ADMIN'|'STAFF', name?: string) {
  const { rows } = await client.query(`SELECT id, role FROM users WHERE email = $1 LIMIT 1`, [email]);
  if (rows[0]) {
    return { id: rows[0].id as string, created: false, tempPassword: null as string | null };
  }
  const temp = genTempPassword();
  const hash = hashPasswordScrypt(temp);
  const r2 = await client.query(
    `INSERT INTO users (name, email, password_hash, role, is_active, must_reset_password) VALUES ($1,$2,$3,$4,true,true) RETURNING id`,
    [name || null, email, hash, role]
  );
  return { id: r2.rows[0].id as string, created: true, tempPassword: temp };
}

async function ensureMembership(client: any, userId: string, businessId: string, role: 'ADMIN'|'STAFF', shopId?: string | null) {
  const { rows } = await client.query(
    `SELECT id FROM memberships WHERE user_id = $1 AND business_id = $2 AND COALESCE(shop_id::text,'') = COALESCE($3::text,'') AND role = $4 LIMIT 1`,
    [userId, businessId, shopId || null, role]
  );
  if (rows[0]) return rows[0].id as string;
  const r2 = await client.query(
    `INSERT INTO memberships (user_id, business_id, shop_id, role) VALUES ($1,$2,$3,$4) RETURNING id`,
    [userId, businessId, shopId || null, role]
  );
  return r2.rows[0].id as string;
}

async function main() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure enums and basic tables exist (defensive)
    await client.query(`DO $$ BEGIN PERFORM 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'user_role' AND n.nspname = 'public'; IF NOT FOUND THEN CREATE TYPE user_role AS ENUM ('SUPERADMIN','ADMIN','STAFF'); END IF; END $$;`);

    // Seed business and shops
    const bizId = await ensureBusiness(client, 'Acme Corp');
    const shopNorthId = await ensureShop(client, bizId, 'Acme North');
    const shopSouthId = await ensureShop(client, bizId, 'Acme South');

    // Users
    const superUser = await ensureUser(client, 'superadmin@test.com', 'SUPERADMIN', 'Super Admin');
    const admin = await ensureUser(client, 'admin@test.com', 'ADMIN', 'Alice Admin');
    const staff1 = await ensureUser(client, 'staff1@test.com', 'STAFF', 'Bob Staff');
    const staff2 = await ensureUser(client, 'staff2@test.com', 'STAFF', 'Carol Staff');

    // Memberships
    await ensureMembership(client, admin.id, bizId, 'ADMIN'); // business-wide admin
    await ensureMembership(client, staff1.id, bizId, 'STAFF', shopNorthId); // shop-specific staff
    await ensureMembership(client, staff2.id, bizId, 'STAFF'); // business-wide staff

    await client.query('COMMIT');

    console.log('--- Seed Complete ---');
    console.log('Business: Acme Corp');
    console.log(`  Shops: Acme North (${shopNorthId}), Acme South (${shopSouthId})`);
    console.log('Users (login emails and temp passwords if newly created):');
    console.log(`  SUPERADMIN: superadmin@test.com  ${superUser.created ? `(temp: ${superUser.tempPassword})` : '(existing)'}`);
    console.log(`  ADMIN:      admin@test.com       ${admin.created ? `(temp: ${admin.tempPassword})` : '(existing)'}`);
    console.log(`  STAFF #1:   staff1@test.com      ${staff1.created ? `(temp: ${staff1.tempPassword})` : '(existing)'}  [shop: Acme North]`);
    console.log(`  STAFF #2:   staff2@test.com      ${staff2.created ? `(temp: ${staff2.tempPassword})` : '(existing)'}  [business-wide]`);
    console.log('Note: New users are required to reset password at first login.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Seed failed:', e);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
