import { schedule } from "@netlify/functions";
import { generateSubscriptionInvoices } from "../../server/src/lib/billing.js";

// Daily at 02:30 UTC (05:30 EAT). Idempotent — the (estateId, period)
// unique index means only the first run of a month actually invoices;
// later runs just pick up estates whose trial lapsed mid-month and send
// one-time overdue nags.
export const handler = schedule("30 2 * * *", async () => {
  await generateSubscriptionInvoices();
  return { statusCode: 200 };
});
