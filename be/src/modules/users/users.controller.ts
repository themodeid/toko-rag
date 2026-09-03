import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import { successResponse } from "../../utils/response";
import {
  getMeService,
  deleteAllUsersService,
  getAllUsersService,
  getAllStaffService,
  createStaffService,
  updateStaffService,
  deleteStaffService,
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

// ===================== STAFF MANAGEMENT (OWNER & MANAGER) =====================
export const getAllStaff = catchAsync(async (req: Request, res: Response) => {
  const userRole = (req.user?.role || "").toLowerCase();
  const userBranchId = (req.user as any)?.branch_id;
  const requestedBranchId = req.query.branchId as string | undefined;

  let effectiveBranchId = requestedBranchId;
  if (effectiveBranchId === "all" || effectiveBranchId === "null" || effectiveBranchId === "undefined" || !effectiveBranchId) {
    effectiveBranchId = undefined;
  }
  if (userRole === "manager" && userBranchId) {
    effectiveBranchId = userBranchId;
  }

  const staff = await getAllStaffService(effectiveBranchId);
  return res.status(200).json({
    status: "success",
    message: "Daftar staff berhasil diambil",
    total: staff.length,
    data: { staff },
  });
});

export const createStaff = catchAsync(async (req: Request, res: Response) => {
  const userRole = (req.user?.role || "").toLowerCase();
  const userBranchId = (req.user as any)?.branch_id;

  const payload = {
    ...req.body,
    branch_id: userRole === "manager" && userBranchId ? userBranchId : req.body.branch_id,
  };

  const staff = await createStaffService(payload);
  return res.status(201).json({
    status: "success",
    message: "Karyawan baru berhasil didaftarkan",
    data: { staff },
  });
});

export const updateStaff = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const staff = await updateStaffService(id, req.body);
  return res.status(200).json({
    status: "success",
    message: "Data staff berhasil diperbarui",
    data: { staff },
  });
});

export const deleteStaff = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await deleteStaffService(id);
  return res.status(200).json({
    status: "success",
    message: "Staff berhasil dihapus dari sistem",
  });
});

// ===================== DELETE ALL USERS =====================
export const deleteAllUsers = catchAsync(
  async (req: Request, res: Response) => {
    await deleteAllUsersService();
    return successResponse(res, null, "Semua user berhasil dihapus");
  }
);
