import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

// Simple CRC32 implementation
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

// Minimal PNG Decoder (RGBA 8-bit)
function decodePng(buffer) {
    let offset = 8; // skip signature
    let width = 0;
    let height = 0;
    let idatChunks = [];

    while (offset < buffer.length) {
        const length = buffer.readUInt32BE(offset);
        const type = buffer.toString('ascii', offset + 4, offset + 8);
        const data = buffer.subarray(offset + 8, offset + 8 + length);

        if (type === 'IHDR') {
            width = data.readUInt32BE(0);
            height = data.readUInt32BE(4);
            const bitDepth = data[8];
            const colorType = data[9];
            if (bitDepth !== 8 || (colorType !== 6 && colorType !== 2)) {
                throw new Error(`Unsupported PNG format: bitDepth=${bitDepth}, colorType=${colorType}`);
            }
        } else if (type === 'IDAT') {
            idatChunks.push(data);
        } else if (type === 'IEND') {
            break;
        }

        offset += 12 + length;
    }

    const compressed = Buffer.concat(idatChunks);
    const raw = zlib.inflateSync(compressed);

    const bpp = 4; // RGBA
    const rowBytes = width * bpp;
    const pixels = Buffer.alloc(width * height * 4);

    let rawOffset = 0;
    for (let y = 0; y < height; y++) {
        const filter = raw[rawOffset++];
        for (let x = 0; x < width; x++) {
            const destIdx = (y * width + x) * 4;
            for (let c = 0; c < 4; c++) {
                const current = raw[rawOffset++];
                const left = x > 0 ? pixels[(y * width + (x - 1)) * 4 + c] : 0;
                const above = y > 0 ? pixels[((y - 1) * width + x) * 4 + c] : 0;
                const aboveLeft = (x > 0 && y > 0) ? pixels[((y - 1) * width + (x - 1)) * 4 + c] : 0;

                let val = 0;
                if (filter === 0) val = current;
                else if (filter === 1) val = (current + left) & 0xFF;
                else if (filter === 2) val = (current + above) & 0xFF;
                else if (filter === 3) val = (current + Math.floor((left + above) / 2)) & 0xFF;
                else if (filter === 4) {
                    const p = left + above - aboveLeft;
                    const pa = Math.abs(p - left);
                    const pb = Math.abs(p - above);
                    const pc = Math.abs(p - aboveLeft);
                    let pr = 0;
                    if (pa <= pb && pa <= pc) pr = left;
                    else if (pb <= pc) pr = above;
                    else pr = aboveLeft;
                    val = (current + pr) & 0xFF;
                }
                pixels[destIdx + c] = val;
            }
        }
    }

    return { width, height, pixels };
}

// Bilinear Resize
function resizeRgba(src, targetWidth, targetHeight) {
    const { width: srcW, height: srcH, pixels: srcPx } = src;
    const destPx = Buffer.alloc(targetWidth * targetHeight * 4);

    for (let y = 0; y < targetHeight; y++) {
        const srcY = (y + 0.5) * (srcH / targetHeight) - 0.5;
        const y0 = Math.max(0, Math.min(srcH - 1, Math.floor(srcY)));
        const y1 = Math.max(0, Math.min(srcH - 1, y0 + 1));
        const dy = srcY - y0;

        for (let x = 0; x < targetWidth; x++) {
            const srcX = (x + 0.5) * (srcW / targetWidth) - 0.5;
            const x0 = Math.max(0, Math.min(srcW - 1, Math.floor(srcX)));
            const x1 = Math.max(0, Math.min(srcW - 1, x0 + 1));
            const dx = srcX - x0;

            const idx00 = (y0 * srcW + x0) * 4;
            const idx10 = (y0 * srcW + x1) * 4;
            const idx01 = (y1 * srcW + x0) * 4;
            const idx11 = (y1 * srcW + x1) * 4;

            const destIdx = (y * targetWidth + x) * 4;

            for (let c = 0; c < 4; c++) {
                const v00 = srcPx[idx00 + c];
                const v10 = srcPx[idx10 + c];
                const v01 = srcPx[idx01 + c];
                const v11 = srcPx[idx11 + c];

                const top = v00 * (1 - dx) + v10 * dx;
                const bottom = v01 * (1 - dx) + v11 * dx;
                destPx[destIdx + c] = Math.round(top * (1 - dy) + bottom * dy);
            }
        }
    }

    return { width: targetWidth, height: targetHeight, pixels: destPx };
}

// Encode RGBA to PNG
function encodePng(image) {
    const { width, height, pixels } = image;
    const rowLength = 1 + width * 4;
    const rawData = Buffer.alloc(height * rowLength);

    for (let y = 0; y < height; y++) {
        const rowOffset = y * rowLength;
        rawData[rowOffset] = 0; // Filter: None
        pixels.copy(rawData, rowOffset + 1, y * width * 4, (y + 1) * width * 4);
    }

    const compressed = zlib.deflateSync(rawData, { level: 9 });

    // Build chunks
    const chunks = [];
    chunks.push(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])); // Signature

    // IHDR
    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 6; // color type: RGBA
    ihdrData[10] = 0; // compression
    ihdrData[11] = 0; // filter
    ihdrData[12] = 0; // interlace
    chunks.push(createChunk('IHDR', ihdrData));

    // IDAT
    chunks.push(createChunk('IDAT', compressed));

    // IEND
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

// Main generation flow
const sourceIconPath = path.resolve('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');
const publicDir = path.resolve('public');

console.log('Reading source icon from:', sourceIconPath);
const srcBuf = fs.readFileSync(sourceIconPath);
const decoded = decodePng(srcBuf);
console.log(`Source image decoded: ${decoded.width}x${decoded.height}`);

const targets = [
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'apple-touch-icon-180x180.png', size: 180 },
    { name: 'apple-touch-icon-precomposed.png', size: 180 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-16x16.png', size: 16 }
];

for (const target of targets) {
    const resized = resizeRgba(decoded, target.size, target.size);
    const pngBuf = encodePng(resized);
    const destPath = path.join(publicDir, target.name);
    fs.writeFileSync(destPath, pngBuf);
    console.log(`Generated ${target.name} (${target.size}x${target.size}) -> ${pngBuf.length} bytes`);
}

// Copy source directly as full-res icon
fs.copyFileSync(sourceIconPath, path.join(publicDir, 'icon-1024.png'));
console.log('Copied icon-1024.png successfully!');
