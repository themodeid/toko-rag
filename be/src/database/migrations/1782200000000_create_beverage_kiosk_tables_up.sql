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
-- 🍃 SEEDING KATEGORI & MENU MINUMAN SIGNATURE + KASIR DEFAULT
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

-- Seed 8 Minuman Pilihan (Representatif Kedai Modern)
INSERT INTO tb_minuman (id, kategori_id, nama, deskripsi, harga, is_available, image_url) VALUES
('c0000000-0000-0000-0000-000000000001', 1, 'Kopi Susu Gula Aren Spesial', 'Espresso ganda mantap, susu sapi segar, dan lelehan gula aren organik Cilacap.', 22000, true, '/images/kopi-aren.jpg'),
('c0000000-0000-0000-0000-000000000002', 1, 'Espresso Tonic Yuzu', 'Ekstrak espresso dingin berpadu air tonik berkilau dan sentuhan citrus Yuzu segar.', 28000, true, '/images/espresso-tonic.jpg'),
('c0000000-0000-0000-0000-000000000003', 1, 'Caramel Macchiato Velvet', 'Espresso kental berlapis sirup vanilla dan saus karamel panggang gurih.', 26000, true, '/images/caramel-macchiato.jpg'),
('c0000000-0000-0000-0000-000000000004', 2, 'Earl Grey Cloud Milk Tea', 'Teh Earl Grey harum bergamot dengan busa susu asin manis lembut di atasnya.', 24000, true, '/images/earl-grey.jpg'),
('c0000000-0000-0000-0000-000000000005', 2, 'Peach Jasmine Sparkling Tea', 'Seduhan melati wangi dipadukan sari buah persik manis dan soda dingin.', 22000, true, '/images/peach-jasmine.jpg'),
('c0000000-0000-0000-0000-000000000006', 3, 'Berry Hibiscus Fizz Mocktail', 'Ekstrak bunga telang dan rosela merah dengan sirup stroberi liar menyegarkan.', 25000, true, '/images/berry-fizz.jpg'),
('c0000000-0000-0000-0000-000000000007', 3, 'Tropical Mango Mint Cooler', 'Puree mangga gedong gincu manis harum dengan daun mint segar dan sparkling water.', 25000, true, '/images/mango-mint.jpg'),
('c0000000-0000-0000-0000-000000000008', 4, 'Kyoto Uji Matcha Latte', 'Bubuk matcha murni impor Uji Kyoto berpadu creamy milk premium.', 28000, true, '/images/matcha-latte.jpg')
ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    deskripsi = EXCLUDED.deskripsi,
    harga = EXCLUDED.harga,
    is_available = EXCLUDED.is_available;

-- Seed Ulasan Awal (Representatif Bintang 5)
INSERT INTO tb_ulasan (id, minuman_id, nama_pelanggan, rating, komentar) VALUES
('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Rian Pramana', 5, 'Kopi arennya creamy banget, manisnya pas nggak bikin enek!'),
('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000008', 'Jessica Tan', 5, 'Matchanya pekat dan otentik banget, beneran pakai grade Uji!')
ON CONFLICT (id) DO NOTHING;
