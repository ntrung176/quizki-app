import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
}

function crc32(buf) {
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < buf.length; i++) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
}

function encodePng(width, height, rgbaBuffer) {
    const rowLength = 1 + width * 4;
    const rawData = Buffer.alloc(height * rowLength);

    for (let y = 0; y < height; y++) {
        const rowOffset = y * rowLength;
        rawData[rowOffset] = 0;
        rgbaBuffer.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
    }

    const compressed = zlib.deflateSync(rawData, { level: 9 });
    const chunks = [];
    chunks.push(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]));

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8;
    ihdrData[9] = 6;
    ihdrData[10] = 0;
    ihdrData[11] = 0;
    ihdrData[12] = 0;
    chunks.push(createChunk('IHDR', ihdrData));
    chunks.push(createChunk('IDAT', compressed));
    chunks.push(createChunk('IEND', Buffer.alloc(0)));

    return Buffer.concat(chunks);
}

function createChunk(type, data) {
    const len = data.length;
    const chunk = Buffer.alloc(12 + len);
    chunk.writeUInt32BE(len, 0);
    chunk.write(type, 4, 4, 'ascii');
    data.copy(chunk, 8);
    const crcBuf = Buffer.alloc(4 + len);
    chunk.copy(crcBuf, 0, 4, 8 + len);
    chunk.writeUInt32BE(crc32(crcBuf), 8 + len);
    return chunk;
}

class FastSurface {
    constructor(size) {
        this.size = size;
        this.pixels = Buffer.alloc(size * size * 4);
    }

    setPixel(x, y, r, g, b, a = 255) {
        if (x < 0 || x >= this.size || y < 0 || y >= this.size) return;
        const idx = (y * this.size + x) * 4;
        if (a === 255) {
            this.pixels[idx] = r;
            this.pixels[idx + 1] = g;
            this.pixels[idx + 2] = b;
            this.pixels[idx + 3] = 255;
        } else if (a > 0) {
            const alpha = a / 255;
            const invAlpha = 1 - alpha;
            const curA = this.pixels[idx + 3] / 255;
            const outA = alpha + curA * invAlpha;
            if (outA > 0) {
                this.pixels[idx] = Math.round((r * alpha + this.pixels[idx] * curA * invAlpha) / outA);
                this.pixels[idx + 1] = Math.round((g * alpha + this.pixels[idx + 1] * curA * invAlpha) / outA);
                this.pixels[idx + 2] = Math.round((b * alpha + this.pixels[idx + 2] * curA * invAlpha) / outA);
                this.pixels[idx + 3] = Math.round(outA * 255);
            }
        }
    }

    // Gradient background
    fillBackground() {
        const s = this.size;
        for (let y = 0; y < s; y++) {
            const ny = y / s;
            for (let x = 0; x < s; x++) {
                const nx = x / s;
                // Luxury dark teal gradient from #1F4556 to #0D1C24
                const t = (nx * 0.4 + ny * 0.6);
                let r = 0x1F * (1 - t) + 0x0D * t;
                let g = 0x45 * (1 - t) + 0x1C * t;
                let b = 0x56 * (1 - t) + 0x24 * t;

                // Subtle top-left light burst
                const dx = nx - 0.35;
                const dy = ny - 0.25;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const burst = Math.max(0, 1 - dist * 1.8);
                r += burst * 20;
                g += burst * 40;
                b += burst * 50;

                this.setPixel(x, y, Math.min(255, Math.round(r)), Math.min(255, Math.round(g)), Math.min(255, Math.round(b)), 255);
            }
        }
    }

    // Filled Rounded Rectangle with Rotation
    fillRotatedRoundedRect(cx, cy, w, h, radius, angleRad, r, g, b, alpha = 255, shadow = false) {
        const cos = Math.cos(-angleRad);
        const sin = Math.sin(-angleRad);

        const halfW = w / 2;
        const halfH = h / 2;
        const rad = Math.min(radius, halfW, halfH);

        const bound = Math.ceil(Math.sqrt(halfW * halfW + halfH * halfH)) + (shadow ? 30 : 2);
        const minX = Math.max(0, Math.floor(cx - bound));
        const maxX = Math.min(this.size - 1, Math.ceil(cx + bound));
        const minY = Math.max(0, Math.floor(cy - bound));
        const maxY = Math.min(this.size - 1, Math.ceil(cy + bound));

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const lx = Math.abs(dx * cos - dy * sin);
                const ly = Math.abs(dx * sin + dy * cos);

                if (lx <= halfW && ly <= halfH) {
                    let d = 0;
                    if (lx > halfW - rad && ly > halfH - rad) {
                        const cxCorner = lx - (halfW - rad);
                        const cyCorner = ly - (halfH - rad);
                        d = Math.sqrt(cxCorner * cxCorner + cyCorner * cyCorner) - rad;
                    }

                    if (d <= 1) {
                        let a = alpha;
                        if (d > -0.5) {
                            a = Math.round(alpha * Math.max(0, 1 - (d + 0.5) / 1.5));
                        }
                        this.setPixel(x, y, r, g, b, a);
                    }
                }
            }
        }
    }

    // Antialiased Circle
    fillCircle(cx, cy, radius, r, g, b, alpha = 255) {
        const minX = Math.max(0, Math.floor(cx - radius - 2));
        const maxX = Math.min(this.size - 1, Math.ceil(cx + radius + 2));
        const minY = Math.max(0, Math.floor(cy - radius - 2));
        const maxY = Math.min(this.size - 1, Math.ceil(cy + radius + 2));

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const diff = dist - radius;
                if (diff <= 1) {
                    let a = alpha;
                    if (diff > -0.5) {
                        a = Math.round(alpha * Math.max(0, 1 - (diff + 0.5) / 1.5));
                    }
                    this.setPixel(x, y, r, g, b, a);
                }
            }
        }
    }

    // Ring (Annulus)
    fillRing(cx, cy, radius, thickness, r, g, b, alpha = 255) {
        const halfThick = thickness / 2;
        const minX = Math.max(0, Math.floor(cx - radius - halfThick - 2));
        const maxX = Math.min(this.size - 1, Math.ceil(cx + radius + halfThick + 2));
        const minY = Math.max(0, Math.floor(cy - radius - halfThick - 2));
        const maxY = Math.min(this.size - 1, Math.ceil(cy + radius + halfThick + 2));

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const diff = Math.abs(dist - radius);
                if (diff <= halfThick + 1) {
                    let a = alpha;
                    if (diff > halfThick - 0.5) {
                        a = Math.round(alpha * Math.max(0, 1 - (diff - (halfThick - 0.5)) / 1.5));
                    }
                    this.setPixel(x, y, r, g, b, a);
                }
            }
        }
    }

    // Smooth Line
    drawLine(x0, y0, x1, y1, width, r, g, b, alpha = 255) {
        const dx = x1 - x0;
        const dy = y1 - y0;
        const len = Math.sqrt(dx * dx + dy * dy);
        if (len === 0) return;
        const udx = dx / len;
        const udy = dy / len;
        const pad = width + 2;

        const minX = Math.max(0, Math.floor(Math.min(x0, x1) - pad));
        const maxX = Math.min(this.size - 1, Math.ceil(Math.max(x0, x1) + pad));
        const minY = Math.max(0, Math.floor(Math.min(y0, y1) - pad));
        const maxY = Math.min(this.size - 1, Math.ceil(Math.max(y0, y1) + pad));

        const halfW = width / 2;

        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                const px = x - x0;
                const py = y - y0;
                const proj = px * udx + py * udy;
                let dist = 0;
                if (proj < 0) {
                    dist = Math.sqrt((x - x0) ** 2 + (y - y0) ** 2);
                } else if (proj > len) {
                    dist = Math.sqrt((x - x1) ** 2 + (y - y1) ** 2);
                } else {
                    const perpX = px - proj * udx;
                    const perpY = py - proj * udy;
                    dist = Math.sqrt(perpX * perpX + perpY * perpY);
                }

                if (dist <= halfW + 1) {
                    let a = alpha;
                    if (dist > halfW - 0.5) {
                        a = Math.round(alpha * Math.max(0, 1 - (dist - (halfW - 0.5)) / 1.5));
                    }
                    this.setPixel(x, y, r, g, b, a);
                }
            }
        }
    }
}

function renderPremiumIcon(size = 1024) {
    const s = new FastSurface(size);
    const scale = size / 1024;
    const center = 512 * scale;

    s.fillBackground();

    // 1. Ambient Lighting Behind Cards
    s.fillCircle(center, 480 * scale, 320 * scale, 56, 189, 248, 45); // Cyan glow
    s.fillCircle(center + 60 * scale, 440 * scale, 220 * scale, 251, 191, 36, 35); // Gold glow

    // 2. Back Study Card (Tilted 10 degrees, Electric Teal/Cyan with soft shadow)
    const cardW = 440 * scale;
    const cardH = 540 * scale;
    const cardR = 64 * scale;

    // Back card shadow
    s.fillRotatedRoundedRect(center - 20 * scale, 510 * scale, cardW, cardH, cardR, -0.16, 10, 20, 28, 140);
    // Back card body
    s.fillRotatedRoundedRect(center - 20 * scale, 490 * scale, cardW, cardH, cardR, -0.16, 26, 68, 88, 255);
    s.fillRotatedRoundedRect(center - 20 * scale, 490 * scale, cardW - 14 * scale, cardH - 14 * scale, cardR - 7 * scale, -0.16, 38, 92, 118, 255);

    // 3. Front Flashcard (Pure White / Crisp Ivory with gold & cyan trim)
    // Front card shadow
    s.fillRotatedRoundedRect(center + 15 * scale, 520 * scale, cardW, cardH, cardR, 0.08, 8, 16, 24, 160);
    // Front card body (Premium White with smooth subtle gradient)
    s.fillRotatedRoundedRect(center + 15 * scale, 500 * scale, cardW, cardH, cardR, 0.08, 248, 250, 252, 255);
    
    // Front card inner area
    s.fillRotatedRoundedRect(center + 15 * scale, 500 * scale, cardW - 20 * scale, cardH - 20 * scale, cardR - 10 * scale, 0.08, 255, 255, 255, 255);

    // 4. Vibrant Bookmark / Ribbon (Gold Gradient at Top-Right of Card)
    const ribbonX = center + 140 * scale;
    const ribbonY = 275 * scale;
    s.fillRotatedRoundedRect(ribbonX, ribbonY, 70 * scale, 130 * scale, 18 * scale, 0.08, 245, 158, 11, 255);
    s.fillRotatedRoundedRect(ribbonX, ribbonY, 56 * scale, 116 * scale, 14 * scale, 0.08, 251, 191, 36, 255);

    // 5. Bold Iconic Emblem: Stylized Modern "Q" on the Front Card
    const qCenterX = center + 5 * scale;
    const qCenterY = 485 * scale;
    const qRadius = 115 * scale;
    const qThick = 44 * scale;

    // Q Ring in Signature QuizKi Deep Navy (#1E4052)
    s.fillRing(qCenterX, qCenterY, qRadius, qThick, 30, 64, 82, 255);
    // Inner cyan glow ring on Q
    s.fillRing(qCenterX, qCenterY, qRadius - 10 * scale, 12 * scale, 56, 189, 248, 220);

    // Q Tail (Dynamic brush-style angled tail)
    const tStartX = qCenterX + 60 * scale;
    const tStartY = qCenterY + 60 * scale;
    const tEndX = qCenterX + 155 * scale;
    const tEndY = qCenterY + 155 * scale;
    s.drawLine(tStartX, tStartY, tEndX, tEndY, 44 * scale, 30, 64, 82, 255);
    s.drawLine(tStartX + 8 * scale, tStartY + 8 * scale, tEndX, tEndY, 20 * scale, 245, 158, 11, 255); // Golden spark on tail

    // 6. Japanese Kanji Dot / Accent: Golden Sparkle or Clean Dot in center
    s.fillCircle(qCenterX, qCenterY, 32 * scale, 30, 64, 82, 255);
    s.fillCircle(qCenterX, qCenterY, 20 * scale, 56, 189, 248, 255);

    // 7. Subtle 3-point lines on bottom of card (representing study flashcards)
    const lineX = center - 90 * scale;
    const lineY = 640 * scale;
    s.drawLine(lineX, lineY, lineX + 180 * scale, lineY + 15 * scale, 8 * scale, 203, 213, 225, 200);
    s.drawLine(lineX + 20 * scale, lineY + 22 * scale, lineX + 160 * scale, lineY + 34 * scale, 8 * scale, 203, 213, 225, 150);

    return encodePng(size, size, s.pixels);
}

// Generate all target files
const publicDir = path.resolve('public');
const iosAppIconPath = path.resolve('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');

console.log('Rendering Master 1024x1024 Premium QuizKi Icon...');
const master1024 = renderPremiumIcon(1024);
fs.writeFileSync(path.join(publicDir, 'icon-1024.png'), master1024);
fs.writeFileSync(iosAppIconPath, master1024);
console.log('Updated icon-1024.png and iOS AppIcon-512@2x.png');

const targets = [
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-180x180.png', size: 180 },
    { name: 'apple-touch-icon-precomposed.png', size: 180 },
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-192.png', size: 192 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 }
];

for (const target of targets) {
    const buf = renderPremiumIcon(target.size);
    fs.writeFileSync(path.join(publicDir, target.name), buf);
    console.log(`Generated ${target.name} (${target.size}x${target.size}) -> ${buf.length} bytes`);
}

// Update SVG version too
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" role="img" aria-label="QuizKi Icon">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1F4556"/>
      <stop offset="100%" stop-color="#0D1C24"/>
    </linearGradient>
    <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="12" stdDeviation="16" flood-color="#050C10" flood-opacity="0.5"/>
    </filter>
  </defs>

  <rect width="512" height="512" fill="url(#bg)"/>

  <!-- Ambient Glow -->
  <circle cx="256" cy="240" r="160" fill="#38BDF8" opacity="0.18"/>
  <circle cx="290" cy="220" r="110" fill="#FBBF24" opacity="0.14"/>

  <!-- Back Card -->
  <g transform="translate(236, 245) rotate(-9) translate(-220, -270)" filter="url(#shadow)">
    <rect width="220" height="270" rx="32" fill="#1A4458" stroke="#38BDF8" stroke-width="6" opacity="0.95"/>
  </g>

  <!-- Front Card -->
  <g transform="translate(266, 255) rotate(4) translate(-220, -270)" filter="url(#shadow)">
    <rect width="220" height="270" rx="32" fill="#FFFFFF"/>
    
    <!-- Gold Ribbon -->
    <rect x="155" y="-6" width="36" height="64" rx="8" fill="#F59E0B"/>
    <rect x="160" y="-6" width="26" height="56" rx="6" fill="#FBBF24"/>

    <!-- Q Logo -->
    <circle cx="110" cy="135" r="58" fill="none" stroke="#1E4052" stroke-width="22"/>
    <circle cx="110" cy="135" r="48" fill="none" stroke="#38BDF8" stroke-width="6" opacity="0.8"/>
    <path d="M 140 165 L 188 212" stroke="#1E4052" stroke-width="22" stroke-linecap="round"/>
    <path d="M 152 178 L 188 212" stroke="#F59E0B" stroke-width="10" stroke-linecap="round"/>

    <!-- Center dot -->
    <circle cx="110" cy="135" r="16" fill="#1E4052"/>
    <circle cx="110" cy="135" r="10" fill="#38BDF8"/>

    <!-- Bottom Lines -->
    <line x1="50" y1="215" x2="140" y2="222" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round"/>
    <line x1="60" y1="228" x2="130" y2="234" stroke="#CBD5E1" stroke-width="4" stroke-linecap="round" opacity="0.7"/>
  </g>
</svg>
`;

fs.writeFileSync(path.join(publicDir, 'quizki-icon.svg'), svgContent);
console.log('Updated public/quizki-icon.svg successfully!');
