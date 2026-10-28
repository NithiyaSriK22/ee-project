import React, { useState, useEffect, useRef } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ShieldCheck, BookOpen, Volume2, Clock } from 'lucide-react';
import { ConnectivityBanner, KioskHelpModal } from '../features/help';
import { LanguageSelector } from '../features/language/LanguageSelector';
import { AccessibilityModePicker } from '../features/language/AccessibilityModePicker';
import { OfflineIndicator } from '../features/offline/OfflineIndicator';
import { useLanguage } from '../features/language/useLanguage';

export const KioskLayout: React.FC = () => {
  const navigate = useNavigate();
  const { locale, isHighContrast, isLargeText, isSlowerPace } = useLanguage();
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // Inactivity timeout state
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [timeoutCountdown, setTimeoutCountdown] = useState(30);

  const idleTimerRef = useRef<any>(null);
  const countdownTimerRef = useRef<any>(null);

  // Slower pace mode triples idle timeout (180s instead of 60s)
  const idleTimeoutMs = isSlowerPace ? 180000 : 90000;

  const resetIdleTimer = () => {
    if (showTimeoutWarning) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);

    idleTimerRef.current = setTimeout(() => {
      setShowTimeoutWarning(true);
      setTimeoutCountdown(30);
    }, idleTimeoutMs);
  };

  useEffect(() => {
    const activityEvents = ['mousedown', 'touchstart', 'keydown', 'scroll'];
    const handleActivity = () => resetIdleTimer();

    for (const evt of activityEvents) {
      window.addEventListener(evt, handleActivity);
    }
    resetIdleTimer();

    return () => {
      for (const evt of activityEvents) {
        window.removeEventListener(evt, handleActivity);
      }
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [idleTimeoutMs, showTimeoutWarning]);

  // Countdown timer when warning is shown
  useEffect(() => {
    if (!showTimeoutWarning) return;

    countdownTimerRef.current = setInterval(() => {
      setTimeoutCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownTimerRef.current);
          handleSessionExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    };
  }, [showTimeoutWarning]);

  const handleSessionExpired = () => {
    setShowTimeoutWarning(false);
    // Security cleanup: Clear session data
    sessionStorage.clear();
    navigate('/');
  };

  const handleExtendSession = () => {
    setShowTimeoutWarning(false);
    resetIdleTimer();
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isHighContrast ? 'bg-black text-white high-contrast' : 'bg-slate-50 text-slate-900'
      } ${isLargeText ? 'text-lg' : ''} antialiased select-none`}
    >
      {/* Permanent Demonstration Mode Banner */}
      <div className="bg-amber-400 text-slate-950 font-black text-xs py-1.5 px-4 text-center tracking-wider uppercase flex items-center justify-center gap-2 border-b border-amber-500 shadow-xs z-50">
        <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse" />
        <span>{locale.demoBanner}</span>
      </div>

      {/* Offline Connectivity Banner */}
      <ConnectivityBanner />
      <OfflineIndicator />

      {/* Kiosk Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b-2 border-stone-200 px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-800 text-white shadow-md shadow-teal-900/20">
              <ShieldCheck className="h-7 w-7 text-emerald-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-slate-900">{locale.platformTitle}</span>
                <span className="rounded-md bg-teal-50 px-2 py-0.5 text-xs font-bold text-teal-800 border border-teal-200">
                  {locale.opdBadge}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500">{locale.platformSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Language Selector in Header */}
            <LanguageSelector compact={true} />

            {/* Accessibility Mode Picker */}
            <AccessibilityModePicker />

            {/* Kiosk Help Guide Trigger */}
            <button
              onClick={() => setIsHelpOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-slate-700 font-bold text-sm shadow-2xs transition-colors cursor-pointer"
              title={locale.guideButton}
              aria-label={locale.guideButton}
            >
              <BookOpen className="w-4 h-4 text-teal-700" />
              <span className="hidden sm:inline">{locale.guideButton}</span>
            </button>

          </div>
        </div>
      </header>

      {/* Main Kiosk Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8 flex flex-col">
        <Outlet />
      </main>

      {/* Kiosk Footer */}
      <footer className="bg-white border-t-2 border-stone-200 py-3 px-6 text-center text-slate-600 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-teal-700" />
            <span>{locale.footerNotice}</span>
          </div>
          <div className="text-slate-400 font-mono text-[11px]">
            MEDBRIEF Healthcare Platform • Clinical Core v1.0.0
          </div>
        </div>
      </footer>

      {/* Kiosk Help Guide Modal */}
      <KioskHelpModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />

      {/* Inactivity Warning Modal */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-8 shadow-2xl border-4 border-amber-400 text-center animate-in fade-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>

            <h3 className="text-2xl font-black text-slate-900 mb-2">
              {locale.timeoutTitle}
            </h3>

            <p className="text-sm font-medium text-slate-600 mb-6 leading-relaxed">
              {locale.timeoutMessage.replace('{seconds}', String(timeoutCountdown))}
            </p>

            <button
              onClick={handleExtendSession}
              className="w-full py-4 px-6 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-lg shadow-lg transition-all cursor-pointer min-h-[64px]"
            >
              {locale.timeoutContinueButton}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
