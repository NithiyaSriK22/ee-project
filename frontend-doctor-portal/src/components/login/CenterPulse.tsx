import React from 'react';

export const CenterPulse: React.FC = () => {
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
          <filter id="pulseGlow" x="-60%" y="-60%" width="220%" height="220%">
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
          <radialGradient id="pulseOrb" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#FFF4D0" stopOpacity="1" />
            <stop offset="55%" stopColor="#F6BA76" stopOpacity="0.85" />
            <stop offset="80%" stopColor="#E59A52" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#E59A52" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 3D Frosted Medical Cross */}
        <g transform="translate(45, 15)">
          <path
            d="M 68 0 C 80 0 85 6 85 18 L 85 68 L 135 68 C 147 68 153 73 153 85 L 153 105 C 153 117 147 122 135 122 L 85 122 L 85 172 C 85 184 80 190 68 190 L 48 190 C 36 190 31 184 31 172 L 31 122 L -19 122 C -31 122 -37 117 -37 105 L -37 85 C -37 73 -31 68 -19 68 L 31 68 L 31 18 C 31 6 36 0 48 0 Z"
            fill="#7B5CC4"
            opacity="0.3"
            filter="url(#pulseGlow)"
          />
          <path
            d="M 68 0 C 80 0 85 6 85 18 L 85 68 L 135 68 C 147 68 153 73 153 85 L 153 105 C 153 117 147 122 135 122 L 85 122 L 85 172 C 85 184 80 190 68 190 L 48 190 C 36 190 31 184 31 172 L 31 122 L -19 122 C -31 122 -37 117 -37 105 L -37 85 C -37 73 -31 68 -19 68 L 31 68 L 31 18 C 31 6 36 0 48 0 Z"
            fill="#FFFFFF"
            fillOpacity="0.8"
            stroke="#D9CCF5"
            strokeWidth="2"
          />
        </g>

        {/* Laser ECG line */}
        <path
          d="M 0 110 L 40 110 L 60 110 L 72 75 L 86 145 L 102 50 L 118 128 L 130 110 L 150 110 L 290 110"
          stroke="#A68BE0"
          strokeWidth="6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.6"
        />
        <path
          d="M 0 110 L 40 110 L 60 110 L 72 75 L 86 145 L 102 50 L 118 128 L 130 110 L 150 110 L 290 110"
          stroke="#FFFFFF"
          strokeWidth="2.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Golden Connector Orb */}
        <circle cx="290" cy="110" r="20" fill="url(#pulseOrb)" />
        <circle cx="290" cy="110" r="7.5" fill="#FFECC8" />
        <circle cx="290" cy="110" r="3.5" fill="#FFFFFF" />
      </svg>
    </div>
  );
};
