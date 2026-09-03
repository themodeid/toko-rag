-- Migration DOWN: Attendance and Promo
ALTER TABLE orders DROP COLUMN IF EXISTS discount_amount;
ALTER TABLE orders DROP COLUMN IF EXISTS promo_id;
DROP TABLE IF EXISTS promos CASCADE;
DROP TABLE IF EXISTS attendances CASCADE;
