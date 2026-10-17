import fs from 'node:fs';
import path from 'node:path';
import { translate } from 'bing-translate-api';

const CACHE_FILE = 'scratch/sentence_translations_en_vi.json';
const DICT_DIR = 'public/dictionary';
const BATCH_SIZE = 25;
const CONCURRENCY = 3;
const WORKER_DELAY_MS = 250;
const SEPARATOR = '\n=====\n';

// 1. Gather all unique English sentences from existing chunks
console.log('=== Step 1: Gathering unique English sentences ===');
const uniqueSentences = new Set();
for (let i = 1; i <= 8; i++) {
    const chunkPath = path.join(DICT_DIR, `chunk_${i}.json`);
    if (!fs.existsSync(chunkPath)) continue;
    const data = JSON.parse(fs.readFileSync(chunkPath, 'utf8'));
    for (const item of data) {
        if (item.ex?.en && typeof item.ex.en === 'string') {
            const clean = item.ex.en.trim();
            if (clean) uniqueSentences.add(clean);
        }
    }
}

const allSentences = Array.from(uniqueSentences);
console.log(`Found ${allSentences.length} total unique English sentences.`);

// 2. Load existing cache
let translations = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        translations = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        console.log(`Loaded ${Object.keys(translations).length} already translated sentences from cache.`);
    } catch {
        translations = {};
    }
}

// 3. Filter sentences that still need translation
const pendingSentences = allSentences.filter(s => !translations[s]);
console.log(`Remaining sentences to translate: ${pendingSentences.length}`);

// Split pending into batches
const batches = [];
for (let i = 0; i < pendingSentences.length; i += BATCH_SIZE) {
    batches.push(pendingSentences.slice(i, i + BATCH_SIZE));
}
console.log(`Prepared ${batches.length} batches of ~${BATCH_SIZE} sentences with ${CONCURRENCY} concurrent workers.`);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Helper: translate text with retry
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
            await sleep(60);
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
let translatedSentencesCount = 0;
const totalToTranslate = pendingSentences.length;
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
        translatedSentencesCount += currentBatch.length;

        // Save periodically every ~4 seconds or on completion
        if (Date.now() - lastSaveTime > 4000 || nextBatchIdx >= batches.length) {
            lastSaveTime = Date.now();
            fs.writeFileSync(CACHE_FILE, JSON.stringify(translations, null, 2));
            const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
            const percent = ((translatedSentencesCount / totalToTranslate) * 100).toFixed(1);
            const rate = ((translatedSentencesCount / (Date.now() - startTime)) * 1000).toFixed(1);
            const remainingSec = Math.round((totalToTranslate - translatedSentencesCount) / parseFloat(rate || 1));
            console.log(`[Progress] ${completedBatches}/${batches.length} batches (${percent}%) | Total cached: ${Object.keys(translations).length} | ~${rate} sent/s | ~${remainingSec}s left`);
        }

        await sleep(WORKER_DELAY_MS);
    }
}

async function run() {
    if (pendingSentences.length === 0) {
        console.log('All sentences are already translated!');
        return;
    }

    console.log(`Starting ${CONCURRENCY} workers...`);
    const workers = Array.from({ length: CONCURRENCY }, (_, i) => worker(i + 1));
    await Promise.all(workers);

    // Final save
    fs.writeFileSync(CACHE_FILE, JSON.stringify(translations, null, 2));
    const totalSec = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== All Done in ${totalSec}s! Total translations in cache: ${Object.keys(translations).length} ===`);
}

run();
