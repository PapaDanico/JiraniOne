import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger.js";
import { getClientIp } from "../lib/httpUtils.js";

const log = logger.child({ component: "mpesa_ip_allowlist" });

// Safaricom Daraja egress IPs documented at:
// https://developer.safaricom.co.ke/docs#m-pesa-callback-urls
// Updated periodically — cross-check at deploy time. Override via
// MPESA_CALLBACK_ALLOWED_IPS (comma-separated) when Safaricom rotates.
const DEFAULT_ALLOWED_IPS = new Set<string>([
  "196.201.214.200",
  "196.201.214.206",
  "196.201.213.114",
  "196.201.214.207",
  "196.201.214.208",
  "196.201.213.44",
  "196.201.212.127",
  "196.201.212.138",
  "196.201.212.129",
  "196.201.212.136",
  "196.201.212.74",
  "196.201.212.69",
]);

function buildAllowlist(): Set<string> {
  const override = process.env.MPESA_CALLBACK_ALLOWED_IPS;
  if (!override) return DEFAULT_ALLOWED_IPS;
  return new Set(
    override.split(",").map((s) => s.trim()).filter(Boolean),
  );
}

const ALLOWLIST = buildAllowlist();

export function mpesaIpAllowlist(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // In dev/sandbox we don't enforce — Safaricom sandbox IPs vary.
  if (process.env.NODE_ENV !== "production") {
    next();
    return;
  }

  const ip = getClientIp(req);
  if (!ip || !ALLOWLIST.has(ip)) {
    // Always 200 to Safaricom (they retry on non-2xx) but DO NOT process.
    // Log so we can spot probes / IP rotations.
    log.warn(
      { event: "callback_ip_blocked", ip, ua: req.headers["user-agent"] },
      "rejected M-PESA callback from non-allowlisted IP",
    );
    res.json({ ResultCode: 0, ResultDesc: "Accepted" });
    return;
  }

  next();
}
