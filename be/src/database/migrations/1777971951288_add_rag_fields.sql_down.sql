-- Rollback RAG product fields
ALTER TABLE produk 
DROP COLUMN IF EXISTS deskripsi,
DROP COLUMN IF EXISTS ingredients,
DROP COLUMN IF EXISTS kategori;

DROP INDEX IF EXISTS idx_produk_kategori;
