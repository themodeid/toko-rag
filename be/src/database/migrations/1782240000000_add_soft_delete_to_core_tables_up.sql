-- ==============================================================================
-- 🥤 MIGRATION: ADD SOFT DELETE (deleted_at) TO CORE TABLES
-- ==============================================================================

-- 1. Tambah kolom soft delete ke tb_minuman
ALTER TABLE tb_minuman ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_minuman_deleted_at ON tb_minuman(deleted_at);

-- 2. Tambah kolom soft delete ke tb_staff
ALTER TABLE tb_staff ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_staff_deleted_at ON tb_staff(deleted_at);

-- 3. Tambah kolom soft delete ke tb_biaya_operasional
ALTER TABLE tb_biaya_operasional ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_biaya_deleted_at ON tb_biaya_operasional(deleted_at);

-- 4. Tambah kolom soft delete ke tb_kategori_minuman
ALTER TABLE tb_kategori_minuman ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_kategori_deleted_at ON tb_kategori_minuman(deleted_at);
