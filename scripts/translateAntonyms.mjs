import fs from 'node:fs';
import path from 'node:path';
import { translate } from 'bing-translate-api';

const baseDir = 'd:\\CODE GAME\\quizki-app-main\\scratch\\extracted\\jitendex';
const CACHE_FILE = 'scratch/antonym_translations_en_vi.json';
const GLOSS_CACHE_FILE = 'scratch/gloss_translations_en_vi.json';
const BATCH_SIZE = 25;
const CONCURRENCY = 3;
const SEPARATOR = '\n=====\n';
const sleep = ms => new Promise(r => setTimeout(r, ms));

function extractText(node) {
    if (!node) return '';
    if (typeof node === 'string') return node;
    if (Array.isArray(node)) return node.map(extractText).join('');
    if (typeof node === 'object' && node.content) return extractText(node.content);
    return '';
}

console.log('=== Step 1: Extracting all antonym glosses from Jitendex ===');
const files = fs.readdirSync(baseDir).filter(f => f.startsWith('term_bank_'));
const antonyms = new Set();

for (const f of files) {
    const data = JSON.parse(fs.readFileSync(path.join(baseDir, f), 'utf8'));
    for (const item of data) {
        const contentArray = item[5];
        if (!Array.isArray(contentArray)) continue;
        function walk(node) {
            if (!node || typeof node !== 'object') return;
            if (node.data?.content === 'antonym') {
                if (Array.isArray(node.content)) {
                    for (const sub of node.content) {
                        if (sub.data?.content === 'antonym-glossary') {
                            const m = extractText(sub).trim();
                            if (m) antonyms.add(m);
                        }
                    }
                }
            }
            if (Array.isArray(node.content)) {
                for (const child of node.content) walk(child);
            } else if (node.content && typeof node.content === 'object') {
                walk(node.content);
            }
        }
        for (const c of contentArray) walk(c);
    }
}

console.log(`Found ${antonyms.size} unique antonym glosses.`);

// Load existing cache
let translations = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        translations = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch {
        translations = {};
    }
}

// Also check existing gloss cache
let glossCache = {};
if (fs.existsSync(GLOSS_CACHE_FILE)) {
    try {
        glossCache = JSON.parse(fs.readFileSync(GLOSS_CACHE_FILE, 'utf8'));
    } catch {}
}

for (const a of antonyms) {
    if (!translations[a]) {
        if (glossCache[a]) {
            translations[a] = glossCache[a];
        } else {
            const clean = a.replace(/^[①-⑳\d\.\s]+/, '').trim();
            if (glossCache[clean]) {
                translations[a] = glossCache[clean];
            }
        }
    }
}

const pending = Array.from(antonyms).filter(a => !translations[a]);
console.log(`Already translated: ${Object.keys(translations).length}. Pending: ${pending.length}`);

// Split pending into batches
const batches = [];
for (let i = 0; i < pending.length; i += BATCH_SIZE) {
    batches.push(pending.slice(i, i + BATCH_SIZE));
}

async function translateWithBing(text, retryCount = 0) {
    try {
        const res = await translate(text, 'en', 'vi');
        return res?.translation || '';
    } catch (err) {
        if (retryCount < 3) {
            await sleep(1500 * (retryCount + 1));
            return translateWithBing(text, retryCount + 1);
        }
        return '';
    }
}

let completedBatches = 0;
let nextBatchIdx = 0;

async function worker() {
    while (true) {
        const idx = nextBatchIdx++;
        if (idx >= batches.length) break;

        const batch = batches[idx];
        const combined = batch.join(SEPARATOR);

        let translatedCombined = '';
        if (combined.length > 900) {
            // Translate individually if too long
            for (const item of batch) {
                const res = await translateWithBing(item);
                if (res) translations[item] = res.trim();
                await sleep(100);
            }
        } else {
            translatedCombined = await translateWithBing(combined);
            if (translatedCombined) {
                const parts = translatedCombined.split(/=====+/).map(p => p.trim());
                if (parts.length === batch.length) {
                    for (let j = 0; j < batch.length; j++) {
                        translations[batch[j]] = parts[j];
                    }
                } else {
                    for (const item of batch) {
                        const res = await translateWithBing(item);
                        if (res) translations[item] = res.trim();
                        await sleep(100);
                    }
                }
            }
        }

        completedBatches++;
        if (completedBatches % 5 === 0 || completedBatches === batches.length) {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(translations, null, 2));
            console.log(`Progress: ${completedBatches}/${batches.length} batches (${((completedBatches/batches.length)*100).toFixed(1)}%) | Cached: ${Object.keys(translations).length}`);
        }
        await sleep(150);
    }
}

const workers = Array.from({ length: CONCURRENCY }, () => worker());
await Promise.all(workers);

fs.writeFileSync(CACHE_FILE, JSON.stringify(translations, null, 2));
console.log(`=== Done! All ${Object.keys(translations).length} antonyms translated! ===`);
