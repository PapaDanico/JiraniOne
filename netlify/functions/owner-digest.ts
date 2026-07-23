import { schedule } from "@netlify/functions";
import { sendOwnerWeeklyDigest } from "../../server/src/lib/ownerDigest.js";

// Mondays 05:00 UTC = 08:00 EAT — on the owner's phone with the first
// coffee of the work week.
export const handler = schedule("0 5 * * 1", async () => {
  await sendOwnerWeeklyDigest();
  return { statusCode: 200 };
});
