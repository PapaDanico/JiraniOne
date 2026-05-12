import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// All tests reload the module so the in-module `tokenCache` and BASE constant
// (derived from NODE_ENV at import time) re-evaluate per scenario.
async function loadMpesa() {
  vi.resetModules();
  return await import("./mpesa.js");
}

const originalEnv = { ...process.env };

beforeEach(() => {
  process.env = { ...originalEnv };
  process.env.MPESA_CONSUMER_KEY = "test_key";
  process.env.MPESA_CONSUMER_SECRET = "test_secret";
  process.env.MPESA_SHORTCODE = "174379";
  process.env.MPESA_PASSKEY = "passkey_sandbox";
  process.env.MPESA_CALLBACK_URL = "https://example.test/cb";
});

afterEach(() => {
  process.env = originalEnv;
  vi.restoreAllMocks();
});

describe("isMpesaConfigured", () => {
  it("returns true when every required env var is set", async () => {
    const { isMpesaConfigured } = await loadMpesa();
    expect(isMpesaConfigured()).toBe(true);
  });

  it("returns false when any single env var is missing", async () => {
    delete process.env.MPESA_PASSKEY;
    const { isMpesaConfigured } = await loadMpesa();
    expect(isMpesaConfigured()).toBe(false);
  });

  it("returns false when consumer credentials are missing", async () => {
    delete process.env.MPESA_CONSUMER_KEY;
    delete process.env.MPESA_CONSUMER_SECRET;
    const { isMpesaConfigured } = await loadMpesa();
    expect(isMpesaConfigured()).toBe(false);
  });
});

describe("stkPush request shape", () => {
  it("builds the Daraja body with shortcode, base64 password and stripped +", async () => {
    const fetchMock = vi
      .fn()
      // 1st call: OAuth token
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-1", expires_in: "3599" }),
      })
      // 2nd call: STK push
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          CheckoutRequestID: "ws_CO_test",
          ResponseCode: "0",
          CustomerMessage: "Success",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { stkPush } = await loadMpesa();
    const res = await stkPush({
      phone: "+254722123456",
      amount: 250,
      accountRef: "estate-1234567890ABCDEF",
      description: "service charge for April",
    });

    expect(res.CheckoutRequestID).toBe("ws_CO_test");

    // OAuth call uses Basic <base64(key:secret)>.
    const oauth = fetchMock.mock.calls[0]!;
    expect(String(oauth[0])).toMatch(/\/oauth\/v1\/generate/);
    expect((oauth[1] as { headers: Record<string, string> }).headers.Authorization)
      .toBe(`Basic ${Buffer.from("test_key:test_secret").toString("base64")}`);

    // STK push body parses to the expected shape.
    const stk = fetchMock.mock.calls[1]!;
    expect(String(stk[0])).toMatch(/\/mpesa\/stkpush\/v1\/processrequest/);
    const body = JSON.parse(
      (stk[1] as { body: string }).body,
    ) as Record<string, unknown>;

    expect(body.BusinessShortCode).toBe("174379");
    expect(body.PartyA).toBe("254722123456"); // + stripped
    expect(body.PhoneNumber).toBe("254722123456");
    expect(body.PartyB).toBe("174379");
    expect(body.TransactionType).toBe("CustomerPayBillOnline");
    expect(body.Amount).toBe(250);
    expect(body.CallBackURL).toBe("https://example.test/cb");

    // AccountReference truncated to 12, TransactionDesc to 13 (Daraja limit).
    expect(String(body.AccountReference).length).toBeLessThanOrEqual(12);
    expect(String(body.TransactionDesc).length).toBeLessThanOrEqual(13);

    // Timestamp is yyyyMMddHHmmss (14 digits).
    expect(String(body.Timestamp)).toMatch(/^\d{14}$/);

    // Password is base64(shortcode + passkey + timestamp).
    const expectedPwd = Buffer.from(
      `174379passkey_sandbox${body.Timestamp}`,
    ).toString("base64");
    expect(body.Password).toBe(expectedPwd);
  });

  it("rounds non-integer amounts before sending to Daraja", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-2", expires_in: "3599" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          CheckoutRequestID: "x",
          ResponseCode: "0",
          CustomerMessage: "ok",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { stkPush } = await loadMpesa();
    await stkPush({
      phone: "+254712000000",
      amount: 99.6,
      accountRef: "x",
      description: "x",
    });
    const body = JSON.parse(
      (fetchMock.mock.calls[1]![1] as { body: string }).body,
    );
    expect(body.Amount).toBe(100);
  });

  it("throws if the STK request itself fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-3", expires_in: "3599" }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 });
    vi.stubGlobal("fetch", fetchMock);

    const { stkPush } = await loadMpesa();
    await expect(
      stkPush({
        phone: "+254712000000",
        amount: 100,
        accountRef: "x",
        description: "x",
      }),
    ).rejects.toThrow(/STK Push failed/);
  });

  it("throws when the OAuth token call fails", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 401 });
    vi.stubGlobal("fetch", fetchMock);

    const { stkPush } = await loadMpesa();
    await expect(
      stkPush({
        phone: "+254712000000",
        amount: 100,
        accountRef: "x",
        description: "x",
      }),
    ).rejects.toThrow(/M-PESA token request failed/);
  });

  it("caches the OAuth token across STK pushes (single token call for back-to-back requests)", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "cached", expires_in: "3599" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          CheckoutRequestID: "a",
          ResponseCode: "0",
          CustomerMessage: "ok",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          CheckoutRequestID: "b",
          ResponseCode: "0",
          CustomerMessage: "ok",
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { stkPush } = await loadMpesa();
    await stkPush({ phone: "+254712000000", amount: 1, accountRef: "x", description: "x" });
    await stkPush({ phone: "+254712000000", amount: 2, accountRef: "x", description: "x" });

    // 1 token + 2 STK calls = 3. Without caching it'd be 4.
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Both STK calls used the same Bearer token.
    const auths = fetchMock.mock.calls
      .slice(1)
      .map((c) => (c[1] as { headers: Record<string, string> }).headers.Authorization);
    expect(auths).toEqual(["Bearer cached", "Bearer cached"]);
  });
});

describe("stkPushStatus", () => {
  it("returns null without making any network calls when M-PESA is not configured", async () => {
    delete process.env.MPESA_CONSUMER_KEY;
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { stkPushStatus } = await loadMpesa();
    expect(await stkPushStatus("ws_CO_x")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns the parsed status body on success", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok-q", expires_in: "3599" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ResultCode: 0, ResultDesc: "Success" }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { stkPushStatus } = await loadMpesa();
    const status = await stkPushStatus("ws_CO_query");
    expect(status).toEqual({ ResultCode: 0, ResultDesc: "Success" });

    const queryBody = JSON.parse(
      (fetchMock.mock.calls[1]![1] as { body: string }).body,
    );
    expect(queryBody.CheckoutRequestID).toBe("ws_CO_query");
  });

  it("returns null (not throw) when the Daraja query endpoint returns non-OK", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: "tok", expires_in: "3599" }),
      })
      .mockResolvedValueOnce({ ok: false, status: 502 });
    vi.stubGlobal("fetch", fetchMock);

    const { stkPushStatus } = await loadMpesa();
    expect(await stkPushStatus("ws_CO_x")).toBeNull();
  });

  it("swallows network errors (returns null)", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("ECONNRESET"));
    vi.stubGlobal("fetch", fetchMock);

    const { stkPushStatus } = await loadMpesa();
    expect(await stkPushStatus("ws_CO_x")).toBeNull();
  });
});
