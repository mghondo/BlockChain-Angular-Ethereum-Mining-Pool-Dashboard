export interface MiningPool {
  id: string;
  name: string;
  apiUrl: string;
  feePercentage: number;
  payoutMethod: 'PPS' | 'PPLNS' | 'PPS+';
  status: 'active' | 'inactive' | 'maintenance';
  createdAt: Date;
  updatedAt: Date;
}

export interface PoolStatistics {
  id: string;
  poolId: string;
  timestamp: Date;
  hashrate: number;
  minersCount: number;
  blocksFound24h: number;
  luck7d: number;
  difficulty: number;
  blockTime: number;
  lastBlockTime?: Date;
}

export interface Block {
  id: string;
  poolId: string;
  blockNumber: number;
  timestamp: Date;
  reward: number;
  minerCount: number;
  difficulty: number;
  hash: string;
}

export interface AlertSubscription {
  id: string;
  email: string;
  poolId?: string;
  alertType: AlertType;
  threshold?: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertHistory {
  id: string;
  subscriptionId: string;
  triggeredAt: Date;
  message: string;
  emailSent: boolean;
  poolId?: string;
  triggerValue?: number;
}

export interface NetworkStats {
  id: string;
  timestamp: Date;
  totalHashrate: number;
  difficulty: number;
  blockTime: number;
  pendingTransactions: number;
  gasPrice: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface PoolComparison {
  pool: MiningPool;
  currentStats: PoolStatistics;
  historicalLuck: {
    '7d': number;
    '30d': number;
  };
  payoutFrequency: string;
  minimumPayout: number;
  recommendationScore: number;
}

export enum AlertType {
  HASHRATE_DROP = 'hashrate_drop',
  POOL_OFFLINE = 'pool_offline',
  LUCK_STREAK = 'luck_streak',
  NEW_BLOCK = 'new_block',
  PROFITABILITY_CHANGE = 'profitability_change'
}

export interface MiningPoolApiResponse {
  status: string;
  data: any;
}

export interface EthermineResponse extends MiningPoolApiResponse {
  data: {
    time: number;
    lastSeen: number;
    reportedHashrate: number;
    currentHashrate: number;
    validShares: number;
    invalidShares: number;
    staleShares: number;
    activeWorkers: number;
    unpaid: number;
  };
}

export interface F2PoolResponse extends MiningPoolApiResponse {
  data: {
    hashrate: number;
    hashrate_history: number[];
    miners: number;
    luck: number;
    blocks_found: number;
  };
}

export interface FlexpoolResponse extends MiningPoolApiResponse {
  result: {
    hashrate: number;
    minerCount: number;
    blockCount: number;
    luck: number;
    fee: number;
  };
}

export interface TwoMinersResponse extends MiningPoolApiResponse {
  candidatesTotal: number;
  hashrate: number;
  immatureTotal: number;
  maturedTotal: number;
  minersTotal: number;
  nodes: any[];
  stats: {
    lastBlockFound: number;
    luck: number;
  };
}

export interface DatabaseConfig {
  type: 'sqlite' | 'postgresql';
  url: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
}

export interface AppConfig {
  port: number;
  host: string;
  nodeEnv: string;
  database: DatabaseConfig;
  email: EmailConfig;
  redis?: {
    url: string;
    enabled: boolean;
  };
  apiRateLimit: number;
  updateInterval: number;
  cacheTTL: number;
  jwtSecret: string;
  bcryptRounds: number;
  logLevel: string;
}