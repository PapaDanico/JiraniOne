---
name: run-local
description: Launch and drive the JiraniOne web app locally (Express API + Vite client + local Postgres) and interact with it via Playwright/Chromium — use when asked to run the app, verify a change in the real UI, take screenshots, or E2E-test a flow in the Claude Code cloud sandbox.
---

# Run JiraniOne locally (cloud-sandbox verified)

Full-stack PWA: Express API (tsx, port **5000**) + Vite client (port
**3000**, proxies `/api` and `/uploads` to 5000) + Postgres 16. Every
step below was verified from this repo in the Claude Code cloud sandbox.

## 1. Postgres (local test DB)

```bash
sudo pg_ctlcluster 16 main start   # tolerate "already running" / "Removed stale pid file"
# One-time bootstrap (idempotent — skip silently if already done):
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'localtest'" 2>/dev/null
sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='jiranihub_test'" | grep -q 1 \
  || sudo -u postgres createdb jiranihub_test
```

The connection string used everywhere below:
`postgresql://postgres:localtest@localhost:5432/jiranihub_test`

**Schema + demo data (first run only):**

```bash
export DATABASE_URL="postgresql://postgres:localtest@localhost:5432/jiranihub_test"
npm run db:push          # drizzle-kit push; append --force if it prompts
DEMO_PASSWORD='JiraniDemo2026!' npm run db:seed
```

Seeded accounts (all password `JiraniDemo2026!`):
- `0700000001` — admin "Daniel Ng'ong'a" (estate: NHC Stoni Athi View)
- `0700000002` — resident "Aisha Kamau" (unit A4)
- `0700000003` — security · `0700000004` — vendor

## 2. Launch both servers

Never chain with `sleep` — background them and poll:

```bash
fuser -k 5000/tcp 3000/tcp 2>/dev/null   # kill stale servers FIRST (see gotchas)
DATABASE_URL="postgresql://postgres:localtest@localhost:5432/jiranihub_test" \
SESSION_SECRET="local_test_secret_that_is_long_enough_123456" \
PORT=5000 npx tsx server/src/index.ts > /tmp/api.log 2>&1 &
npx vite --config client/vite.config.ts > /tmp/vite.log 2>&1 &
for i in $(seq 1 30); do
  curl -sf http://localhost:5000/api/health 2>/dev/null | grep -q '"ok"' \
    && curl -sf http://localhost:3000 >/dev/null 2>&1 && echo READY && break
  sleep 1
done
```

`/api/health` returns `{"status":"ok",...}` only when the DB is
reachable — `"degraded"` + ECONNREFUSED means Postgres isn't running.

## 3. Drive it with Playwright

Playwright is pre-installed globally — do NOT `npm install playwright`
or `playwright install`. Import and launch exactly like this:

```js
const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
```

**Login quirks (will cost you retries if skipped):**
- Staff accounts (admin/security/vendor) require clicking the audience
  toggle first: `await page.getByText('ESTATE STAFF').first().click();`
  (`getByRole('button', ...)` times out — use `getByText`).
- Residents log in directly. Fields: `input[type="tel"]`,
  `input[type="password"]`, then `button[type="submit"]`, then
  `waitForURL('**/dashboard/<role>')`.
- Run scripts as `.mjs` files from the scratchpad (top-level await needs
  ESM; `.ts`/`.mts` under tsx in scratchpad may transpile as CJS and
  fail on top-level await — plain `.mjs` + `node` always works).

## 4. Gotchas

- **EADDRINUSE on 5000** — a stale tsx server survives generic pkill
  patterns and silently serves OLD code. Always `fuser -k 5000/tcp
  3000/tcp` before relaunching.
- **Weather/traffic widgets 503** locally (no `GOOGLE_MAPS_API_KEY` /
  weather key) — expected console noise, widgets hide themselves.
- **SMS is stubbed** locally (`[SMS STUB]` lines in the API log) unless
  `SMS_API_KEY`/`SMS_USERNAME` are set. M-PESA uses the dev stub: STK
  payments auto-complete with ref `DEV_STUB`.
- **Postgres cluster dies between sessions** — rerun the
  `pg_ctlcluster` line whenever health reports `ECONNREFUSED`.
- New DB columns merged recently? Local DB may lag the schema — rerun
  `npm run db:push` (production migrations are applied separately via
  Supabase MCP and are NOT this DB).
- The production API base (`jiranisync.work` / `*.netlify.app`) is
  blocked by the sandbox proxy — verify production via Netlify/Supabase
  MCP tools, never curl.
