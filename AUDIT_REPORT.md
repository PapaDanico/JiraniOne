# 🔍 JiraniHub Comprehensive Audit & Bug Report
**Date:** 2026-07-16
**Version:** 2.0 (Clean Build)
**Scope:** Full backend (`server/src`), frontend (`client/src`), and shared schema/validators, read in full — not a smoke test.

This supersedes the previous audit report, which was a feature-completeness pass and did not catch the correctness/security defects below. This pass specifically hunted for logic errors, race conditions, authorization bypasses, and broken execution paths, verified by tracing concrete request scenarios rather than reading code for style.

---

## ✅ Fixed in this pass

### Critical — money / financial integrity
1. **Forged donations, zero payment collected.** `POST /api/payments/campaigns/:id/donate` inserted a `donations` row and incremented `fundraising_campaigns.current_amount` straight from client input, with no M-PESA charge, no `campaign.status` check, and no relation to the STK-push flow at all. Any authenticated resident could inflate any campaign's total for free. The client never called this route (it uses `/api/harambee/:id/donate`, which does this correctly). **Fix:** removed the dead/dangerous endpoint entirely — `server/src/routes/payments.ts`.
2. **M-PESA "not configured" stub fails open in production.** `isMpesaConfigured()` gated the dev stub with no `NODE_ENV` check, in three separate places (`payments.ts` `/stk-push`, `chama.ts` `/:id/contribute`, `harambee.ts` `/:id/donate`). If a Daraja env var went missing/blank in production (typo, botched secret rotation), every payment "succeeded" instantly with `mpesaRef: "DEV_STUB"` and no money ever moved. **Fix:** stub path now only runs when `NODE_ENV !== "production"`; in production a missing config returns `503` and marks the payment `failed` instead of `completed`.

### High — data corruption / race conditions
3. **Facility double-booking (TOCTOU).** The conflict check and the booking `INSERT` were two separate statements on the non-transactional `db` client; two concurrent requests for the same slot could both pass the check before either commit. **Fix:** wrapped in `dbTx.transaction` with `SELECT ... FOR UPDATE` on the facility row, serializing concurrent bookings per facility — `server/src/routes/facilities.ts`.
4. **Facility booking approval never re-checked conflicts.** A booking could be approved after a conflicting one was already approved (via reject → new booking → re-approve sequences). **Fix:** added an overlap re-check on transition to `"approved"`.
5. **Carpool overbooking race.** `seatsAvailable` was read, checked, then written back with no lock; two concurrent bookings for the last seat could both succeed. Cancel had the same issue in reverse (double-increment past `seatsTotal`). **Fix:** both endpoints now lock the offer row (`FOR UPDATE`) inside a transaction; cancel additionally clamps to `seatsTotal` — `server/src/routes/carpool.ts`.
6. **Chama duplicate-membership race.** Membership check + insert were unlocked; a double-click or client retry could create two membership rows for one user. **Fix:** wrapped in a transaction with a row lock on the chama — `server/src/routes/chama.ts`.

### High — authorization / access control
7. **Cross-estate admin bypass in classifieds.** `PATCH`/`DELETE /api/classifieds/:id` authorized any `admin` account regardless of which estate the listing belonged to — an admin from Estate B could edit/delete Estate A's listings. **Fix:** admin check now also requires `listing.estateId === user.estateId` — `server/src/routes/classifieds.ts`.
8. **WebSocket broadcasts had no role scoping.** `broadcastToEstate` fanned out to every socket in an estate regardless of role, so a `vendor` account (spec: marketplace-only access) received panic-button GPS coordinates and phone numbers for every emergency alert in the estate. **Fix:** sockets now track the connected user's role, and `broadcastToEstate` accepts an optional `roles` filter; emergency alert broadcasts are now restricted to `admin`/`security` — `server/src/ws.ts`, `server/src/routes/emergency.ts`.
9. **Service-provider mass assignment.** The admin `PATCH /api/services/:id` spread the raw request body into the update (minus `id`/`estateId`), so `rating`, `ratingCount`, and the owning `userId` could be set directly with no real review/rating computation behind them. **Fix:** replaced with an explicit field allow-list (`name`, `category`, `phone`, `description`, `verified`) — `server/src/routes/services.ts`.
10. **Maintenance ticket assignee not scoped to estate.** `assignedToId` was accepted with no check that the assignee belonged to the same estate, silently notifying an unrelated user. **Fix:** assignee is now validated against the ticket's estate before the update — `server/src/routes/maintenance.ts`.

### High — broken registration flow
11. **Anti-enumeration measure was both ineffective and broke the app.** `POST /register` returned `202 {message, deferred:true}` for an existing phone vs. `201 <AuthUser>` for success — the differing status code defeated the stated purpose, **and** the client's `register()` treats any 2xx as success and stores the body as the logged-in user, so a returning user got dropped into a broken, garbage `auth.me` cache state (no session, but "truthy" user object) instead of a clear error. **Fix:** existing-phone registration now returns a plain `409` with a clear message ("already registered, try signing in") — `server/src/routes/auth.ts`.
12. **Login lockout counter race + crash.** The failed-attempt counter was a plain select-then-insert/update; concurrent bad-password requests could race (lost increments), and a user's very first failure under concurrent requests could throw an uncaught primary-key violation (500 instead of 401). **Fix:** atomic `INSERT ... ON CONFLICT DO UPDATE` increment — `server/src/routes/auth.ts`.
13. **Consent checkbox was decorative.** `registerSchema`'s `consent` field was `.optional()`, so omitting it entirely passed validation — a direct API call could create an account with no consent record at all, and the web form never actually sent the value it collected in the first place. **Fix:** `consent` is now required by the schema, and the client sends it — `shared/validators.ts`, `client/src/hooks/useAuth.tsx`, `client/src/pages/register.tsx`. *(Note: there is still no DB column to persist a consent timestamp — see Follow-ups.)*

### Medium
14. **Emergency status update skipped validation.** `PATCH /api/emergency/:id` cast `req.body.status` directly instead of validating it, so a bad value hit the Postgres enum column and threw — which, per the next item, previously just hung the request. **Fix:** added `updateEmergencyStatusSchema` (zod) — `shared/validators.ts`, `server/src/routes/emergency.ts`.
15. **Async route errors never reached the error handler.** Express 4 does not auto-forward promise rejections from `async (req, res) => {}` handlers; with no wrapper anywhere in the codebase, a thrown error in any route became an untracked `unhandledRejection` — logged, but the client's connection just hung until timeout instead of getting a response. **Fix:** added `express-async-errors`, imported first in `server/src/index.ts`, so thrown/rejected errors now correctly reach the existing `app.use((err, ...) => ...)` handler and return a proper `500`.
16. **Admin analytics counted soft-deleted residents.** The estate headcount query was missing `isNull(users.deletedAt)` (present everywhere else in the codebase), so removed residents stayed in `residents.total` indefinitely. **Fix:** added the filter — `server/src/routes/analytics.ts`.
17. **Parcel `/collected` skipped the gate check-in step.** A resident could mark a parcel "collected" while it was still `"expected"`, bypassing the gate hand-off entirely. **Fix:** now requires `status === "at_gate"` first — `server/src/routes/parcels.ts`.
18. **Seed script silently duplicated the demo estate.** `estates.name` has no unique constraint, so `onConflictDoNothing()` never actually detected a collision; every re-run of `npm run db:seed` created a fresh duplicate "NHC Stoni Athi View" row, and the dead `if (!estate)` branch never ran. **Fix:** now looks the estate up by name first and only inserts if absent — `server/src/seed.ts`.

### Frontend
19. **Emergency panic button never captured GPS, and had no error feedback.** Despite CLAUDE.md's explicit "GPS distress button: captures location" requirement, the alert form never called `navigator.geolocation`, and the mutation had no `onError` — a failed send (poor connectivity, exactly the scenario this feature exists for) just silently un-loaded the button with no explanation. **Fix:** best-effort, non-blocking GPS capture on dialog open, plus an error banner with a fallback to call security directly — `client/src/pages/emergency/index.tsx`.
20. **WebSocket reconnect fired after intentional disconnect.** The cleanup function only called `ws.current?.close()` without marking the effect as torn down; the `onclose` handler's reconnect check (`ws.current?.readyState === CLOSED`) is also true for an intentionally-closed socket, so logging out silently reopened a new WS connection ~3s later for a session that no longer existed. **Fix:** added a `stopped` flag checked before reconnecting, and clear the pending reconnect timer on cleanup — `client/src/hooks/useWebSocket.ts`.
21. **M-PESA STK-push dialog had no error handling.** A failed STK push (Daraja down, network drop) just stopped the button's spinner with zero feedback. **Fix:** added `onError` with a visible error banner, and coerced the amount to an integer client-side (the server rejects decimals) — `client/src/pages/payments/index.tsx`.
22. **Admin user edit/deactivate had no error feedback**, silently doing nothing on a failed `PATCH`/`DELETE`. **Fix:** added error display to the edit dialog and the deactivate action — `client/src/pages/admin/users.tsx`.
23. **Maintenance photo cap ("up to 5") was UI text only.** Selecting more than 5 files uploaded all of them, relying entirely on unverified server behavior. **Fix:** client now truncates to the first 5 and shows a notice — `client/src/components/maintenance/ticket-form.tsx`.

---

## ⚠️ Known issues — not fixed in this pass (recommended follow-ups)

These were identified and verified but require larger, riskier changes (schema migrations against a live DB we don't have credentials for in this environment, or product decisions) better suited to their own dedicated change:

- **No phone-ownership verification at registration.** Anyone can register an account under any real Kenyan phone number with no OTP/SMS confirmation step, squatting the number against its real owner. Recommend an OTP-gated registration flow (the OTP infrastructure already exists for password reset — `server/src/routes/auth.ts`).
- **Consent has no persistence.** The schema fix (#13 above) makes the API reject requests without `consent: true`, but there is still no `consentedAt` column on `users` to durably record when/if consent was given — needed for real Kenya Data Protection Act compliance. Requires a schema migration.
- **M-PESA callback race can orphan a payment.** If `stkPush()` succeeds but the follow-up `UPDATE payments SET checkout_request_id = ...` fails/is delayed, and Safaricom's callback arrives in that window, the callback's lookup (keyed on `checkout_request_id`) finds nothing and silently drops it — and the 5-minute reconciliation cron also requires a non-null `checkout_request_id`, so it can never recover the row either. Needs either writing `checkoutRequestId` before calling `stkPush`, or a secondary reconciliation path keyed on payment `id`.
- **Generic `/stk-push` type values aren't guarded.** A client could call the generic STK endpoint with `type: "harambee_donation"` (instead of the dedicated `harambee.ts` endpoint) and have Safaricom genuinely charge the resident, but with no `metadata.campaignId` set, so the callback handler's special-case logic silently skips creating the donation record — real money collected, no fundraising credit given. Recommend rejecting reserved `type` values on the generic endpoint.
- **No multi-provider SMS fallback**, despite CLAUDE.md describing Safaricom → Airtel → Telkom fallback. `lib/sms.ts` calls only Africa's Talking; an outage silently drops OTPs and alerts with no retry or secondary provider.
- **No offline-first implementation exists** for emergency alerts, maintenance drafts, or visitor pre-registration, despite being an explicit CLAUDE.md requirement (IndexedDB queue, background sync). This is a substantial feature gap, not a small fix — needs its own design/implementation pass.
- **Chama/carpool schema lacks unique constraints** (`chama_members(chama_id, user_id)` in particular) that would provide defense-in-depth against the races fixed above at the application layer. Since this environment has no `DATABASE_URL` to run `db:push` against, adding and verifying a migration wasn't safe to do blind — recommend adding `unique(chamaId, userId)` to `chamaMembers` in `shared/schema.ts` and pushing it in an environment with DB access.

---

## Verification performed

- `npm run typecheck` — clean, 0 errors.
- `npm run test` — 50/50 passing (added a regression test for the new required `consent` field).
- `npm run build` — production build succeeds (client + server bundles).
- No live database was available in this environment (no `DATABASE_URL`), so none of the fixes could be exercised against a real Postgres instance — review the transaction/locking changes (`facilities.ts`, `carpool.ts`, `chama.ts`) with real concurrent load before relying on them in production.

---

Generated: 2026-07-16
Audited by: Claude Code
