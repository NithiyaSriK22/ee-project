import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <div className="flex flex-col items-center md:items-start text-center md:text-left w-full max-w-[620px] mb-10">
      {/* Three-Line Editorial Headline (single h1 with block spans) */}
      <h1 className="font-display font-bold text-[38px] md:text-[48px] lg:text-[clamp(44px,4.7vw,72px)] xl:text-[72px] leading-[1.05] tracking-[-0.01em]">
        <span className="block font-display text-navy whitespace-nowrap">
          Smarter Care.
        </span>
        <span className="block font-display text-navy whitespace-nowrap">
          Better Decisions.
        </span>
        <span className="block font-display bg-gradient-to-r from-[#7B5CC4] to-[#A68BE0] bg-clip-text text-transparent whitespace-nowrap">
          Improved Health.
        </span>
      </h1>

      {/* Underline Swoosh: ~300px wide, ~3px stroke, smile curve, 6px below baseline, fading at both ends */}
      <div className="w-full flex justify-center md:justify-start mt-1.5">
        <svg
          viewBox="0 0 300 16"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[260px] sm:w-[300px] h-3.5 pointer-events-none"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="purpleSwooshGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7B5CC4" stopOpacity="0" />
              <stop offset="20%" stopColor="#7B5CC4" stopOpacity="1" />
              <stop offset="75%" stopColor="#A68BE0" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#A68BE0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M 2 3 C 80 15 220 15 298 3"
            stroke="url(#purpleSwooshGrad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </svg>
      </div>

      {/* Supporting Paragraph: ~20px, line-height 1.5, max-w ~470px, breaking into 3 lines */}
      <p className="font-body text-[17px] lg:text-[20px] leading-[1.5] text-navysoft max-w-[470px] mt-6">
        THUNAI empowers healthcare professionals with AI-driven analysis of medical documents, helping you deliver precise and timely care.
      </p>
    </div>
  );
};
