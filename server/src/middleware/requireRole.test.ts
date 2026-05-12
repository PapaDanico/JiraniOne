import { describe, it, expect, vi } from "vitest";
import { requireRole } from "./requireRole.js";

function makeRes(user: unknown) {
  let status = 200;
  let body: unknown = null;
  return {
    locals: { user },
    status(c: number) {
      status = c;
      return this;
    },
    json(b: unknown) {
      body = b;
      return this;
    },
    get _status() {
      return status;
    },
    get _body() {
      return body;
    },
  };
}

describe("requireRole", () => {
  it("401s when no session", () => {
    const res = makeRes(null);
    const next = vi.fn();
    requireRole("admin")({} as never, res as never, next);
    expect(res._status).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("403s when role is not in the allowlist", () => {
    const res = makeRes({ role: "resident" });
    const next = vi.fn();
    requireRole("admin")({} as never, res as never, next);
    expect(res._status).toBe(403);
    expect(res._body).toEqual({ error: "Insufficient permissions" });
    expect(next).not.toHaveBeenCalled();
  });

  it("passes when role matches a single allowed role", () => {
    const res = makeRes({ role: "admin" });
    const next = vi.fn();
    requireRole("admin")({} as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("passes when role is one of several allowed roles (admin+security)", () => {
    const middleware = requireRole("admin", "security");

    const adminRes = makeRes({ role: "admin" });
    const adminNext = vi.fn();
    middleware({} as never, adminRes as never, adminNext);
    expect(adminNext).toHaveBeenCalledTimes(1);

    const securityRes = makeRes({ role: "security" });
    const securityNext = vi.fn();
    middleware({} as never, securityRes as never, securityNext);
    expect(securityNext).toHaveBeenCalledTimes(1);

    const residentRes = makeRes({ role: "resident" });
    const residentNext = vi.fn();
    middleware({} as never, residentRes as never, residentNext);
    expect(residentNext).not.toHaveBeenCalled();
    expect(residentRes._status).toBe(403);
  });

  it("rejects vendor from admin-only routes", () => {
    const res = makeRes({ role: "vendor" });
    const next = vi.fn();
    requireRole("admin")({} as never, res as never, next);
    expect(res._status).toBe(403);
    expect(next).not.toHaveBeenCalled();
  });
});
