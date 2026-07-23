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

// Legal entity name as it appears in legal copy (Terms/Privacy) and the
// footer. The company is Jirani Sync Africa Ltd (BRS conversion from
// business name BN-RRS338M6 to private limited, filed 2025-07-01);
// "JiraniOne" is its product/trading name. Deliberately NOT derived from
// BRAND_NAME — a product rebrand must never silently rewrite who the
// contracting legal entity is.
export const COMPANY_NAME = "Jirani Sync Africa Ltd";

// Official company mailbox (confirmed by the owner 2026-07-23). One
// address for all three purposes for now; split into dedicated
// support@/privacy@/legal@ mailboxes later without touching call sites.
export const SUPPORT_EMAIL = "info@jiranisyncafrica.com";
export const PRIVACY_EMAIL = "info@jiranisyncafrica.com";
export const LEGAL_EMAIL = "info@jiranisyncafrica.com";

// Primary public URL — used for OG tags, invite links, and anywhere a
// single canonical address is needed. jiranisync.work (the Jirani Sync
// Africa Ltd corporate domain) is the Netlify primary domain as of
// 2026-07-23; jiranihub.org remains attached and redirecting.
export const PRIMARY_URL = "https://jiranisync.work";

// Every origin the production app may be served from. Feeds the CORS
// allowlist and CSP connect-src in server/src/createApp.ts. During a
// domain migration, keep BOTH old and new domains here until the old one
// stops redirecting — a missing entry here 500s every login (see the
// 2026-07-20 outage note in createApp.ts).
export const PRODUCTION_ORIGINS = [
  "https://jiranisync.work",
  "https://www.jiranisync.work",
  "https://jiranihub.org",
  "https://www.jiranihub.org",
  "https://www.jiranihub.co.ke",
  "https://jiranihub.co.ke",
  "https://jiranihub.netlify.app",
  "https://jiranione.netlify.app",
] as const;

// Brand prefix used inside SMS message bodies — safe to rebrand freely,
// it's just text.
export const SMS_SENDER_ID = "JiraniOne";

// The alphanumeric sender ID for Africa's Talking's `from` field is NOT a
// brand constant anymore — it's the SMS_REGISTERED_SENDER_ID env var
// (server/src/lib/sms.ts), unset by default. AT silently drops messages
// from sender IDs not approved on the sending account (HTTP 201 either
// way), so the safe default is omitting `from` entirely (AT's shared
// shortcode always delivers). Set the env var to "JiraniOne" only once
// the AT dashboard shows that sender ID approved.
