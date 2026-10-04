import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app.js';

describe('Global Error Handling', () => {
  const app = createApp();

  it('Unknown routes should trigger 404 NOT_FOUND standard error envelope', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-endpoint');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Endpoint not found');
  });

  it('Security headers (Helmet) should be present on all responses', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
  });
});
