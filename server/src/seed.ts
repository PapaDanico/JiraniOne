import "dotenv/config";
import bcrypt from "bcrypt";
import { randomBytes } from "crypto";
import { db } from "./db.js";
import { estates, users } from "@shared/schema.js";
import { newId } from "./lib/ids.js";
import { eq } from "drizzle-orm";

async function seed() {
  // HARD GUARD against ever running this in production. The audit flagged
  // hardcoded admin credentials (+254700000001 / admin123) as a P2 — if
  // anyone ran `npm run db:seed` against the production Neon DB they would
  // create a known-credential admin account. Refuse loudly.
  if (process.env.NODE_ENV === "production" && !process.env.ALLOW_PROD_SEED) {
    console.error(
      "REFUSING to seed in production. Set ALLOW_PROD_SEED=1 if you really mean it.",
    );
    process.exit(1);
  }

  console.log("🌱 Seeding JiraniHub...");

  // Estate. `estates.name` has no unique constraint, so `onConflictDoNothing`
  // can never detect a collision here — look the row up by name first
  // instead, or every re-run of this script inserts a fresh duplicate estate.
  const [existingEstate] = await db
    .select()
    .from(estates)
    .where(eq(estates.name, "NHC Stoni Athi View"))
    .limit(1);

  let finalEstateId: string;
  if (existingEstate) {
    console.log("Estate already exists, skipping.");
    finalEstateId = existingEstate.id;
  } else {
    const [estate] = await db
      .insert(estates)
      .values({
        id: newId(),
        name: "NHC Stoni Athi View",
        location: "Athi River, Machakos County",
        subscriptionTier: "growth",
        totalUnits: 120,
      })
      .returning();
    if (!estate) throw new Error("Failed to seed estate");
    console.log(`✅ Estate: ${estate.name} (${estate.id})`);
    finalEstateId = estate.id;
  }

  // Seed accounts. When DEMO_PASSWORD is set, every seeded account uses
  // that single password — useful for "neighbours testing the app" runs
  // where the admin wants to share one credential out-of-band. Otherwise
  // each account gets a one-shot random password printed to stdout below.
  // NEVER hard-code a default password here.
  const sharedDemoPassword = process.env.DEMO_PASSWORD;
  if (sharedDemoPassword && sharedDemoPassword.length < 8) {
    console.error(
      "DEMO_PASSWORD must be at least 8 characters. Refusing to seed weak credentials.",
    );
    process.exit(1);
  }
  const passwordFor = () =>
    sharedDemoPassword ?? randomBytes(9).toString("base64url");

  const seedUsers = [
    {
      phone: "+254700000001",
      password: passwordFor(),
      name: "Daniel Ng'ong'a",
      role: "admin" as const,
    },
    {
      phone: "+254700000002",
      password: passwordFor(),
      name: "Aisha Kamau",
      role: "resident" as const,
      unitNumber: "A4",
    },
    {
      phone: "+254700000003",
      password: passwordFor(),
      name: "James Otieno",
      role: "security" as const,
    },
    {
      phone: "+254700000004",
      password: passwordFor(),
      name: "Grace Wanjiku Electricals",
      role: "vendor" as const,
    },
  ];

  for (const u of seedUsers) {
    const hash = await bcrypt.hash(u.password, 12);
    const inserted = await db
      .insert(users)
      .values({
        id: newId(),
        phone: u.phone,
        passwordHash: hash,
        name: u.name,
        role: u.role,
        estateId: finalEstateId,
        unitNumber: "unitNumber" in u ? u.unitNumber : null,
      })
      .onConflictDoNothing()
      .returning();

    if (inserted[0]) {
      const pwForLog = sharedDemoPassword ? "<DEMO_PASSWORD>" : u.password;
      console.log(`✅ ${u.role}: ${u.phone} / ${pwForLog} — ${u.name}`);
    } else {
      console.log(`⏭  ${u.role} ${u.phone} already exists`);
    }
  }

  if (sharedDemoPassword) {
    console.log(
      "\nℹ  All four seed accounts share the password from DEMO_PASSWORD. Share it with testers out-of-band.",
    );
  }

  // Set admin on estate
  const [admin] = await db
    .select()
    .from(users)
    .where(eq(users.phone, "+254700000001"))
    .limit(1);

  if (admin) {
    await db
      .update(estates)
      .set({ adminId: admin.id })
      .where(eq(estates.id, finalEstateId));
  }

  console.log("\n✅ Seed complete. Estate: NHC Stoni Athi View, Athi River");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
