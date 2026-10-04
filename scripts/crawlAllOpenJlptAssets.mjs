import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OUT_DIR = path.resolve(__dirname, '../data/openjlpt');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchAsset(key, hash, outSubdir) {
    const targetDir = path.join(OUT_DIR, outSubdir);
    if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

    const safeName = key.replace(/[\/\\]/g, '__');
    const targetFile = path.join(targetDir, safeName.endsWith('.json') || safeName.endsWith('.js') ? safeName : `${safeName}.json`);

    if (fs.existsSync(targetFile)) {
        try {
            const stat = fs.statSync(targetFile);
            if (stat.size > 10) return { status: 'cached' };
        } catch (e) {}
    }

    const url = `https://d1yuzhlfxjxgbk.cloudfront.net/openjlpt-assets/content-v1/objects/${hash}.json`;
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const text = await res.text();
                fs.writeFileSync(targetFile, text, 'utf-8');
                return { status: 'success' };
            } else if (res.status === 403 || res.status === 404) {
                return { status: 'not_found', code: res.status };
            } else {
                await sleep(400 * attempt);
            }
        } catch (e) {
            await sleep(400 * attempt);
        }
    }
    return { status: 'failed' };
}

async function runQueue(items, outSubdir, label, concurrency = 10) {
    let index = 0;
    let completed = 0;
    let success = 0;
    let cached = 0;
    let failed = 0;

    console.log(`\n======================================================`);
    console.log(`📦 [Downloading ${label}] (${items.length} files)...`);
    console.log(`======================================================`);

    async function worker() {
        while (index < items.length) {
            const currentIdx = index++;
            const item = items[currentIdx];
            const res = await fetchAsset(item.key, item.hash, outSubdir);
            completed++;

            if (res.status === 'success') success++;
            else if (res.status === 'cached') cached++;
            else failed++;

            process.stdout.write(`\rProgress: [${completed}/${items.length}] | Success: ${success} | Cached: ${cached} | Skipped/Failed: ${failed} | File: ${item.key.slice(-30)}`);
            await sleep(50);
        }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    console.log(`\n🎉 Finished ${label}: ${success} downloaded, ${cached} cached, ${failed} skipped.`);
}

async function main() {
    const keysPath = path.resolve(__dirname, 'openjlpt_static_keys.json');
    if (!fs.existsSync(keysPath)) {
        console.error('Missing openjlpt_static_keys.json');
        return;
    }

    const staticKeys = JSON.parse(fs.readFileSync(keysPath, 'utf-8'));
    const allKeys = Object.keys(staticKeys);

    // 1. Scraped Books (Exam & Practice Books N1 - N5)
    const scrapedBooks = allKeys
        .filter(k => k.startsWith('scraped_'))
        .map(k => ({ key: k, hash: staticKeys[k] }));

    // 2. Mindmap V2 Notes
    const mindmapFiles = allKeys
        .filter(k => k.startsWith('mindmapV2/'))
        .map(k => ({ key: k, hash: staticKeys[k] }));

    // 3. Nikki Coach
    const nikkiFiles = allKeys
        .filter(k => k.startsWith('nikkiCoach/'))
        .map(k => ({ key: k, hash: staticKeys[k] }));

    // 4. Point Decks
    const pointDeckFiles = allKeys
        .filter(k => k.startsWith('pointDecks/'))
        .map(k => ({ key: k, hash: staticKeys[k] }));

    // 5. Analysis & Other Overlays
    const analysisFiles = allKeys
        .filter(k => k.startsWith('analysisEn/'))
        .map(k => ({ key: k, hash: staticKeys[k] }));

    await runQueue(scrapedBooks, 'books_scraped', 'Scraped JLPT Exam Books (N1-N5)', 10);
    await runQueue(mindmapFiles, 'mindmaps', 'Grammar Mindmaps V2', 12);
    await runQueue(nikkiFiles, 'nikki_coach', 'Nikki Coach Lessons', 10);
    await runQueue(pointDeckFiles, 'point_decks', 'Point Decks', 10);
    await runQueue(analysisFiles, 'analysis', 'Grammar & Reading Analysis', 10);

    console.log('\n\n🚀 All OpenJLPT assets downloaded and cached successfully!');
}

main().catch(console.error);
