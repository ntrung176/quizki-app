import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJseW5ndXllbm5oYXR0cnVuZzE3MCIsImlhdCI6MTc5MTA0MTIzMiwiZXhwIjoxNzkxMDQyMTMyLCJ0eXBlIjoiYWNjZXNzIiwianRpIjoiM2YwNzBlOWQtNmRlOS00Zjk5LTg4ZGEtYzAyZTdlMmYxMzEyIn0.eu-VF1jDHdGcbinlMlTqiWuFMMOOLYufGz9rjlvTmi0wdTBzcq-AFxLpL0ABQp2leUG2ey6U08zGw8NckI4TbQ';

const HEADERS = {
    'Authorization': `Bearer ${TOKEN}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
};

const OUT_DIR = path.resolve(__dirname, '../data/openjlpt/vocabulary/sets');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchSet(setMeta, retries = 3) {
    const filePath = path.join(OUT_DIR, `${setMeta.id}.json`);
    if (fs.existsSync(filePath)) {
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            if (data && data.cards) return { status: 'cached', data };
        } catch (e) {}
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(`https://openjlpt.com/api/sets/${setMeta.id}`, { headers: HEADERS });
            if (res.ok) {
                const data = await res.json();
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                return { status: 'success', data };
            } else if (res.status === 403) {
                return { status: 'forbidden' };
            } else if (res.status === 401) {
                return { status: 'unauthorized', error: 'Token expired' };
            } else {
                if (attempt === retries) return { status: 'error', code: res.status };
                await sleep(500 * attempt);
            }
        } catch (e) {
            if (attempt === retries) return { status: 'error', error: e.message };
            await sleep(500 * attempt);
        }
    }
    return { status: 'error' };
}

async function runQueue(items, concurrency = 6) {
    let index = 0;
    let completed = 0;
    let success = 0;
    let cached = 0;
    let forbidden = 0;
    let failed = 0;

    const results = [];

    async function worker() {
        while (index < items.length) {
            const currentIdx = index++;
            const item = items[currentIdx];
            const res = await fetchSet(item);
            completed++;

            if (res.status === 'success') {
                success++;
            } else if (res.status === 'cached') {
                cached++;
            } else if (res.status === 'forbidden') {
                forbidden++;
            } else {
                failed++;
                if (res.status === 'unauthorized') {
                    console.error('\n❌ Token expired!');
                    process.exit(1);
                }
            }

            process.stdout.write(`\rProgress: [${completed}/${items.length}] | Success: ${success} | Cached: ${cached} | Pro: ${forbidden} | Failed: ${failed} | Current: "${item.title?.slice(0, 35)}"`);
            results.push(res);
            await sleep(80);
        }
    }

    const workers = Array.from({ length: concurrency }, () => worker());
    await Promise.all(workers);
    return results;
}

async function main() {
    console.log('🚀 Starting Crawl for Tango & Missing OpenJLPT Sets...');
    const metaPath = path.resolve(__dirname, 'openjlpt_all_sets_meta.json');
    const allSets = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));

    // Priority: Tango sets first, then all other sets
    const tangoSets = allSets.filter(s => (s.title || '').toLowerCase().includes('tango'));
    const otherSets = allSets.filter(s => !(s.title || '').toLowerCase().includes('tango'));

    console.log(`\n📚 [1/2] Crawling Tango Sets (${tangoSets.length} sets)...`);
    await runQueue(tangoSets, 8);

    console.log(`\n\n📦 [2/2] Crawling Remaining Sets (${otherSets.length} sets)...`);
    await runQueue(otherSets, 8);

    console.log('\n\n🎉 Done crawling all available sets!');
}

main().catch(console.error);
