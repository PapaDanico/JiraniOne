import { z } from "zod";

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

export const registerSchema = z.object({
  phone: kenyanPhone,
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  role: z.enum(["resident", "admin", "security", "vendor"]).default("resident"),
  estateId: z.string().optional(),
  unitNumber: z.string().max(20).optional(),
});

export const createVisitorSchema = z.object({
  name: z.string().min(2).max(100),
  phone: kenyanPhone,
  purpose: z.string().max(200).optional(),
  expectedAt: z.string().datetime().optional(),
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
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  recurring: z.boolean().default(false),
});

export const emergencyAlertSchema = z.object({
  type: z.enum(["medical", "fire", "security", "accident", "other"]),
  description: z.string().max(500).optional(),
  locationLat: z.number().optional(),
  locationLng: z.number().optional(),
});

export const initiatePaymentSchema = z.object({
  amount: z.number().min(1).max(500000),
  type: z.string().min(1).max(50),
  description: z.string().max(100).optional(),
  phone: kenyanPhone.optional(),
});

export const createCampaignSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  goalAmount: z.number().min(100),
  deadline: z.string().datetime().optional(),
});

export const createPollSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().optional(),
  options: z.array(z.string().min(1).max(200)).min(2).max(10),
  closesAt: z.string().datetime().optional(),
  anonymous: z.boolean().default(false),
});

export const createBookingSchema = z.object({
  facilityId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  notes: z.string().max(500).optional(),
});

export const createFacilitySchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().optional(),
  requiresApproval: z.boolean().default(false),
  maxBookingHours: z.number().int().min(1).max(24).default(4),
});

export const createServiceSchema = z.object({
  name: z.string().min(2).max(100),
  category: z.string().min(2).max(50),
  phone: kenyanPhone,
  description: z.string().max(500).optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type CreateVisitorInput = z.infer<typeof createVisitorSchema>;
export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type CreateAnnouncementInput = z.infer<typeof createAnnouncementSchema>;
export type EmergencyAlertInput = z.infer<typeof emergencyAlertSchema>;
