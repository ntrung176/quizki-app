import fs from 'node:fs';
import path from 'node:path';
import { translate } from 'bing-translate-api';

const CACHE_FILE = 'scratch/gloss_translations_en_vi.json';
const DICT_DIR = 'public/dictionary';
const BATCH_SIZE = 35;
const CONCURRENCY = 4;
const WORKER_DELAY_MS = 200;
const SEPARATOR = '\n=====\n';
const vnRegex = /[àáảãạăắằẳẵặâấầẩẫậđèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵ]/i;

// 1. Gather all unique English definitions with popularity weighting
console.log('=== Step 1: Gathering and prioritizing English-only definitions ===');
const glossWeights = new Map();

for (let i = 1; i <= 8; i++) {
    const chunkPath = path.join(DICT_DIR, `chunk_${i}.json`);
    if (!fs.existsSync(chunkPath)) continue;
    const data = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));

    for (const item of data) {
        if (!item.m || !Array.isArray(item.m) || item.m.length === 0) continue;

        // Only process entries where NO meaning contains Vietnamese diacritics
        const hasAnyVietnamese = item.m.some(m => vnRegex.test(m));
        if (hasAnyVietnamese) continue;

        let weight = 1;
        if (item.j) weight += 10000;
        if (item.ex) weight += 5000;
        if (item.f) weight += Math.max(1, 100000 - item.f);

        for (const m of item.m) {
            const clean = m.trim();
            if (clean && /[a-zA-Z]{2,}/.test(clean)) {
                glossWeights.set(clean, (glossWeights.get(clean) || 0) + weight);
            }
        }
    }
}

// Sort glosses by weight descending (most popular words first!)
const allGlosses = Array.from(glossWeights.keys()).sort((a, b) => glossWeights.get(b) - glossWeights.get(a));
console.log(`Found ${allGlosses.length} total unique English-only definitions.`);
console.log(`Top prioritized glosses:`, allGlosses.slice(0, 10));

// 2. Load existing cache (only keep true English keys)
let translations = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        const raw = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        const glossSet = new Set(allGlosses);
        for (const [k, v] of Object.entries(raw)) {
            if (glossSet.has(k)) translations[k] = v;
        }
        console.log(`Loaded ${Object.keys(translations).length} valid translated glosses from cache.`);
    } catch {
        translations = {};
    }
}

// 3. Filter pending
const pendingGlosses = allGlosses.filter(g => !translations[g]);
console.log(`Remaining glosses to translate: ${pendingGlosses.length}`);

// Split pending into batches
const batches = [];
for (let i = 0; i < pendingGlosses.length; i += BATCH_SIZE) {
    batches.push(pendingGlosses.slice(i, i + BATCH_SIZE));
}
console.log(`Prepared ${batches.length} batches of ~${BATCH_SIZE} glosses with ${CONCURRENCY} concurrent workers.`);

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function translateWithBing(text, retryCount = 0) {
    try {
        const res = await translate(text, 'en', 'vi');
        return res?.translation || '';
    } catch (err) {
        if (retryCount < 3) {
            const waitTime = (retryCount + 1) * 2000;
            console.warn(`  [Warning] Bing error (${err.message}). Retrying in ${waitTime}ms...`);
            await sleep(waitTime);
            return translateWithBing(text, retryCount + 1);
        }
        throw err;
    }
}

async function translateBatch(batch) {
    const joined = batch.join(SEPARATOR);
    try {
        const fullTranslated = await translateWithBing(joined);
        const parts = fullTranslated.split(/\s*=====\s*/).map(s => s.trim());

        if (parts.length === batch.length) {
            return parts;
        }

        // Mismatch: fallback 1-by-1
        const indResults = [];
        for (const item of batch) {
            try {
                const single = await translateWithBing(item);
                indResults.push(single.trim());
            } catch {
                indResults.push(item);
            }
            await sleep(50);
        }
        return indResults;
    } catch (err) {
        console.error(`  [Error] Batch failed after retries: ${err.message}.`);
        return batch;
    }
}

// 4. Multi-worker execution
let nextBatchIdx = 0;
let completedBatches = 0;
let translatedGlossesCount = 0;
const totalToTranslate = pendingGlosses.length;
const startTime = Date.now();
let lastSaveTime = Date.now();

async function worker(id) {
    while (true) {
        let currentIdx;
        if (nextBatchIdx >= batches.length) break;
        currentIdx = nextBatchIdx++;

        const currentBatch = batches[currentIdx];
        const results = await translateBatch(currentBatch);

        for (let j = 0; j < currentBatch.length; j++) {
            translations[currentBatch[j]] = results[j] || currentBatch[j];
        }

        completedBatches++;
        translatedGlossesCount += currentBatch.length;

        // Save periodically every ~4 seconds or on completion
        if (Date.now() - lastSaveTime > 4000 || nextBatchIdx >= batches.length) {
            lastSaveTime = Date.now();
            fs.writeFileSync(CACHE_FILE, JSON.stringify(translations, null, 2));
            const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
            const percent = ((translatedGlossesCount / totalToTranslate) * 100).toFixed(1);
            const rate = ((translatedGlossesCount / (Date.now() - startTime)) * 1000).toFixed(1);
            const remainingSec = Math.round((totalToTranslate - translatedGlossesCount) / parseFloat(rate || 1));
            console.log(`[Progress] ${completedBatches}/${batches.length} batches (${percent}%) | Total cached: ${Object.keys(translations).length} | ~${rate} gloss/s | ~${remainingSec}s left`);
        }

        await sleep(WORKER_DELAY_MS);
    }
}

async function run() {
    if (pendingGlosses.length === 0) {
        console.log('All glosses are already translated!');
        return;
    }

    console.log(`Starting ${CONCURRENCY} workers...`);
    const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
    await Promise.all(workers);

    // Final save
    fs.writeFileSync(CACHE_FILE, JSON.stringify(translations, null, 2));
    const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== All Done in ${totalSec}s! Total gloss translations in cache: ${Object.keys(translations).length} ===`);
}

run();
