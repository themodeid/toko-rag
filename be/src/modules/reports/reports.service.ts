import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";
import { CreateExpenseDTO } from "./reports.schema";

export interface AnalyticsSummary {
  period: "daily" | "monthly" | "yearly";
  selectedDate: string;
  totalOmzet: number;
  totalHpp: number;
  grossProfit: number;
  marginPercentage: number;
  totalExpenses: number;
  netProfit: number;
  totalOrders: number;
  averageOrderValue: number;
  chartData: Array<{
    label: string;
    omzet: number;
    hpp: number;
    profit: number;
  }>;
  topProducts: Array<{
    id: string;
    nama: string;
    kategori: string;
    totalTerjual: number;
    totalOmzet: number;
    totalHpp: number;
    labaKotor: number;
    margin: number;
  }>;
}

export const getFinancialAnalyticsService = async (
  period: "daily" | "monthly" | "yearly" = "daily",
  dateParam?: string
): Promise<AnalyticsSummary> => {
  let dateFilterOrder = "";
  let dateFilterExpense = "";
  let chartGroupExpr = "";
  let chartLabelExpr = "";
  let formattedDate = "";

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  if (period === "daily") {
    formattedDate = dateParam || `${yyyy}-${mm}-${dd}`;
    dateFilterOrder = "DATE(o.created_at) = $1";
    dateFilterExpense = "DATE(e.tanggal) = $1";
    chartGroupExpr = "EXTRACT(HOUR FROM o.created_at)";
    chartLabelExpr = "TO_CHAR(o.created_at, 'HH24:00')";
  } else if (period === "monthly") {
    formattedDate = dateParam || `${yyyy}-${mm}`;
    dateFilterOrder = "TO_CHAR(o.created_at, 'YYYY-MM') = $1";
    dateFilterExpense = "TO_CHAR(e.tanggal, 'YYYY-MM') = $1";
    chartGroupExpr = "DATE(o.created_at)";
    chartLabelExpr = "TO_CHAR(o.created_at, 'DD Mon')";
  } else {
    // yearly
    formattedDate = dateParam || `${yyyy}`;
    dateFilterOrder = "TO_CHAR(o.created_at, 'YYYY') = $1";
    dateFilterExpense = "TO_CHAR(e.tanggal, 'YYYY') = $1";
    chartGroupExpr = "TO_CHAR(o.created_at, 'YYYY-MM')";
    chartLabelExpr = "TO_CHAR(o.created_at, 'Mon')";
  }

  // 1. Query Total Omzet, HPP, Order Count
  const revenueQuery = `
    SELECT 
      COALESCE(COUNT(DISTINCT o.id), 0) AS total_orders,
      COALESCE(SUM(o.total_price), 0) AS total_omzet,
      COALESCE(SUM(oi.quantity * COALESCE(oi.harga_modal, ROUND(oi.harga_barang * 0.4))), 0) AS total_hpp
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    WHERE ${dateFilterOrder}
      AND o.status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
      AND o.status_pembayaran = 'PAID'
  `;

  // 2. Query Total Expenses
  const expenseQuery = `
    SELECT COALESCE(SUM(e.jumlah), 0) AS total_expenses
    FROM expenses e
    WHERE ${dateFilterExpense}
  `;

  // 3. Query Chart Timeline Breakdown
  const chartQuery = `
    SELECT 
      ${chartLabelExpr} AS label,
      COALESCE(SUM(oi.subtotal), 0) AS omzet,
      COALESCE(SUM(oi.quantity * COALESCE(oi.harga_modal, ROUND(oi.harga_barang * 0.4))), 0) AS hpp,
      COALESCE(SUM(oi.subtotal - (oi.quantity * COALESCE(oi.harga_modal, ROUND(oi.harga_barang * 0.4)))), 0) AS profit
    FROM orders o
    INNER JOIN order_items oi ON o.id = oi.order_id
    WHERE ${dateFilterOrder}
      AND o.status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
      AND o.status_pembayaran = 'PAID'
    GROUP BY ${chartGroupExpr}, ${chartLabelExpr}
    ORDER BY ${chartGroupExpr} ASC
  `;

  // 4. Query Top Selling Products & Product Profitability
  const topProductsQuery = `
    SELECT 
      p.id,
      p.nama,
      COALESCE(p.kategori, 'Umum') AS kategori,
      SUM(oi.quantity) AS total_terjual,
      SUM(oi.subtotal) AS total_omzet,
      SUM(oi.quantity * COALESCE(oi.harga_modal, ROUND(oi.harga_barang * 0.4))) AS total_hpp,
      SUM(oi.subtotal - (oi.quantity * COALESCE(oi.harga_modal, ROUND(oi.harga_barang * 0.4)))) AS laba_kotor
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id
    INNER JOIN produk p ON oi.produk_id = p.id
    WHERE ${dateFilterOrder}
      AND o.status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
      AND o.status_pembayaran = 'PAID'
    GROUP BY p.id, p.nama, p.kategori
    ORDER BY total_omzet DESC
    LIMIT 10
  `;

  const [revRes, expRes, chartRes, topProdRes] = await Promise.all([
    pool.query(revenueQuery, [formattedDate]),
    pool.query(expenseQuery, [formattedDate]),
    pool.query(chartQuery, [formattedDate]),
    pool.query(topProductsQuery, [formattedDate]),
  ]);

  const totalOmzet = Number(revRes.rows[0]?.total_omzet || 0);
  const totalHpp = Number(revRes.rows[0]?.total_hpp || 0);
  const totalOrders = Number(revRes.rows[0]?.total_orders || 0);
  const totalExpenses = Number(expRes.rows[0]?.total_expenses || 0);

  const grossProfit = totalOmzet - totalHpp;
  const marginPercentage = totalOmzet > 0 ? Math.round((grossProfit / totalOmzet) * 1000) / 10 : 0;
  const netProfit = grossProfit - totalExpenses;
  const averageOrderValue = totalOrders > 0 ? Math.round(totalOmzet / totalOrders) : 0;

  const chartData = chartRes.rows.map((row) => ({
    label: row.label,
    omzet: Number(row.omzet),
    hpp: Number(row.hpp),
    profit: Number(row.profit),
  }));

  const topProducts = topProdRes.rows.map((p) => {
    const prodOmzet = Number(p.total_omzet);
    const prodProfit = Number(p.laba_kotor);
    return {
      id: p.id,
      nama: p.nama,
      kategori: p.kategori,
      totalTerjual: Number(p.total_terjual),
      totalOmzet: prodOmzet,
      totalHpp: Number(p.total_hpp),
      labaKotor: prodProfit,
      margin: prodOmzet > 0 ? Math.round((prodProfit / prodOmzet) * 1000) / 10 : 0,
    };
  });

  return {
    period,
    selectedDate: formattedDate,
    totalOmzet,
    totalHpp,
    grossProfit,
    marginPercentage,
    totalExpenses,
    netProfit,
    totalOrders,
    averageOrderValue,
    chartData,
    topProducts,
  };
};

// ================= EXPENSES SERVICE =================

export const getExpensesService = async (dateParam?: string, period: "daily" | "monthly" | "yearly" = "daily") => {
  let filter = "";
  let param = dateParam;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  if (period === "daily") {
    param = dateParam || `${yyyy}-${mm}-${dd}`;
    filter = "WHERE DATE(tanggal) = $1";
  } else if (period === "monthly") {
    param = dateParam || `${yyyy}-${mm}`;
    filter = "WHERE TO_CHAR(tanggal, 'YYYY-MM') = $1";
  } else {
    param = dateParam || `${yyyy}`;
    filter = "WHERE TO_CHAR(tanggal, 'YYYY') = $1";
  }

  const query = `
    SELECT id, nama, kategori, jumlah, tanggal, catatan, created_at
    FROM expenses
    ${filter}
    ORDER BY tanggal DESC, created_at DESC
  `;
  const result = await pool.query(query, [param]);
  return result.rows;
};

export const createExpenseService = async (data: CreateExpenseDTO) => {
  const result = await pool.query(
    `
    INSERT INTO expenses (nama, kategori, jumlah, tanggal, catatan)
    VALUES ($1, $2, $3, COALESCE($4::date, CURRENT_DATE), $5)
    RETURNING *
    `,
    [
      data.nama,
      data.kategori,
      data.jumlah,
      data.tanggal || null,
      data.catatan || null,
    ]
  );
  return result.rows[0];
};

export const deleteExpenseService = async (id: string) => {
  const result = await pool.query("DELETE FROM expenses WHERE id = $1 RETURNING id", [id]);
  if (result.rowCount === 0) {
    throw new AppError("Pengeluaran tidak ditemukan", 404);
  }
  return true;
};
