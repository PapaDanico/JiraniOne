import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { originAllowed } from "./wsOrigin.js";

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

describe("originAllowed", () => {
  it("returns true in non-production regardless of origin (sandbox WS clients vary)", () => {
    process.env.NODE_ENV = "development";
    expect(originAllowed({ headers: { origin: "http://localhost:3000" } })).toBe(true);
    expect(originAllowed({ headers: { origin: "https://attacker.example" } })).toBe(true);
    expect(originAllowed({ headers: {} })).toBe(true);
  });

  it("rejects WS handshakes in production with no Origin header", () => {
    process.env.NODE_ENV = "production";
    expect(originAllowed({ headers: {} })).toBe(false);
  });

  it("allows the canonical production origins", () => {
    process.env.NODE_ENV = "production";
    expect(
      originAllowed({ headers: { origin: "https://www.jiranihub.co.ke" } }),
    ).toBe(true);
    expect(
      originAllowed({ headers: { origin: "https://jiranihub.co.ke" } }),
    ).toBe(true);
  });

  it("rejects unknown origins in production", () => {
    process.env.NODE_ENV = "production";
    expect(
      originAllowed({ headers: { origin: "https://attacker.example" } }),
    ).toBe(false);
    expect(
      originAllowed({
        headers: { origin: "https://www.jiranihub.co.ke.attacker.example" },
      }),
    ).toBe(false);
  });

  it("honours CLIENT_URL and RENDER_EXTERNAL_URL overrides", () => {
    process.env.NODE_ENV = "production";
    process.env.CLIENT_URL = "https://staging.jiranihub.co.ke";
    process.env.RENDER_EXTERNAL_URL = "https://jiranihub.onrender.com";
    expect(
      originAllowed({ headers: { origin: "https://staging.jiranihub.co.ke" } }),
    ).toBe(true);
    expect(
      originAllowed({ headers: { origin: "https://jiranihub.onrender.com" } }),
    ).toBe(true);
  });

  it("does not match a prefix-only origin (defence against substring bugs)", () => {
    process.env.NODE_ENV = "production";
    expect(
      originAllowed({ headers: { origin: "https://www.jiranihub.co" } }),
    ).toBe(false);
  });
});
