-- =====================================================
-- Migration: Add RAG product fields (deskripsi, ingredients, kategori)
-- =====================================================

ALTER TABLE produk 
ADD COLUMN IF NOT EXISTS deskripsi TEXT,
ADD COLUMN IF NOT EXISTS ingredients TEXT,
ADD COLUMN IF NOT EXISTS kategori VARCHAR(100) DEFAULT 'Umum';

-- Index for category
CREATE INDEX IF NOT EXISTS idx_produk_kategori ON produk(kategori);
