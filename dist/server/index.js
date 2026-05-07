var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/src/index.ts
import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path2 from "path";
import { fileURLToPath } from "url";

// server/src/auth.ts
import { Lucia } from "lucia";
import { DrizzlePostgreSQLAdapter } from "@lucia-auth/adapter-drizzle";

// server/src/db.ts
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  announcementPriorityEnum: () => announcementPriorityEnum,
  announcements: () => announcements,
  bookingStatusEnum: () => bookingStatusEnum,
  bookings: () => bookings,
  classifiedCategoryEnum: () => classifiedCategoryEnum,
  classifiedStatusEnum: () => classifiedStatusEnum,
  classifieds: () => classifieds,
  classifiedsRelations: () => classifiedsRelations,
  documents: () => documents,
  donations: () => donations,
  emergencyAlerts: () => emergencyAlerts,
  emergencyStatusEnum: () => emergencyStatusEnum,
  emergencyTypeEnum: () => emergencyTypeEnum,
  estates: () => estates,
  estatesRelations: () => estatesRelations,
  eventRsvps: () => eventRsvps,
  events: () => events,
  facilities: () => facilities,
  fundraisingCampaigns: () => fundraisingCampaigns,
  fundraisingStatusEnum: () => fundraisingStatusEnum,
  maintenanceTickets: () => maintenanceTickets,
  notifications: () => notifications,
  parcelStatusEnum: () => parcelStatusEnum,
  parcels: () => parcels,
  parcelsRelations: () => parcelsRelations,
  payments: () => payments,
  pollOptions: () => pollOptions,
  polls: () => polls,
  serviceProviders: () => serviceProviders,
  sessions: () => sessions,
  subscriptionTierEnum: () => subscriptionTierEnum,
  ticketCategoryEnum: () => ticketCategoryEnum,
  ticketComments: () => ticketComments,
  ticketCommentsRelations: () => ticketCommentsRelations,
  ticketPriorityEnum: () => ticketPriorityEnum,
  ticketStatusEnum: () => ticketStatusEnum,
  ticketsRelations: () => ticketsRelations,
  userRoleEnum: () => userRoleEnum,
  users: () => users,
  usersRelations: () => usersRelations,
  visitorStatusEnum: () => visitorStatusEnum,
  visitors: () => visitors,
  visitorsRelations: () => visitorsRelations,
  votes: () => votes
});
import {
  pgTable,
  pgEnum,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  decimal,
  jsonb,
  index
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
var userRoleEnum = pgEnum("user_role", [
  "resident",
  "admin",
  "security",
  "vendor"
]);
var visitorStatusEnum = pgEnum("visitor_status", [
  "pending",
  "checked_in",
  "checked_out",
  "expired",
  "cancelled"
]);
var ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed"
]);
var ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent"
]);
var ticketCategoryEnum = pgEnum("ticket_category", [
  "plumbing",
  "electrical",
  "roads",
  "landscaping",
  "security",
  "cleaning",
  "other"
]);
var announcementPriorityEnum = pgEnum("announcement_priority", [
  "info",
  "warning",
  "urgent"
]);
var emergencyTypeEnum = pgEnum("emergency_type", [
  "medical",
  "fire",
  "security",
  "accident",
  "other"
]);
var emergencyStatusEnum = pgEnum("emergency_status", [
  "active",
  "responding",
  "resolved"
]);
var bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "completed"
]);
var subscriptionTierEnum = pgEnum("subscription_tier", [
  "starter",
  "growth",
  "enterprise"
]);
var fundraisingStatusEnum = pgEnum("fundraising_status", [
  "active",
  "completed",
  "cancelled"
]);
var estates = pgTable(
  "estates",
  {
    id: text("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    location: varchar("location", { length: 200 }).notNull(),
    adminId: text("admin_id"),
    subscriptionTier: subscriptionTierEnum("subscription_tier").notNull().default("starter"),
    totalUnits: integer("total_units").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    adminIdIdx: index("estates_admin_id_idx").on(t.adminId)
  })
);
var users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    phone: varchar("phone", { length: 20 }).notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    role: userRoleEnum("role").notNull().default("resident"),
    estateId: text("estate_id").references(() => estates.id),
    unitNumber: varchar("unit_number", { length: 20 }),
    avatarUrl: text("avatar_url"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("users_estate_id_idx").on(t.estateId),
    roleIdx: index("users_role_idx").on(t.role)
  })
);
var sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date"
    }).notNull()
  },
  (t) => ({
    userIdIdx: index("sessions_user_id_idx").on(t.userId)
  })
);
var visitors = pgTable(
  "visitors",
  {
    id: text("id").primaryKey(),
    residentId: text("resident_id").notNull().references(() => users.id),
    estateId: text("estate_id").notNull().references(() => estates.id),
    name: varchar("name", { length: 100 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    purpose: varchar("purpose", { length: 200 }),
    qrCode: text("qr_code").notNull().unique(),
    status: visitorStatusEnum("status").notNull().default("pending"),
    expectedAt: timestamp("expected_at"),
    checkedInAt: timestamp("checked_in_at"),
    checkedOutAt: timestamp("checked_out_at"),
    checkedInById: text("checked_in_by_id").references(() => users.id),
    smsSent: boolean("sms_sent").notNull().default(false),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    residentIdIdx: index("visitors_resident_id_idx").on(t.residentId),
    estateIdIdx: index("visitors_estate_id_idx").on(t.estateId),
    statusIdx: index("visitors_status_idx").on(t.status),
    createdAtIdx: index("visitors_created_at_idx").on(t.createdAt)
  })
);
var maintenanceTickets = pgTable(
  "maintenance_tickets",
  {
    id: text("id").primaryKey(),
    residentId: text("resident_id").notNull().references(() => users.id),
    estateId: text("estate_id").notNull().references(() => estates.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    category: ticketCategoryEnum("category").notNull(),
    priority: ticketPriorityEnum("priority").notNull().default("medium"),
    status: ticketStatusEnum("status").notNull().default("open"),
    assignedToId: text("assigned_to_id").references(() => users.id),
    photoUrls: jsonb("photo_urls").$type().default([]),
    adminNotes: text("admin_notes"),
    resolvedAt: timestamp("resolved_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    residentIdIdx: index("tickets_resident_id_idx").on(t.residentId),
    estateIdIdx: index("tickets_estate_id_idx").on(t.estateId),
    statusIdx: index("tickets_status_idx").on(t.status),
    priorityIdx: index("tickets_priority_idx").on(t.priority),
    createdAtIdx: index("tickets_created_at_idx").on(t.createdAt)
  })
);
var ticketComments = pgTable(
  "ticket_comments",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id").notNull().references(() => maintenanceTickets.id, { onDelete: "cascade" }),
    authorId: text("author_id").notNull().references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => ({
    ticketIdIdx: index("ticket_comments_ticket_id_idx").on(t.ticketId)
  })
);
var fundraisingCampaigns = pgTable(
  "fundraising_campaigns",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id").notNull().references(() => estates.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    goalAmount: decimal("goal_amount", { precision: 12, scale: 2 }).notNull(),
    currentAmount: decimal("current_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    deadline: timestamp("deadline"),
    status: fundraisingStatusEnum("status").notNull().default("active"),
    createdById: text("created_by_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("campaigns_estate_id_idx").on(t.estateId)
  })
);
var donations = pgTable(
  "donations",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id").notNull().references(() => fundraisingCampaigns.id),
    donorId: text("donor_id").notNull().references(() => users.id),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    mpesaRef: varchar("mpesa_ref", { length: 50 }),
    anonymous: boolean("anonymous").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => ({
    campaignIdIdx: index("donations_campaign_id_idx").on(t.campaignId),
    donorIdIdx: index("donations_donor_id_idx").on(t.donorId)
  })
);
var payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    estateId: text("estate_id").notNull().references(() => estates.id),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    mpesaRef: varchar("mpesa_ref", { length: 50 }),
    phoneUsed: varchar("phone_used", { length: 20 }),
    type: varchar("type", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    checkoutRequestId: text("checkout_request_id"),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    userIdIdx: index("payments_user_id_idx").on(t.userId),
    estateIdIdx: index("payments_estate_id_idx").on(t.estateId)
  })
);
var announcements = pgTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id").notNull().references(() => estates.id),
    authorId: text("author_id").notNull().references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    priority: announcementPriorityEnum("priority").notNull().default("info"),
    smsSent: boolean("sms_sent").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("announcements_estate_id_idx").on(t.estateId),
    createdAtIdx: index("announcements_created_at_idx").on(t.createdAt)
  })
);
var documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id").notNull().references(() => estates.id),
    uploadedById: text("uploaded_by_id").notNull().references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: varchar("file_type", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("documents_estate_id_idx").on(t.estateId)
  })
);
var events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id").notNull().references(() => estates.id),
    createdById: text("created_by_id").notNull().references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    location: varchar("location", { length: 200 }),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    recurring: boolean("recurring").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("events_estate_id_idx").on(t.estateId),
    startTimeIdx: index("events_start_time_idx").on(t.startTime)
  })
);
var eventRsvps = pgTable(
  "event_rsvps",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull().references(() => users.id),
    attending: boolean("attending").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => ({
    eventIdIdx: index("event_rsvps_event_id_idx").on(t.eventId)
  })
);
var emergencyAlerts = pgTable(
  "emergency_alerts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id),
    estateId: text("estate_id").notNull().references(() => estates.id),
    type: emergencyTypeEnum("type").notNull(),
    description: text("description"),
    locationLat: decimal("location_lat", { precision: 10, scale: 7 }),
    locationLng: decimal("location_lng", { precision: 10, scale: 7 }),
    status: emergencyStatusEnum("status").notNull().default("active"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("emergency_estate_id_idx").on(t.estateId),
    statusIdx: index("emergency_status_idx").on(t.status),
    createdAtIdx: index("emergency_created_at_idx").on(t.createdAt)
  })
);
var notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    read: boolean("read").notNull().default(false),
    linkTo: text("link_to"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => ({
    userIdIdx: index("notifications_user_id_idx").on(t.userId),
    readIdx: index("notifications_read_idx").on(t.read),
    createdAtIdx: index("notifications_created_at_idx").on(t.createdAt)
  })
);
var serviceProviders = pgTable(
  "service_providers",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id").notNull().references(() => estates.id),
    userId: text("user_id").references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    description: text("description"),
    rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("providers_estate_id_idx").on(t.estateId),
    categoryIdx: index("providers_category_idx").on(t.category)
  })
);
var facilities = pgTable(
  "facilities",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id").notNull().references(() => estates.id),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    maxBookingHours: integer("max_booking_hours").notNull().default(4),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("facilities_estate_id_idx").on(t.estateId)
  })
);
var bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    facilityId: text("facility_id").notNull().references(() => facilities.id),
    userId: text("user_id").notNull().references(() => users.id),
    estateId: text("estate_id").notNull().references(() => estates.id),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    facilityIdIdx: index("bookings_facility_id_idx").on(t.facilityId),
    userIdIdx: index("bookings_user_id_idx").on(t.userId),
    startTimeIdx: index("bookings_start_time_idx").on(t.startTime)
  })
);
var polls = pgTable(
  "polls",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id").notNull().references(() => estates.id),
    createdById: text("created_by_id").notNull().references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    anonymous: boolean("anonymous").notNull().default(false),
    closesAt: timestamp("closes_at"),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("polls_estate_id_idx").on(t.estateId)
  })
);
var pollOptions = pgTable(
  "poll_options",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id").notNull().references(() => polls.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 200 }).notNull(),
    voteCount: integer("vote_count").notNull().default(0)
  },
  (t) => ({
    pollIdIdx: index("poll_options_poll_id_idx").on(t.pollId)
  })
);
var votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id").notNull().references(() => polls.id),
    optionId: text("option_id").notNull().references(() => pollOptions.id),
    userId: text("user_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow()
  },
  (t) => ({
    pollIdIdx: index("votes_poll_id_idx").on(t.pollId),
    userIdIdx: index("votes_user_id_idx").on(t.userId)
  })
);
var parcelStatusEnum = pgEnum("parcel_status", [
  "expected",
  "at_gate",
  "collected",
  "returned"
]);
var parcels = pgTable(
  "parcels",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id").notNull().references(() => estates.id),
    residentId: text("resident_id").notNull().references(() => users.id),
    description: varchar("description", { length: 200 }).notNull(),
    trackingRef: varchar("tracking_ref", { length: 100 }),
    sender: varchar("sender", { length: 100 }),
    status: parcelStatusEnum("status").notNull().default("expected"),
    receivedAt: timestamp("received_at"),
    collectedAt: timestamp("collected_at"),
    receivedById: text("received_by_id").references(() => users.id),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("parcels_estate_id_idx").on(t.estateId),
    residentIdIdx: index("parcels_resident_id_idx").on(t.residentId),
    statusIdx: index("parcels_status_idx").on(t.status)
  })
);
var classifiedCategoryEnum = pgEnum("classified_category", [
  "sell",
  "buy",
  "give",
  "service"
]);
var classifiedStatusEnum = pgEnum("classified_status", [
  "active",
  "sold",
  "closed"
]);
var classifieds = pgTable(
  "classifieds",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id").notNull().references(() => estates.id),
    userId: text("user_id").notNull().references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    price: decimal("price", { precision: 10, scale: 2 }),
    category: classifiedCategoryEnum("category").notNull().default("sell"),
    status: classifiedStatusEnum("status").notNull().default("active"),
    contactPhone: varchar("contact_phone", { length: 20 }),
    imageUrl: text("image_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow()
  },
  (t) => ({
    estateIdIdx: index("classifieds_estate_id_idx").on(t.estateId),
    categoryIdx: index("classifieds_category_idx").on(t.category),
    statusIdx: index("classifieds_status_idx").on(t.status),
    createdAtIdx: index("classifieds_created_at_idx").on(t.createdAt)
  })
);
var parcelsRelations = relations(parcels, ({ one }) => ({
  resident: one(users, { fields: [parcels.residentId], references: [users.id] }),
  receivedBy: one(users, { fields: [parcels.receivedById], references: [users.id] }),
  estate: one(estates, { fields: [parcels.estateId], references: [estates.id] })
}));
var classifiedsRelations = relations(classifieds, ({ one }) => ({
  user: one(users, { fields: [classifieds.userId], references: [users.id] }),
  estate: one(estates, { fields: [classifieds.estateId], references: [estates.id] })
}));
var usersRelations = relations(users, ({ one, many }) => ({
  estate: one(estates, { fields: [users.estateId], references: [estates.id] }),
  sessions: many(sessions),
  visitors: many(visitors),
  tickets: many(maintenanceTickets),
  notifications: many(notifications)
}));
var estatesRelations = relations(estates, ({ many }) => ({
  users: many(users),
  visitors: many(visitors),
  tickets: many(maintenanceTickets),
  announcements: many(announcements),
  events: many(events),
  emergencyAlerts: many(emergencyAlerts),
  facilities: many(facilities),
  polls: many(polls)
}));
var visitorsRelations = relations(visitors, ({ one }) => ({
  resident: one(users, {
    fields: [visitors.residentId],
    references: [users.id]
  }),
  estate: one(estates, {
    fields: [visitors.estateId],
    references: [estates.id]
  }),
  checkedInBy: one(users, {
    fields: [visitors.checkedInById],
    references: [users.id]
  })
}));
var ticketsRelations = relations(
  maintenanceTickets,
  ({ one, many }) => ({
    resident: one(users, {
      fields: [maintenanceTickets.residentId],
      references: [users.id]
    }),
    assignedTo: one(users, {
      fields: [maintenanceTickets.assignedToId],
      references: [users.id]
    }),
    comments: many(ticketComments)
  })
);
var ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(maintenanceTickets, {
    fields: [ticketComments.ticketId],
    references: [maintenanceTickets.id]
  }),
  author: one(users, {
    fields: [ticketComments.authorId],
    references: [users.id]
  })
}));

// server/src/db.ts
var sql = neon(process.env.DATABASE_URL);
var db = drizzle(sql, { schema: schema_exports });

// server/src/auth.ts
var adapter = new DrizzlePostgreSQLAdapter(db, sessions, users);
var lucia = new Lucia(adapter, {
  sessionCookie: {
    attributes: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    }
  },
  getUserAttributes(attrs) {
    return {
      phone: attrs.phone,
      name: attrs.name,
      role: attrs.role,
      estateId: attrs.estateId,
      unitNumber: attrs.unitNumber,
      avatarUrl: attrs.avatarUrl
    };
  }
});

// server/src/routes/auth.ts
import { Router } from "express";
import bcrypt from "bcrypt";
import { eq } from "drizzle-orm";

// shared/validators.ts
import { z } from "zod";
var kenyanPhone = z.string().min(9).max(15).transform((val) => {
  const digits = val.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10)
    return `+254${digits.slice(1)}`;
  if (digits.length === 9) return `+254${digits}`;
  return val;
}).refine((val) => /^\+254[17]\d{8}$/.test(val), {
  message: "Enter a valid Kenyan phone number (e.g. 0722123456)"
});
var loginSchema = z.object({
  phone: kenyanPhone,
  password: z.string().min(6, "Password must be at least 6 characters")
});
var registerSchema = z.object({
  phone: kenyanPhone,
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  role: z.enum(["resident", "admin", "security", "vendor"]).default("resident"),
  estateId: z.string().optional(),
  unitNumber: z.string().max(20).optional()
});
var createVisitorSchema = z.object({
  name: z.string().min(2).max(100),
  phone: kenyanPhone,
  purpose: z.string().max(200).optional(),
  expectedAt: z.string().datetime().optional()
});
var createTicketSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  category: z.enum([
    "plumbing",
    "electrical",
    "roads",
    "landscaping",
    "security",
    "cleaning",
    "other"
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium")
});
var updateTicketSchema = z.object({
  status: z.enum(["open", "assigned", "in_progress", "resolved", "closed"]).optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedToId: z.string().nullable().optional(),
  adminNotes: z.string().optional()
});
var addCommentSchema = z.object({
  body: z.string().min(1).max(2e3)
});
var createAnnouncementSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10),
  priority: z.enum(["info", "warning", "urgent"]).default("info"),
  sendSms: z.boolean().default(false)
});
var createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  location: z.string().max(200).optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurring: z.boolean().default(false)
});
var emergencyAlertSchema = z.object({
  type: z.enum(["medical", "fire", "security", "accident", "other"]),
  description: z.string().max(500).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional()
});
var initiatePaymentSchema = z.object({
  amount: z.number().min(1).max(5e5),
  type: z.string().min(1).max(50),
  description: z.string().max(100).optional(),
  phone: kenyanPhone.optional()
});
var createCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  goalAmount: z.number().min(100),
  deadline: z.string().datetime().optional()
});
var createPollSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  closesAt: z.string().datetime().optional(),
  anonymous: z.boolean().default(false)
});
var createBookingSchema = z.object({
  facilityId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(500).optional()
});
var createFacilitySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  requiresApproval: z.boolean().default(false),
  maxBookingHours: z.number().int().min(1).max(24).default(4)
});
var createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  phone: kenyanPhone,
  description: z.string().max(500).optional()
});

// server/src/middleware/requireAuth.ts
function requireAuth(req, res, next) {
  if (!res.locals.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

// server/src/lib/ids.ts
import { randomUUID } from "crypto";
var newId = () => randomUUID();

// server/src/routes/auth.ts
var authRouter = Router();
authRouter.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { phone, password, name, role, estateId, unitNumber } = parsed.data;
  const [existing] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Phone number already registered" });
    return;
  }
  if (estateId) {
    const [estate] = await db.select().from(estates).where(eq(estates.id, estateId)).limit(1);
    if (!estate) {
      res.status(400).json({ error: "Estate not found \u2014 check the estate code" });
      return;
    }
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const inserted = await db.insert(users).values({
    id: newId(),
    phone,
    passwordHash,
    name,
    role: role ?? "resident",
    estateId: estateId ?? null,
    unitNumber: unitNumber ?? null
  }).returning();
  const user = inserted[0];
  const session = await lucia.createSession(user.id, {});
  res.appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize());
  const authUser = {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    estateId: user.estateId,
    unitNumber: user.unitNumber,
    avatarUrl: user.avatarUrl
  };
  res.status(201).json({ data: authUser });
});
authRouter.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const { phone, password } = parsed.data;
  const [user] = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  if (!user || user.deletedAt) {
    res.status(401).json({ error: "Invalid phone number or password" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid phone number or password" });
    return;
  }
  const session = await lucia.createSession(user.id, {});
  const cookie = lucia.createSessionCookie(session.id);
  res.appendHeader("Set-Cookie", cookie.serialize());
  const authUser = {
    id: user.id,
    phone: user.phone,
    name: user.name,
    role: user.role,
    estateId: user.estateId,
    unitNumber: user.unitNumber,
    avatarUrl: user.avatarUrl
  };
  res.json({ data: authUser });
});
authRouter.post("/logout", requireAuth, async (_req, res) => {
  await lucia.invalidateSession(res.locals.session.id);
  res.appendHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize());
  res.json({ data: { success: true } });
});
authRouter.get("/me", requireAuth, async (_req, res) => {
  const u = res.locals.user;
  const authUser = {
    id: u.id,
    phone: u.phone,
    name: u.name,
    role: u.role,
    estateId: u.estateId,
    unitNumber: u.unitNumber,
    avatarUrl: u.avatarUrl
  };
  res.json({ data: authUser });
});
authRouter.get("/estate", requireAuth, async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: null });
    return;
  }
  const [estate] = await db.select().from(estates).where(eq(estates.id, user.estateId)).limit(1);
  res.json({ data: estate ?? null });
});
authRouter.get("/estates", async (_req, res) => {
  const rows = await db.select({
    id: estates.id,
    name: estates.name,
    location: estates.location
  }).from(estates).orderBy(estates.name);
  res.json({ data: rows });
});

// server/src/routes/visitors.ts
import { Router as Router2 } from "express";
import { eq as eq2, desc, and, isNull, ilike } from "drizzle-orm";
import QRCode from "qrcode";

// server/src/middleware/requireRole.ts
function requireRole(...roles) {
  return (req, res, next) => {
    if (!res.locals.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(res.locals.user.role)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}

// server/src/lib/sms.ts
async function sendSms({ to, message }) {
  const apiKey = process.env.SMS_API_KEY;
  const username = process.env.SMS_USERNAME;
  if (!apiKey || !username || apiKey === "your_africastalking_api_key") {
    console.info(`[SMS STUB] To: ${to}
${message}`);
    return true;
  }
  try {
    const body = new URLSearchParams({
      username,
      to,
      message,
      from: "JiraniHub"
    });
    const res = await fetch(
      "https://api.africastalking.com/version1/messaging",
      {
        method: "POST",
        headers: {
          apiKey,
          Accept: "application/json",
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: body.toString()
      }
    );
    return res.ok;
  } catch (err) {
    console.error("[SMS] Failed to send:", err);
    return false;
  }
}

// server/src/ws.ts
import { WebSocketServer, WebSocket } from "ws";
var estateConnections = /* @__PURE__ */ new Map();
function broadcastToEstate(estateId, event) {
  const conns = estateConnections.get(estateId);
  if (!conns) return;
  const payload = JSON.stringify(event);
  for (const ws of conns) {
    if (ws.readyState === WebSocket.OPEN) ws.send(payload);
  }
}
function createWsServer(httpServer2) {
  const wss = new WebSocketServer({ server: httpServer2, path: "/ws" });
  wss.on("connection", async (ws, req) => {
    const cookie = req.headers.cookie ?? "";
    const sessionId = lucia.readSessionCookie(cookie);
    if (!sessionId) {
      ws.close(4001, "Unauthorized");
      return;
    }
    const { session, user } = await lucia.validateSession(sessionId);
    if (!session || !user.estateId) {
      ws.close(4001, "Unauthorized");
      return;
    }
    const estateId = user.estateId;
    if (!estateConnections.has(estateId)) {
      estateConnections.set(estateId, /* @__PURE__ */ new Set());
    }
    estateConnections.get(estateId).add(ws);
    ws.on("close", () => {
      estateConnections.get(estateId)?.delete(ws);
    });
    ws.on("error", () => {
      estateConnections.get(estateId)?.delete(ws);
    });
  });
  return wss;
}

// server/src/routes/visitors.ts
var visitorsRouter = Router2();
visitorsRouter.use(requireAuth);
visitorsRouter.get("/my", async (_req, res) => {
  const user = res.locals.user;
  const rows = await db.select().from(visitors).where(and(eq2(visitors.residentId, user.id), isNull(visitors.deletedAt))).orderBy(desc(visitors.createdAt));
  res.json({ data: rows });
});
visitorsRouter.get(
  "/estate",
  requireRole("admin", "security"),
  async (_req, res) => {
    const user = res.locals.user;
    if (!user.estateId) {
      res.status(400).json({ error: "No estate assigned" });
      return;
    }
    const rows = await db.select().from(visitors).where(eq2(visitors.estateId, user.estateId)).orderBy(desc(visitors.createdAt));
    res.json({ data: rows });
  }
);
visitorsRouter.get(
  "/gate-log",
  requireRole("admin", "security"),
  async (req, res) => {
    const user = res.locals.user;
    if (!user.estateId) {
      res.status(400).json({ error: "No estate assigned" });
      return;
    }
    const search = req.query.q;
    const conditions = [eq2(visitors.estateId, user.estateId)];
    const rows = await db.select().from(visitors).where(and(...conditions)).orderBy(desc(visitors.checkedInAt));
    const filtered = search ? rows.filter(
      (v) => v.name.toLowerCase().includes(search.toLowerCase()) || v.phone.includes(search)
    ) : rows;
    res.json({ data: filtered });
  }
);
visitorsRouter.post("/", async (req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }
  const parsed = createVisitorSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const id = newId();
  const qrPayload = JSON.stringify({ visitorId: id, estateId: user.estateId });
  const qrCode = await QRCode.toDataURL(qrPayload);
  const [visitor] = await db.insert(visitors).values({
    id,
    residentId: user.id,
    estateId: user.estateId,
    name: parsed.data.name,
    phone: parsed.data.phone,
    purpose: parsed.data.purpose ?? null,
    expectedAt: parsed.data.expectedAt ? new Date(parsed.data.expectedAt) : null,
    qrCode,
    status: "pending"
  }).returning();
  const smsText = `You have a visitor pass for ${user.name}'s residence. Show this message at the gate. Pass ID: ${id.slice(0, 8).toUpperCase()}`;
  const smsSent = await sendSms({ to: parsed.data.phone, message: smsText });
  if (smsSent) {
    await db.update(visitors).set({ smsSent: true }).where(eq2(visitors.id, id));
  }
  res.status(201).json({ data: { ...visitor, smsSent } });
});
visitorsRouter.get("/lookup", requireRole("admin", "security"), async (req, res) => {
  const { qr, phone } = req.query;
  const user = res.locals.user;
  if (!qr && !phone) {
    res.status(400).json({ error: "Provide qr or phone query param" });
    return;
  }
  let visitorId;
  if (qr) {
    try {
      const parsed = JSON.parse(qr);
      visitorId = parsed.visitorId;
    } catch {
      res.status(400).json({ error: "Invalid QR payload" });
      return;
    }
  }
  const rows = await db.select().from(visitors).where(
    and(
      eq2(visitors.estateId, user.estateId),
      visitorId ? eq2(visitors.id, visitorId) : ilike(visitors.phone, `%${phone}%`)
    )
  ).limit(5);
  res.json({ data: rows });
});
visitorsRouter.post("/:id/check-in", requireRole("admin", "security"), async (req, res) => {
  const user = res.locals.user;
  const [visitor] = await db.select().from(visitors).where(
    and(eq2(visitors.id, req.params["id"]), eq2(visitors.estateId, user.estateId))
  ).limit(1);
  if (!visitor) {
    res.status(404).json({ error: "Visitor not found" });
    return;
  }
  if (visitor.status === "checked_in") {
    res.status(409).json({ error: "Already checked in" });
    return;
  }
  if (visitor.status === "cancelled" || visitor.status === "expired") {
    res.status(409).json({ error: "Pass is no longer valid" });
    return;
  }
  const [updated] = await db.update(visitors).set({
    status: "checked_in",
    checkedInAt: /* @__PURE__ */ new Date(),
    checkedInById: user.id,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq2(visitors.id, req.params["id"])).returning();
  broadcastToEstate(user.estateId, {
    type: "visitor:checked_in",
    payload: updated,
    estateId: user.estateId
  });
  res.json({ data: updated });
});
visitorsRouter.post("/:id/check-out", requireRole("admin", "security"), async (req, res) => {
  const user = res.locals.user;
  const [visitor] = await db.select().from(visitors).where(
    and(eq2(visitors.id, req.params["id"]), eq2(visitors.estateId, user.estateId))
  ).limit(1);
  if (!visitor) {
    res.status(404).json({ error: "Visitor not found" });
    return;
  }
  if (visitor.status !== "checked_in") {
    res.status(409).json({ error: "Visitor is not checked in" });
    return;
  }
  const [updated] = await db.update(visitors).set({
    status: "checked_out",
    checkedOutAt: /* @__PURE__ */ new Date(),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq2(visitors.id, req.params["id"])).returning();
  broadcastToEstate(user.estateId, {
    type: "visitor:checked_out",
    payload: updated,
    estateId: user.estateId
  });
  res.json({ data: updated });
});
visitorsRouter.post("/:id/cancel", async (req, res) => {
  const user = res.locals.user;
  const [visitor] = await db.select().from(visitors).where(
    and(eq2(visitors.id, req.params["id"]), eq2(visitors.residentId, user.id))
  ).limit(1);
  if (!visitor) {
    res.status(404).json({ error: "Visitor not found" });
    return;
  }
  if (visitor.status === "checked_in") {
    res.status(409).json({ error: "Cannot cancel \u2014 visitor is currently inside" });
    return;
  }
  const [updated] = await db.update(visitors).set({ status: "cancelled", updatedAt: /* @__PURE__ */ new Date() }).where(eq2(visitors.id, req.params["id"])).returning();
  res.json({ data: updated });
});
visitorsRouter.get(
  "/export/csv",
  requireRole("admin"),
  async (_req, res) => {
    const user = res.locals.user;
    const rows = await db.select().from(visitors).where(eq2(visitors.estateId, user.estateId)).orderBy(desc(visitors.createdAt));
    const header = "id,name,phone,purpose,status,expectedAt,checkedInAt,checkedOutAt,createdAt\n";
    const csv = rows.map(
      (v) => `${v.id},"${v.name}","${v.phone}","${v.purpose ?? ""}",${v.status},${v.expectedAt ?? ""},${v.checkedInAt ?? ""},${v.checkedOutAt ?? ""},${v.createdAt}`
    ).join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="visitors.csv"'
    );
    res.send(header + csv);
  }
);

// server/src/routes/maintenance.ts
import { Router as Router3 } from "express";
import { eq as eq3, desc as desc2, and as and2, isNull as isNull2, count, lt } from "drizzle-orm";
import multer from "multer";
import path from "path";
var maintenanceRouter = Router3();
maintenanceRouter.use(requireAuth);
var upload = multer({
  dest: "uploads/",
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    cb(null, allowed.includes(path.extname(file.originalname).toLowerCase()));
  }
});
maintenanceRouter.get("/my", async (_req, res) => {
  const user = res.locals.user;
  const rows = await db.select().from(maintenanceTickets).where(
    and2(
      eq3(maintenanceTickets.residentId, user.id),
      isNull2(maintenanceTickets.deletedAt)
    )
  ).orderBy(desc2(maintenanceTickets.createdAt));
  res.json({ data: rows });
});
maintenanceRouter.get(
  "/estate",
  requireRole("admin"),
  async (req, res) => {
    const user = res.locals.user;
    const { status, priority, category } = req.query;
    const rows = await db.query.maintenanceTickets.findMany({
      where: and2(
        eq3(maintenanceTickets.estateId, user.estateId),
        isNull2(maintenanceTickets.deletedAt),
        status ? eq3(maintenanceTickets.status, status) : void 0,
        priority ? eq3(maintenanceTickets.priority, priority) : void 0,
        category ? eq3(maintenanceTickets.category, category) : void 0
      ),
      with: {
        resident: { columns: { name: true, unitNumber: true } },
        assignedTo: { columns: { name: true } },
        comments: {
          with: { author: { columns: { name: true, role: true } } },
          orderBy: [desc2(ticketComments.createdAt)]
        }
      },
      orderBy: [desc2(maintenanceTickets.createdAt)]
    });
    res.json({ data: rows });
  }
);
maintenanceRouter.get("/stats", requireRole("admin"), async (_req, res) => {
  const user = res.locals.user;
  const estateId = user.estateId;
  const sevenDaysAgo = /* @__PURE__ */ new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const [openCount] = await db.select({ count: count() }).from(maintenanceTickets).where(
    and2(
      eq3(maintenanceTickets.estateId, estateId),
      eq3(maintenanceTickets.status, "open")
    )
  );
  const [overdueCount] = await db.select({ count: count() }).from(maintenanceTickets).where(
    and2(
      eq3(maintenanceTickets.estateId, estateId),
      eq3(maintenanceTickets.status, "open"),
      lt(maintenanceTickets.createdAt, sevenDaysAgo)
    )
  );
  const [inProgressCount] = await db.select({ count: count() }).from(maintenanceTickets).where(
    and2(
      eq3(maintenanceTickets.estateId, estateId),
      eq3(maintenanceTickets.status, "in_progress")
    )
  );
  res.json({
    data: {
      open: openCount?.count ?? 0,
      overdue: overdueCount?.count ?? 0,
      inProgress: inProgressCount?.count ?? 0
    }
  });
});
maintenanceRouter.get("/:id", async (req, res) => {
  const user = res.locals.user;
  const ticket = await db.query.maintenanceTickets.findFirst({
    where: eq3(maintenanceTickets.id, req.params["id"]),
    with: {
      resident: { columns: { name: true, unitNumber: true } },
      assignedTo: { columns: { name: true } },
      comments: {
        with: { author: { columns: { name: true, role: true } } },
        orderBy: [desc2(ticketComments.createdAt)]
      }
    }
  });
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  const isOwner = ticket.residentId === user.id;
  const isAdmin = user.role === "admin" && ticket.estateId === user.estateId;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  res.json({ data: ticket });
});
maintenanceRouter.post(
  "/",
  upload.array("photos", 5),
  async (req, res) => {
    const user = res.locals.user;
    if (!user.estateId) {
      res.status(400).json({ error: "No estate assigned" });
      return;
    }
    const parsed = createTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const files = req.files;
    const photoUrls = files?.map((f) => `/uploads/${f.filename}`) ?? [];
    const [ticket] = await db.insert(maintenanceTickets).values({
      id: newId(),
      residentId: user.id,
      estateId: user.estateId,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      priority: parsed.data.priority,
      photoUrls,
      status: "open"
    }).returning();
    broadcastToEstate(user.estateId, {
      type: "ticket:created",
      payload: ticket,
      estateId: user.estateId
    });
    res.status(201).json({ data: ticket });
  }
);
maintenanceRouter.patch(
  "/:id",
  requireRole("admin"),
  async (req, res) => {
    const user = res.locals.user;
    const parsed = updateTicketSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
      return;
    }
    const [existing] = await db.select().from(maintenanceTickets).where(
      and2(
        eq3(maintenanceTickets.id, req.params["id"]),
        eq3(maintenanceTickets.estateId, user.estateId)
      )
    ).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Ticket not found" });
      return;
    }
    const updates = {
      ...parsed.data,
      updatedAt: /* @__PURE__ */ new Date()
    };
    if (parsed.data.status === "resolved" && existing.status !== "resolved") {
      updates.resolvedAt = /* @__PURE__ */ new Date();
    }
    const [updated] = await db.update(maintenanceTickets).set(updates).where(eq3(maintenanceTickets.id, req.params["id"])).returning();
    broadcastToEstate(user.estateId, {
      type: "ticket:updated",
      payload: updated,
      estateId: user.estateId
    });
    res.json({ data: updated });
  }
);
maintenanceRouter.post("/:id/comments", async (req, res) => {
  const user = res.locals.user;
  const parsed = addCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input" });
    return;
  }
  const [ticket] = await db.select().from(maintenanceTickets).where(eq3(maintenanceTickets.id, req.params["id"])).limit(1);
  if (!ticket) {
    res.status(404).json({ error: "Ticket not found" });
    return;
  }
  const isOwner = ticket.residentId === user.id;
  const isAdmin = user.role === "admin" && ticket.estateId === user.estateId;
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  const [comment] = await db.insert(ticketComments).values({
    id: newId(),
    ticketId: req.params["id"],
    authorId: user.id,
    body: parsed.data.body
  }).returning();
  res.status(201).json({ data: comment });
});

// server/src/routes/announcements.ts
import { Router as Router4 } from "express";
import { eq as eq4, desc as desc3 } from "drizzle-orm";
var announcementsRouter = Router4();
announcementsRouter.use(requireAuth);
announcementsRouter.get("/", async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const rows = await db.select().from(announcements).where(eq4(announcements.estateId, user.estateId)).orderBy(desc3(announcements.createdAt)).limit(50);
  res.json({ data: rows });
});
announcementsRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user;
  const parsed = createAnnouncementSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const [row] = await db.insert(announcements).values({
    id: newId(),
    estateId: user.estateId,
    authorId: user.id,
    title: parsed.data.title,
    body: parsed.data.body,
    priority: parsed.data.priority
  }).returning();
  broadcastToEstate(user.estateId, {
    type: "announcement:new",
    payload: row,
    estateId: user.estateId
  });
  res.status(201).json({ data: row });
});

// server/src/routes/notifications.ts
import { Router as Router5 } from "express";
import { eq as eq5, desc as desc4, and as and4 } from "drizzle-orm";
var notificationsRouter = Router5();
notificationsRouter.use(requireAuth);
notificationsRouter.get("/", async (_req, res) => {
  const user = res.locals.user;
  const rows = await db.select().from(notifications).where(eq5(notifications.userId, user.id)).orderBy(desc4(notifications.createdAt)).limit(50);
  res.json({ data: rows });
});
notificationsRouter.patch("/:id/read", async (req, res) => {
  const user = res.locals.user;
  await db.update(notifications).set({ read: true }).where(
    and4(
      eq5(notifications.id, req.params["id"]),
      eq5(notifications.userId, user.id)
    )
  );
  res.json({ data: { success: true } });
});
notificationsRouter.patch("/read-all", async (_req, res) => {
  const user = res.locals.user;
  await db.update(notifications).set({ read: true }).where(eq5(notifications.userId, user.id));
  res.json({ data: { success: true } });
});

// server/src/routes/payments.ts
import { Router as Router6 } from "express";
import { eq as eq6, desc as desc5, and as and5 } from "drizzle-orm";

// server/src/lib/mpesa.ts
var BASE = process.env.NODE_ENV === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
var tokenCache = null;
async function getToken() {
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;
  const creds = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString("base64");
  const res = await fetch(`${BASE}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${creds}` }
  });
  if (!res.ok) throw new Error("M-PESA token request failed");
  const body = await res.json();
  tokenCache = {
    token: body.access_token,
    expiresAt: Date.now() + (parseInt(body.expires_in, 10) - 60) * 1e3
  };
  return tokenCache.token;
}
async function stkPush(params) {
  const shortcode = process.env.MPESA_SHORTCODE;
  const passkey = process.env.MPESA_PASSKEY;
  const ts = (/* @__PURE__ */ new Date()).toISOString().replace(/[-T:.Z]/g, "").slice(0, 14);
  const password = Buffer.from(`${shortcode}${passkey}${ts}`).toString("base64");
  const token = await getToken();
  const body = {
    BusinessShortCode: shortcode,
    Password: password,
    Timestamp: ts,
    TransactionType: "CustomerPayBillOnline",
    Amount: Math.round(params.amount),
    PartyA: params.phone.replace("+", ""),
    PartyB: shortcode,
    PhoneNumber: params.phone.replace("+", ""),
    CallBackURL: process.env.MPESA_CALLBACK_URL,
    AccountReference: params.accountRef.slice(0, 12),
    TransactionDesc: params.description.slice(0, 13)
  };
  const res = await fetch(`${BASE}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!res.ok) throw new Error("STK Push failed");
  return res.json();
}
function isMpesaConfigured() {
  return !!(process.env.MPESA_CONSUMER_KEY && process.env.MPESA_CONSUMER_SECRET && process.env.MPESA_SHORTCODE && process.env.MPESA_PASSKEY && process.env.MPESA_CALLBACK_URL);
}

// server/src/routes/payments.ts
var paymentsRouter = Router6();
paymentsRouter.use(requireAuth);
paymentsRouter.post("/stk-push", async (req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }
  const { amount, type, description, phone } = req.body;
  if (!amount || amount < 1 || !type) {
    res.status(400).json({ error: "amount and type are required" });
    return;
  }
  const payPhone = phone ?? user.phone;
  const id = newId();
  const [payment] = await db.insert(payments).values({
    id,
    userId: user.id,
    estateId: user.estateId,
    amount: String(amount),
    phoneUsed: payPhone,
    type,
    status: "pending",
    description: description ?? null
  }).returning();
  if (!isMpesaConfigured()) {
    const [updated] = await db.update(payments).set({ status: "completed", mpesaRef: "DEV_STUB", updatedAt: /* @__PURE__ */ new Date() }).where(eq6(payments.id, id)).returning();
    res.json({ data: updated, stub: true });
    return;
  }
  try {
    const result = await stkPush({
      phone: payPhone,
      amount,
      accountRef: user.estateId.slice(0, 12),
      description: description ?? type
    });
    await db.update(payments).set({ checkoutRequestId: result.CheckoutRequestID, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(payments.id, id));
    res.json({ data: payment, message: result.CustomerMessage });
  } catch {
    await db.update(payments).set({ status: "failed", updatedAt: /* @__PURE__ */ new Date() }).where(eq6(payments.id, id));
    res.status(502).json({ error: "STK Push failed \u2014 please try again" });
  }
});
paymentsRouter.post("/mpesa/callback", async (req, res) => {
  const callback = req.body?.Body?.stkCallback;
  if (!callback) {
    res.json({ ResultCode: 0 });
    return;
  }
  const { CheckoutRequestID, ResultCode, CallbackMetadata } = callback;
  const [payment] = await db.select().from(payments).where(eq6(payments.checkoutRequestId, CheckoutRequestID)).limit(1);
  if (!payment) {
    res.json({ ResultCode: 0 });
    return;
  }
  if (ResultCode !== 0) {
    await db.update(payments).set({ status: "failed", updatedAt: /* @__PURE__ */ new Date() }).where(eq6(payments.id, payment.id));
  } else {
    const items = CallbackMetadata?.Item ?? [];
    const get = (name) => items.find((i) => i.Name === name)?.Value;
    const mpesaRef = String(get("MpesaReceiptNumber") ?? "");
    await db.update(payments).set({ status: "completed", mpesaRef, updatedAt: /* @__PURE__ */ new Date() }).where(eq6(payments.id, payment.id));
    broadcastToEstate(payment.estateId, {
      type: "payment:confirmed",
      payload: { ...payment, status: "completed", mpesaRef },
      estateId: payment.estateId
    });
  }
  res.json({ ResultCode: 0 });
});
paymentsRouter.get("/my", async (_req, res) => {
  const user = res.locals.user;
  const rows = await db.select().from(payments).where(eq6(payments.userId, user.id)).orderBy(desc5(payments.createdAt)).limit(50);
  res.json({ data: rows });
});
paymentsRouter.get("/estate", requireRole("admin"), async (_req, res) => {
  const user = res.locals.user;
  const rows = await db.select().from(payments).where(eq6(payments.estateId, user.estateId)).orderBy(desc5(payments.createdAt)).limit(200);
  res.json({ data: rows });
});
paymentsRouter.get("/campaigns", async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const rows = await db.select().from(fundraisingCampaigns).where(eq6(fundraisingCampaigns.estateId, user.estateId)).orderBy(desc5(fundraisingCampaigns.createdAt));
  res.json({ data: rows });
});
paymentsRouter.post("/campaigns", requireRole("admin"), async (req, res) => {
  const user = res.locals.user;
  const { title, description, goalAmount, deadline } = req.body;
  if (!title || !goalAmount) {
    res.status(400).json({ error: "title and goalAmount required" });
    return;
  }
  const [row] = await db.insert(fundraisingCampaigns).values({
    id: newId(),
    estateId: user.estateId,
    createdById: user.id,
    title,
    description: description ?? null,
    goalAmount: String(goalAmount),
    deadline: deadline ? new Date(deadline) : null
  }).returning();
  res.status(201).json({ data: row });
});
paymentsRouter.post("/campaigns/:id/donate", async (req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }
  const { amount, anonymous } = req.body;
  if (!amount || amount < 1) {
    res.status(400).json({ error: "amount required" });
    return;
  }
  const [campaign] = await db.select().from(fundraisingCampaigns).where(and5(
    eq6(fundraisingCampaigns.id, req.params["id"]),
    eq6(fundraisingCampaigns.estateId, user.estateId)
  )).limit(1);
  if (!campaign) {
    res.status(404).json({ error: "Campaign not found" });
    return;
  }
  const [donation] = await db.insert(donations).values({
    id: newId(),
    campaignId: campaign.id,
    donorId: user.id,
    amount: String(amount),
    anonymous: anonymous ?? false
  }).returning();
  await db.update(fundraisingCampaigns).set({
    currentAmount: String(Number(campaign.currentAmount) + amount),
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq6(fundraisingCampaigns.id, campaign.id));
  res.status(201).json({ data: donation });
});

// server/src/routes/emergency.ts
import { Router as Router7 } from "express";
import { eq as eq7, desc as desc6, and as and6 } from "drizzle-orm";
var emergencyRouter = Router7();
emergencyRouter.use(requireAuth);
emergencyRouter.post("/", async (req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }
  const parsed = emergencyAlertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const [alert] = await db.insert(emergencyAlerts).values({
    id: newId(),
    userId: user.id,
    estateId: user.estateId,
    type: parsed.data.type,
    description: parsed.data.description ?? null,
    locationLat: parsed.data.locationLat ? String(parsed.data.locationLat) : null,
    locationLng: parsed.data.locationLng ? String(parsed.data.locationLng) : null,
    status: "active"
  }).returning();
  broadcastToEstate(user.estateId, {
    type: "emergency:alert",
    payload: { ...alert, user: { name: user.name, phone: user.phone } },
    estateId: user.estateId
  });
  res.status(201).json({ data: alert });
});
emergencyRouter.get("/", requireRole("admin", "security"), async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const rows = await db.select({
    id: emergencyAlerts.id,
    userId: emergencyAlerts.userId,
    estateId: emergencyAlerts.estateId,
    type: emergencyAlerts.type,
    description: emergencyAlerts.description,
    locationLat: emergencyAlerts.locationLat,
    locationLng: emergencyAlerts.locationLng,
    status: emergencyAlerts.status,
    resolvedAt: emergencyAlerts.resolvedAt,
    createdAt: emergencyAlerts.createdAt,
    updatedAt: emergencyAlerts.updatedAt,
    userName: users.name,
    userPhone: users.phone
  }).from(emergencyAlerts).innerJoin(users, eq7(emergencyAlerts.userId, users.id)).where(eq7(emergencyAlerts.estateId, user.estateId)).orderBy(desc6(emergencyAlerts.createdAt)).limit(100);
  res.json({ data: rows });
});
emergencyRouter.patch("/:id", requireRole("admin", "security"), async (req, res) => {
  const user = res.locals.user;
  const { status } = req.body;
  const [existing] = await db.select().from(emergencyAlerts).where(and6(
    eq7(emergencyAlerts.id, req.params["id"]),
    eq7(emergencyAlerts.estateId, user.estateId)
  )).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Alert not found" });
    return;
  }
  const [updated] = await db.update(emergencyAlerts).set({
    status,
    resolvedAt: status === "resolved" ? /* @__PURE__ */ new Date() : null,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq7(emergencyAlerts.id, req.params["id"])).returning();
  broadcastToEstate(user.estateId, {
    type: "emergency:alert",
    payload: updated,
    estateId: user.estateId
  });
  res.json({ data: updated });
});

// server/src/routes/events.ts
import { Router as Router8 } from "express";
import { eq as eq8, and as and7, gte, count as count2 } from "drizzle-orm";
var eventsRouter = Router8();
eventsRouter.use(requireAuth);
eventsRouter.get("/", async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const now = /* @__PURE__ */ new Date();
  const rows = await db.select().from(events).where(and7(eq8(events.estateId, user.estateId), gte(events.endTime, now))).orderBy(events.startTime).limit(50);
  const enriched = await Promise.all(rows.map(async (e) => {
    const cntRows = await db.select({ cnt: count2() }).from(eventRsvps).where(and7(eq8(eventRsvps.eventId, e.id), eq8(eventRsvps.attending, true)));
    const rsvpCount = cntRows[0]?.cnt ?? 0;
    const myRsvpRows = await db.select().from(eventRsvps).where(and7(eq8(eventRsvps.eventId, e.id), eq8(eventRsvps.userId, user.id))).limit(1);
    return { ...e, rsvpCount, myRsvp: myRsvpRows[0]?.attending ?? null };
  }));
  res.json({ data: enriched });
});
eventsRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user;
  const parsed = createEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid input", details: parsed.error.flatten() });
    return;
  }
  const [row] = await db.insert(events).values({
    id: newId(),
    estateId: user.estateId,
    createdById: user.id,
    title: parsed.data.title,
    description: parsed.data.description ?? null,
    location: parsed.data.location ?? null,
    startTime: new Date(parsed.data.startTime),
    endTime: new Date(parsed.data.endTime),
    recurring: parsed.data.recurring
  }).returning();
  res.status(201).json({ data: row });
});
eventsRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user;
  const [existing] = await db.select().from(events).where(and7(eq8(events.id, req.params["id"]), eq8(events.estateId, user.estateId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  await db.delete(events).where(eq8(events.id, req.params["id"]));
  res.json({ data: { success: true } });
});
eventsRouter.post("/:id/rsvp", async (req, res) => {
  const user = res.locals.user;
  const { attending } = req.body;
  const [event] = await db.select().from(events).where(and7(eq8(events.id, req.params["id"]), eq8(events.estateId, user.estateId))).limit(1);
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }
  const [existing] = await db.select().from(eventRsvps).where(and7(eq8(eventRsvps.eventId, req.params["id"]), eq8(eventRsvps.userId, user.id))).limit(1);
  if (existing) {
    const [updated] = await db.update(eventRsvps).set({ attending: attending ?? true }).where(eq8(eventRsvps.id, existing.id)).returning();
    res.json({ data: updated });
  } else {
    const [row] = await db.insert(eventRsvps).values({
      id: newId(),
      eventId: req.params["id"],
      userId: user.id,
      attending: attending ?? true
    }).returning();
    res.status(201).json({ data: row });
  }
});

// server/src/routes/polls.ts
import { Router as Router9 } from "express";
import { eq as eq9, desc as desc8, and as and8, inArray } from "drizzle-orm";
var pollsRouter = Router9();
pollsRouter.use(requireAuth);
pollsRouter.get("/", async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const pollRows = await db.select().from(polls).where(eq9(polls.estateId, user.estateId)).orderBy(desc8(polls.createdAt)).limit(50);
  const pollIds = pollRows.map((p) => p.id);
  if (pollIds.length === 0) {
    res.json({ data: [] });
    return;
  }
  const optionRows = await db.select().from(pollOptions).where(inArray(pollOptions.pollId, pollIds));
  const myVotes = await db.select().from(votes).where(and8(inArray(votes.pollId, pollIds), eq9(votes.userId, user.id)));
  const myVoteMap = new Map(myVotes.map((v) => [v.pollId, v.optionId]));
  const enriched = pollRows.map((p) => ({
    ...p,
    options: optionRows.filter((o) => o.pollId === p.id),
    myVoteOptionId: myVoteMap.get(p.id) ?? null,
    totalVotes: optionRows.filter((o) => o.pollId === p.id).reduce((sum, o) => sum + o.voteCount, 0)
  }));
  res.json({ data: enriched });
});
pollsRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user;
  const { title, description, options, closesAt, anonymous } = req.body;
  if (!title || !options || options.length < 2) {
    res.status(400).json({ error: "title and at least 2 options required" });
    return;
  }
  const pollId = newId();
  const [poll] = await db.insert(polls).values({
    id: pollId,
    estateId: user.estateId,
    createdById: user.id,
    title,
    description: description ?? null,
    anonymous: anonymous ?? false,
    closesAt: closesAt ? new Date(closesAt) : null
  }).returning();
  const optionInserts = options.map((label) => ({
    id: newId(),
    pollId,
    label,
    voteCount: 0
  }));
  const insertedOptions = await db.insert(pollOptions).values(optionInserts).returning();
  res.status(201).json({ data: { ...poll, options: insertedOptions } });
});
pollsRouter.post("/:id/vote", async (req, res) => {
  const user = res.locals.user;
  const { optionId } = req.body;
  if (!optionId) {
    res.status(400).json({ error: "optionId required" });
    return;
  }
  const [poll] = await db.select().from(polls).where(and8(eq9(polls.id, req.params["id"]), eq9(polls.estateId, user.estateId))).limit(1);
  if (!poll) {
    res.status(404).json({ error: "Poll not found" });
    return;
  }
  if (poll.closesAt && new Date(poll.closesAt) < /* @__PURE__ */ new Date()) {
    res.status(409).json({ error: "Poll is closed" });
    return;
  }
  const [existing] = await db.select().from(votes).where(and8(eq9(votes.pollId, req.params["id"]), eq9(votes.userId, user.id))).limit(1);
  if (existing) {
    res.status(409).json({ error: "Already voted" });
    return;
  }
  const [option] = await db.select().from(pollOptions).where(and8(eq9(pollOptions.id, optionId), eq9(pollOptions.pollId, req.params["id"]))).limit(1);
  if (!option) {
    res.status(404).json({ error: "Option not found" });
    return;
  }
  await db.insert(votes).values({
    id: newId(),
    pollId: req.params["id"],
    optionId,
    userId: user.id
  });
  await db.update(pollOptions).set({ voteCount: option.voteCount + 1 }).where(eq9(pollOptions.id, optionId));
  res.status(201).json({ data: { success: true } });
});

// server/src/routes/facilities.ts
import { Router as Router10 } from "express";
import { eq as eq10, desc as desc9, and as and9, lte, gte as gte2, or } from "drizzle-orm";
var facilitiesRouter = Router10();
facilitiesRouter.use(requireAuth);
facilitiesRouter.get("/", async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const rows = await db.select().from(facilities).where(eq10(facilities.estateId, user.estateId)).orderBy(facilities.name);
  res.json({ data: rows });
});
facilitiesRouter.post("/", requireRole("admin"), async (req, res) => {
  const user = res.locals.user;
  const { name, description, requiresApproval, maxBookingHours } = req.body;
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const [row] = await db.insert(facilities).values({
    id: newId(),
    estateId: user.estateId,
    name,
    description: description ?? null,
    requiresApproval: requiresApproval ?? false,
    maxBookingHours: maxBookingHours ?? 4
  }).returning();
  res.status(201).json({ data: row });
});
facilitiesRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user;
  const [existing] = await db.select().from(facilities).where(and9(eq10(facilities.id, req.params["id"]), eq10(facilities.estateId, user.estateId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Facility not found" });
    return;
  }
  const { name, description, requiresApproval, maxBookingHours } = req.body;
  const [updated] = await db.update(facilities).set({
    name: name ?? existing.name,
    description: description ?? existing.description,
    requiresApproval: requiresApproval ?? existing.requiresApproval,
    maxBookingHours: maxBookingHours ?? existing.maxBookingHours
  }).where(eq10(facilities.id, req.params["id"])).returning();
  res.json({ data: updated });
});
facilitiesRouter.get("/bookings", async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  if (user.role === "admin") {
    const rows2 = await db.select({
      id: bookings.id,
      facilityId: bookings.facilityId,
      userId: bookings.userId,
      estateId: bookings.estateId,
      startTime: bookings.startTime,
      endTime: bookings.endTime,
      status: bookings.status,
      notes: bookings.notes,
      createdAt: bookings.createdAt,
      facilityName: facilities.name,
      userName: users.name,
      unitNumber: users.unitNumber
    }).from(bookings).innerJoin(facilities, eq10(bookings.facilityId, facilities.id)).innerJoin(users, eq10(bookings.userId, users.id)).where(eq10(bookings.estateId, user.estateId)).orderBy(desc9(bookings.startTime)).limit(100);
    res.json({ data: rows2 });
    return;
  }
  const rows = await db.select({
    id: bookings.id,
    facilityId: bookings.facilityId,
    userId: bookings.userId,
    estateId: bookings.estateId,
    startTime: bookings.startTime,
    endTime: bookings.endTime,
    status: bookings.status,
    notes: bookings.notes,
    createdAt: bookings.createdAt,
    facilityName: facilities.name
  }).from(bookings).innerJoin(facilities, eq10(bookings.facilityId, facilities.id)).where(and9(eq10(bookings.userId, user.id), eq10(bookings.estateId, user.estateId))).orderBy(desc9(bookings.startTime)).limit(50);
  res.json({ data: rows });
});
facilitiesRouter.post("/bookings", async (req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }
  const { facilityId, startTime, endTime, notes } = req.body;
  if (!facilityId || !startTime || !endTime) {
    res.status(400).json({ error: "facilityId, startTime, endTime required" });
    return;
  }
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (end <= start) {
    res.status(400).json({ error: "endTime must be after startTime" });
    return;
  }
  if (start < /* @__PURE__ */ new Date()) {
    res.status(400).json({ error: "Cannot book in the past" });
    return;
  }
  const [facility] = await db.select().from(facilities).where(and9(eq10(facilities.id, facilityId), eq10(facilities.estateId, user.estateId))).limit(1);
  if (!facility) {
    res.status(404).json({ error: "Facility not found" });
    return;
  }
  const hours = (end.getTime() - start.getTime()) / 36e5;
  if (hours > facility.maxBookingHours) {
    res.status(400).json({ error: `Maximum ${facility.maxBookingHours} hours per booking` });
    return;
  }
  const conflicts = await db.select().from(bookings).where(and9(
    eq10(bookings.facilityId, facilityId),
    or(eq10(bookings.status, "pending"), eq10(bookings.status, "approved")),
    lte(bookings.startTime, end),
    gte2(bookings.endTime, start)
  )).limit(1);
  if (conflicts.length > 0) {
    res.status(409).json({ error: "Time slot is already booked" });
    return;
  }
  const [row] = await db.insert(bookings).values({
    id: newId(),
    facilityId,
    userId: user.id,
    estateId: user.estateId,
    startTime: start,
    endTime: end,
    status: facility.requiresApproval ? "pending" : "approved",
    notes: notes ?? null
  }).returning();
  res.status(201).json({ data: row });
});
facilitiesRouter.patch("/bookings/:id", async (req, res) => {
  const user = res.locals.user;
  const { status } = req.body;
  const [booking] = await db.select().from(bookings).where(eq10(bookings.id, req.params["id"])).limit(1);
  if (!booking) {
    res.status(404).json({ error: "Booking not found" });
    return;
  }
  if (booking.estateId !== user.estateId) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (user.role !== "admin" && booking.userId !== user.id) {
    res.status(403).json({ error: "Access denied" });
    return;
  }
  if (user.role !== "admin" && status !== "cancelled") {
    res.status(403).json({ error: "Only admin can change status" });
    return;
  }
  const [updated] = await db.update(bookings).set({ status, updatedAt: /* @__PURE__ */ new Date() }).where(eq10(bookings.id, req.params["id"])).returning();
  res.json({ data: updated });
});

// server/src/routes/services.ts
import { Router as Router11 } from "express";
import { eq as eq11, and as and10 } from "drizzle-orm";
var servicesRouter = Router11();
servicesRouter.use(requireAuth);
servicesRouter.get("/", async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const rows = await db.select().from(serviceProviders).where(eq11(serviceProviders.estateId, user.estateId)).orderBy(serviceProviders.category, serviceProviders.name);
  res.json({ data: rows });
});
servicesRouter.post("/", requireRole("admin", "vendor"), async (req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }
  const { name, category, phone, description } = req.body;
  if (!name || !category || !phone) {
    res.status(400).json({ error: "name, category, phone required" });
    return;
  }
  const [row] = await db.insert(serviceProviders).values({
    id: newId(),
    estateId: user.estateId,
    userId: user.id,
    name,
    category,
    phone,
    description: description ?? null
  }).returning();
  res.status(201).json({ data: row });
});
servicesRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user;
  const [existing] = await db.select().from(serviceProviders).where(and10(
    eq11(serviceProviders.id, req.params["id"]),
    eq11(serviceProviders.estateId, user.estateId)
  )).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  const updates = { ...req.body, updatedAt: /* @__PURE__ */ new Date() };
  delete updates.id;
  delete updates.estateId;
  const [updated] = await db.update(serviceProviders).set(updates).where(eq11(serviceProviders.id, req.params["id"])).returning();
  res.json({ data: updated });
});
servicesRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const user = res.locals.user;
  const [existing] = await db.select().from(serviceProviders).where(and10(
    eq11(serviceProviders.id, req.params["id"]),
    eq11(serviceProviders.estateId, user.estateId)
  )).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Provider not found" });
    return;
  }
  await db.delete(serviceProviders).where(eq11(serviceProviders.id, req.params["id"]));
  res.json({ data: { success: true } });
});

// server/src/routes/users.ts
import { Router as Router12 } from "express";
import bcrypt2 from "bcrypt";
import { eq as eq12, and as and11, isNull as isNull3 } from "drizzle-orm";
var usersRouter = Router12();
usersRouter.use(requireAuth);
usersRouter.get("/", requireRole("admin"), async (_req, res) => {
  const user = res.locals.user;
  const rows = await db.select({
    id: users.id,
    phone: users.phone,
    name: users.name,
    role: users.role,
    estateId: users.estateId,
    unitNumber: users.unitNumber,
    avatarUrl: users.avatarUrl,
    deletedAt: users.deletedAt,
    createdAt: users.createdAt
  }).from(users).where(and11(eq12(users.estateId, user.estateId), isNull3(users.deletedAt))).orderBy(users.role, users.name);
  res.json({ data: rows });
});
usersRouter.post("/", requireRole("admin"), async (req, res) => {
  const admin = res.locals.user;
  const { phone, name, role, unitNumber, password } = req.body;
  if (!phone || !name) {
    res.status(400).json({ error: "phone and name are required" });
    return;
  }
  const [existing] = await db.select().from(users).where(eq12(users.phone, phone)).limit(1);
  if (existing) {
    res.status(409).json({ error: "Phone number already registered" });
    return;
  }
  const tempPassword = password ?? Math.random().toString(36).slice(-8);
  const passwordHash = await bcrypt2.hash(tempPassword, 10);
  const insertedRows = await db.insert(users).values({
    id: newId(),
    phone,
    passwordHash,
    name,
    role: role ?? "resident",
    estateId: admin.estateId,
    unitNumber: unitNumber ?? null
  }).returning();
  const newUser = insertedRows[0];
  await sendSms({
    to: phone,
    message: `Welcome to JiraniHub! Your login: Phone ${phone}, Password: ${tempPassword}. Visit https://www.jiranihub.co.ke`
  });
  res.status(201).json({
    data: {
      id: newUser.id,
      phone: newUser.phone,
      name: newUser.name,
      role: newUser.role,
      unitNumber: newUser.unitNumber
    },
    tempPassword
  });
});
usersRouter.patch("/:id", requireRole("admin"), async (req, res) => {
  const admin = res.locals.user;
  const { name, unitNumber, role } = req.body;
  const [existing] = await db.select().from(users).where(and11(eq12(users.id, req.params["id"]), eq12(users.estateId, admin.estateId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const updates = { updatedAt: /* @__PURE__ */ new Date() };
  if (name !== void 0) updates.name = name;
  if (unitNumber !== void 0) updates.unitNumber = unitNumber;
  if (role !== void 0) updates.role = role;
  const updatedRows = await db.update(users).set(updates).where(eq12(users.id, req.params["id"])).returning();
  const updated = updatedRows[0];
  res.json({
    data: {
      id: updated.id,
      phone: updated.phone,
      name: updated.name,
      role: updated.role,
      unitNumber: updated.unitNumber
    }
  });
});
usersRouter.delete("/:id", requireRole("admin"), async (req, res) => {
  const admin = res.locals.user;
  if (req.params["id"] === admin.id) {
    res.status(400).json({ error: "Cannot deactivate your own account" });
    return;
  }
  const [existing] = await db.select().from(users).where(and11(eq12(users.id, req.params["id"]), eq12(users.estateId, admin.estateId))).limit(1);
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  await db.update(users).set({ deletedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq12(users.id, req.params["id"]));
  res.json({ data: { success: true } });
});
usersRouter.patch("/me/profile", async (req, res) => {
  const user = res.locals.user;
  const { name } = req.body;
  if (!name?.trim()) {
    res.status(400).json({ error: "name required" });
    return;
  }
  await db.update(users).set({ name: name.trim(), updatedAt: /* @__PURE__ */ new Date() }).where(eq12(users.id, user.id));
  res.json({ data: { success: true } });
});
usersRouter.post("/me/password", async (req, res) => {
  const user = res.locals.user;
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword || newPassword.length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }
  const [dbUser] = await db.select().from(users).where(eq12(users.id, user.id)).limit(1);
  const valid = await bcrypt2.compare(currentPassword, dbUser.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const passwordHash = await bcrypt2.hash(newPassword, 10);
  await db.update(users).set({ passwordHash, updatedAt: /* @__PURE__ */ new Date() }).where(eq12(users.id, user.id));
  res.json({ data: { success: true } });
});

// server/src/routes/weather.ts
import { Router as Router13 } from "express";
var weatherRouter = Router13();
weatherRouter.use(requireAuth);
var LAT = -1.4667;
var LON = 36.9833;
function describeCode(code) {
  if (code === 0) return "Clear sky";
  if (code <= 2) return "Partly cloudy";
  if (code === 3) return "Overcast";
  if (code <= 49) return "Foggy";
  if (code <= 59) return "Drizzle";
  if (code <= 69) return "Rain";
  if (code <= 79) return "Snow / Sleet";
  if (code <= 84) return "Rain showers";
  if (code <= 99) return "Thunderstorm";
  return "Unknown";
}
weatherRouter.get("/", async (_req, res) => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Africa%2FNairobi&forecast_days=1`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("Weather API error");
    const raw = await resp.json();
    const data = {
      temp: Math.round(raw.current.temperature_2m),
      feelsLike: Math.round(raw.current.apparent_temperature),
      humidity: raw.current.relative_humidity_2m,
      windSpeed: Math.round(raw.current.wind_speed_10m),
      code: raw.current.weather_code,
      description: describeCode(raw.current.weather_code),
      rainProb: raw.daily.precipitation_probability_max[0] ?? 0,
      high: Math.round(raw.daily.temperature_2m_max[0] ?? raw.current.temperature_2m),
      low: Math.round(raw.daily.temperature_2m_min[0] ?? raw.current.temperature_2m),
      location: "Athi River, Machakos"
    };
    res.json({ data });
  } catch {
    res.status(503).json({ error: "Weather data temporarily unavailable" });
  }
});

// server/src/routes/traffic.ts
import { Router as Router14 } from "express";
var trafficRouter = Router14();
trafficRouter.use(requireAuth);
var ORIGIN = "-1.467,36.983";
var DEST = "-1.284,36.823";
var NORMAL_MINS = 45;
var DISTANCE_KM = 42;
trafficRouter.get("/", async (_req, res) => {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const data = {
      durationMins: NORMAL_MINS,
      normalMins: NORMAL_MINS,
      distanceKm: DISTANCE_KM,
      status: "clear",
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      noKey: true
    };
    res.json({ data });
    return;
  }
  try {
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${ORIGIN}&destinations=${DEST}&mode=driving&departure_time=now&traffic_model=best_guess&key=${apiKey}`;
    const resp = await fetch(url);
    const raw = await resp.json();
    const el = raw.rows[0]?.elements[0];
    if (!el || el.status !== "OK") throw new Error("No route data");
    const durationMins = Math.round(el.duration_in_traffic.value / 60);
    const normalMins = Math.round(el.duration.value / 60);
    const distanceKm = Math.round(el.distance.value / 1e3);
    const ratio = durationMins / normalMins;
    const status = ratio < 1.2 ? "clear" : ratio < 1.6 ? "moderate" : "heavy";
    const data = {
      durationMins,
      normalMins,
      distanceKm,
      status,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    res.json({ data });
  } catch {
    res.status(503).json({ error: "Traffic data temporarily unavailable" });
  }
});

// server/src/routes/parcels.ts
import { Router as Router15 } from "express";
import { eq as eq13, and as and12, desc as desc11 } from "drizzle-orm";

// server/src/lib/notify.ts
async function createNotification(opts) {
  await db.insert(notifications).values({
    id: newId(),
    userId: opts.userId,
    title: opts.title,
    body: opts.body,
    type: opts.type,
    linkTo: opts.linkTo ?? null
  });
}

// server/src/routes/parcels.ts
var parcelsRouter = Router15();
parcelsRouter.use(requireAuth);
parcelsRouter.get("/my", async (_req, res) => {
  const user = res.locals.user;
  const rows = await db.select().from(parcels).where(eq13(parcels.residentId, user.id)).orderBy(desc11(parcels.createdAt)).limit(50);
  res.json({ data: rows });
});
parcelsRouter.get("/estate", requireRole("admin", "security"), async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const rows = await db.query.parcels.findMany({
    where: eq13(parcels.estateId, user.estateId),
    with: {
      resident: { columns: { name: true, unitNumber: true } },
      receivedBy: { columns: { name: true } }
    },
    orderBy: desc11(parcels.createdAt),
    limit: 100
  });
  res.json({ data: rows });
});
parcelsRouter.post("/", async (req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }
  const { description, trackingRef, sender } = req.body;
  if (!description?.trim()) {
    res.status(400).json({ error: "Description is required" });
    return;
  }
  const [parcel] = await db.insert(parcels).values({
    id: newId(),
    estateId: user.estateId,
    residentId: user.id,
    description: description.trim(),
    trackingRef: trackingRef?.trim() || null,
    sender: sender?.trim() || null,
    status: "expected"
  }).returning();
  res.status(201).json({ data: parcel });
});
parcelsRouter.patch("/:id/received", requireRole("admin", "security"), async (req, res) => {
  const user = res.locals.user;
  const { notes } = req.body;
  const [parcel] = await db.select().from(parcels).where(and12(eq13(parcels.id, req.params.id), eq13(parcels.estateId, user.estateId))).limit(1);
  if (!parcel) {
    res.status(404).json({ error: "Parcel not found" });
    return;
  }
  const [updated] = await db.update(parcels).set({
    status: "at_gate",
    receivedAt: /* @__PURE__ */ new Date(),
    receivedById: user.id,
    notes: notes?.trim() || null,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq13(parcels.id, parcel.id)).returning();
  const [resident] = await db.select({ name: users.name }).from(users).where(eq13(users.id, parcel.residentId)).limit(1);
  await createNotification({
    userId: parcel.residentId,
    title: "\u{1F4E6} Parcel at Gate",
    body: `Your parcel (${parcel.description}) has arrived at the gate. Please collect it.`,
    type: "parcel",
    linkTo: "/parcels"
  });
  broadcastToEstate(user.estateId, {
    type: "notification:new",
    payload: { userId: parcel.residentId },
    estateId: user.estateId
  });
  res.json({ data: updated });
});
parcelsRouter.patch("/:id/collected", async (req, res) => {
  const user = res.locals.user;
  const [parcel] = await db.select().from(parcels).where(eq13(parcels.id, req.params.id)).limit(1);
  if (!parcel || parcel.estateId !== user.estateId) {
    res.status(404).json({ error: "Parcel not found" });
    return;
  }
  const isOwner = parcel.residentId === user.id;
  const isStaff = user.role === "admin" || user.role === "security";
  if (!isOwner && !isStaff) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const [updated] = await db.update(parcels).set({ status: "collected", collectedAt: /* @__PURE__ */ new Date(), updatedAt: /* @__PURE__ */ new Date() }).where(eq13(parcels.id, parcel.id)).returning();
  res.json({ data: updated });
});
parcelsRouter.delete("/:id", async (req, res) => {
  const user = res.locals.user;
  await db.delete(parcels).where(and12(eq13(parcels.id, req.params.id), eq13(parcels.residentId, user.id)));
  res.json({ data: { success: true } });
});

// server/src/routes/classifieds.ts
import { Router as Router16 } from "express";
import { eq as eq14, and as and13, desc as desc12, ne } from "drizzle-orm";
var classifiedsRouter = Router16();
classifiedsRouter.use(requireAuth);
classifiedsRouter.get("/", async (_req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.json({ data: [] });
    return;
  }
  const rows = await db.query.classifieds.findMany({
    where: and13(
      eq14(classifieds.estateId, user.estateId),
      ne(classifieds.status, "closed")
    ),
    with: {
      user: { columns: { name: true, unitNumber: true } }
    },
    orderBy: desc12(classifieds.createdAt),
    limit: 100
  });
  res.json({ data: rows });
});
classifiedsRouter.get("/my", async (_req, res) => {
  const user = res.locals.user;
  const rows = await db.select().from(classifieds).where(eq14(classifieds.userId, user.id)).orderBy(desc12(classifieds.createdAt));
  res.json({ data: rows });
});
classifiedsRouter.post("/", async (req, res) => {
  const user = res.locals.user;
  if (!user.estateId) {
    res.status(400).json({ error: "No estate assigned" });
    return;
  }
  const { title, description, price, category, contactPhone } = req.body;
  if (!title?.trim() || !description?.trim()) {
    res.status(400).json({ error: "Title and description are required" });
    return;
  }
  const validCategories = ["sell", "buy", "give", "service"];
  if (!validCategories.includes(category)) {
    res.status(400).json({ error: "Invalid category" });
    return;
  }
  const [listing] = await db.insert(classifieds).values({
    id: newId(),
    estateId: user.estateId,
    userId: user.id,
    title: title.trim(),
    description: description.trim(),
    price: price ? String(parseFloat(price)) : null,
    category,
    contactPhone: contactPhone?.trim() || null,
    status: "active"
  }).returning();
  res.status(201).json({ data: listing });
});
classifiedsRouter.patch("/:id", async (req, res) => {
  const user = res.locals.user;
  const { status, title, description, price } = req.body;
  const [listing] = await db.select().from(classifieds).where(eq14(classifieds.id, req.params.id)).limit(1);
  if (!listing) {
    res.status(404).json({ error: "Listing not found" });
    return;
  }
  const isOwner = listing.userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const updates = { updatedAt: /* @__PURE__ */ new Date() };
  if (status && ["active", "sold", "closed"].includes(status)) updates.status = status;
  if (title?.trim()) updates.title = title.trim();
  if (description?.trim()) updates.description = description.trim();
  if (price !== void 0) updates.price = price ? String(parseFloat(price)) : null;
  const [updated] = await db.update(classifieds).set(updates).where(eq14(classifieds.id, listing.id)).returning();
  res.json({ data: updated });
});
classifiedsRouter.delete("/:id", async (req, res) => {
  const user = res.locals.user;
  const [listing] = await db.select().from(classifieds).where(eq14(classifieds.id, req.params.id)).limit(1);
  if (!listing) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  const isOwner = listing.userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isOwner && !isAdmin) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  await db.delete(classifieds).where(eq14(classifieds.id, listing.id));
  res.json({ data: { success: true } });
});

// server/src/index.ts
var __dirname = path2.dirname(fileURLToPath(import.meta.url));
var isProd = process.env.NODE_ENV === "production";
var PORT = Number(process.env.PORT ?? 5e3);
var app = express();
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false
  })
);
var ALLOWED_ORIGINS = isProd ? [
  "https://www.jiranihub.co.ke",
  "https://jiranihub.co.ke",
  process.env.CLIENT_URL,
  process.env.RENDER_EXTERNAL_URL
].filter(Boolean) : ["http://localhost:3000", "http://localhost:5173"];
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1e3,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false
  })
);
app.use(async (req, res, next) => {
  const sessionId = lucia.readSessionCookie(req.headers.cookie ?? "");
  if (!sessionId) {
    res.locals.user = null;
    res.locals.session = null;
    return next();
  }
  const { session, user } = await lucia.validateSession(sessionId);
  if (session?.fresh) {
    res.appendHeader("Set-Cookie", lucia.createSessionCookie(session.id).serialize());
  }
  if (!session) {
    res.appendHeader("Set-Cookie", lucia.createBlankSessionCookie().serialize());
  }
  res.locals.session = session;
  res.locals.user = user;
  next();
});
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path2.join(process.cwd(), "uploads")));
app.use("/api/auth", authRouter);
app.use("/api/visitors", visitorsRouter);
app.use("/api/maintenance", maintenanceRouter);
app.use("/api/announcements", announcementsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/emergency", emergencyRouter);
app.use("/api/events", eventsRouter);
app.use("/api/polls", pollsRouter);
app.use("/api/facilities", facilitiesRouter);
app.use("/api/services", servicesRouter);
app.use("/api/users", usersRouter);
app.use("/api/weather", weatherRouter);
app.use("/api/traffic", trafficRouter);
app.use("/api/parcels", parcelsRouter);
app.use("/api/classifieds", classifiedsRouter);
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
if (isProd) {
  const staticPath = path2.join(process.cwd(), "dist/public");
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path2.join(staticPath, "index.html"));
  });
}
var httpServer = createServer(app);
createWsServer(httpServer);
httpServer.listen(PORT, () => {
  console.info(`JiraniHub server running on http://localhost:${PORT}`);
});
