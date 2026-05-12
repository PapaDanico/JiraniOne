// Extracted from ws.ts so it can be unit-tested without spinning up the
// Neon/Lucia stack (ws.ts → auth.ts → db.ts reads DATABASE_URL at import).

export function originAllowed(req: { headers: { origin?: string } }): boolean {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return true;
  const origin = req.headers.origin;
  if (!origin) return false; // Production browsers always send Origin on WS handshake.

  const allowed = [
    "https://www.jiranihub.co.ke",
    "https://jiranihub.co.ke",
    process.env.CLIENT_URL,
    process.env.RENDER_EXTERNAL_URL,
  ].filter(Boolean) as string[];
  return allowed.includes(origin);
}
