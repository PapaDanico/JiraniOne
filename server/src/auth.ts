import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";
import { db } from "./db.js";
import { sessions, users } from "@shared/schema.js";
import type { UserRole } from "@shared/types.js";

const adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);

export const lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  },
  getUserAttributes(attrs) {
    return {
      phone: attrs.phone,
      name: attrs.name,
      role: attrs.role,
      estateId: attrs.estateId,
      unitNumber: attrs.unitNumber,
      avatarUrl: attrs.avatarUrl,
    };
  },
});

declare module "lucia" {
  interface Register {
    Lucia: typeof lucia;
    DatabaseUserAttributes: {
      phone: string;
      name: string;
      role: UserRole;
      estateId: string | null;
      unitNumber: string | null;
      avatarUrl: string | null;
    };
  }
}
