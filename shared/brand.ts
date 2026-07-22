// ─── Brand constants — single source of truth ────────────────────────────────
// Every user-visible brand string in the app (client UI, SMS copy, HTML
// meta, PWA manifest, CORS/CSP origins) derives from this file, so a
// rebrand is a one-file change plus regenerated image assets in
// client/public/brand + client/public/icons.
//
// Deliberately NOT wired to this file (each would break something if
// renamed casually):
// - client/src/lib/offlineDb.ts DB_NAME — renaming the IndexedDB database
//   orphans residents' saved offline drafts.
// - client/src/hooks/useInstallPrompt.ts DISMISS_KEY — localStorage key;
//   renaming re-prompts every user who already dismissed the banner.
// - The Africa's Talking SMS sender ID is carrier-registered; changing
//   SMS_SENDER_ID here changes what the app *requests*, but the new name
//   must also be registered with the SMS provider before it takes effect.
// - Netlify site name, GitHub repo name, and DNS are infrastructure, not
//   code.

export const BRAND_NAME = "JiraniOne";
export const BRAND_TAGLINE = "Smart Estate Management for Kenyan Communities";
export const BRAND_TAGLINE_SHORT = "Smart estate management · Kenya";

// Registered company name as it appears in legal copy (Terms/Privacy).
export const COMPANY_NAME = `${BRAND_NAME} Ltd.`;

// Emails and URLs below deliberately stay on jiranihub.* infrastructure —
// the JiraniOne domains/mailboxes don't exist yet. Once jiranione.co.ke
// (or equivalent) is registered, DNS is live, and mail is set up, update
// these and append the new origins to PRODUCTION_ORIGINS (keeping the old
// ones until the redirect is permanent).
export const SUPPORT_EMAIL = "support@jiranihub.co.ke";
export const PRIVACY_EMAIL = "privacy@jiranihub.co.ke";
export const LEGAL_EMAIL = "legal@jiranihub.co.ke";

// Primary public URL — used for OG tags, invite links, and anywhere a
// single canonical address is needed.
export const PRIMARY_URL = "https://jiranihub.org";

// Every origin the production app may be served from. Feeds the CORS
// allowlist and CSP connect-src in server/src/createApp.ts. During a
// domain migration, keep BOTH old and new domains here until the old one
// stops redirecting — a missing entry here 500s every login (see the
// 2026-07-20 outage note in createApp.ts).
export const PRODUCTION_ORIGINS = [
  "https://jiranihub.org",
  "https://www.jiranihub.org",
  "https://www.jiranihub.co.ke",
  "https://jiranihub.co.ke",
  "https://jiranihub.netlify.app",
] as const;

// Brand prefix used inside SMS message bodies — safe to rebrand freely,
// it's just text.
export const SMS_SENDER_ID = "JiraniOne";

// The alphanumeric sender ID passed to Africa's Talking's `from` field.
// This MUST stay the carrier-registered value: AT rejects unregistered
// sender IDs per-recipient while still returning HTTP 201, so sending
// with an unregistered name silently drops every SMS (OTPs, visitor
// passes, emergency alerts) with no error anywhere. Flip to "JiraniOne"
// ONLY after the new name is registered and approved in the Africa's
// Talking dashboard.
export const SMS_REGISTERED_SENDER = "JiraniHub";
