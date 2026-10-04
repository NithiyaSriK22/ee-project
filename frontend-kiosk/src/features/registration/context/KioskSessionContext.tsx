import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  Patient,
  PatientVisitProfile,
  ConsentItem,
  KioskSessionInfo,
  StartKioskSessionPayload,
  ProfileCompletion,
} from '../types/registration.types';
import { registrationApi } from '../api/registration.api';

interface KioskSessionContextType {
  session: KioskSessionInfo | null;
  patient: Patient | null;
  visitProfile: PatientVisitProfile | null;
  consents: ConsentItem[];
  completion: ProfileCompletion | null;
  isSessionActive: boolean;
  isLoading: boolean;
  error: string | null;
  startSession: (payload: StartKioskSessionPayload) => Promise<void>;
  endSession: () => Promise<void>;
  refreshSession: () => Promise<void>;
  updateConsentState: (type: string, granted: boolean, via?: 'patient' | 'companion' | 'staff_assisted') => Promise<void>;
}

const KioskSessionContext = createContext<KioskSessionContextType | undefined>(undefined);

const KIOSK_TOKEN_KEY = 'medikiosk_kiosk_token';

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

export const KioskSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<KioskSessionInfo | null>(null);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [visitProfile, setVisitProfile] = useState<PatientVisitProfile | null>(null);
  const [consents, setConsents] = useState<ConsentItem[]>([]);
  const [completion, setCompletion] = useState<ProfileCompletion | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const refreshSession = useCallback(async () => {
    const token = safeStorage.getItem(KIOSK_TOKEN_KEY);
    if (!token) {
      setSession(null);
      setPatient(null);
      setVisitProfile(null);
      setConsents([]);
      setCompletion(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await registrationApi.getSessionMe();
      setSession(data.session);
      setPatient(data.patient);
      setVisitProfile(data.visitProfile);
      setConsents(data.consents);
      
      const comp = await registrationApi.getCompletion();
      setCompletion(comp);
      setError(null);
    } catch (err: any) {
      console.warn('Kiosk session restoration failed:', err?.message);
      safeStorage.removeItem(KIOSK_TOKEN_KEY);
      setSession(null);
      setPatient(null);
      setVisitProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  const startSession = async (payload: StartKioskSessionPayload) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await registrationApi.startSession(payload);
      if (response.session.sessionToken) {
        safeStorage.setItem(KIOSK_TOKEN_KEY, response.session.sessionToken);
      }
      setSession(response.session);
      setPatient(response.patient);
      setVisitProfile(response.visitProfile);
      setConsents(response.consents);

      const comp = await registrationApi.getCompletion();
      setCompletion(comp);
    } catch (err: any) {
      const msg = err?.message || 'Failed to initialize patient kiosk session.';
      setError(msg);
      throw new Error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const endSession = async () => {
    try {
      await registrationApi.endSession();
    } catch {
      // Ignore network errors when clearing session
    } finally {
      safeStorage.removeItem(KIOSK_TOKEN_KEY);
      setSession(null);
      setPatient(null);
      setVisitProfile(null);
      setConsents([]);
      setCompletion(null);
    }
  };

  const updateConsentState = async (
    type: string,
    granted: boolean,
    via: 'patient' | 'companion' | 'staff_assisted' = 'patient'
  ) => {
    try {
      const updated = await registrationApi.updateConsent(type, {
        granted,
        grantedVia: via,
      });
      setConsents((prev) =>
        prev.map((c) => (c.consentType === type ? updated : c))
      );
      const comp = await registrationApi.getCompletion();
      setCompletion(comp);
    } catch (err: any) {
      console.error('Failed to update consent:', err);
      throw err;
    }
  };

  return (
    <KioskSessionContext.Provider
      value={{
        session,
        patient,
        visitProfile,
        consents,
        completion,
        isSessionActive: !!session && session.status !== 'ENDED',
        isLoading,
        error,
        startSession,
        endSession,
        refreshSession,
        updateConsentState,
      }}
    >
      {children}
    </KioskSessionContext.Provider>
  );
};

export const useKioskSession = (): KioskSessionContextType => {
  const context = useContext(KioskSessionContext);
  if (!context) {
    throw new Error('useKioskSession must be used within a KioskSessionProvider');
  }
  return context;
};
