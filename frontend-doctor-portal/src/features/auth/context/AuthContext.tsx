import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { StaffUser, LoginPayload, StaffRole, DoctorRegistrationPayload } from '../types/auth.types';
import { authApi } from '../api/auth.api';

interface AuthContextType {
  user: StaffUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: LoginPayload) => Promise<void>;
  register: (data: DoctorRegistrationPayload) => Promise<StaffUser>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  hasRole: (roles: StaffRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'medikiosk_doctor_token';
const REFRESH_TOKEN_KEY = 'medikiosk_doctor_refresh_token';

const safeStorage = {
  getItem: (key: string): string | null => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
    } catch {}
    return null;
  },
  setItem: (key: string, val: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, val);
      }
    } catch {}
  },
  removeItem: (key: string): void => {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
      }
    } catch {}
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<StaffUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshProfile = useCallback(async () => {
    const token = safeStorage.getItem(TOKEN_KEY);
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const profile = await authApi.getMe();
      setUser(profile);
      setError(null);
    } catch (err: any) {
      console.warn('Authentication check failed:', err?.message);
      // Try refresh token if available
      const refreshToken = safeStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        try {
          const freshTokens = await authApi.refreshToken(refreshToken);
          safeStorage.setItem(TOKEN_KEY, freshTokens.accessToken);
          safeStorage.setItem(REFRESH_TOKEN_KEY, freshTokens.refreshToken);
          const profile = await authApi.getMe();
          setUser(profile);
          setError(null);
          return;
        } catch {
          // Token refresh failed as well
        }
      }
      safeStorage.removeItem(TOKEN_KEY);
      safeStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (credentials: LoginPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await authApi.login(credentials);
      safeStorage.setItem(TOKEN_KEY, response.tokens.accessToken);
      safeStorage.setItem(REFRESH_TOKEN_KEY, response.tokens.refreshToken);
      setUser(response.user);
    } catch (err: any) {
      const msg = err?.message || 'Authentication failed. Please check your credentials.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (data: DoctorRegistrationPayload): Promise<StaffUser> => {
    setIsLoading(true);
    setError(null);
    try {
      const newUser = await authApi.register(data);
      return newUser;
    } catch (err: any) {
      const msg = err?.message || 'Registration failed. Please check the entered details.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = safeStorage.getItem(REFRESH_TOKEN_KEY) || undefined;
    try {
      await authApi.logout(refreshToken);
    } catch {
      // Ignore network errors during logout
    } finally {
      safeStorage.removeItem(TOKEN_KEY);
      safeStorage.removeItem(REFRESH_TOKEN_KEY);
      setUser(null);
    }
  };

  const hasRole = (roles: StaffRole[]): boolean => {
    if (!user) return false;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        error,
        login,
        register,
        logout,
        refreshProfile,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
