import React from 'react';

export const BackgroundLayer: React.FC = () => {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-cream"
      aria-hidden="true"
    >
      {/* Decorative Wave & Ambient Background Skeleton */}
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF8F0" />
            <stop offset="50%" stopColor="#FFF8F0" />
            <stop offset="100%" stopColor="#FDEBDD" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="waveGrad" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#EDE6FA" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#D9CCF5" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#A68BE0" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Base Canvas */}
        <rect width="1536" height="1024" fill="url(#bgGrad)" />

        {/* Top-Right Ambient Waves */}
        <path
          d="M 700 0 C 880 70 1060 50 1240 130 C 1380 190 1480 270 1536 340 L 1536 0 Z"
          fill="url(#waveGrad)"
        />

        {/* Bottom Sweeping Waves */}
        <path
          d="M -40 820 C 180 770 380 820 580 880 C 780 940 980 950 1160 880 C 1300 820 1440 840 1576 890 L 1576 1040 L -40 1040 Z"
          fill="url(#waveGrad)"
        />

        {/* Corner Dotted Grids */}
        <g transform="translate(48, 770)" fill="#A68BE0" opacity="0.5">
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3, 4].map((col) => (
              <circle
                key={`dot-ll-${row}-${col}`}
                cx={col * 16}
                cy={row * 16}
                r="2.5"
              />
            ))
          )}
        </g>
        <g transform="translate(1440, 915)" fill="#A68BE0" opacity="0.5">
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3, 4].map((col) => (
              <circle
                key={`dot-lr-${row}-${col}`}
                cx={col * 16}
                cy={row * 16}
                r="2.5"
              />
            ))
          )}
        </g>

        {/* Top-Right Tagline and ECG line */}
        <g transform="translate(1040, 48)">
          <text
            x="0"
            y="18"
            fill="#3A4A7A"
            fontFamily="'Playfair Display', serif"
            fontStyle="italic"
            fontSize="15"
            fontWeight="600"
          >
            Smarter Care. Healthier Tomorrow.
          </text>
          <path
            d="M 285 14 L 350 14 L 358 14 L 366 2 L 374 26 L 382 0 L 390 20 L 396 14 L 435 14"
            stroke="#7B5CC4"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};
