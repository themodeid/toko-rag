-- ==============================================================================
-- Migration Down: Drop Financial and Expenses Tables
-- ==============================================================================

DROP TABLE IF EXISTS expenses;
ALTER TABLE order_items DROP COLUMN IF EXISTS harga_modal;
ALTER TABLE produk DROP COLUMN IF EXISTS hpp;
