import { describe, it, expect, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";
import { originGuard } from "./originGuard.js";

const originalEnv = { ...process.env };
const ALLOWED = [
  "https://www.jiranihub.co.ke",
  "https://jiranihub.co.ke",
];

beforeEach(() => {
  process.env = { ...originalEnv };
});

afterEach(() => {
  process.env = originalEnv;
});

function makeApp() {
  const app = express();
  app.use(express.json());
  app.use(originGuard(ALLOWED));
  app.get("/api/anything", (_req, res) => {
    res.json({ ok: true });
  });
  app.post("/api/anything", (_req, res) => {
    res.json({ wrote: true });
  });
  app.post("/api/payments/mpesa/callback", (_req, res) => {
    res.json({ ResultCode: 0 });
  });
  return app;
}

describe("originGuard", () => {
  it("passes through GET requests regardless of Origin", async () => {
    process.env.NODE_ENV = "production";
    const app = makeApp();
    const res = await request(app)
      .get("/api/anything")
      .set("Origin", "https://attacker.example");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it("passes through mutating requests without an Origin header (server-to-server)", async () => {
    process.env.NODE_ENV = "production";
    const app = makeApp();
    const res = await request(app)
      .post("/api/anything")
      .send({ x: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ wrote: true });
  });

  it("rejects a mutating request from an unknown origin in production", async () => {
    process.env.NODE_ENV = "production";
    const app = makeApp();
    const res = await request(app)
      .post("/api/anything")
      .set("Origin", "https://attacker.example")
      .send({ x: 1 });
    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: "Origin not allowed" });
  });

  it("accepts an allowed origin on a mutating request", async () => {
    process.env.NODE_ENV = "production";
    const app = makeApp();
    const res = await request(app)
      .post("/api/anything")
      .set("Origin", "https://www.jiranihub.co.ke")
      .send({ x: 1 });
    expect(res.status).toBe(200);
  });

  it("allows the M-PESA callback path even from an unknown origin", async () => {
    process.env.NODE_ENV = "production";
    const app = makeApp();
    const res = await request(app)
      .post("/api/payments/mpesa/callback")
      .set("Origin", "https://api.safaricom.co.ke")
      .send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ResultCode: 0 });
  });

  it("does not gate-keep origins in non-production (eases dev)", async () => {
    process.env.NODE_ENV = "development";
    const app = makeApp();
    const res = await request(app)
      .post("/api/anything")
      .set("Origin", "https://attacker.example")
      .send({ x: 1 });
    expect(res.status).toBe(200);
  });
});
