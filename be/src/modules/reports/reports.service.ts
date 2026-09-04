import { pool } from "../../config/database";
import { AppError } from "../../utils/appError";
import { CreateExpenseDTO } from "./reports.schema";

export interface AnalyticsSummary {
  period: "daily" | "monthly" | "yearly";
  selectedDate: string;
  branchId?: string;
  totalOmzet: number;
  totalHpp: number;
  grossProfit: number;
  marginPercentage: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercentage: number;
  totalOrders: number;
  averageOrderValue: number;
  paymentMethods: Array<{
    method: string;
    totalCount: number;
    totalAmount: number;
    percentage: number;
  }>;
  orderTypes: Array<{
    type: string;
    totalCount: number;
    totalAmount: number;
    percentage: number;
  }>;
  expenseCategories: Array<{
    kategori: string;
    totalCount: number;
    totalAmount: number;
    percentage: number;
  }>;
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
  branchPerformance?: Array<{
    id: string;
    nama: string;
    kode_cabang: string;
    omzet: number;
    orders: number;
    expenses: number;
    netProfit: number;
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

  const queryParams: any[] = [formattedDate];

  // Common order filter for valid non-canceled sales
  const validOrderCondition = `
    ${dateFilterOrder}
    AND o.status_pesanan != 'DIBATALKAN'
    AND (
      o.status_pembayaran IN ('PAID', 'SETTLEMENT') 
      OR o.status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI')
    )
    AND o.status_pembayaran NOT IN ('FAILED', 'EXPIRED')
  `;

  // 1. Query Total Omzet, HPP, Order Count
  const revenueQuery = `
    SELECT 
      COALESCE(COUNT(DISTINCT o.id), 0) AS total_orders,
      COALESCE(SUM(o.total_price), 0) AS total_omzet,
      COALESCE(SUM(oi.quantity * COALESCE(NULLIF(oi.harga_modal, 0), NULLIF(p.hpp, 0), ROUND(oi.harga_barang * 0.4))), 0) AS total_hpp
    FROM orders o
    LEFT JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN produk p ON oi.produk_id = p.id
    WHERE ${validOrderCondition}
  `;

  // 2. Query Total Expenses
  const expenseQuery = `
    SELECT COALESCE(SUM(e.jumlah), 0) AS total_expenses
    FROM expenses e
    WHERE ${dateFilterExpense}
  `;

  // 3. Query Payment Method Breakdown
  const paymentMethodQuery = `
    SELECT 
      COALESCE(NULLIF(o.payment_type, ''), 'QRIS / Xendit') AS method,
      COUNT(o.id) AS total_count,
      COALESCE(SUM(o.total_price), 0) AS total_amount
    FROM orders o
    WHERE ${validOrderCondition}
    GROUP BY COALESCE(NULLIF(o.payment_type, ''), 'QRIS / Xendit')
    ORDER BY total_amount DESC
  `;

  // 4. Query Order Type Breakdown (Dine-in vs Take-away)
  const orderTypeQuery = `
    SELECT 
      COALESCE(NULLIF(o.order_type, ''), 'DINE_IN') AS type,
      COUNT(o.id) AS total_count,
      COALESCE(SUM(o.total_price), 0) AS total_amount
    FROM orders o
    WHERE ${validOrderCondition}
    GROUP BY COALESCE(NULLIF(o.order_type, ''), 'DINE_IN')
    ORDER BY total_amount DESC
  `;

  // 5. Query Expense Categories Breakdown
  const expenseCategoryQuery = `
    SELECT 
      COALESCE(e.kategori, 'OPERASIONAL') AS kategori,
      COUNT(e.id) AS total_count,
      COALESCE(SUM(e.jumlah), 0) AS total_amount
    FROM expenses e
    WHERE ${dateFilterExpense}
    GROUP BY COALESCE(e.kategori, 'OPERASIONAL')
    ORDER BY total_amount DESC
  `;

  // 6. Query Chart Timeline Breakdown
  const chartQuery = `
    SELECT 
      ${chartLabelExpr} AS label,
      COALESCE(SUM(oi.subtotal), 0) AS omzet,
      COALESCE(SUM(oi.quantity * COALESCE(NULLIF(oi.harga_modal, 0), NULLIF(p.hpp, 0), ROUND(oi.harga_barang * 0.4))), 0) AS hpp,
      COALESCE(SUM(oi.subtotal - (oi.quantity * COALESCE(NULLIF(oi.harga_modal, 0), NULLIF(p.hpp, 0), ROUND(oi.harga_barang * 0.4)))), 0) AS profit
    FROM orders o
    INNER JOIN order_items oi ON o.id = oi.order_id
    LEFT JOIN produk p ON oi.produk_id = p.id
    WHERE ${validOrderCondition}
    GROUP BY ${chartGroupExpr}, ${chartLabelExpr}
    ORDER BY ${chartGroupExpr} ASC
  `;

  // 7. Query Top Selling Products & Product Profitability
  const topProductsQuery = `
    SELECT 
      p.id,
      p.nama,
      COALESCE(p.kategori, 'Umum') AS kategori,
      SUM(oi.quantity) AS total_terjual,
      SUM(oi.subtotal) AS total_omzet,
      SUM(oi.quantity * COALESCE(NULLIF(oi.harga_modal, 0), NULLIF(p.hpp, 0), ROUND(oi.harga_barang * 0.4))) AS total_hpp,
      SUM(oi.subtotal - (oi.quantity * COALESCE(NULLIF(oi.harga_modal, 0), NULLIF(p.hpp, 0), ROUND(oi.harga_barang * 0.4)))) AS laba_kotor
    FROM order_items oi
    INNER JOIN orders o ON oi.order_id = o.id
    INNER JOIN produk p ON oi.produk_id = p.id
    WHERE ${validOrderCondition}
    GROUP BY p.id, p.nama, p.kategori
    ORDER BY total_omzet DESC
    LIMIT 10
  `;

  const [revRes, expRes, payRes, ordTypeRes, expCatRes, chartRes, topProdRes] =
    await Promise.all([
      pool.query(revenueQuery, queryParams),
      pool.query(expenseQuery, queryParams),
      pool.query(paymentMethodQuery, queryParams),
      pool.query(orderTypeQuery, queryParams),
      pool.query(expenseCategoryQuery, queryParams),
      pool.query(chartQuery, queryParams),
      pool.query(topProductsQuery, queryParams),
    ]);

  const totalOmzet = Number(revRes.rows[0]?.total_omzet || 0);
  const totalHpp = Number(revRes.rows[0]?.total_hpp || 0);
  const totalOrders = Number(revRes.rows[0]?.total_orders || 0);
  const totalExpenses = Number(expRes.rows[0]?.total_expenses || 0);

  const grossProfit = totalOmzet - totalHpp;
  const marginPercentage = totalOmzet > 0 ? Math.round((grossProfit / totalOmzet) * 1000) / 10 : 0;
  const netProfit = grossProfit - totalExpenses;
  const netMarginPercentage = totalOmzet > 0 ? Math.round((netProfit / totalOmzet) * 1000) / 10 : 0;
  const averageOrderValue = totalOrders > 0 ? Math.round(totalOmzet / totalOrders) : 0;

  const paymentMethods = payRes.rows.map((row) => ({
    method: row.method,
    totalCount: Number(row.total_count),
    totalAmount: Number(row.total_amount),
    percentage: totalOmzet > 0 ? Math.round((Number(row.total_amount) / totalOmzet) * 1000) / 10 : 0,
  }));

  const orderTypes = ordTypeRes.rows.map((row) => ({
    type: row.type,
    totalCount: Number(row.total_count),
    totalAmount: Number(row.total_amount),
    percentage: totalOmzet > 0 ? Math.round((Number(row.total_amount) / totalOmzet) * 1000) / 10 : 0,
  }));

  const expenseCategories = expCatRes.rows.map((row) => ({
    kategori: row.kategori,
    totalCount: Number(row.total_count),
    totalAmount: Number(row.total_amount),
    percentage: totalExpenses > 0 ? Math.round((Number(row.total_amount) / totalExpenses) * 1000) / 10 : 0,
  }));

  const chartData = chartRes.rows.map((row) => ({
    label: row.label,
    omzet: Number(row.omzet),
    hpp: Number(row.hpp),
    profit: Number(row.profit),
  }));

  const topProducts = topProdRes.rows.map((row) => {
    const omzet = Number(row.total_omzet);
    const hpp = Number(row.total_hpp);
    const labaKotor = Number(row.laba_kotor);
    return {
      id: row.id,
      nama: row.nama,
      kategori: row.kategori,
      totalTerjual: Number(row.total_terjual),
      totalOmzet: omzet,
      totalHpp: hpp,
      labaKotor,
      margin: omzet > 0 ? Math.round((labaKotor / omzet) * 1000) / 10 : 0,
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
    netMarginPercentage,
    totalOrders,
    averageOrderValue,
    paymentMethods,
    orderTypes,
    expenseCategories,
    chartData,
    topProducts,
  };
};

// ================= EXPENSES SERVICE =================
export const getExpensesService = async (
  dateParam?: string,
  period: "daily" | "monthly" | "yearly" = "daily"
) => {
  let dateFilter = "";
  let param = dateParam;

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");

  if (period === "daily") {
    param = dateParam || `${yyyy}-${mm}-${dd}`;
    dateFilter = "DATE(e.tanggal) = $1";
  } else if (period === "monthly") {
    param = dateParam || `${yyyy}-${mm}`;
    dateFilter = "TO_CHAR(e.tanggal, 'YYYY-MM') = $1";
  } else {
    param = dateParam || `${yyyy}`;
    dateFilter = "TO_CHAR(e.tanggal, 'YYYY') = $1";
  }

  const queryParams: any[] = [param];

  const query = `
    SELECT 
      e.id, 
      e.nama, 
      e.kategori, 
      e.jumlah, 
      e.tanggal, 
      e.catatan, 
      e.created_at
    FROM expenses e
    WHERE ${dateFilter}
    ORDER BY e.tanggal DESC, e.created_at DESC
  `;
  const result = await pool.query(query, queryParams);
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
