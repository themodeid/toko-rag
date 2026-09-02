-- ==============================================================================
-- Migration: Add estimasi_menit to produk table
-- ==============================================================================

ALTER TABLE produk ADD COLUMN IF NOT EXISTS estimasi_menit INTEGER DEFAULT 5;
UPDATE produk SET estimasi_menit = 5 WHERE estimasi_menit IS NULL;
