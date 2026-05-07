import type { Request, Response, NextFunction } from "express";
import type { UserRole } from "@shared/types.js";

export function requireRole(...roles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!res.locals.user) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }
    if (!roles.includes(res.locals.user.role as UserRole)) {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    next();
  };
}
