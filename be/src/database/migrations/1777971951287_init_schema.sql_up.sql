-- ==============================================================================
-- UNIFIED DATABASE SCHEMA MIGRATION (TOKO ONLINE + POS + RAG AI)
-- ==============================================================================

-- 1. EXTENSIONS & HELPER FUNCTIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE OR REPLACE FUNCTION immutable_array_to_string(text[], text)
RETURNS text LANGUAGE sql IMMUTABLE PARALLEL SAFE AS $$
    SELECT array_to_string($1, $2);
$$;

-- ==============================================================================
-- 2. TABLE: auth (Owner, Admin, Karyawan/Barista, Pelanggan)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('owner', 'admin', 'karyawan', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 3. TABLE: produk (Menu, Katalog, Stok, HPP, RAG Knowledge & Ingredients)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS produk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    harga INTEGER NOT NULL,
    hpp INTEGER DEFAULT 0,
    stock INTEGER NOT NULL DEFAULT 0,
    status BOOLEAN DEFAULT TRUE,
    image TEXT,
    kategori VARCHAR(100) DEFAULT 'Umum',
    deskripsi TEXT,
    ingredients TEXT,
    estimasi_menit INTEGER DEFAULT 5,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 4. TABLE: knowledge_base (FAQ, Kebijakan, SOP, Promosi untuk RAG AI)
-- ==============================================================================
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

-- ==============================================================================
-- 5. TABLE: orders (Pesanan User & Guest, Dine-in/Takeaway, Midtrans/Xendit)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID REFERENCES auth(id) ON DELETE SET NULL,
    customer_name VARCHAR(100) DEFAULT 'Pelanggan',
    customer_phone VARCHAR(30) NULL,
    order_type VARCHAR(20) DEFAULT 'DINE_IN' CHECK (order_type IN ('DINE_IN', 'TAKE_AWAY', 'DELIVERY')),
    table_number VARCHAR(20) NULL,
    guest_token VARCHAR(100) NULL,
    total_price INTEGER NOT NULL,
    status_pesanan VARCHAR(30) NOT NULL CHECK (
        status_pesanan IN ('MENUNGGU_PEMBAYARAN', 'ANTRI', 'DIPROSES', 'SELESAI', 'DIBATALKAN')
    ),
    status_pembayaran VARCHAR(30) DEFAULT 'PENDING',
    payment_type VARCHAR(50) NULL,
    snap_token TEXT NULL,
    midtrans_transaction_id TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 6. TABLE: order_items (Detail Item Pesanan & Rekap Profit Modal)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
    harga_barang INTEGER NOT NULL,
    harga_modal INTEGER DEFAULT 0,
    quantity INTEGER NOT NULL,
    subtotal INTEGER NOT NULL
);

-- ==============================================================================
-- 7. TABLE: daily_queue (Nomor Antrean Harian Toko/POS)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS daily_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    queue_number INTEGER NOT NULL,
    queue_date DATE NOT NULL
);

-- ==============================================================================
-- 8. TABLE: expenses (Pencatatan Biaya Operasional Toko)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    kategori VARCHAR(100) NOT NULL DEFAULT 'OPERASIONAL',
    jumlah INTEGER NOT NULL CHECK (jumlah > 0),
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    catatan TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 9. TABLE: rag_chat_logs (Riwayat Interaksi Chat AI Customer untuk Insight Owner)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS rag_chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NULL,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    matched_products TEXT[] NULL,
    matched_knowledge TEXT[] NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 10. TABLE: refresh_tokens (Autentikasi & Sesi Logout)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==============================================================================
-- 11. INDEXES & FULL-TEXT SEARCH (GIN)
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_orders_auth_id ON orders(auth_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status_pesanan);
CREATE INDEX IF NOT EXISTS idx_orders_status_pembayaran ON orders(status_pembayaran);
CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON orders(guest_token);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);
CREATE INDEX IF NOT EXISTS idx_orders_snap_token ON orders(snap_token);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_daily_queue_date ON daily_queue(queue_date);

CREATE INDEX IF NOT EXISTS idx_produk_deleted_at ON produk(deleted_at);
CREATE INDEX IF NOT EXISTS idx_produk_kategori ON produk(kategori);

CREATE INDEX IF NOT EXISTS idx_kb_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_kb_active ON knowledge_base(is_active);

CREATE INDEX IF NOT EXISTS idx_expenses_tanggal ON expenses(tanggal);
CREATE INDEX IF NOT EXISTS idx_expenses_kategori ON expenses(kategori);

CREATE INDEX IF NOT EXISTS idx_rag_chat_logs_created_at ON rag_chat_logs(created_at);

-- Full-Text Search GIN Index Produk (nama, kategori, deskripsi, ingredients)
CREATE INDEX IF NOT EXISTS idx_produk_fts ON produk USING GIN (
    to_tsvector('simple', 
        coalesce(nama, '') || ' ' || 
        coalesce(kategori, '') || ' ' || 
        coalesce(deskripsi, '') || ' ' || 
        coalesce(ingredients, '')
    )
);

-- Full-Text Search GIN Index Knowledge Base (title, content, tags)
CREATE INDEX IF NOT EXISTS idx_kb_fts ON knowledge_base USING GIN (
    to_tsvector('simple', 
        coalesce(title, '') || ' ' || 
        coalesce(content, '') || ' ' || 
        coalesce(immutable_array_to_string(tags, ' '), '')
    )
);
