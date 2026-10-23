import { Router, Request, Response } from 'express';
import { ENV } from '../config/env';
import { getDatabase } from '../db/database';

export const healthRouter = Router();

healthRouter.get('/health', (req: Request, res: Response) => {
  let dbStatus = 'ok';
  try {
    const db = getDatabase();
    db.prepare('SELECT 1').get();
  } catch (err: any) {
    dbStatus = 'error: ' + err.message;
  }

  res.status(dbStatus === 'ok' ? 200 : 503).json({
    status: dbStatus === 'ok' ? 'HEALTHY' : 'DEGRADED',
    service: 'thunai-api',
    version: '1.0.0-demo',
    timestamp: new Date().toISOString(),
    flags: {
      demoMode: ENV.DEMO_MODE,
      ocrMode: ENV.OCR_MODE,
      summaryMode: ENV.SUMMARY_MODE,
    },
    database: dbStatus,
  });
});
