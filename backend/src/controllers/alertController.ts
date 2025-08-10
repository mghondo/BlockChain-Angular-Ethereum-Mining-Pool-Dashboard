import { Router, Request, Response } from 'express';
import { DatabaseService } from '../services/DatabaseService';
import { asyncHandler, createError } from '../middleware/errorHandler';
import { ApiResponse, AlertType } from '../types';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

class AlertController {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  // POST /api/alerts/subscribe - Create alert subscription
  public createSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email, pool_id, alert_type, threshold } = req.body;

    // Validate required fields
    if (!email || !alert_type) {
      throw createError('Email and alert_type are required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError('Invalid email format', 400);
    }

    // Validate alert_type
    const validAlertTypes = Object.values(AlertType);
    if (!validAlertTypes.includes(alert_type)) {
      throw createError(`Invalid alert_type. Must be one of: ${validAlertTypes.join(', ')}`, 400);
    }

    // Check if pool exists (if pool_id provided)
    if (pool_id) {
      const poolExists = await this.dbService.queryOne('SELECT id FROM pools WHERE id = ?', [pool_id]);
      if (!poolExists) {
        throw createError('Pool not found', 404);
      }
    }

    try {
      const subscriptionId = this.generateId();
      await this.dbService.execute(`
        INSERT INTO alert_subscriptions (id, email, pool_id, alert_type, threshold, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [subscriptionId, email, pool_id || null, alert_type, threshold || null, 1]);

      const newSubscription = await this.dbService.queryOne(`
        SELECT * FROM alert_subscriptions WHERE id = ?
      `, [subscriptionId]);

      const response: ApiResponse<any> = {
        success: true,
        data: newSubscription,
        message: 'Alert subscription created successfully',
        timestamp: new Date().toISOString()
      };

      res.status(201).json(response);
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw createError('Alert subscription already exists for this email and pool combination', 409);
      }
      throw error;
    }
  });

  // GET /api/alerts/manage/:email - Get all subscriptions for an email
  public getSubscriptionsByEmail = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.params;

    if (!email) {
      throw createError('Email parameter is required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError('Invalid email format', 400);
    }

    const subscriptions = await this.dbService.query(`
      SELECT 
        s.*,
        p.name as pool_name
      FROM alert_subscriptions s
      LEFT JOIN pools p ON s.pool_id = p.id
      WHERE s.email = ?
      ORDER BY s.created_at DESC
    `, [email]);

    const response: ApiResponse<any[]> = {
      success: true,
      data: subscriptions,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // PUT /api/alerts/:id - Update alert subscription
  public updateSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;
    const { threshold, is_active } = req.body;

    const subscription = await this.dbService.queryOne(
      'SELECT * FROM alert_subscriptions WHERE id = ?',
      [id]
    );

    if (!subscription) {
      throw createError('Alert subscription not found', 404);
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (threshold !== undefined) {
      updates.push('threshold = ?');
      values.push(threshold);
    }

    if (is_active !== undefined) {
      updates.push('is_active = ?');
      values.push(is_active ? 1 : 0);
    }

    if (updates.length === 0) {
      throw createError('No valid fields to update', 400);
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);

    await this.dbService.execute(`
      UPDATE alert_subscriptions 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, values);

    const updatedSubscription = await this.dbService.queryOne(
      'SELECT * FROM alert_subscriptions WHERE id = ?',
      [id]
    );

    const response: ApiResponse<any> = {
      success: true,
      data: updatedSubscription,
      message: 'Alert subscription updated successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // DELETE /api/alerts/:id - Delete alert subscription
  public deleteSubscription = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { id } = req.params;

    const subscription = await this.dbService.queryOne(
      'SELECT * FROM alert_subscriptions WHERE id = ?',
      [id]
    );

    if (!subscription) {
      throw createError('Alert subscription not found', 404);
    }

    await this.dbService.execute('DELETE FROM alert_subscriptions WHERE id = ?', [id]);

    const response: ApiResponse<null> = {
      success: true,
      data: null,
      message: 'Alert subscription deleted successfully',
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // GET /api/alerts/history/:email - Get alert history for an email
  public getAlertHistory = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    const { email } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    if (!email) {
      throw createError('Email parameter is required', 400);
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError('Invalid email format', 400);
    }

    const history = await this.dbService.query(`
      SELECT 
        ah.*,
        p.name as pool_name,
        s.alert_type,
        s.threshold
      FROM alert_history ah
      INNER JOIN alert_subscriptions s ON ah.subscription_id = s.id
      LEFT JOIN pools p ON ah.pool_id = p.id
      WHERE s.email = ?
      ORDER BY ah.triggered_at DESC
      LIMIT ? OFFSET ?
    `, [email, parseInt(limit as string), parseInt(offset as string)]);

    const totalCount = await this.dbService.queryOne(`
      SELECT COUNT(*) as count
      FROM alert_history ah
      INNER JOIN alert_subscriptions s ON ah.subscription_id = s.id
      WHERE s.email = ?
    `, [email]);

    const response: ApiResponse<any[]> = {
      success: true,
      data: history,
      message: `Found ${history.length} alert history records`,
      timestamp: new Date().toISOString()
    };

    res.json(response);
  });

  // POST /api/alerts/test - Test alert (development only)
  public testAlert = asyncHandler(async (req: Request, res: Response): Promise<void> => {
    if (process.env.NODE_ENV === 'production') {
      throw createError('Test alerts not available in production', 403);
    }

    const { email, alert_type, message } = req.body;

    if (!email || !alert_type || !message) {
      throw createError('Email, alert_type, and message are required', 400);
    }

    // Create a temporary alert history entry for testing
    const testId = this.generateId();
    const testSubscriptionId = this.generateId();

    // Insert temporary subscription if it doesn't exist
    try {
      await this.dbService.execute(`
        INSERT OR IGNORE INTO alert_subscriptions (id, email, alert_type, threshold, is_active)
        VALUES (?, ?, ?, ?, ?)
      `, [testSubscriptionId, email, alert_type, 0, 1]);

      // Insert test alert history
      await this.dbService.execute(`
        INSERT INTO alert_history (id, subscription_id, message, email_sent, triggered_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `, [testId, testSubscriptionId, message, 0]);

      const response: ApiResponse<any> = {
        success: true,
        data: { test_id: testId, message: 'Test alert created' },
        message: 'Test alert sent successfully',
        timestamp: new Date().toISOString()
      };

      res.json(response);
    } catch (error) {
      throw createError('Failed to create test alert', 500);
    }
  });

  private generateId(): string {
    if (process.env.DATABASE_TYPE === 'sqlite') {
      return require('crypto').randomBytes(16).toString('hex');
    } else {
      return uuidv4();
    }
  }
}

// Initialize controller with database service
let alertController: AlertController;

// Routes
router.post('/subscribe', (req, res, next) => {
  if (!alertController) {
    return next(createError('Service not initialized', 500));
  }
  alertController.createSubscription(req, res, next);
});

router.get('/manage/:email', (req, res, next) => {
  if (!alertController) {
    return next(createError('Service not initialized', 500));
  }
  alertController.getSubscriptionsByEmail(req, res, next);
});

router.put('/:id', (req, res, next) => {
  if (!alertController) {
    return next(createError('Service not initialized', 500));
  }
  alertController.updateSubscription(req, res, next);
});

router.delete('/:id', (req, res, next) => {
  if (!alertController) {
    return next(createError('Service not initialized', 500));
  }
  alertController.deleteSubscription(req, res, next);
});

router.get('/history/:email', (req, res, next) => {
  if (!alertController) {
    return next(createError('Service not initialized', 500));
  }
  alertController.getAlertHistory(req, res, next);
});

router.post('/test', (req, res, next) => {
  if (!alertController) {
    return next(createError('Service not initialized', 500));
  }
  alertController.testAlert(req, res, next);
});

// Initialize function to be called from server.ts
export const initializeAlertController = (dbService: DatabaseService): void => {
  alertController = new AlertController(dbService);
};

export default router;