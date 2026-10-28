-- ==============================================================================
-- DATABASE SEED DATA (TOKO ONLINE + POS + RAG AI - RINCI STANDARD)
-- File: src/database/seed.sql
-- ==============================================================================

-- 1. SEED AUTH USERS (Default Passwords: admin123)
INSERT INTO auth (username, password, role)
VALUES 
    ('owner', '$2b$10$4AbiyaJxukDIJc76TgRqCeSq4ReEhnjIgC.dcIUogWTZMlKRWZdxO', 'owner'),
    ('admin', '$2b$10$LiJotwE0Z9DE79tXJon3Ye3uZ6ZvJtSAxBi3uH9KU6OxGuaAZX5GO', 'admin'),
    ('karyawan', '$2b$10$WtE4QNQvOydx7VgFQfUPPu6ufK8E7PgMVZ6UwnTLmdOEh3avQNMsS', 'karyawan'),
    ('user1', '$2b$10$4AbiyaJxukDIJc76TgRqCeSq4ReEhnjIgC.dcIUogWTZMlKRWZdxO', 'user')
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = EXCLUDED.role;

-- 2. SEED MASTER PRODUK
CREATE UNIQUE INDEX IF NOT EXISTS idx_produk_nama ON produk(nama);

INSERT INTO produk (id, nama, harga, hpp, stock, status, image, kategori, deskripsi, ingredients, estimasi_menit)
VALUES 
    (
        'a0000000-0000-0000-0000-000000000001',
        'Iced Caramel Latte', 
        28000, 
        8500, 
        100, 
        TRUE, 
        '/uploads/caramel_latte.jpg', 
        'Kopi', 
        '⭐ Signature Coffee! Espresso double shot dipadukan dengan sirup karamel bakar dan susu segar dingin berkualitas tinggi.', 
        'Double shot espresso arabika, susu segar pasteurisasi, sirup karamel, es batu kristal.', 
        3
    ),
    (
        'a0000000-0000-0000-0000-000000000002',
        'Iced Americano Arabica', 
        20000, 
        4500, 
        150, 
        TRUE, 
        '/uploads/americano.jpg', 
        'Kopi', 
        'Double shot espresso 100% Arabika specialty dengan air dingin terfiltrasi. Rasa bersih, aroma buah segar, 0 kalori gula.', 
        'Double shot espresso arabika, air mineral dingin, es batu kristal.', 
        2
    ),
    (
        'a0000000-0000-0000-0000-000000000003',
        'Kyoto Matcha Latte', 
        26000, 
        9200, 
        80, 
        TRUE, 
        '/uploads/matcha_latte.jpg', 
        'Non-Kopi', 
        'Bubuk matcha premium asli Uji Kyoto dipadukan dengan steamed fresh milk. Rasa gurih alami, kaya antioksidan, dan manis seimbang.', 
        'Pure ceremonial matcha powder, fresh milk, sirup tebu alami, es batu.', 
        4
    ),
    (
        'a0000000-0000-0000-0000-000000000004',
        'Creamy Thai Tea', 
        18000, 
        5100, 
        90, 
        TRUE, 
        '/uploads/thai_tea.jpg', 
        'Non-Kopi', 
        'Teh rempah wangi asli Thailand diseduh pekat dengan susu evaporasi dan kental manis gurih legit.', 
        'Daun teh hitam Thailand, susu evaporasi, susu kental manis, es kristal.', 
        3
    ),
    (
        'a0000000-0000-0000-0000-000000000005',
        'Butter Croissant Artisan', 
        22000, 
        11000, 
        35, 
        TRUE, 
        '/uploads/croissant.jpg', 
        'Pastry', 
        'Pastry klasik Prancis renyah berlapis dengan mentega murni New Zealand, dipanggang segar setiap pagi.', 
        'Tepung terigu protein tinggi, pure butter New Zealand, ragi, garam laut.', 
        2
    )
ON CONFLICT (nama) DO UPDATE 
SET harga = EXCLUDED.harga,
    hpp = EXCLUDED.hpp,
    stock = EXCLUDED.stock,
    kategori = EXCLUDED.kategori,
    deskripsi = EXCLUDED.deskripsi,
    ingredients = EXCLUDED.ingredients;

-- 3. SEED INVENTORY BAHAN BAKU
INSERT INTO tb_bahan_baku (id, nama_bahan, kategori, satuan, stok_saat_ini, stok_minimum, harga_per_satuan, supplier)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Biji Kopi House Blend Arabika', 'Biji Kopi', 'gr', 4500.00, 1000.00, 250.00, 'Gayo Specialty Coffee Roaster'),
    ('b0000000-0000-0000-0000-000000000002', 'Fresh Milk Pasteurisasi (Greenfield)', 'Susu/Dairy', 'ml', 1500.00, 3000.00, 20.00, 'Distributor Susu Sejahtera'), -- alert: below minimum!
    ('b0000000-0000-0000-0000-000000000003', 'Oat Milk Barista Edition', 'Susu/Dairy', 'ml', 800.00, 2000.00, 45.00, 'Oatside Direct'), -- alert: below minimum!
    ('b0000000-0000-0000-0000-000000000004', 'Sirup Karamel Monin', 'Sirup', 'ml', 1200.00, 500.00, 180.00, 'PT Sumber Sirup Alami'),
    ('b0000000-0000-0000-0000-000000000005', 'Ceremonial Matcha Powder', 'Bahan Kering', 'gr', 850.00, 300.00, 600.00, 'Kyoto Import Trade'),
    ('b0000000-0000-0000-0000-000000000006', 'Cup Plastik 16oz + Lid + Straw', 'Kemasan', 'pcs', 450.00, 150.00, 1000.00, 'Pabrik Kemasan Prima')
ON CONFLICT (id) DO UPDATE
SET stok_saat_ini = EXCLUDED.stok_saat_ini,
    harga_per_satuan = EXCLUDED.harga_per_satuan,
    stok_minimum = EXCLUDED.stok_minimum;

-- 4. SEED RESEP MENU (Menghubungkan Menu ke Bahan Baku)
INSERT INTO tb_resep_menu (produk_id, bahan_id, jumlah_pakai)
VALUES
    -- Iced Caramel Latte
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 18.00), -- 18 gr kopi (Rp 4.500)
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 120.00), -- 120 ml susu (Rp 2.400)
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000004', 15.00), -- 15 ml sirup (Rp 2.700)
    ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000006', 1.00),  -- 1 cup set (Rp 1.000)
    -- Iced Americano Arabica
    ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 18.00), -- 18 gr kopi (Rp 4.500)
    ('a0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000006', 1.00),  -- 1 cup set (Rp 1.000)
    -- Kyoto Matcha Latte
    ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000005', 8.00),  -- 8 gr matcha (Rp 4.800)
    ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000002', 150.00), -- 150 ml susu (Rp 3.000)
    ('a0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000006', 1.00)   -- 1 cup set (Rp 1.000)
ON CONFLICT (produk_id, bahan_id) DO UPDATE
SET jumlah_pakai = EXCLUDED.jumlah_pakai;

-- 5. SEED BIAYA OPERASIONAL (OPEX BULAN INI)
INSERT INTO tb_biaya_operasional (kategori, keterangan, nominal, tanggal)
VALUES
    ('Sewa Tempat', 'Sewa ruko kafe bulan September 2026', 1800000, CURRENT_DATE),
    ('Listrik & Air', 'Tagihan PLN & PAM mesin espresso & chiller', 650000, CURRENT_DATE),
    ('Gaji Karyawan', 'Insentif barista paruh waktu', 500000, CURRENT_DATE),
    ('Internet', 'WiFi kafe Biznet 100 Mbps', 200000, CURRENT_DATE)
ON CONFLICT DO NOTHING;

-- 6. SEED KNOWLEDGE BASE RAG
INSERT INTO knowledge_base (category, title, content, tags, is_active)
VALUES 
    (
        'operasional', 
        'Jam Operasional & Fasilitas Kafe', 
        'Kafe buka setiap hari Senin s/d Minggu pukul 08:00 - 22:00 WIB. Dilengkapi WiFi kencang 100 Mbps, banyak stopkontak di setiap meja, musala bersih, dan area outdoor ramah merokok.', 
        ARRAY['jam buka', 'wifi', 'colokan', 'stopkontak', 'musala', 'outdoor', 'smoking area'], 
        TRUE
    ),
    (
        'menu', 
        'Pilihan Susu Nabati & Menu Ramah Alergen (Dairy-Free)', 
        'Seluruh varian latte kami (Caramel Latte, Matcha Latte) dapat di-upgrade menggunakan Oat Milk (Oatside) untuk pelanggan vegetarian atau intoleransi laktosa (dairy-free). Varian Iced Americano 100% bebas gula dan bebas susu.', 
        ARRAY['oatmilk', 'dairy-free', 'vegan', 'laktosa', 'alergi susu', 'gula'], 
        TRUE
    )
ON CONFLICT DO NOTHING;
