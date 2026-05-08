import { Router } from "express";
import { eq, desc, and, inArray, sql } from "drizzle-orm";
import { db, dbTx } from "../db.js";
import {
  polls,
  pollOptions,
  votes,
  voteEligibility,
} from "@shared/schema.js";
import {
  createPollSchema,
  castVoteSchema,
} from "@shared/validators.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { requireRole } from "../middleware/requireRole.js";
import { newId } from "../lib/ids.js";
import { writeAudit } from "../lib/audit.js";

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

  // For non-anonymous polls, look up which option I voted for. For
  // anonymous polls, votes.userId is NULL so this lookup yields nothing —
  // which is the correct behaviour (we can confirm I'm eligible via
  // vote_eligibility, but cannot reveal which option I chose).
  const myVotes = await db.select().from(votes)
    .where(and(inArray(votes.pollId, pollIds), eq(votes.userId, user.id)));

  const myVoteMap = new Map(myVotes.map((v) => [v.pollId, v.optionId]));

  // Eligibility: which polls I have already voted on (including anonymous).
  const myEligibility = await db.select().from(voteEligibility)
    .where(and(
      inArray(voteEligibility.pollId, pollIds),
      eq(voteEligibility.userId, user.id),
    ));
  const votedOn = new Set(myEligibility.map((e) => e.pollId));

  const enriched = pollRows.map((p) => ({
    ...p,
    options: optionRows.filter((o) => o.pollId === p.id),
    myVoteOptionId: myVoteMap.get(p.id) ?? null,
    iHaveVoted: votedOn.has(p.id),
    totalVotes: optionRows
      .filter((o) => o.pollId === p.id)
      .reduce((sum, o) => sum + o.voteCount, 0),
  }));

  res.json({ data: enriched });
});

// Admin: create poll with options
pollsRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user!;
  const parsed = createPollSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { title, description, options, closesAt, anonymous } = parsed.data;

  const pollId = newId();
  const [poll] = await db.insert(polls).values({
    id: pollId,
    estateId: user.estateId!,
    createdById: user.id,
    title,
    description: description ?? null,
    anonymous,
    closesAt: closesAt ? new Date(closesAt) : null,
  }).returning();

  const optionInserts = options.map((label: string) => ({
    id: newId(),
    pollId,
    label,
    voteCount: 0,
  }));
  const insertedOptions = await db.insert(pollOptions).values(optionInserts).returning();

  void writeAudit(req, {
    action: "poll.created",
    targetType: "poll",
    targetId: poll!.id,
    metadata: { title, anonymous, optionCount: options.length },
  });

  res.status(201).json({ data: { ...poll, options: insertedOptions } });
});

// Resident: cast vote (one per poll). For anonymous polls, votes.userId
// is NULL — only vote_eligibility records that THIS user voted, never
// WHAT they voted for. The whole insertion path runs in a transaction
// so the eligibility row, vote row, and option counter all move together.
pollsRouter.post("/:id/vote", async (req, res) => {
  const user = res.locals.user!;
  const parsed = castVoteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { optionId } = parsed.data;

  const [poll] = await db.select().from(polls)
    .where(and(eq(polls.id, req.params['id']!), eq(polls.estateId, user.estateId!))).limit(1);
  if (!poll) { res.status(404).json({ error: "Poll not found" }); return; }

  if (poll.closesAt && new Date(poll.closesAt) < new Date()) {
    res.status(409).json({ error: "Poll is closed" });
    return;
  }

  const [eligible] = await db.select().from(voteEligibility)
    .where(and(eq(voteEligibility.pollId, poll.id), eq(voteEligibility.userId, user.id))).limit(1);
  if (eligible) { res.status(409).json({ error: "Already voted" }); return; }

  const [option] = await db.select().from(pollOptions)
    .where(and(eq(pollOptions.id, optionId), eq(pollOptions.pollId, poll.id))).limit(1);
  if (!option) { res.status(404).json({ error: "Option not found" }); return; }

  try {
    await dbTx.transaction(async (tx) => {
      await tx.insert(voteEligibility).values({
        id: newId(),
        pollId: poll.id,
        userId: user.id,
      });

      await tx.insert(votes).values({
        id: newId(),
        pollId: poll.id,
        optionId,
        // Anonymous polls intentionally store NULL — that's the whole
        // point of the fix.
        userId: poll.anonymous ? null : user.id,
      });

      await tx.update(pollOptions)
        .set({ voteCount: sql`${pollOptions.voteCount} + 1` })
        .where(eq(pollOptions.id, optionId));
    });
  } catch (err) {
    // Unique violation means concurrent double-vote — return the same 409
    // a user-facing error would.
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("vote_eligibility_poll_user_uq")) {
      res.status(409).json({ error: "Already voted" });
      return;
    }
    throw err;
  }

  void writeAudit(req, {
    action: "poll.voted",
    targetType: "poll",
    targetId: poll.id,
    // Never store optionId for anonymous polls — preserves anonymity.
    metadata: poll.anonymous ? {} : { optionId },
  });

  res.status(201).json({ data: { success: true } });
});
