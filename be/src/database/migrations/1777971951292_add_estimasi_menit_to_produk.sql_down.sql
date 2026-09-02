-- ==============================================================================
-- Migration Down: Remove estimasi_menit from produk table
-- ==============================================================================

ALTER TABLE produk DROP COLUMN IF EXISTS estimasi_menit;
