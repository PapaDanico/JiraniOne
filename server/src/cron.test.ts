import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// We capture the callbacks passed to cron.schedule so we can invoke them
// directly (no setInterval, no real schedule). Each entry is keyed by its
// cron expression.
const scheduled = new Map<string, () => Promise<void>>();

vi.mock("node-cron", () => ({
  default: {
    schedule: (expr: string, cb: () => Promise<void>) => {
      scheduled.set(expr, cb);
      return { stop: vi.fn() };
    },
  },
}));

// Drizzle DB shim. Each `select().from(...).where(...).limit(...)` returns
// the queue, `update(...).set(...).where(...)` is awaitable, etc.
let stalePayments: Array<{ id: string; checkoutRequestId: string }> = [];
const dbUpdateMock = vi.fn();
const dbDeleteMock = vi.fn();
const dbSelectMock = vi.fn();
const dbExecuteMock = vi.fn();
const luciaDeleteExpiredMock = vi.fn();
const stkPushStatusMock = vi.fn();

vi.mock("./db.js", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          limit: async () => stalePayments,
        }),
      }),
    }),
    update: (...args: unknown[]) => {
      dbUpdateMock(...args);
      return {
        set: () => ({
          where: async () => undefined,
        }),
      };
    },
    delete: (...args: unknown[]) => {
      dbDeleteMock(...args);
      return {
        where: async () => undefined,
      };
    },
    execute: (...args: unknown[]) => dbExecuteMock(...args),
  },
}));

vi.mock("./auth.js", () => ({
  lucia: { deleteExpiredSessions: (...args: unknown[]) => luciaDeleteExpiredMock(...args) },
}));

vi.mock("./lib/mpesa.js", () => ({
  stkPushStatus: (...args: unknown[]) => stkPushStatusMock(...args),
}));

vi.mock("./lib/logger.js", () => ({
  logger: {
    child: () => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
  captureException: vi.fn(),
}));

beforeEach(async () => {
  scheduled.clear();
  stalePayments = [];
  dbUpdateMock.mockReset();
  dbDeleteMock.mockReset();
  dbSelectMock.mockReset();
  dbExecuteMock.mockReset();
  luciaDeleteExpiredMock.mockReset();
  stkPushStatusMock.mockReset();

  vi.resetModules();
  const { registerCronJobs } = await import("./cron.js");
  registerCronJobs();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("registerCronJobs", () => {
  it("registers exactly three cron schedules with the documented expressions", () => {
    expect(Array.from(scheduled.keys()).sort()).toEqual(
      ["*/5 * * * *", "0 3 * * *", "0 4 * * 0"].sort(),
    );
  });
});

describe("reconciliation cron (*/5 * * * *)", () => {
  it("does nothing when there are no stale pending payments", async () => {
    stalePayments = [];
    await scheduled.get("*/5 * * * *")!();
    expect(stkPushStatusMock).not.toHaveBeenCalled();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("marks a payment completed when Daraja says ResultCode 0", async () => {
    stalePayments = [{ id: "p1", checkoutRequestId: "ws_CO_done" }];
    stkPushStatusMock.mockResolvedValue({
      ResultCode: 0,
      ResultDesc: "Success",
    });

    await scheduled.get("*/5 * * * *")!();
    expect(stkPushStatusMock).toHaveBeenCalledWith("ws_CO_done");
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("marks a payment failed on terminal ResultCode (e.g. 1032 user cancelled)", async () => {
    stalePayments = [{ id: "p2", checkoutRequestId: "ws_CO_user_cancel" }];
    stkPushStatusMock.mockResolvedValue({
      ResultCode: 1032,
      ResultDesc: "Request cancelled by user",
    });

    await scheduled.get("*/5 * * * *")!();
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("leaves a payment alone when Daraja says still processing (ResultCode 1)", async () => {
    stalePayments = [{ id: "p3", checkoutRequestId: "ws_CO_pending" }];
    stkPushStatusMock.mockResolvedValue({
      ResultCode: 1,
      ResultDesc: "The transaction is being processed",
    });

    await scheduled.get("*/5 * * * *")!();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("skips silently if stkPushStatus returns null (network drop)", async () => {
    stalePayments = [{ id: "p4", checkoutRequestId: "ws_CO_x" }];
    stkPushStatusMock.mockResolvedValue(null);

    await scheduled.get("*/5 * * * *")!();
    expect(dbUpdateMock).not.toHaveBeenCalled();
  });

  it("does not throw when stkPushStatus rejects (errors are caught)", async () => {
    stalePayments = [{ id: "p5", checkoutRequestId: "ws_CO_y" }];
    stkPushStatusMock.mockRejectedValue(new Error("ECONNRESET"));

    await expect(scheduled.get("*/5 * * * *")!()).resolves.not.toThrow();
  });
});

describe("daily cleanup cron (0 3 * * *)", () => {
  it("calls lucia.deleteExpiredSessions and the three DELETEs", async () => {
    await scheduled.get("0 3 * * *")!();
    expect(luciaDeleteExpiredMock).toHaveBeenCalledTimes(1);
    // 3 DELETE calls: passwordResetTokens, smsQuotas, smsGlobalQuota
    expect(dbDeleteMock).toHaveBeenCalledTimes(3);
  });

  it("does not crash if lucia throws", async () => {
    luciaDeleteExpiredMock.mockRejectedValue(new Error("session table gone"));
    await expect(scheduled.get("0 3 * * *")!()).resolves.not.toThrow();
  });
});

describe("visitor PII anonymisation cron (0 4 * * 0)", () => {
  it("issues a single UPDATE on the visitors table", async () => {
    await scheduled.get("0 4 * * 0")!();
    expect(dbUpdateMock).toHaveBeenCalledTimes(1);
  });

  it("does not throw if the UPDATE chain fails (errors are caught)", async () => {
    // Make the next update().set() chain reject.
    dbUpdateMock.mockImplementationOnce(() => {
      throw new Error("schema drift");
    });
    await expect(scheduled.get("0 4 * * 0")!()).resolves.not.toThrow();
  });
});
