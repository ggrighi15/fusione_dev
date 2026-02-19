CREATE TABLE IF NOT EXISTS llm_gateway_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    team_id TEXT,
    case_id TEXT,
    process_id TEXT,
    provider TEXT NOT NULL,
    model TEXT NOT NULL,
    route_reason TEXT NOT NULL,
    prompt_masked TEXT NOT NULL,
    response_text TEXT,
    request_hash TEXT NOT NULL,
    estimated_input_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_output_tokens INTEGER NOT NULL DEFAULT 0,
    estimated_cost_usd NUMERIC NOT NULL DEFAULT 0,
    latency_ms INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'ok',
    error_message TEXT,
    request_metadata TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_llm_logs_user_created_at
    ON llm_gateway_logs (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_logs_team_created_at
    ON llm_gateway_logs (team_id, created_at);
CREATE INDEX IF NOT EXISTS idx_llm_logs_request_hash
    ON llm_gateway_logs (request_hash);
CREATE INDEX IF NOT EXISTS idx_llm_logs_status_created_at
    ON llm_gateway_logs (status, created_at);

