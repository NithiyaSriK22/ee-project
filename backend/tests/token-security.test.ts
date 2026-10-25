import { describe, it, expect } from 'vitest';
import { TokenUtil } from '../src/utils/token.util.js';

describe('Module 2 — Token & Password Security Utilities', () => {
  it('Should hash password and verify match correctly', async () => {
    const rawPassword = 'ClinicalDoctorPass#2026';
    const hash = await TokenUtil.hashPassword(rawPassword);

    expect(hash).toBeDefined();
    expect(hash).not.toBe(rawPassword);
    expect(hash.startsWith('$2')).toBe(true); // bcrypt signature

    const isMatch = await TokenUtil.comparePassword(rawPassword, hash);
    expect(isMatch).toBe(true);

    const isWrongMatch = await TokenUtil.comparePassword('WrongPassword123', hash);
    expect(isWrongMatch).toBe(false);
  });

  it('Should produce consistent SHA-256 hash for database token storage', () => {
    const token = 'sample-random-token-string';
    const hash1 = TokenUtil.hashToken(token);
    const hash2 = TokenUtil.hashToken(token);

    expect(hash1).toBe(hash2);
    expect(hash1.length).toBe(64); // 256 bits in hex
  });

  it('Should sign and verify staff access token correctly', () => {
    const claims = {
      sub: '550e8400-e29b-41d4-a716-446655440000',
      email: 'doctor.sharma@hospital.org',
      role: 'DOCTOR' as const,
      fullName: 'Dr. Ananya Sharma',
      department: 'Cardiology OPD',
    };

    const token = TokenUtil.generateStaffAccessToken(claims);
    expect(token).toBeDefined();

    const decoded = TokenUtil.verifyStaffAccessToken(token);
    expect(decoded.sub).toBe(claims.sub);
    expect(decoded.email).toBe(claims.email);
    expect(decoded.role).toBe('DOCTOR');
    expect(decoded.type).toBe('STAFF_ACCESS');
  });

  it('Should sign and verify kiosk session token correctly', () => {
    const claims = {
      sessionId: 'sess_12345',
      visitId: 'vis_98765',
      patientId: 'pat_45678',
    };

    const { token, hash, expiresAt } = TokenUtil.generateKioskSessionToken(claims);
    expect(token).toBeDefined();
    expect(hash).toBeDefined();
    expect(expiresAt.getTime()).toBeGreaterThan(Date.now());

    const decoded = TokenUtil.verifyKioskSessionToken(token);
    expect(decoded.visitId).toBe('vis_98765');
    expect(decoded.patientId).toBe('pat_45678');
    expect(decoded.type).toBe('KIOSK_SESSION');
  });

  it('Should reject tampered or invalid tokens', () => {
    // Dynamically generate authentic token and corrupt signature to test tamper rejection
    const authenticToken = TokenUtil.generateStaffAccessToken({
      userId: 'usr_tamper_test',
      role: 'DOCTOR',
      sessionId: 'sess_tamper_test',
    });
    const tamperedToken = authenticToken.slice(0, -6) + 'xxxxxx';
    expect(() => TokenUtil.verifyStaffAccessToken(tamperedToken)).toThrow();
    expect(() => TokenUtil.verifyKioskSessionToken(tamperedToken)).toThrow();

    // Verify rejection of malformed token structure
    const malformedToken = 'invalid.synthetic.payload';
    expect(() => TokenUtil.verifyStaffAccessToken(malformedToken)).toThrow();
    expect(() => TokenUtil.verifyKioskSessionToken(malformedToken)).toThrow();
  });
});
