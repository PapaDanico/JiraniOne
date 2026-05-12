import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import express from "express";
import request from "supertest";

// ─── Mock the DB + downstream singletons before importing the router ─────────
// payments.ts uses:
//   - dbTx.transaction(async tx => { ... }) with tx.execute / tx.update / tx.insert
//   - db for the auth router parts (not exercised by the callback)
//   - broadcastToEstate (side effect on success)
//   - mpesaIpAllowlist (skipped in non-prod)

const txExecuteMock = vi.fn();
const txUpdateMock = vi.fn();
const txInsertMock = vi.fn();
const broadcastMock = vi.fn();
const transactionMock = vi.fn();

vi.mock("../db.js", () => ({
  db: {},
  dbTx: { transaction: (...args: unknown[]) => transactionMock(...args) },
}));

vi.mock("../ws.js", () => ({
  broadcastToEstate: (...args: unknown[]) => broadcastMock(...args),
}));

vi.mock("../middleware/mpesaIpAllowlist.js", () => ({
  // Bypass IP check entirely — that middleware is already covered by its
  // own test file. We're testing the handler body here.
  mpesaIpAllowlist: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

vi.mock("../middleware/requireAuth.js", () => ({
  requireAuth: (
    _req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => next(),
}));

vi.mock("../lib/audit.js", () => ({
  writeAudit: vi.fn(),
}));

// drizzle-orm exports `eq`/`sql`/etc. Our handler builds tx.update().set().where()
// chains; we shim those to record calls without needing the real ORM.
function makeUpdateChain() {
  const set = vi.fn().mockReturnThis();
  const where = vi.fn().mockResolvedValue(undefined);
  const chain = { set, where };
  txUpdateMock.mockImplementation(() => chain);
  return chain;
}

function makeInsertChain() {
  const values = vi.fn().mockResolvedValue(undefined);
  txInsertMock.mockImplementation(() => ({ values }));
  return values;
}

async function loadApp() {
  const { mpesaCallbackRouter } = await import("./payments.js");
  const app = express();
  app.use(express.json());
  app.use("/api/payments", mpesaCallbackRouter);
  return app;
}

beforeEach(() => {
  transactionMock.mockReset();
  txExecuteMock.mockReset();
  txUpdateMock.mockReset();
  txInsertMock.mockReset();
  broadcastMock.mockReset();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper: stand up a transaction that yields a fixed payment row to the
// FOR UPDATE SELECT, then exposes the chained update/insert spies to the
// caller-supplied handler.
function withPayment(row: Record<string, unknown> | null) {
  txExecuteMock.mockResolvedValue({ rows: row ? [row] : [] });
  const updateChain = makeUpdateChain();
  const valuesSpy = makeInsertChain();

  transactionMock.mockImplementation(async (fn) => {
    return fn({
      execute: txExecuteMock,
      update: txUpdateMock,
      insert: txInsertMock,
    });
  });

  return { updateChain, valuesSpy };
}

describe("POST /api/payments/mpesa/callback — Safaricom ack invariants", () => {
  it("returns 200 with ResultCode 0 on malformed body (no stkCallback)", async () => {
    const app = await loadApp();
    const res = await request(app)
      .post("/api/payments/mpesa/callback")
      .send({});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ResultCode: 0 });
    // No tx ran.
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it("returns 200 even when no matching payment row is found (unknown CheckoutRequestID)", async () => {
    withPayment(null);
    const app = await loadApp();
    const res = await request(app)
      .post("/api/payments/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_unknown",
            ResultCode: 0,
            CallbackMetadata: { Item: [] },
          },
        },
      });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ResultCode: 0 });
    expect(broadcastMock).not.toHaveBeenCalled();
  });

  it("ALWAYS 200s — even when the handler throws — so Safaricom does not retry forever", async () => {
    transactionMock.mockRejectedValue(new Error("DB exploded"));
    const errSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const app = await loadApp();

    const res = await request(app)
      .post("/api/payments/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_boom",
            ResultCode: 0,
          },
        },
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ResultCode: 0 });
    expect(errSpy).toHaveBeenCalled();
  });
});

describe("POST /api/payments/mpesa/callback — idempotency", () => {
  it("is a no-op when the payment is already settled (status != pending)", async () => {
    withPayment({
      id: "pay-1",
      estate_id: "estate-A",
      user_id: "user-1",
      amount: "100",
      type: "levy",
      status: "completed",
      metadata: null,
    });
    const app = await loadApp();
    await request(app)
      .post("/api/payments/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_dup",
            ResultCode: 0,
            CallbackMetadata: {
              Item: [{ Name: "MpesaReceiptNumber", Value: "QABCD12345" }],
            },
          },
        },
      });

    // No further update/insert calls — we exited via the idempotency guard.
    expect(txUpdateMock).not.toHaveBeenCalled();
    expect(txInsertMock).not.toHaveBeenCalled();
    expect(broadcastMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/payments/mpesa/callback — terminal failure", () => {
  it("marks the payment failed on non-zero ResultCode and does not broadcast", async () => {
    withPayment({
      id: "pay-2",
      estate_id: "estate-A",
      user_id: "user-1",
      amount: "100",
      type: "levy",
      status: "pending",
      metadata: null,
    });
    const app = await loadApp();
    await request(app)
      .post("/api/payments/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_fail",
            ResultCode: 1032, // user cancelled
          },
        },
      });

    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    expect(txInsertMock).not.toHaveBeenCalled();
    expect(broadcastMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/payments/mpesa/callback — harambee donation success path", () => {
  it("inserts a donations row, increments the campaign, and broadcasts payment:confirmed", async () => {
    withPayment({
      id: "pay-3",
      estate_id: "estate-A",
      user_id: "user-1",
      amount: "500",
      type: "harambee_donation",
      status: "pending",
      metadata: { campaignId: "camp-1", anonymous: true },
    });

    const app = await loadApp();
    await request(app)
      .post("/api/payments/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_ok",
            ResultCode: 0,
            CallbackMetadata: {
              Item: [{ Name: "MpesaReceiptNumber", Value: "QABCD12345" }],
            },
          },
        },
      });

    expect(txInsertMock).toHaveBeenCalledTimes(1);
    // The insert was supplied with the right anonymous flag and mpesaRef.
    const insertReturn = txInsertMock.mock.results[0]!.value as {
      values: ReturnType<typeof vi.fn>;
    };
    const donationRow = insertReturn.values.mock.calls[0]![0] as {
      campaignId: string;
      anonymous: boolean;
      mpesaRef: string;
    };
    expect(donationRow.campaignId).toBe("camp-1");
    expect(donationRow.anonymous).toBe(true);
    expect(donationRow.mpesaRef).toBe("QABCD12345");

    // One UPDATE for payments.status=completed, one tx.execute for the
    // FOR UPDATE select + the campaign-amount increment SQL.
    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    expect(broadcastMock).toHaveBeenCalledTimes(1);
    expect(broadcastMock.mock.calls[0]![0]).toBe("estate-A");
    expect(broadcastMock.mock.calls[0]![1]).toMatchObject({
      type: "payment:confirmed",
      payload: { id: "pay-3", status: "completed", mpesaRef: "QABCD12345" },
    });
  });

  it("falls through silently if metadata.campaignId is missing (still settles the payment)", async () => {
    withPayment({
      id: "pay-4",
      estate_id: "estate-A",
      user_id: "user-1",
      amount: "500",
      type: "harambee_donation",
      status: "pending",
      metadata: {}, // no campaignId
    });

    const app = await loadApp();
    await request(app)
      .post("/api/payments/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_orphan",
            ResultCode: 0,
            CallbackMetadata: {
              Item: [{ Name: "MpesaReceiptNumber", Value: "QABCD99999" }],
            },
          },
        },
      });

    // No donation insert when campaignId is absent.
    expect(txInsertMock).not.toHaveBeenCalled();
    // Payment still marked completed and a broadcast still fires.
    expect(txUpdateMock).toHaveBeenCalledTimes(1);
    expect(broadcastMock).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/payments/mpesa/callback — chama contribution success path", () => {
  it("inserts a chama_contributions row keyed by chamaId + periodLabel", async () => {
    withPayment({
      id: "pay-5",
      estate_id: "estate-B",
      user_id: "user-2",
      amount: "2000",
      type: "chama_contribution",
      status: "pending",
      metadata: { chamaId: "chama-1", periodLabel: "2026-05" },
    });

    const app = await loadApp();
    await request(app)
      .post("/api/payments/mpesa/callback")
      .send({
        Body: {
          stkCallback: {
            CheckoutRequestID: "ws_CO_chama",
            ResultCode: 0,
            CallbackMetadata: {
              Item: [{ Name: "MpesaReceiptNumber", Value: "QXYZ" }],
            },
          },
        },
      });

    expect(txInsertMock).toHaveBeenCalledTimes(1);
    const insertReturn = txInsertMock.mock.results[0]!.value as {
      values: ReturnType<typeof vi.fn>;
    };
    const row = insertReturn.values.mock.calls[0]![0] as {
      chamaId: string;
      periodLabel: string;
      mpesaRef: string;
    };
    expect(row.chamaId).toBe("chama-1");
    expect(row.periodLabel).toBe("2026-05");
    expect(row.mpesaRef).toBe("QXYZ");
    expect(broadcastMock).toHaveBeenCalledTimes(1);
  });
});
