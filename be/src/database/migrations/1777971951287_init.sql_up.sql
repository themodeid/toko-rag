-- EXTENSION UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================
-- TABLE: auth
-- =========================
CREATE TABLE IF NOT EXISTS auth (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(100) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'user')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TABLE: produk
-- =========================
CREATE TABLE IF NOT EXISTS produk (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama VARCHAR(255) NOT NULL,
    harga INTEGER NOT NULL,
    stock INTEGER NOT NULL DEFAULT 0,
    status BOOLEAN DEFAULT TRUE,
    image TEXT,
    deleted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TABLE: orders
-- =========================
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auth_id UUID REFERENCES auth(id) ON DELETE CASCADE,
    total_price INTEGER NOT NULL,
    status_pesanan VARCHAR(20) NOT NULL CHECK (
        status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI', 'DIBATALKAN')
    ),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =========================
-- TABLE: order_items
-- =========================
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    produk_id UUID REFERENCES produk(id) ON DELETE CASCADE,
    harga_barang INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    subtotal INTEGER NOT NULL
);

-- =========================
-- TABLE: daily_queue
-- =========================
CREATE TABLE IF NOT EXISTS daily_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
    queue_number INTEGER NOT NULL,
    queue_date DATE NOT NULL
);

-- =========================
-- TABLE: refresh_tokens (buat logout)
-- =========================
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    token TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);