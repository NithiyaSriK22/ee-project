import React from 'react';

export const PageFooter: React.FC = () => {
  return (
    <footer className="w-full pt-6 pb-2 text-[11px] sm:text-xs text-navysoft font-normal flex flex-wrap items-center gap-2.5 font-body">
      <span>© 2026 MEDBRIEF. All rights reserved.</span>
      <span className="text-brandlight" aria-hidden="true">|</span>
      <span className="inline-flex items-center gap-1.5 text-brand font-medium">
        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-brand">
          <path d="M8 0 Q8 8 16 8 Q8 8 8 16 Q8 8 0 8 Q8 8 8 0 Z" />
        </svg>
        <span>Powered by AI</span>
      </span>
    </footer>
  );
};
