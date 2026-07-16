import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema.js";

// DATABASE_URL validation happens in index.ts at server startup, not at build time.
// At module load, we allow it to be undefined so the build doesn't fail.
const url = process.env.DATABASE_URL || "postgresql://localhost/jiranihub";

// Use Supabase's Transaction pooler (Supavisor) connection string here, not
// the direct connection — Netlify Functions are stateless/short-lived, and
// pooling is what keeps concurrent invocations from exhausting Postgres's
// connection limit. `prepare: false` is required for transaction-mode
// pooling (the pooler doesn't guarantee the same backend across statements,
// so server-side prepared statements can't be reused). `max: 1` keeps each
// function instance holding at most one connection — Supavisor does the
// actual pooling across concurrent invocations.
// idle_timeout/max_lifetime release the one connection each warm function
// container holds back to Supavisor once it's been idle/old a while — with
// max:1 and neither set, a container that goes on to serve more invocations
// keeps that connection open forever, and enough warm containers under a
// traffic burst can exhaust Supavisor's own pool cap.
const client = postgres(url, {
  prepare: false,
  max: 1,
  idle_timeout: 20,
  max_lifetime: 60 * 30,
});

export const db = drizzle(client, { schema });

// Unlike Neon (whose HTTP driver had no transaction support, requiring a
// separate WebSocket-pooled client for atomic multi-statement writes),
// postgres-js supports `.transaction()` on the same client used for plain
// queries. `dbTx` is kept as an alias — same instance — purely so the many
// existing `dbTx.transaction(...)` call sites (M-PESA callback, fundraising
// donations, chama contributions, facility/carpool/chama row locking)
// don't need to change.
export const dbTx = db;

export type DB = typeof db;
export type DBTx = typeof dbTx;
