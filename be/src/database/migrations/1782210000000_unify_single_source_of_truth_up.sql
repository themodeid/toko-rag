-- ==============================================================================
-- 🥤 MIGRATION: UNIFY SINGLE SOURCE OF TRUTH (BEVERAGE BAR POS 3NF)
-- ==============================================================================

-- 1. Tambah HPP, Estimasi Menit, dan Stok ke tb_minuman
ALTER TABLE tb_minuman ADD COLUMN IF NOT EXISTS hpp INTEGER DEFAULT 0;
ALTER TABLE tb_minuman ADD COLUMN IF NOT EXISTS estimasi_menit INTEGER DEFAULT 4;
ALTER TABLE tb_minuman ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 50;

-- 2. Pastikan tabel biaya operasional (tb_biaya_operasional) ada
CREATE TABLE IF NOT EXISTS tb_biaya_operasional (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_biaya VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) NOT NULL DEFAULT 'OPERASIONAL',
    nominal INTEGER NOT NULL CHECK (nominal > 0),
    keterangan TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Update batasan role tb_staff agar mendukung owner dan admin
ALTER TABLE tb_staff DROP CONSTRAINT IF EXISTS tb_staff_role_check;
ALTER TABLE tb_staff ADD CONSTRAINT tb_staff_role_check CHECK (role IN ('kasir', 'karyawan', 'admin', 'owner'));

-- 4. Seed Akun Owner Default (password: owner123)
-- bcrypt hash $2b$10$vI8aWBnW3fID.ZQ4/zo1G.qHvhHAas.a/5iVpQv3B3E7yZ6P4aO/e (sama dengan kasir123 untuk dev)
INSERT INTO tb_staff (username, password_hash, nama, role)
VALUES ('owner', '$2b$10$vI8aWBnW3fID.ZQ4/zo1G.qHvhHAas.a/5iVpQv3B3E7yZ6P4aO/e', 'Adam Owner', 'owner')
ON CONFLICT (username) DO NOTHING;

-- 5. Seed Biaya Operasional Sampel jika kosong
INSERT INTO tb_biaya_operasional (nama_biaya, kategori, nominal, keterangan)
SELECT 'Es Batu Kristal & Cup Sealer', 'OPERASIONAL', 150000, 'Pasokan es batu 5 sak dan cup artisan bar'
WHERE NOT EXISTS (SELECT 1 FROM tb_biaya_operasional LIMIT 1);
