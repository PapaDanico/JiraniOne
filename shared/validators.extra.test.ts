import { describe, it, expect } from "vitest";
import {
  createVisitorSchema,
  createTicketSchema,
  updateTicketSchema,
  addCommentSchema,
  createAnnouncementSchema,
  createEventSchema,
  createBookingSchema,
  createClassifiedSchema,
  createCarpoolOfferSchema,
  emergencyAlertSchema,
  createServiceProviderSchema,
  createServiceSchema,
  createFacilitySchema,
  chamaContributeSchema,
  createCampaignSchema,
  updateHarambeeSchema,
  updateParcelSchema,
  claimSetupSchema,
  adminUpdateUserSchema,
  updateProfileSchema,
} from "./validators.js";

// These cover the half of the Zod surface that wasn't already pinned in
// validators.test.ts. Anything that gates user input → DB belongs here.

describe("createVisitorSchema", () => {
  it("normalises the visitor phone via kenyanPhone", () => {
    const r = createVisitorSchema.parse({
      name: "Otieno",
      phone: "0712345678",
    });
    expect(r.phone).toBe("+254712345678");
  });

  it("rejects a too-short name", () => {
    expect(() =>
      createVisitorSchema.parse({ name: "X", phone: "0712345678" }),
    ).toThrow();
  });

  it("accepts an ISO expectedAt and normalises to ISO string", () => {
    const r = createVisitorSchema.parse({
      name: "Otieno",
      phone: "0712345678",
      expectedAt: "2026-06-01T10:00",
    });
    expect(typeof r.expectedAt).toBe("string");
    expect(r.expectedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("createTicketSchema", () => {
  it("requires a 5+ char title", () => {
    expect(() =>
      createTicketSchema.parse({
        title: "tap",
        description: "leaking tap in kitchen",
        category: "plumbing",
      }),
    ).toThrow();
  });

  it("requires a 10+ char description", () => {
    expect(() =>
      createTicketSchema.parse({
        title: "Tap leak",
        description: "leak",
        category: "plumbing",
      }),
    ).toThrow();
  });

  it("rejects unknown category", () => {
    expect(() =>
      createTicketSchema.parse({
        title: "Leaky tap",
        description: "leaking again, please come",
        category: "smell" as never,
      }),
    ).toThrow();
  });

  it("defaults priority to medium when omitted", () => {
    const r = createTicketSchema.parse({
      title: "Leaky tap",
      description: "leaking again, please come",
      category: "plumbing",
    });
    expect(r.priority).toBe("medium");
  });
});

describe("updateTicketSchema", () => {
  it("rejects unknown status (only the documented status flow is permitted)", () => {
    expect(() =>
      updateTicketSchema.parse({ status: "vanished" as never }),
    ).toThrow();
  });

  it("allows nullable assignedToId (unassigning)", () => {
    expect(updateTicketSchema.parse({ assignedToId: null })).toEqual({
      assignedToId: null,
    });
  });
});

describe("addCommentSchema", () => {
  it("rejects empty body", () => {
    expect(() => addCommentSchema.parse({ body: "" })).toThrow();
  });

  it("caps body length at 2000", () => {
    expect(() =>
      addCommentSchema.parse({ body: "x".repeat(2001) }),
    ).toThrow();
  });
});

describe("createAnnouncementSchema", () => {
  it("requires title and a 10+ char body", () => {
    expect(() =>
      createAnnouncementSchema.parse({ title: "Hi", body: "short" }),
    ).toThrow();
  });

  it("defaults priority to info and sendSms to false", () => {
    const r = createAnnouncementSchema.parse({
      title: "Water shutdown notice",
      body: "Water will be off from 9am to 1pm tomorrow.",
    });
    expect(r.priority).toBe("info");
    expect(r.sendSms).toBe(false);
  });

  it("rejects unknown priority", () => {
    expect(() =>
      createAnnouncementSchema.parse({
        title: "x",
        body: "x".repeat(20),
        priority: "panic" as never,
      }),
    ).toThrow();
  });
});

describe("createEventSchema", () => {
  it("normalises start/end times to ISO strings", () => {
    const r = createEventSchema.parse({
      title: "AGM",
      startTime: "2026-06-01T18:00",
      endTime: "2026-06-01T20:00",
    });
    expect(r.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(r.endTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("rejects an unparseable date", () => {
    expect(() =>
      createEventSchema.parse({
        title: "AGM",
        startTime: "not-a-date",
        endTime: "2026-06-01T20:00",
      }),
    ).toThrow();
  });

  // KNOWN GAP: the schema does not assert endTime > startTime. Pin the
  // current behaviour so anyone tightening it has to update this test on
  // purpose. (Backed up by route-level checks would be wiser longer-term.)
  it("does NOT currently enforce end > start (regression pin — fix in schema)", () => {
    const r = createEventSchema.parse({
      title: "AGM",
      startTime: "2026-06-01T20:00",
      endTime: "2026-06-01T10:00",
    });
    expect(new Date(r.endTime).getTime()).toBeLessThan(
      new Date(r.startTime).getTime(),
    );
  });
});

describe("createBookingSchema", () => {
  it("requires facilityId, start and end", () => {
    expect(() =>
      createBookingSchema.parse({
        startTime: "2026-06-01T10:00",
        endTime: "2026-06-01T11:00",
      } as never),
    ).toThrow();
  });

  it("normalises times to ISO strings", () => {
    const r = createBookingSchema.parse({
      facilityId: "f1",
      startTime: "2026-06-01T10:00",
      endTime: "2026-06-01T12:00",
    });
    expect(r.startTime).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe("createClassifiedSchema", () => {
  it("rejects negative prices", () => {
    expect(() =>
      createClassifiedSchema.parse({
        title: "Used bike",
        description: "Sturdy mountain bike in good condition.",
        price: -1,
      }),
    ).toThrow();
  });

  it("rejects malformed imageUrl strings", () => {
    expect(() =>
      createClassifiedSchema.parse({
        title: "Used bike",
        description: "Sturdy mountain bike in good condition.",
        imageUrl: "not a url at all" as never,
      }),
    ).toThrow();
  });

  // KNOWN GAP: z.string().url() accepts javascript: and data: URIs because
  // they are technically parseable. The classifieds frontend should reject
  // these before render, but tightening this validator to http(s) only
  // would be a defence-in-depth win. Regression-pinned here.
  it("currently accepts javascript: scheme in imageUrl (schema gap to fix)", () => {
    const r = createClassifiedSchema.parse({
      title: "Used bike",
      description: "Sturdy mountain bike in good condition.",
      imageUrl: "javascript:alert(1)",
    });
    expect(r.imageUrl).toBe("javascript:alert(1)");
  });

  it("defaults category to sell", () => {
    const r = createClassifiedSchema.parse({
      title: "Used bike",
      description: "Sturdy mountain bike in good condition.",
    });
    expect(r.category).toBe("sell");
  });

  it("rejects unknown category", () => {
    expect(() =>
      createClassifiedSchema.parse({
        title: "x",
        description: "x".repeat(20),
        category: "trade" as never,
      }),
    ).toThrow();
  });
});

describe("createCarpoolOfferSchema", () => {
  it("rejects 0 seatsTotal", () => {
    expect(() =>
      createCarpoolOfferSchema.parse({
        origin: "Westlands",
        destination: "CBD",
        departureTime: "2026-06-01T07:30",
        seatsTotal: 0,
      }),
    ).toThrow();
  });

  it("rejects non-integer fare", () => {
    expect(() =>
      createCarpoolOfferSchema.parse({
        origin: "Westlands",
        destination: "CBD",
        departureTime: "2026-06-01T07:30",
        seatsTotal: 3,
        fare: 99.5,
      }),
    ).toThrow();
  });
});

describe("emergencyAlertSchema", () => {
  it("rejects unknown type (Kenya emergency taxonomy is fixed)", () => {
    expect(() =>
      emergencyAlertSchema.parse({ type: "robbery" as never }),
    ).toThrow();
  });

  it("accepts minimal medical alert", () => {
    expect(emergencyAlertSchema.parse({ type: "medical" }).type).toBe("medical");
  });

  it("caps description at 500 chars", () => {
    expect(() =>
      emergencyAlertSchema.parse({
        type: "fire",
        description: "x".repeat(501),
      }),
    ).toThrow();
  });
});

describe("createServiceProviderSchema and createServiceSchema", () => {
  it("normalises Kenyan phone", () => {
    expect(
      createServiceProviderSchema.parse({
        name: "Joseph Plumbing",
        category: "plumbing",
        phone: "0712345678",
      }).phone,
    ).toBe("+254712345678");

    expect(
      createServiceSchema.parse({
        name: "Joseph Plumbing",
        category: "plumbing",
        phone: "254712345678",
      }).phone,
    ).toBe("+254712345678");
  });
});

describe("createFacilitySchema", () => {
  it("defaults requiresApproval=false and maxBookingHours=4", () => {
    const r = createFacilitySchema.parse({ name: "Clubhouse" });
    expect(r.requiresApproval).toBe(false);
    expect(r.maxBookingHours).toBe(4);
  });

  it("rejects maxBookingHours > 24", () => {
    expect(() =>
      createFacilitySchema.parse({ name: "Clubhouse", maxBookingHours: 25 }),
    ).toThrow();
  });
});

describe("chamaContributeSchema", () => {
  it("requires periodLabel + integer amount", () => {
    expect(() =>
      chamaContributeSchema.parse({ amount: 100.5, periodLabel: "2026-05" }),
    ).toThrow();
    expect(() =>
      chamaContributeSchema.parse({ amount: 100, periodLabel: "" }),
    ).toThrow();
  });
});

describe("createCampaignSchema", () => {
  it("rejects goalAmount below KES 100", () => {
    expect(() =>
      createCampaignSchema.parse({ title: "Roof", goalAmount: 50 }),
    ).toThrow();
  });

  it("caps goalAmount at 100 million", () => {
    expect(() =>
      createCampaignSchema.parse({ title: "Roof", goalAmount: 100_000_001 }),
    ).toThrow();
  });
});

describe("updateHarambeeSchema", () => {
  it("allows partial updates (any subset of optional fields)", () => {
    // The nullable deadline transform yields { deadline: null } for an
    // empty input. That is intentional — the route layer can pass the
    // value straight to a nullable DB column without a NULL/undefined
    // dance — so we pin it here.
    expect(updateHarambeeSchema.parse({})).toEqual({ deadline: null });
    expect(updateHarambeeSchema.parse({ status: "completed" }).status).toBe(
      "completed",
    );
  });

  it("rejects unknown status", () => {
    expect(() =>
      updateHarambeeSchema.parse({ status: "frozen" as never }),
    ).toThrow();
  });
});

describe("updateParcelSchema", () => {
  it("accepts only the documented status values", () => {
    expect(updateParcelSchema.parse({ status: "at_gate" }).status).toBe(
      "at_gate",
    );
    expect(() =>
      updateParcelSchema.parse({ status: "stolen" as never }),
    ).toThrow();
  });
});

describe("claimSetupSchema", () => {
  it("requires token length 32-128", () => {
    expect(() =>
      claimSetupSchema.parse({ token: "short", password: "secret123" }),
    ).toThrow();
    expect(() =>
      claimSetupSchema.parse({ token: "x".repeat(129), password: "secret123" }),
    ).toThrow();
  });

  it("enforces strong password", () => {
    expect(() =>
      claimSetupSchema.parse({
        token: "a".repeat(64),
        password: "alllettersok",
      }),
    ).toThrow();
  });
});

describe("adminUpdateUserSchema / updateProfileSchema", () => {
  it("admin can update role, but only to a permitted enum value", () => {
    expect(
      adminUpdateUserSchema.parse({ role: "security" }).role,
    ).toBe("security");
    expect(() =>
      adminUpdateUserSchema.parse({ role: "superadmin" as never }),
    ).toThrow();
  });

  it("admin can null out unitNumber but cannot null name", () => {
    expect(
      adminUpdateUserSchema.parse({ unitNumber: null }).unitNumber,
    ).toBeNull();
    // updateProfileSchema requires a name string — null is not allowed.
    expect(() =>
      updateProfileSchema.parse({ name: null as never }),
    ).toThrow();
  });
});
