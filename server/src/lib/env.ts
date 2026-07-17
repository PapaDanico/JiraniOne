// Netlify does not allow NODE_ENV to be set as a regular environment
// variable for Functions — it's a reserved key. Setting it via the
// dashboard/env-var API silently no-ops (confirmed directly: an "upserted"
// NODE_ENV never actually appeared in the site's stored env vars, and the
// live function kept reporting NODE_ENV as unset). Netlify DOES
// automatically provide CONTEXT ("production" | "deploy-preview" |
// "branch-deploy" | "dev") to every function invocation with zero
// configuration, so prefer it. NODE_ENV remains the primary signal for
// non-Netlify environments (local dev, npm test, a traditional Node host),
// where CONTEXT is never set.
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production" || process.env.CONTEXT === "production";
}
