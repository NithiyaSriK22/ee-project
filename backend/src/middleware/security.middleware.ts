import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.config.js';
import { ResponseUtil } from '../utils/response.util.js';
import { ErrorCode } from '../errors/error-codes.js';

// 1. Helmet security headers
export const helmetMiddleware = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'", env.KIOSK_FRONTEND_URL, env.DOCTOR_PORTAL_FRONTEND_URL],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// 2. Dual-Origin CORS configuration
const allowedOrigins = [
  env.KIOSK_FRONTEND_URL,
  env.DOCTOR_PORTAL_FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
];

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, health checks) in development
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || env.NODE_ENV === 'development') {
      return callback(null, true);
    }

    return callback(new Error(`CORS policy does not allow access from origin ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  exposedHeaders: ['X-Request-ID'],
});

// 3. Baseline Rate Limiter
export const rateLimiterMiddleware = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    ResponseUtil.error(
      res,
      429,
      ErrorCode.RATE_LIMITED,
      'Too many requests received from this client. Please slow down and try again shortly.'
    );
  },
});
