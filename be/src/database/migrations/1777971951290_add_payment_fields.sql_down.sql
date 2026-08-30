DROP INDEX IF EXISTS idx_orders_snap_token;
DROP INDEX IF EXISTS idx_orders_status_pembayaran;

ALTER TABLE orders DROP COLUMN IF EXISTS midtrans_transaction_id;
ALTER TABLE orders DROP COLUMN IF EXISTS payment_type;
ALTER TABLE orders DROP COLUMN IF EXISTS status_pembayaran;
ALTER TABLE orders DROP COLUMN IF EXISTS snap_token;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_pesanan_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_pesanan_check CHECK (
    status_pesanan IN ('ANTRI', 'DIPROSES', 'SELESAI', 'DIBATALKAN')
);
