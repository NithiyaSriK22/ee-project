import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useKioskSession } from '../hooks/useKioskSession';
import { Loader2 } from 'lucide-react';

interface KioskProtectedRouteProps {
  children: React.ReactNode;
}

export const KioskProtectedRoute: React.FC<KioskProtectedRouteProps> = ({ children }) => {
  const { isSessionActive, isLoading } = useKioskSession();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-10 h-10 text-teal-400 animate-spin" />
          <p className="text-base font-medium text-slate-300">Loading your kiosk visit session...</p>
        </div>
      </div>
    );
  }

  if (!isSessionActive) {
    return <Navigate to="/register" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
