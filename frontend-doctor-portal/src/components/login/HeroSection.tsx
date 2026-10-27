import React from 'react';

export const HeroSection: React.FC = () => {
  return (
    <div className="max-w-[580px] pr-2">
      {/* Three-Line Editorial Headline */}
      <h1 className="font-display font-black text-4xl sm:text-5xl lg:text-[54px] xl:text-[58px] tracking-tight leading-[1.12] mb-5">
        <span className="block text-navy">Smarter Care.</span>
        <span className="block text-navy">Better Decisions.</span>
        <span className="block text-brand">Improved Health.</span>
      </h1>

      {/* Supporting Paragraph */}
      <p className="text-sm sm:text-[15px] font-normal text-navysoft font-body leading-relaxed max-w-[470px] mb-8">
        THUNAI empowers healthcare professionals with AI-driven analysis of medical documents, helping you deliver precise and timely care.
      </p>
    </div>
  );
};
