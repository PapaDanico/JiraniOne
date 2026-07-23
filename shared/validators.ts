import { z } from "zod";

// Accepts browser datetime-local format ("2024-05-08T10:00"), date-only
// ("2024-05-08"), or a full ISO 8601 string. All are normalised to a full
// ISO string ("2024-05-08T07:00:00.000Z") so downstream code sees one format.
// This is the correct fix for <input type="datetime-local"> + Zod: the browser
// never emits the timezone suffix that z.string().datetime() requires.
const localDatetime = z
  .string()
  .min(1, "Date/time is required")
  .refine((v) => !isNaN(Date.parse(v)), { message: "Invalid date/time" })
  .transform((v) => new Date(v).toISOString());

const localDatetimeOpt = z
  .string()
  .optional()
  .refine((v) => v == null || v === "" || !isNaN(Date.parse(v)), {
    message: "Invalid date/time",
  })
  .transform((v) => (!v ? undefined : new Date(v).toISOString()));

const localDatetimeNullOpt = z
  .string()
  .nullable()
  .optional()
  .refine(
    (v) => v == null || v === "" || !isNaN(Date.parse(v)),
    { message: "Invalid date/time" },
  )
  .transform((v) => (v == null || v === "" ? null : new Date(v).toISOString()));

// Phone number: accepts 07XXXXXXXX, +2547XXXXXXXX, 2547XXXXXXXX
// Normalizes to +254XXXXXXXXX
export const kenyanPhone = z
  .string()
  .min(9)
  .max(15)
  .transform((val) => {
    const digits = val.replace(/\D/g, "");
    if (digits.startsWith("254") && digits.length === 12) return `+${digits}`;
    if (digits.startsWith("0") && digits.length === 10)
      return `+254${digits.slice(1)}`;
    if (digits.length === 9) return `+254${digits}`;
    return val;
  })
  .refine((val) => /^\+254[17]\d{8}$/.test(val), {
    message: "Enter a valid Kenyan phone number (e.g. 0722123456)",
  });

export const loginSchema = z.object({
  phone: kenyanPhone,
  password: z.string().min(6, "Password must be at least 6 characters"),
});

// Public self-registration — deliberately has NO `role` field. Every account
// created here is a resident; admin/security/vendor accounts are only ever
// created via the authenticated, admin-only POST /api/users invite flow.
// (A `role` field here previously let any unauthenticated caller register
// themselves as "admin" for any estate by POSTing directly to the API.)
export const registerSchema = z.object({
  phone: kenyanPhone,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128)
    .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), {
      message: "Password must include at least one letter and one digit",
    }),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  estateId: z.string().optional(),
  unitNumber: z.string().max(20).optional(),
  consent: z.boolean().refine((v) => v === true, {
    message: "You must agree to the Privacy Policy and Terms",
  }),
});

export const forgotPasswordSchema = z.object({
  phone: kenyanPhone,
});

// Password complexity: at least 8 chars, at least one letter and one digit.
// Banned-password denylist deliberately omitted for now — extend later if
// needed.
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long")
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), {
    message: "Password must include at least one letter and one digit",
  });

export const resetPasswordSchema = z.object({
  phone: kenyanPhone,
  otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code from SMS"),
  password: strongPassword,
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Current password required"),
  newPassword: strongPassword,
});

export const adminCreateUserSchema = z.object({
  phone: kenyanPhone,
  name: z.string().min(2).max(100),
  role: z.enum(["resident", "admin", "security", "vendor"]).default("resident"),
  unitNumber: z.string().max(20).optional(),
});

export const adminUpdateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  unitNumber: z.string().max(20).nullable().optional(),
  role: z.enum(["resident", "admin", "security", "vendor"]).optional(),
  reactivate: z.boolean().optional(),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(100),
});

export const setEstateSchema = z.object({
  estateId: z.string().min(1, "Select your estate"),
  unitNumber: z.string().max(20).optional(),
});

export const createVisitorSchema = z.object({
  name: z.string().min(2).max(100),
  phone: kenyanPhone,
  purpose: z.string().max(200).optional(),
  expectedAt: localDatetimeOpt,
});

export const createTicketSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10),
  category: z.enum([
    "plumbing",
    "electrical",
    "roads",
    "landscaping",
    "security",
    "cleaning",
    "other",
  ]),
  priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
  // Set only by useOfflineSync.ts when replaying a queued offline draft —
  // lets the server recognize a retry of the same submission.
  clientDraftId: z.string().max(64).optional(),
});

export const updateTicketSchema = z.object({
  status: z
    .enum(["open", "assigned", "in_progress", "resolved", "closed"])
    .optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  assignedToId: z.string().nullable().optional(),
  adminNotes: z.string().optional(),
});

export const addCommentSchema = z.object({
  body: z.string().min(1).max(2000),
});

export const createAnnouncementSchema = z.object({
  title: z.string().min(3).max(200),
  body: z.string().min(10),
  priority: z.enum(["info", "warning", "urgent"]).default("info"),
  sendSms: z.boolean().default(false),
});

export const createEventSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  location: z.string().max(200).optional(),
  eventType: z.enum(["agm", "cleanup", "sports", "kids", "social", "security", "other"]).optional(),
  startTime: localDatetime,
  endTime: localDatetime,
  recurring: z.boolean().default(false),
});

export const emergencyAlertSchema = z.object({
  type: z.enum(["medical", "fire", "security", "accident", "other"]),
  description: z.string().max(500).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
});

export const updateEmergencyStatusSchema = z.object({
  status: z.enum(["active", "responding", "resolved"]),
});

// M-PESA only handles whole shillings; .int() rejects decimals upstream so
// we don't quietly Math.round() at the Daraja boundary.
export const initiatePaymentSchema = z.object({
  amount: z.number().int().min(1).max(500000),
  type: z.string().min(1).max(50),
  description: z.string().max(100).optional(),
  phone: kenyanPhone.optional(),
});

export const createCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  goalAmount: z.number().int().min(100).max(100_000_000),
  deadline: localDatetimeOpt,
});

export const donateSchema = z.object({
  amount: z.number().int().min(1).max(500000),
  anonymous: z.boolean().default(false),
});

export const createHarambeeSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().max(2000).optional(),
  goalAmount: z.number().int().min(1).max(100_000_000),
  deadline: localDatetimeOpt,
});

export const updateHarambeeSchema = z.object({
  status: z.enum(["active", "completed", "cancelled"]).optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  goalAmount: z.number().int().min(1).max(100_000_000).optional(),
  deadline: localDatetimeNullOpt,
});

export const createChamaSchema = z.object({
  name: z.string().min(2).max(150),
  description: z.string().max(2000).optional(),
  contributionAmount: z.number().int().min(1).max(10_000_000),
  frequency: z.enum(["weekly", "monthly"]).default("monthly"),
});

export const chamaContributeSchema = z.object({
  amount: z.number().int().min(1).max(500000),
  periodLabel: z.string().min(1).max(20),
});

export const castVoteSchema = z.object({
  optionId: z.string().min(1).max(64),
});

export const createServiceProviderSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  phone: kenyanPhone,
  description: z.string().max(500).optional(),
  // Structured listing facts — validated against shared/marketplace.ts
  // option shapes (values themselves stay open strings so the option
  // lists can evolve without a lockstep validator change).
  experienceYears: z.number().int().min(0).max(60).optional(),
  rateCard: z.string().max(50).optional(),
  availability: z.enum(["everyday", "weekdays", "weekends", "on_call"]).optional(),
  specializations: z.array(z.string().min(1).max(40)).max(8).optional(),
});

export const createReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional(),
});

export const createParcelSchema = z.object({
  description: z.string().min(1).max(200),
  trackingRef: z.string().max(100).optional(),
  sender: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const updateParcelSchema = z.object({
  status: z.enum(["expected", "at_gate", "collected", "returned"]).optional(),
  notes: z.string().max(500).optional(),
});

export const createClassifiedSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(10).max(5000),
  price: z.number().min(0).max(10_000_000).optional(),
  category: z.enum(["sell", "buy", "give", "service"]).default("sell"),
  condition: z.enum(["new", "like_new", "used"]).optional(),
  contactPhone: kenyanPhone.optional(),
  imageUrl: z.string().url().max(500).optional(),
});

export const updateClassifiedSchema = z.object({
  status: z.enum(["active", "sold", "closed"]).optional(),
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(10).max(5000).optional(),
  price: z.number().min(0).max(10_000_000).nullable().optional(),
});

export const createCarpoolOfferSchema = z.object({
  origin: z.string().min(2).max(200),
  destination: z.string().min(2).max(200),
  departureTime: localDatetime,
  seatsTotal: z.number().int().min(1).max(20),
  fare: z.number().int().min(0).max(100_000).optional(),
  notes: z.string().max(500).optional(),
});

export const eventRsvpSchema = z.object({
  attending: z.boolean(),
});

export const createFacilitySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  requiresApproval: z.boolean().default(false),
  maxBookingHours: z.number().int().min(1).max(24).default(4),
});

export const updateFacilitySchema = createFacilitySchema.partial();

export const createPollSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  closesAt: localDatetimeOpt,
  anonymous: z.boolean().default(false),
});

export const createBookingSchema = z.object({
  facilityId: z.string(),
  startTime: localDatetime,
  endTime: localDatetime,
  notes: z.string().max(500).optional(),
});

export const createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  phone: kenyanPhone,
  description: z.string().max(500).optional(),
});

// Setup-link: resident claims their account via a one-time token the admin shared.
export const claimSetupSchema = z.object({
  token: z.string().min(32).max(128),
  password: strongPassword,
});

export const createDocumentSchema = z.object({
  title: z.string().min(3).max(200),
});

export const createLeadSchema = z.object({
  estateName: z.string().min(2).max(150),
  contactName: z.string().min(2).max(100),
  phone: kenyanPhone,
  // Blank optional text fields arrive as "" from untouched form inputs —
  // normalize to undefined here so every caller (not just this route)
  // gets a clean NULL in storage instead of a stored empty string.
  email: z.string().email().max(200).optional().or(z.literal("")).transform((v) => v || undefined),
  unitsCount: z.number().int().positive().max(100000).optional(),
  contactRole: z.enum(["management_company", "committee", "developer", "resident", "other"]).optional(),
  unitsRange: z.string().max(20).optional().transform((v) => v || undefined),
  message: z.string().max(1000).optional().transform((v) => v || undefined),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CreateVisitorInput = z.infer<typeof createVisitorSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type EmergencyAlertInput = z.infer<typeof emergencyAlertSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;

// ─── Estates (self-serve creation + admin settings) ───────────────────────────

export const createEstateSchema = z.object({
  name: z.string().min(3, "Estate name must be at least 3 characters").max(150),
  location: z.string().min(2).max(200),
  totalUnits: z.number().int().min(1).max(10000).optional(),
});

export const updateEstateSchema = z.object({
  name: z.string().min(3).max(150).optional(),
  location: z.string().min(2).max(200).optional(),
  totalUnits: z.number().int().min(1).max(10000).nullable().optional(),
  securityPhone: kenyanPhone.nullable().optional(),
  lat: z.number().min(-5).max(5).nullable().optional(),
  lng: z.number().min(33).max(42).nullable().optional(),
});
