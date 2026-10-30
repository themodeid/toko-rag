-- ==============================================================================
-- 🥤 MIGRATION: CREATE BEVERAGE KIOSK 3NF TABLES & SEED ESSENTIAL DATA
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabel Staff / Kasir (Autentikasi Khusus Staf Kedai)
CREATE TABLE IF NOT EXISTS tb_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    nama VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'kasir' CHECK (role IN ('kasir', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabel Kategori Minuman (Coffee, Tea, Mocktail, Milk Series)
CREATE TABLE IF NOT EXISTS tb_kategori_minuman (
    id SERIAL PRIMARY KEY,
    nama_kategori VARCHAR(100) UNIQUE NOT NULL,
    slug VARCHAR(100) UNIQUE NOT NULL,
    deskripsi TEXT,
    urutan INTEGER DEFAULT 0
);

-- 3. Tabel Menu Minuman
CREATE TABLE IF NOT EXISTS tb_minuman (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kategori_id INTEGER NOT NULL REFERENCES tb_kategori_minuman(id) ON DELETE RESTRICT,
    nama VARCHAR(150) NOT NULL,
    deskripsi TEXT,
    harga INTEGER NOT NULL CHECK (harga >= 0),
    is_available BOOLEAN DEFAULT TRUE,
    image_url TEXT,
    total_terjual INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabel Header Pesanan (Orders)
CREATE TABLE IF NOT EXISTS tb_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    no_antrian VARCHAR(20) NOT NULL,
    nama_pelanggan VARCHAR(50) NOT NULL,
    total_bayar INTEGER NOT NULL CHECK (total_bayar > 0),
    metode_pembayaran VARCHAR(20) NOT NULL DEFAULT 'QRIS' CHECK (metode_pembayaran = 'QRIS'),
    status_pembayaran VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status_pembayaran IN ('PENDING', 'PAID', 'EXPIRED')),
    status_antrian VARCHAR(20) NOT NULL DEFAULT 'MENUNGGU_BAYAR' CHECK (
        status_antrian IN ('MENUNGGU_BAYAR', 'MENUNGGU_RACIK', 'SEDANG_DIRACIK', 'SIAP_DIAMBIL', 'SELESAI', 'DIBATALKAN')
    ),
    estimasi_menit INTEGER DEFAULT 5,
    waktu_bayar TIMESTAMP WITH TIME ZONE,
    waktu_selesai TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabel Detail Item Pesanan
CREATE TABLE IF NOT EXISTS tb_order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES tb_orders(id) ON DELETE CASCADE,
    minuman_id UUID NOT NULL REFERENCES tb_minuman(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    harga_satuan INTEGER NOT NULL CHECK (harga_satuan >= 0),
    subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
    suhu VARCHAR(10) DEFAULT 'ICE' CHECK (suhu IN ('ICE', 'HOT')),
    sugar_level VARCHAR(20) DEFAULT 'NORMAL' CHECK (sugar_level IN ('LESS', 'NORMAL', 'EXTRA')),
    catatan VARCHAR(100)
);

-- 6. Tabel Ulasan & Rating Produk
CREATE TABLE IF NOT EXISTS tb_ulasan (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    minuman_id UUID NOT NULL REFERENCES tb_minuman(id) ON DELETE CASCADE,
    nama_pelanggan VARCHAR(50) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    komentar TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexing Cepat
CREATE INDEX IF NOT EXISTS idx_minuman_kategori ON tb_minuman(kategori_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON tb_orders(status_antrian);
CREATE INDEX IF NOT EXISTS idx_orders_created ON tb_orders(created_at);
CREATE INDEX IF NOT EXISTS idx_ulasan_minuman ON tb_ulasan(minuman_id);

-- ==============================================================================
-- 🍃 SEEDING KATEGORI & KASIR DEFAULT (ESSENTIAL LOOKUP DATA ONLY)
-- ==============================================================================

-- Seed Akun Kasir Default (password: kasir123 -> bcrypt hash $2b$10$vI8aWBnW3fID.ZQ4/zo1G.qHvhHAas.a/5iVpQv3B3E7yZ6P4aO/e)
INSERT INTO tb_staff (username, password_hash, nama, role)
VALUES ('kasir', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.qHvhHAas.a/5iVpQv3B3E7yZ6P4aO/e', 'Barista Utama', 'kasir')
ON CONFLICT (username) DO NOTHING;

-- Seed Kategori Minuman
INSERT INTO tb_kategori_minuman (id, nama_kategori, slug, deskripsi, urutan) VALUES
(1, 'Artisan Coffee', 'artisan-coffee', 'Biji kopi pilihan Nusantara diseduh dengan teknik modern', 1),
(2, 'Signature Tea', 'signature-tea', 'Teh aromatik pilihan berpadu aroma buah dan bunga segar', 2),
(3, 'Refreshing Mocktail', 'refreshing-mocktail', 'Kesegaran soda buah alami dingin tanpa alkohol', 3),
(4, 'Milk Series & Cocoa', 'milk-series', 'Perpaduan susu segar lembut dan cokelat premium', 4)
ON CONFLICT (id) DO UPDATE SET 
    nama_kategori = EXCLUDED.nama_kategori,
    slug = EXCLUDED.slug,
    deskripsi = EXCLUDED.deskripsi,
    urutan = EXCLUDED.urutan;
