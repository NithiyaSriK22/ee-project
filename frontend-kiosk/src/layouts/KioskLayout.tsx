import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { ShieldCheck, Eye, Type, Volume2 } from 'lucide-react';
import { VoicePromptIndicator } from '../components/ui/VoicePromptIndicator';

export const KioskLayout: React.FC = () => {
  const [highContrast, setHighContrast] = useState(false);
  const [largeText, setLargeText] = useState(false);

  const toggleHighContrast = () => {
    setHighContrast(!highContrast);
    document.documentElement.classList.toggle('high-contrast');
  };

  const toggleLargeText = () => {
    setLargeText(!largeText);
    document.documentElement.classList.toggle('text-lg');
  };

  return (
    <div className={`min-h-screen flex flex-col ${highContrast ? 'bg-black text-white' : 'bg-slate-50 text-slate-900'} antialiased select-none`}>
      {/* Kiosk Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b-2 border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-md">
              <ShieldCheck className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-kiosk-xl font-bold tracking-tight text-slate-900">MediKiosk</span>
                <span className="rounded-md bg-sky-100 px-2.5 py-0.5 text-sm font-bold text-sky-800 border border-sky-300">
                  OPD Pre-Consultation
                </span>
              </div>
              <p className="text-sm font-medium text-slate-500">Government Hospital Patient Intake Kiosk (SIH26047)</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live voice indicator */}
            <VoicePromptIndicator mode="idle" label="Voice Assistant Ready" />

            {/* Accessibility Toggles */}
            <button
              onClick={toggleHighContrast}
              aria-label="Toggle High Contrast Mode"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                highContrast ? 'bg-yellow-400 text-black border-black' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Eye className="w-5 h-5" />
              <span>{highContrast ? 'Standard Mode' : 'High Contrast'}</span>
            </button>

            <button
              onClick={toggleLargeText}
              aria-label="Toggle Larger Text"
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 font-semibold text-sm transition-all ${
                largeText ? 'bg-sky-600 text-white border-sky-700' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
            >
              <Type className="w-5 h-5" />
              <span>{largeText ? 'Normal Text' : 'Larger Text'}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Kiosk Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 md:p-8 flex flex-col">
        <Outlet />
      </main>

      {/* Kiosk Footer */}
      <footer className="bg-white border-t-2 border-slate-200 py-4 px-6 text-center text-slate-600">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-sky-600" />
            <span>Voice-guided kiosk interview with touch fallback. Assisted by hospital staff at Counter #1.</span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            Module 1 Foundation Build v1.0.0
          </div>
        </div>
      </footer>
    </div>
  );
};
