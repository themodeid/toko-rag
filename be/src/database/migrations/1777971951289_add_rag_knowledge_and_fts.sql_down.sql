-- =====================================================
-- Rollback: Drop RAG Knowledge Base & Full-Text Search Indexes
-- =====================================================

DROP INDEX IF EXISTS idx_kb_fts;
DROP INDEX IF EXISTS idx_produk_fts;
DROP TABLE IF EXISTS knowledge_base;
