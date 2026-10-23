"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.devFallbackAuthStore = void 0;
class DevFallbackStore {
    users = new Map();
    refreshTokens = new Map();
    constructor() {
        this.seedDefaultUsers();
    }
    seedDefaultUsers() {
        const defaultAccounts = [
            {
                id: 'c0000000-0000-4000-a000-000000000001',
                email: 'nithiya0sy@gmail.com',
                fullName: 'Dr. Nithiya Sri',
                role: 'DOCTOR',
                dept: 'OPD General Medicine & Critical Care',
            },
            {
                id: 'c0000000-0000-4000-a000-000000000002',
                email: 'dr.ananya@hospital.org',
                fullName: 'Dr. Ananya Sharma',
                role: 'DOCTOR',
                dept: 'Department of General Medicine',
            },
            {
                id: 'c0000000-0000-4000-a000-000000000003',
                email: 'admin@thunai.hospital',
                fullName: 'Hospital Chief Admin',
                role: 'SUPER_ADMIN',
                dept: 'Clinical Administration',
            },
            {
                id: 'c0000000-0000-4000-a000-000000000013',
                email: 'admin@medikiosk.hospital',
                fullName: 'Hospital Chief Admin',
                role: 'SUPER_ADMIN',
                dept: 'Clinical Administration',
            },
            {
                id: 'c0000000-0000-4000-a000-000000000004',
                email: 'staff@thunai.hospital',
                fullName: 'OPD Staff Attendant',
                role: 'STAFF_ATTENDANT',
                dept: 'OPD Reception & Triage',
            },
            {
                id: 'c0000000-0000-4000-a000-000000000014',
                email: 'staff@medikiosk.hospital',
                fullName: 'OPD Staff Attendant',
                role: 'STAFF_ATTENDANT',
                dept: 'OPD Reception & Triage',
            },
            {
                id: 'c0000000-0000-4000-a000-000000000005',
                email: 'dr.reddy@hospital.org',
                fullName: 'Dr. Suresh Reddy',
                role: 'DOCTOR',
                dept: 'Cardiology',
            },
            {
                id: 'c0000000-0000-4000-a000-000000000010',
                email: 'ops.admin@hospital.org',
                fullName: 'Operations Administrator',
                role: 'ADMIN',
                dept: 'Hospital IT Operations',
            },
            {
                id: 'c0000000-0000-4000-a000-000000000011',
                email: 'analyst@hospital.org',
                fullName: 'Quality Data Analyst',
                role: 'ANALYST',
                dept: 'Health Quality Intelligence',
            },
            {
                id: 'c0000000-0000-4000-a000-000000000012',
                email: 'auditor@hospital.org',
                fullName: 'Hospital Compliance Auditor',
                role: 'AUDITOR',
                dept: 'Internal Audit & Ethics',
            },
        ];
        // Real bcrypt hash for standard clinical development password: 'doctor123'
        const standardDevPasswordHash = '$2b$10$TBFy4EjU9N25cbuLVhv.AOIr8KK3VwmQnUGm.Qsu8.e7BaCipZYzq';
        for (const acc of defaultAccounts) {
            this.users.set(acc.email.toLowerCase(), {
                id: acc.id,
                email: acc.email.toLowerCase(),
                password_hash: standardDevPasswordHash,
                full_name: acc.fullName,
                role: acc.role,
                status: 'ACTIVE',
                hospital_department: acc.dept,
                email_verified_at: new Date(),
                last_login_at: null,
                created_at: new Date(),
                updated_at: new Date(),
                _isDevFallback: true,
            });
        }
    }
    findUserByEmail(email) {
        const normalized = email.toLowerCase().trim();
        let user = this.users.get(normalized);
        if (!user) {
            // Auto-provision entered email during offline dev mode with valid password verification
            const localPart = normalized.split('@')[0] || 'doctor';
            const cleanName = localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
            const newId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
            user = {
                id: newId,
                email: normalized,
                password_hash: '$2b$10$TBFy4EjU9N25cbuLVhv.AOIr8KK3VwmQnUGm.Qsu8.e7BaCipZYzq',
                full_name: `Dr. ${cleanName}`,
                role: 'DOCTOR',
                status: 'ACTIVE',
                hospital_department: 'OPD Clinical Services',
                email_verified_at: new Date(),
                last_login_at: null,
                created_at: new Date(),
                updated_at: new Date(),
                _isDevFallback: true,
            };
            this.users.set(normalized, user);
        }
        return user;
    }
    findUserById(id) {
        for (const user of this.users.values()) {
            if (user.id === id)
                return user;
        }
        return null;
    }
    listAllUsers() {
        return Array.from(this.users.values());
    }
    updateUserRole(id, role) {
        const user = this.findUserById(id);
        if (user) {
            user.role = role;
            user.updated_at = new Date();
        }
        return user;
    }
    updateUserStatus(id, status) {
        const user = this.findUserById(id);
        if (user) {
            user.status = status;
            user.updated_at = new Date();
        }
        return user;
    }
    createStaffUser(data) {
        const normalized = data.email.toLowerCase().trim();
        const newUser = {
            id: `dev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            email: normalized,
            password_hash: data.passwordHash,
            full_name: data.fullName,
            role: data.role,
            status: data.status || 'ACTIVE',
            hospital_department: data.hospitalDepartment || 'General Medicine',
            email_verified_at: new Date(),
            last_login_at: null,
            created_at: new Date(),
            updated_at: new Date(),
            _isDevFallback: true,
        };
        this.users.set(normalized, newUser);
        return newUser;
    }
    updateLastLogin(id) {
        const user = this.findUserById(id);
        if (user) {
            user.last_login_at = new Date();
        }
        return user;
    }
    createRefreshToken(data) {
        const token = {
            id: `tok-${Date.now()}`,
            staff_user_id: data.staffUserId,
            token_hash: data.tokenHash,
            expires_at: data.expiresAt,
            revoked_at: null,
            created_at: new Date(),
            staff_user: this.findUserById(data.staffUserId) || undefined,
        };
        this.refreshTokens.set(data.tokenHash, token);
        return token;
    }
    findRefreshTokenByHash(tokenHash) {
        const token = this.refreshTokens.get(tokenHash);
        if (token) {
            token.staff_user = this.findUserById(token.staff_user_id) || undefined;
            return token;
        }
        return null;
    }
    revokeRefreshToken(tokenHash) {
        const token = this.refreshTokens.get(tokenHash);
        if (token) {
            token.revoked_at = new Date();
        }
    }
    revokeAllUserRefreshTokens(staffUserId) {
        for (const token of this.refreshTokens.values()) {
            if (token.staff_user_id === staffUserId) {
                token.revoked_at = new Date();
            }
        }
    }
}
exports.devFallbackAuthStore = new DevFallbackStore();
