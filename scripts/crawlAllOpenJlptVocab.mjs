import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TOKEN = 'eyJhbGciOiJIUzUxMiJ9.eyJzdWIiOiJseW5ndXllbm5oYXR0cnVuZzE3MCIsImlhdCI6MTc5MTAwOTUxOCwiZXhwIjoxNzkxMDEwNDE4LCJ0eXBlIjoiYWNjZXNzIiwianRpIjoiMDcyMGMyNTUtYzIwYi00MzcxLWFiNGMtODllMmZiOTgyZmQ2In0.OnUyMTEYwYEFvx0ztCtX3tETVyJcgxtjurmz8SQJ70LiS1w6pjUAfHHgGHcPjVDwHynKVsar6eVAXEdON1ZkTQ';

const HEADERS = {
    'Authorization': `Bearer ${TOKEN}`,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*'
};

const OUT_DIR = path.resolve(__dirname, '../data/openjlpt/vocabulary');
if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// 1. Crawl all API Sets (excluding Mimikara N3, N2, N1)
async function crawlApiSets() {
    console.log('\n======================================================');
    console.log('📦 [1/2] Crawling OpenJLPT Sets (/api/sets/:id)...');
    console.log('======================================================');

    const setsMetaPath = path.resolve(__dirname, 'openjlpt_all_sets_meta.json');
    if (!fs.existsSync(setsMetaPath)) {
        console.error('Missing openjlpt_all_sets_meta.json');
        return [];
    }

    const allSets = JSON.parse(fs.readFileSync(setsMetaPath, 'utf-8'));
    const setsDir = path.join(OUT_DIR, 'sets');
    if (!fs.existsSync(setsDir)) fs.mkdirSync(setsDir, { recursive: true });

    // Filter out Mimikara Oboeru
    const targetSets = allSets.filter(s => {
        const title = s.title || '';
        const isMimikara = title.toLowerCase().includes('mimikara') || 
                           /N[1-3]\s+Unit/i.test(title) ||
                           /^Unit\s+\d+/i.test(title);
        return !isMimikara;
    });

    console.log(`Total sets to crawl: ${targetSets.length} (excluded ${allSets.length - targetSets.length} Mimikara sets)`);

    const crawledSets = [];
    let successCount = 0;
    let forbiddenCount = 0;
    let errorCount = 0;

    for (let i = 0; i < targetSets.length; i++) {
        const s = targetSets[i];
        const filePath = path.join(setsDir, `${s.id}.json`);

        let data = null;
        if (fs.existsSync(filePath)) {
            try {
                data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) {}
        }

        if (!data) {
            try {
                const res = await fetch(`https://openjlpt.com/api/sets/${s.id}`, { headers: HEADERS });
                if (res.ok) {
                    data = await res.json();
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                    successCount++;
                    process.stdout.write(`\r[${i + 1}/${targetSets.length}] ✅ Set ${s.id}: "${s.title?.slice(0, 30)}" (${data.cards?.length || 0} cards)`);
                } else if (res.status === 403) {
                    forbiddenCount++;
                    // Pro required for this set
                } else {
                    errorCount++;
                }
                await sleep(150);
            } catch (e) {
                errorCount++;
            }
        } else {
            successCount++;
        }

        if (data) crawledSets.push(data);
    }

    console.log(`\n\n🎉 Finished Sets crawl: ${crawledSets.length} sets available (${forbiddenCount} Pro required).`);
    return crawledSets;
}

// 2. Crawl CloudFront Static Vocabulary Books
async function crawlStaticBooks() {
    console.log('\n======================================================');
    console.log('📚 [2/2] Crawling CloudFront Vocabulary Books...');
    console.log('======================================================');

    const staticKeysPath = path.resolve(__dirname, 'openjlpt_static_keys.json');
    if (!fs.existsSync(staticKeysPath)) {
        console.error('Missing openjlpt_static_keys.json');
        return [];
    }

    const staticKeys = JSON.parse(fs.readFileSync(staticKeysPath, 'utf-8'));
    const booksDir = path.join(OUT_DIR, 'books');
    if (!fs.existsSync(booksDir)) fs.mkdirSync(booksDir, { recursive: true });

    const goiKeys = Object.keys(staticKeys).filter(k => {
        const lower = k.toLowerCase();
        // Exclude mimikara
        if (lower.includes('mimikara')) return false;
        return lower.includes('goi') || lower.includes('tango') || lower.includes('mojigoi') || lower.includes('minna');
    });

    console.log(`Found ${goiKeys.length} vocabulary book datasets in CloudFront.`);

    const crawledBooks = [];
    for (const k of goiKeys) {
        const hash = staticKeys[k];
        const safeName = k.replace(/\//g, '__');
        const filePath = path.join(booksDir, `${safeName}`);

        let data = null;
        if (fs.existsSync(filePath)) {
            try {
                data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            } catch (e) {}
        }

        if (!data) {
            try {
                const url = `https://d1yuzhlfxjxgbk.cloudfront.net/openjlpt-assets/content-v1/objects/${hash}.json`;
                const res = await fetch(url);
                if (res.ok) {
                    const json = await res.json();
                    data = json.value || json;
                    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
                    console.log(`✅ Fetched: ${k} (${Buffer.byteLength(JSON.stringify(data))} bytes)`);
                } else {
                    console.warn(`⚠️ Failed ${k}: ${res.status}`);
                }
                await sleep(100);
            } catch (e) {
                console.error(`Error on ${k}:`, e.message);
            }
        } else {
            console.log(`[Cached] ${k}`);
        }

        if (data) crawledBooks.push({ key: k, data });
    }

    console.log(`\n🎉 Finished CloudFront books crawl: ${crawledBooks.length} books downloaded.`);
    return crawledBooks;
}

async function main() {
    console.log('🚀 Starting OpenJLPT Vocabulary Crawler...');
    const apiSets = await crawlApiSets();
    const staticBooks = await crawlStaticBooks();

    console.log('\n======================================================');
    console.log('📊 Summary of Crawled OpenJLPT Vocabulary:');
    console.log(`- API Sets: ${apiSets.length} sets`);
    console.log(`- Static Books: ${staticBooks.length} books`);
    console.log('======================================================');
}

main().catch(console.error);
