import { describe, it, expect } from "vitest";
import {
  kenyanPhone,
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  initiatePaymentSchema,
  donateSchema,
  createHarambeeSchema,
  createChamaSchema,
  createPollSchema,
} from "./validators.js";

// These tests pin the security-critical input validation contract. If any of
// them break, look hard at whether the change is intentional — these
// schemas are the boundary between hostile callers and the database.

describe("kenyanPhone", () => {
  it("accepts and normalizes 0722... format", () => {
    expect(kenyanPhone.parse("0722123456")).toBe("+254722123456");
  });

  it("accepts +254... format", () => {
    expect(kenyanPhone.parse("+254722123456")).toBe("+254722123456");
  });

  it("accepts 254... format", () => {
    expect(kenyanPhone.parse("254722123456")).toBe("+254722123456");
  });

  it("accepts whitespace, normalizes (punctuation that fits in max-15 length)", () => {
    expect(kenyanPhone.parse("0722 123 456")).toBe("+254722123456");
    // The schema enforces max length 15 before transform, so 16-char inputs
    // like "+254-722-123-456" are correctly rejected.
  });

  it("accepts Safaricom (07XX) and Airtel (01XX) prefixes", () => {
    expect(kenyanPhone.parse("0712345678")).toBe("+254712345678");
    expect(kenyanPhone.parse("0112345678")).toBe("+254112345678");
  });

  it("rejects non-Kenyan numbers", () => {
    expect(() => kenyanPhone.parse("+447911123456")).toThrow();
    expect(() => kenyanPhone.parse("+15551234567")).toThrow();
  });

  it("rejects numbers that are too short or too long", () => {
    expect(() => kenyanPhone.parse("0722")).toThrow();
    expect(() => kenyanPhone.parse("07221234567890")).toThrow();
  });
});

describe("loginSchema", () => {
  it("accepts valid login", () => {
    const r = loginSchema.parse({ phone: "0722123456", password: "password1" });
    expect(r.phone).toBe("+254722123456");
  });

  it("rejects short password", () => {
    expect(() =>
      loginSchema.parse({ phone: "0722123456", password: "abc" }),
    ).toThrow();
  });
});

describe("registerSchema", () => {
  it("requires letter + digit in password", () => {
    expect(() =>
      registerSchema.parse({
        phone: "0722123456",
        password: "abcdefgh", // letters only
        name: "Jane Mwangi",
      }),
    ).toThrow();
    expect(() =>
      registerSchema.parse({
        phone: "0722123456",
        password: "12345678", // digits only
        name: "Jane Mwangi",
      }),
    ).toThrow();
    expect(
      registerSchema.parse({
        phone: "0722123456",
        password: "secret123",
        name: "Jane Mwangi",
      }),
    ).toBeTruthy();
  });

  it("requires name >= 2 chars", () => {
    expect(() =>
      registerSchema.parse({
        phone: "0722123456",
        password: "secret123",
        name: "J",
      }),
    ).toThrow();
  });
});

describe("forgotPasswordSchema / resetPasswordSchema", () => {
  it("forgotPasswordSchema only takes phone", () => {
    expect(forgotPasswordSchema.parse({ phone: "0722123456" }).phone).toBe(
      "+254722123456",
    );
  });

  it("resetPasswordSchema requires 6-digit OTP", () => {
    expect(() =>
      resetPasswordSchema.parse({
        phone: "0722123456",
        otp: "12345", // 5 digits
        password: "secret123",
      }),
    ).toThrow();
    expect(() =>
      resetPasswordSchema.parse({
        phone: "0722123456",
        otp: "abcdef", // not digits
        password: "secret123",
      }),
    ).toThrow();
    expect(
      resetPasswordSchema.parse({
        phone: "0722123456",
        otp: "123456",
        password: "secret123",
      }),
    ).toBeTruthy();
  });

  it("resetPasswordSchema enforces complex password", () => {
    expect(() =>
      resetPasswordSchema.parse({
        phone: "0722123456",
        otp: "123456",
        password: "alllettersok",
      }),
    ).toThrow();
  });
});

describe("changePasswordSchema", () => {
  it("requires current + complex new password", () => {
    expect(() =>
      changePasswordSchema.parse({
        currentPassword: "",
        newPassword: "secret123",
      }),
    ).toThrow();
    expect(() =>
      changePasswordSchema.parse({
        currentPassword: "old",
        newPassword: "alllettersok",
      }),
    ).toThrow();
    expect(
      changePasswordSchema.parse({
        currentPassword: "old",
        newPassword: "secret123",
      }),
    ).toBeTruthy();
  });
});

describe("initiatePaymentSchema and donateSchema — money path", () => {
  it("rejects non-integer amounts (M-PESA only handles whole shillings)", () => {
    expect(() =>
      initiatePaymentSchema.parse({ amount: 10.5, type: "levy" }),
    ).toThrow();
    expect(() =>
      donateSchema.parse({ amount: 99.99, anonymous: false }),
    ).toThrow();
  });

  it("rejects negative or zero amounts", () => {
    expect(() =>
      initiatePaymentSchema.parse({ amount: 0, type: "levy" }),
    ).toThrow();
    expect(() =>
      initiatePaymentSchema.parse({ amount: -100, type: "levy" }),
    ).toThrow();
  });

  it("rejects amounts above the platform cap", () => {
    expect(() =>
      initiatePaymentSchema.parse({ amount: 500_001, type: "levy" }),
    ).toThrow();
  });

  it("accepts a valid integer amount", () => {
    expect(
      initiatePaymentSchema.parse({ amount: 1500, type: "levy" }).amount,
    ).toBe(1500);
  });
});

describe("createHarambeeSchema", () => {
  it("requires goalAmount integer", () => {
    expect(() =>
      createHarambeeSchema.parse({
        title: "Roof repair",
        goalAmount: 10.5,
      }),
    ).toThrow();
    expect(() =>
      createHarambeeSchema.parse({
        title: "Roof repair",
        goalAmount: 0,
      }),
    ).toThrow();
  });
});

describe("createChamaSchema", () => {
  it("rejects bogus frequency", () => {
    expect(() =>
      createChamaSchema.parse({
        name: "Block A Investment",
        contributionAmount: 1000,
        frequency: "daily",
      }),
    ).toThrow();
  });

  it("defaults frequency to monthly", () => {
    expect(
      createChamaSchema.parse({
        name: "Block A Investment",
        contributionAmount: 1000,
      }).frequency,
    ).toBe("monthly");
  });
});

describe("createPollSchema", () => {
  it("requires at least 2 options", () => {
    expect(() =>
      createPollSchema.parse({
        title: "Should we re-paint the gate?",
        options: ["Yes"],
      }),
    ).toThrow();
  });

  it("caps options at 10", () => {
    expect(() =>
      createPollSchema.parse({
        title: "Pick a colour",
        options: Array(11).fill("opt"),
      }),
    ).toThrow();
  });

  it("anonymous defaults to false", () => {
    expect(
      createPollSchema.parse({
        title: "Pick a colour",
        options: ["red", "green"],
      }).anonymous,
    ).toBe(false);
  });
});
