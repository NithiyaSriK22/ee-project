import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Health Module API', () => {
  const app = createApp();

  it('GET /api/v1 should return API info discovery payload', async () => {
    const res = await request(app).get('/api/v1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toContain('THUNAI');
    expect(res.body.data.version).toBe('1.0.0');
    expect(res.body.data.endpoints).toBeDefined();
    expect(res.body.data.endpoints.health).toBe('/api/v1/health');
  });

  it('GET /api/v1/health should return standard 200 health response envelope', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.service).toBe('thunai-backend');
    expect(res.body.data.status).toMatch(/healthy|degraded/);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.timestamp).toBeDefined();
  });

  it('GET /api/v1/health/live should return alive status', async () => {
    const res = await request(app).get('/api/v1/health/live');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('alive');
  });

  it('GET /api/v1/health/ready should return readiness evaluation', async () => {
    const res = await request(app).get('/api/v1/health/ready');

    // May return 200 (connected) or 503 (disconnected in mock env without DB running)
    expect([200, 503]).toContain(res.status);
    expect(res.body.data.database).toBeDefined();
  });
});
