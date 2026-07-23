// WhatsApp channel via Africa's Talking Chat API — groundwork, OFF by
// default. Flips on with WHATSAPP_ENABLED=true once two external steps
// complete (both owner actions, both pending as of 2026-07):
//   1. Meta Business verification for the JiraniOne WhatsApp Business
//      account, done through Africa's Talking's onboarding.
//   2. The approved WhatsApp sender number set as WHATSAPP_SENDER_NUMBER.
//
// Integration point: sendThrottledSms (sms.ts) tries WhatsApp first when
// enabled and silently falls back to SMS on any failure, so no caller
// changes when the flag flips — and quota accounting stays identical
// (a WhatsApp delivery still consumes the same per-user/global budget
// slots; it's a per-message cost either way, just ~10x cheaper).
//
// NOTE (WhatsApp platform rule): business-initiated messages outside a
// 24-hour customer-service window must use pre-approved templates. Until
// templates are registered, free-form sends only reliably reach users who
// messaged the number within 24h — another reason the SMS fallback stays.

export function isWhatsAppEnabled(): boolean {
  return (
    process.env.WHATSAPP_ENABLED === "true" &&
    !!process.env.SMS_API_KEY &&
    !!process.env.SMS_USERNAME &&
    !!process.env.WHATSAPP_SENDER_NUMBER
  );
}

/**
 * Best-effort WhatsApp send. Returns false on ANY failure (disabled,
 * HTTP error, network) — callers treat false as "use SMS instead".
 */
export async function sendWhatsApp({ to, message }: { to: string; message: string }): Promise<boolean> {
  if (!isWhatsAppEnabled()) return false;

  try {
    const res = await fetch("https://chat.africastalking.com/whatsapp/message/send", {
      method: "POST",
      headers: {
        apiKey: process.env.SMS_API_KEY!,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username: process.env.SMS_USERNAME,
        waNumber: process.env.WHATSAPP_SENDER_NUMBER,
        phoneNumber: to,
        body: { message },
      }),
    });
    if (!res.ok) {
      console.warn(JSON.stringify({ event: "whatsapp_send_failed", status: res.status, to }));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      JSON.stringify({
        event: "whatsapp_send_failed",
        error: err instanceof Error ? err.message : String(err),
        to,
      }),
    );
    return false;
  }
}
