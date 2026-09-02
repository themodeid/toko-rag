-- ==============================================================================
-- Migration: Add HPP to Produk, Modal to Order Items, and Create Expenses Table
-- ==============================================================================

-- 1. Tambah HPP (Harga Pokok Penjualan / Modal per cup) pada tabel produk
ALTER TABLE produk ADD COLUMN IF NOT EXISTS hpp INTEGER DEFAULT 0;
UPDATE produk SET hpp = ROUND(harga * 0.4) WHERE hpp IS NULL OR hpp = 0; -- Default estimasi HPP ~40% dari harga jual

-- 2. Tambah harga_modal pada order_items untuk mengunci riwayat profit historis
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS harga_modal INTEGER DEFAULT 0;
UPDATE order_items SET harga_modal = ROUND(harga_barang * 0.4) WHERE harga_modal IS NULL OR harga_modal = 0;

-- 3. Tabel pencatatan pengeluaran operasional toko (Listrik, sewa, bahan baku, gaji)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kategori VARCHAR(100) NOT NULL DEFAULT 'OPERASIONAL',
    jumlah INTEGER NOT NULL CHECK (jumlah > 0),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    catatan TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_tanggal ON expenses(tanggal);
CREATE INDEX IF NOT EXISTS idx_expenses_kategori ON expenses(kategori);
