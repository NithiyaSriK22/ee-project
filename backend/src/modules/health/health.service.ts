import { checkDatabaseHealth } from '../../database/prisma.js';
import { env } from '../../config/env.config.js';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  version: string;
  environment: string;
  uptimeSeconds: number;
  timestamp: string;
  database: 'connected' | 'disconnected';
  memory: {
    rssMb: number;
    heapUsedMb: number;
  };
}

export class HealthService {
  public static async getDetailedHealth(forceRefresh = true): Promise<HealthStatus> {
    const isDbConnected = await checkDatabaseHealth(forceRefresh);
    const memory = process.memoryUsage();

    return {
      status: isDbConnected ? 'healthy' : 'degraded',
      service: 'thunai-backend',
      version: '1.0.0',
      environment: env.NODE_ENV,
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: isDbConnected ? 'connected' : 'disconnected',
      memory: {
        rssMb: Math.round((memory.rss / 1024 / 1024) * 100) / 100,
        heapUsedMb: Math.round((memory.heapUsed / 1024 / 1024) * 100) / 100,
      },
    };
  }

  public static getLiveness(): { status: string; uptime: number } {
    return {
      status: 'alive',
      uptime: Math.floor(process.uptime()),
    };
  }

  public static async getReadiness(forceRefresh = true): Promise<{ ready: boolean; database: string }> {
    const isDbConnected = await checkDatabaseHealth(forceRefresh);
    return {
      ready: isDbConnected,
      database: isDbConnected ? 'connected' : 'disconnected',
    };
  }
}
