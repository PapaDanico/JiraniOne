import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "@shared/schema.js";

// index.ts's startup check only runs for local/traditional Node hosting —
// the deployed Netlify Function imports createApp()/db.ts directly and
// never executes it, so a missing DATABASE_URL there silently fell back to
// an unreachable localhost URL and every DB query failed with an opaque
// connection error instead of a clear one. Log loudly here too so that
// failure mode is diagnosable from Netlify's function logs.
if (!process.env.DATABASE_URL) {
  console.error(
    "❌ DATABASE_URL is not set — falling back to a localhost URL that will " +
      "not work in any deployed environment. Set DATABASE_URL in the site's " +
      "environment variables.",
  );
}
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
