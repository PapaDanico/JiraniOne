import type { Request, Response, NextFunction } from "express";

// Layered defence on top of SameSite=lax. Rejects state-changing requests
// whose Origin header is not in the allowlist. The CORS middleware catches
// browser-driven cross-origin requests, but server-to-server callers can
// spoof Origin freely; this is a belt-and-braces guard against CSRF in
// case a future GET endpoint accidentally mutates state.

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Paths exempt from the Origin check. The M-PESA callback is unauthenticated
// and IP-allowlisted separately — Safaricom does not send an Origin header.
const EXEMPT_PATHS = new Set(["/api/payments/mpesa/callback"]);

export function originGuard(allowedOrigins: string[]) {
  const allowedSet = new Set(allowedOrigins);
  return (req: Request, res: Response, next: NextFunction) => {
    if (!MUTATING_METHODS.has(req.method)) return next();
    if (EXEMPT_PATHS.has(req.path)) return next();

    // Server-to-server callers without an Origin header (curl, mobile
    // native, Daraja) are allowed through. Browsers ALWAYS send Origin on
    // mutating XHR/fetch.
    const origin = req.headers.origin;
    if (!origin) return next();

    const isProd = process.env.NODE_ENV === "production";
    if (isProd && !allowedSet.has(origin)) {
      res.status(403).json({ error: "Origin not allowed" });
      return;
    }
    next();
  };
}
