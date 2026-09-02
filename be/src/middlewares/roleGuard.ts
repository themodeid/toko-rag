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

    // Normalisasi: jika route mengizinkan "admin" atau "owner", keduanya boleh akses
    const hasAccess = flatRoles.some((r) => {
      if (r === "admin" || r === "owner") {
        return userRole === "admin" || userRole === "owner";
      }
      return userRole === r;
    });

    if (!hasAccess) {
      throw new AppError(`Forbidden: role '${userRole}' tidak memiliki akses ke fitur ini`, 403);
    }

    next();
  };
