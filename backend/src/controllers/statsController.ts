import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';

const router = Router();

class StatsController {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  // GET /api/stats/network - Get current network statistics
  public getNetworkStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const currentStats = await this.dbService.queryOne(`
      SELECT 
        total_hashrate,
        difficulty,
        block_time,
        pending_transactions,
        gas_price,
        timestamp
      FROM network_stats
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    if (!currentStats) {
      // Return default/calculated stats if no data exists
      const poolStats = await this.dbService.query(`
        SELECT SUM(hashrate) as total_hashrate
        FROM latest_pool_stats
      `);

      const defaultStats = {
        total_hashrate: poolStats[0] ? (poolStats[0] as any).total_hashrate || 0 : 0,
        difficulty: 15500000000000000,
        block_time: 13,
        pending_transactions: 125000,
        gas_price: 25000000000,
        timestamp: new Date().toISOString()
      };

      const response: ApiResponse<any> = {
        success: true,
        data: defaultStats,
        message: 'Using calculated network statistics',
        timestamp: new Date().toISOString()
      };

      res.json(response);
      return;
    }

    const response: ApiResponse<any> = {
      success: true,
      data: currentStats,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // GET /api/stats/network/history - Get historical network statistics
  public getNetworkHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { period = '24h', limit = 100 } = req.query;

    let dateFilter = "datetime('now', '-1 day')";
    switch (period) {
      case '7d':
        dateFilter = "datetime('now', '-7 days')";
        break;
      case '30d':
        dateFilter = "datetime('now', '-30 days')";
        break;
      case '24h':
      default:
        dateFilter = "datetime('now', '-1 day')";
        break;
    }

    const history = await this.dbService.query(`
      SELECT 
        timestamp,
        total_hashrate,
        difficulty,
        block_time,
        pending_transactions,
        gas_price
      FROM network_stats
      WHERE timestamp >= ${dateFilter}
      ORDER BY timestamp DESC
      LIMIT ?
    `, [parseInt(limit as string)]);

    const response: ApiResponse<any[]> = {
      success: true,
      data: history.reverse(), // Return oldest to newest for charts
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // GET /api/stats/pools - Get aggregated pool statistics
  public getPoolStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const stats = await this.dbService.queryOne(`
      SELECT 
        COUNT(*) as total_pools,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active_pools,
        SUM(COALESCE(lps.hashrate, 0)) as total_hashrate,
        SUM(COALESCE(lps.miners_count, 0)) as total_miners,
        AVG(COALESCE(lps.luck_7d, 0)) as avg_luck_7d
      FROM pools p
      LEFT JOIN latest_pool_stats lps ON p.id = lps.pool_id
    `);

    const recentBlocks = await this.dbService.queryOne(`
      SELECT COUNT(*) as blocks_24h
      FROM blocks
      WHERE timestamp > datetime('now', '-24 hours')
    `);

    const topPools = await this.dbService.query(`
      SELECT 
        p.name,
        p.fee_percentage,
        lps.hashrate,
        lps.miners_count,
        lps.luck_7d
      FROM pools p
      INNER JOIN latest_pool_stats lps ON p.id = lps.pool_id
      WHERE p.status = 'active'
      ORDER BY lps.hashrate DESC
      LIMIT 5
    `);

    const combinedStats = {
      ...stats,
      blocks_24h: (recentBlocks as any).blocks_24h,
      top_pools: topPools
    };

    const response: ApiResponse<any> = {
      success: true,
      data: combinedStats,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // GET /api/stats/dashboard - Get dashboard summary statistics
  public getDashboardStats = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    // Get network totals
    const networkTotals = await this.dbService.queryOne(`
      SELECT 
        SUM(COALESCE(lps.hashrate, 0)) as total_hashrate,
        SUM(COALESCE(lps.miners_count, 0)) as total_miners,
        COUNT(CASE WHEN p.status = 'active' THEN 1 END) as active_pools
      FROM pools p
      LEFT JOIN latest_pool_stats lps ON p.id = lps.pool_id
    `);

    // Get recent blocks
    const recentBlocks = await this.dbService.query(`
      SELECT 
        b.block_number,
        b.timestamp,
        b.reward,
        p.name as pool_name
      FROM blocks b
      INNER JOIN pools p ON b.pool_id = p.id
      ORDER BY b.timestamp DESC
      LIMIT 10
    `);

    // Get blocks found in last 24h
    const blocks24h = await this.dbService.queryOne(`
      SELECT COUNT(*) as count
      FROM blocks
      WHERE timestamp > datetime('now', '-24 hours')
    `);

    // Get current difficulty from latest network stats or calculate average
    const networkDifficulty = await this.dbService.queryOne(`
      SELECT difficulty, timestamp
      FROM network_stats
      ORDER BY timestamp DESC
      LIMIT 1
    `);

    const dashboardData = {
      total_hashrate: (networkTotals as any).total_hashrate || 0,
      total_miners: (networkTotals as any).total_miners || 0,
      active_pools: (networkTotals as any).active_pools || 0,
      blocks_found_24h: (blocks24h as any).count || 0,
      recent_blocks: recentBlocks,
      network_difficulty: networkDifficulty ? (networkDifficulty as any).difficulty : 15500000000000000,
      last_updated: new Date().toISOString()
    };

    const response: ApiResponse<any> = {
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });
}

// Initialize controller with database service
let statsController: StatsController;

// Routes
router.get('/network', (req, res, next) => {
  if (!statsController) {
    return next(createError('Service not initialized', 500));
  }
  statsController.getNetworkStats(req, res, next);
});

router.get('/network/history', (req, res, next) => {
  if (!statsController) {
    return next(createError('Service not initialized', 500));
  }
  statsController.getNetworkHistory(req, res, next);
});

router.get('/pools', (req, res, next) => {
  if (!statsController) {
    return next(createError('Service not initialized', 500));
  }
  statsController.getPoolStats(req, res, next);
});

router.get('/dashboard', (req, res, next) => {
  if (!statsController) {
    return next(createError('Service not initialized', 500));
  }
  statsController.getDashboardStats(req, res, next);
});

// Initialize function to be called from server.ts
export const initializeStatsController = (dbService: DatabaseService): void => {
  statsController = new StatsController(dbService);
};

export default router;