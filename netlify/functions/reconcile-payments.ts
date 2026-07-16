import { schedule } from "@netlify/functions";
import { reconcilePendingPayments } from "../../server/src/cron.js";

export const handler = schedule("*/5 * * * *", async () => {
  await reconcilePendingPayments();
  return { statusCode: 200 };
});
