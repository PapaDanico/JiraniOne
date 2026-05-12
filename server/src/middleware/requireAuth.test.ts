import { describe, it, expect, vi } from "vitest";
import { requireAuth } from "./requireAuth.js";

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

describe("requireAuth", () => {
  it("calls next() when a user is on res.locals", () => {
    const res = makeRes({ id: "u1" });
    const next = vi.fn();
    requireAuth({} as never, res as never, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res._status).toBe(200);
  });

  it("returns 401 when res.locals.user is null", () => {
    const res = makeRes(null);
    const next = vi.fn();
    requireAuth({} as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
    expect(res._body).toEqual({ error: "Authentication required" });
  });

  it("returns 401 when res.locals.user is undefined (defensive)", () => {
    const res = makeRes(undefined);
    const next = vi.fn();
    requireAuth({} as never, res as never, next);
    expect(next).not.toHaveBeenCalled();
    expect(res._status).toBe(401);
  });
});
