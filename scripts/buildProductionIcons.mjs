import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const inputImagePath = 'C:/Users/NTRUNG/.gemini/antigravity-ide/brain/cd9c4022-9810-4a89-a973-7d15fe2aa2bc/quizki_modern_q_1789488513505.jpg';
const publicDir = path.resolve('public');
const iosAppIconPath = path.resolve('ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png');

async function processIcons() {
    console.log('Loading input image:', inputImagePath);
    
    // 1. Crop center ~82% to eliminate outer dark corners and get pure edge-to-edge background
    const metadata = await sharp(inputImagePath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    
    const cropSize = Math.round(width * 0.82);
    const left = Math.round((width - cropSize) / 2);
    const top = Math.round((height - cropSize) / 2);

    console.log(`Cropping center ${cropSize}x${cropSize} from ${width}x${height}`);

    const masterPipeline = sharp(inputImagePath)
        .extract({ left, top, width: cropSize, height: cropSize })
        .resize(1024, 1024, { fit: 'cover', kernel: sharp.kernel.lanczos3 });

    const masterPngBuffer = await masterPipeline.png({ quality: 100 }).toBuffer();

    // Save master 1024x1024 icons
    fs.writeFileSync(path.join(publicDir, 'icon-1024.png'), masterPngBuffer);
    fs.writeFileSync(iosAppIconPath, masterPngBuffer);
    console.log('Saved icon-1024.png and iOS AppIcon-512@2x.png');

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
        const outBuf = await sharp(masterPngBuffer)
            .resize(target.size, target.size, { kernel: sharp.kernel.lanczos3 })
            .png({ quality: 100, compressionLevel: 9 })
            .toBuffer();
        
        fs.writeFileSync(path.join(publicDir, target.name), outBuf);
        console.log(`Generated ${target.name} (${target.size}x${target.size}) -> ${outBuf.length} bytes`);
    }

    console.log('All icons generated successfully!');
}

processIcons().catch(console.error);
