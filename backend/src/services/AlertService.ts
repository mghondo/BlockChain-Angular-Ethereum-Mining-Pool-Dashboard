import { DatabaseService } from './DatabaseService';
import { AlertType } from '../types';

export class AlertService {
  private dbService: DatabaseService;
  private processingInterval?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  public startAlertProcessing(): void {
    if (this.isRunning) {
      console.log('⚠️  Alert processing already running');
      return;
    }

    this.isRunning = true;
    const interval = 60000; // Check alerts every minute
    
    console.log('🔔 Starting alert processing...');
    
    // Initial alert check
    this.processAlerts();
    
    // Set up recurring alert processing
    this.processingInterval = setInterval(() => {
      this.processAlerts();
    }, interval);
  }

  public stopAlertProcessing(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = undefined;
    }
    this.isRunning = false;
    console.log('🔔 Alert processing stopped');
  }

  private async processAlerts(): Promise<void> {
    try {
      console.log('🔍 Processing alert conditions...');
      
      // Get all active alert subscriptions
      const activeAlerts = await this.dbService.query(`
        SELECT 
          s.*,
          p.name as pool_name
        FROM alert_subscriptions s
        LEFT JOIN pools p ON s.pool_id = p.id
        WHERE s.is_active = 1
      `);

      for (const alert of activeAlerts) {
        await this.checkAlertCondition(alert as any);
      }
      
      console.log(`✅ Processed ${activeAlerts.length} alert subscriptions`);
    } catch (error) {
      console.error('❌ Failed to process alerts:', error);
    }
  }

  private async checkAlertCondition(alert: any): Promise<void> {
    try {
      switch (alert.alert_type) {
        case AlertType.HASHRATE_DROP:
          await this.checkHashrateDrop(alert);
          break;
        case AlertType.POOL_OFFLINE:
          await this.checkPoolOffline(alert);
          break;
        case AlertType.LUCK_STREAK:
          await this.checkLuckStreak(alert);
          break;
        case AlertType.NEW_BLOCK:
          await this.checkNewBlock(alert);
          break;
        case AlertType.PROFITABILITY_CHANGE:
          await this.checkProfitabilityChange(alert);
          break;
        default:
          console.warn(`Unknown alert type: ${alert.alert_type}`);
      }
    } catch (error) {
      console.error(`Failed to check alert condition for ${alert.alert_type}:`, error);
    }
  }

  private async checkHashrateDrop(alert: any): Promise<void> {
    if (!alert.pool_id || !alert.threshold) return;

    // Get current and previous hashrate
    const currentStats = await this.dbService.query(`
      SELECT hashrate, timestamp
      FROM pool_statistics
      WHERE pool_id = ?
      ORDER BY timestamp DESC
      LIMIT 2
    `, [alert.pool_id]);

    if (currentStats.length < 2) return;

    const current = (currentStats[0] as any).hashrate;
    const previous = (currentStats[1] as any).hashrate;
    const dropPercentage = ((previous - current) / previous) * 100;

    if (dropPercentage > alert.threshold) {
      await this.triggerAlert(alert, `Hashrate dropped by ${dropPercentage.toFixed(2)}%`, current);
    }
  }

  private async checkPoolOffline(alert: any): Promise<void> {
    if (!alert.pool_id) return;

    // Check if pool has updated in the last 10 minutes
    const lastUpdate = await this.dbService.queryOne(`
      SELECT timestamp
      FROM pool_statistics
      WHERE pool_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `, [alert.pool_id]);

    if (!lastUpdate) return;

    const updateTime = new Date((lastUpdate as any).timestamp);
    const now = new Date();
    const minutesSinceUpdate = (now.getTime() - updateTime.getTime()) / (1000 * 60);

    if (minutesSinceUpdate > 10) {
      await this.triggerAlert(alert, `Pool offline for ${Math.floor(minutesSinceUpdate)} minutes`, minutesSinceUpdate);
    }
  }

  private async checkLuckStreak(alert: any): Promise<void> {
    if (!alert.pool_id || !alert.threshold) return;

    const currentLuck = await this.dbService.queryOne(`
      SELECT luck_7d
      FROM pool_statistics
      WHERE pool_id = ?
      ORDER BY timestamp DESC
      LIMIT 1
    `, [alert.pool_id]);

    if (!currentLuck) return;

    const luck = (currentLuck as any).luck_7d;
    if (luck < alert.threshold) {
      await this.triggerAlert(alert, `Pool luck dropped to ${luck.toFixed(2)}%`, luck);
    }
  }

  private async checkNewBlock(alert: any): Promise<void> {
    // Check for blocks found in the last 2 minutes
    const poolCondition = alert.pool_id ? 'AND pool_id = ?' : '';
    const params = alert.pool_id ? [alert.pool_id] : [];

    const recentBlocks = await this.dbService.query(`
      SELECT *
      FROM blocks
      WHERE timestamp > datetime('now', '-2 minutes') ${poolCondition}
    `, params);

    for (const block of recentBlocks) {
      const blockData = block as any;
      const message = alert.pool_id 
        ? `New block found: #${blockData.block_number}`
        : `New block found: #${blockData.block_number} by ${alert.pool_name || 'Unknown Pool'}`;
      
      await this.triggerAlert(alert, message, blockData.block_number);
    }
  }

  private async checkProfitabilityChange(alert: any): Promise<void> {
    // This is a simplified profitability check
    // In a real implementation, you would calculate based on difficulty, gas fees, etc.
    console.log('📊 Profitability check - placeholder implementation');
  }

  private async triggerAlert(alert: any, message: string, triggerValue?: number): Promise<void> {
    try {
      // Check if we've already sent this alert recently (rate limiting)
      const recentAlert = await this.dbService.queryOne(`
        SELECT id
        FROM alert_history
        WHERE subscription_id = ? AND triggered_at > datetime('now', '-1 hour')
        ORDER BY triggered_at DESC
        LIMIT 1
      `, [alert.id]);

      if (recentAlert) {
        return; // Don't spam alerts
      }

      // Create alert history record
      const alertId = this.generateId();
      await this.dbService.execute(`
        INSERT INTO alert_history (
          id, subscription_id, triggered_at, message, 
          email_sent, pool_id, trigger_value
        ) VALUES (?, ?, CURRENT_TIMESTAMP, ?, ?, ?, ?)
      `, [alertId, alert.id, message, 0, alert.pool_id, triggerValue]);

      console.log(`🔔 Alert triggered for ${alert.email}: ${message}`);
      
      // TODO: Send actual email notification
      await this.sendEmailNotification(alert.email, message);
      
      // Update alert history to mark email as sent
      await this.dbService.execute(`
        UPDATE alert_history 
        SET email_sent = 1, email_sent_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [alertId]);

    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  private async sendEmailNotification(email: string, message: string): Promise<void> {
    // Placeholder for email sending
    // In development, just log to console
    if (process.env.NODE_ENV === 'development') {
      console.log(`📧 [MOCK EMAIL] To: ${email} - ${message}`);
    } else {
      // TODO: Implement actual email sending with nodemailer
      console.log('📧 Email sending not implemented yet');
    }
  }

  private generateId(): string {
    if (process.env.DATABASE_TYPE === 'sqlite') {
      return require('crypto').randomBytes(16).toString('hex');
    } else {
      return require('crypto').randomUUID();
    }
  }

  public async getAlertHealth(): Promise<{ status: string; activeAlerts: number; processedToday: number }> {
    try {
      const activeAlerts = await this.dbService.queryOne(
        'SELECT COUNT(*) as count FROM alert_subscriptions WHERE is_active = 1'
      );

      const processedToday = await this.dbService.queryOne(
        "SELECT COUNT(*) as count FROM alert_history WHERE DATE(triggered_at) = DATE('now')"
      );

      return {
        status: this.isRunning ? 'running' : 'stopped',
        activeAlerts: (activeAlerts as any)?.count || 0,
        processedToday: (processedToday as any)?.count || 0
      };
    } catch (error) {
      return {
        status: 'error',
        activeAlerts: 0,
        processedToday: 0
      };
    }
  }
}