CREATE INDEX IF NOT EXISTS idx_llm_logs_created_at
    ON llm_gateway_logs (created_at);
CREATE INDEX IF NOT EXISTS idx_llm_logs_provider_created_at
    ON llm_gateway_logs (provider, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_logs_route_reason_created_at
    ON llm_gateway_logs (route_reason, created_at);

