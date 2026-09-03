export interface ChartDataPoint {
  label: string;
  omzet: number;
  hpp: number;
  profit: number;
}

export interface TopProductAnalytics {
  id: string;
  nama: string;
  kategori: string;
  totalTerjual: number;
  totalOmzet: number;
  totalHpp: number;
  labaKotor: number;
  margin: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  totalCount: number;
  totalAmount: number;
  percentage: number;
}

export interface OrderTypeBreakdown {
  type: string;
  totalCount: number;
  totalAmount: number;
  percentage: number;
}

export interface ExpenseCategoryBreakdown {
  kategori: string;
  totalCount: number;
  totalAmount: number;
  percentage: number;
}

export interface FinancialAnalyticsData {
  period: "daily" | "monthly" | "yearly";
  selectedDate: string;
  totalOmzet: number;
  totalHpp: number;
  grossProfit: number;
  marginPercentage: number;
  totalExpenses: number;
  netProfit: number;
  netMarginPercentage: number;
  totalOrders: number;
  averageOrderValue: number;
  paymentMethods: PaymentMethodBreakdown[];
  orderTypes: OrderTypeBreakdown[];
  expenseCategories: ExpenseCategoryBreakdown[];
  chartData: ChartDataPoint[];
  topProducts: TopProductAnalytics[];
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

export interface ExpenseItem {
  id: string;
  nama: string;
  kategori: string;
  jumlah: number;
  tanggal: string;
  catatan?: string;
  created_at: string;
}

export interface CreateExpensePayload {
  nama: string;
  kategori: string;
  jumlah: number;
  tanggal?: string;
  catatan?: string;
}
