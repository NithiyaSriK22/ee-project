import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { authorizeRoles, authenticateStaff } from '../src/middleware/auth.middleware.js';
import { globalErrorHandler } from '../src/middleware/error.middleware.js';
import { TokenUtil } from '../src/utils/token.util.js';
import { AppRequest } from '../src/types/api.types.js';

describe('Module 2 — RBAC and Authorization Middleware', () => {
  const app = express();
  app.use(express.json());

  // Mock staff injection route for testing role authorization
  app.post('/api/test/doctor-only', (req: AppRequest, _res, next) => {
    req.user = req.body.user;
    next();
  }, authorizeRoles('DOCTOR', 'SUPER_ADMIN'), (_req, res) => {
    res.json({ success: true, message: 'Doctor clinical action approved' });
  });

  app.post('/api/test/admin-only', (req: AppRequest, _res, next) => {
    req.user = req.body.user;
    next();
  }, authorizeRoles('ADMIN', 'SUPER_ADMIN'), (_req, res) => {
    res.json({ success: true, message: 'Admin action approved' });
  });

  app.use(globalErrorHandler);

  it('Should allow DOCTOR to access doctor-only route', async () => {
    const res = await request(app)
      .post('/api/test/doctor-only')
      .send({
        user: {
          id: 'doc-1',
          email: 'doc@hospital.org',
          role: 'DOCTOR',
          fullName: 'Dr. Rao',
          status: 'ACTIVE',
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('Should forbid STAFF_ATTENDANT from accessing doctor-only route', async () => {
    const res = await request(app)
      .post('/api/test/doctor-only')
      .send({
        user: {
          id: 'staff-1',
          email: 'staff@hospital.org',
          role: 'STAFF_ATTENDANT',
          fullName: 'Attendant Ramesh',
          status: 'ACTIVE',
        },
      });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('Should reject request when user is unauthenticated', async () => {
    const res = await request(app)
      .post('/api/test/doctor-only')
      .send({});

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
