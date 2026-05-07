import { Router } from "express";
import { eq, desc, and, inArray } from "drizzle-orm";
import { db } from "../db.js";
import { polls, pollOptions, votes } from "@shared/schema.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";

export const pollsRouter = Router();
pollsRouter.use(requireAuth);

// List all estate polls with options + my vote
pollsRouter.get("/", async (_req, res) => {
  const user = res.locals.user!;
  if (!user.estateId) { res.json({ data: [] }); return; }

  const pollRows = await db.select().from(polls)
    .where(eq(polls.estateId, user.estateId))
    .orderBy(desc(polls.createdAt))
    .limit(50);

  const pollIds = pollRows.map((p) => p.id);
  if (pollIds.length === 0) { res.json({ data: [] }); return; }

  const optionRows = await db.select().from(pollOptions)
    .where(inArray(pollOptions.pollId, pollIds));

  const myVotes = await db.select().from(votes)
    .where(and(inArray(votes.pollId, pollIds), eq(votes.userId, user.id)));

  const myVoteMap = new Map(myVotes.map((v) => [v.pollId, v.optionId]));

  const enriched = pollRows.map((p) => ({
    ...p,
    options: optionRows.filter((o) => o.pollId === p.id),
    myVoteOptionId: myVoteMap.get(p.id) ?? null,
    totalVotes: optionRows
      .filter((o) => o.pollId === p.id)
      .reduce((sum, o) => sum + o.voteCount, 0),
  }));

  res.json({ data: enriched });
});

// Admin: create poll with options
pollsRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const { title, description, options, closesAt, anonymous } = req.body as {
    title: string;
    description?: string;
    options: string[];
    closesAt?: string;
    anonymous?: boolean;
  };

  if (!title || !options || options.length < 2) {
    res.status(400).json({ error: "title and at least 2 options required" });
    return;
  }

  const pollId = newId();
  const [poll] = await db.insert(polls).values({
    id: pollId,
    estateId: user.estateId!,
    createdById: user.id,
    title,
    description: description ?? null,
    anonymous: anonymous ?? false,
    closesAt: closesAt ? new Date(closesAt) : null,
  }).returning();

  const optionInserts = options.map((label: string) => ({
    id: newId(),
    pollId,
    label,
    voteCount: 0,
  }));
  const insertedOptions = await db.insert(pollOptions).values(optionInserts).returning();

  res.status(201).json({ data: { ...poll, options: insertedOptions } });
});

// Resident: cast vote (one per poll)
pollsRouter.post("/:id/vote", async (req, res) => {
  const user = res.locals.user!;
  const { optionId } = req.body as { optionId: string };

  if (!optionId) { res.status(400).json({ error: "optionId required" }); return; }

  const [poll] = await db.select().from(polls)
    .where(and(eq(polls.id, req.params['id']!), eq(polls.estateId, user.estateId!))).limit(1);
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  if (poll.closesAt && new Date(poll.closesAt) < new Date()) {
    res.status(409).json({ error: "Poll is closed" });
    return;
  }

  const [existing] = await db.select().from(votes)
    .where(and(eq(votes.pollId, req.params['id']!), eq(votes.userId, user.id))).limit(1);
  if (existing) { res.status(409).json({ error: "Already voted" }); return; }

  const [option] = await db.select().from(pollOptions)
    .where(and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, req.params['id']!))).limit(1);
  if (!option) { res.status(404).json({ error: "Option not found" }); return; }

  await db.insert(votes).values({
    id: newId(),
    pollId: req.params['id']!,
    optionId,
    userId: user.id,
  });

  await db.update(pollOptions)
    .set({ voteCount: option.voteCount + 1 })
    .where(eq(pollOptions.id, optionId));

  res.status(201).json({ data: { success: true } });
});
