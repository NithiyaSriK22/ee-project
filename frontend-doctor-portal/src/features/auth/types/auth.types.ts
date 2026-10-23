export type StaffRole = 'STAFF_ATTENDANT' | 'DOCTOR' | 'ADMIN' | 'SUPER_ADMIN' | 'ANALYST' | 'AUDITOR';

export type StaffUserStatus = 'ACTIVE' | 'SUSPENDED' | 'DISABLED' | 'PENDING_VERIFICATION';

export interface StaffUser {
  id: string;
  email: string;
  fullName: string;
  role: StaffRole;
  status: StaffUserStatus;
  hospitalDepartment?: string | null;
  emailVerifiedAt?: string | null;
  createdAt?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

export interface LoginResponseData {
  user: StaffUser;
  tokens: AuthTokens;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  newPassword: string;
  confirmNewPassword: string;
}
