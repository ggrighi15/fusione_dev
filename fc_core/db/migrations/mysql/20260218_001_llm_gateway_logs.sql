CREATE TABLE IF NOT EXISTS llm_gateway_logs (
    id CHAR(36) PRIMARY KEY,
    user_id VARCHAR(120) NOT NULL,
    team_id VARCHAR(120),
    case_id VARCHAR(120),
    process_id VARCHAR(120),
    provider VARCHAR(32) NOT NULL,
    model VARCHAR(120) NOT NULL,
    route_reason VARCHAR(255) NOT NULL,
    prompt_masked TEXT NOT NULL,
    response_text LONGTEXT,
    request_hash VARCHAR(64) NOT NULL,
    estimated_input_tokens INT NOT NULL DEFAULT 0,
    estimated_output_tokens INT NOT NULL DEFAULT 0,
    estimated_cost_usd DECIMAL(12,6) NOT NULL DEFAULT 0,
    latency_ms INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'ok',
    error_message TEXT,
    request_metadata JSON,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_llm_logs_user_created_at
    ON llm_gateway_logs (user_id, created_at);
CREATE INDEX idx_llm_logs_team_created_at
    ON llm_gateway_logs (team_id, created_at);
CREATE INDEX idx_llm_logs_request_hash
    ON llm_gateway_logs (request_hash);
CREATE INDEX idx_llm_logs_status_created_at
    ON llm_gateway_logs (status, created_at);

