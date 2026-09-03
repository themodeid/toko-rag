import { Request, Response } from "express";
import { catchAsync } from "../../utils/catchAsync";
import { AppError } from "../../utils/appError";
import {
  getFinancialAnalyticsService,
  getExpensesService,
  createExpenseService,
  deleteExpenseService,
} from "./reports.service";

export const getFinancialAnalytics = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query.period as "daily" | "monthly" | "yearly") || "daily";
  const date = req.query.date as string | undefined;
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

  const analytics = await getFinancialAnalyticsService(period, date, effectiveBranchId);

  return res.status(200).json({
    status: "success",
    message: "Data laporan analitik keuangan berhasil diambil",
    data: analytics,
  });
});

export const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query.period as "daily" | "monthly" | "yearly") || "daily";
  const date = req.query.date as string | undefined;
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

  const expenses = await getExpensesService(date, period, effectiveBranchId);

  return res.status(200).json({
    status: "success",
    message: "Data pengeluaran berhasil diambil",
    total: expenses.length,
    data: expenses,
  });
});

export const createExpense = catchAsync(async (req: Request, res: Response) => {
  const userRole = (req.user?.role || "").toLowerCase();
  const userBranchId = (req.user as any)?.branch_id;

  const payload = {
    ...req.body,
    branch_id: userRole === "manager" && userBranchId ? userBranchId : req.body.branch_id,
  };

  const expense = await createExpenseService(payload);

  return res.status(201).json({
    status: "success",
    message: "Pengeluaran berhasil dicatat",
    data: expense,
  });
});

export const deleteExpense = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id as string;
  await deleteExpenseService(id);

  return res.status(200).json({
    status: "success",
    message: "Pengeluaran berhasil dihapus",
  });
});
