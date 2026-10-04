import { Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { AppRequest } from '../types/api.types.js';

export const requestIdMiddleware = (req: AppRequest, res: Response, next: NextFunction): void => {
  const existingId = req.headers['x-request-id'];
  const requestId = (typeof existingId === 'string' && existingId.trim() !== '') 
    ? existingId 
    : randomUUID();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
};
