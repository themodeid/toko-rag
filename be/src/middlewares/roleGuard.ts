import { Request, Response, NextFunction } from "express";
import { AppError } from "../errors/AppError";

export const roleGuard =
  (...roles: (string | string[])[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError("Unauthorized", 401);
    }

    const flatRoles = roles.flat().map((r) => r.toLowerCase());
    const userRole = (req.user.role || "").toLowerCase();

    if (!flatRoles.includes(userRole)) {
      throw new AppError("Forbidden: akses ditolak", 403);
    }

    next();
  };
