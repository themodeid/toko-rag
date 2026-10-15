export interface FinancialMetrics {
  netSales: number;
  hppTotal: number;
  grossProfit: number;
  grossMargin: number;
  opexTotal: number;
  operatingProfit: number;
  operatingMargin: number;
}

export interface AttentionMetrics {
  activeOrdersCount: number;
  lowStockCount: number;
  inventoryValuation: number;
}

export interface SalesTrendPoint {
  date: string;
  sales: number;
}

export interface LowStockItem {
  id: string;
  nama_bahan: string;
  stok_saat_ini: number;
  satuan: string;
  stok_minimum: number;
}

export interface AdminOverviewResponse {
  period: string;
  metrics: FinancialMetrics;
  attention: AttentionMetrics;
  salesTrend: SalesTrendPoint[];
  lowStockItems: LowStockItem[];
}

export interface BahanBaku {
  id: string;
  outlet_id: string;
  nama_bahan: string;
  kategori: string;
  stok_saat_ini: number;
  satuan: string;
  stok_minimum: number;
  biaya_per_satuan: number;
  supplier?: string;
  terakhir_restock?: string;
  created_at: string;
  updated_at: string;
  nilai_stok?: number;
  is_low_stock?: boolean;
}

export interface RecipeIngredient {
  id: string;
  bahan_baku_id: string;
  nama_bahan: string;
  jumlah_pakai: number;
  satuan: string;
  biaya_per_satuan: number;
  subtotal_hpp: number;
}

export interface MenuRecipe {
  produk_id: string;
  nama_produk: string;
  kategori: string;
  harga_jual: number;
  hpp_porsi: number;
  gross_margin_pct: number;
  ingredients: RecipeIngredient[];
}

export interface BiayaOperasional {
  id: string;
  outlet_id: string;
  kategori: string;
  nama_pengeluaran: string;
  nominal: number;
  tanggal_biaya: string;
  keterangan?: string;
  created_at: string;
}
