import { StaffRole, StaffUserStatusType } from '../../types/auth.types.js';

export interface DevStaffUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: StaffRole;
  status: StaffUserStatusType;
  hospital_department: string | null;
  email_verified_at: Date | null;
  last_login_at: Date | null;
  created_at: Date;
  updated_at: Date;
  _isDevFallback?: boolean;
}

export interface DevRefreshToken {
  id: string;
  staff_user_id: string;
  token_hash: string;
  expires_at: Date;
  revoked_at: Date | null;
  created_at: Date;
  staff_user?: DevStaffUser;
}

class DevFallbackStore {
  private users: Map<string, DevStaffUser> = new Map();
  private refreshTokens: Map<string, DevRefreshToken> = new Map();

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    const defaultAccounts: Array<{
      id: string;
      email: string;
      fullName: string;
      role: StaffRole;
      dept: string;
    }> = [
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
        email: 'admin@medikiosk.hospital',
        fullName: 'Hospital Chief Admin',
        role: 'SUPER_ADMIN',
        dept: 'Clinical Administration',
      },
      {
        id: 'c0000000-0000-4000-a000-000000000004',
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
    ];

    for (const acc of defaultAccounts) {
      this.users.set(acc.email.toLowerCase(), {
        id: acc.id,
        email: acc.email.toLowerCase(),
        password_hash: '$2a$12$e80yq9RzJ3Uj.Q9E7eN/Z.6h94zF6yL8K/oP7qE4lqX6e5dF1wDmu',
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

  public findUserByEmail(email: string): DevStaffUser | null {
    const normalized = email.toLowerCase().trim();
    let user = this.users.get(normalized);
    if (!user) {
      // Auto-provision entered email during offline dev mode
      const localPart = normalized.split('@')[0] || 'doctor';
      const cleanName = localPart.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const newId = `dev-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      user = {
        id: newId,
        email: normalized,
        password_hash: '$2a$12$e80yq9RzJ3Uj.Q9E7eN/Z.6h94zF6yL8K/oP7qE4lqX6e5dF1wDmu',
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

  public findUserById(id: string): DevStaffUser | null {
    for (const user of this.users.values()) {
      if (user.id === id) return user;
    }
    return null;
  }

  public createStaffUser(data: {
    email: string;
    passwordHash: string;
    fullName: string;
    role: StaffRole;
    hospitalDepartment?: string;
    status?: StaffUserStatusType;
  }): DevStaffUser {
    const normalized = data.email.toLowerCase().trim();
    const newUser: DevStaffUser = {
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

  public updateLastLogin(id: string) {
    const user = this.findUserById(id);
    if (user) {
      user.last_login_at = new Date();
    }
    return user;
  }

  public createRefreshToken(data: {
    staffUserId: string;
    tokenHash: string;
    expiresAt: Date;
  }): DevRefreshToken {
    const token: DevRefreshToken = {
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

  public findRefreshTokenByHash(tokenHash: string): DevRefreshToken | null {
    const token = this.refreshTokens.get(tokenHash);
    if (token) {
      token.staff_user = this.findUserById(token.staff_user_id) || undefined;
      return token;
    }
    return null;
  }

  public revokeRefreshToken(tokenHash: string) {
    const token = this.refreshTokens.get(tokenHash);
    if (token) {
      token.revoked_at = new Date();
    }
  }

  public revokeAllUserRefreshTokens(staffUserId: string) {
    for (const token of this.refreshTokens.values()) {
      if (token.staff_user_id === staffUserId) {
        token.revoked_at = new Date();
      }
    }
  }
}

export const devFallbackAuthStore = new DevFallbackStore();
