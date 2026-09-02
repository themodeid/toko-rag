import api from "@/lib/axios";
import {
  FinancialAnalyticsData,
  ExpenseItem,
  CreateExpensePayload,
} from "./types";

export async function getFinancialAnalytics(
  period: "daily" | "monthly" | "yearly" = "daily",
  date?: string
): Promise<FinancialAnalyticsData> {
  const params: Record<string, string> = { period };
  if (date) params.date = date;

  const res = await api.get<{ status: string; data: FinancialAnalyticsData }>(
    "/api/reports/analytics",
    { params }
  );
  return res.data.data;
}

export async function getExpenses(
  period: "daily" | "monthly" | "yearly" = "daily",
  date?: string
): Promise<ExpenseItem[]> {
  const params: Record<string, string> = { period };
  if (date) params.date = date;

  const res = await api.get<{ status: string; data: ExpenseItem[] }>(
    "/api/reports/expenses",
    { params }
  );
  return res.data.data;
}

export async function createExpense(
  payload: CreateExpensePayload
): Promise<ExpenseItem> {
  const res = await api.post<{ status: string; data: ExpenseItem }>(
    "/api/reports/expenses",
    payload
  );
  return res.data.data;
}

export async function deleteExpense(id: string): Promise<boolean> {
  await api.delete(`/api/reports/expenses/${id}`);
  return true;
}
