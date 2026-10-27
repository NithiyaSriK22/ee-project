import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { DoctorLoginBackground } from '../components/DoctorLoginBackground';
import { ThunaiBrandLogo } from '../../../components/ui/ThunaiLogo';
import { FeatureCards } from '../components/FeatureCards';
import { DoctorLoginCard } from '../components/DoctorLoginCard';

export const DoctorLoginPage: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as any)?.from?.pathname || '/';

  useEffect(() => {
    if (isAuthenticated && user) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, user, navigate, from]);

  return (
    <div className="relative min-h-screen w-full bg-[#FFF9F0] text-slate-800 antialiased overflow-x-hidden selection:bg-[#7763C8] selection:text-white flex flex-col justify-between">
      {/* 1. Full Medical Graphic Background (Organic Lavender Waves, ECG, DNA, Plus Symbols, Dot Grids) */}
      <DoctorLoginBackground />

      {/* 2. Main Content Container */}
      <div className="relative z-10 w-full max-w-[1480px] mx-auto px-6 sm:px-10 lg:px-14 py-6 sm:py-8 lg:py-10 flex-1 flex flex-col justify-between">
        
        {/* Top Header / Branding Row */}
        <header className="w-full flex items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center gap-3">
            <ThunaiBrandLogo size={48} />
            <span className="sr-only">Staff Portal</span>
          </div>
          
          {/* Top-Right Tagline visible on smaller screens when SVG background may be cropped */}
          <div className="hidden md:flex lg:hidden items-center gap-2 text-xs font-serif italic text-[#3D366A]">
            <span>Smarter Care. Healthier Tomorrow.</span>
          </div>
        </header>

        {/* Center Split Grid: Left Content (56%) & Right Login Card (44%) */}
        <main className="w-full grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center my-auto py-2">
          
          {/* LEFT SECTION (col-span-7) */}
          <section className="lg:col-span-7 flex flex-col justify-center max-w-[620px] lg:pr-6">
            
            {/* Three-Line Promotional Heading */}
            <h1 className="font-serif font-black text-4xl sm:text-5xl lg:text-[54px] xl:text-[58px] tracking-tight leading-[1.12] mb-5">
              <span className="block text-[#142B68]">Smarter Care.</span>
              <span className="block text-[#142B68]">Better Decisions.</span>
              <span className="block text-[#7763C8]">Improved Health.</span>
            </h1>

            {/* Supporting Description Paragraph */}
            <p className="text-sm sm:text-[15px] font-normal text-[#495066] leading-relaxed max-w-[480px] mb-8">
              THUNAI empowers healthcare professionals with AI-driven analysis of medical documents, helping you deliver precise and timely care.
            </p>

            {/* Four Compact Feature Cards in 2x2 Grid */}
            <FeatureCards />
          </section>

          {/* RIGHT SECTION (col-span-5): Login Card */}
          <section className="lg:col-span-5 flex items-center justify-center lg:justify-end w-full pt-4 lg:pt-0">
            <DoctorLoginCard />
          </section>
        </main>

        {/* Bottom Left Footer */}
        <footer className="w-full pt-8 pb-2 text-[11px] sm:text-xs text-[#525970] font-normal flex flex-wrap items-center gap-2.5">
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
    </div>
  );
};
