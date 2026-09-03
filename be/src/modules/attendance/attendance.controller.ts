import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import {
  clockInService,
  clockOutService,
  getTodayAttendanceService,
  getAttendanceRecapService,
} from "./attendance.service";

export const clockIn = catchAsync(async (req: Request, res: Response) => {
  const authId = req.user?.id;
  if (!authId) throw new AppError("Unauthorized", 401);

  const userBranchId = (req.user as any)?.branch_id || null;
  const attendance = await clockInService(authId, userBranchId, req.body);

  return res.status(201).json({
    status: "success",
    message: "Clock-In berhasil dicatat",
    data: { attendance },
  });
});

export const clockOut = catchAsync(async (req: Request, res: Response) => {
  const authId = req.user?.id;
  if (!authId) throw new AppError("Unauthorized", 401);

  const attendance = await clockOutService(authId, req.body);

  return res.status(200).json({
    status: "success",
    message: "Clock-Out berhasil dicatat",
    data: { attendance },
  });
});

export const getTodayAttendance = catchAsync(async (req: Request, res: Response) => {
  const authId = req.user?.id;
  if (!authId) throw new AppError("Unauthorized", 401);

  const attendance = await getTodayAttendanceService(authId);

  return res.status(200).json({
    status: "success",
    message: "Data absensi hari ini berhasil diambil",
    data: { attendance },
  });
});

export const getAttendanceRecap = catchAsync(async (req: Request, res: Response) => {
  const userRole = (req.user?.role || "").toLowerCase();
  const userBranchId = (req.user as any)?.branch_id;
  const requestedBranchId = req.query.branchId as string | undefined;

  let effectiveBranchId = requestedBranchId;
  if (userRole === "manager" && userBranchId) {
    effectiveBranchId = userBranchId;
  }

  const startDate = req.query.startDate as string | undefined;
  const endDate = req.query.endDate as string | undefined;

  const records = await getAttendanceRecapService(effectiveBranchId, startDate, endDate);

  return res.status(200).json({
    status: "success",
    message: "Rekap absensi berhasil diambil",
    total: records.length,
    data: { records },
  });
});
