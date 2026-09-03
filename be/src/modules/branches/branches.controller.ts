import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import * as service from "./branches.service";

export const getAllBranches = catchAsync(async (_req: Request, res: Response) => {
  const branches = await service.getAllBranchesService();
  return res.status(200).json({
    status: "success",
    data: { branches },
  });
});

export const getBranchById = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const branch = await service.getBranchByIdService(id);
  if (!branch) {
    throw new AppError("Cabang tidak ditemukan", 404);
  }
  return res.status(200).json({
    status: "success",
    data: { branch },
  });
});

export const createBranch = catchAsync(async (req: Request, res: Response) => {
  const branch = await service.createBranchService(req.body);
  return res.status(201).json({
    status: "success",
    message: "Cabang baru berhasil dibuat",
    data: { branch },
  });
});

export const updateBranch = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  const branch = await service.updateBranchService(id, req.body);
  return res.status(200).json({
    status: "success",
    message: "Data cabang berhasil diperbarui",
    data: { branch },
  });
});

export const assignStaff = catchAsync(async (req: Request, res: Response) => {
  const { userId, branchId, role } = req.body;
  const updatedUser = await service.assignStaffService(userId, branchId, role);
  return res.status(200).json({
    status: "success",
    message: "Staff berhasil ditugaskan ke cabang",
    data: { user: updatedUser },
  });
});

export const getAllStaff = catchAsync(async (_req: Request, res: Response) => {
  const staff = await service.getAllStaffService();
  return res.status(200).json({
    status: "success",
    data: { staff },
  });
});
