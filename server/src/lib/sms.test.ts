import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock db so sms.ts doesn't try to open a Neon connection at import.
// `db.execute(sql\`...\`)` is the only DB surface used by sms.ts; we
// fake it with a chain of resolved values that the test wires up per-case.
const dbExecuteMock = vi.fn();
vi.mock("../db.js", () => ({
  db: { execute: (...args: unknown[]) => dbExecuteMock(...args) },
}));

const originalEnv = { ...process.env };
const fetchMock = vi.fn();

beforeEach(() => {
  process.env = { ...originalEnv };
  // Default to "throttled SMS sends a real request to Africa's Talking".
  process.env.SMS_API_KEY = "real_key";
  process.env.SMS_USERNAME = "sandbox";
  process.env.SMS_GLOBAL_DAILY_CAP = "1000";
  process.env.SMS_PER_USER_DAILY_CAP = "30";
  process.env.NODE_ENV = "test";
  dbExecuteMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

// Helper that gives `db.execute` a sequence of rows-returns. Calls beyond
// the configured length return { rows: [] }.
function setExecuteSequence(values: Array<{ rows: Array<Record<string, unknown>> }>) {
  let i = 0;
  dbExecuteMock.mockImplementation(async () => {
    const v = values[i] ?? { rows: [] };
    i++;
    return v;
  });
}

describe("sendThrottledSms — happy path", () => {
  it("sends when under both caps and increments the global counter", async () => {
    setExecuteSequence([
      { rows: [{ sent_count: 1 }] }, // global increment
      { rows: [{ sent_count: 1 }] }, // user increment
    ]);
    fetchMock.mockResolvedValueOnce({ ok: true });

    const { sendThrottledSms } = await import("./sms.js");
    const out = await sendThrottledSms({
      userId: "u1",
      to: "+254712000000",
      message: "hi",
    });

    expect(out).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]![0])).toMatch(
      /api\.africastalking\.com/,
    );
  });

  it("skips per-user counter for systemMessage=true (still hits global)", async () => {
    setExecuteSequence([{ rows: [{ sent_count: 5 }] }]); // only global
    fetchMock.mockResolvedValueOnce({ ok: true });

    const { sendThrottledSms } = await import("./sms.js");
    const out = await sendThrottledSms({
      userId: "u1",
      to: "+254712000001",
      message: "system",
      systemMessage: true,
    });
    expect(out).toEqual({ ok: true });
    // Only the global increment SQL ran (1 call), no per-user increment.
    expect(dbExecuteMock).toHaveBeenCalledTimes(1);
  });
});

describe("sendThrottledSms — caps", () => {
  it("returns global_quota_exceeded and decrements when the global cap is hit", async () => {
    process.env.SMS_GLOBAL_DAILY_CAP = "1";
    setExecuteSequence([
      { rows: [{ sent_count: 2 }] }, // global increment returns count > cap
      { rows: [] }, // decrement (no return needed)
    ]);

    const { sendThrottledSms } = await import("./sms.js");
    const out = await sendThrottledSms({
      userId: "u1",
      to: "+254712000002",
      message: "hi",
    });

    expect(out).toEqual({ ok: false, reason: "global_quota_exceeded" });
    expect(fetchMock).not.toHaveBeenCalled();
    // 1 global increment + 1 global decrement = 2 db calls.
    expect(dbExecuteMock).toHaveBeenCalledTimes(2);
  });

  it("returns user_quota_exceeded when per-user cap is hit (and decrements both)", async () => {
    process.env.SMS_PER_USER_DAILY_CAP = "1";
    setExecuteSequence([
      { rows: [{ sent_count: 5 }] }, // global increment under cap
      { rows: [{ sent_count: 2 }] }, // user increment over cap
      { rows: [] }, // user decrement
      { rows: [] }, // global decrement
    ]);

    const { sendThrottledSms } = await import("./sms.js");
    const out = await sendThrottledSms({
      userId: "u1",
      to: "+254712000003",
      message: "hi",
    });

    expect(out).toEqual({ ok: false, reason: "user_quota_exceeded" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(dbExecuteMock).toHaveBeenCalledTimes(4);
  });
});

describe("sendThrottledSms — compensating decrement on send failure", () => {
  it("rolls back both counters when fetch returns non-OK", async () => {
    setExecuteSequence([
      { rows: [{ sent_count: 1 }] }, // global
      { rows: [{ sent_count: 1 }] }, // user
      { rows: [] }, // user decrement
      { rows: [] }, // global decrement
    ]);
    fetchMock.mockResolvedValueOnce({ ok: false });

    const { sendThrottledSms } = await import("./sms.js");
    const out = await sendThrottledSms({
      userId: "u1",
      to: "+254712000004",
      message: "hi",
    });

    expect(out).toEqual({ ok: false, reason: "send_failed" });
    expect(dbExecuteMock).toHaveBeenCalledTimes(4);
  });
});

describe("sendSmsRaw — credential gating", () => {
  it("returns true and logs a stub when credentials are placeholder values", async () => {
    process.env.SMS_API_KEY = "your_africastalking_api_key";
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    const { sendSmsRaw } = await import("./sms.js");
    const ok = await sendSmsRaw({
      to: "+254712000005",
      message: "stubbed",
    });

    expect(ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalled();
  });

  it("returns true and does not call fetch when API_KEY is unset", async () => {
    delete process.env.SMS_API_KEY;

    const { sendSmsRaw } = await import("./sms.js");
    const ok = await sendSmsRaw({
      to: "+254712000006",
      message: "x",
    });

    expect(ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns false on network exception", async () => {
    fetchMock.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const { sendSmsRaw } = await import("./sms.js");
    const ok = await sendSmsRaw({ to: "+254712000007", message: "x" });

    expect(ok).toBe(false);
    expect(errSpy).toHaveBeenCalled();
  });
});

describe("sendSms (legacy wrapper)", () => {
  it("defaults to systemMessage=true so legacy call sites do not consume per-user quota", async () => {
    setExecuteSequence([{ rows: [{ sent_count: 1 }] }]); // global only
    fetchMock.mockResolvedValueOnce({ ok: true });

    const { sendSms } = await import("./sms.js");
    const ok = await sendSms({ to: "+254712000008", message: "hi" });

    expect(ok).toBe(true);
    expect(dbExecuteMock).toHaveBeenCalledTimes(1);
  });
});
