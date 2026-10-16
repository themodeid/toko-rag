export interface KategoriMinuman {
  id: string;
  nama: string;
  icon?: string;
  urutan: number;
}

export interface Minuman {
  id: string;
  kategori_id: string;
  nama: string;
  slug: string;
  deskripsi?: string;
  harga: number;
  image_url?: string;
  is_available: boolean;
  estimasi_menit: number;
  total_terjual: number;
  rating_rata_rata: number;
  total_ulasan: number;
  kategori?: KategoriMinuman;
}

export interface CartItem {
  minuman: Minuman;
  qty: number;
  suhu: "ICE" | "HOT";
  sugar_level: "LESS" | "NORMAL" | "EXTRA";
  catatan?: string;
}

export interface OrderItem {
  id: string;
  minuman_id: string;
  nama_minuman: string;
  qty: number;
  harga_satuan: number;
  subtotal: number;
  suhu: "ICE" | "HOT";
  sugar_level: "LESS" | "NORMAL" | "EXTRA";
  catatan?: string;
}

export type StatusBayar = "PENDING" | "PAID" | "FAILED" | "EXPIRED";
export type StatusAntrian =
  | "MENUNGGU_BAYAR"
  | "MENUNGGU_RACIK"
  | "SEDANG_DIRACIK"
  | "SIAP_DIAMBIL"
  | "SELESAI"
  | "DIBATALKAN";

export interface Order {
  id: string;
  order_code: string;
  nama_pelanggan: string;
  status_bayar: StatusBayar;
  status_antrian: StatusAntrian;
  total_amount: number;
  payment_method: string;
  estimasi_selesai_menit: number;
  nomor_antrian_ke?: number;
  paid_at?: string;
  created_at: string;
  items?: OrderItem[];
}

export interface OrderStatusResponse {
  order: Order;
  antrian_sebelumnya: number;
  estimasi_sisa_menit: number;
}

export interface Review {
  id: string;
  minuman_id: string;
  rating: number;
  komentar?: string;
  nama_pengulas: string;
  created_at: string;
}

export interface CheckoutPayload {
  nama_pelanggan: string;
  idempotency_key?: string;
  auto_pay?: boolean;
  items: {
    minuman_id: string;
    qty: number;
    suhu: "ICE" | "HOT";
    sugar_level: "LESS" | "NORMAL" | "EXTRA";
    catatan?: string;
  }[];
}

export interface CreateReviewPayload {
  order_id: string;
  minuman_id: string;
  rating: number;
  komentar?: string;
  nama_pengulas: string;
}

export interface KasirSummary {
  total_orders_today: number;
  total_revenue_today: number;
  active_queue_count: number;
  completed_today: number;
}
