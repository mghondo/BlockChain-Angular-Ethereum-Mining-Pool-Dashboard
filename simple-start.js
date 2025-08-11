/**
 * Ethereum Mining Pool Dashboard - Backend API Server
 * 
 * This file provides a complete REST API for mining pool data with dynamic,
 * real-time updates. It simulates live mining pool statistics including
 * hashrate fluctuations, miner count changes, and new block discoveries.
 * 
 * Features:
 * - Dynamic data generation with realistic variations
 * - Automatic new block generation every 3-8 minutes
 * - Pool statistics that change every 15 seconds
 * - RESTful API endpoints for all mining data
 * - CORS enabled for frontend integration
 * 
 * Author: Mining Dashboard Team
 * Version: 1.0.0
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import the external API service
const { ExternalAPIService } = require('./backend/src/services/ExternalAPIService.js');

// Initialize the API service
const apiService = new ExternalAPIService();

const app = express();
const port = 3000;

// Middleware Configuration
app.use(cors()); // Enable Cross-Origin Resource Sharing for frontend
app.use(express.json()); // Parse JSON request bodies

// ================================================================
// DATA CONFIGURATION
// ================================================================

/**
 * Base pool configuration - These are the foundation values for major mining pools
 * Each pool has constant properties (fees, payout methods) and base values that
 * will be modified by dynamic variations to simulate real-time changes.
 */
const basePools = [
  {
    id: 'ethermine-001',
    name: 'Ethermine',                    // Pool name displayed in UI
    fee_percentage: 1.0,                  // Pool fee (constant)
    payout_method: 'PPLNS',              // Pay Per Last N Shares
    status: 'active',                     // Pool status
    base_hashrate: 750000000000000,       // 750 TH/s base hashrate
    base_miners: 85000,                   // 85K base miner count
    base_luck: 98.5,                      // 98.5% base luck percentage
    minimum_payout: 0.01                  // Minimum payout threshold in ETH
  },
  {
    id: 'f2pool-002', 
    name: 'F2Pool',
    fee_percentage: 2.5,
    payout_method: 'PPS',
    status: 'active',
    base_hashrate: 320000000000000,
    base_miners: 35000,
    base_luck: 101.2,
    minimum_payout: 0.005
  },
  {
    id: 'flexpool-003',
    name: 'Flexpool', 
    fee_percentage: 1.0,
    payout_method: 'PPLNS',
    status: 'active',
    base_hashrate: 180000000000000,
    base_miners: 22000,
    base_luck: 95.5,
    minimum_payout: 0.01
  },
  {
    id: '2miners-004',
    name: '2miners',
    fee_percentage: 1.0, 
    payout_method: 'PPLNS',
    status: 'active',
    base_hashrate: 95000000000000,
    base_miners: 12000,
    base_luck: 103.5,
    minimum_payout: 0.01
  }
];

// ================================================================
// DYNAMIC DATA STATE MANAGEMENT
// ================================================================

/**
 * Global state variables for managing dynamic data changes
 * These variables track the current state of variations and block generation
 */
let poolVariations = {};                              // Stores current variations for each pool
let lastBlockTime = Date.now() - (2 * 60 * 60 * 1000); // Initialize 2 hours ago
let blockCounter = 18500123;                          // Current block number counter
let dynamicBlocks = [];                               // Array of recent blocks found

/**
 * Initialize variations for each pool
 * Each pool gets its own variation tracking object with multipliers and trends
 */
basePools.forEach(pool => {
  poolVariations[pool.id] = {
    hashrateMultiplier: 1.0,              // Current hashrate multiplier (starts at 1.0 = 100%)
    minersMultiplier: 1.0,                // Current miner count multiplier
    luckOffset: 0,                        // Offset from base luck percentage
    trend: Math.random() > 0.5 ? 1 : -1   // Random initial trend direction
  };
});

// Generate some initial blocks to populate the dashboard
generateInitialBlocks();

/**
 * Generate initial blocks for dashboard display
 * Creates 3 sample blocks with realistic timestamps and rewards
 */
function generateInitialBlocks() {
  dynamicBlocks = [
    {
      pool_id: 'ethermine-001',
      block_number: blockCounter++,                      // Increment block counter
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      reward: 2.08 + (Math.random() - 0.5) * 0.4,       // Random reward around 2.08 ETH
      pool_name: 'Ethermine'
    },
    {
      pool_id: 'f2pool-002', 
      block_number: blockCounter++,
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      reward: 2.12 + (Math.random() - 0.5) * 0.4,
      pool_name: 'F2Pool'
    },
    {
      pool_id: 'flexpool-003',
      block_number: blockCounter++,
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      reward: 2.15 + (Math.random() - 0.5) * 0.4,
      pool_name: 'Flexpool'
    }
  ];
}

// ================================================================
// DYNAMIC DATA GENERATION FUNCTIONS
// ================================================================

/**
 * Update pool variations to simulate real-time changes
 * This function is called every 15 seconds to create realistic fluctuations
 * in hashrate, miner counts, and luck percentages
 */
function updatePoolVariations() {
  basePools.forEach(pool => {
    const variation = poolVariations[pool.id];
    
    // Update hashrate with realistic ±5% variation and trending behavior
    const hashrateChange = (Math.random() - 0.5) * 0.02 * variation.trend;
    variation.hashrateMultiplier += hashrateChange;
    variation.hashrateMultiplier = Math.max(0.90, Math.min(1.15, variation.hashrateMultiplier)); // Clamp between 90-115%
    
    // Update miner count with smaller ±3% variation (miners don't fluctuate as much)
    const minersChange = (Math.random() - 0.5) * 0.01;
    variation.minersMultiplier += minersChange;
    variation.minersMultiplier = Math.max(0.95, Math.min(1.08, variation.minersMultiplier)); // Clamp between 95-108%
    
    // Update luck percentage with ±10 point variation and persistence
    const luckChange = (Math.random() - 0.5) * 2;
    variation.luckOffset += luckChange * 0.3; // Make changes sticky (30% of random change)
    variation.luckOffset = Math.max(-15, Math.min(15, variation.luckOffset)); // Clamp ±15 points
    
    // Occasionally flip the trend direction (10% chance)
    if (Math.random() < 0.1) {
      variation.trend *= -1;
    }
  });
  
  console.log('📊 Pool data variations updated');
}

// Function to generate dynamic pools with current variations
function generateDynamicPools() {
  return basePools.map(pool => {
    const variation = poolVariations[pool.id];
    
    return {
      id: pool.id,
      name: pool.name,
      fee_percentage: pool.fee_percentage,
      payout_method: pool.payout_method,
      status: pool.status,
      hashrate: Math.round(pool.base_hashrate * variation.hashrateMultiplier),
      miners_count: Math.round(pool.base_miners * variation.minersMultiplier),
      luck_7d: Number((pool.base_luck + variation.luckOffset).toFixed(1)),
      minimum_payout: pool.minimum_payout
    };
  });
}

// Function to maybe generate a new block
function maybeGenerateNewBlock() {
  const now = Date.now();
  const timeSinceLastBlock = now - lastBlockTime;
  const minBlockTime = 3 * 60 * 1000; // 3 minutes minimum
  const avgBlockTime = 8 * 60 * 1000; // 8 minutes average
  
  // Probability increases over time since last block
  const probability = Math.min((timeSinceLastBlock - minBlockTime) / avgBlockTime, 0.3);
  
  if (timeSinceLastBlock > minBlockTime && Math.random() < probability) {
    // Generate new block
    const randomPool = basePools[Math.floor(Math.random() * basePools.length)];
    const newBlock = {
      pool_id: randomPool.id,
      block_number: blockCounter++,
      timestamp: new Date(),
      reward: Number((2.0 + Math.random() * 0.5).toFixed(3)),
      pool_name: randomPool.name
    };
    
    // Add to beginning of array and keep only last 5 blocks
    dynamicBlocks.unshift(newBlock);
    dynamicBlocks = dynamicBlocks.slice(0, 5);
    
    lastBlockTime = now;
    console.log(`⛏️  New block found! #${newBlock.block_number} by ${newBlock.pool_name}`);
  }
}

// Start dynamic data updates
setInterval(() => {
  updatePoolVariations();
  maybeGenerateNewBlock();
}, 15000); // Update every 15 seconds

console.log('🔄 Dynamic data generation started - data will change every 15 seconds!');

// ================================================================
// REST API ENDPOINTS
// ================================================================

/**
 * Health Check Endpoint
 * Returns server status, uptime, and environment information
 * Used by monitoring systems and frontend to verify API availability
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: 'development'
  });
});

/**
 * Get All Mining Pools
 * Returns current statistics for all active mining pools with real API data
 * Data includes hashrate, miner counts, luck percentages, and fees
 */
app.get('/api/pools', async (req, res) => {
  try {
    const pools = await apiService.getAllPoolsData();
    res.json({
      success: true,
      data: pools,                           // Array of pool objects with real stats
      timestamp: new Date().toISOString()    // When this data was generated
    });
  } catch (error) {
    console.error('❌ Error fetching pools data:', error.message);
    res.status(503).json({
      success: false,
      error: 'Failed to fetch real mining pool data',
      message: 'External API services are unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get Specific Pool Details
 * Returns detailed information for a single mining pool by ID
 * Used for pool-specific dashboard views and detailed analysis
 */
app.get('/api/pools/:id', async (req, res) => {
  try {
    const pools = await apiService.getAllPoolsData();
    const pool = pools.find(p => p.id === req.params.id);
    
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: pool,                           // Single pool object with real stats
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pool details:', error);
    // Fallback to mock data if API fails
    const dynamicPools = generateDynamicPools();
    const pool = dynamicPools.find(p => p.id === req.params.id);
    
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found',
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      data: pool,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    });
  }
});

app.get('/api/pools/compare', async (req, res) => {
  try {
    const pools = await apiService.getAllPoolsData();
    const poolIds = req.query.pools ? req.query.pools.split(',') : [];
    const filteredPools = pools.filter(p => poolIds.includes(p.id));
    
    const comparisonData = filteredPools.map(pool => ({
      ...pool,
      recommendation_score: calculateRecommendationScore(pool)
    }));
    
    res.json({
      success: true,
      data: comparisonData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pool comparison data:', error);
    // Fallback to mock data if API fails
    const dynamicPools = generateDynamicPools();
    const poolIds = req.query.pools ? req.query.pools.split(',') : [];
    const filteredPools = dynamicPools.filter(p => poolIds.includes(p.id));
    
    const comparisonData = filteredPools.map(pool => ({
      ...pool,
      recommendation_score: calculateRecommendationScore(pool)
    }));
    
    res.json({
      success: true,
      data: comparisonData,
      timestamp: new Date().toISOString(),
      source: 'fallback'
    });
  }
});

app.get('/api/stats/dashboard', async (req, res) => {
  try {
    const stats = await apiService.getDashboardStats();
    res.json({
      success: true,
      data: {
        ...stats,
        data_sources: {
          eth_price: 'CoinGecko API',
          gas_price: 'Etherscan API',
          mining_pools: 'Bitcoin Mining Pools (mempool.space)',
          recent_blocks: 'Bitcoin Blockchain (mempool.space)',
          cache_status: '30s cache active'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Error fetching dashboard stats:', error.message);
    res.status(503).json({
      success: false,
      error: 'Failed to fetch real dashboard statistics',
      message: 'External API services are unavailable',
      timestamp: new Date().toISOString()
    });
  }
});

app.get('/api/pools/:id/history', async (req, res) => {
  const { id } = req.params;
  
  try {
    const pools = await apiService.getAllPoolsData();
    const pool = pools.find(p => p.id === id);
    
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate historical data based on current pool state (APIs don't provide historical data easily)
    const history = [];
    for (let i = 0; i < 24; i++) {
      const timeVariation = i * 0.02; // Gradual change over time
      history.push({
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
        hashrate: pool.hashrate + (Math.random() - 0.5 + timeVariation) * pool.hashrate * 0.08,
        miners_count: pool.miners_count + Math.floor((Math.random() - 0.5 + timeVariation) * 800),
        luck_7d: pool.luck_7d + (Math.random() - 0.5 + timeVariation) * 8,
        blocks_found_24h: Math.floor(Math.random() * 4)
      });
    }
    
    res.json({
      success: true,
      data: history.reverse(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching pool history:', error);
    // Fallback to mock data if API fails
    const dynamicPools = generateDynamicPools();
    const pool = dynamicPools.find(p => p.id === id);
    
    if (!pool) {
      return res.status(404).json({
        success: false,
        error: 'Pool not found',
        timestamp: new Date().toISOString()
      });
    }
    
    // Generate dynamic historical data based on current pool state
    const history = [];
    for (let i = 0; i < 24; i++) {
      const timeVariation = i * 0.02; // Gradual change over time
      history.push({
        timestamp: new Date(Date.now() - i * 60 * 60 * 1000),
        hashrate: pool.hashrate + (Math.random() - 0.5 + timeVariation) * pool.hashrate * 0.08,
        miners_count: pool.miners_count + Math.floor((Math.random() - 0.5 + timeVariation) * 800),
        luck_7d: pool.luck_7d + (Math.random() - 0.5 + timeVariation) * 8,
        blocks_found_24h: Math.floor(Math.random() * 4)
      });
    }
    
    res.json({
      success: true,
      data: history.reverse(),
      timestamp: new Date().toISOString(),
      source: 'fallback'
    });
  }
});

// Alert endpoints
app.post('/api/alerts/subscribe', (req, res) => {
  res.json({
    success: true,
    data: {
      id: 'alert-' + Math.random().toString(36).substr(2, 9),
      message: 'Alert subscription created successfully'
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/api/alerts/manage/:email', (req, res) => {
  res.json({
    success: true,
    data: [],
    message: 'No alerts found for this email',
    timestamp: new Date().toISOString()
  });
});

// Utility function
function calculateRecommendationScore(pool) {
  let score = 50;
  
  // Hashrate factor
  if (pool.hashrate > 500000000000000) score += 20;
  else if (pool.hashrate > 100000000000000) score += 15;
  
  // Fee factor
  if (pool.fee_percentage <= 1.0) score += 15;
  else if (pool.fee_percentage <= 2.0) score += 10;
  
  // Luck factor
  const luckDeviation = Math.abs(100 - pool.luck_7d);
  if (luckDeviation <= 5) score += 10;
  else if (luckDeviation <= 15) score += 5;
  
  return Math.min(Math.max(score, 0), 100);
}

// Error handling
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`,
    timestamp: new Date().toISOString()
  });
});

app.listen(port, () => {
  console.log('🚀 Ethereum Mining Pool Dashboard API Started!');
  console.log('');
  console.log('🌐 Server running at: http://localhost:' + port);
  console.log('📊 API Health Check: http://localhost:' + port + '/health');
  console.log('');
  console.log('📋 Available API Endpoints:');
  console.log('  GET /health                     - Server health check');
  console.log('  GET /api/pools                  - All mining pools');
  console.log('  GET /api/pools/:id              - Specific pool details');
  console.log('  GET /api/pools/:id/history      - Pool historical data');
  console.log('  GET /api/pools/compare          - Compare pools');
  console.log('  GET /api/stats/dashboard        - Dashboard statistics');
  console.log('  POST /api/alerts/subscribe      - Subscribe to alerts');
  console.log('');
  console.log('📊 Dynamic Data Loaded:');
  console.log('  • ' + basePools.length + ' mining pools with live stats');
  console.log('  • ' + dynamicBlocks.length + ' recent blocks found');
  console.log('  • Real-time data updates every 15 seconds');
  console.log('  • New blocks generated every 3-8 minutes');
  console.log('  • Pool comparison with recommendation scores');
  console.log('');
  console.log('✅ Ready for frontend development!');
  console.log('Press Ctrl+C to stop the server');
});

// ================================================================
// FILE SUMMARY
// ================================================================

/**
 * ETHEREUM MINING POOL DASHBOARD - BACKEND API SERVER
 * 
 * This file implements a complete REST API server for the Ethereum Mining Pool
 * Dashboard with dynamic, real-time data simulation. It serves as the backend
 * for a professional mining analytics dashboard.
 * 
 * KEY FEATURES:
 * 
 * 1. DYNAMIC DATA SIMULATION
 *    - Realistic hashrate fluctuations (±5% with trending)
 *    - Miner count variations (±3%)
 *    - Luck percentage changes (±15 points with persistence)
 *    - Automatic new block generation every 3-8 minutes
 * 
 * 2. COMPREHENSIVE API ENDPOINTS
 *    - GET /health - Server health and status
 *    - GET /api/pools - All mining pools with current stats
 *    - GET /api/pools/:id - Specific pool details
 *    - GET /api/pools/:id/history - Historical pool data (24h)
 *    - GET /api/pools/compare - Pool comparison with recommendations
 *    - GET /api/stats/dashboard - Dashboard summary statistics
 *    - POST /api/alerts/subscribe - Alert subscription management
 * 
 * 3. REALISTIC MINING POOL DATA
 *    - 4 major pools: Ethermine, F2Pool, Flexpool, 2miners
 *    - Accurate fee structures and payout methods
 *    - Live-updating hashrates from 95 TH/s to 750 TH/s
 *    - Dynamic miner counts from 12K to 85K
 *    - Realistic luck percentages and block rewards
 * 
 * 4. PROFESSIONAL FEATURES
 *    - CORS enabled for frontend integration
 *    - JSON API responses with timestamps
 *    - Error handling with proper HTTP status codes
 *    - Recommendation scoring algorithm
 *    - Console logging for monitoring
 * 
 * ARCHITECTURE:
 * - Express.js web server with middleware
 * - In-memory data storage with real-time updates
 * - Interval-based data variation system (15-second cycles)
 * - Probabilistic block generation system
 * - Modular function organization for maintainability
 * 
 * DATA FLOW:
 * 1. Base pool configurations define starting values
 * 2. Variation objects track current multipliers and trends
 * 3. Update functions modify variations every 15 seconds
 * 4. Generation functions apply variations to base data
 * 5. API endpoints serve dynamic data to frontend
 * 
 * FUTURE EXTENSIBILITY:
 * - Easy to replace dynamic data with real mining pool APIs
 * - Modular design allows for database integration
 * - API structure supports additional endpoints and features
 * - Compatible with WebSocket upgrades for real-time streaming
 * 
 * PERFORMANCE:
 * - Lightweight in-memory operations
 * - Efficient data generation algorithms
 * - Minimal CPU usage with interval-based updates
 * - Suitable for development and demonstration purposes
 * 
 * This implementation provides a fully functional backend that makes the
 * frontend dashboard appear to have live, real-time mining data while
 * maintaining the flexibility to upgrade to actual mining pool APIs later.
 */