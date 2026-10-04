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
}
exports.TokenUtil = TokenUtil;
