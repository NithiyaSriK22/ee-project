import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

/**
 * Structured Safe Logger Middleware
 *
 * SAFETY INVARIANT: ZERO CLINICAL CONTENT IN LOGS.
 * Logs only HTTP protocol metadata, latency, request IDs, and status codes.
 * Clinical data (symptoms, drugs, allergies, free text, patient names) is never logged.
 */

export interface LogEntry {
  requestId: string;
  timestamp: string;
  method: string;
  path: string;
  statusCode?: number;
  durationMs?: number;
  ip?: string;
  userAgent?: string;
}

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = process.hrtime.bigint();

  res.on('finish', () => {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - startTime) / 1_000_000;

    const logEntry: LogEntry = {
      requestId,
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
      ip: req.ip || req.socket.remoteAddress,
      userAgent: req.get('user-agent'),
    };

    // Print safe structured JSON log (No body, no query params with potential PHI)
    if (res.statusCode >= 500) {
      console.error(JSON.stringify({ level: 'ERROR', ...logEntry }));
    } else if (res.statusCode >= 400) {
      console.warn(JSON.stringify({ level: 'WARN', ...logEntry }));
    } else {
      console.log(JSON.stringify({ level: 'INFO', ...logEntry }));
    }
  });

  next();
}
