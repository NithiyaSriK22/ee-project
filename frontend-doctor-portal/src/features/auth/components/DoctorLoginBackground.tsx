import React from 'react';

export const DoctorLoginBackground: React.FC = () => {
  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0"
      aria-hidden="true"
    >
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1536 1024"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Base Background Warm Ivory Gradient */}
          <linearGradient id="bgWarmGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFDF9" />
            <stop offset="45%" stopColor="#FFF9F0" />
            <stop offset="100%" stopColor="#FAF4EB" />
          </linearGradient>

          {/* Top-Right Flowing Wave Gradient */}
          <linearGradient id="topRightWaveGrad" x1="30%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F9F4FD" stopOpacity="0.95" />
            <stop offset="45%" stopColor="#EDE2FA" stopOpacity="0.8" />
            <stop offset="85%" stopColor="#D8C5F3" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#BAA2E5" stopOpacity="0.45" />
          </linearGradient>

          {/* Bottom Sweeping Wave Layer 1 */}
          <linearGradient id="bottomWaveGrad1" x1="0%" y1="0%" x2="100%" y2="50%">
            <stop offset="0%" stopColor="#F4ECFC" stopOpacity="0.85" />
            <stop offset="40%" stopColor="#E5D6F8" stopOpacity="0.7" />
            <stop offset="80%" stopColor="#D3BEEE" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#BFA5E8" stopOpacity="0.4" />
          </linearGradient>

          {/* Bottom Main Flowing Wave */}
          <linearGradient id="bottomWaveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E6D7F8" stopOpacity="0.9" />
            <stop offset="35%" stopColor="#D5C0F4" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#B49BE3" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#967CD8" stopOpacity="0.5" />
          </linearGradient>

          {/* Sharp Lavender Ribbon Accent */}
          <linearGradient id="accentRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#C4ACEA" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#9F85DD" stopOpacity="0.85" />
            <stop offset="85%" stopColor="#755EC9" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#AA93E3" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* 1. Base Warm Ivory Fill */}
        <rect width="1536" height="1024" fill="url(#bgWarmGradient)" />

        {/* 2. Top-Right Soft Wave Flows */}
        <path
          d="M 680 0 C 860 70 1040 50 1220 130 C 1370 195 1470 280 1536 350 L 1536 0 Z"
          fill="url(#topRightWaveGrad)"
        />
        <path
          d="M 870 0 C 1020 85 1190 95 1350 185 C 1445 240 1500 295 1536 340 L 1536 0 Z"
          fill="#E8D8F7"
          opacity="0.45"
        />

        {/* 3. Subtle Artistic DNA Double Helix (Center Background) */}
        <g opacity="0.3" stroke="#9C85D5" strokeWidth="1.8" strokeLinecap="round">
          {/* Smooth Sine Wave Strands */}
          <path
            d="M 810 80 Q 845 150 810 220 T 810 360 T 810 500 T 810 640 T 810 780"
            fill="none"
          />
          <path
            d="M 850 80 Q 815 150 850 220 T 850 360 T 850 500 T 850 640 T 850 780"
            fill="none"
          />
          {/* Soft Base-Pair Rungs */}
          {[105, 135, 165, 195, 225, 255, 285, 315, 345, 375, 405, 435, 465, 495, 525, 555, 585, 615, 645, 675, 705, 735].map((y, idx) => {
            const widthOffset = Math.sin((y / 140) * Math.PI) * 18;
            const x1 = 830 - widthOffset;
            const x2 = 830 + widthOffset;
            return (
              <line
                key={`dna-rung-${idx}`}
                x1={Math.min(x1, x2)}
                y1={y}
                x2={Math.max(x1, x2)}
                y2={y}
                stroke="#A894DC"
                strokeWidth="1.6"
              />
            );
          })}
        </g>

        {/* 4. Large Sweeping Bottom Waves Across Canvas */}
        {/* Soft Background Wave */}
        <path
          d="M -40 800 C 180 760 360 810 540 880 C 720 950 920 970 1100 900 C 1260 840 1420 860 1576 910 L 1576 1040 L -40 1040 Z"
          fill="url(#bottomWaveGrad1)"
        />

        {/* Main Fluid Bottom Wave */}
        <path
          d="M -40 910 C 180 830 400 800 600 860 C 800 920 980 910 1160 830 C 1300 760 1440 770 1576 810 L 1576 1040 L -40 1040 Z"
          fill="url(#bottomWaveGrad2)"
        />

        {/* Accent Lavender Ribbon Along Wave Crest */}
        <path
          d="M -20 940 C 200 860 420 830 630 890 C 790 940 950 920 1130 840 C 1260 780 1380 790 1550 825 L 1550 848 C 1370 810 1250 805 1120 865 C 940 945 780 965 620 915 C 410 855 190 885 -20 965 Z"
          fill="url(#accentRibbon)"
        />

        {/* 5. Floating Medical Plus (+) Symbols (Exact locations from reference image) */}
        {/* Top Center-Right (above cross) */}
        <g transform="translate(635, 160)" fill="#D4C3EE" opacity="0.8">
          <rect x="7" y="0" width="8" height="22" rx="3.5" />
          <rect x="0" y="7" width="22" height="8" rx="3.5" />
        </g>

        {/* Center-Left (below main heading) */}
        <g transform="translate(625, 470)" fill="#D4C3EE" opacity="0.75">
          <rect x="7" y="0" width="8" height="22" rx="3.5" />
          <rect x="0" y="7" width="22" height="8" rx="3.5" />
        </g>

        {/* Right near Login Card bottom */}
        <g transform="translate(835, 610)" fill="#D4C3EE" opacity="0.7">
          <rect x="7" y="0" width="8" height="22" rx="3.5" />
          <rect x="0" y="7" width="22" height="8" rx="3.5" />
        </g>

        {/* Lower wave center */}
        <g transform="translate(815, 895)" fill="#BBA4E3" opacity="0.75">
          <rect x="7" y="0" width="8" height="22" rx="3.5" />
          <rect x="0" y="7" width="22" height="8" rx="3.5" />
        </g>

        {/* Far Right top corner */}
        <g transform="translate(1495, 190)" fill="#D4C3EE" opacity="0.6">
          <rect x="7" y="0" width="8" height="22" rx="3.5" />
          <rect x="0" y="7" width="22" height="8" rx="3.5" />
        </g>

        {/* 6. Corner Dotted Grid - Lower Left (5x5) */}
        <g transform="translate(48, 770)" fill="#BCAEE0" opacity="0.55">
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

        {/* 7. Corner Dotted Grid - Lower Right (5x5) */}
        <g transform="translate(1440, 915)" fill="#C8BAE5" opacity="0.6">
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

        {/* 8. Top-Right Medical Tagline and ECG Waveform Line */}
        <g transform="translate(1040, 48)">
          <text
            x="0"
            y="18"
            fill="#3D366A"
            fontFamily="'Playfair Display', Georgia, serif"
            fontStyle="italic"
            fontWeight="500"
            fontSize="15"
            letterSpacing="0.2px"
          >
            Smarter Care. Healthier Tomorrow.
          </text>
          {/* Attached Purple ECG Waveform Line */}
          <path
            d="M 285 14 L 350 14 L 358 14 L 366 2 L 374 26 L 382 0 L 390 20 L 396 14 L 435 14"
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
