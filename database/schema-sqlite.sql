-- Ethereum Mining Pool Dashboard Database Schema - SQLite Version

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Mining Pools Table
CREATE TABLE pools (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    name TEXT NOT NULL UNIQUE,
    api_url TEXT NOT NULL,
    fee_percentage REAL NOT NULL,
    payout_method TEXT NOT NULL CHECK (payout_method IN ('PPS', 'PPLNS', 'PPS+')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
    minimum_payout REAL DEFAULT 0.01,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pool Statistics Table (Time-series data)
CREATE TABLE pool_statistics (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    hashrate INTEGER NOT NULL, -- in H/s
    miners_count INTEGER NOT NULL DEFAULT 0,
    blocks_found_24h INTEGER NOT NULL DEFAULT 0,
    luck_7d REAL NOT NULL DEFAULT 0, -- percentage
    difficulty INTEGER NOT NULL DEFAULT 0,
    block_time INTEGER NOT NULL DEFAULT 0, -- in seconds
    last_block_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Blocks Table
CREATE TABLE blocks (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
    block_number INTEGER NOT NULL,
    timestamp DATETIME NOT NULL,
    reward REAL NOT NULL, -- in ETH
    miner_count INTEGER NOT NULL DEFAULT 0,
    difficulty INTEGER NOT NULL,
    hash TEXT NOT NULL, -- 0x prefix + 64 hex chars
    uncle INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(pool_id, block_number)
);

-- Alert Subscriptions Table
CREATE TABLE alert_subscriptions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT NOT NULL,
    pool_id TEXT REFERENCES pools(id) ON DELETE CASCADE, -- NULL for global alerts
    alert_type TEXT NOT NULL CHECK (alert_type IN (
        'hashrate_drop', 
        'pool_offline', 
        'luck_streak', 
        'new_block', 
        'profitability_change'
    )),
    threshold REAL, -- threshold value (percentage, hashrate, etc.)
    is_active INTEGER NOT NULL DEFAULT 1, -- 0 = false, 1 = true
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(email, pool_id, alert_type)
);

-- Alert History Table
CREATE TABLE alert_history (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    subscription_id TEXT NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
    triggered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    message TEXT NOT NULL,
    email_sent INTEGER NOT NULL DEFAULT 0, -- 0 = false, 1 = true
    pool_id TEXT REFERENCES pools(id) ON DELETE SET NULL,
    trigger_value REAL, -- actual value that triggered the alert
    email_sent_at DATETIME,
    error_message TEXT
);

-- Network Statistics Table
CREATE TABLE network_stats (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    timestamp DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    total_hashrate INTEGER NOT NULL, -- in H/s
    difficulty INTEGER NOT NULL,
    block_time INTEGER NOT NULL, -- average in seconds
    pending_transactions INTEGER NOT NULL DEFAULT 0,
    gas_price INTEGER NOT NULL DEFAULT 0, -- in Wei
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- User Sessions (for future authentication)
CREATE TABLE user_sessions (
    id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
    email TEXT NOT NULL,
    session_token TEXT NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at DATETIME DEFAULT CURRENT_TIMESTAMP
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
CREATE INDEX idx_alert_subs_active ON alert_subscriptions(is_active) WHERE is_active = 1;

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

-- Latest pool statistics view (SQLite compatible)
CREATE VIEW latest_pool_stats AS
SELECT 
    pool_id,
    timestamp,
    hashrate,
    miners_count,
    blocks_found_24h,
    luck_7d,
    difficulty,
    block_time,
    last_block_time
FROM pool_statistics ps1
WHERE timestamp = (
    SELECT MAX(timestamp) 
    FROM pool_statistics ps2 
    WHERE ps2.pool_id = ps1.pool_id
);

-- Pool performance summary view (SQLite compatible)
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
    COALESCE(blocks_today.count, 0) as blocks_found_today,
    COALESCE(avg_luck.avg_luck_24h, 0) as avg_luck_24h
FROM pools p
LEFT JOIN latest_pool_stats lps ON p.id = lps.pool_id
LEFT JOIN (
    SELECT pool_id, COUNT(*) as count
    FROM blocks 
    WHERE timestamp > datetime('now', '-24 hours')
    GROUP BY pool_id
) blocks_today ON p.id = blocks_today.pool_id
LEFT JOIN (
    SELECT pool_id, AVG(luck_7d) as avg_luck_24h
    FROM pool_statistics 
    WHERE timestamp > datetime('now', '-24 hours')
    GROUP BY pool_id
) avg_luck ON p.id = avg_luck.pool_id;

-- Triggers for updated_at timestamps

-- Pools updated_at trigger
CREATE TRIGGER update_pools_timestamp 
AFTER UPDATE ON pools 
FOR EACH ROW 
BEGIN 
    UPDATE pools SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
END;

-- Alert subscriptions updated_at trigger
CREATE TRIGGER update_alert_subscriptions_timestamp 
AFTER UPDATE ON alert_subscriptions 
FOR EACH ROW 
BEGIN 
    UPDATE alert_subscriptions SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id; 
END;