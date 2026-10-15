-- ==============================================================================
-- MIGRATION: INVENTORY BAHAN BAKU, RECIPES & HPP ENGINE, BIAYA OPERASIONAL
-- ==============================================================================

-- 1. TABLE: tb_bahan_baku (Biji Kopi, Susu, Sirup, Cup, Sedotan, dll)
CREATE TABLE IF NOT EXISTS tb_bahan_baku (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nama_bahan VARCHAR(150) NOT NULL,
    kategori VARCHAR(50) DEFAULT 'Bahan Basah', -- Biji Kopi, Susu/Dairy, Sirup, Kemasan/Packaging
    satuan VARCHAR(20) NOT NULL, -- gr, ml, pcs, shot
    stok_saat_ini NUMERIC(12,2) NOT NULL DEFAULT 0,
    stok_minimum NUMERIC(12,2) NOT NULL DEFAULT 10,
    harga_per_satuan NUMERIC(12,2) NOT NULL DEFAULT 0, -- Harga modal per gr / per ml
    supplier VARCHAR(100) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. TABLE: tb_resep_menu (Komposisi Menu -> Formula HPP)
CREATE TABLE IF NOT EXISTS tb_resep_menu (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    produk_id UUID NOT NULL REFERENCES produk(id) ON DELETE CASCADE,
    bahan_id UUID NOT NULL REFERENCES tb_bahan_baku(id) ON DELETE CASCADE,
    jumlah_pakai NUMERIC(12,2) NOT NULL, -- misal 18 gr, 150 ml, 1 pcs
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_produk_bahan UNIQUE (produk_id, bahan_id)
);

-- 3. TABLE: tb_biaya_operasional (OPEX Toko: Sewa, Listrik, Internet, Gaji Staf)
CREATE TABLE IF NOT EXISTS tb_biaya_operasional (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    kategori VARCHAR(50) NOT NULL, -- Sewa Tempat, Listrik & Air, Gaji Karyawan, Internet, Bahan Habis Pakai
    keterangan VARCHAR(255) NOT NULL,
    nominal INTEGER NOT NULL,
    tanggal DATE NOT NULL DEFAULT CURRENT_DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexing untuk pencarian cepat
CREATE INDEX IF NOT EXISTS idx_bahan_stok ON tb_bahan_baku(stok_saat_ini);
CREATE INDEX IF NOT EXISTS idx_resep_produk ON tb_resep_menu(produk_id);
CREATE INDEX IF NOT EXISTS idx_biaya_tanggal ON tb_biaya_operasional(tanggal);
