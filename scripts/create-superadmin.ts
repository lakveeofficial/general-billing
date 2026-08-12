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

async function run() {
  const emailArg = process.argv.find(a => a.startsWith('--email='))?.split('=')[1] || '';
  const nameArg = process.argv.find(a => a.startsWith('--name='))?.split('=')[1] || '';
  let email = emailArg || (process.env.SUPERADMIN_EMAIL || '').trim().toLowerCase();
  let name = nameArg || (process.env.SUPERADMIN_NAME || '').trim();

  if (!email) {
    console.error('Provide SUPERADMIN email with --email=example@domain.com or SUPERADMIN_EMAIL in env');
    process.exit(1);
  }

  let tempPassword = process.env.SUPERADMIN_PASSWORD || crypto.randomBytes(12).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Ensure enum exists (idempotent)
    await client.query(`DO $$ BEGIN PERFORM 1 FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE t.typname = 'user_role' AND n.nspname = 'public'; IF NOT FOUND THEN CREATE TYPE user_role AS ENUM ('SUPERADMIN','ADMIN','STAFF'); END IF; END $$;`);

    // Check if user exists
    const { rows: existing } = await client.query(`SELECT id, role FROM users WHERE email = $1 LIMIT 1`, [email]);
    if (existing[0]) {
      console.log(`User already exists with email ${email} and role ${existing[0].role}. No changes made.`);
      await client.query('ROLLBACK');
      return;
    }

    const password_hash = hashPasswordScrypt(tempPassword);
    const { rows } = await client.query(
      `INSERT INTO users (name, email, password_hash, role, is_active, must_reset_password)
       VALUES ($1,$2,$3,'SUPERADMIN', true, true)
       RETURNING id, email, role`,
      [name || null, email, password_hash]
    );

    await client.query('COMMIT');
    console.log('SUPERADMIN created successfully');
    console.log(`Email: ${rows[0].email}`);
    console.log(`Temporary Password: ${tempPassword}`);
    console.log('Note: The user will be forced to reset password on first login.');
  } catch (e) {
    await client.query('ROLLBACK');
    console.error('Failed to create SUPERADMIN:', e);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

run();
