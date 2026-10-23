"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenUtil = void 0;
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_config_js_1 = require("../config/env.config.js");
class TokenUtil {
    static SALT_ROUNDS = 12;
    /**
     * Hashes a staff/doctor password using bcrypt with 12 salt rounds
     */
    static async hashPassword(password) {
        return bcryptjs_1.default.hash(password, this.SALT_ROUNDS);
    }
    /**
     * Securely compares plaintext password against stored hash
     */
    static async comparePassword(password, hash) {
        return bcryptjs_1.default.compare(password, hash);
    }
    /**
     * Generates a cryptographically secure random token (for refresh tokens, password resets)
     */
    static generateRandomToken(byteLength = 32) {
        return crypto_1.default.randomBytes(byteLength).toString('hex');
    }
    /**
     * Computes SHA-256 hash of a token for secure database storage
     */
    static hashToken(token) {
        return crypto_1.default.createHash('sha256').update(token).digest('hex');
    }
    /**
     * Generates short-lived JWT access token for staff/doctor
     */
    static generateStaffAccessToken(claims) {
        const payload = {
            ...claims,
            type: 'STAFF_ACCESS',
        };
        return jsonwebtoken_1.default.sign(payload, env_config_js_1.env.JWT_SECRET, {
            expiresIn: env_config_js_1.env.JWT_EXPIRES_IN,
        });
    }
    /**
     * Verifies staff access token
     */
    static verifyStaffAccessToken(token) {
        const decoded = jsonwebtoken_1.default.verify(token, env_config_js_1.env.JWT_SECRET);
        if (decoded.type !== 'STAFF_ACCESS') {
            throw new Error('Invalid token type for staff access');
        }
        return decoded;
    }
    /**
     * Generates a secure refresh token for staff with hash for DB storage and expiration date
     */
    static generateStaffRefreshToken() {
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
    static generateKioskSessionToken(claims) {
        const payload = {
            ...claims,
            type: 'KIOSK_SESSION',
        };
        const token = jsonwebtoken_1.default.sign(payload, env_config_js_1.env.KIOSK_SESSION_SECRET, {
            expiresIn: env_config_js_1.env.KIOSK_SESSION_EXPIRES_IN,
        });
        const hash = this.hashToken(token);
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // 1 hour session
        return { token, hash, expiresAt };
    }
    /**
     * Verifies a kiosk session token
     */
    static verifyKioskSessionToken(token) {
        const decoded = jsonwebtoken_1.default.verify(token, env_config_js_1.env.KIOSK_SESSION_SECRET);
        if (decoded.type !== 'KIOSK_SESSION') {
            throw new Error('Invalid token type for kiosk session');
        }
        return decoded;
    }
    /**
     * Generates a tamper-proof HMAC-SHA256 signed query token for doctor document/snippet streaming.
     * Format: base64url(documentId:doctorId:expiresAtTimestamp:hmacSignature)
     */
    static generateSignedDocumentToken(documentId, doctorId, expiresInMs = 15 * 60 * 1000) {
        const expiresTimestamp = Date.now() + expiresInMs;
        const expiresAt = new Date(expiresTimestamp);
        const payload = `${documentId}:${doctorId}:${expiresTimestamp}`;
        const hmac = crypto_1.default.createHmac('sha256', env_config_js_1.env.JWT_SECRET).update(payload).digest('hex');
        const token = Buffer.from(`${payload}:${hmac}`).toString('base64url');
        return { token, expiresAt };
    }
    /**
     * Cryptographically verifies a signed document streaming query token.
     * Returns { documentId, doctorId } if valid, unexpired, and signature matches.
     * Returns null if invalid, expired, or tampered.
     */
    static verifySignedDocumentToken(token) {
        try {
            if (!token || typeof token !== 'string')
                return null;
            const raw = Buffer.from(token, 'base64url').toString('utf8');
            const parts = raw.split(':');
            if (parts.length !== 4)
                return null;
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
            const expectedHmac = crypto_1.default.createHmac('sha256', env_config_js_1.env.JWT_SECRET).update(payload).digest('hex');
            const sigBuffer = Buffer.from(signature);
            const expectedBuffer = Buffer.from(expectedHmac);
            if (sigBuffer.length !== expectedBuffer.length ||
                !crypto_1.default.timingSafeEqual(sigBuffer, expectedBuffer)) {
                return null;
            }
            return { documentId, doctorId };
        }
        catch {
            return null;
        }
    }
}
exports.TokenUtil = TokenUtil;
