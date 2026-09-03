export interface Promo {
  id: string;
  kode_promo: string;
  deskripsi?: string | null;
  tipe: "PERCENTAGE" | "FIXED";
  nilai: number;
  min_order: number;
  max_potongan?: number | null;
  kuota: number;
  kuota_terpakai: number;
  is_active: boolean;
  expired_at?: string | null;
  created_at: string;
}

export interface CreatePromoPayload {
  kode_promo: string;
  deskripsi?: string;
  tipe: "PERCENTAGE" | "FIXED";
  nilai: number;
  min_order?: number;
  max_potongan?: number;
  kuota?: number;
  is_active?: boolean;
  expired_at?: string;
}

export interface ValidatePromoResponse {
  promoId: string;
  kodePromo: string;
  deskripsi?: string;
  tipe: "PERCENTAGE" | "FIXED";
  nilai: number;
  discountAmount: number;
  finalTotal: number;
}
