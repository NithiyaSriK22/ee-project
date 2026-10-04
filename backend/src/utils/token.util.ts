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
}
