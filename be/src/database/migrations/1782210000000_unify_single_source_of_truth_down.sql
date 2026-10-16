-- Rollback unify single source of truth
ALTER TABLE tb_minuman DROP COLUMN IF EXISTS hpp;
ALTER TABLE tb_minuman DROP COLUMN IF EXISTS estimasi_menit;
ALTER TABLE tb_minuman DROP COLUMN IF EXISTS stock;
DROP TABLE IF EXISTS tb_biaya_operasional;
