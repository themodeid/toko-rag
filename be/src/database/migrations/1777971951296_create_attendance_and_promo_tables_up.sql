-- Migration UP: Attendance, Staff Management, and Promo Engine
-- Timestamp: 1777971951296

-- 1. Tabel Absensi Karyawan & Shift (attendances)
CREATE TABLE IF NOT EXISTS attendances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_id UUID NOT NULL REFERENCES auth(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
  clock_in TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  clock_out TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) NOT NULL DEFAULT 'HADIR', -- 'HADIR', 'TERLAMBAT', 'IZIN', 'SAKIT'
  catatan TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(auth_id, tanggal)
);

-- 2. Tabel Voucher Promo & Diskon (promos)
CREATE TABLE IF NOT EXISTS promos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_promo VARCHAR(30) UNIQUE NOT NULL,
  deskripsi TEXT,
  tipe VARCHAR(20) NOT NULL DEFAULT 'PERCENTAGE', -- 'PERCENTAGE' atau 'FIXED'
  nilai NUMERIC NOT NULL,                          -- misal 10 (10%) atau 15000 (Rp 15.000)
  min_order NUMERIC DEFAULT 0,
  max_potongan NUMERIC,
  kuota INT DEFAULT 100,
  kuota_terpakai INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  expired_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tambahkan promo_id dan discount_amount ke tabel orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS promo_id UUID REFERENCES promos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;

-- 4. Masukkan Promo Contoh Awal (Seed)
INSERT INTO promos (kode_promo, deskripsi, tipe, nilai, min_order, max_potongan, kuota, is_active)
VALUES 
  ('DISKON10', 'Promo Diskon 10% Spesial Toko RAG', 'PERCENTAGE', 10, 30000, 25000, 100, TRUE),
  ('HEMAT15K', 'Potongan Langsung Rp 15.000', 'FIXED', 15000, 50000, 15000, 50, TRUE)
ON CONFLICT (kode_promo) DO NOTHING;
