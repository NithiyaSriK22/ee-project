import React from 'react';

export const BrandHeader: React.FC = () => {
  return (
    <header className="w-full flex items-center justify-between">
      {/* Left: Brand Logo & Title */}
      <div className="flex items-center gap-4">
        {/* Heart Emblem (~64px) */}
        <div className="w-16 h-16 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M32 54 C32 54 10 39 10 24 C10 15 17 9 25 9 C29 9 32 11 32 11 C32 11 35 9 39 9 C47 9 54 15 54 24 C54 39 32 54 32 54 Z"
              stroke="#1B2A5E"
              strokeWidth="3.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M13 28 L23 28 L26 23 L29 36 L33 17 L37 40 L41 26 L44 31 L51 31"
              stroke="#1B2A5E"
              strokeWidth="2.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Coral Star Accent */}
            <path
              d="M51 6 Q51 12 57 12 Q51 12 51 18 Q51 12 45 12 Q51 12 51 6 Z"
              fill="#E5484D"
            />
          </svg>
        </div>

        {/* Brand Text */}
        <div className="flex flex-col">
          <span className="font-display font-bold text-[38px] tracking-[0.04em] text-navy leading-none">
            THUNAI
          </span>
          <span className="text-[12px] sm:text-[13px] font-medium text-navysoft mt-1 leading-tight font-body">
            AI-Powered Clinical Intelligence
          </span>
        </div>
        <span className="sr-only">Staff Portal</span>
      </div>

      {/* Right: Tagline with Purple ECG line */}
      <div className="hidden md:flex items-center gap-3">
        <span className="font-display italic text-[18px] text-navysoft whitespace-nowrap font-normal">
          Smarter Care. Healthier Tomorrow.
        </span>
        <svg
          viewBox="0 0 150 28"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-[150px] h-7 shrink-0 pointer-events-none"
          aria-hidden="true"
        >
          <path
            d="M0 14 L60 14 L64 14 L67 17 L73 3 L79 25 L83 10 L86 16 L90 14 L150 14"
            stroke="#7B5CC4"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </header>
  );
};
