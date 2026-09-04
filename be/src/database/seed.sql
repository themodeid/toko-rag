-- ==============================================================================
-- DATABASE SEED DATA (TOKO ONLINE + POS + RAG AI - SINGLE CAFE)
-- File: src/database/seed.sql
-- ==============================================================================

-- 1. SEED AUTH USERS (Default Passwords: admin123 untuk semua akun testing)
INSERT INTO auth (username, password, role)
VALUES 
    ('owner', '$2b$10$4AbiyaJxukDIJc76TgRqCeSq4ReEhnjIgC.dcIUogWTZMlKRWZdxO', 'owner'),
    ('admin', '$2b$10$4AbiyaJxukDIJc76TgRqCeSq4ReEhnjIgC.dcIUogWTZMlKRWZdxO', 'owner'),
    ('karyawan', '$2b$10$4AbiyaJxukDIJc76TgRqCeSq4ReEhnjIgC.dcIUogWTZMlKRWZdxO', 'karyawan'),
    ('user1', '$2b$10$4AbiyaJxukDIJc76TgRqCeSq4ReEhnjIgC.dcIUogWTZMlKRWZdxO', 'user')
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = EXCLUDED.role;

-- 2. SEED MASTER PRODUK (Data Menu Real Kustom Pengguna)
INSERT INTO produk (nama, harga, hpp, stock, status, image, kategori, deskripsi, ingredients, estimasi_menit)
VALUES 
    (
        'Matcha Latte', 
        5000, 
        2500, 
        60, 
        TRUE, 
        '/uploads/1788427856083-389802389.jpg', 
        'Non-Kopi', 
        '⭐ BEST SELLER #1! Minuman matcha autentik khas Uji Kyoto Jepang grade ceremonial yang dipadukan dengan fresh milk lembut. Memiliki aroma earthy alami, kaya antioksidan L-Theanine, manis pas dan creamy menyegarkan.', 
        '100% Pure Ceremonial Uji Matcha Powder Kyoto (Tanpa Pewarna Buatan), Fresh Milk Pasteurisasi / Susu UHT Segar, Simple Syrup Tebu Alami. Tersedia opsi penggantian Oat Milk (Vegan Friendly). Mengandung produk susu sapi.', 
        5
    ),
    (
        'Authentic Thai Tea Creamy', 
        5000, 
        2500, 
        55, 
        TRUE, 
        '/uploads/1788427877885-268759234.jpg', 
        'Non-Kopi', 
        '⭐ BEST SELLER #2! Teh rempah asli Thailand (Cha Tra Mue) diseduh pekat dengan aroma vanila & bunga lawang, dipadukan kental manis dan evaporated milk. Citarasa manis, gurih legit, dan menyegarkan.', 
        'Daun Teh Hitam Asli Thailand (Cha Tra Mue Blend), Bunga Lawang (Star Anise), Biji Adas Manis, Susu Evaporasi, Susu Kental Manis, Es Kristal Higienis. Mengandung susu sapi.', 
        5
    ),
    (
        'Iced Americano Arabica Special', 
        5000, 
        2500, 
        75, 
        TRUE, 
        '/uploads/1788427809020-981719856.jpg', 
        'Kopi', 
        '⭐ BEST SELLER #3! Double shot espresso arabika pilihan dengan crema tebal keemasan, disajikan dengan air mineral dingin dan es batu. Citarasa bersih (clean cup), aroma floral buah segar, 0 kalori gula.', 
        'Double Shot Espresso 100% Biji Arabika Specialty (House Blend Gayo Aceh & Kintamani Bali), Air Mineral Terfiltrasi Oksigen, Es Batu Kristal. 0 Kalori Gula, 100% Bebas Susu (Dairy-Free, Gluten-Free & Vegan).', 
        1
    )
ON CONFLICT (nama) DO UPDATE 
SET harga = EXCLUDED.harga,
    hpp = EXCLUDED.hpp,
    stock = EXCLUDED.stock,
    status = EXCLUDED.status,
    image = EXCLUDED.image,
    kategori = EXCLUDED.kategori,
    deskripsi = EXCLUDED.deskripsi,
    ingredients = EXCLUDED.ingredients,
    estimasi_menit = EXCLUDED.estimasi_menit,
    deleted_at = NULL;

-- 3. SEED VOUCHER PROMO DISKON
INSERT INTO promos (id, kode_promo, deskripsi, tipe, nilai, min_order, max_potongan, kuota, kuota_terpakai, is_active)
VALUES 
    (
        '73db965e-4416-45f9-ad05-42b443f23f68',
        'DISKON10',
        'Promo Diskon 10% Spesial Toko RAG',
        'PERCENTAGE',
        10,
        30000,
        25000,
        100,
        0,
        TRUE
    ),
    (
        'db7fc3c1-3738-4c6a-97d5-8bd1bd86762e',
        'HEMAT15K',
        'Potongan Langsung Rp 15.000',
        'FIXED',
        15000,
        50000,
        15000,
        50,
        0,
        TRUE
    )
ON CONFLICT (kode_promo) DO NOTHING;

-- 4. SEED KNOWLEDGE BASE (FAQ, Kebijakan, SOP, dan Promosi untuk AI RAG)
INSERT INTO knowledge_base (category, title, content, tags, is_active)
VALUES 
    (
        'operasional', 
        'Jam Operasional & Lokasi Toko', 
        'Kafe & Toko Online kami buka setiap hari Senin s/d Minggu dari pukul 08:00 WIB hingga 22:00 WIB. Layanan take-away dan pesanan online terakhir (last order) diterima pada pukul 21:30 WIB. Lokasi fisik kafe berada di Jl. Boulevard Kopi No. 88.', 
        ARRAY['jam buka', 'jam operasional', 'lokasi', 'alamat', 'toko', 'buka', 'tutup', 'last order'], 
        TRUE
    ),
    (
        'kebijakan', 
        'Kebijakan Garansi & Retur / Penggantian Menu', 
        'Jika pesanan yang Anda terima rusak, tumpah saat pengiriman, atau rasa/suhu tidak sesuai standar, kami memberikan garansi penggantian produk 100% GRATIS atau refund. Cukup laporkan ke kasir atau admin WhatsApp dengan menyertakan foto struk/antrian dalam kurun waktu maksimal 1x24 jam setelah pesanan diterima.', 
        ARRAY['garansi', 'retur', 'refund', 'ganti', 'rusak', 'salah pesanan', 'tumpah', 'komplain'], 
        TRUE
    ),
    (
        'pembayaran', 
        'Metode Pembayaran', 
        'Kami menerima pembayaran melalui QRIS (GoPay, OVO, Dana, ShopeePay, BCA/Mandiri Mobile), Transfer Bank Virtual Account Xendit, Kartu Debit/Kredit, serta Tunai (Cash) langsung di kasir.', 
        ARRAY['pembayaran', 'bayar', 'qris', 'gopay', 'ovo', 'dana', 'transfer', 'kartu debit', 'cash', 'tunai'], 
        TRUE
    ),
    (
        'faq', 
        'Sertifikasi Halal & Standar Kebersihan', 
        'Seluruh produk minuman kopi, teh, dan pastry kami diolah menggunakan 100% bahan baku bersertifikat Halal, tanpa alkohol, dan tanpa bahan pengawet berbahaya. Area dapur dan bar disanitasi secara higienis setiap 2 jam.', 
        ARRAY['halal', 'higienis', 'kebersihan', 'alkohol', 'sertifikat', 'aman', 'kualitas'], 
        TRUE
    ),
    (
        'promo', 
        'Promo Loyalty Member & Voucher Diskon', 
        'Gunakan kode promo DISKON10 untuk diskon 10% atau HEMAT15K untuk potongan langsung Rp 15.000 saat checkout di website atau kasir.', 
        ARRAY['promo', 'diskon', 'voucher', 'potongan harga', 'hemat15k', 'diskon10'], 
        TRUE
    )
ON CONFLICT DO NOTHING;
