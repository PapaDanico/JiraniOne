import type { Request, Response, NextFunction } from "express";

// Gates platform-level views (e.g. cross-estate server error logs) that no
// regular estate "admin" should see — that role is scoped to one estate,
// but errors and their stack traces aren't. There's no platform-superadmin
// role in the schema, so this checks phone against an env var instead of
// adding one just for a single-owner operation. Fails closed: an unset
// env var means nobody gets in, not everybody.
export function requirePlatformOwner(req: Request, res: Response, next: NextFunction) {
  if (!res.locals.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const ownerPhone = process.env.PLATFORM_OWNER_PHONE;
  if (!ownerPhone || res.locals.user.phone !== ownerPhone) {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }
  next();
}
