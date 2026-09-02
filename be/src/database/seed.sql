-- ==============================================================================
-- DATABASE SEED DATA (TOKO ONLINE + POS + RAG AI)
-- File: src/database/seed.sql
-- ==============================================================================

-- 1. SEED AUTH USERS (Default Passwords: owner123, admin123, karyawan123, user123)
-- Role options: 'owner', 'admin', 'karyawan', 'user'
INSERT INTO auth (username, password, role)
VALUES 
    ('owner', '$2b$10$wiCopag8g2sqjkG3pK0Oy.HLCQbj.cUSMqFc8/5iHpLaxyYC6Hroi', 'owner'),
    ('admin', '$2b$10$uigfkcA5xU7MxBU3iKIorOK1pccmARIxJH7ac.5CrRPZLu.Pqupce', 'owner'),
    ('karyawan', '$2b$10$dQNkDZZEA0KbaYyHS10Y5.7.8EyK9Gv9vKs40N6GD0VRaWP16GvZO', 'karyawan'),
    ('user1', '$2b$10$lTFZuXHYqJ/9hKZxRAaFFepEXsYQjozjjm7Mm7ifqP.GJb6fXMnbO', 'user')
ON CONFLICT (username) DO UPDATE 
SET password = EXCLUDED.password, role = EXCLUDED.role;

-- 2. SEED SAMPLE PRODUK (Menu Utama: Matcha, Thai Tea, Americano, Croissant)
INSERT INTO produk (nama, harga, hpp, stock, status, image, kategori, deskripsi, ingredients, estimasi_menit)
VALUES 
    (
        'Matcha Latte Uji Kyoto', 
        28000, 
        11000, 
        60, 
        TRUE, 
        '/uploads/matcha.jpg', 
        'Non-Kopi', 
        '⭐ BEST SELLER #1! Minuman matcha autentik khas Uji Kyoto Jepang grade ceremonial yang dipadukan dengan fresh milk lembut. Memiliki aroma earthy alami, kaya antioksidan L-Theanine, manis pas dan creamy menyegarkan.', 
        '100% Pure Ceremonial Uji Matcha Powder Kyoto (Tanpa Pewarna Buatan), Fresh Milk Pasteurisasi / Susu UHT Segar, Simple Syrup Tebu Alami. Tersedia opsi penggantian Oat Milk (Vegan Friendly). Mengandung produk susu sapi.', 
        5
    ),
    (
        'Authentic Thai Tea Creamy', 
        24000, 
        9500, 
        55, 
        TRUE, 
        '/uploads/latte.jpg', 
        'Non-Kopi', 
        '⭐ BEST SELLER #2! Teh rempah asli Thailand (Cha Tra Mue) diseduh pekat dengan aroma vanila & bunga lawang, dipadukan kental manis dan evaporated milk. Citarasa manis, gurih legit, dan menyegarkan.', 
        'Daun Teh Hitam Asli Thailand (Cha Tra Mue Blend), Bunga Lawang (Star Anise), Biji Adas Manis, Susu Evaporasi, Susu Kental Manis, Es Kristal Higienis. Mengandung susu sapi.', 
        5
    ),
    (
        'Iced Americano Arabica Special', 
        22000, 
        8000, 
        75, 
        TRUE, 
        '/uploads/espresso.jpg', 
        'Kopi', 
        '⭐ BEST SELLER #3! Double shot espresso arabika pilihan dengan crema tebal keemasan, disajikan dengan air mineral dingin dan es batu. Citarasa bersih (clean cup), aroma floral buah segar, 0 kalori gula.', 
        'Double Shot Espresso 100% Biji Arabika Specialty (House Blend Gayo Aceh & Kintamani Bali), Air Mineral Terfiltrasi Oksigen, Es Batu Kristal. 0 Kalori Gula, 100% Bebas Susu (Dairy-Free, Gluten-Free & Vegan).', 
        3
    ),
    (
        'Butter Croissant French Artisan', 
        20000, 
        8500, 
        40, 
        TRUE, 
        '/uploads/croissant.jpg', 
        'Pastry', 
        'Pastry klasik khas Prancis dengan lapisan renyah di luar (flaky) dan lembut wangi butter premium di dalam. Dipanggang fresh setiap pagi.', 
        'Tepung Gandum Premium, French Butter 82% Lemak Nabati/Hewani Murni, Ragi Alami, Gula, Garam Laut, Susu Segar. Mengandung gluten & produk olahan susu.', 
        4
    )
ON CONFLICT DO NOTHING;

-- 3. SEED KNOWLEDGE BASE (FAQ, Kebijakan, SOP, dan Promosi untuk AI RAG)
INSERT INTO knowledge_base (category, title, content, tags, is_active)
VALUES 
    (
        'operasional', 
        'Jam Operasional & Lokasi Toko', 
        'Kafe & Toko Online kami buka setiap hari Senin s/d Minggu dari pukul 08:00 WIB hingga 22:00 WIB. Layanan take-away dan pesanan online terakhir (last order) diterima pada pukul 21:30 WIB. Lokasi fisik toko berada di Jl. Boulevard Kopi No. 88, Jakarta Selatan.', 
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
        'Kami menerima pembayaran melalui QRIS (GoPay, OVO, Dana, ShopeePay, BCA/Mandiri Mobile), Transfer Bank Virtual Account, Kartu Debit/Kredit, serta Tunai (Cash) langsung di kasir.', 
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
        'Promo Loyalty Member & Diskon Jam Kerja (Happy Hour)', 
        'Dapatkan diskon 15% untuk seluruh menu kopi setiap hari Senin - Jumat pukul 14:00 - 17:00 WIB (Happy Hour). Member terdaftar juga berhak mengumpulkan poin transaksi yang dapat ditukarkan dengan 1 cup kopi gratis setiap 10 pesanan.', 
        ARRAY['promo', 'diskon', 'happy hour', 'voucher', 'potongan harga', 'member', 'gratis', 'poin'], 
        TRUE
    )
ON CONFLICT DO NOTHING;
