/**
 * Translate kanji meanings from English to Vietnamese using Google Translate
 * Also cleans up readings (remove dots), removes grade/radical fields
 * 
 * Usage: node scripts/translateKanjiMeanings.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INPUT_FILE = path.resolve(__dirname, '..', 'src', 'data', 'jotobaKanjiData.js');
const OUTPUT_FILE = INPUT_FILE; // Overwrite
const PROGRESS_FILE = path.resolve(__dirname, 'translate_progress.json');

const BATCH_SIZE = 10; // kanji per translation batch
const DELAY_MS = 500;

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Load progress
function loadProgress() {
    if (fs.existsSync(PROGRESS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        } catch (e) { }
    }
    return {};
}

function saveProgress(data) {
    fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data), 'utf-8');
}

// Translate text via Google Translate (unofficial API)
async function translateToVietnamese(englishText, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=${encodeURIComponent(englishText)}`;
            const r = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            });
            if (!r.ok) {
                if (attempt < retries) { await sleep(2000); continue; }
                return null;
            }
            const data = await r.json();
            // data[0] is array of [translatedText, originalText, ...]
            if (data && data[0]) {
                return data[0].map(segment => segment[0]).join('');
            }
            return null;
        } catch (e) {
            if (attempt < retries) { await sleep(2000); continue; }
            return null;
        }
    }
    return null;
}

// Clean reading: remove dots (ひと.つ → ひとつ)
function cleanReading(reading) {
    return reading.replace(/\./g, '');
}

async function main() {
    console.log('📖 Loading kanji data...\n');

    // Dynamically import the data
    const module = await import(`file://${INPUT_FILE}`);
    const data = { ...module.JOTOBA_KANJI_DATA };
    const entries = Object.values(data);
    console.log(`  Total: ${entries.length} kanji\n`);

    // Load progress
    const progress = loadProgress();
    const alreadyDone = Object.keys(progress).length;
    if (alreadyDone > 0) {
        console.log(`📂 Resuming: ${alreadyDone} already translated\n`);
    }

    console.log('🔄 Translating meanings to Vietnamese...\n');

    let done = alreadyDone;
    let errors = 0;

    // Process in batches - translate multiple kanji meanings at once
    for (let i = 0; i < entries.length; i += BATCH_SIZE) {
        const batch = entries.slice(i, i + BATCH_SIZE);
        const toTranslate = batch.filter(k => !progress[k.literal]);

        if (toTranslate.length === 0) continue;

        // Combine meanings for batch translation (separated by |)
        const combinedText = toTranslate.map(k =>
            (k.meanings || []).join(', ')
        ).join(' | ');

        const translated = await translateToVietnamese(combinedText);


        if (translated) {
            const parts = translated.split(' | ');
            toTranslate.forEach((k, idx) => {
                const viMeaning = parts[idx]?.trim() || '';
                progress[k.literal] = viMeaning;
            });
        } else {
            errors++;
            toTranslate.forEach(k => {
                progress[k.literal] = ''; // Empty, admin can fill
            });
        }

        done += toTranslate.length;
        const pct = Math.round((done / entries.length) * 100);
        const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2));
        process.stdout.write(`\r  [${bar}] ${pct}% (${done}/${entries.length}) errors:${errors}`);

        // Save progress every 100
        if (done % 100 < BATCH_SIZE) {
            saveProgress(progress);
        }

        await sleep(DELAY_MS);
    }

    saveProgress(progress);
    console.log('\n\n✅ Translation complete!\n');

    // Step 2: Generate cleaned output
    console.log('📝 Generating cleaned data file...\n');

    const esc = (s) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const lines = [
        '// Auto-generated from Jotoba API + kanjiapi.dev',
        `// Generated: ${new Date().toISOString()}`,
        `// Total: ${entries.length} kanji (N5:${entries.filter(e => e.level === 'N5').length} N4:${entries.filter(e => e.level === 'N4').length} N3:${entries.filter(e => e.level === 'N3').length} N2:${entries.filter(e => e.level === 'N2').length} N1:${entries.filter(e => e.level === 'N1').length})`,
        '// Meanings translated to Vietnamese',
        '',
        'export const JOTOBA_KANJI_DATA = {',
    ];

    // Sort: N5 first by frequency
    const sorted = [...entries];
    sorted.sort((a, b) => {
        const la = parseInt((a.level || 'N9').replace('N', ''));
        const lb = parseInt((b.level || 'N9').replace('N', ''));
        if (lb !== la) return lb - la;
        return (a.frequency || 9999) - (b.frequency || 9999);
    });

    for (const k of sorted) {
        const meaningVi = progress[k.literal] || '';
        const onyomiClean = (k.onyomi || []).map(cleanReading);
        const kunyomiClean = (k.kunyomi || []).map(cleanReading);

        lines.push(`  '${k.literal}': { literal: '${k.literal}', meaningVi: '${esc(meaningVi)}', meanings: [${k.meanings.map(m => `'${esc(m)}'`).join(',')}], stroke_count: ${k.stroke_count ?? 'null'}, frequency: ${k.frequency ?? 'null'}, jlpt: ${k.jlpt ?? 'null'}, onyomi: [${onyomiClean.map(o => `'${esc(o)}'`).join(',')}], kunyomi: [${kunyomiClean.map(o => `'${esc(o)}'`).join(',')}], parts: [${k.parts.map(p => `'${esc(p)}'`).join(',')}], level: '${k.level}' },`);
    }

    lines.push('};');
    lines.push('');
    lines.push('// Get all kanji for a specific JLPT level');
    lines.push("export const getJotobaKanjiByLevel = (level) => Object.values(JOTOBA_KANJI_DATA).filter(k => k.level === level);");
    lines.push('');
    lines.push('// Get kanji data for a specific character');
    lines.push('export const getJotobaKanjiData = (char) => JOTOBA_KANJI_DATA[char] || null;');
    lines.push('');
    lines.push('// Get all kanji characters for a level (just the characters)');
    lines.push("export const getJotobaKanjiChars = (level) => Object.values(JOTOBA_KANJI_DATA).filter(k => k.level === level).map(k => k.literal);");
    lines.push('');

    fs.writeFileSync(OUTPUT_FILE, lines.join('\n'), 'utf-8');
    console.log(`✅ Generated: ${OUTPUT_FILE}`);
    console.log(`   Total: ${sorted.length} kanji with Vietnamese meanings`);
}

main().catch(console.error);
