-- =====================================================
-- Migration: Add RAG Knowledge Base & Full-Text Search
-- =====================================================

-- 1. Tabel Knowledge Base untuk FAQ, Kebijakan, Operasional & SOP Toko
CREATE TABLE IF NOT EXISTS knowledge_base (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    category VARCHAR(50) NOT NULL DEFAULT 'faq',
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing knowledge_base
CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_active ON knowledge_base(is_active);

-- 2. Full-Text Search Index (GIN) pada tabel produk (nama, kategori, deskripsi, ingredients)
CREATE INDEX IF NOT EXISTS idx_produk_fts ON produk USING GIN (
    to_tsvector('simple', 
        coalesce(nama, '') || ' ' || 
        coalesce(kategori, '') || ' ' || 
        coalesce(deskripsi, '') || ' ' || 
        coalesce(ingredients, '')
    )
);

-- 3. Immutable helper & Full-Text Search Index (GIN) pada tabel knowledge_base (title, content, tags)
CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT array_to_string($1, $2);
$$;

CREATE INDEX IF NOT EXISTS idx_kb_fts ON knowledge_base USING GIN (
    to_tsvector('simple', 
        coalesce(title, '') || ' ' || 
        coalesce(content, '') || ' ' || 
        coalesce(immutable_array_to_string(tags, ' '), '')
    )
);
