import React from 'react';

export const DoctorLoginBackground: React.FC = () => {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      {/* Base Canvas SVG covering the entire viewport */}
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Base Background Warm Gradient */}
          <linearGradient id="bgWarmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="40%" stopColor="#FFF9F0" />
            <stop offset="100%" stopColor="#FAF2E8" />
          </linearGradient>

          {/* Organic Lavender Wave Gradient 1 */}
          <linearGradient id="waveGrad1" x1="0%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#F5EDFC" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#E4D5F7" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#D2BFEE" stopOpacity="0.5" />
          </linearGradient>

          {/* Bottom Deep Wave Gradient */}
          <linearGradient id="bottomWaveGrad" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#E8DCF8" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#DAC7F4" stopOpacity="0.8" />
            <stop offset="70%" stopColor="#BBA2E5" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#9C83D9" stopOpacity="0.4" />
          </linearGradient>

          {/* Bottom Accent Ribbon */}
          <linearGradient id="accentRibbonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C8B3EB" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#A88FE0" stopOpacity="0.75" />
            <stop offset="85%" stopColor="#7E68CC" stopOpacity="0.85" />
            <stop offset="100%" stopColor="#B39CE6" stopOpacity="0.5" />
          </linearGradient>

          {/* Top-Right Flowing Waves Gradient */}
          <linearGradient id="topRightWaveGrad" x1="20%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F8F3FD" stopOpacity="0.95" />
            <stop offset="40%" stopColor="#EDE1FA" stopOpacity="0.75" />
            <stop offset="80%" stopColor="#D7C3F2" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#B79FE2" stopOpacity="0.4" />
          </linearGradient>

          {/* Central Medical Cross Glow Filter */}
          <filter id="crossGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="16" result="blur1" />
            <feGaussianBlur stdDeviation="30" result="blur2" />
            <feMerge>
              <feMergeNode in="blur2" />
              <feMergeNode in="blur1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Laser ECG Glow Filter */}
          <filter id="ecgGlow" x="-30%" y="-150%" width="160%" height="400%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Central Frosted Cross Linear Gradient */}
          <linearGradient id="crossFrostGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.75" />
            <stop offset="50%" stopColor="#E4EBFF" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#BFCCF9" stopOpacity="0.5" />
          </linearGradient>

          {/* Golden Orb Glow */}
          <radialGradient id="goldenOrbGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#FFFDF7" />
            <stop offset="30%" stopColor="#FDE6B8" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#F8C288" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#E69A70" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* 1. Canvas Base Fill */}
        <rect width="1536" height="1024" fill="url(#bgWarmGradient)" />

        {/* 2. Top-Right Soft Wave Flows */}
        <path
          d="M 680 0 C 850 60 1020 40 1200 120 C 1350 185 1460 270 1536 340 L 1536 0 Z"
          fill="url(#topRightWaveGrad)"
        />
        <path
          d="M 850 0 C 1000 80 1180 90 1340 180 C 1440 235 1500 290 1536 330 L 1536 0 Z"
          fill="#E7D7F6"
          opacity="0.5"
        />

        {/* 3. DNA Double Helix (Center-Right background) */}
        <g opacity="0.32" stroke="#9E87D4" strokeWidth="1.6" strokeLinecap="round">
          {/* Backbones */}
          <path
            d="M 800 120 Q 825 180 800 240 T 800 360 T 800 480 T 800 600 T 800 720"
            fill="none"
          />
          <path
            d="M 835 120 Q 810 180 835 240 T 835 360 T 835 480 T 835 600 T 835 720"
            fill="none"
          />
          {/* Base Pair Rungs */}
          <line x1="803" y1="140" x2="832" y2="140" />
          <line x1="809" y1="170" x2="826" y2="170" />
          <line x1="817" y1="200" x2="818" y2="200" />
          <line x1="809" y1="230" x2="826" y2="230" />
          <line x1="803" y1="260" x2="832" y2="260" />
          <line x1="801" y1="290" x2="834" y2="290" />
          <line x1="805" y1="320" x2="830" y2="320" />
          <line x1="812" y1="350" x2="823" y2="350" />
          <line x1="817" y1="380" x2="818" y2="380" />
          <line x1="810" y1="410" x2="825" y2="410" />
          <line x1="803" y1="440" x2="832" y2="440" />
          <line x1="801" y1="470" x2="834" y2="470" />
          <line x1="805" y1="500" x2="830" y2="500" />
          <line x1="812" y1="530" x2="823" y2="530" />
          <line x1="817" y1="560" x2="818" y2="560" />
          <line x1="810" y1="590" x2="825" y2="590" />
          <line x1="803" y1="620" x2="832" y2="620" />
          <line x1="801" y1="650" x2="834" y2="650" />
          <line x1="806" y1="680" x2="829" y2="680" />
        </g>

        {/* 4. Large Sweeping Bottom Waves & Lavender Ribbon */}
        {/* Soft Background Wave */}
        <path
          d="M -50 820 C 180 780 340 830 520 890 C 700 950 900 970 1080 910 C 1240 850 1400 870 1580 920 L 1580 1050 L -50 1050 Z"
          fill="url(#waveGrad1)"
        />

        {/* Main Fluid Wave Ribbon traversing across screen */}
        <path
          d="M -50 920 C 160 840 380 810 580 870 C 780 930 960 920 1140 840 C 1280 770 1420 780 1580 820 L 1580 1050 L -50 1050 Z"
          fill="url(#bottomWaveGrad)"
        />

        {/* Sharp Elegant Lavender Accent Wave */}
        <path
          d="M -20 950 C 200 870 420 840 620 900 C 780 950 940 930 1120 850 C 1240 790 1360 800 1550 835 L 1550 860 C 1360 820 1240 815 1110 875 C 930 955 770 975 610 925 C 410 865 190 895 -20 975 Z"
          fill="url(#accentRibbonGrad)"
        />

        {/* 5. Floating Medical Plus Symbols around the canvas */}
        {/* Top-center plus */}
        <g transform="translate(635, 175)" fill="#D4C3EE" opacity="0.75">
          <rect x="8" y="0" width="8" height="24" rx="3.5" />
          <rect x="0" y="8" width="24" height="8" rx="3.5" />
        </g>
        {/* Below central cross */}
        <g transform="translate(625, 475)" fill="#D4C3EE" opacity="0.75">
          <rect x="8" y="0" width="8" height="24" rx="3.5" />
          <rect x="0" y="8" width="24" height="8" rx="3.5" />
        </g>
        {/* Right side near login card */}
        <g transform="translate(835, 605)" fill="#D4C3EE" opacity="0.65">
          <rect x="8" y="0" width="8" height="24" rx="3.5" />
          <rect x="0" y="8" width="24" height="8" rx="3.5" />
        </g>
        {/* Bottom wave plus */}
        <g transform="translate(815, 895)" fill="#BFA9E4" opacity="0.7">
          <rect x="8" y="0" width="8" height="24" rx="3.5" />
          <rect x="0" y="8" width="24" height="8" rx="3.5" />
        </g>
        {/* Far right plus */}
        <g transform="translate(1495, 200)" fill="#D4C3EE" opacity="0.5">
          <rect x="8" y="0" width="8" height="24" rx="3.5" />
          <rect x="0" y="8" width="24" height="8" rx="3.5" />
        </g>

        {/* 6. Central Glowing Frosted 3D Medical Cross & ECG Laser Line */}
        <g transform="translate(620, 240)">
          {/* Cross Outer Glow Layer */}
          <path
            d="M 60 0 C 72 0 76 6 76 18 L 76 60 L 118 60 C 130 60 136 64 136 76 L 136 100 C 136 112 130 116 118 116 L 76 116 L 76 158 C 76 170 72 176 60 176 L 36 176 C 24 176 20 170 20 158 L 20 116 L -22 116 C -34 116 -40 112 -40 100 L -40 76 C -40 64 -34 60 -22 60 L 20 60 L 20 18 C 20 6 24 0 36 0 Z"
            fill="#7C92F0"
            opacity="0.3"
            filter="url(#crossGlow)"
          />

          {/* Frosted Glass Cross Body */}
          <path
            d="M 60 0 C 72 0 76 6 76 18 L 76 60 L 118 60 C 130 60 136 64 136 76 L 136 100 C 136 112 130 116 118 116 L 76 116 L 76 158 C 76 170 72 176 60 176 L 36 176 C 24 176 20 170 20 158 L 20 116 L -22 116 C -34 116 -40 112 -40 100 L -40 76 C -40 64 -34 60 -22 60 L 20 60 L 20 18 C 20 6 24 0 36 0 Z"
            fill="url(#crossFrostGrad)"
            stroke="#FFFFFF"
            strokeWidth="1.8"
            strokeOpacity="0.8"
          />

          {/* ECG Horizon Beam passing through cross to login card */}
          {/* Outer glow line */}
          <path
            d="M -70 88 L -20 88 L -2 88 L 12 55 L 26 125 L 42 35 L 56 105 L 68 88 L 88 88 L 280 88"
            stroke="#9CB3FF"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.5"
            filter="url(#ecgGlow)"
          />
          {/* Crisp Core ECG Laser Line */}
          <path
            d="M -70 88 L -20 88 L -2 88 L 12 55 L 26 125 L 42 35 L 56 105 L 68 88 L 88 88 L 280 88"
            stroke="#FFFFFF"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Golden / Peach Glowing Connector Orb at the Card Edge */}
          <circle cx="280" cy="88" r="16" fill="url(#goldenOrbGrad)" />
          <circle cx="280" cy="88" r="6.5" fill="#FFEACC" />
          <circle cx="280" cy="88" r="3.5" fill="#FFFFFF" />
        </g>

        {/* 7. Corner Dotted Grid - Lower Left (5x5) */}
        <g transform="translate(48, 770)" fill="#BCAEE0" opacity="0.6">
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3, 4].map((col) => (
              <circle
                key={`dot-ll-${row}-${col}`}
                cx={col * 16}
                cy={row * 16}
                r="2.8"
              />
            ))
          )}
        </g>

        {/* 8. Corner Dotted Grid - Lower Right (5x5) */}
        <g transform="translate(1440, 915)" fill="#C8BAE5" opacity="0.65">
          {[0, 1, 2, 3, 4].map((row) =>
            [0, 1, 2, 3, 4].map((col) => (
              <circle
                key={`dot-lr-${row}-${col}`}
                cx={col * 16}
                cy={row * 16}
                r="2.8"
              />
            ))
          )}
        </g>

        {/* 9. Top-Right Tagline and ECG Waveform Line */}
        <g transform="translate(1050, 48)">
          <text
            x="0"
            y="18"
            fill="#3D366A"
            fontFamily="'Playfair Display', Georgia, serif"
            fontStyle="italic"
            fontWeight="500"
            fontSize="14.5"
            letterSpacing="0.2px"
          >
            Smarter Care. Healthier Tomorrow.
          </text>
          {/* Thin ECG wave attached to the tagline */}
          <path
            d="M 285 14 L 350 14 L 358 14 L 366 2 L 374 26 L 382 0 L 390 20 L 396 14 L 430 14"
            stroke="#7763C8"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </g>
      </svg>
    </div>
  );
};
