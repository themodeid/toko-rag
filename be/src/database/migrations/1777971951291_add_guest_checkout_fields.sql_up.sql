-- ==============================================================================
-- Migration: Add Guest Checkout and Table Ordering Fields
-- ==============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name VARCHAR(100) DEFAULT 'Pelanggan';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type VARCHAR(20) DEFAULT 'DINE_IN' CHECK (order_type IN ('DINE_IN', 'TAKE_AWAY', 'DELIVERY'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS table_number VARCHAR(20) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30) NULL;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS guest_token VARCHAR(100) NULL;

CREATE INDEX IF NOT EXISTS idx_orders_guest_token ON orders(guest_token);
CREATE INDEX IF NOT EXISTS idx_orders_table_number ON orders(table_number);
