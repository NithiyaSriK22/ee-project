import React from 'react';

// Dot Grid: 6 columns x 4 rows, 6px dots, 18px spacing
const DotGrid: React.FC<{ className?: string }> = ({ className = '' }) => {
  const cols = 6;
  const rows = 4;
  const spacing = 18;
  const radius = 3; // 6px diameter

  return (
    <svg
      width={cols * spacing}
      height={rows * spacing}
      viewBox={`0 0 ${cols * spacing} ${rows * spacing}`}
      className={`shrink-0 ${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((_, c) => (
          <circle
            key={`dot-${r}-${c}`}
            cx={c * spacing + radius}
            cy={r * spacing + radius}
            r={radius}
            fill="#C9B8F0"
            fillOpacity="0.5"
          />
        ))
      )}
    </svg>
  );
};

// Rounded Plus Sign Icon (32px x 32px)
const RoundedPlus: React.FC<{ size?: number; className?: string }> = ({
  size = 32,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="#D9CCF5"
      fillOpacity="0.7"
      className={`shrink-0 ${className}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="11.5" y="2" width="9" height="28" rx="4.5" />
      <rect x="2" y="11.5" width="28" height="9" rx="4.5" />
    </svg>
  );
};

export const BackgroundLayer: React.FC = () => {
  return (
    <div
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #FFF8F0 0%, #FDEBDD 100%)',
      }}
      aria-hidden="true"
    >
      {/* 1. Base Waves & DNA Helix SVG */}
      <svg
        className="w-full h-full object-cover"
        viewBox="0 0 1536 1024"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Top-Center to Right Wave Gradient */}
          <linearGradient id="waveSilkGrad1" x1="45%" y1="0%" x2="100%" y2="80%">
            <stop offset="0%" stopColor="#EDE6FA" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#DACAF5" stopOpacity="0.65" />
            <stop offset="100%" stopColor="#C9B8F0" stopOpacity="0.5" />
          </linearGradient>

          <linearGradient id="waveSilkGrad2" x1="50%" y1="0%" x2="100%" y2="70%">
            <stop offset="0%" stopColor="#F2EBFC" stopOpacity="0.85" />
            <stop offset="60%" stopColor="#E2D4F7" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#C9B8F0" stopOpacity="0.55" />
          </linearGradient>

          <linearGradient id="waveSilkGrad3" x1="60%" y1="0%" x2="100%" y2="60%">
            <stop offset="0%" stopColor="#EDE6FA" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#D9CCF5" stopOpacity="0.6" />
          </linearGradient>

          {/* Bottom-Left Soft Wave Gradient */}
          <linearGradient id="waveBottomLeftGrad" x1="0%" y1="80%" x2="35%" y2="100%">
            <stop offset="0%" stopColor="#EDE6FA" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#C9B8F0" stopOpacity="0.55" />
          </linearGradient>

          {/* Bottom-Right Deeper Purple Wave Gradient */}
          <linearGradient id="waveBottomRightGrad" x1="30%" y1="80%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#E3D8F8" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#CCAFF2" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#B9A3EA" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        {/* 2. DNA Helix (faint vertical double helix centered at ~50%, y=45%, height ~85%) */}
        <g opacity="0.25" stroke="#C9B8F0" strokeWidth="1.8" strokeLinecap="round">
          {/* Strand 1 */}
          <path
            d="M 746 80 Q 790 170 746 260 T 746 440 T 746 620 T 746 800 T 746 950"
            fill="none"
          />
          {/* Strand 2 */}
          <path
            d="M 790 80 Q 746 170 790 260 T 790 440 T 790 620 T 790 800 T 790 950"
            fill="none"
          />
          {/* Horizontal Rungs connecting the two strands */}
          {[
            110, 140, 170, 200, 230, 260, 290, 320, 350, 380, 410, 440,
            470, 500, 530, 560, 590, 620, 650, 680, 710, 740, 770, 800,
            830, 860, 890, 920,
          ].map((y, idx) => {
            const progress = (y - 80) / 180;
            const offset = Math.sin(progress * Math.PI) * 22;
            const x1 = 768 - offset;
            const x2 = 768 + offset;
            return (
              <line
                key={`dna-rung-${idx}`}
                x1={Math.min(x1, x2)}
                y1={y}
                x2={Math.max(x1, x2)}
                y2={y}
                stroke="#C9B8F0"
                strokeWidth="1.6"
              />
            );
          })}
        </g>

        {/* 3. Waves with subtle drift animation */}
        {/* a) Top-Center to Right: Silk wave with 3 overlapping translucent layers */}
        <g className="animate-wave-drift-1">
          {/* Layer 1 (Back) */}
          <path
            d="M 680 0 C 860 80 1060 60 1240 140 C 1390 210 1480 300 1536 390 L 1536 0 Z"
            fill="url(#waveSilkGrad1)"
          />
          {/* Layer 2 (Mid) */}
          <path
            d="M 760 0 C 940 90 1140 80 1320 180 C 1430 240 1495 310 1536 360 L 1536 0 Z"
            fill="url(#waveSilkGrad2)"
          />
          {/* Layer 3 (Front Accent) */}
          <path
            d="M 880 0 C 1040 100 1220 110 1380 200 C 1460 250 1510 300 1536 330 L 1536 0 Z"
            fill="url(#waveSilkGrad3)"
          />
        </g>

        {/* b) Bottom-Left: Soft wave rising from bottom-left corner (~35% width, ~20% height) */}
        <g className="animate-wave-drift-2">
          <path
            d="M 0 820 C 140 820 280 860 410 930 C 480 970 520 1000 540 1024 L 0 1024 Z"
            fill="url(#waveBottomLeftGrad)"
          />
        </g>

        {/* c) Bottom-Right: Wide wave going up on the right side behind card's lower edge in deeper purple */}
        <g className="animate-wave-drift-1">
          <path
            d="M 520 1024 C 700 940 900 890 1100 830 C 1270 780 1410 790 1536 820 L 1536 1024 Z"
            fill="url(#waveBottomRightGrad)"
          />
          {/* Subtle curved ribbon crest for depth */}
          <path
            d="M 540 1024 C 720 950 910 900 1110 840 C 1270 790 1410 800 1536 830 L 1536 850 C 1400 820 1260 810 1100 860 C 900 920 710 970 540 1024 Z"
            fill="#B9A3EA"
            opacity="0.6"
          />
        </g>
      </svg>

      {/* 4. Scattered Plus Signs (positioned via viewport percentages, float animation) */}
      {/* (41%, 18%) */}
      <div
        className="absolute animate-plus-float"
        style={{ left: '41%', top: '18%' }}
      >
        <RoundedPlus size={32} />
      </div>

      {/* (42%, 49%) */}
      <div
        className="absolute animate-plus-float"
        style={{ left: '42%', top: '49%', animationDelay: '-1.5s' }}
      >
        <RoundedPlus size={30} />
      </div>

      {/* (55%, 63%) - hidden below 768px */}
      <div
        className="absolute animate-plus-float hidden md:block"
        style={{ left: '55%', top: '63%', animationDelay: '-3s' }}
      >
        <RoundedPlus size={28} />
      </div>

      {/* (54%, 91%) */}
      <div
        className="absolute animate-plus-float"
        style={{ left: '54%', top: '91%', animationDelay: '-4.5s' }}
      >
        <RoundedPlus size={32} />
      </div>

      {/* (97%, 22%) - hidden below 768px */}
      <div
        className="absolute animate-plus-float hidden md:block"
        style={{ left: '97%', top: '22%', animationDelay: '-2s' }}
      >
        <RoundedPlus size={28} />
      </div>

      {/* 5. Dot Grids (6 cols x 4 rows, 18px spacing, 6px dots, opacity 0.5, hidden below 768px) */}
      {/* Bottom-Left: left 2%, bottom 12% */}
      <div
        className="absolute hidden md:block"
        style={{ left: '2%', bottom: '12%' }}
      >
        <DotGrid />
      </div>

      {/* Bottom-Right: right 2%, bottom 3% */}
      <div
        className="absolute hidden md:block"
        style={{ right: '2%', bottom: '3%' }}
      >
        <DotGrid />
      </div>
    </div>
  );
};
