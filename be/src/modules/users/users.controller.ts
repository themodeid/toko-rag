import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { successResponse } from "../../utils/response";
import {
  getMeService,
  deleteAllUsersService,
  getAllUsersService,
} from "./users.service";

// ===================== GET CURRENT USER (ME) =====================
export const getMe = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user?.id;

  if (!userId) {
    throw new AppError("Unauthorized: Sesi tidak valid", 401);
  }

  const user = await getMeService(userId);
  if (!user) {
    throw new AppError("User tidak ditemukan", 404);
  }

  // Mengembalikan data user secara langsung untuk kompatibilitas frontend
  return res.status(200).json(user);
});

// ===================== GET ALL USERS (ADMIN) =====================
export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await getAllUsersService();
  return successResponse(res, users, "Berhasil mengambil daftar user");
});

// ===================== DELETE ALL USERS =====================
export const deleteAllUsers = catchAsync(
  async (req: Request, res: Response) => {
    await deleteAllUsersService();
    return successResponse(res, null, "Semua user berhasil dihapus");
  }
);
