# Verification scripts

Two opt-in checks that run against a **live app and a real database**, covering
what `npm test` and `npm run typecheck` structurally cannot:

| Script | Command | What it catches |
|---|---|---|
| `api-flows.mjs` | `npm run verify:api` | Routes not mounted, middleware ordering, role guards, request/response shapes — every module walked end to end, plus 12 authorization boundaries asserted as refusals |
| `ui-layout.mjs` | `npm run verify:ui` | Blank pages, wrong redirects, runtime errors that only fire with real data, and horizontal overflow at mobile/tablet/desktop widths |

Neither runs in CI — CI has no database and no browser. Run them locally before
a release, or after a change that touches routing, auth, or layout.

## Setup

Both need Postgres, a seeded database, and the app running.

```bash
# 1. Database
sudo pg_ctlcluster 16 main start          # tolerate "already running"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'localtest'"
sudo -u postgres createdb jiranihub_test  # first run only

export DATABASE_URL="postgresql://postgres:localtest@localhost:5432/jiranihub_test"
npm run db:push                           # add --force if it prompts
DEMO_PASSWORD='JiraniDemo2026!' npm run db:seed

# 2. App (both servers)
npm run dev
```

Then, in another shell:

```bash
npm run verify:api     # API only — does not need the client running
npm run verify:ui      # needs both, plus a browser (see below)
npm run verify         # both
```

Each exits non-zero on failure, so they can gate a deploy.

## Seeded accounts

All four share the password from the `DEMO_PASSWORD` used at seed time
(`JiraniDemo2026!` by default):

| Phone | Role |
|---|---|
| `0700000001` | admin |
| `0700000002` | resident |
| `0700000003` | security |
| `0700000004` | vendor |

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `VERIFY_API_URL` | `http://localhost:5000` | API base |
| `VERIFY_CLIENT_URL` | `http://localhost:3000` | Client base |
| `VERIFY_ORIGIN` | `http://localhost:3000` | `Origin` header — must be in the CORS allowlist, since mutating requests are origin-checked |
| `DEMO_PASSWORD` | `JiraniDemo2026!` | Must match the seed run |
| `PLAYWRIGHT_CHROMIUM_PATH` | `/opt/pw-browsers/chromium` | Browser binary for `verify:ui` |

## Playwright

Deliberately **not** a dependency — it would add a large install to every
`npm ci`, including the Netlify build. `verify:ui` resolves it from the project
first, then from a global install. If you don't have it:

```bash
npm i -D playwright && npx playwright install chromium
```

## Notes

- `verify:api` writes to the database (tickets, visitors, polls, bookings…).
  Point it at a test database, never production.
- Locally, M-PESA uses a dev stub (payments complete with ref `DEV_STUB`), SMS
  is stubbed, and the weather/traffic widgets 503 without API keys. `verify:ui`
  filters that expected noise so it doesn't mask real errors.
- Both scripts assume the seeded estate. Re-running is safe — records
  accumulate, and only uniqueness-sensitive fixtures (facility, chama) are
  suffixed to stay re-runnable.
- **Running either script more than twice in 15 minutes trips the login rate
  limiter.** `/api/auth/login` allows 10 attempts per 15 min per IP and each
  run signs in four times. Both scripts detect the 429 and say so; restart the
  API to reset the counter (it's in-memory), or wait out the window.

## Exit codes

| Code | Meaning |
|---|---|
| `0` | All checks passed |
| `1` | The app is reachable but a check failed — a real regression |
| `2` | Could not run: app unreachable, login refused, rate-limited, or Playwright missing |
