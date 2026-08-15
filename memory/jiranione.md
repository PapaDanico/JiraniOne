# JiraniOne (JiraniHub platform)
Last updated: 2026-08-15

## Status
Live in production at jiranisync.work and audited healthy — every module,
route and role verified end to end, with the verification itself now
committed so the next change can repeat it.

## Open Blockers
None. Nothing is waiting on a third party.

## Next Actions
- [ ] Delete the merged remote branch `claude/functionality-feature-audit-i7wkuo`
      — all four PRs merged from it, nothing unmerged. The push proxy refused
      the delete; it's one click in the GitHub UI. — added 2026-08-15
- [ ] Decide whether `memory/` belongs in this repo at all. It's here because
      the cloud container is ephemeral and the repo is the only durable store,
      but this is a commercial product repo that may later be shared with a
      team or a buyer. Move it to a synced workspace folder if that changes.
      — added 2026-08-15
- [ ] Optional, low priority: add RLS policies to `push_subscriptions`,
      `quote_requests`, `subscription_invoices`. Three Supabase INFO
      advisories — RLS enabled with no policy, which is fail-closed and NOT a
      live exposure (the browser never talks to Postgres directly; Express
      route guards are the real control and pass 12/12 boundary checks).
      Tidiness, not security. — added 2026-08-15

## Key Numbers & Contacts
- Production: https://jiranisync.work (Netlify site `157aa70f-32fe-4073-a418-93afd3a5f0e1`)
- Database: Supabase project `reijnsabsiwbrafqvtmy`
- Lighthouse on production (2026-08-15): Performance 97, Accessibility 100,
  Best Practices 92, SEO 100, PWA 100
- Rate limits: global 2000 req / 15 min / IP; login 10 / 15 min / IP;
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

## Gotchas learned this session
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
  while the draft toggle was blocked.

## Cross-links
None material. This is a self-contained product; no other portfolio project
currently depends on it.
