import { schedule } from "@netlify/functions";
import { runDailyCleanup } from "../../server/src/cron.js";

export const handler = schedule("0 3 * * *", async () => {
  await runDailyCleanup();
  return { statusCode: 200 };
});
