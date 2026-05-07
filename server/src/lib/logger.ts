// Structured logger backed by pino. Logs emit single-line JSON to stdout,
// which Render aggregates into the service log stream and which downstream
// log shippers (Logtail, Datadog, Better Stack) consume natively.
//
// Levels:
//   debug — verbose dev-time tracing, off by default in production
//   info  — normal operational events (server start, cron tick)
//   warn  — recoverable / suspicious conditions (rate limit hit, IP blocked)
//   error — caught exceptions, request handler failures
//
// Use logger.child({ component: '...' }) at call sites so logs are
// correlatable per subsystem.

import pino from "pino";

const isProd = process.env.NODE_ENV === "production";

export const logger = pino({
  level: process.env.LOG_LEVEL ?? (isProd ? "info" : "debug"),
  // Strip noisy fields from req objects when serialising, and drop the
  // password / cookie headers if they sneak in.
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      "*.password",
      "*.passwordHash",
      "*.password_hash",
      "*.otp",
      "*.otpHash",
    ],
    censor: "[redacted]",
  },
  // Keep a stable timestamp format. ISO 8601 is what most aggregators want.
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: "jiranihub",
    env: process.env.NODE_ENV ?? "development",
  },
});
