-- ==============================================================================
-- 🥤 MIGRATION DOWN: REMOVE SOFT DELETE (deleted_at) FROM CORE TABLES
-- ==============================================================================

DROP INDEX IF EXISTS idx_kategori_deleted_at;
ALTER TABLE tb_kategori_minuman DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_biaya_deleted_at;
ALTER TABLE tb_biaya_operasional DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_staff_deleted_at;
ALTER TABLE tb_staff DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_minuman_deleted_at;
ALTER TABLE tb_minuman DROP COLUMN IF EXISTS deleted_at;
