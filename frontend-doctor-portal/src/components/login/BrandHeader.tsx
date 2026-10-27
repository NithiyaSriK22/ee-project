import React from 'react';

export const BrandHeader: React.FC = () => {
  return (
    <header className="w-full flex items-center justify-between">
      <div className="flex items-center gap-3.5">
        {/* Heart Emblem */}
        <div className="w-12 h-12 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M32 54 C32 54 10 39 10 24 C10 15 17 9 25 9 C29 9 32 11 32 11 C32 11 35 9 39 9 C47 9 54 15 54 24 C54 39 32 54 32 54 Z"
              stroke="#1B2A5E"
              strokeWidth="3.2"
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
            <path
              d="M51 6 Q51 12 57 12 Q51 12 51 18 Q51 12 45 12 Q51 12 51 6 Z"
              fill="#E5484D"
            />
          </svg>
        </div>

        {/* Brand Text */}
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-wider text-navy font-body leading-none">
            THUNAI
          </span>
          <span className="text-[11px] font-semibold text-brand mt-1 leading-tight font-body">
            AI-Powered Clinical Intelligence
          </span>
        </div>
        <span className="sr-only">Staff Portal</span>
      </div>
    </header>
  );
};
