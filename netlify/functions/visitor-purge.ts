import { schedule } from "@netlify/functions";
import { anonymizeOldVisitors } from "../../server/src/cron.js";

export const handler = schedule("0 4 * * 0", async () => {
  await anonymizeOldVisitors();
  return { statusCode: 200 };
});
