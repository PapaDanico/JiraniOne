import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@shared/schema.js";

const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql, { schema });

export type DB = typeof db;
