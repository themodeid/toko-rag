-- ==============================================================================
-- 🥤 DATABASE SEED DATA (TOKO+RAG ARTISAN BEVERAGE BAR POS 3NF)
-- File: src/database/seed.sql
-- ==============================================================================

-- 1. SEED STAFF / KASIR / OWNER (Bcrypt Hashes - Cost Factor 10)
-- Passwords:
-- owner:    owner123    ($2b$10$vI8aWBnW3fID.ZQ4/zo1G.qHvhHAas.a/5iVpQv3B3E7yZ6P4aO/e)
-- admin:    admin123    ($2b$10$LiJotwE0Z9DE79tXJon3Ye3uZ6ZvJtSAxBi3uH9KU6OxGuaAZX5GO)
-- karyawan: karyawan123 ($2b$10$WtE4QNQvOydx7VgFQfUPPu6ufK8E7PgMVZ6UwnTLmdOEh3avQNMsS)
-- kasir:    kasir123    ($2b$10$vI8aWBnW3fID.ZQ4/zo1G.qHvhHAas.a/5iVpQv3B3E7yZ6P4aO/e)

INSERT INTO tb_staff (username, password_hash, nama, role)
VALUES 
    ('owner', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.qHvhHAas.a/5iVpQv3B3E7yZ6P4aO/e', 'Adam Owner', 'owner'),
    ('admin', '$2b$10$LiJotwE0Z9DE79tXJon3Ye3uZ6ZvJtSAxBi3uH9KU6OxGuaAZX5GO', 'Administrator', 'admin'),
    ('karyawan', '$2b$10$WtE4QNQvOydx7VgFQfUPPu6ufK8E7PgMVZ6UwnTLmdOEh3avQNMsS', 'Karyawan Barista', 'karyawan'),
    ('kasir', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.qHvhHAas.a/5iVpQv3B3E7yZ6P4aO/e', 'Barista Utama', 'kasir')
ON CONFLICT (username) DO UPDATE 
SET password_hash = EXCLUDED.password_hash, 
    nama = EXCLUDED.nama, 
    role = EXCLUDED.role;

-- 2. SEED KATEGORI MINUMAN
INSERT INTO tb_kategori_minuman (id, nama_kategori, slug, deskripsi, urutan) 
VALUES
    (1, 'Artisan Coffee', 'artisan-coffee', 'Biji kopi pilihan Nusantara diseduh dengan teknik modern', 1),
    (2, 'Signature Tea', 'signature-tea', 'Teh aromatik pilihan berpadu aroma buah dan bunga segar', 2),
    (3, 'Refreshing Mocktail', 'refreshing-mocktail', 'Kesegaran soda buah alami dingin tanpa alkohol', 3),
    (4, 'Milk Series & Cocoa', 'milk-series', 'Perpaduan susu segar lembut dan cokelat premium', 4)
ON CONFLICT (id) DO UPDATE SET 
    nama_kategori = EXCLUDED.nama_kategori,
    slug = EXCLUDED.slug,
    deskripsi = EXCLUDED.deskripsi,
    urutan = EXCLUDED.urutan;

-- 3. SEED MENU MINUMAN ARTISAN (HPP Langsung Per Cup & Stok Siap Saji)
INSERT INTO tb_minuman (id, kategori_id, nama, deskripsi, harga, hpp, stock, is_available, image_url, estimasi_menit) 
VALUES
    ('c0000000-0000-0000-0000-000000000001', 1, 'Kopi Susu Gula Aren Spesial', 'Espresso ganda mantap, susu sapi segar, dan lelehan gula aren organik Cilacap.', 22000, 7500, 60, true, '/images/kopi-aren.jpg', 3),
    ('c0000000-0000-0000-0000-000000000002', 1, 'Espresso Tonic Yuzu', 'Ekstrak espresso dingin berpadu air tonik berkilau dan sentuhan citrus Yuzu segar.', 28000, 8500, 50, true, '/images/espresso-tonic.jpg', 2),
    ('c0000000-0000-0000-0000-000000000003', 1, 'Caramel Macchiato Velvet', 'Espresso kental berlapis sirup vanilla dan saus karamel panggang gurih.', 26000, 8000, 45, true, '/images/caramel-macchiato.jpg', 4),
    ('c0000000-0000-0000-0000-000000000004', 2, 'Earl Grey Cloud Milk Tea', 'Teh Earl Grey harum bergamot dengan busa susu asin manis lembut di atasnya.', 24000, 6500, 50, true, '/images/earl-grey.jpg', 3),
    ('c0000000-0000-0000-0000-000000000005', 2, 'Peach Jasmine Sparkling Tea', 'Seduhan melati wangi dipadukan sari buah persik manis dan soda dingin.', 22000, 6000, 40, true, '/images/peach-jasmine.jpg', 2),
    ('c0000000-0000-0000-0000-000000000006', 3, 'Berry Hibiscus Fizz Mocktail', 'Ekstrak bunga telang dan rosela merah dengan sirup stroberi liar menyegarkan.', 25000, 7000, 35, true, '/images/berry-fizz.jpg', 3),
    ('c0000000-0000-0000-0000-000000000007', 3, 'Tropical Mango Mint Cooler', 'Puree mangga gedong gincu manis harum dengan daun mint segar dan sparkling water.', 25000, 7000, 35, true, '/images/mango-mint.jpg', 3),
    ('c0000000-0000-0000-0000-000000000008', 4, 'Kyoto Uji Matcha Latte', 'Bubuk matcha murni impor Uji Kyoto berpadu creamy milk premium.', 28000, 9500, 50, true, '/images/matcha-latte.jpg', 4)
ON CONFLICT (id) DO UPDATE SET
    nama = EXCLUDED.nama,
    deskripsi = EXCLUDED.deskripsi,
    harga = EXCLUDED.harga,
    hpp = EXCLUDED.hpp,
    stock = EXCLUDED.stock,
    is_available = EXCLUDED.is_available;

-- 4. SEED ULASAN REPRESENTATIF
INSERT INTO tb_ulasan (id, minuman_id, nama_pelanggan, rating, komentar) 
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Rian Pramana', 5, 'Kopi arennya creamy banget, manisnya pas nggak bikin enek!'),
    ('e0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000008', 'Jessica Tan', 5, 'Matchanya pekat dan otentik banget, beneran pakai grade Uji!')
ON CONFLICT (id) DO NOTHING;

-- 5. SEED BIAYA OPERASIONAL SAMPEL (OPEX)
INSERT INTO tb_biaya_operasional (id, nama_biaya, kategori, nominal, keterangan)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'Es Batu Kristal & Cup Sealer', 'OPERASIONAL', 150000, 'Pasokan es batu 5 sak dan cup artisan bar'),
    ('f0000000-0000-0000-0000-000000000002', 'Listrik Mesin Espresso & Chiller', 'UTILITAS', 450000, 'Token listrik bulanan kedai minuman'),
    ('f0000000-0000-0000-0000-000000000003', 'WiFi Kedai 100 Mbps', 'INTERNET', 200000, 'Langganan internet WiFi Biznet')
ON CONFLICT (id) DO NOTHING;

-- 6. SEED KNOWLEDGE BASE UNTUK RAG CONCIERGE & COPILOT
INSERT INTO knowledge_base (id, category, title, content, tags, is_active)
VALUES 
    (
        'd0000000-0000-0000-0000-000000000001',
        'operasional', 
        'Jam Operasional & Fasilitas Kedai', 
        'Kedai buka setiap hari Senin s/d Minggu pukul 08:00 - 22:00 WIB. Dilengkapi WiFi 100 Mbps, stopkontak di setiap sudut meja, musala bersih, dan area outdoor nyaman.', 
        ARRAY['jam buka', 'wifi', 'colokan', 'stopkontak', 'musala', 'outdoor'], 
        TRUE
    ),
    (
        'd0000000-0000-0000-0000-000000000002',
        'menu', 
        'Pilihan Susu Nabati & Menu Ramah Alergen (Dairy-Free)', 
        'Seluruh varian latte kami (Kopi Susu, Matcha Latte) dapat disesuaikan tingkat kemanisannya (LESS/NORMAL/EXTRA). Varian Espresso Tonic dan Mocktail 100% bebas susu (dairy-free) dan sangat menyegarkan.', 
        ARRAY['oatmilk', 'dairy-free', 'vegan', 'laktosa', 'alergi susu', 'gula'], 
        TRUE
    )
ON CONFLICT (id) DO NOTHING;
