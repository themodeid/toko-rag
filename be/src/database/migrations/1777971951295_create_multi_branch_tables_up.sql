-- Migration UP: Multi-Branch & Multi-Outlet Enterprise Schema
-- Timestamp: 1777971951295

-- 1. Tabel Cabang (branches)
CREATE TABLE IF NOT EXISTS branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_cabang VARCHAR(30) UNIQUE NOT NULL,
  nama VARCHAR(100) NOT NULL,
  alamat TEXT NOT NULL,
  telepon VARCHAR(30),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Masukkan Cabang Default (Pusat & Kemang)
INSERT INTO branches (id, kode_cabang, nama, alamat, telepon, is_active)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'CAB-PUSAT', 'Kafe Toko RAG - Kantor Pusat (Senopati)', 'Jl. Senopati No. 88, Jakarta Selatan', '081234567890', TRUE),
  ('a0000000-0000-0000-0000-000000000002', 'CAB-KEMANG', 'Kafe Toko RAG - Cabang Kemang', 'Jl. Kemang Raya No. 12, Jakarta Selatan', '081298765432', TRUE)
ON CONFLICT (kode_cabang) DO NOTHING;

-- 3. Tambahkan branch_id ke tabel auth (Users, Manager & Karyawan)
ALTER TABLE auth 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- 4. Tambahkan branch_id ke tabel orders
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Backfill data order lama ke cabang pusat
UPDATE orders 
SET branch_id = 'a0000000-0000-0000-0000-000000000001'
WHERE branch_id IS NULL;

-- 5. Tambahkan branch_id ke tabel expenses (Pengeluaran Operasional)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- Backfill data expense lama ke cabang pusat
UPDATE expenses 
SET branch_id = 'a0000000-0000-0000-0000-000000000001'
WHERE branch_id IS NULL;

-- 6. Tambahkan branch_id ke tabel rag_chat_logs
ALTER TABLE rag_chat_logs 
ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id) ON DELETE SET NULL;

-- 7. Tabel Stok Produk per Cabang (branch_stocks)
CREATE TABLE IF NOT EXISTS branch_stocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  produk_id UUID NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
  stock INT DEFAULT 0,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(branch_id, produk_id)
);

-- Backfill data branch_stocks dari produk yang ada ke semua cabang aktif
INSERT INTO branch_stocks (branch_id, produk_id, stock, is_available)
SELECT b.id, p.id, COALESCE(p.stock, 50), COALESCE(p.status, TRUE)
FROM branches b
CROSS JOIN produk p
ON CONFLICT (branch_id, produk_id) DO NOTHING;
