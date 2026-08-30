import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/appError";
import { ENV } from "../config/env";
import type { JwtPayloadUser } from "../types/express";

export const authGuard = (req: Request, _res: Response, next: NextFunction) => {
  let token: string | undefined;

  // 1. Cek dari HttpOnly Cookie
  if (req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }
  // 2. Fallback ke Header Authorization: Bearer <token>
  else if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    throw new AppError("Unauthorized: Sesi tidak valid atau token otentikasi diperlukan", 401);
  }

  try {
    const payload = jwt.verify(
      token,
      ENV.JWT_SECRET
    ) as JwtPayloadUser;

    // simpan user dari token ke request
    req.user = payload;

    next();
  } catch (error) {
    throw new AppError("Sesi telah kedaluwarsa atau token tidak valid", 401);
  }
};
