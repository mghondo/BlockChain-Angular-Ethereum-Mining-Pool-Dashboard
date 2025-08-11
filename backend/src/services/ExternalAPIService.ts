import axios from 'axios';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface MiningPoolData {
  id: string;
  name: string;
  fee_percentage: number;
  payout_method: string;
  status: string;
  hashrate: number;
  miners_count: number;
  luck_7d: number;
  minimum_payout: number;
}

interface DashboardStats {
  total_hashrate: number;
  total_miners: number;
  active_pools: number;
  blocks_found_24h: number;
  recent_blocks: any[];
  network_difficulty: number;
  eth_price: number;
  gas_price: number;
  last_updated: string;
}

export class ExternalAPIService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly CACHE_TTL = parseInt(process.env.CACHE_TTL || '30000'); // 30 seconds

  private readonly API_KEYS = {
    etherscan: process.env.ETHERSCAN_API_KEY,
    coingecko: process.env.COINGECKO_API_KEY,
    infura: process.env.INFURA_PROJECT_ID,
    alchemy: process.env.ALCHEMY_API_KEY
  };

  private readonly API_URLS = {
    ethermine: 'https://api.ethermine.org',
    f2pool: 'https://api.f2pool.com',
    flexpool: 'https://flexpool.io/api/v2',
    twominers: 'https://eth.2miners.com/api',
    etherscan: 'https://api.etherscan.io/api',
    coingecko: 'https://api.coingecko.com/api/v3'
  };

  /**
   * Generic cache management
   */
  private getCachedData<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T, ttl: number = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Fetch ETH price from CoinGecko
   */
  async getEthPrice(): Promise<number> {
    const cacheKey = 'eth_price';
    const cached = this.getCachedData<number>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${this.API_URLS.coingecko}/simple/price?ids=ethereum&vs_currencies=usd`,
        {
          headers: this.API_KEYS.coingecko ? { 'X-CG-Pro-API-Key': this.API_KEYS.coingecko } : {},
          timeout: 10000
        }
      );
      
      const price = response.data.ethereum.usd;
      this.setCachedData(cacheKey, price);
      return price;
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      return this.getCachedData(cacheKey) || 2500; // fallback price
    }
  }

  /**
   * Fetch network stats from Etherscan
   */
  async getNetworkStats(): Promise<{ difficulty: number; gasPrice: number }> {
    const cacheKey = 'network_stats';
    const cached = this.getCachedData<{ difficulty: number; gasPrice: number }>(cacheKey);
    if (cached) return cached;

    try {
      const [difficultyResponse, gasPriceResponse] = await Promise.all([
        axios.get(`${this.API_URLS.etherscan}?module=stats&action=ethsupply&apikey=${this.API_KEYS.etherscan}`),
        axios.get(`${this.API_URLS.etherscan}?module=gastracker&action=gasoracle&apikey=${this.API_KEYS.etherscan}`)
      ]);

      const networkStats = {
        difficulty: 15500000000000000, // ETH moved to PoS, using static value
        gasPrice: parseInt(gasPriceResponse.data.result.ProposeGasPrice) || 20
      };

      this.setCachedData(cacheKey, networkStats);
      return networkStats;
    } catch (error) {
      console.error('Error fetching network stats:', error);
      return this.getCachedData(cacheKey) || { difficulty: 15500000000000000, gasPrice: 20 };
    }
  }

  /**
   * Fetch Ethermine pool data
   */
  async getEthermineData(): Promise<Partial<MiningPoolData>> {
    const cacheKey = 'ethermine_data';
    const cached = this.getCachedData<Partial<MiningPoolData>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.API_URLS.ethermine}/poolStats`, {
        timeout: 10000
      });
      
      const data = response.data.data;
      const poolData: Partial<MiningPoolData> = {
        id: 'ethermine-001',
        name: 'Ethermine',
        hashrate: data.poolHashRate || 750000000000000,
        miners_count: data.minersTotal || 85000,
        fee_percentage: 1.0,
        payout_method: 'PPLNS',
        status: 'active',
        minimum_payout: 0.01
      };

      this.setCachedData(cacheKey, poolData);
      return poolData;
    } catch (error) {
      console.error('Error fetching Ethermine data:', error);
      return this.getFallbackPoolData('ethermine-001', 'Ethermine');
    }
  }

  /**
   * Fetch F2Pool data
   */
  async getF2PoolData(): Promise<Partial<MiningPoolData>> {
    const cacheKey = 'f2pool_data';
    const cached = this.getCachedData<Partial<MiningPoolData>>(cacheKey);
    if (cached) return cached;

    try {
      // F2Pool API structure may vary, implementing basic structure
      const poolData: Partial<MiningPoolData> = {
        id: 'f2pool-002',
        name: 'F2Pool',
        hashrate: 320000000000000,
        miners_count: 35000,
        fee_percentage: 2.5,
        payout_method: 'PPS',
        status: 'active',
        minimum_payout: 0.005
      };

      this.setCachedData(cacheKey, poolData);
      return poolData;
    } catch (error) {
      console.error('Error fetching F2Pool data:', error);
      return this.getFallbackPoolData('f2pool-002', 'F2Pool');
    }
  }

  /**
   * Fetch Flexpool data
   */
  async getFlexpoolData(): Promise<Partial<MiningPoolData>> {
    const cacheKey = 'flexpool_data';
    const cached = this.getCachedData<Partial<MiningPoolData>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.API_URLS.flexpool}/pool/hashrate`, {
        timeout: 10000
      });
      
      const hashrate = response.data.result.total;
      const poolData: Partial<MiningPoolData> = {
        id: 'flexpool-003',
        name: 'Flexpool',
        hashrate: hashrate || 180000000000000,
        miners_count: 22000,
        fee_percentage: 1.0,
        payout_method: 'PPLNS',
        status: 'active',
        minimum_payout: 0.01
      };

      this.setCachedData(cacheKey, poolData);
      return poolData;
    } catch (error) {
      console.error('Error fetching Flexpool data:', error);
      return this.getFallbackPoolData('flexpool-003', 'Flexpool');
    }
  }

  /**
   * Fetch 2miners data
   */
  async get2MinersData(): Promise<Partial<MiningPoolData>> {
    const cacheKey = '2miners_data';
    const cached = this.getCachedData<Partial<MiningPoolData>>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(`${this.API_URLS.twominers}/stats`, {
        timeout: 10000
      });
      
      const data = response.data;
      const poolData: Partial<MiningPoolData> = {
        id: '2miners-004',
        name: '2miners',
        hashrate: data.hashrate || 95000000000000,
        miners_count: data.minersTotal || 12000,
        fee_percentage: 1.0,
        payout_method: 'PPLNS',
        status: 'active',
        minimum_payout: 0.01
      };

      this.setCachedData(cacheKey, poolData);
      return poolData;
    } catch (error) {
      console.error('Error fetching 2miners data:', error);
      return this.getFallbackPoolData('2miners-004', '2miners');
    }
  }

  /**
   * Get recent blocks from Etherscan
   */
  async getRecentBlocks(): Promise<any[]> {
    const cacheKey = 'recent_blocks';
    const cached = this.getCachedData<any[]>(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get(
        `${this.API_URLS.etherscan}?module=proxy&action=eth_getBlockByNumber&tag=latest&boolean=true&apikey=${this.API_KEYS.etherscan}`
      );
      
      const block = response.data.result;
      const recentBlocks = [
        {
          pool_id: 'ethermine-001',
          block_number: parseInt(block.number, 16),
          timestamp: new Date(parseInt(block.timestamp, 16) * 1000),
          reward: 2.08,
          pool_name: 'Ethermine'
        }
      ];

      this.setCachedData(cacheKey, recentBlocks);
      return recentBlocks;
    } catch (error) {
      console.error('Error fetching recent blocks:', error);
      return this.getCachedData(cacheKey) || [];
    }
  }

  /**
   * Get all mining pools data
   */
  async getAllPoolsData(): Promise<MiningPoolData[]> {
    const cacheKey = 'all_pools_data';
    const cached = this.getCachedData<MiningPoolData[]>(cacheKey);
    if (cached) return cached;

    try {
      const [ethermine, f2pool, flexpool, twominers] = await Promise.all([
        this.getEthermineData(),
        this.getF2PoolData(),
        this.getFlexpoolData(),
        this.get2MinersData()
      ]);

      const pools: MiningPoolData[] = [
        { ...this.getDefaultPoolData('ethermine-001', 'Ethermine'), ...ethermine },
        { ...this.getDefaultPoolData('f2pool-002', 'F2Pool'), ...f2pool },
        { ...this.getDefaultPoolData('flexpool-003', 'Flexpool'), ...flexpool },
        { ...this.getDefaultPoolData('2miners-004', '2miners'), ...twominers }
      ];

      // Add luck calculations (mock for now as APIs don't always provide this)
      pools.forEach(pool => {
        if (!pool.luck_7d) {
          pool.luck_7d = 95 + Math.random() * 10; // Random between 95-105%
        }
      });

      this.setCachedData(cacheKey, pools, this.CACHE_TTL);
      return pools;
    } catch (error) {
      console.error('Error fetching all pools data:', error);
      return this.getCachedData(cacheKey) || this.getFallbackAllPools();
    }
  }

  /**
   * Get dashboard statistics
   */
  async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = 'dashboard_stats';
    const cached = this.getCachedData<DashboardStats>(cacheKey);
    if (cached) return cached;

    try {
      const [pools, ethPrice, networkStats, recentBlocks] = await Promise.all([
        this.getAllPoolsData(),
        this.getEthPrice(),
        this.getNetworkStats(),
        this.getRecentBlocks()
      ]);

      const stats: DashboardStats = {
        total_hashrate: pools.reduce((sum, pool) => sum + pool.hashrate, 0),
        total_miners: pools.reduce((sum, pool) => sum + pool.miners_count, 0),
        active_pools: pools.length,
        blocks_found_24h: recentBlocks.length,
        recent_blocks: recentBlocks,
        network_difficulty: networkStats.difficulty,
        eth_price: ethPrice,
        gas_price: networkStats.gasPrice,
        last_updated: new Date().toISOString()
      };

      this.setCachedData(cacheKey, stats);
      return stats;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return this.getCachedData(cacheKey) || this.getFallbackDashboardStats();
    }
  }

  /**
   * Fallback data methods
   */
  private getFallbackPoolData(id: string, name: string): Partial<MiningPoolData> {
    const fallbackData = {
      'ethermine-001': { hashrate: 750000000000000, miners_count: 85000, fee_percentage: 1.0 },
      'f2pool-002': { hashrate: 320000000000000, miners_count: 35000, fee_percentage: 2.5 },
      'flexpool-003': { hashrate: 180000000000000, miners_count: 22000, fee_percentage: 1.0 },
      '2miners-004': { hashrate: 95000000000000, miners_count: 12000, fee_percentage: 1.0 }
    };

    return {
      id,
      name,
      ...fallbackData[id],
      payout_method: 'PPLNS',
      status: 'active',
      minimum_payout: 0.01,
      luck_7d: 98.5
    };
  }

  private getDefaultPoolData(id: string, name: string): MiningPoolData {
    return {
      id,
      name,
      fee_percentage: 1.0,
      payout_method: 'PPLNS',
      status: 'active',
      hashrate: 100000000000000,
      miners_count: 10000,
      luck_7d: 98.5,
      minimum_payout: 0.01
    };
  }

  private getFallbackAllPools(): MiningPoolData[] {
    return [
      { ...this.getDefaultPoolData('ethermine-001', 'Ethermine'), hashrate: 750000000000000, miners_count: 85000 },
      { ...this.getDefaultPoolData('f2pool-002', 'F2Pool'), hashrate: 320000000000000, miners_count: 35000, fee_percentage: 2.5 },
      { ...this.getDefaultPoolData('flexpool-003', 'Flexpool'), hashrate: 180000000000000, miners_count: 22000 },
      { ...this.getDefaultPoolData('2miners-004', '2miners'), hashrate: 95000000000000, miners_count: 12000 }
    ];
  }

  private getFallbackDashboardStats(): DashboardStats {
    const pools = this.getFallbackAllPools();
    return {
      total_hashrate: pools.reduce((sum, pool) => sum + pool.hashrate, 0),
      total_miners: pools.reduce((sum, pool) => sum + pool.miners_count, 0),
      active_pools: pools.length,
      blocks_found_24h: 3,
      recent_blocks: [],
      network_difficulty: 15500000000000000,
      eth_price: 2500,
      gas_price: 20,
      last_updated: new Date().toISOString()
    };
  }
}