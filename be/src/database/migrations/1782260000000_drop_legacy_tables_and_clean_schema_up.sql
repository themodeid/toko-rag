-- ==============================================================================
-- 🧹 MIGRATION: CLEANUP LEGACY SCHEMA, ORPHAN TABLES & DUPLICATE STRUCTURES
-- ==============================================================================
-- Memusnahkan seluruh residu tabel lama sebelum Piagam Batasan Toko+RAG (16 Okt 2026):
-- 1. Residu Multi-Cabang: branches, branch_stocks
-- 2. Residu Absensi Staf & Promo Diskon Rumit: attendances, promos
-- 3. Residu Resep Gramasi: tb_bahan_baku, tb_resep_menu
-- 4. Residu Toko Online Lama (Duplikat): order_items, orders, produk, daily_queue, expenses, auth

-- 1. Hapus Tabel Residu Multi-Cabang & Stok Cabang
DROP TABLE IF EXISTS branch_stocks CASCADE;
DROP TABLE IF EXISTS branches CASCADE;

-- 2. Hapus Tabel Absensi & Promo Rumit
DROP TABLE IF EXISTS attendances CASCADE;
DROP TABLE IF EXISTS promos CASCADE;

-- 3. Hapus Tabel Resep Gramasi & Inventory Bahan Baku
DROP TABLE IF EXISTS tb_resep_menu CASCADE;
DROP TABLE IF EXISTS tb_bahan_baku CASCADE;

-- 4. Hapus Tabel Transaksi & Katalog Duplikat Lama
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS daily_queue CASCADE;
DROP TABLE IF EXISTS produk CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;

-- 5. Hapus Tabel Auth Lama (Seluruh akun terpusat di tb_staff)
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS auth CASCADE;
