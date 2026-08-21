import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/appError";
import { ENV } from "../config/env";
import type { JwtPayloadUser } from "../types/express";

export const authGuard = (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new AppError("Unauthorized: Token otentikasi diperlukan", 401);
  }

  const token = authHeader.split(" ")[1];

  try {
    const payload = jwt.verify(
      token,
      ENV.JWT_SECRET
    ) as JwtPayloadUser;

    // simpan user dari token ke request
    req.user = payload;

    next();
  } catch (error) {
    throw new AppError("Invalid or expired token", 401);
  }
};
