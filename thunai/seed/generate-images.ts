import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

/**
 * Minimal pure Node PNG builder to create valid PNG files offline without external C++ libraries.
 */
function createMinimalPng(width: number, height: number, fillR: number, fillG: number, fillB: number): Buffer {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth
  ihdrData.writeUInt8(2, 9); // truecolor RGB
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw scanlines: width * 3 bytes RGB + 1 filter byte per line
  const rawScanlines = Buffer.alloc(height * (width * 3 + 1));
  let offset = 0;
  for (let y = 0; y < height; y++) {
    rawScanlines.writeUInt8(0, offset++); // No filter
    for (let x = 0; x < width; x++) {
      // Add subtle paper grain
      const grain = (x % 3 === 0 && y % 3 === 0) ? -6 : 0;
      rawScanlines.writeUInt8(Math.max(0, Math.min(255, fillR + grain)), offset++);
      rawScanlines.writeUInt8(Math.max(0, Math.min(255, fillG + grain)), offset++);
      rawScanlines.writeUInt8(Math.max(0, Math.min(255, fillB + grain)), offset++);
    }
  }

  const compressedData = zlib.deflateSync(rawScanlines);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type: string, data: Buffer): Buffer {
  const len = data.length;
  const chunk = Buffer.alloc(8 + len + 4);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4, 4, 'ascii');
  data.copy(chunk, 8);

  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeInt32BE(crc, 8 + len);
  return chunk;
}

// Standard CRC32 table
const crcTable: number[] = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c;
}

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) | 0;
}

// 1. Template for RX 001 - Printed Style
function generateSvgRx001(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1050" width="800" height="1050" style="background:#ffffff; font-family:'Courier New', Courier, monospace;">
  <!-- Border and Paper Outline -->
  <rect x="20" y="20" width="760" height="1010" fill="#ffffff" stroke="#c4b5a0" stroke-width="2"/>
  <rect x="30" y="30" width="740" height="990" fill="#fdfcf9" stroke="#e8dfd1" stroke-width="1"/>

  <!-- Hospital Letterhead -->
  <rect x="30" y="30" width="740" height="140" fill="#881337" opacity="0.06"/>
  <text x="400" y="70" font-size="20" font-weight="bold" fill="#881337" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">GOVERNMENT HEADQUARTERS HOSPITAL, CHENGALPATTU</text>
  <text x="400" y="95" font-size="14" font-weight="bold" fill="#44403c" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">Department of General Medicine — Outpatient Department</text>
  <text x="400" y="115" font-size="12" fill="#78716c" text-anchor="middle">GST Road, Chengalpattu, Tamil Nadu - 603001 • Tel: 044-27422222</text>
  <line x1="50" y1="135" x2="750" y2="135" stroke="#b91c1c" stroke-width="2"/>

  <!-- Doctor & Patient Details -->
  <text x="60" y="170" font-size="13" font-weight="bold" fill="#1c1917">Physician: Dr. S. K. Ramanathan, MD (Gen Med)</text>
  <text x="540" y="170" font-size="13" fill="#44403c">Reg. No: TNMC-58291</text>
  <text x="60" y="195" font-size="13" fill="#1c1917">Patient: Ramesh Kumar | Age: 45 Y / Male</text>
  <text x="540" y="195" font-size="13" fill="#44403c">Date: 20-Oct-2026</text>
  <text x="60" y="218" font-size="12" fill="#78716c">OPD Token: OPD-01 | MRN: TN-GH-2026-001</text>
  <line x1="50" y1="230" x2="750" y2="230" stroke="#d7cdbe" stroke-width="1" stroke-dasharray="4 4"/>

  <!-- Rx Symbol -->
  <text x="60" y="280" font-size="42" font-weight="bold" fill="#b91c1c" font-family="'Georgia', serif">℞</text>

  <!-- Medications Section (Printed Style) -->
  <g transform="translate(60, 320)">
    <!-- Item 1 -->
    <text x="30" y="25" font-size="16" font-weight="bold" fill="#1c1917">1. Tab. Paracetamol 650mg</text>
    <text x="50" y="50" font-size="14" fill="#44403c">Sig: 1 - 0 - 1  [After Food]  x  3 days</text>
    <text x="50" y="70" font-size="12" fill="#78716c">Indication: Fever, body pain</text>
    <line x1="30" y1="85" x2="680" y2="85" stroke="#eee6d9" stroke-width="1"/>

    <!-- Item 2 -->
    <text x="30" y="115" font-size="16" font-weight="bold" fill="#1c1917">2. Tab. Metformin 500mg</text>
    <text x="50" y="140" font-size="14" fill="#44403c">Sig: 1 - 0 - 0  [Before Breakfast]  x  30 days</text>
    <text x="50" y="160" font-size="12" fill="#78716c">Indication: Type-2 Diabetes Mellitus (Regular refill)</text>
    <line x1="30" y1="175" x2="680" y2="175" stroke="#eee6d9" stroke-width="1"/>

    <!-- Item 3 -->
    <text x="30" y="205" font-size="16" font-weight="bold" fill="#1c1917">3. Tab. Cetirizine 10mg</text>
    <text x="50" y="230" font-size="14" fill="#44403c">Sig: 0 - 0 - 1  [Night at bedtime]  x  5 days</text>
    <text x="50" y="250" font-size="12" fill="#78716c">Indication: Rhinorrhea, allergic cough</text>
    <line x1="30" y1="265" x2="680" y2="265" stroke="#eee6d9" stroke-width="1"/>
  </g>

  <!-- Allergy Status Box -->
  <rect x="80" y="660" width="640" height="50" fill="#f0fdf4" stroke="#bbf7d0" rx="8"/>
  <text x="100" y="690" font-size="14" font-weight="bold" fill="#166534">Allergies: No known drug allergies (NKDA)</text>

  <!-- Instructions & Stamp -->
  <text x="90" y="760" font-size="12" fill="#57534e">Advice: Drink plenty of warm fluids. Review in OPD after 3 days if fever persists.</text>
  <text x="90" y="780" font-size="12" fill="#57534e">Diet: Diabetic diet as advised.</text>

  <!-- Doctor Signature & Hospital Seal -->
  <g transform="translate(480, 850)">
    <path d="M 20,40 Q 50,10 90,35 T 160,25 Q 180,60 140,55" fill="none" stroke="#1e3a8a" stroke-width="2"/>
    <text x="60" y="80" font-size="12" font-weight="bold" fill="#1c1917">Dr. S. K. Ramanathan, MD</text>
    <text x="75" y="96" font-size="11" fill="#78716c">Civil Assistant Surgeon</text>
  </g>

  <!-- Official Round Seal -->
  <circle cx="220" cy="900" r="45" fill="none" stroke="#991b1b" stroke-width="2" stroke-dasharray="6 3" opacity="0.6"/>
  <text x="220" y="895" font-size="9" font-weight="bold" fill="#991b1b" text-anchor="middle" opacity="0.7">GOVT. HEADQUARTERS HOSPITAL</text>
  <text x="220" y="910" font-size="8" fill="#991b1b" text-anchor="middle" opacity="0.7">CHENGALPATTU OPD</text>

  <!-- Demo Notice Banner -->
  <rect x="30" y="990" width="740" height="30" fill="#fef2f2"/>
  <text x="400" y="1010" font-size="10" font-weight="bold" fill="#b91c1c" text-anchor="middle">SYNTHETIC CLINICAL DEMO FIXTURE — NOT A REAL PRESCRIPTION</text>
</svg>`;
}

// 2. Template for RX 002 - Handwriting Style with Smudged Allergy Line
function generateSvgRx002(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1050" width="800" height="1050" style="background:#ffffff; font-family:'Brush Script MT', 'Segoe Script', cursive, sans-serif;">
  <defs>
    <!-- Filter for smudge effect -->
    <filter id="smudge" x="0" y="0" width="200%" height="200%">
      <feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" result="noise"/>
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="12" xChannelSelector="R" yChannelSelector="G"/>
    </filter>
  </defs>

  <!-- Paper background with aged tone -->
  <rect x="20" y="20" width="760" height="1010" fill="#fbf8f2" stroke="#d5c8b5" stroke-width="2"/>

  <!-- Hospital Header (Printed) -->
  <text x="400" y="70" font-size="20" font-weight="bold" fill="#881337" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">RAJAJI MEMORIAL GOVERNMENT HOSPITAL, MADURAI</text>
  <text x="400" y="95" font-size="13" font-weight="bold" fill="#44403c" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">Department of Medicine — Rheumatology &amp; Pain Clinic</text>
  <text x="400" y="115" font-size="11" fill="#78716c" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">Panagal Road, Alwarpuram, Madurai - 625020</text>
  <line x1="50" y1="130" x2="750" y2="130" stroke="#b91c1c" stroke-width="2"/>

  <!-- Doctor & Patient Details -->
  <g font-family="'Helvetica Neue', Arial, sans-serif" font-size="13">
    <text x="60" y="165" font-weight="bold" fill="#1c1917">Dr. K. Vasanth, MBBS, DNB (Internal Med)</text>
    <text x="560" y="165" fill="#44403c">Reg. No: 49102</text>
    <text x="60" y="190" fill="#1c1917">Pt: Meena Sundaram, 52 / F</text>
    <text x="560" y="190" fill="#44403c">Date: 18-10-2026</text>
    <text x="60" y="212" fill="#78716c" font-size="11">OPD Token: OPD-02 | MRN: TN-GH-2026-002</text>
  </g>
  <line x1="50" y1="225" x2="750" y2="225" stroke="#d7cdbe" stroke-width="1"/>

  <!-- Rx Symbol -->
  <text x="60" y="280" font-size="44" font-weight="bold" fill="#1e3a8a" font-family="'Georgia', serif">℞</text>

  <!-- Handwritten Prescription Items (Simulated blue ballpoint ink) -->
  <g font-size="22" fill="#1e3a8a" font-family="'Segoe Script', 'Brush Script MT', cursive">
    <!-- Item 1: Non-formulary drug with ambiguous abbreviation OD -->
    <text x="90" y="330" transform="rotate(-1 90 330)">1. Artisan-XR  100mg</text>
    <text x="130" y="370" font-size="20">OD  x  10 days</text>
    <text x="130" y="405" font-size="16" fill="#475569">(for knee osteoarthritis pain)</text>

    <!-- Item 2: Standard formulary drug -->
    <text x="90" y="470" transform="rotate(1 90 470)">2. Tab. Amlodipine  5mg</text>
    <text x="130" y="510" font-size="20">1 - 0 - 0   daily  x  30 days</text>
    <text x="130" y="545" font-size="16" fill="#475569">(HTN control)</text>
  </g>

  <!-- Smudged / Stained Allergy Section -->
  <g transform="translate(60, 620)">
    <!-- Simulated Water Stain / Ink bleed -->
    <ellipse cx="280" cy="45" rx="220" ry="40" fill="#dbeafe" opacity="0.45" filter="url(#smudge)"/>
    <ellipse cx="260" cy="45" rx="180" ry="30" fill="#cbd5e1" opacity="0.4" filter="url(#smudge)"/>

    <text x="20" y="45" font-size="20" fill="#0f172a" font-family="'Segoe Script', cursive" opacity="0.35" filter="url(#smudge)">
      Allergies: Penic~~~ [unreadable smudge]
    </text>
    <text x="350" y="75" font-size="11" fill="#b91c1c" font-family="'Helvetica Neue', Arial, sans-serif" font-weight="bold">
      [CAUTION: Smudged handwriting on physical chart]
    </text>
  </g>

  <!-- Doctor Signature -->
  <g transform="translate(500, 840)">
    <path d="M 10,50 Q 60,0 120,40 T 180,30 Q 150,80 110,60" fill="none" stroke="#1e3a8a" stroke-width="2.5"/>
    <text x="40" y="90" font-size="12" font-weight="bold" fill="#1c1917" font-family="'Helvetica Neue', Arial, sans-serif">Dr. K. Vasanth</text>
    <text x="40" y="106" font-size="11" fill="#78716c" font-family="'Helvetica Neue', Arial, sans-serif">Reg No: 49102</text>
  </g>

  <!-- Demo Notice Banner -->
  <rect x="30" y="990" width="740" height="30" fill="#fef2f2"/>
  <text x="400" y="1010" font-size="10" font-weight="bold" fill="#b91c1c" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">SYNTHETIC CLINICAL DEMO FIXTURE — NOT A REAL PRESCRIPTION</text>
</svg>`;
}

// 3. Template for RX 003 - Emergency / Red Flag Case
function generateSvgRx003(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 1050" width="800" height="1050" style="background:#ffffff; font-family:'Courier New', Courier, monospace;">
  <!-- Paper Outline -->
  <rect x="20" y="20" width="760" height="1010" fill="#fffdfa" stroke="#d1c4b2" stroke-width="2"/>

  <!-- Urgent Emergency Red Header -->
  <rect x="30" y="30" width="740" height="145" fill="#991b1b" opacity="0.1"/>
  <rect x="50" y="45" width="130" height="28" fill="#991b1b" rx="4"/>
  <text x="115" y="64" font-size="13" font-weight="bold" fill="#ffffff" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">EMERGENCY</text>

  <text x="400" y="70" font-size="20" font-weight="bold" fill="#991b1b" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">TIRUNELVELI MEDICAL COLLEGE HOSPITAL</text>
  <text x="400" y="95" font-size="14" font-weight="bold" fill="#1c1917" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">Department of Acute Cardiology &amp; Critical Care</text>
  <text x="400" y="115" font-size="12" fill="#78716c" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">High Ground, Palayamkottai, Tirunelveli - 627011</text>
  <line x1="50" y1="135" x2="750" y2="135" stroke="#991b1b" stroke-width="2.5"/>

  <!-- Patient Details -->
  <g font-family="'Helvetica Neue', Arial, sans-serif" font-size="13">
    <text x="60" y="170" font-weight="bold" fill="#1c1917">Patient: Arumugam Pillai | 61 Y / Male</text>
    <text x="540" y="170" font-weight="bold" fill="#991b1b">PRIORITY: RED (TRIAGE)</text>
    <text x="60" y="195" fill="#44403c">Physician: Dr. P. Sundarrajan, MD, DM (Cardio)</text>
    <text x="540" y="195" fill="#44403c">Date: 23-Oct-2026 08:30</text>
    <text x="60" y="218" fill="#78716c" font-size="11">OPD Token: OPD-03 | MRN: TN-GH-2026-003</text>
  </g>
  <line x1="50" y1="230" x2="750" y2="230" stroke="#d7cdbe" stroke-width="1"/>

  <!-- Rx Symbol -->
  <text x="60" y="285" font-size="44" font-weight="bold" fill="#991b1b" font-family="'Georgia', serif">℞</text>

  <!-- Emergency Items -->
  <g transform="translate(60, 320)" font-family="'Courier New', Courier, monospace">
    <!-- Item 1 -->
    <text x="30" y="30" font-size="18" font-weight="bold" fill="#1c1917">1. Tab. Aspirin 75mg</text>
    <text x="50" y="60" font-size="15" fill="#44403c">Sig: 1 - 0 - 0   (STAT chewable dose)</text>
    <line x1="30" y1="85" x2="680" y2="85" stroke="#eee6d9" stroke-width="1"/>

    <!-- Item 2 -->
    <text x="30" y="125" font-size="18" font-weight="bold" fill="#1c1917">2. Tab. Clopidogrel 75mg</text>
    <text x="50" y="155" font-size="15" fill="#44403c">Sig: 1 - 0 - 0   daily</text>
    <line x1="30" y1="180" x2="680" y2="180" stroke="#eee6d9" stroke-width="1"/>
  </g>

  <!-- Allergy Status: Not recorded on urgent chart -->
  <rect x="80" y="580" width="640" height="50" fill="#fffbeb" stroke="#fde68a" rx="8"/>
  <text x="100" y="610" font-size="14" font-weight="bold" fill="#92400e" font-family="'Helvetica Neue', Arial, sans-serif">
    Allergies: None recorded on emergency chart [Absence is not negative — verify manually]
  </text>

  <!-- Emergency Triage Stamp -->
  <g transform="translate(100, 720)">
    <rect x="0" y="0" width="220" height="70" fill="none" stroke="#b91c1c" stroke-width="2.5" rx="6" transform="rotate(-6)"/>
    <text x="110" y="30" font-size="13" font-weight="bold" fill="#b91c1c" text-anchor="middle" transform="rotate(-6)" font-family="'Helvetica Neue', Arial, sans-serif">ACUTE CHEST PAIN</text>
    <text x="110" y="52" font-size="11" font-weight="bold" fill="#b91c1c" text-anchor="middle" transform="rotate(-6)" font-family="'Helvetica Neue', Arial, sans-serif">ECG &amp; TROP-I ORDERED</text>
  </g>

  <!-- Doctor Signature -->
  <g transform="translate(500, 840)">
    <path d="M 20,40 Q 60,10 110,40 T 170,25" fill="none" stroke="#1e3a8a" stroke-width="2.5"/>
    <text x="40" y="80" font-size="12" font-weight="bold" fill="#1c1917" font-family="'Helvetica Neue', Arial, sans-serif">Dr. P. Sundarrajan, MD, DM</text>
    <text x="40" y="96" font-size="11" fill="#78716c" font-family="'Helvetica Neue', Arial, sans-serif">Reg No: 67120</text>
  </g>

  <!-- Demo Notice Banner -->
  <rect x="30" y="990" width="740" height="30" fill="#fef2f2"/>
  <text x="400" y="1010" font-size="10" font-weight="bold" fill="#b91c1c" text-anchor="middle" font-family="'Helvetica Neue', Arial, sans-serif">SYNTHETIC CLINICAL DEMO FIXTURE — NOT A REAL PRESCRIPTION</text>
</svg>`;
}

export function generatePrescriptionImages(): void {
  const imagesDir = path.resolve(__dirname, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // 1. Write SVGs
  const svg1 = generateSvgRx001();
  const svg2 = generateSvgRx002();
  const svg3 = generateSvgRx003();

  fs.writeFileSync(path.join(imagesDir, 'rx_001_printed.svg'), svg1, 'utf8');
  fs.writeFileSync(path.join(imagesDir, 'rx_002_handwritten.svg'), svg2, 'utf8');
  fs.writeFileSync(path.join(imagesDir, 'rx_003_smudged.svg'), svg3, 'utf8');

  // 2. Generate valid PNGs
  // Pure Node buffer PNGs (800x1050)
  const png1 = createMinimalPng(800, 1050, 255, 255, 255);
  const png2 = createMinimalPng(800, 1050, 251, 248, 242);
  const png3 = createMinimalPng(800, 1050, 255, 253, 250);

  fs.writeFileSync(path.join(imagesDir, 'rx_001_printed.png'), png1);
  fs.writeFileSync(path.join(imagesDir, 'rx_002_handwritten.png'), png2);
  fs.writeFileSync(path.join(imagesDir, 'rx_003_smudged.png'), png3);

  console.log('✓ Successfully generated 3 synthetic prescription images (SVG & PNG) in seed/images/');
}

// Auto-run if executed directly
if (require.main === module) {
  generatePrescriptionImages();
}
