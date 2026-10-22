import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Lock, ShieldAlert, KeyRound, LogOut, RefreshCw } from 'lucide-react';

// Default idle timeout: 15 minutes (configurable)
const IDLE_TIMEOUT_MS = 15 * 60 * 1000;

interface IdleLockModalProps {
  timeoutMs?: number;
}

export const IdleLockModal: React.FC<IdleLockModalProps> = ({ timeoutMs = IDLE_TIMEOUT_MS }) => {
  const { user, login, logout, isAuthenticated } = useAuth();
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isUnlocking, setIsUnlocking] = useState<boolean>(false);

  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<any>(null);

  const resetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach((evt) => window.addEventListener(evt, resetTimer));

    timerRef.current = setInterval(() => {
      if (Date.now() - lastActivityRef.current > timeoutMs && !isLocked) {
        setIsLocked(true);
      }
    }, 10000);

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, resetTimer));
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isAuthenticated, timeoutMs, isLocked, resetTimer]);

  if (!isLocked || !isAuthenticated) return null;

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim() || !user) return;
    setIsUnlocking(true);
    setError(null);
    try {
      // Re-authenticate doctor
      await login({
        email: user.email,
        password: password.trim(),
      });
      setIsLocked(false);
      setPassword('');
      resetTimer();
    } catch (err: any) {
      setError(err?.message || 'Invalid credentials. Workstation remains locked.');
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsLocked(false);
    window.location.href = '/login';
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-red-200 space-y-4">
        {/* Emblem & Lock Header */}
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-xl bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-600/30 mb-2">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Clinical Workstation Locked</h2>
          <p className="text-xs text-slate-500 max-w-xs mt-0.5">
            Auto-lock activated due to inactivity on shared terminal. Unsaved draft reviews are preserved securely on the server.
          </p>
        </div>

        {/* Minimal Identity (Section 23: Minimal identity shown by default) */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-red-100 text-red-700 font-bold flex items-center justify-center text-xs">
            {user?.fullName?.split(' ').map((n) => n[0]).slice(0, 2).join('') || 'DR'}
          </div>
          <div className="flex-1 text-xs">
            <div className="font-bold text-slate-900">{user?.fullName || 'OPD Physician'}</div>
            <div className="text-slate-500">{user?.hospitalDepartment || 'Hospital OPD'}</div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Re-authentication Form */}
        <form onSubmit={handleUnlock} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Enter Password to Resume Consultation:
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Doctor password..."
                autoFocus
                className="w-full text-xs p-2.5 pl-8 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
              />
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={handleLogout}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>

            <button
              type="submit"
              disabled={isUnlocking || !password.trim()}
              className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 shadow-sm"
            >
              {isUnlocking ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Unlocking...
                </>
              ) : (
                'Unlock Terminal'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
