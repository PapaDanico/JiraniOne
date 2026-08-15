#!/usr/bin/env node
// End-to-end API verification across all four roles.
//
// Walks every module the way a real user would — resident raises a ticket,
// security checks a visitor in and out, admin runs a poll, a vendor answers a
// quote — then asserts the authorization boundaries hold. Complements the
// vitest suite, which covers pure logic: this covers wiring (routes mounted,
// middleware ordering, role guards, request/response shapes) against a real
// database, which is where the bugs that reach production actually live.
//
// Requires a running API and a seeded database — see scripts/verify/README.md.
// Not part of `npm test`: CI has no database.
//
//   npm run verify:api
//
// Exits non-zero if any check fails, so it can gate a deploy.

const BASE = process.env.VERIFY_API_URL ?? "http://localhost:5000";
const ORIGIN = process.env.VERIFY_ORIGIN ?? "http://localhost:3000";
const PW = process.env.DEMO_PASSWORD ?? "JiraniDemo2026!";

// Seeded accounts (server/src/seed.ts).
const ACCOUNTS = {
  admin: "0700000001",
  resident: "0700000002",
  security: "0700000003",
  vendor: "0700000004",
};

const hours = (h) => new Date(Date.now() + h * 3600e3).toISOString();
const results = [];

async function login(phone) {
  const r = await fetch(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify({ phone, password: PW }),
  });
  if (r.status === 429) {
    // /api/auth/login allows 10 attempts per 15 min per IP. Each run of this
    // script signs in four times, so a third run inside the window trips it.
    // Worth naming precisely — the generic message below sent us hunting for
    // a seed problem that wasn't there.
    throw new Error(
      "Login rate-limited (429). This script signs in 4 times per run and the\n" +
        "limiter allows 10 attempts per 15 minutes per IP. Either wait for the\n" +
        "window to clear, or restart the API to reset the in-memory counter.",
    );
  }
  if (!r.ok) {
    throw new Error(
      `login failed for ${phone}: ${r.status}. ` +
        `Is the database seeded, and does DEMO_PASSWORD match the seed run?`,
    );
  }
  const cookie = (r.headers.getSetCookie?.() ?? [])
    .map((c) => c.split(";")[0])
    .join("; ");
  return cookie;
}

async function call(cookie, method, path, body) {
  const r = await fetch(BASE + path, {
    method,
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
    body: body ? JSON.stringify(body) : undefined,
  });
  const type = r.headers.get("content-type") ?? "";
  let parsed = null;
  if (type.includes("json")) parsed = await r.json().catch(() => null);
  else parsed = (await r.text()).slice(0, 200);
  return { status: r.status, body: parsed, data: parsed?.data ?? parsed, type };
}

// `expect` defaults to "any 2xx". Pass an array to accept specific codes —
// used for the checks whose whole point is a rejection (409 on a duplicate
// vote, 403 on a role boundary).
function check(name, res, expect = null) {
  const ok = expect
    ? expect.includes(res.status)
    : res.status >= 200 && res.status < 300;
  results.push({
    name,
    status: res.status,
    ok,
    detail: ok ? "" : JSON.stringify(res.body).slice(0, 200),
  });
  return res;
}

async function main() {
  const health = await fetch(`${BASE}/api/health`).catch(() => null);
  if (!health?.ok) {
    console.error(
      `Cannot reach the API at ${BASE}. Start it first — see scripts/verify/README.md.`,
    );
    process.exit(2);
  }

  const [A, R, S, V] = await Promise.all([
    login(ACCOUNTS.admin),
    login(ACCOUNTS.resident),
    login(ACCOUNTS.security),
    login(ACCOUNTS.vendor),
  ]);
  for (const role of Object.keys(ACCOUNTS)) {
    results.push({ name: `login ${role}`, status: 200, ok: true, detail: "" });
  }

  let r;

  // ── Announcements ────────────────────────────────────────────────────────
  r = check("admin creates announcement", await call(A, "POST", "/api/announcements", {
    title: "Water shutdown Tuesday",
    body: "Mains maintenance 9am-3pm across all blocks.",
    priority: "warning",
  }));
  const annId = r.data?.id;
  check("resident lists announcements", await call(R, "GET", "/api/announcements"));
  if (annId) {
    check("resident acknowledges", await call(R, "POST", `/api/announcements/${annId}/acknowledge`));
    check("admin sees read receipts", await call(A, "GET", `/api/announcements/${annId}/reads`));
  }

  // ── Maintenance ──────────────────────────────────────────────────────────
  r = check("resident raises ticket", await call(R, "POST", "/api/maintenance", {
    title: "Leaking kitchen tap",
    description: "Kitchen tap drips continuously, wasting water.",
    category: "plumbing",
    priority: "medium",
  }));
  const ticketId = r.data?.id;
  check("resident lists own tickets", await call(R, "GET", "/api/maintenance/my"));
  check("admin reads ticket stats", await call(A, "GET", "/api/maintenance/stats"));
  check("admin lists estate tickets", await call(A, "GET", "/api/maintenance/estate"));
  check("admin filters by status", await call(A, "GET", "/api/maintenance/estate?status=open"));
  if (ticketId) {
    check("admin opens ticket", await call(A, "GET", `/api/maintenance/${ticketId}`));
    check("admin advances status", await call(A, "PATCH", `/api/maintenance/${ticketId}`, { status: "in_progress" }));
    check("admin comments", await call(A, "POST", `/api/maintenance/${ticketId}/comments`, {
      body: "Plumber scheduled for tomorrow at 10am.",
    }));
  }

  // ── Visitors ─────────────────────────────────────────────────────────────
  r = check("resident pre-registers visitor", await call(R, "POST", "/api/visitors", {
    name: "John Mwangi",
    phone: "0722123456",
    purpose: "Family visit",
    expectedAt: hours(2),
  }));
  const visitorId = r.data?.id;
  check("resident lists own visitors", await call(R, "GET", "/api/visitors/my"));
  check("security looks up by phone", await call(S, "GET", "/api/visitors/lookup?phone=0722123456"));
  check("security reads estate visitors", await call(S, "GET", "/api/visitors/estate"));
  if (visitorId) {
    check("security checks visitor in", await call(S, "POST", `/api/visitors/${visitorId}/check-in`));
    check("security checks visitor out", await call(S, "POST", `/api/visitors/${visitorId}/check-out`));
  }
  check("security reads gate log", await call(S, "GET", "/api/visitors/gate-log"));
  check("admin exports visitors CSV", await call(A, "GET", "/api/visitors/export/csv"));

  // ── Payments (M-PESA dev stub) ───────────────────────────────────────────
  check("resident triggers STK push", await call(R, "POST", "/api/payments/stk-push", {
    amount: 100,
    type: "levy",
    description: "Monthly levy",
  }));
  r = check("resident reads payment history", await call(R, "GET", "/api/payments/my"));
  const paymentId = r.data?.[0]?.id;
  if (paymentId) check("resident opens receipt", await call(R, "GET", `/api/payments/${paymentId}/receipt`));
  check("admin reads estate payments", await call(A, "GET", "/api/payments/estate"));
  check("admin reads levy arrears", await call(A, "GET", "/api/payments/levy-arrears"));

  // ── Governance ───────────────────────────────────────────────────────────
  r = check("admin creates poll", await call(A, "POST", "/api/polls", {
    title: "Approve the new gate barrier?",
    options: ["Yes", "No"],
    anonymous: false,
    closesAt: hours(24 * 7),
  }));
  const poll = r.data;
  const optionId = poll?.options?.[0]?.id ?? poll?.options?.[0];
  if (poll?.id && optionId) {
    check("resident votes", await call(R, "POST", `/api/polls/${poll.id}/vote`, { optionId: String(optionId) }));
    check("duplicate vote rejected", await call(R, "POST", `/api/polls/${poll.id}/vote`, { optionId: String(optionId) }), [400, 409]);
  }
  check("resident lists polls", await call(R, "GET", "/api/polls"));

  // ── Events ───────────────────────────────────────────────────────────────
  r = check("admin creates event", await call(A, "POST", "/api/events", {
    title: "Estate clean-up",
    description: "Community clean-up day",
    location: "Clubhouse",
    eventType: "cleanup",
    startTime: hours(48),
    endTime: hours(51),
  }));
  const eventId = r.data?.id;
  if (eventId) check("resident RSVPs", await call(R, "POST", `/api/events/${eventId}/rsvp`, { attending: true }));
  check("resident lists events", await call(R, "GET", "/api/events"));

  // ── Harambee ─────────────────────────────────────────────────────────────
  r = check("admin opens harambee", await call(A, "POST", "/api/harambee", {
    title: "Borehole fund",
    description: "Drill a borehole for the estate",
    goalAmount: 500000,
    deadline: hours(24 * 30),
  }));
  const harambeeId = r.data?.id;
  if (harambeeId) {
    check("resident donates", await call(R, "POST", `/api/harambee/${harambeeId}/donate`, { amount: 500, anonymous: false }));
    check("admin lists donations", await call(A, "GET", `/api/harambee/${harambeeId}/donations`));
  }

  // ── Facilities & bookings ────────────────────────────────────────────────
  r = check("admin adds facility", await call(A, "POST", "/api/facilities", {
    name: `Clubhouse ${Date.now()}`,
    description: "Main hall",
    requiresApproval: false,
    maxBookingHours: 4,
  }));
  const facilityId = r.data?.id;
  if (facilityId) {
    const slot = { facilityId, startTime: hours(72), endTime: hours(74) };
    check("resident books facility", await call(R, "POST", "/api/facilities/bookings", { ...slot, purpose: "Birthday" }));
    check("double-booking rejected", await call(R, "POST", "/api/facilities/bookings", { ...slot, purpose: "Clash" }), [400, 409]);
    check("resident lists bookings", await call(R, "GET", "/api/facilities/bookings"));
  }

  // ── Marketplace ──────────────────────────────────────────────────────────
  r = check("vendor creates listing", await call(V, "POST", "/api/services", {
    name: "Grace Wanjiku Electricals",
    category: "electrical",
    phone: ACCOUNTS.vendor,
    description: "Wiring, repairs, installations",
    availability: "everyday",
  }));
  const serviceId = r.data?.id;
  check("resident browses marketplace", await call(R, "GET", "/api/services"));
  if (serviceId) {
    check("resident reviews provider", await call(R, "POST", `/api/services/${serviceId}/reviews`, {
      rating: 5,
      comment: "Fast and tidy work.",
    }));
    check("resident requests quote", await call(R, "POST", `/api/services/${serviceId}/quote`, {
      description: "Need three sockets replaced in the kitchen.",
      timing: "weekdays",
    }));
  }
  check("vendor reads quote inbox", await call(V, "GET", "/api/services/quotes/mine"));

  // ── Emergency ────────────────────────────────────────────────────────────
  r = check("resident raises SOS", await call(R, "POST", "/api/emergency", {
    type: "security",
    description: "Suspicious person at gate B",
    locationLat: -1.45,
    locationLng: 37.01,
  }));
  const alertId = r.data?.id;
  check("security sees alerts", await call(S, "GET", "/api/emergency"));
  if (alertId) check("security responds", await call(S, "PATCH", `/api/emergency/${alertId}`, { status: "responding" }));

  // ── Parcels, classifieds, carpool, chama ─────────────────────────────────
  r = check("resident registers parcel", await call(R, "POST", "/api/parcels", {
    description: "Small box from Jumia",
    trackingRef: "JX998",
    sender: "Jumia",
  }));
  const parcelId = r.data?.id;
  if (parcelId) {
    check("security marks received", await call(S, "PATCH", `/api/parcels/${parcelId}/received`));
    check("security marks collected", await call(S, "PATCH", `/api/parcels/${parcelId}/collected`));
  }
  check("security lists estate parcels", await call(S, "GET", "/api/parcels/estate"));

  check("resident posts classified", await call(R, "POST", "/api/classifieds", {
    title: "Sofa for sale",
    description: "3-seater sofa, good condition, pickup only.",
    category: "sell",
    price: 15000,
    condition: "used",
  }));
  check("resident lists classifieds", await call(R, "GET", "/api/classifieds"));

  check("resident offers a ride", await call(R, "POST", "/api/carpool", {
    origin: "Athi River",
    destination: "Nairobi CBD",
    departureTime: hours(24),
    seatsTotal: 3,
    fare: 200,
  }));
  check("resident lists rides", await call(R, "GET", "/api/carpool"));

  r = check("resident starts chama", await call(R, "POST", "/api/chama", {
    name: `Block A Chama ${Date.now()}`,
    description: "Monthly savings group",
    contributionAmount: 2000,
    frequency: "monthly",
  }));
  const chamaId = r.data?.id;
  if (chamaId) {
    check("resident contributes", await call(R, "POST", `/api/chama/${chamaId}/contribute`, {
      amount: 2000,
      periodLabel: "2026-08",
    }));
    check("resident lists members", await call(R, "GET", `/api/chama/${chamaId}/members`));
  }

  // ── Admin read surfaces ──────────────────────────────────────────────────
  for (const path of [
    "/api/analytics",
    "/api/analytics/export/levy",
    "/api/analytics/export/residents",
    "/api/analytics/reconciliation-status",
    "/api/users",
    "/api/billing",
    "/api/documents",
    "/api/leads",
    "/api/notifications",
    "/api/auth/estate",
    "/api/users/me/sms-quota",
    "/api/users/me/data",
    "/api/push/vapid-public-key",
  ]) {
    check(`admin GET ${path}`, await call(A, "GET", path));
  }

  // ── Authorization boundaries ─────────────────────────────────────────────
  // Every one of these must be refused. A regression here is a data leak
  // between estates or roles, so they are asserted explicitly rather than
  // inferred from the happy paths above.
  const denied = [
    [R, "POST", "/api/announcements", { title: "Nope", body: "Should not be allowed." }, "resident cannot broadcast"],
    [R, "GET", "/api/users", null, "resident cannot list estate users"],
    [R, "GET", "/api/analytics", null, "resident cannot read analytics"],
    [R, "GET", "/api/payments/estate", null, "resident cannot read estate payments"],
    [R, "GET", "/api/maintenance/estate", null, "resident cannot read estate tickets"],
    [R, "GET", "/api/visitors/gate-log", null, "resident cannot read the gate log"],
    [R, "GET", "/api/visitors/export/csv", null, "resident cannot export visitors"],
    [R, "POST", "/api/facilities", { name: "Gym" }, "resident cannot add a facility"],
    [V, "POST", "/api/polls", { title: "Nope", options: ["a", "b"] }, "vendor cannot create a poll"],
    [V, "GET", "/api/system/error-logs", null, "vendor cannot read error logs"],
    [S, "POST", "/api/events", { title: "Nope", startTime: hours(1) }, "security cannot create an event"],
  ];
  for (const [cookie, method, path, body, name] of denied) {
    check(name, await call(cookie, method, path, body), [401, 403]);
  }
  check("unauthenticated request refused", await call("", "GET", "/api/users"), [401, 403]);

  // ── Report ───────────────────────────────────────────────────────────────
  const failed = results.filter((x) => !x.ok);
  for (const x of results) {
    console.log(`${x.ok ? "PASS" : "FAIL"}  ${String(x.status).padEnd(4)} ${x.name}${x.detail ? "  " + x.detail : ""}`);
  }
  console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
  if (failed.length) {
    console.error(`\n${failed.length} FAILED:\n` + failed.map((f) => `  - ${f.name} (${f.status})`).join("\n"));
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(2);
});
