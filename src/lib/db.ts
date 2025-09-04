import { env } from "@/lib/env";
import { Pool, type QueryResultRow } from "pg";

// Ensure a single Pool instance across hot reloads in dev
const globalForPg = globalThis as unknown as {
  pgPool?: Pool;
};

export const pool =
  globalForPg.pgPool ??
  new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });

if (process.env.NODE_ENV !== "production") {
  globalForPg.pgPool = pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<{ rows: T[] }>
{
  const res = await pool.query<T>(text, params as any);
  return { rows: res.rows };
}
