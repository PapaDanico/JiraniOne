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
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", [
  "resident",
  "admin",
  "security",
  "vendor",
]);

export const visitorStatusEnum = pgEnum("visitor_status", [
  "pending",
  "checked_in",
  "checked_out",
  "expired",
  "cancelled",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "open",
  "assigned",
  "in_progress",
  "resolved",
  "closed",
]);

export const ticketPriorityEnum = pgEnum("ticket_priority", [
  "low",
  "medium",
  "high",
  "urgent",
]);

export const ticketCategoryEnum = pgEnum("ticket_category", [
  "plumbing",
  "electrical",
  "roads",
  "landscaping",
  "security",
  "cleaning",
  "other",
]);

export const announcementPriorityEnum = pgEnum("announcement_priority", [
  "info",
  "warning",
  "urgent",
]);

export const emergencyTypeEnum = pgEnum("emergency_type", [
  "medical",
  "fire",
  "security",
  "accident",
  "other",
]);

export const emergencyStatusEnum = pgEnum("emergency_status", [
  "active",
  "responding",
  "resolved",
]);

export const bookingStatusEnum = pgEnum("booking_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
  "completed",
]);

export const subscriptionTierEnum = pgEnum("subscription_tier", [
  "starter",
  "growth",
  "enterprise",
]);

export const fundraisingStatusEnum = pgEnum("fundraising_status", [
  "active",
  "completed",
  "cancelled",
]);

// ─── Core Tables ──────────────────────────────────────────────────────────────

export const estates = pgTable(
  "estates",
  {
    id: text("id").primaryKey(),
    name: varchar("name", { length: 150 }).notNull(),
    location: varchar("location", { length: 200 }).notNull(),
    adminId: text("admin_id"),
    subscriptionTier: subscriptionTierEnum("subscription_tier")
      .notNull()
      .default("starter"),
    totalUnits: integer("total_units").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    adminIdIdx: index("estates_admin_id_idx").on(t.adminId),
  }),
);

export const users = pgTable(
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
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("users_estate_id_idx").on(t.estateId),
    roleIdx: index("users_role_idx").on(t.role),
  }),
);

// Lucia v3 session table
export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", {
      withTimezone: true,
      mode: "date",
    }).notNull(),
  },
  (t) => ({
    userIdIdx: index("sessions_user_id_idx").on(t.userId),
  }),
);

// ─── Visitor Management ───────────────────────────────────────────────────────

export const visitors = pgTable(
  "visitors",
  {
    id: text("id").primaryKey(),
    residentId: text("resident_id")
      .notNull()
      .references(() => users.id),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
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
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    residentIdIdx: index("visitors_resident_id_idx").on(t.residentId),
    estateIdIdx: index("visitors_estate_id_idx").on(t.estateId),
    statusIdx: index("visitors_status_idx").on(t.status),
    createdAtIdx: index("visitors_created_at_idx").on(t.createdAt),
  }),
);

// ─── Maintenance Ticketing ────────────────────────────────────────────────────

export const maintenanceTickets = pgTable(
  "maintenance_tickets",
  {
    id: text("id").primaryKey(),
    residentId: text("resident_id")
      .notNull()
      .references(() => users.id),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description").notNull(),
    category: ticketCategoryEnum("category").notNull(),
    priority: ticketPriorityEnum("priority").notNull().default("medium"),
    status: ticketStatusEnum("status").notNull().default("open"),
    assignedToId: text("assigned_to_id").references(() => users.id),
    photoUrls: jsonb("photo_urls").$type<string[]>().default([]),
    adminNotes: text("admin_notes"),
    resolvedAt: timestamp("resolved_at"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    residentIdIdx: index("tickets_resident_id_idx").on(t.residentId),
    estateIdIdx: index("tickets_estate_id_idx").on(t.estateId),
    statusIdx: index("tickets_status_idx").on(t.status),
    priorityIdx: index("tickets_priority_idx").on(t.priority),
    createdAtIdx: index("tickets_created_at_idx").on(t.createdAt),
  }),
);

export const ticketComments = pgTable(
  "ticket_comments",
  {
    id: text("id").primaryKey(),
    ticketId: text("ticket_id")
      .notNull()
      .references(() => maintenanceTickets.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    ticketIdIdx: index("ticket_comments_ticket_id_idx").on(t.ticketId),
  }),
);

// ─── Payments & Fundraising ───────────────────────────────────────────────────

export const fundraisingCampaigns = pgTable(
  "fundraising_campaigns",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    goalAmount: decimal("goal_amount", { precision: 12, scale: 2 }).notNull(),
    currentAmount: decimal("current_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    deadline: timestamp("deadline"),
    status: fundraisingStatusEnum("status").notNull().default("active"),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("campaigns_estate_id_idx").on(t.estateId),
  }),
);

export const donations = pgTable(
  "donations",
  {
    id: text("id").primaryKey(),
    campaignId: text("campaign_id")
      .notNull()
      .references(() => fundraisingCampaigns.id),
    donorId: text("donor_id")
      .notNull()
      .references(() => users.id),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    mpesaRef: varchar("mpesa_ref", { length: 50 }),
    anonymous: boolean("anonymous").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    campaignIdIdx: index("donations_campaign_id_idx").on(t.campaignId),
    donorIdIdx: index("donations_donor_id_idx").on(t.donorId),
  }),
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    mpesaRef: varchar("mpesa_ref", { length: 50 }),
    phoneUsed: varchar("phone_used", { length: 20 }),
    type: varchar("type", { length: 50 }).notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    checkoutRequestId: text("checkout_request_id"),
    description: text("description"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("payments_user_id_idx").on(t.userId),
    estateIdIdx: index("payments_estate_id_idx").on(t.estateId),
  }),
);

// ─── Announcements & Communication ───────────────────────────────────────────

export const announcements = pgTable(
  "announcements",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    priority: announcementPriorityEnum("priority").notNull().default("info"),
    smsSent: boolean("sms_sent").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("announcements_estate_id_idx").on(t.estateId),
    createdAtIdx: index("announcements_created_at_idx").on(t.createdAt),
  }),
);

export const documents = pgTable(
  "documents",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    uploadedById: text("uploaded_by_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    fileUrl: text("file_url").notNull(),
    fileType: varchar("file_type", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("documents_estate_id_idx").on(t.estateId),
  }),
);

// ─── Events & Calendar ────────────────────────────────────────────────────────

export const events = pgTable(
  "events",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    location: varchar("location", { length: 200 }),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    recurring: boolean("recurring").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("events_estate_id_idx").on(t.estateId),
    startTimeIdx: index("events_start_time_idx").on(t.startTime),
  }),
);

export const eventRsvps = pgTable(
  "event_rsvps",
  {
    id: text("id").primaryKey(),
    eventId: text("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    attending: boolean("attending").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    eventIdIdx: index("event_rsvps_event_id_idx").on(t.eventId),
  }),
);

// ─── Emergency ────────────────────────────────────────────────────────────────

export const emergencyAlerts = pgTable(
  "emergency_alerts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    type: emergencyTypeEnum("type").notNull(),
    description: text("description"),
    locationLat: decimal("location_lat", { precision: 10, scale: 7 }),
    locationLng: decimal("location_lng", { precision: 10, scale: 7 }),
    status: emergencyStatusEnum("status").notNull().default("active"),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("emergency_estate_id_idx").on(t.estateId),
    statusIdx: index("emergency_status_idx").on(t.status),
    createdAtIdx: index("emergency_created_at_idx").on(t.createdAt),
  }),
);

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 200 }).notNull(),
    body: text("body").notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    read: boolean("read").notNull().default(false),
    linkTo: text("link_to"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdIdx: index("notifications_user_id_idx").on(t.userId),
    readIdx: index("notifications_read_idx").on(t.read),
    createdAtIdx: index("notifications_created_at_idx").on(t.createdAt),
  }),
);

// ─── Marketplace ──────────────────────────────────────────────────────────────

export const serviceProviders = pgTable(
  "service_providers",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    userId: text("user_id").references(() => users.id),
    name: varchar("name", { length: 100 }).notNull(),
    category: varchar("category", { length: 50 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    description: text("description"),
    rating: decimal("rating", { precision: 3, scale: 2 }).default("0"),
    ratingCount: integer("rating_count").notNull().default(0),
    verified: boolean("verified").notNull().default(false),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("providers_estate_id_idx").on(t.estateId),
    categoryIdx: index("providers_category_idx").on(t.category),
  }),
);

// ─── Facility Bookings ────────────────────────────────────────────────────────

export const facilities = pgTable(
  "facilities",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    maxBookingHours: integer("max_booking_hours").notNull().default(4),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("facilities_estate_id_idx").on(t.estateId),
  }),
);

export const bookings = pgTable(
  "bookings",
  {
    id: text("id").primaryKey(),
    facilityId: text("facility_id")
      .notNull()
      .references(() => facilities.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    startTime: timestamp("start_time").notNull(),
    endTime: timestamp("end_time").notNull(),
    status: bookingStatusEnum("status").notNull().default("pending"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    facilityIdIdx: index("bookings_facility_id_idx").on(t.facilityId),
    userIdIdx: index("bookings_user_id_idx").on(t.userId),
    startTimeIdx: index("bookings_start_time_idx").on(t.startTime),
  }),
);

// ─── Governance & Voting ──────────────────────────────────────────────────────

export const polls = pgTable(
  "polls",
  {
    id: text("id").primaryKey(),
    estateId: text("estate_id")
      .notNull()
      .references(() => estates.id),
    createdById: text("created_by_id")
      .notNull()
      .references(() => users.id),
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    anonymous: boolean("anonymous").notNull().default(false),
    closesAt: timestamp("closes_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("polls_estate_id_idx").on(t.estateId),
  }),
);

export const pollOptions = pgTable(
  "poll_options",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    label: varchar("label", { length: 200 }).notNull(),
    voteCount: integer("vote_count").notNull().default(0),
  },
  (t) => ({
    pollIdIdx: index("poll_options_poll_id_idx").on(t.pollId),
  }),
);

export const votes = pgTable(
  "votes",
  {
    id: text("id").primaryKey(),
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id),
    optionId: text("option_id")
      .notNull()
      .references(() => pollOptions.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    pollIdIdx: index("votes_poll_id_idx").on(t.pollId),
    userIdIdx: index("votes_user_id_idx").on(t.userId),
  }),
);

// ─── Parcels / Gate Delivery Tracking ────────────────────────────────────────

export const parcelStatusEnum = pgEnum("parcel_status", [
  "expected",
  "at_gate",
  "collected",
  "returned",
]);

export const parcels = pgTable(
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
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("parcels_estate_id_idx").on(t.estateId),
    residentIdIdx: index("parcels_resident_id_idx").on(t.residentId),
    statusIdx: index("parcels_status_idx").on(t.status),
  }),
);

// ─── Estate Classifieds / Noticeboard ────────────────────────────────────────

export const classifiedCategoryEnum = pgEnum("classified_category", [
  "sell",
  "buy",
  "give",
  "service",
]);

export const classifiedStatusEnum = pgEnum("classified_status", [
  "active",
  "sold",
  "closed",
]);

export const classifieds = pgTable(
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
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    estateIdIdx: index("classifieds_estate_id_idx").on(t.estateId),
    categoryIdx: index("classifieds_category_idx").on(t.category),
    statusIdx: index("classifieds_status_idx").on(t.status),
    createdAtIdx: index("classifieds_created_at_idx").on(t.createdAt),
  }),
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const parcelsRelations = relations(parcels, ({ one }) => ({
  resident: one(users, { fields: [parcels.residentId], references: [users.id] }),
  receivedBy: one(users, { fields: [parcels.receivedById], references: [users.id] }),
  estate: one(estates, { fields: [parcels.estateId], references: [estates.id] }),
}));

export const classifiedsRelations = relations(classifieds, ({ one }) => ({
  user: one(users, { fields: [classifieds.userId], references: [users.id] }),
  estate: one(estates, { fields: [classifieds.estateId], references: [estates.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  estate: one(estates, { fields: [users.estateId], references: [estates.id] }),
  sessions: many(sessions),
  visitors: many(visitors),
  tickets: many(maintenanceTickets),
  notifications: many(notifications),
}));

export const estatesRelations = relations(estates, ({ many }) => ({
  users: many(users),
  visitors: many(visitors),
  tickets: many(maintenanceTickets),
  announcements: many(announcements),
  events: many(events),
  emergencyAlerts: many(emergencyAlerts),
  facilities: many(facilities),
  polls: many(polls),
}));

export const visitorsRelations = relations(visitors, ({ one }) => ({
  resident: one(users, {
    fields: [visitors.residentId],
    references: [users.id],
  }),
  estate: one(estates, {
    fields: [visitors.estateId],
    references: [estates.id],
  }),
  checkedInBy: one(users, {
    fields: [visitors.checkedInById],
    references: [users.id],
  }),
}));

export const ticketsRelations = relations(
  maintenanceTickets,
  ({ one, many }) => ({
    resident: one(users, {
      fields: [maintenanceTickets.residentId],
      references: [users.id],
    }),
    assignedTo: one(users, {
      fields: [maintenanceTickets.assignedToId],
      references: [users.id],
    }),
    comments: many(ticketComments),
  }),
);

export const ticketCommentsRelations = relations(ticketComments, ({ one }) => ({
  ticket: one(maintenanceTickets, {
    fields: [ticketComments.ticketId],
    references: [maintenanceTickets.id],
  }),
  author: one(users, {
    fields: [ticketComments.authorId],
    references: [users.id],
  }),
}));
