/**
 * Migration: Add carpool, chama tables + enums
 * Run once: node migrate-new-features.mjs
 */

import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL);

const statements = [
  // Enums
  `DO $$ BEGIN CREATE TYPE carpool_status AS ENUM ('active','full','cancelled','completed'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE carpool_booking_status AS ENUM ('pending','confirmed','cancelled'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE chama_status AS ENUM ('active','paused','dissolved'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,
  `DO $$ BEGIN CREATE TYPE chama_frequency AS ENUM ('weekly','monthly'); EXCEPTION WHEN duplicate_object THEN NULL; END $$`,

  // carpool_offers
  `CREATE TABLE IF NOT EXISTS carpool_offers (
    id              TEXT PRIMARY KEY,
    estate_id       TEXT NOT NULL REFERENCES estates(id),
    driver_id       TEXT NOT NULL REFERENCES users(id),
    origin          VARCHAR(200) NOT NULL,
    destination     VARCHAR(200) NOT NULL,
    departure_time  TIMESTAMP NOT NULL,
    seats_total     INTEGER NOT NULL DEFAULT 3,
    seats_available INTEGER NOT NULL DEFAULT 3,
    fare            DECIMAL(10,2),
    notes           TEXT,
    status          carpool_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS carpool_estate_id_idx ON carpool_offers(estate_id)`,
  `CREATE INDEX IF NOT EXISTS carpool_driver_id_idx ON carpool_offers(driver_id)`,
  `CREATE INDEX IF NOT EXISTS carpool_departure_idx  ON carpool_offers(departure_time)`,

  // carpool_bookings
  `CREATE TABLE IF NOT EXISTS carpool_bookings (
    id             TEXT PRIMARY KEY,
    offer_id       TEXT NOT NULL REFERENCES carpool_offers(id) ON DELETE CASCADE,
    passenger_id   TEXT NOT NULL REFERENCES users(id),
    booking_status carpool_booking_status NOT NULL DEFAULT 'confirmed',
    created_at     TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS carpool_bookings_offer_id_idx     ON carpool_bookings(offer_id)`,
  `CREATE INDEX IF NOT EXISTS carpool_bookings_passenger_id_idx ON carpool_bookings(passenger_id)`,

  // chamas
  `CREATE TABLE IF NOT EXISTS chamas (
    id                  TEXT PRIMARY KEY,
    estate_id           TEXT NOT NULL REFERENCES estates(id),
    admin_id            TEXT NOT NULL REFERENCES users(id),
    name                VARCHAR(150) NOT NULL,
    description         TEXT,
    contribution_amount DECIMAL(12,2) NOT NULL,
    frequency           chama_frequency NOT NULL DEFAULT 'monthly',
    status              chama_status NOT NULL DEFAULT 'active',
    created_at          TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS chamas_estate_id_idx ON chamas(estate_id)`,

  // chama_members
  `CREATE TABLE IF NOT EXISTS chama_members (
    id        TEXT PRIMARY KEY,
    chama_id  TEXT NOT NULL REFERENCES chamas(id) ON DELETE CASCADE,
    user_id   TEXT NOT NULL REFERENCES users(id),
    role      VARCHAR(20) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS chama_members_chama_id_idx ON chama_members(chama_id)`,
  `CREATE INDEX IF NOT EXISTS chama_members_user_id_idx  ON chama_members(user_id)`,

  // chama_contributions
  `CREATE TABLE IF NOT EXISTS chama_contributions (
    id           TEXT PRIMARY KEY,
    chama_id     TEXT NOT NULL REFERENCES chamas(id),
    user_id      TEXT NOT NULL REFERENCES users(id),
    amount       DECIMAL(12,2) NOT NULL,
    period_label VARCHAR(20) NOT NULL,
    mpesa_ref    VARCHAR(50),
    paid_at      TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at   TIMESTAMP NOT NULL DEFAULT NOW()
  )`,
  `CREATE INDEX IF NOT EXISTS chama_contributions_chama_id_idx ON chama_contributions(chama_id)`,
  `CREATE INDEX IF NOT EXISTS chama_contributions_user_id_idx  ON chama_contributions(user_id)`,
];

async function run() {
  console.log(`Running ${statements.length} migration statements…`);
  for (let i = 0; i < statements.length; i++) {
    try {
      await sql(statements[i]);
      console.log(`  ✅ [${i + 1}/${statements.length}] OK`);
    } catch (err) {
      console.error(`  ❌ [${i + 1}/${statements.length}] FAILED:`, err.message);
      process.exit(1);
    }
  }
  console.log("✅ Migration complete");
}

run();
