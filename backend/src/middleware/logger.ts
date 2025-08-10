import { Request, Response, NextFunction } from 'express';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    
    const logLevel = statusCode >= 400 ? 'error' : 'info';
    const emoji = statusCode >= 500 ? '❌' : statusCode >= 400 ? '⚠️' : '✅';
    
    console.log(
      `${emoji} [${new Date().toISOString()}] ${req.method} ${req.path} - ${statusCode} - ${duration}ms`
    );
    
    if (req.body && Object.keys(req.body).length > 0 && process.env.LOG_LEVEL === 'debug') {
      console.log('📥 Request body:', JSON.stringify(req.body, null, 2));
    }
  });
  
  next();
};