-- ==============================================================================
-- 💳 MIGRATION: ENHANCE TRANSACTION INTEGRITY, IDEMPOTENCY & COGS SNAPSHOT
-- ==============================================================================

-- 1. Snapshot HPP Historis pada detail item pesanan
ALTER TABLE tb_order_items ADD COLUMN IF NOT EXISTS hpp_satuan INTEGER DEFAULT 0;

-- Backfill HPP historis untuk item yang sudah ada dari tb_minuman
UPDATE tb_order_items oi
SET hpp_satuan = COALESCE(m.hpp, 0)
FROM tb_minuman m
WHERE oi.minuman_id = m.id AND (oi.hpp_satuan IS NULL OR oi.hpp_satuan = 0);

-- 2. Dukungan Idempotency Key & Xendit Payment Gateway pada Header Pesanan
ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_idempotency ON tb_orders (idempotency_key) WHERE idempotency_key IS NOT NULL;

ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS xendit_invoice_id VARCHAR(100);
ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS xendit_payment_method VARCHAR(50);
ALTER TABLE tb_orders ADD COLUMN IF NOT EXISTS xendit_qr_string TEXT;
CREATE INDEX IF NOT EXISTS idx_orders_xendit_invoice ON tb_orders (xendit_invoice_id) WHERE xendit_invoice_id IS NOT NULL;
