import type { Request } from "express";

// Under serverless-http (Netlify Functions), there's no real TCP socket —
// Express's `trust proxy` + req.ip resolution depends on serverless-http
// correctly threading through however many X-Forwarded-For hops Netlify's
// edge→function path adds, which we can't rely on the way we could with
// Render's single documented LB hop. Netlify injects the real client IP in
// a dedicated header that isn't attacker-controllable, so prefer that when
// present and fall back to req.ip for local dev / non-Netlify hosting.
//
// Verify this header name against current Netlify docs after deploying —
// if it's wrong, the M-PESA IP allowlist fails closed (rejects legitimate
// callbacks, caught by the reconciliation job) rather than opening up, and
// rate limiting degrades to keying off req.ip, not a security hole.
const NETLIFY_CLIENT_IP_HEADER = "x-nf-client-connection-ip";

export function getClientIp(req: Request): string {
  const nfIp = req.headers[NETLIFY_CLIENT_IP_HEADER];
  if (typeof nfIp === "string" && nfIp.length > 0) {
    return nfIp.split(",")[0]!.trim();
  }
  return (req.ip ?? "").replace(/^::ffff:/, "");
}
