import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { ApiResponse, PaginatedResponse, MiningPool, PoolStatistics, PoolComparison } from '../types';

const router = Router();

class PoolController {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  // GET /api/pools - Get all pools with current statistics
  public getAllPools = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const pools = await this.dbService.query(`
      SELECT 
        p.*,
        lps.hashrate,
        lps.miners_count,
        lps.blocks_found_24h,
        lps.luck_7d,
        lps.timestamp as last_updated
      FROM pools p
      LEFT JOIN latest_pool_stats lps ON p.id = lps.pool_id
      WHERE p.status = 'active'
      ORDER BY lps.hashrate DESC NULLS LAST
    `);

    const response: ApiResponse<any[]> = {
      success: true,
      data: pools,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // GET /api/pools/:id - Get specific pool with detailed stats
  public getPoolById = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const pool = await this.dbService.queryOne(`
      SELECT 
        p.*,
        lps.hashrate,
        lps.miners_count,
        lps.blocks_found_24h,
        lps.luck_7d,
        lps.timestamp as last_updated
      FROM pools p
      LEFT JOIN latest_pool_stats lps ON p.id = lps.pool_id
      WHERE p.id = ?
    `, [id]);

    if (!pool) {
      throw createError('Pool not found', 404);
    }

    const response: ApiResponse<any> = {
      success: true,
      data: pool,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // GET /api/pools/:id/history - Get historical data for a pool
  public getPoolHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { period = '7d', limit = 100 } = req.query;

    let dateFilter = "datetime('now', '-7 days')";
    switch (period) {
      case '24h':
        dateFilter = "datetime('now', '-1 day')";
        break;
      case '30d':
        dateFilter = "datetime('now', '-30 days')";
        break;
      case '7d':
      default:
        dateFilter = "datetime('now', '-7 days')";
        break;
    }

    const history = await this.dbService.query(`
      SELECT 
        timestamp,
        hashrate,
        miners_count,
        blocks_found_24h,
        luck_7d,
        difficulty,
        block_time
      FROM pool_statistics
      WHERE pool_id = ? AND timestamp >= ${dateFilter}
      ORDER BY timestamp DESC
      LIMIT ?
    `, [id, parseInt(limit as string)]);

    const response: ApiResponse<any[]> = {
      success: true,
      data: history.reverse(), // Return oldest to newest for charts
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // GET /api/pools/compare - Compare multiple pools
  public comparePools = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { pools: poolIds } = req.query;

    if (!poolIds || typeof poolIds !== 'string') {
      throw createError('Pool IDs are required', 400);
    }

    const poolIdArray = poolIds.split(',').slice(0, 5); // Limit to 5 pools max
    const placeholders = poolIdArray.map(() => '?').join(',');

    const comparison = await this.dbService.query(`
      SELECT 
        p.*,
        lps.hashrate,
        lps.miners_count,
        lps.blocks_found_24h,
        lps.luck_7d,
        lps.timestamp as last_updated,
        COALESCE(recent_blocks.block_count, 0) as recent_blocks,
        COALESCE(avg_luck.avg_luck_7d, 0) as avg_luck_7d,
        COALESCE(avg_luck.avg_luck_30d, 0) as avg_luck_30d
      FROM pools p
      LEFT JOIN latest_pool_stats lps ON p.id = lps.pool_id
      LEFT JOIN (
        SELECT pool_id, COUNT(*) as block_count
        FROM blocks
        WHERE timestamp > datetime('now', '-24 hours')
        GROUP BY pool_id
      ) recent_blocks ON p.id = recent_blocks.pool_id
      LEFT JOIN (
        SELECT 
          pool_id, 
          AVG(CASE WHEN timestamp > datetime('now', '-7 days') THEN luck_7d END) as avg_luck_7d,
          AVG(CASE WHEN timestamp > datetime('now', '-30 days') THEN luck_7d END) as avg_luck_30d
        FROM pool_statistics
        GROUP BY pool_id
      ) avg_luck ON p.id = avg_luck.pool_id
      WHERE p.id IN (${placeholders})
      ORDER BY lps.hashrate DESC NULLS LAST
    `, poolIdArray);

    // Calculate recommendation scores (simple algorithm)
    const comparisionWithScores = comparison.map((pool: any) => ({
      ...pool,
      recommendation_score: this.calculateRecommendationScore(pool)
    }));

    const response: ApiResponse<any[]> = {
      success: true,
      data: comparisionWithScores,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // GET /api/pools/:id/blocks - Get recent blocks for a pool
  public getPoolBlocks = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const blocks = await this.dbService.query(`
      SELECT 
        block_number,
        timestamp,
        reward,
        miner_count,
        difficulty,
        hash,
        uncle
      FROM blocks
      WHERE pool_id = ?
      ORDER BY timestamp DESC
      LIMIT ? OFFSET ?
    `, [id, parseInt(limit as string), parseInt(offset as string)]);

    const totalCount = await this.dbService.queryOne(`
      SELECT COUNT(*) as count FROM blocks WHERE pool_id = ?
    `, [id]);

    const response: PaginatedResponse<any> = {
      success: true,
      data: blocks,
      pagination: {
        page: Math.floor(parseInt(offset as string) / parseInt(limit as string)) + 1,
        limit: parseInt(limit as string),
        total: (totalCount as any).count,
        totalPages: Math.ceil((totalCount as any).count / parseInt(limit as string))
      },
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  private calculateRecommendationScore(pool: any): number {
    let score = 50; // Base score

    // Hashrate factor (larger pools get higher scores for stability)
    if (pool.hashrate > 500000000000000) score += 20;
    else if (pool.hashrate > 100000000000000) score += 15;
    else if (pool.hashrate > 50000000000000) score += 10;

    // Fee factor (lower fees are better)
    if (pool.fee_percentage <= 1.0) score += 15;
    else if (pool.fee_percentage <= 2.0) score += 10;
    else if (pool.fee_percentage <= 3.0) score += 5;

    // Luck factor (closer to 100% is better)
    const luckDeviation = Math.abs(100 - pool.luck_7d);
    if (luckDeviation <= 5) score += 10;
    else if (luckDeviation <= 15) score += 5;

    // Recent activity (blocks found in last 24h)
    if (pool.recent_blocks > 5) score += 10;
    else if (pool.recent_blocks > 0) score += 5;

    // Payout method preference (PPLNS generally preferred for decentralization)
    if (pool.payout_method === 'PPLNS') score += 5;

    return Math.min(Math.max(score, 0), 100); // Clamp between 0-100
  }
}

// Initialize controller with database service
let poolController: PoolController;

// Routes
router.get('/', (req, res, next) => {
  if (!poolController) {
    return next(createError('Service not initialized', 500));
  }
  poolController.getAllPools(req, res, next);
});

router.get('/compare', (req, res, next) => {
  if (!poolController) {
    return next(createError('Service not initialized', 500));
  }
  poolController.comparePools(req, res, next);
});

router.get('/:id', (req, res, next) => {
  if (!poolController) {
    return next(createError('Service not initialized', 500));
  }
  poolController.getPoolById(req, res, next);
});

router.get('/:id/history', (req, res, next) => {
  if (!poolController) {
    return next(createError('Service not initialized', 500));
  }
  poolController.getPoolHistory(req, res, next);
});

router.get('/:id/blocks', (req, res, next) => {
  if (!poolController) {
    return next(createError('Service not initialized', 500));
  }
  poolController.getPoolBlocks(req, res, next);
});

// Initialize function to be called from server.ts
export const initializePoolController = (dbService: DatabaseService): void => {
  poolController = new PoolController(dbService);
};

export default router;