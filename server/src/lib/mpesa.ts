const BASE =
  process.env.NODE_ENV === "production"
    ? "https://api.safaricom.co.ke"
    : "https://sandbox.safaricom.co.ke";

let tokenCache: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const creds = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`,
  ).toString("base64");
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` },
  });
  if (!res.ok) throw new Error("M-PESA token request failed");
  const body = (await res.json()) as { access_token: string; expires_in: string };
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + (parseInt(body.expires_in, 10) - 60) * 1000,
  };
  return tokenCache.token;
}

export interface StkPushResult {
  CheckoutRequestID: string;
  ResponseCode: string;
  CustomerMessage: string;
}

export async function stkPush(params: {
  phone: string;       // +254XXXXXXXXX
  amount: number;
  accountRef: string;
  description: string;
}): Promise<StkPushResult> {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const ts = new Date().toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");

  const token = await getToken();
  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(params.amount),
    PartyA: params.phone.replace("+", ""),
    PartyB: shortcode,
    PhoneNumber: params.phone.replace("+", ""),
    CallBackURL: process.env.MPESA_CALLBACK_URL!,
    AccountReference: params.accountRef.slice(0, 12),
    TransactionDesc: params.description.slice(0, 13),
  };

  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("STK Push failed");
  return res.json() as Promise<StkPushResult>;
}

export function isMpesaConfigured(): boolean {
  return !!(
    process.env.MPESA_CONSUMER_KEY &&
    process.env.MPESA_CONSUMER_SECRET &&
    process.env.MPESA_SHORTCODE &&
    process.env.MPESA_PASSKEY &&
    process.env.MPESA_CALLBACK_URL
  );
}
