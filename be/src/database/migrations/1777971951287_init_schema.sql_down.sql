-- ==============================================================================
-- UNIFIED DATABASE SCHEMA DOWN MIGRATION
-- ==============================================================================

DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS rag_chat_logs CASCADE;
DROP TABLE IF EXISTS expenses CASCADE;
DROP TABLE IF EXISTS daily_queue CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS knowledge_base CASCADE;
DROP TABLE IF EXISTS produk CASCADE;
DROP TABLE IF EXISTS auth CASCADE;

DROP FUNCTION IF EXISTS immutable_array_to_string(text[], text) CASCADE;
