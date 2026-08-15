#!/usr/bin/env node
// Browser sweep across all four roles at mobile, tablet and desktop widths.
//
// Catches the class of regression that unit tests and typecheck cannot see:
// a page that renders blank, a runtime error that only fires with real data,
// a role redirected to the wrong dashboard, or a layout that overflows the
// viewport horizontally (the whole page scrolls sideways — cheap to introduce
// with one un-truncated string, and very visible on a phone).
//
// Requires a running client + API and a seeded database — see
// scripts/verify/README.md. Not part of `npm test`: CI has neither a database
// nor a browser.
//
//   npm run verify:ui
//
// Playwright is intentionally NOT a dependency of this project — it would add
// a large install to every `npm ci`, including the Netlify build. Resolve it
// from wherever it exists, and say so clearly if it doesn't.

const CLIENT = process.env.VERIFY_CLIENT_URL ?? "http://localhost:3000";
const PW = process.env.DEMO_PASSWORD ?? "JiraniDemo2026!";
const BROWSER_PATH = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

const ROLES = [
  { role: "admin", phone: "0700000001", staff: true,
    routes: ["/maintenance", "/governance", "/payments", "/marketplace", "/admin/users", "/admin/report"] },
  { role: "resident", phone: "0700000002", staff: false,
    routes: ["/payments", "/visitors", "/events", "/bookings", "/classifieds", "/emergency"] },
  { role: "security", phone: "0700000003", staff: true,
    routes: ["/visitors", "/emergency", "/parcels", "/announcements"] },
  { role: "vendor", phone: "0700000004", staff: true,
    routes: ["/marketplace"] },
];

const VIEWPORTS = [
  { width: 390, height: 844, name: "mobile" },
  { width: 768, height: 1024, name: "tablet" },
  { width: 1440, height: 900, name: "desktop" },
];

// Local dev has no weather/traffic API keys and no SMS provider, so those
// widgets 503 by design and hide themselves. Don't fail the run on them.
const EXPECTED_NOISE = /weather|traffic|favicon|503/i;

async function loadPlaywright() {
  for (const spec of [
    "playwright",
    "/opt/node22/lib/node_modules/playwright/index.mjs",
  ]) {
    try {
      return await import(spec);
    } catch {
      /* try the next location */
    }
  }
  console.error(
    "Playwright not found. Install it (`npm i -D playwright && npx playwright install chromium`)\n" +
      "or set PLAYWRIGHT_CHROMIUM_PATH if a browser is already present.",
  );
  process.exit(2);
}

const failures = [];
function fail(msg) {
  failures.push(msg);
  console.log(`  FAIL  ${msg}`);
}

async function main() {
  const health = await fetch(`${CLIENT}`).catch(() => null);
  if (!health?.ok) {
    console.error(`Cannot reach the client at ${CLIENT}. See scripts/verify/README.md.`);
    process.exit(2);
  }

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({ executablePath: BROWSER_PATH });

  for (const { role, phone, staff, routes } of ROLES) {
    const context = await browser.newContext({ viewport: VIEWPORTS[2] });
    const page = await context.newPage();

    // Collection starts only once login succeeds. The login page itself
    // probes /api/auth/me while signed out, and that 401 is correct
    // behaviour — but a 401 *after* signing in is a real bug (it used to
    // bounce users back to /login mid-session), so this stays sensitive to
    // them rather than filtering 401s out wholesale.
    const errors = [];
    let collecting = false;
    page.on("pageerror", (e) => {
      if (collecting) errors.push(`uncaught: ${e.message.slice(0, 160)}`);
    });
    page.on("console", (m) => {
      if (collecting && m.type() === "error" && !EXPECTED_NOISE.test(m.text())) {
        errors.push(`console: ${m.text().slice(0, 160)}`);
      }
    });

    // Staff accounts sit behind an audience toggle on the login screen;
    // residents log in directly.
    await page.goto(`${CLIENT}/login`, { waitUntil: "networkidle" });
    if (staff) {
      await page.getByText("ESTATE STAFF").first().click();
      await page.waitForTimeout(300);
    }
    await page.fill('input[type="tel"]', phone);
    await page.fill('input[type="password"]', PW);
    await page.click('button[type="submit"]');
    try {
      await page.waitForURL(`**/dashboard/${role}`, { timeout: 20000 });
    } catch {
      // Distinguish "the app is broken" from "you ran this too often" —
      // login allows 10 attempts per 15 min per IP and each run uses four.
      const rateLimited = await page
        .getByText(/too many login attempts/i)
        .count()
        .catch(() => 0);
      fail(
        rateLimited
          ? `${role}: login rate-limited (429). Wait for the 15-minute window ` +
            `to clear, or restart the API to reset the counter.`
          : `${role}: login did not land on /dashboard/${role} (got ${page.url()})`,
      );
      await context.close();
      continue;
    }
    collecting = true;
    console.log(`${role}: signed in`);

    // Dashboard at every width — the layout-sensitive page.
    for (const vp of VIEWPORTS) {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.reload({ waitUntil: "networkidle" });
      await page.waitForTimeout(600);
      const m = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        height: document.body.scrollHeight,
        text: document.body.innerText.trim().length,
      }));
      if (m.overflow) fail(`${role} dashboard @${vp.name}: page scrolls horizontally`);
      if (m.text < 50) fail(`${role} dashboard @${vp.name}: rendered almost no text (blank page?)`);
      console.log(`  ${vp.name.padEnd(8)} height=${m.height}px  overflow=${m.overflow}`);
    }

    // Module pages at desktop — checking they render and route correctly.
    await page.setViewportSize(VIEWPORTS[2]);
    for (const route of routes) {
      await page.goto(CLIENT + route, { waitUntil: "networkidle", timeout: 25000 });
      await page.waitForTimeout(400);
      const m = await page.evaluate(() => ({
        path: location.pathname,
        text: document.body.innerText.trim().length,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      }));
      if (m.path !== route) fail(`${role}: ${route} redirected to ${m.path}`);
      else if (m.text < 50) fail(`${role}: ${route} rendered almost no text`);
      else if (m.overflow) fail(`${role}: ${route} scrolls horizontally`);
    }
    console.log(`  ${routes.length} module pages checked`);

    for (const e of [...new Set(errors)]) fail(`${role}: ${e}`);
    await context.close();
  }

  await browser.close();

  if (failures.length) {
    console.error(`\n${failures.length} FAILED:\n` + failures.map((f) => `  - ${f}`).join("\n"));
    process.exit(1);
  }
  console.log("\nAll roles clean — no blank pages, bad redirects, horizontal overflow or page errors.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(2);
});
