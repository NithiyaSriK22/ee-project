import React from 'react';

export const CenterPulse: React.FC = () => {
  return (
    <div
      className="absolute -left-[260px] top-[70px] w-[260px] h-[260px] pointer-events-none z-20 hidden lg:block overflow-visible"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 260 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full overflow-visible"
      >
        <defs>
          {/* Ambient Blue Blur Halo behind Plus */}
          <filter id="plusHaloWide" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="36" result="wideBlur" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.42   0 0 0 0 0.48   0 0 0 0 1   0 0 0 0.38 0"
            />
          </filter>

          <filter id="plusHaloTight" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="18" result="tightBlur" />
            <feColorMatrix
              type="matrix"
              values="0 0 0 0 0.42   0 0 0 0 0.48   0 0 0 0 1   0 0 0 0.55 0"
            />
          </filter>

          {/* Frosted Glass Gradient */}
          <linearGradient id="plusFrostedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DDE6FF" stopOpacity="0.88" />
            <stop offset="50%" stopColor="#D2DEFC" stopOpacity="0.82" />
            <stop offset="100%" stopColor="#C8D4FA" stopOpacity="0.75" />
          </linearGradient>

          {/* Inner Glow Filter */}
          <filter id="plusInnerGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feComponentTransfer in="SourceAlpha" result="alpha">
              <feFuncA type="linear" slope="1" />
            </feComponentTransfer>
            <feGaussianBlur stdDeviation="14" result="blur" />
            <feOffset dx="0" dy="0" />
            <feComposite operator="out" in2="SourceGraphic" result="inverse" />
            <feFlood floodColor="#6C7BFF" floodOpacity="0.5" result="glowColor" />
            <feComposite operator="in" in2="inverse" result="innerGlow" />
            <feComposite operator="over" in2="SourceGraphic" />
          </filter>

          {/* Golden Orb Radial Gradient */}
          <radialGradient id="goldenOrbGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="25%" stopColor="#FFF4D0" stopOpacity="1" />
            <stop offset="55%" stopColor="#F6BA76" stopOpacity="0.9" />
            <stop offset="80%" stopColor="#E59A52" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#E59A52" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Behind Plus: Ambient Blue Blur Halos (box-shadow / halo effect) */}
        <g className="animate-blue-pulse">
          <path
            d="M 110 20 L 140 20 A 22 22 0 0 1 162 42 L 162 93 L 213 93 A 22 22 0 0 1 235 115 L 235 145 A 22 22 0 0 1 213 167 L 162 167 L 162 218 A 22 22 0 0 1 140 240 L 110 240 A 22 22 0 0 1 88 218 L 88 167 L 37 167 A 22 22 0 0 1 15 145 L 15 115 A 22 22 0 0 1 37 93 L 88 93 L 88 42 A 22 22 0 0 1 110 20 Z"
            fill="#6C7BFF"
            filter="url(#plusHaloWide)"
          />
          <path
            d="M 110 20 L 140 20 A 22 22 0 0 1 162 42 L 162 93 L 213 93 A 22 22 0 0 1 235 115 L 235 145 A 22 22 0 0 1 213 167 L 162 167 L 162 218 A 22 22 0 0 1 140 240 L 110 240 A 22 22 0 0 1 88 218 L 88 167 L 37 167 A 22 22 0 0 1 15 145 L 15 115 A 22 22 0 0 1 37 93 L 88 93 L 88 42 A 22 22 0 0 1 110 20 Z"
            fill="#6C7BFF"
            filter="url(#plusHaloTight)"
          />
        </g>

        {/* 2. ~220px Rounded Plus Shape with Frosted Glass look & Blue Inner Glow */}
        <g style={{ filter: 'drop-shadow(0 0 25px rgba(108,123,255,0.45))' }}>
          <path
            d="M 110 20 L 140 20 A 22 22 0 0 1 162 42 L 162 93 L 213 93 A 22 22 0 0 1 235 115 L 235 145 A 22 22 0 0 1 213 167 L 162 167 L 162 218 A 22 22 0 0 1 140 240 L 110 240 A 22 22 0 0 1 88 218 L 88 167 L 37 167 A 22 22 0 0 1 15 145 L 15 115 A 22 22 0 0 1 37 93 L 88 93 L 88 42 A 22 22 0 0 1 110 20 Z"
            fill="url(#plusFrostedGrad)"
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="1.6"
            filter="url(#plusInnerGlow)"
          />
        </g>

        {/* 3. Bright White-Blue ECG line (~3px) with Drop-Shadow Glow (#6C7BFF) */}
        <path
          d="M 0 130 L 75 130 L 89 136 L 99 142 L 113 50 L 127 208 L 141 88 L 153 138 L 165 114 L 179 130 L 260 130"
          stroke="#6C7BFF"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 8px #6C7BFF)' }}
        />
        {/* Crisp core highlight down the center of the ECG line */}
        <path
          d="M 0 130 L 75 130 L 89 136 L 99 142 L 113 50 L 127 208 L 141 88 L 153 138 L 165 114 L 179 130 L 260 130"
          stroke="#FFFFFF"
          strokeWidth="1.3"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.88"
        />

        {/* 4. Glowing Orb at the Card Edge (x=260, y=130) with 3s Pulse Animation */}
        <g className="animate-orb-pulse">
          <circle cx="260" cy="130" r="26" fill="url(#goldenOrbGrad)" />
          <circle cx="260" cy="130" r="14" fill="#F6BA76" opacity="0.45" />
          <circle cx="260" cy="130" r="8" fill="#FFECC8" />
          <circle cx="260" cy="130" r="4" fill="#FFFFFF" />
        </g>
      </svg>
    </div>
  );
};
