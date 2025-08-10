import { DatabaseService } from './DatabaseService';

export class MiningPoolService {
  private dbService: DatabaseService;
  private updateInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  public startDataCollection(): void {
    if (this.isRunning) {
      console.log('⚠️  Mining pool data collection already running');
      return;
    }

    this.isRunning = true;
    const interval = parseInt(process.env.UPDATE_INTERVAL || '30000');
    
    console.log(`📡 Starting mining pool data collection (interval: ${interval}ms)`);
    
    // Initial data fetch
    this.fetchAllPoolData();
    
    // Set up recurring data fetch
    this.updateInterval = setInterval(() => {
      this.fetchAllPoolData();
    }, interval);
  }

  public stopDataCollection(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = undefined;
    }
    this.isRunning = false;
    console.log('📡 Mining pool data collection stopped');
  }

  private async fetchAllPoolData(): Promise<void> {
    try {
      console.log('📊 Fetching mining pool data...');
      
      // Get all active pools
      const pools = await this.dbService.query(
        'SELECT * FROM pools WHERE status = ?',
        ['active']
      );

      for (const pool of pools) {
        await this.fetchPoolData(pool as any);
      }
      
      console.log(`✅ Successfully updated data for ${pools.length} pools`);
    } catch (error) {
      console.error('❌ Failed to fetch mining pool data:', error);
    }
  }

  private async fetchPoolData(pool: any): Promise<void> {
    try {
      // This is a placeholder - actual API integration will be implemented later
      console.log(`🔄 Updating data for ${pool.name}...`);
      
      // Generate mock data for now
      const mockData = {
        hashrate: Math.floor(Math.random() * 1000000000000000) + 100000000000000,
        minersCount: Math.floor(Math.random() * 100000) + 10000,
        blocksFound24h: Math.floor(Math.random() * 20),
        luck7d: 90 + Math.random() * 20, // 90-110%
        difficulty: 15500000000000000,
        blockTime: 13
      };

      // Insert statistics record
      await this.dbService.execute(`
        INSERT INTO pool_statistics (
          id, pool_id, timestamp, hashrate, miners_count, 
          blocks_found_24h, luck_7d, difficulty, block_time
        ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)
      `, [
        this.generateId(),
        pool.id,
        mockData.hashrate,
        mockData.minersCount,
        mockData.blocksFound24h,
        mockData.luck7d,
        mockData.difficulty,
        mockData.blockTime
      ]);

    } catch (error) {
      console.error(`❌ Failed to update data for ${pool.name}:`, error);
    }
  }

  private generateId(): string {
    if (process.env.DATABASE_TYPE === 'sqlite') {
      return require('crypto').randomBytes(16).toString('hex');
    } else {
      return require('crypto').randomUUID();
    }
  }

  public async getPoolHealth(): Promise<{ status: string; lastUpdate: string; poolCount: number }> {
    try {
      const poolCount = await this.dbService.queryOne(
        'SELECT COUNT(*) as count FROM pools WHERE status = ?',
        ['active']
      );

      const lastUpdate = await this.dbService.queryOne(
        'SELECT MAX(timestamp) as last_update FROM pool_statistics'
      );

      return {
        status: this.isRunning ? 'running' : 'stopped',
        lastUpdate: (lastUpdate as any)?.last_update || 'never',
        poolCount: (poolCount as any)?.count || 0
      };
    } catch (error) {
      return {
        status: 'error',
        lastUpdate: 'unknown',
        poolCount: 0
      };
    }
  }
}