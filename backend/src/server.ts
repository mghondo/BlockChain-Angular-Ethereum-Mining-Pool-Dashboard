import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { requestLogger } from './middleware/logger';
import { DatabaseService } from './services/DatabaseService';
import { MiningPoolService } from './services/MiningPoolService';
import { AlertService } from './services/AlertService';
import { WebSocketService } from './services/WebSocketService';

import poolRoutes, { initializePoolController } from './controllers/poolController';
import alertRoutes, { initializeAlertController } from './controllers/alertController';
import statsRoutes, { initializeStatsController } from './controllers/statsController';

dotenv.config();

class Server {
  private app: express.Application;
  private server: any;
  private wss!: WebSocketServer;
  private databaseService!: DatabaseService;
  private miningPoolService!: MiningPoolService;
  private alertService!: AlertService;
  private websocketService!: WebSocketService;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupServices();
    this.setupWebSocket();
    this.setupErrorHandling();
  }

  private setupMiddleware(): void {
    this.app.use(helmet());
    this.app.use(cors({
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : ['http://localhost:4200', 'http://localhost:3000'],
      credentials: true
    }));
    
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    if (process.env.NODE_ENV !== 'test') {
      this.app.use(morgan('combined'));
    }
    
    this.app.use(requestLogger);

    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000,
      max: parseInt(process.env.API_RATE_LIMIT || '100'),
      message: {
        error: 'Too many requests from this IP, please try again later.'
      }
    });
    this.app.use('/api/', limiter);
  }

  private setupRoutes(): void {
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV
      });
    });

    this.app.use('/api/pools', poolRoutes);
    this.app.use('/api/alerts', alertRoutes);
    this.app.use('/api/stats', statsRoutes);

    this.app.use(notFoundHandler);
  }

  private async setupServices(): Promise<void> {
    try {
      this.databaseService = new DatabaseService();
      await this.databaseService.initialize();

      this.miningPoolService = new MiningPoolService(this.databaseService);
      this.alertService = new AlertService(this.databaseService);
      
      // Initialize controllers with database service
      initializePoolController(this.databaseService);
      initializeAlertController(this.databaseService);
      initializeStatsController(this.databaseService);
      
      console.log('✅ Services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize services:', error);
      process.exit(1);
    }
  }

  private setupWebSocket(): void {
    this.server = createServer(this.app);
    this.wss = new WebSocketServer({ server: this.server });
    this.websocketService = new WebSocketService(this.wss);
    
    console.log('🔌 WebSocket server initialized');
  }

  private setupErrorHandling(): void {
    this.app.use(errorHandler);

    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      this.gracefulShutdown();
    });

    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      this.gracefulShutdown();
    });

    process.on('SIGTERM', () => {
      console.log('SIGTERM received, shutting down gracefully');
      this.gracefulShutdown();
    });

    process.on('SIGINT', () => {
      console.log('SIGINT received, shutting down gracefully');
      this.gracefulShutdown();
    });
  }

  private async gracefulShutdown(): Promise<void> {
    try {
      if (this.server) {
        this.server.close(() => {
          console.log('HTTP server closed');
        });
      }

      if (this.wss) {
        this.wss.close(() => {
          console.log('WebSocket server closed');
        });
      }

      if (this.databaseService) {
        await this.databaseService.close();
        console.log('Database connection closed');
      }

      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  public async start(): Promise<void> {
    const port = parseInt(process.env.PORT || '3000');
    const host = process.env.HOST || 'localhost';

    await this.setupServices();

    this.server.listen(port, host, () => {
      console.log(`🚀 Server running at http://${host}:${port}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV}`);
      console.log(`💾 Database: ${process.env.DATABASE_TYPE || 'sqlite'}`);
    });

    if (this.miningPoolService) {
      this.miningPoolService.startDataCollection();
      console.log('📡 Mining pool data collection started');
    }

    if (this.alertService) {
      this.alertService.startAlertProcessing();
      console.log('🔔 Alert processing started');
    }
  }
}

if (require.main === module) {
  const server = new Server();
  server.start().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

export default Server;