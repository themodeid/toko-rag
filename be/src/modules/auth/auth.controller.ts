import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { RegisterSchema, LoginSchema } from "./auth.schema";
import {
  registerAdminService,
  registerUserService,
  loginService,
  logoutService,
} from "./auth.service";
import { successResponse } from "../../utils/response";

// ===================== REGISTER ADMIN =====================
export const registerAdmin = catchAsync(async (req: Request, res: Response) => {
  const parsed = RegisterSchema.parse(req.body);
  const user = await registerAdminService(parsed);

  return successResponse(
    res,
    { user },
    "Admin berhasil dibuat",
    201
  );
});

// ===================== REGISTER USER =====================
export const registerUser = catchAsync(async (req: Request, res: Response) => {
  const parsed = RegisterSchema.parse(req.body);
  const user = await registerUserService(parsed);

  return successResponse(
    res,
    { user },
    "User berhasil mendaftar",
    201
  );
});

// Cookie configuration for production & development
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 hari
};

// ===================== LOGIN =====================
export const login = catchAsync(async (req: Request, res: Response) => {
  const parsed = LoginSchema.parse(req.body);
  const result = await loginService(parsed);

  // Set secure HttpOnly cookie
  res.cookie("auth_token", result.token, COOKIE_OPTIONS);

  return successResponse(
    res,
    result.user,
    "Login berhasil",
    200,
    { token: result.token, user: result.user }
  );
});

// ===================== LOGOUT =====================
export const logout = catchAsync(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  await logoutService(refreshToken);

  // Bersihkan HttpOnly cookie
  res.clearCookie("auth_token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: (process.env.NODE_ENV === "production" ? "none" : "lax") as "none" | "lax",
  });

  return successResponse(
    res,
    null,
    "Logout berhasil",
    200
  );
});
