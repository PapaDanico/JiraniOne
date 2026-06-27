import { neon, Pool } from "@neondatabase/serverless";
import { drizzle as drizzleHttp } from "drizzle-orm/neon-http";
import { drizzle as drizzlePool } from "drizzle-orm/neon-serverless";
import * as schema from "@shared/schema.js";

// DATABASE_URL validation happens in index.ts at server startup, not at build time.
// At module load, we allow it to be undefined so the build doesn't fail.
const url = process.env.DATABASE_URL || "postgresql://localhost/jiranihub";

// HTTP driver: fast, serverless-friendly. NO transaction support.
// Use this for the vast majority of read paths and single-statement writes.
const sql = neon(url);
export const db = drizzleHttp(sql, { schema });

// Pool driver: WebSocket-backed, supports db.transaction(...).
// Use this ONLY for routes that need atomic multi-statement writes
// (M-PESA callback, fundraising donations, chama contributions).
// Pool is created lazily so non-payment workers don't open a socket they
// don't use.
let _pool: Pool | null = null;
function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: url });
  }
  return _pool;
}

export const dbTx = drizzlePool(getPool(), { schema });

export type DB = typeof db;
export type DBTx = typeof dbTx;
