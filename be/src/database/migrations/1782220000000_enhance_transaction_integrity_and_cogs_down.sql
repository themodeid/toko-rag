-- ==============================================================================
-- 💳 MIGRATION DOWN: ENHANCE TRANSACTION INTEGRITY, IDEMPOTENCY & COGS SNAPSHOT
-- ==============================================================================

DROP INDEX IF EXISTS idx_orders_xendit_invoice;
ALTER TABLE tb_orders DROP COLUMN IF EXISTS xendit_qr_string;
ALTER TABLE tb_orders DROP COLUMN IF EXISTS xendit_payment_method;
ALTER TABLE tb_orders DROP COLUMN IF EXISTS xendit_invoice_id;

DROP INDEX IF EXISTS idx_orders_idempotency;
ALTER TABLE tb_orders DROP COLUMN IF EXISTS idempotency_key;

ALTER TABLE tb_order_items DROP COLUMN IF EXISTS hpp_satuan;
