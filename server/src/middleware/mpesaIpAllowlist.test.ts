import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Re-import the module after mutating env so the allowlist re-evaluates.
async function loadMiddleware() {
  vi.resetModules();
  const { mpesaIpAllowlist } = await import("./mpesaIpAllowlist.js");
  return mpesaIpAllowlist;
}

interface MockReq {
  ip?: string;
  headers: Record<string, string>;
}
interface MockRes {
  jsonPayload?: unknown;
  json: (p: unknown) => MockRes;
}
function makeReqRes(ip?: string, headers?: Record<string, string>) {
  const req = { ip, headers: { "user-agent": "test", ...headers } } as MockReq;
  const res = {
    jsonPayload: undefined as unknown,
    json(p: unknown) {
      this.jsonPayload = p;
      return this;
    },
  } as MockRes;
  return { req, res };
}

describe("mpesaIpAllowlist", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it("bypasses entirely in non-production (sandbox IPs vary)", async () => {
    process.env.NODE_ENV = "development";
    const middleware = await loadMiddleware();
    const next = vi.fn();
    const { req, res } = makeReqRes("9.9.9.9");
    middleware(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("rejects unknown IPs in production with a 200 ack (so Safaricom doesn't retry forever)", async () => {
    process.env.NODE_ENV = "production";
    const middleware = await loadMiddleware();
    const next = vi.fn();
    const { req, res } = makeReqRes("9.9.9.9");
    middleware(req as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.jsonPayload).toEqual({ ResultCode: 0, ResultDesc: "Accepted" });
  });

  it("allows an IP from the documented Safaricom egress range", async () => {
    process.env.NODE_ENV = "production";
    const middleware = await loadMiddleware();
    const next = vi.fn();
    const { req, res } = makeReqRes("196.201.214.200");
    middleware(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.jsonPayload).toBeUndefined();
  });

  it("respects MPESA_CALLBACK_ALLOWED_IPS override", async () => {
    process.env.NODE_ENV = "production";
    process.env.MPESA_CALLBACK_ALLOWED_IPS = "10.0.0.1, 10.0.0.2 ";
    const middleware = await loadMiddleware();
    const next = vi.fn();
    const { req, res } = makeReqRes("10.0.0.2");
    middleware(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("strips IPv6-mapped IPv4 prefix before matching", async () => {
    process.env.NODE_ENV = "production";
    const middleware = await loadMiddleware();
    const next = vi.fn();
    const { req, res } = makeReqRes("::ffff:196.201.214.200");
    middleware(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("prefers Netlify's client-IP header over req.ip (no real socket under serverless-http)", async () => {
    process.env.NODE_ENV = "production";
    const middleware = await loadMiddleware();
    const next = vi.fn();
    const { req, res } = makeReqRes("9.9.9.9", {
      "x-nf-client-connection-ip": "196.201.214.200",
    });
    middleware(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("takes the first address when the Netlify header has multiple", async () => {
    process.env.NODE_ENV = "production";
    const middleware = await loadMiddleware();
    const next = vi.fn();
    const { req, res } = makeReqRes(undefined, {
      "x-nf-client-connection-ip": "196.201.214.200, 10.0.0.1",
    });
    middleware(req as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
