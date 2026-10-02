import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJseW5ndXllbm5oYXR0cnVuZzE3MCIsImlhdCI6MTc5MDk1NzQwOCwiZXhwIjoxNzkwOTU4MzA4LCJ0eXBlIjoiYWNjZXNzIiwianRpIjoiZGJlMmVhNjYtZWMzYi00YWVlLTkxMzAtNjVjN2FkNGM5NjVhIn0.1WpoWB8RmHSgJ1X3iYrhDcrqPhEx64ihrKahqS7daE09_t4Qe3uT4Va5KeUB412zdi1sWMRMGdLSLHsGon5q0w';

const OUT_DIR = path.resolve(__dirname, '../data/openjlpt');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

const HEADERS = {
    'Authorization': `Bearer ${TOKEN}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
};

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

async function fetchJsonWithRetry(url, maxRetries = 5) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const res = await fetch(url, { headers: HEADERS });
            if (res.ok) {
                return await res.json();
            }
            if (res.status === 404) {
                return null;
            }
            if (res.status === 429) {
                const waitTime = attempt * 2000;
                console.log(`\n⏳ Rate limit (429) on ${url}. Waiting ${waitTime / 1000}s (attempt ${attempt}/${maxRetries})...`);
                await sleep(waitTime);
                continue;
            }
            if (res.status === 401) {
                console.error('\n❌ Token expired (401). Please provide a new token.');
                return null;
            }
            console.warn(`\n⚠️ HTTP ${res.status} on ${url}, retrying in 1s...`);
            await sleep(1000);
        } catch (e) {
            console.error(`\n❌ Network error ${url}: ${e.message}, retrying in 1s...`);
            await sleep(1000);
        }
    }
    return null;
}

// 1. Crawl Yomimono (Đọc hiểu 148 bài)
async function crawlYomimono() {
    console.log('\n📚 [1/4] Crawling Yomimono (Đọc hiểu)...');
    const yomimonoDir = path.join(OUT_DIR, 'yomimono');
    if (!fs.existsSync(yomimonoDir)) fs.mkdirSync(yomimonoDir, { recursive: true });

    const structurePath = path.join(yomimonoDir, '_structure.json');
    if (!fs.existsSync(structurePath)) {
        const structure = await fetchJsonWithRetry('https://openjlpt.com/api/content/dojo/yomimono/structure');
        if (structure) {
            fs.writeFileSync(structurePath, JSON.stringify(structure, null, 2), 'utf-8');
            console.log(`Saved structure with ${structure.length} items.`);
        }
    }

    const allYomimono = [];
    for (let i = 1; i <= 150; i++) {
        const filePath = path.join(yomimonoDir, `${i}.json`);
        let data = null;

        if (fs.existsSync(filePath)) {
            try {
                data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) {}
        }

        if (!data) {
            data = await fetchJsonWithRetry(`https://openjlpt.com/api/content/dojo/yomimono/${i}`);
            if (data) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                process.stdout.write(`✅ Yomimono #${i} (${data.level || 'N?'}) `);
            }
            await sleep(250);
        } else {
            process.stdout.write(`[Cached #${i}] `);
        }

        if (data) allYomimono.push(data);
    }
    fs.writeFileSync(path.join(yomimonoDir, 'all_yomimono.json'), JSON.stringify(allYomimono, null, 2), 'utf-8');
    console.log(`\n🎉 Completed Yomimono: ${allYomimono.length} items saved.`);
}

// 2. Crawl JLPT Worksheets (N5 -> N1)
async function crawlJlptWorksheets() {
    console.log('\n🎯 [2/4] Crawling JLPT Worksheets (N5 -> N1)...');
    const jlptDir = path.join(OUT_DIR, 'jlpt_worksheets');
    if (!fs.existsSync(jlptDir)) fs.mkdirSync(jlptDir, { recursive: true });

    const allWorksheets = [];
    for (let i = 1; i <= 160; i++) {
        const filePath = path.join(jlptDir, `${i}.json`);
        let data = null;

        if (fs.existsSync(filePath)) {
            try {
                data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) {}
        }

        if (!data) {
            data = await fetchJsonWithRetry(`https://openjlpt.com/api/content/dojo/jlpt-worksheet/${i}`);
            if (data) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                const totalItems = (data.groups || []).reduce((acc, g) => acc + (g.sections || []).reduce((sAcc, s) => sAcc + (s.items || []).length, 0), 0);
                process.stdout.write(`✅ JLPT Worksheet #${i} [${data.level}] (~${totalItems}q) | `);
            }
            await sleep(250);
        } else {
            process.stdout.write(`[Cached #${i}] `);
        }

        if (data) allWorksheets.push(data);
    }
    fs.writeFileSync(path.join(jlptDir, 'all_jlpt_worksheets.json'), JSON.stringify(allWorksheets, null, 2), 'utf-8');
    console.log(`\n🎉 Completed JLPT Worksheets: ${allWorksheets.length} worksheets saved.`);
}

// 3. Crawl Minna Dojo Worksheets (Bài 1 -> 50)
async function crawlMinnaWorksheets() {
    console.log('\n📖 [3/4] Crawling Minna Dojo Worksheets (Bài 1 -> 50)...');
    const minnaDir = path.join(OUT_DIR, 'minna_worksheets');
    if (!fs.existsSync(minnaDir)) fs.mkdirSync(minnaDir, { recursive: true });

    const allMinna = [];
    for (let i = 1; i <= 60; i++) {
        const filePath = path.join(minnaDir, `${i}.json`);
        let data = null;

        if (fs.existsSync(filePath)) {
            try {
                data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) {}
        }

        if (!data) {
            data = await fetchJsonWithRetry(`https://openjlpt.com/api/content/dojo/worksheet/${i}`);
            if (data) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                process.stdout.write(`✅ Minna Worksheet #${i} | `);
            }
            await sleep(250);
        } else {
            process.stdout.write(`[Cached #${i}] `);
        }

        if (data) allMinna.push(data);
    }
    fs.writeFileSync(path.join(minnaDir, 'all_minna_worksheets.json'), JSON.stringify(allMinna, null, 2), 'utf-8');
    console.log(`\n🎉 Completed Minna Worksheets: ${allMinna.length} worksheets saved.`);
}

// 4. Crawl Drills (Bài 1 -> 60)
async function crawlDrills() {
    console.log('\n⚡ [4/4] Crawling Drills (Phản xạ ngữ pháp)...');
    const drillDir = path.join(OUT_DIR, 'drills');
    if (!fs.existsSync(drillDir)) fs.mkdirSync(drillDir, { recursive: true });

    const allDrills = [];
    for (let i = 1; i <= 60; i++) {
        const filePath = path.join(drillDir, `${i}.json`);
        let data = null;

        if (fs.existsSync(filePath)) {
            try {
                data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) {}
        }

        if (!data) {
            data = await fetchJsonWithRetry(`https://openjlpt.com/api/content/dojo/drill/${i}`);
            if (data) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                process.stdout.write(`✅ Drill #${i} | `);
            }
            await sleep(250);
        } else {
            process.stdout.write(`[Cached #${i}] `);
        }

        if (data) allDrills.push(data);
    }
    fs.writeFileSync(path.join(drillDir, 'all_drills.json'), JSON.stringify(allDrills, null, 2), 'utf-8');
    console.log(`\n🎉 Completed Drills: ${allDrills.length} drills saved.`);
}

async function main() {
    console.log('🚀 Starting Robust OpenJLPT Crawl...');
    const startTime = Date.now();

    await crawlYomimono();
    await crawlJlptWorksheets();
    await crawlMinnaWorksheets();
    await crawlDrills();

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n\n✨ ALL DATA DOWNLOADED & PERSISTED TO ${OUT_DIR} in ${elapsed}s!`);
}

main();
