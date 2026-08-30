-- ==============================================================================
-- Migration: Add Payment and Midtrans Fields to Orders
-- ==============================================================================

-- 1. Update check constraint for status_pesanan
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_pesanan_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_pesanan_check CHECK (
    status_pesanan IN ('MENUNGGU_PEMBAYARAN', 'ANTRI', 'DIPROSES', 'SELESAI', 'DIBATALKAN')
);

-- 2. Add columns for Midtrans Payment Gateway
ALTER TABLE orders ADD COLUMN IF NOT EXISTS snap_token TEXT NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS status_pembayaran VARCHAR(30) DEFAULT 'PENDING';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS midtrans_transaction_id TEXT NULL;

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_orders_status_pembayaran ON orders(status_pembayaran);
CREATE INDEX IF NOT EXISTS idx_orders_snap_token ON orders(snap_token);
