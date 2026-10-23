import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.config.js';
import { StaffTokenClaims, KioskTokenClaims } from '../types/auth.types.js';

export class TokenUtil {
  private static readonly SALT_ROUNDS = 12;

  /**
   * Hashes a staff/doctor password using bcrypt with 12 salt rounds
   */
  public static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Securely compares plaintext password against stored hash
   */
  public static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generates a cryptographically secure random token (for refresh tokens, password resets)
   */
  public static generateRandomToken(byteLength: number = 32): string {
    return crypto.randomBytes(byteLength).toString('hex');
  }

  /**
   * Computes SHA-256 hash of a token for secure database storage
   */
  public static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Generates short-lived JWT access token for staff/doctor
   */
  public static generateStaffAccessToken(claims: Omit<StaffTokenClaims, 'type'>): string {
    const payload: StaffTokenClaims = {
      ...claims,
      type: 'STAFF_ACCESS',
    };
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: env.JWT_EXPIRES_IN as any,
    });
  }

  /**
   * Verifies staff access token
   */
  public static verifyStaffAccessToken(token: string): StaffTokenClaims {
    const decoded = jwt.verify(token, env.JWT_SECRET) as StaffTokenClaims;
    if (decoded.type !== 'STAFF_ACCESS') {
      throw new Error('Invalid token type for staff access');
    }
    return decoded;
  }

  /**
   * Generates a secure refresh token for staff with hash for DB storage and expiration date
   */
  public static generateStaffRefreshToken(): { token: string; hash: string; expiresAt: Date } {
    const rawToken = this.generateRandomToken(40);
    const hash = this.hashToken(rawToken);
    
    // Parse expiration (e.g., 7d)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return { token: rawToken, hash, expiresAt };
  }

  /**
   * Generates a visit-scoped session token for patient kiosk
   */
  public static generateKioskSessionToken(claims: Omit<KioskTokenClaims, 'type'>): {
    token: string;
    hash: string;
    expiresAt: Date;
  } {
    const payload: KioskTokenClaims = {
      ...claims,
      type: 'KIOSK_SESSION',
    };

    const token = jwt.sign(payload, env.KIOSK_SESSION_SECRET, {
      expiresIn: env.KIOSK_SESSION_EXPIRES_IN as any,
    });

    const hash = this.hashToken(token);

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour session

    return { token, hash, expiresAt };
  }

  /**
   * Verifies a kiosk session token
   */
  public static verifyKioskSessionToken(token: string): KioskTokenClaims {
    const decoded = jwt.verify(token, env.KIOSK_SESSION_SECRET) as KioskTokenClaims;
    if (decoded.type !== 'KIOSK_SESSION') {
      throw new Error('Invalid token type for kiosk session');
    }
    return decoded;
  }

  /**
   * Generates a tamper-proof HMAC-SHA256 signed query token for doctor document/snippet streaming.
   * Format: base64url(documentId:doctorId:expiresAtTimestamp:hmacSignature)
   */
  public static generateSignedDocumentToken(
    documentId: string,
    doctorId: string,
    expiresInMs: number = 15 * 60 * 1000
  ): { token: string; expiresAt: Date } {
    const expiresTimestamp = Date.now() + expiresInMs;
    const expiresAt = new Date(expiresTimestamp);
    const payload = `${documentId}:${doctorId}:${expiresTimestamp}`;
    const hmac = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');
    const token = Buffer.from(`${payload}:${hmac}`).toString('base64url');
    return { token, expiresAt };
  }

  /**
   * Cryptographically verifies a signed document streaming query token.
   * Returns { documentId, doctorId } if valid, unexpired, and signature matches.
   * Returns null if invalid, expired, or tampered.
   */
  public static verifySignedDocumentToken(
    token: string
  ): { documentId: string; doctorId: string } | null {
    try {
      if (!token || typeof token !== 'string') return null;
      const raw = Buffer.from(token, 'base64url').toString('utf8');
      const parts = raw.split(':');
      if (parts.length !== 4) return null;

      const documentId = parts[0];
      const doctorId = parts[1];
      const expiresStr = parts[2];
      const signature = parts[3];

      if (!documentId || !doctorId || !expiresStr || !signature) {
        return null;
      }

      const expiresAt = parseInt(expiresStr, 10);
      if (isNaN(expiresAt) || Date.now() > expiresAt) {
        return null;
      }

      const payload = `${documentId}:${doctorId}:${expiresStr}`;
      const expectedHmac = crypto.createHmac('sha256', env.JWT_SECRET).update(payload).digest('hex');

      const sigBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(expectedHmac);

      if (
        sigBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(sigBuffer, expectedBuffer)
      ) {
        return null;
      }

      return { documentId, doctorId };
    } catch {
      return null;
    }

  }
}

