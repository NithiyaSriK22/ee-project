import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { DoctorLoginBackground } from '../components/DoctorLoginBackground';
import { ThunaiBrandLogo } from '../../../components/ui/ThunaiLogo';
import { FeatureCards } from '../components/FeatureCards';
import { DoctorLoginCard } from '../components/DoctorLoginCard';

export const DoctorLoginPage: React.FC = () => {
  const { isAuthenticated, user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showDevPresets, setShowDevPresets] = useState(false);

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleQuickLogin = async (email: string) => {
    try {
      await login({ email, password: 'doctor123' });
    } catch {
      // captured in auth state
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        setShowDevPresets((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative min-h-screen w-full bg-[#FFF9F0] text-slate-800 antialiased overflow-x-hidden selection:bg-[#7763C8] selection:text-white flex flex-col justify-between">
      {/* 1. Full Medical Graphic Background Canvas (Waves, DNA, Floating Plus, Dot Grids, Top-Right Tagline) */}
      <DoctorLoginBackground />

      {/* 2. Main Page Content Container */}
      <div className="relative z-10 w-full max-w-[1536px] mx-auto min-h-screen flex flex-col justify-between px-8 sm:px-12 lg:px-16 py-6 sm:py-8 lg:py-10">
        
        {/* Top Header / Branding Row */}
        <header className="w-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ThunaiBrandLogo size={46} />
            <span className="sr-only">Staff Portal</span>
          </div>

          {/* Top-Right Tagline visible on smaller screens when background SVG might scale */}
          <div className="hidden sm:flex lg:hidden items-center gap-2 text-xs font-serif italic text-[#3D366A]">
            <span>Smarter Care. Healthier Tomorrow.</span>
          </div>
        </header>

        {/* Center Main Split: Left Content (Col 7) & Right Login Card (Col 5) */}
        <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center my-auto py-6 lg:py-0">
          
          {/* LEFT SECTION (Col 7) */}
          <section className="lg:col-span-7 flex flex-col justify-center max-w-[580px] lg:pr-4">
            
            {/* Three-Line Promotional Heading */}
            <h1 className="font-serif font-black text-4xl sm:text-5xl lg:text-[54px] xl:text-[58px] tracking-tight leading-[1.12] mb-5">
              <span className="block text-[#142B68]">Smarter Care.</span>
              <span className="block text-[#142B68]">Better Decisions.</span>
              <span className="block text-[#7763C8]">Improved Health.</span>
            </h1>

            {/* Supporting Description Paragraph */}
            <p className="text-sm sm:text-[15px] font-normal text-[#495066] leading-relaxed max-w-[470px] mb-8">
              THUNAI empowers healthcare professionals with AI-driven analysis of medical documents, helping you deliver precise and timely care.
            </p>

            {/* Four Compact Feature Cards in 2x2 Grid */}
            <FeatureCards />
          </section>

          {/* RIGHT SECTION (Col 5): Large Rounded Login Card with Anchored Central Glowing Cross */}
          <section className="lg:col-span-5 flex items-center justify-center lg:justify-end w-full relative">
            <DoctorLoginCard />
          </section>
        </main>

        {/* Bottom Left Footer */}
        <footer className="w-full pt-6 pb-2 text-[11px] sm:text-xs text-[#525970] font-normal flex flex-wrap items-center gap-2.5">
          <span>© 2026 THUNAI. All rights reserved.</span>
          <span className="text-[#A297C8]" aria-hidden="true">|</span>
          <span className="inline-flex items-center gap-1.5 text-[#5146A8] font-medium">
            <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-[#7763C8]">
              <path d="M8 0 Q8 8 16 8 Q8 8 8 16 Q8 8 0 8 Q8 8 8 0 Z" />
            </svg>
            <span>Powered by AI</span>
          </span>
        </footer>

      </div>

      {/* Hidden Dev Preset Drawer (Press Shift+D to reveal) */}
      {showDevPresets && (
        <div className="fixed bottom-4 right-4 z-50 w-56 bg-[#FFFDF9] rounded-2xl shadow-xl border border-[#ECE2D8] p-3 text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between pb-1 border-b border-[#F0E6DC]">
            <span className="text-[11px] font-bold text-[#142B68]">1-Click Test Sign-In</span>
            <button
              onClick={() => setShowDevPresets(false)}
              className="text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          </div>
          <button
            onClick={() => handleQuickLogin('nithiya0sy@gmail.com')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-[#EDE6F8] hover:bg-[#E3D7F6] text-[#523DA8] font-medium text-[11px] transition-colors"
          >
            👩‍⚕️ Dr. Nithiya Sri (Doctor)
          </button>
          <button
            onClick={() => handleQuickLogin('dr.ananya@hospital.org')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
          >
            👩‍⚕️ Dr. Ananya Sharma
          </button>
          <button
            onClick={() => handleQuickLogin('admin@thunai.hospital')}
            className="w-full text-left px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-[11px] transition-colors"
          >
            🛡️ System Administrator
          </button>
        </div>
      )}
    </div>
  );
};
