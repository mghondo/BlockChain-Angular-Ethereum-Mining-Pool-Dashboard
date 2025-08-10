-- Initial seed data for Ethereum Mining Pool Dashboard

-- Insert Mining Pools
INSERT OR IGNORE INTO pools (id, name, api_url, fee_percentage, payout_method, minimum_payout) VALUES
('ethermine-pool-001', 'Ethermine', 'https://api.ethermine.org', 1.0, 'PPLNS', 0.01),
('f2pool-pool-002', 'F2Pool', 'https://api.f2pool.com', 2.5, 'PPS', 0.005),
('flexpool-pool-003', 'Flexpool', 'https://flexpool.io/api/v2', 1.0, 'PPLNS', 0.01),
('2miners-pool-004', '2miners', 'https://eth.2miners.com/api', 1.0, 'PPLNS', 0.01),
('nanopool-pool-005', 'Nanopool', 'https://api.nanopool.org', 1.0, 'PPLNS', 0.2);

-- Insert Sample Pool Statistics (Last 24 hours)
INSERT OR IGNORE INTO pool_statistics (id, pool_id, timestamp, hashrate, miners_count, blocks_found_24h, luck_7d, difficulty, block_time) VALUES
-- Ethermine data
('stat-eth-001', 'ethermine-pool-001', datetime('now', '-1 hour'), 750000000000000, 85000, 12, 98.5, 15500000000000000, 13),
('stat-eth-002', 'ethermine-pool-001', datetime('now', '-2 hours'), 748000000000000, 84800, 11, 97.8, 15500000000000000, 13),
('stat-eth-003', 'ethermine-pool-001', datetime('now', '-3 hours'), 752000000000000, 85200, 13, 99.2, 15500000000000000, 12),

-- F2Pool data  
('stat-f2-001', 'f2pool-pool-002', datetime('now', '-1 hour'), 320000000000000, 35000, 5, 101.2, 15500000000000000, 13),
('stat-f2-002', 'f2pool-pool-002', datetime('now', '-2 hours'), 318000000000000, 34900, 4, 100.8, 15500000000000000, 13),
('stat-f2-003', 'f2pool-pool-002', datetime('now', '-3 hours'), 322000000000000, 35100, 6, 102.1, 15500000000000000, 12),

-- Flexpool data
('stat-flex-001', 'flexpool-pool-003', datetime('now', '-1 hour'), 180000000000000, 22000, 3, 95.5, 15500000000000000, 13),
('stat-flex-002', 'flexpool-pool-003', datetime('now', '-2 hours'), 179000000000000, 21900, 2, 94.8, 15500000000000000, 13),
('stat-flex-003', 'flexpool-pool-003', datetime('now', '-3 hours'), 181000000000000, 22100, 4, 96.2, 15500000000000000, 12),

-- 2miners data
('stat-2m-001', '2miners-pool-004', datetime('now', '-1 hour'), 95000000000000, 12000, 2, 103.5, 15500000000000000, 13),
('stat-2m-002', '2miners-pool-004', datetime('now', '-2 hours'), 94000000000000, 11900, 1, 102.8, 15500000000000000, 13),
('stat-2m-003', '2miners-pool-004', datetime('now', '-3 hours'), 96000000000000, 12100, 3, 104.2, 15500000000000000, 12);

-- Insert Sample Blocks
INSERT OR IGNORE INTO blocks (id, pool_id, block_number, timestamp, reward, miner_count, difficulty, hash) VALUES
('block-001', 'ethermine-pool-001', 18500123, datetime('now', '-2 hours'), 2.08, 85000, 15500000000000000, '0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890'),
('block-002', 'ethermine-pool-001', 18500089, datetime('now', '-4 hours'), 2.12, 84800, 15500000000000000, '0x2b3c4d5e6f7890ab1234567890abcdef1234567890abcdef1234567890abcdef12'),
('block-003', 'f2pool-pool-002', 18500067, datetime('now', '-6 hours'), 2.15, 35000, 15500000000000000, '0x3c4d5e6f7890abcd567890abcdef1234567890abcdef1234567890abcdef123456'),
('block-004', 'flexpool-pool-003', 18500045, datetime('now', '-8 hours'), 2.09, 22000, 15500000000000000, '0x4d5e6f7890abcdef90abcdef1234567890abcdef1234567890abcdef1234567890'),
('block-005', '2miners-pool-004', 18500021, datetime('now', '-10 hours'), 2.11, 12000, 15500000000000000, '0x5e6f7890abcdef12cdef1234567890abcdef1234567890abcdef1234567890abcd');

-- Insert Sample Network Statistics
INSERT OR IGNORE INTO network_stats (id, timestamp, total_hashrate, difficulty, block_time, pending_transactions, gas_price) VALUES
('net-001', datetime('now', '-1 hour'), 1200000000000000, 15500000000000000, 13, 125000, 25000000000),
('net-002', datetime('now', '-2 hours'), 1198000000000000, 15480000000000000, 13, 128000, 26000000000),
('net-003', datetime('now', '-3 hours'), 1205000000000000, 15520000000000000, 12, 122000, 24500000000),
('net-004', datetime('now', '-4 hours'), 1203000000000000, 15510000000000000, 13, 126000, 25500000000),
('net-005', datetime('now', '-5 hours'), 1201000000000000, 15490000000000000, 13, 130000, 27000000000);

-- Insert Sample Alert Subscriptions
INSERT OR IGNORE INTO alert_subscriptions (id, email, pool_id, alert_type, threshold, is_active) VALUES
('alert-001', 'miner1@example.com', 'ethermine-pool-001', 'hashrate_drop', 10.0, 1),
('alert-002', 'miner1@example.com', 'ethermine-pool-001', 'new_block', NULL, 1),
('alert-003', 'miner2@example.com', 'f2pool-pool-002', 'luck_streak', 80.0, 1),
('alert-004', 'miner3@example.com', NULL, 'profitability_change', 5.0, 1),
('alert-005', 'admin@example.com', NULL, 'pool_offline', NULL, 1);