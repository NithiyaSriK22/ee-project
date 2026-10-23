import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import { ENV } from './config/env';
import { requestLogger } from './middleware/logger';
import { errorHandler, AppError } from './middleware/error-handler';
import { healthRouter } from './routes/health.routes';
import { demoRouter } from './routes/demo.routes';

export function createApp(): Express {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: [ENV.CORS_ORIGIN, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
    })
  );

  app.use(express.json());
  app.use(requestLogger);

  // Serve synthetic prescription images
  const imagesPath = path.resolve(__dirname, '../../../../seed/images');
  app.use('/api/images', express.static(imagesPath));

  // Mount API routers
  app.use('/api', healthRouter);
  app.use('/api', demoRouter);

  // 404 Route Handler
  app.use((req: Request, res: Response, next) => {
    next(new AppError(404, 'ROUTE_NOT_FOUND', `Cannot ${req.method} ${req.originalUrl}`));
  });

  // Central Error Handler
  app.use(errorHandler);

  return app;
}
