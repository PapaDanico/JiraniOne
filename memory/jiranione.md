# JiraniOne (JiraniHub platform)
Last updated: 2026-08-15

## Status
Live in production at jiranisync.work. Two audits done in one session — a
functional one (every module, route and role walked end to end) and a code
audit across correctness / performance / UX / maintainability. Six PRs
(#61-#66) merged and deployed; production error log empty. The verification
is committed and now enforced in CI, so the next change repeats it for free.

Last deploy: `aa61738` -> Netlify `6a801cc8`, published 2026-08-15 08:02 UTC.

## Open Blockers
None. Nothing is waiting on a third party.

## Next Actions
- [ ] Delete TWO stale remote branches via the GitHub UI (Branches page):
      `claude/functionality-feature-audit-i7wkuo` and
      `claude/audit-bugs-check-24gnf9`. Both are fully merged — verified with
      `git diff origin/main origin/<branch>` returning empty.
      **Cannot be done from a Claude Code cloud session**: `git push --delete`
      is refused by the push proxy with HTTP 403 (creates and force-pushes
      work, deletes don't), and the GitHub MCP server exposes no ref-deletion
      tool (`create_branch`/`list_branches`/`delete_file` only). Don't retry
      it from here. — added 2026-08-15
- [ ] Decide whether `memory/` belongs in this repo at all. It's here because
      the cloud container is ephemeral and the repo is the only durable store,
      but this is a commercial product repo that may later be shared with a
      team or a buyer. Move it to a synced workspace folder if that changes.
      — added 2026-08-15
- [ ] Consider exempting authenticated GETs from the global limiter, or
      key it per session behind a trusted proxy. Raising the ceiling to
      20,000 buys ~49 concurrent users per IP, which is enough for now but
      is still a shared-fate design. — added 2026-08-15
- [x] RLS advisories — Capt. Dan confirmed handled on the Supabase side
      2026-08-15. Original note: add RLS policies to `push_subscriptions`,
      `quote_requests`, `subscription_invoices`. Three Supabase INFO
      advisories — RLS enabled with no policy, which is fail-closed and NOT a
      live exposure (the browser never talks to Postgres directly; Express
      route guards are the real control and pass 12/12 boundary checks).
      Tidiness, not security. — added 2026-08-15

## Key Numbers & Contacts
- Production: https://jiranisync.work (Netlify site `157aa70f-32fe-4073-a418-93afd3a5f0e1`)
- Database: Supabase project `reijnsabsiwbrafqvtmy`
- Lighthouse on production (2026-08-15): Performance 95, Accessibility 100,
  Best Practices 92, SEO 100, PWA 100.
  **Performance is noisy on this site — it read 91, 93, 94, 95, 96 and 97
  across one evening on builds with identical or unrelated shipped code.
  Treat swings under ~5 points as measurement noise, not signal.** The other
  four have been rock-steady and are the trustworthy read.
- CI (.github/workflows/ci.yml): typecheck -> unit tests -> build -> spin up
  postgres:16, db:push, db:seed, boot the API, run verify:api. ~90s total
  (was ~55s). A red `ci` now means real behaviour broke, not just types.
- Rate limits: global 20,000 req / 15 min / IP (sized from a measured 406
  per idle user per window); login 10 / 15 min / IP;
  STK push, register, forgot-password, leads all 5 per window
- Seeded local test accounts: `0700000001` admin, `0700000002` resident,
  `0700000003` security, `0700000004` vendor — password from `DEMO_PASSWORD`
- Verification: `npm run verify:api` (87 checks), `npm run verify:ui`
  (4 roles x 3 breakpoints), `npm run verify` for both. Exit 0 pass,
  1 real regression, 2 couldn't run. See `scripts/verify/README.md`.
- Route inventory: 127 API routes, all accounted for
- Scheduled Netlify functions: reconcile-payments (*/5 min), event-reminders
  (*/15 min), daily-cleanup, billing-invoices, visitor-purge (weekly),
  owner-digest (weekly)

## Recent Decisions
- 2026-08-15: Only an explicit 401 means "signed out". `useAuth` now retries
  other failures and surfaces a retry screen instead of redirecting. A
  transient 429/5xx/3G blip used to sign users out mid-session with a valid
  cookie still set — hit live during the audit. (PR #61)
- 2026-08-15: Global rate limit raised 200 -> 2000 per 15 min per IP. It was
  sized as if one IP meant one user, but a Kenyan estate sits behind one NAT
  (or CGNAT on Safaricom), so one busy household could spend the budget for
  the whole estate and the gate. Per-route limiters unchanged — those are the
  real security control. (PR #61)
- 2026-08-15: Desktop layout reflows instead of stretching one mobile column.
  New primitives `.dash-header`, `.dash-grid`, shrink-wrapping `.tab-row`.
  Dead space cut: security -37%, vendor -20%, resident -8%, admin -5%.
  Mobile deliberately untouched (within 1%). (PR #62)
- 2026-08-15: Kept the resident levy bar in the desktop side rail and centred
  the hero's content, rather than reverting to a full-width strip or leaving a
  ragged gap. (PR #63)
- 2026-08-15: Playwright stays out of `package.json`. It would add a large
  install to every `npm ci` including the Netlify build, so `verify:ui`
  resolves it from the project, then a global install. (PR #64)
- 2026-08-15: Verification scripts committed rather than left in a scratchpad,
  so coverage survives the session. (PR #64)
- 2026-08-15: Global rate limit 2000 -> 20,000/IP/15min, sized from a
  measured 406 requests per idle user per window rather than a guess. At
  2000 an estate behind one NAT got ~5 concurrent users before everyone,
  gate included, started seeing 429s. (PR #66)
- 2026-08-15: /api/events de-N+1'd — was up to 101 queries per request (2
  per event over a 50-row limit) on a 15s-polled endpoint; now 3 total,
  using the batching shape chama.ts already had. (PR #66)
- 2026-08-15: CI now runs verify:api against a throwaway Postgres, so the
  87 behavioural checks are enforced rather than optional. verify:ui stays
  manual (needs a browser). (PR #66)
- 2026-08-15: CLAUDE.md's "offline-first for emergency alerts" corrected —
  the code deliberately does NOT queue panic alerts (a late alert is worse
  than none; the SOS dialog fails loudly and shows the security number).
  The code was right and the brief was wrong. (PR #66)
- 2026-08-15: **Retracted a headline audit finding.** I reported that every
  poll re-downloaded unchanged data at 2.24 MB per idle hour, contradicting
  the mobile-data USP. False — the server was already answering most polls
  with 304. Two client-side tools misreported in the same direction and the
  number fit the story I expected, so I believed them. See "Measurement
  traps" below. Kept the `Cache-Control: private, no-cache` header anyway,
  but for the two narrower reasons that survive scrutiny: it pins
  revalidation we already rely on (heuristic freshness is
  browser-discretionary, so Safari/Firefox/Android WebView may differ), and
  `private` stops a shared cache — Netlify's CDN sits in front — from
  storing one resident's JSON and serving it to another. (PR #66)

## Measurement traps (cost real time — read before benchmarking this app)
- **Playwright `response.body()` returns the CACHED body on a 304**, and CDP
  `Network.responseReceived` reports the synthesized 200 the page sees, not
  the wire status. Both made it look like every poll re-downloaded full
  payloads. They don't — Chrome was already revalidating via heuristic
  freshness and the server was already answering 28-of-40 with 304.
  **Ground truth is the server's own log**:
  `grep -o '"statusCode":[0-9]*' /tmp/api.log | sort | uniq -c`. Check that
  first, before any client-side byte measurement.
- Idle polling load is real though: **28 requests / 62s per user on a
  dashboard (~406 per 15-min window)** — 7 mounted queries refetched every
  15s. That is what sizes the rate limit, and 304s do NOT reduce it.

## Gotchas (environment + codebase)
- Running either verify script more than twice in 15 minutes trips the login
  limiter (4 sign-ins per run vs a 10-per-15-min cap). Restart the API to
  reset the in-memory counter. Both scripts name the 429 explicitly now.
- Console-error checks must start only *after* login: the login page probes
  `/api/auth/me` while signed out and that 401 is correct behaviour. Filtering
  401s wholesale would blind the check to the post-login 401 that PR #61 fixed.
- `git stash` + `cd` into a subdirectory is a trap — `git stash pop` in a
  non-repo directory silently leaves work stashed.
- The GitHub MCP token hits its GraphQL rate limit well before REST. Marking a
  PR ready for review is GraphQL; merging is REST, so merges kept working
  while the draft toggle was blocked. **Practical fix: open PRs non-draft**
  when you intend to merge as soon as CI is green.
- Bash tool cwd PERSISTS between calls. A `cd` into `server/src/routes` for a
  grep made the next server launch resolve `server/src/index.ts` relative to
  that directory (`ERR_MODULE_NOT_FOUND`). Use absolute paths for anything
  that outlives the command.
- The code audit found no new correctness bugs. Things confirmed sound and
  not worth re-auditing: money is Postgres `decimal` (not float), 14
  transactions guard multi-step writes, duplicate votes and double-bookings
  correctly 409, `/api/events` was the only N+1 in the codebase (now fixed),
  and role guards hold across 12 boundary checks.

## Cross-links
None material. This is a self-contained product; no other portfolio project
currently depends on it.
