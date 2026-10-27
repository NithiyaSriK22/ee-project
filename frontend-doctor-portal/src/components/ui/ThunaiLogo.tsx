import React from 'react';

interface ThunaiLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export const ThunaiHeartIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 44,
  className = '',
}) => {
  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full"
      >
        {/* Heart Contour */}
        <path
          d="M32 54 C32 54 10 39 10 24 C10 15 17 9 25 9 C29 9 32 11 32 11 C32 11 35 9 39 9 C47 9 54 15 54 24 C54 39 32 54 32 54 Z"
          stroke="#142B68"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />

        {/* ECG Line inside Heart */}
        <path
          d="M13 28 L23 28 L26 23 L29 36 L33 17 L37 40 L41 26 L44 31 L51 31"
          stroke="#142B68"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Coral/Red Sparkle Star at Top Right */}
        <path
          d="M51 6 Q51 12 57 12 Q51 12 51 18 Q51 12 45 12 Q51 12 51 6 Z"
          fill="#F07886"
        />
      </svg>
    </div>
  );
};

export const ThunaiBrandLogo: React.FC<ThunaiLogoProps> = ({
  className = '',
  size = 48,
  showText = true,
}) => {
  return (
    <div className={`inline-flex items-center gap-3.5 select-none ${className}`}>
      <ThunaiHeartIcon size={size} />
      {showText && (
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-[0.08em] text-[#142B68] leading-none font-sans">
            THUNAI
          </span>
          <span className="text-[11px] font-semibold tracking-normal text-[#5146A8] mt-1 leading-tight">
            AI-Powered Clinical Intelligence
          </span>
        </div>
      )}
    </div>
  );
};
