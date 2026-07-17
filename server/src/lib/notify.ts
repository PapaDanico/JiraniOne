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

// Same in-app notification fanned out to many users in one INSERT, for
// estate-wide broadcasts (announcements) instead of one round-trip per
// recipient.
export async function createNotifications(opts: {
  userIds: string[];
  title: string;
  body: string;
  type: string;
  linkTo?: string;
}) {
  if (opts.userIds.length === 0) return;
  await db.insert(notifications).values(
    opts.userIds.map((userId) => ({
      id: newId(),
      userId,
      title: opts.title,
      body: opts.body,
      type: opts.type,
      linkTo: opts.linkTo ?? null,
    })),
  );
}
