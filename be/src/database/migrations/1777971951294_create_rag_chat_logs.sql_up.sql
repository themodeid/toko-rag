-- ==============================================================================
-- Migration: Create rag_chat_logs table for Customer Insights Tracking
-- ==============================================================================

CREATE TABLE IF NOT EXISTS rag_chat_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id VARCHAR(100) NULL,
    user_message TEXT NOT NULL,
    ai_response TEXT NOT NULL,
    matched_products TEXT[] NULL,
    matched_knowledge TEXT[] NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_rag_chat_logs_created_at ON rag_chat_logs(created_at);
