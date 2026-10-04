import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { z } from 'zod';
import { validateRequest } from '../src/middleware/validate.middleware.js';
import { globalErrorHandler } from '../src/middleware/error.middleware.js';

describe('Zod Validation Middleware Foundation', () => {
  const testApp = express();
  testApp.use(express.json());

  const sampleSchema = {
    body: z.object({
      fieldId: z.string().uuid('Field ID must be a valid UUID'),
      value: z.string().min(2, 'Value is too short'),
    }),
  };

  testApp.post('/api/v1/test-validate', validateRequest(sampleSchema), (_req, res) => {
    res.json({ success: true, message: 'Valid input' });
  });

  testApp.use(globalErrorHandler);

  it('Should reject invalid payload with 400 VALIDATION_ERROR and field details', async () => {
    const res = await request(testApp)
      .post('/api/v1/test-validate')
      .send({ fieldId: 'invalid-id', value: 'a' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
    expect(res.body.error.details.length).toBeGreaterThanOrEqual(2);
  });

  it('Should pass valid payload smoothly', async () => {
    const res = await request(testApp)
      .post('/api/v1/test-validate')
      .send({
        fieldId: 'a3bb189e-8bf9-3888-9912-ace4e6543002',
        value: 'Valid string value',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
