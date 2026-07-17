import { schedule } from "@netlify/functions";
import { sendEventReminders } from "../../server/src/cron.js";

export const handler = schedule("*/15 * * * *", async () => {
  await sendEventReminders();
  return { statusCode: 200 };
});
