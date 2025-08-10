import sqlite3 from 'sqlite3';
import { Client as PgClient } from 'pg';
import fs from 'fs';
import path from 'path';
import { DatabaseConfig } from '../types';

export class DatabaseService {
  private sqliteDb?: sqlite3.Database;
  private pgClient?: PgClient;
  private config: DatabaseConfig;
  private isInitialized: boolean = false;

  constructor() {
    this.config = this.loadConfig();
  }

  private loadConfig(): DatabaseConfig {
    const databaseUrl = process.env.DATABASE_URL || 'sqlite:./dev.db';
    const databaseType = process.env.DATABASE_TYPE as 'sqlite' | 'postgresql' || 'sqlite';

    if (databaseType === 'postgresql') {
      return {
        type: 'postgresql',
        url: databaseUrl
      };
    } else {
      return {
        type: 'sqlite',
        url: databaseUrl.replace('sqlite:', '')
      };
    }
  }

  public async initialize(): Promise<void> {
    try {
      if (this.config.type === 'sqlite') {
        await this.initializeSQLite();
      } else {
        await this.initializePostgreSQL();
      }
      
      await this.runMigrations();
      this.isInitialized = true;
      await this.seedData();
      console.log(`✅ Database initialized successfully (${this.config.type})`);
    } catch (error) {
      console.error('❌ Database initialization failed:', error);
      throw error;
    }
  }

  private async initializeSQLite(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sqliteDb = new sqlite3.Database(this.config.url, (err) => {
        if (err) {
          reject(err);
        } else {
          this.sqliteDb!.run('PRAGMA foreign_keys = ON');
          resolve();
        }
      });
    });
  }

  private async initializePostgreSQL(): Promise<void> {
    this.pgClient = new PgClient({
      connectionString: this.config.url,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
    });

    await this.pgClient.connect();
  }

  private async runMigrations(): Promise<void> {
    const schemaPath = this.config.type === 'sqlite' 
      ? path.join(__dirname, '../../../database/schema-sqlite.sql')
      : path.join(__dirname, '../../../database/schema.sql');

    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema file not found: ${schemaPath}`);
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    
    if (this.config.type === 'sqlite') {
      await this.executeSQLiteScript(schema);
    } else {
      await this.executePostgreSQLScript(schema);
    }
  }

  private async executeSQLiteScript(script: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.sqliteDb!.exec(script, (err) => {
        if (err && !err.message.includes('already exists')) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }

  private async executePostgreSQLScript(script: string): Promise<void> {
    try {
      await this.pgClient!.query(script);
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        throw error;
      }
    }
  }

  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    if (this.config.type === 'sqlite') {
      return this.querySQLite<T>(sql, params);
    } else {
      return this.queryPostgreSQL<T>(sql, params);
    }
  }

  private async querySQLite<T>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      this.sqliteDb!.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows as T[]);
        }
      });
    });
  }

  private async queryPostgreSQL<T>(sql: string, params: any[] = []): Promise<T[]> {
    try {
      const result = await this.pgClient!.query(sql, params);
      return result.rows as T[];
    } catch (error) {
      throw error;
    }
  }

  public async queryOne<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const results = await this.query<T>(sql, params);
    return results.length > 0 ? results[0] || null : null;
  }

  public async execute(sql: string, params: any[] = []): Promise<{ lastInsertId?: any; rowsAffected: number }> {
    if (!this.isInitialized) {
      throw new Error('Database not initialized');
    }

    if (this.config.type === 'sqlite') {
      return this.executeSQLite(sql, params);
    } else {
      return this.executePostgreSQL(sql, params);
    }
  }

  private async executeSQLite(sql: string, params: any[] = []): Promise<{ lastInsertId?: any; rowsAffected: number }> {
    return new Promise((resolve, reject) => {
      this.sqliteDb!.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({
            lastInsertId: this.lastID,
            rowsAffected: this.changes
          });
        }
      });
    });
  }

  private async executePostgreSQL(sql: string, params: any[] = []): Promise<{ lastInsertId?: any; rowsAffected: number }> {
    try {
      const result = await this.pgClient!.query(sql, params);
      return {
        rowsAffected: result.rowCount || 0
      };
    } catch (error) {
      throw error;
    }
  }

  public async beginTransaction(): Promise<void> {
    if (this.config.type === 'sqlite') {
      await this.execute('BEGIN TRANSACTION');
    } else {
      await this.execute('BEGIN');
    }
  }

  public async commit(): Promise<void> {
    await this.execute('COMMIT');
  }

  public async rollback(): Promise<void> {
    await this.execute('ROLLBACK');
  }

  public async seedData(): Promise<void> {
    if (process.env.DEV_SEED_DATA !== 'true') {
      return;
    }

    console.log('🌱 Seeding development data...');

    try {
      await this.beginTransaction();

      // Check if pools already exist
      const existingPools = await this.query('SELECT COUNT(*) as count FROM pools');
      const count = this.config.type === 'sqlite' 
        ? (existingPools[0] as any).count 
        : parseInt((existingPools[0] as any).count);

      if (count === 0) {
        // Insert sample mining pools
        const pools = [
          {
            id: this.generateId(),
            name: 'Ethermine',
            api_url: 'https://api.ethermine.org',
            fee_percentage: 1.0,
            payout_method: 'PPLNS',
            minimum_payout: 0.01
          },
          {
            id: this.generateId(),
            name: 'F2Pool',
            api_url: 'https://api.f2pool.com',
            fee_percentage: 2.5,
            payout_method: 'PPS',
            minimum_payout: 0.005
          },
          {
            id: this.generateId(),
            name: 'Flexpool',
            api_url: 'https://flexpool.io/api/v2',
            fee_percentage: 1.0,
            payout_method: 'PPLNS',
            minimum_payout: 0.01
          },
          {
            id: this.generateId(),
            name: '2miners',
            api_url: 'https://eth.2miners.com/api',
            fee_percentage: 1.0,
            payout_method: 'PPLNS',
            minimum_payout: 0.01
          }
        ];

        for (const pool of pools) {
          await this.execute(
            `INSERT INTO pools (id, name, api_url, fee_percentage, payout_method, minimum_payout) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [pool.id, pool.name, pool.api_url, pool.fee_percentage, pool.payout_method, pool.minimum_payout]
          );

          // Add sample statistics for each pool
          const statsId = this.generateId();
          await this.execute(
            `INSERT INTO pool_statistics (id, pool_id, timestamp, hashrate, miners_count, blocks_found_24h, luck_7d, difficulty, block_time)
             VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?, ?, ?)`,
            [
              statsId,
              pool.id,
              Math.floor(Math.random() * 1000000000000000) + 100000000000000, // Random hashrate
              Math.floor(Math.random() * 100000) + 10000, // Random miner count
              Math.floor(Math.random() * 20), // Random blocks found
              90 + Math.random() * 20, // Random luck 90-110%
              15500000000000000, // Network difficulty
              13 // Block time
            ]
          );

          // Add sample blocks
          if (Math.random() > 0.5) {
            const blockId = this.generateId();
            await this.execute(
              `INSERT INTO blocks (id, pool_id, block_number, timestamp, reward, miner_count, difficulty, hash)
               VALUES (?, ?, ?, datetime('now', '-' || ? || ' hours'), ?, ?, ?, ?)`,
              [
                blockId,
                pool.id,
                18500000 + Math.floor(Math.random() * 1000),
                Math.floor(Math.random() * 24), // Random hours ago
                2.0 + Math.random() * 0.5, // Random reward 2.0-2.5 ETH
                Math.floor(Math.random() * 50000) + 10000,
                15500000000000000,
                '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join('')
              ]
            );
          }
        }

        console.log('✅ Sample pools and data seeded');
      }

      await this.commit();
    } catch (error) {
      await this.rollback();
      console.error('❌ Failed to seed data:', error);
      throw error;
    }
  }

  private generateId(): string {
    if (this.config.type === 'sqlite') {
      return require('crypto').randomBytes(16).toString('hex');
    } else {
      return require('crypto').randomUUID();
    }
  }

  public async healthCheck(): Promise<{ status: string; type: string; uptime: number }> {
    try {
      const startTime = Date.now();
      await this.query('SELECT 1');
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        type: this.config.type,
        uptime: responseTime
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        type: this.config.type,
        uptime: -1
      };
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.sqliteDb) {
        await new Promise<void>((resolve, reject) => {
          this.sqliteDb!.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }

      if (this.pgClient) {
        await this.pgClient.end();
      }

      this.isInitialized = false;
      console.log('🔌 Database connection closed');
    } catch (error) {
      console.error('❌ Error closing database:', error);
      throw error;
    }
  }
}