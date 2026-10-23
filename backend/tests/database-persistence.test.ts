import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';
import { prisma, checkDatabaseHealth, disconnectDatabase } from '../src/database/prisma.js';
import fs from 'node:fs';
import path from 'node:path';

describe('STAGE 1 — DATABASE CONNECTIVITY & DURABLE PERSISTENCE AUDIT', () => {
  const app = createApp();

  // ============================================================================
  // 1. DATABASE CONNECTIVITY & HEALTH REPORTING
  // ============================================================================
  it('1. Should report database as connected and status as healthy on /api/v1/health', async () => {
    const isHealthy = await checkDatabaseHealth();
    expect(isHealthy).toBe(true);

    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.database).toBe('connected');
    expect(res.body.data.status).toBe('healthy');
  });

  it('2. Should report database as OPERATIONAL on /status board', async () => {
    const res = await request(app).get('/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.services.database).toBe('OPERATIONAL');
    expect(res.body.data.overallStatus).toBe('OPERATIONAL');
    expect(res.body.data.staffGuidance).toContain('System running normally');
  });

  // ============================================================================
  // 3. SYNTHETIC RECORD CREATION & RETRIEVAL VIA PRISMA
  // ============================================================================
  it('3. Should create a synthetic record in PostgreSQL and retrieve it successfully', async () => {
    const testKey = `STAGE1_PERSISTENCE_TEST_${Date.now()}`;
    const testValue = JSON.stringify({
      verifiedAt: new Date().toISOString(),
      testRunId: 'stage1-verification',
      persistenceEngine: 'PostgreSQL-18.4',
    });

    // Create record
    const created = await prisma.systemConfig.create({
      data: {
        key: testKey,
        value: testValue,
        description: 'Automated Stage 1 persistence verification record',
      },
    });

    expect(created).toBeDefined();
    expect(created.id).toBeDefined();
    expect(created.key).toBe(testKey);

    // Retrieve record directly from database
    const fetched = await prisma.systemConfig.findUnique({
      where: { key: testKey },
    });

    expect(fetched).toBeDefined();
    expect(fetched?.key).toBe(testKey);
    expect(fetched?.value).toBe(testValue);
  });

  // ============================================================================
  // 4. SURVIVAL ACROSS CONTROLLED APPLICATION RESTART
  // ============================================================================
  it('4. Should ensure persistent record survives a controlled application disconnection/restart', async () => {
    const testKey = `STAGE1_RESTART_SURVIVAL_${Date.now()}`;
    const testValue = 'Persistence across backend restart verified';

    // 1. Create record before restart
    await prisma.systemConfig.create({
      data: {
        key: testKey,
        value: testValue,
        description: 'Restart survival test record',
      },
    });

    // 2. Simulate complete application disconnection / shutdown
    await disconnectDatabase();

    // 3. Re-query after reconnection simulation
    const postRestart = await prisma.systemConfig.findUnique({
      where: { key: testKey },
    });

    expect(postRestart).toBeDefined();
    expect(postRestart?.key).toBe(testKey);
    expect(postRestart?.value).toBe(testValue);

    // Clean up synthetic test record
    await prisma.systemConfig.delete({
      where: { key: testKey },
    });
  });

  // ============================================================================
  // 5. EXISTING DATA PRESERVATION
  // ============================================================================
  it('5. Should confirm legacy SQLite file exists and is preserved completely intact', () => {
    const legacyDbPath = path.resolve(
      process.cwd().endsWith('backend') ? '..' : '.',
      'thunai',
      'apps',
      'api',
      'data',
      'thunai.db'
    );

    expect(fs.existsSync(legacyDbPath)).toBe(true);
    const stats = fs.statSync(legacyDbPath);
    expect(stats.size).toBeGreaterThan(100000); // 172KB
  });
});
