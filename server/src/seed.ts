import "dotenv/config";
import bcrypt from "bcrypt";
import { db } from "./db.js";
import { estates, users } from "@shared/schema.js";
import { newId } from "./lib/ids.js";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding JiraniHub...");

  // Estate
  const estateId = newId();
  const [estate] = await db
    .insert(estates)
    .values({
      id: estateId,
      name: "NHC Stoni Athi View",
      location: "Athi River, Machakos County",
      subscriptionTier: "growth",
      totalUnits: 120,
    })
    .onConflictDoNothing()
    .returning();

  if (!estate) {
    const [existing] = await db
      .select()
      .from(estates)
      .where(eq(estates.name, "NHC Stoni Athi View"))
      .limit(1);
    if (!existing) throw new Error("Failed to seed estate");
    console.log("Estate already exists, skipping.");
  } else {
    console.log(`✅ Estate: ${estate.name} (${estate.id})`);
  }

  const finalEstateId = estate?.id ?? (
    await db.select().from(estates).where(eq(estates.name, "NHC Stoni Athi View")).limit(1)
  )[0]!.id;

  // Seed accounts
  const seedUsers = [
    {
      phone: "+254700000001",
      password: "admin123",
      name: "Wanjiku Maina",
      role: "admin" as const,
    },
    {
      phone: "+254700000002",
      password: "pass123",
      name: "Aisha Kamau",
      role: "resident" as const,
      unitNumber: "A4",
    },
    {
      phone: "+254700000003",
      password: "pass123",
      name: "James Otieno",
      role: "security" as const,
    },
    {
      phone: "+254700000004",
      password: "pass123",
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
      console.log(`✅ ${u.role}: ${u.phone} / ${u.password} — ${u.name}`);
    } else {
      console.log(`⏭  ${u.role} ${u.phone} already exists`);
    }
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
