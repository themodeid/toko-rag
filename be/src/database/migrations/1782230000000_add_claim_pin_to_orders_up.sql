-- Menambahkan kolom kode_klaim (4-digit Secret Pickup PIN) pada tabel tb_orders
ALTER TABLE tb_orders 
ADD COLUMN IF NOT EXISTS kode_klaim VARCHAR(6);

-- Isi otomatis nilai kode_klaim untuk pesanan yang sudah ada (4 digit angka)
UPDATE tb_orders 
SET kode_klaim = LPAD(FLOOR(RANDOM() * 9000 + 1000)::text, 4, '0') 
WHERE kode_klaim IS NULL;
