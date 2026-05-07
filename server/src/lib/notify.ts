import { db } from "../db.js";
import { notifications } from "@shared/schema.js";
import { newId } from "./ids.js";

export async function createNotification(opts: {
  userId: string;
  title: string;
  body: string;
  type: string;
  linkTo?: string;
}) {
  await db.insert(notifications).values({
    id: newId(),
    userId: opts.userId,
    title: opts.title,
    body: opts.body,
    type: opts.type,
    linkTo: opts.linkTo ?? null,
  });
}
