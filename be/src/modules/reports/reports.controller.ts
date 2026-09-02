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

  const analytics = await getFinancialAnalyticsService(period, date);

  return res.status(200).json({
    status: "success",
    message: "Data laporan analitik keuangan berhasil diambil",
    data: analytics,
  });
});

export const getExpenses = catchAsync(async (req: Request, res: Response) => {
  const period = (req.query.period as "daily" | "monthly" | "yearly") || "daily";
  const date = req.query.date as string | undefined;

  const expenses = await getExpensesService(date, period);

  return res.status(200).json({
    status: "success",
    message: "Data pengeluaran berhasil diambil",
    total: expenses.length,
    data: expenses,
  });
});

export const createExpense = catchAsync(async (req: Request, res: Response) => {
  const expense = await createExpenseService(req.body);

  return res.status(201).json({
    status: "success",
    message: "Pengeluaran berhasil dicatat",
    data: expense,
  });
});

export const deleteExpense = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;
  await deleteExpenseService(id);

  return res.status(200).json({
    status: "success",
    message: "Pengeluaran berhasil dihapus",
  });
});
