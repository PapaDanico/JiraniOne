import { schedule } from "@netlify/functions";
import { generateSubscriptionInvoices } from "../../server/src/lib/billing.js";
import { sendMonthlyReportNudge } from "../../server/src/lib/ownerDigest.js";

// Daily at 02:30 UTC (05:30 EAT). Idempotent — the (estateId, period)
// unique index means only the first run of a month actually invoices;
// later runs just pick up estates whose trial lapsed mid-month and send
// one-time overdue nags. Also fires the month-open report nudge, which
// self-gates to the 1st of the month.
export const handler = schedule("30 2 * * *", async () => {
  await generateSubscriptionInvoices();
  await sendMonthlyReportNudge();
  return { statusCode: 200 };
});
