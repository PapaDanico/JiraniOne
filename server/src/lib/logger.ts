// Structured logger backed by pino. Logs emit single-line JSON to stdout,
// which Render aggregates into the service log stream and which downstream
// log shippers (Logtail, Datadog, Better Stack) consume natively.
//
// Sentry integration: if SENTRY_DSN is set, @sentry/node is initialized
// and warn/error logs are mirrored to Sentry. With no DSN the SDK is a
// no-op — safe to ship without one set.
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
import * as Sentry from "@sentry/node";

const isProd = process.env.NODE_ENV === "production";

// Initialize Sentry only when a DSN is provided. Calling Sentry.init() with
// no DSN is documented as a no-op but we skip it to avoid noise in dev.
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    // Sample 10% of transactions in prod, 100% elsewhere — adjust upward
    // once we have prod traffic and SENTRY_TRACE_SAMPLE_RATE is set.
    tracesSampleRate: parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE ?? (isProd ? "0.1" : "1.0")),
    // Drop low-value events.
    ignoreErrors: ["ECONNRESET", "EPIPE"],
  });
}

export function captureException(err: unknown, context?: Record<string, unknown>) {
  if (!process.env.SENTRY_DSN) return;
  Sentry.captureException(err, { extra: context });
}

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
