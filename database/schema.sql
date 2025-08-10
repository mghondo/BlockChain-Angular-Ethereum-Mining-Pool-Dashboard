-- Ethereum Mining Pool Dashboard Database Schema
-- Supports both SQLite and PostgreSQL

-- Mining Pools Table
CREATE TABLE pools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(), -- PostgreSQL: Use UUID, SQLite: TEXT
    name VARCHAR(100) NOT NULL UNIQUE,
    api_url VARCHAR(255) NOT NULL,
    fee_percentage DECIMAL(5,2) NOT NULL,
    payout_method VARCHAR(10) NOT NULL CHECK (payout_method IN ('PPS', 'PPLNS', 'PPS+')),
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    minimum_payout DECIMAL(18,8) DEFAULT 0.01,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Pool Statistics Table (Time-series data)
CREATE TABLE pool_statistics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hashrate BIGINT NOT NULL, -- in H/s
    miners_count INTEGER NOT NULL DEFAULT 0,
    blocks_found_24h INTEGER NOT NULL DEFAULT 0,
    luck_7d DECIMAL(8,4) NOT NULL DEFAULT 0, -- percentage
    difficulty BIGINT NOT NULL DEFAULT 0,
    block_time INTEGER NOT NULL DEFAULT 0, -- in seconds
    last_block_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Blocks Table
CREATE TABLE blocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pool_id UUID NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMP NOT NULL,
    reward DECIMAL(18,8) NOT NULL, -- in ETH
    miner_count INTEGER NOT NULL DEFAULT 0,
    difficulty BIGINT NOT NULL,
    hash VARCHAR(66) NOT NULL, -- 0x prefix + 64 hex chars
    uncle BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(pool_id, block_number)
);

-- Alert Subscriptions Table
CREATE TABLE alert_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    pool_id UUID REFERENCES pools(id) ON DELETE CASCADE, -- NULL for global alerts
    alert_type VARCHAR(30) NOT NULL CHECK (alert_type IN (
        'hashrate_drop', 
        'pool_offline', 
        'luck_streak', 
        'new_block', 
        'profitability_change'
    )),
    threshold DECIMAL(10,2), -- threshold value (percentage, hashrate, etc.)
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(email, pool_id, alert_type)
);

-- Alert History Table
CREATE TABLE alert_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
    triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL,
    email_sent BOOLEAN NOT NULL DEFAULT FALSE,
    pool_id UUID REFERENCES pools(id) ON DELETE SET NULL,
    trigger_value DECIMAL(15,6), -- actual value that triggered the alert
    email_sent_at TIMESTAMP,
    error_message TEXT
);

-- Network Statistics Table
CREATE TABLE network_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_hashrate BIGINT NOT NULL, -- in H/s
    difficulty BIGINT NOT NULL,
    block_time INTEGER NOT NULL, -- average in seconds
    pending_transactions INTEGER NOT NULL DEFAULT 0,
    gas_price BIGINT NOT NULL DEFAULT 0, -- in Wei
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions (for future authentication)
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Performance

-- Pool statistics indexes
CREATE INDEX idx_pool_stats_pool_timestamp ON pool_statistics(pool_id, timestamp DESC);
CREATE INDEX idx_pool_stats_timestamp ON pool_statistics(timestamp DESC);

-- Blocks indexes
CREATE INDEX idx_blocks_pool_timestamp ON blocks(pool_id, timestamp DESC);
CREATE INDEX idx_blocks_block_number ON blocks(block_number DESC);
CREATE INDEX idx_blocks_timestamp ON blocks(timestamp DESC);

-- Alert subscriptions indexes
CREATE INDEX idx_alert_subs_email ON alert_subscriptions(email);
CREATE INDEX idx_alert_subs_pool ON alert_subscriptions(pool_id);
CREATE INDEX idx_alert_subs_active ON alert_subscriptions(is_active) WHERE is_active = TRUE;

-- Alert history indexes
CREATE INDEX idx_alert_history_subscription ON alert_history(subscription_id, triggered_at DESC);
CREATE INDEX idx_alert_history_triggered ON alert_history(triggered_at DESC);

-- Network stats index
CREATE INDEX idx_network_stats_timestamp ON network_stats(timestamp DESC);

-- User sessions indexes
CREATE INDEX idx_user_sessions_email ON user_sessions(email);
CREATE INDEX idx_user_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_user_sessions_expires ON user_sessions(expires_at);

-- Views for Common Queries

-- Latest pool statistics view
CREATE VIEW latest_pool_stats AS
SELECT DISTINCT ON (pool_id) 
    pool_id,
    timestamp,
    hashrate,
    miners_count,
    blocks_found_24h,
    luck_7d,
    difficulty,
    block_time,
    last_block_time
FROM pool_statistics
ORDER BY pool_id, timestamp DESC;

-- Pool performance summary view
CREATE VIEW pool_performance_summary AS
SELECT 
    p.id,
    p.name,
    p.fee_percentage,
    p.payout_method,
    p.status,
    lps.hashrate,
    lps.miners_count,
    lps.luck_7d,
    COUNT(b.id) as blocks_found_today,
    AVG(ps_24h.luck_7d) as avg_luck_24h
FROM pools p
LEFT JOIN latest_pool_stats lps ON p.id = lps.pool_id
LEFT JOIN blocks b ON p.id = b.pool_id AND b.timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
LEFT JOIN pool_statistics ps_24h ON p.id = ps_24h.pool_id AND ps_24h.timestamp > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY p.id, p.name, p.fee_percentage, p.payout_method, p.status, lps.hashrate, lps.miners_count, lps.luck_7d;