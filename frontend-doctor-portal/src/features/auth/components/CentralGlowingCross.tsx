import React from 'react';

export const CentralGlowingCross: React.FC = () => {
  return (
    <div
      className="absolute -left-[290px] top-[72px] w-[320px] h-[240px] pointer-events-none z-20 hidden lg:block"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 320 240"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Multi-tier Neon Blue/Lavender Glow Filter for Medical Cross */}
          <filter id="crossGlowFilter" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="14" result="blur1" />
            <feGaussianBlur stdDeviation="28" result="blur2" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.48   0 0 0 0 0.58   0 0 0 0 0.95   0 0 0 0.45 0"
              result="colorGlow"
            />
            <feMerge>
              <feMergeNode in="colorGlow" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Laser ECG Beam Glow Filter */}
          <filter id="laserBeamFilter" x="-30%" y="-200%" width="160%" height="500%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Frosted 3D Glass Cross Gradient */}
          <linearGradient id="frostedGlassCross" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#E6EEFF" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#C4D5FC" stopOpacity="0.5" />
          </linearGradient>

          {/* Golden Orb Radial Glow */}
          <radialGradient id="goldenOrbGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#FFF4D0" stopOpacity="1" />
            <stop offset="55%" stopColor="#F6BA76" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#E59A52" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#E59A52" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Frosted 3D Glowing Medical Cross */}
        <g transform="translate(45, 15)">
          {/* Outer Soft Bloom Shadow */}
          <path
            d="M 68 0 C 80 0 85 6 85 18 L 85 68 L 135 68 C 147 68 153 73 153 85 L 153 105 C 153 117 147 122 135 122 L 85 122 L 85 172 C 85 184 80 190 68 190 L 48 190 C 36 190 31 184 31 172 L 31 122 L -19 122 C -31 122 -37 117 -37 105 L -37 85 C -37 73 -31 68 -19 68 L 31 68 L 31 18 C 31 6 36 0 48 0 Z"
            fill="#758EF5"
            opacity="0.32"
            filter="url(#crossGlowFilter)"
          />

          {/* Frosted Semi-Translucent Glass Body */}
          <path
            d="M 68 0 C 80 0 85 6 85 18 L 85 68 L 135 68 C 147 68 153 73 153 85 L 153 105 C 153 117 147 122 135 122 L 85 122 L 85 172 C 85 184 80 190 68 190 L 48 190 C 36 190 31 184 31 172 L 31 122 L -19 122 C -31 122 -37 117 -37 105 L -37 85 C -37 73 -31 68 -19 68 L 31 68 L 31 18 C 31 6 36 0 48 0 Z"
            fill="url(#frostedGlassCross)"
            stroke="#FFFFFF"
            strokeWidth="2.2"
            strokeOpacity="0.85"
          />

          {/* Subtle Inner Glass Specular Highlight */}
          <path
            d="M 48 4 L 68 4 C 77 4 81 8 81 18 L 81 72 L 135 72 C 144 72 148 76 148 85"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeOpacity="0.95"
            strokeLinecap="round"
            fill="none"
          />
        </g>

        {/* 2. Glowing ECG Horizon Laser Line (Shoots through cross directly to the card edge at x=290, y=110) */}
        {/* Neon Glow underlayer */}
        <path
          d="M 0 110 L 40 110 L 60 110 L 72 75 L 86 145 L 102 50 L 118 128 L 130 110 L 150 110 L 290 110"
          stroke="#9BB4FF"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.65"
          filter="url(#laserBeamFilter)"
        />

        {/* Crisp Core Pure White/Cyan Laser Line */}
        <path
          d="M 0 110 L 40 110 L 60 110 L 72 75 L 86 145 L 102 50 L 118 128 L 130 110 L 150 110 L 290 110"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* 3. Golden Glowing Connector Orb (Hits the Login Card border at x=290, y=110 - exact match to reference!) */}
        <circle cx="290" cy="110" r="20" fill="url(#goldenOrbGlow)" />
        <circle cx="290" cy="110" r="7.5" fill="#FFECC8" />
        <circle cx="290" cy="110" r="3.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};
