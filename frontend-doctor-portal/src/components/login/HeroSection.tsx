import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <div className="max-w-[620px] pr-2">
      {/* Three-Line Editorial Headline */}
      <h1 className="font-display font-bold text-5xl sm:text-6xl lg:text-[72px] tracking-tight leading-[1.05] mb-1">
        <span className="block font-display text-navy">Smarter Care.</span>
        <span className="block font-display text-navy">Better Decisions.</span>
        <span className="block font-display bg-gradient-to-r from-[#7B5CC4] to-[#A68BE0] bg-clip-text text-transparent">
          Improved Health.
        </span>
      </h1>

      {/* Thin Curved Purple Underline Swoosh with Fading Ends */}
      <svg
        viewBox="0 0 460 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-[320px] sm:w-[400px] lg:w-[460px] h-4 -mt-1 mb-6 pointer-events-none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="purpleSwooshGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7B5CC4" stopOpacity="0" />
            <stop offset="15%" stopColor="#7B5CC4" stopOpacity="0.9" />
            <stop offset="65%" stopColor="#A68BE0" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#A68BE0" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path
          d="M 4 4 C 140 19 320 19 456 4"
          stroke="url(#purpleSwooshGrad)"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
      </svg>

      {/* Supporting Paragraph */}
      <p className="text-sm sm:text-[15px] font-normal text-navysoft font-body leading-relaxed max-w-[470px] mb-8">
        THUNAI empowers healthcare professionals with AI-driven analysis of medical documents, helping you deliver precise and timely care.
      </p>
    </div>
  );
};
