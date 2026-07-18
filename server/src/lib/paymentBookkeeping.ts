import { eq } from "drizzle-orm";
import { db } from "../db.js";
import { payments } from "@shared/schema.js";

// After stkPush() succeeds, Safaricom has already accepted the push (and
// the resident may go on to be charged) — persisting its CheckoutRequestID
// is what lets the later M-PESA callback and the reconciliation cron find
// this payment again. If that write throws (a transient DB blip, not a
// payment failure), the caller must NOT treat it the same as stkPush()
// itself failing: the payment already has a live charge in flight upstream
// of us. Retries briefly before giving up, since the failure window here is
// a single fast DB write immediately after a successful async call.
export async function persistCheckoutRequestId(
  paymentId: string,
  checkoutRequestId: string,
  attempts = 3,
): Promise<boolean> {
  for (let i = 0; i < attempts; i++) {
    try {
      await db
        .update(payments)
        .set({ checkoutRequestId, updatedAt: new Date() })
        .where(eq(payments.id, paymentId));
      return true;
    } catch {
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 200 * (i + 1)));
    }
  }
  return false;
}
