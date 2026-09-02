-- ==============================================================================
-- Migration Down: Remove Guest Checkout and Table Ordering Fields
-- ==============================================================================

DROP INDEX IF EXISTS idx_orders_table_number;
DROP INDEX IF EXISTS idx_orders_guest_token;

ALTER TABLE orders DROP COLUMN IF EXISTS guest_token;
ALTER TABLE orders DROP COLUMN IF EXISTS customer_phone;
ALTER TABLE orders DROP COLUMN IF EXISTS table_number;
ALTER TABLE orders DROP COLUMN IF EXISTS order_type;
ALTER TABLE orders DROP COLUMN IF EXISTS customer_name;
