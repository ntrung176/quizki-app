/**
 * Fetch all JLPT N5-N1 kanji data from Jotoba API
 * Step 1: Get kanji character lists from kanjiapi.dev (has JLPT endpoints)
 * Step 2: Fetch detailed data for each kanji from Jotoba API
 * Step 3: Save as src/data/jotobaKanjiData.js
 * 
 * Usage: node scripts/fetchJotobaKanji.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JOTOBA_URL = 'https://jotoba.de/api/search/kanji';
const KANJIAPI_URL = 'https://kanjiapi.dev/v1/kanji/jlpt-';
const OUTPUT_FILE = path.resolve(__dirname, '..', 'src', 'data', 'jotobaKanjiData.js');
const PROGRESS_FILE = path.resolve(__dirname, 'jotoba_progress.json');

const BATCH_SIZE = 5;       // concurrent requests
const DELAY_MS = 300;        // delay between batches
const RETRY_DELAY = 2000;    // retry delay on error

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Load progress if exists
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

// Fetch single kanji from Jotoba
async function fetchFromJotoba(char, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const r = await fetch(JOTOBA_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: char, language: 'English', no_english: false })
            });
            if (!r.ok) {
                if (attempt < retries) { await sleep(RETRY_DELAY); continue; }
                return null;
            }
            const d = await r.json();
            if (d.kanji && d.kanji.length > 0) {
                return d.kanji.find(k => k.literal === char) || d.kanji[0];
            }
            return null;
        } catch (e) {
            if (attempt < retries) { await sleep(RETRY_DELAY); continue; }
            return null;
        }
    }
    return null;
}

// Main
async function main() {
    console.log('🔍 Step 1: Fetching JLPT kanji lists from kanjiapi.dev...\n');

    const allChars = {};
    for (const level of [5, 4, 3, 2, 1]) {
        try {
            const r = await fetch(KANJIAPI_URL + level);
            const chars = await r.json();
            console.log(`  N${level}: ${chars.length} kanji`);
            for (const c of chars) {
                allChars[c] = `N${level}`;
            }
        } catch (e) {
            console.error(`  ✗ Error fetching N${level}:`, e.message);
        }
        await sleep(200);
    }

    const totalKanji = Object.keys(allChars).length;
    console.log(`\n📊 Total unique kanji: ${totalKanji}\n`);

    // Load existing progress
    const progress = loadProgress();
    const alreadyFetched = Object.keys(progress).length;
    if (alreadyFetched > 0) {
        console.log(`📂 Resuming: ${alreadyFetched} already fetched\n`);
    }

    // Step 2: Fetch from Jotoba in batches
    console.log('🔍 Step 2: Fetching detailed data from Jotoba API...\n');

    const chars = Object.entries(allChars);
    let done = alreadyFetched;
    let errors = 0;

    for (let i = 0; i < chars.length; i += BATCH_SIZE) {
        const batch = chars.slice(i, i + BATCH_SIZE);
        const toFetch = batch.filter(([c]) => !progress[c]);

        if (toFetch.length === 0) continue;

        const results = await Promise.all(
            toFetch.map(async ([char, level]) => {
                const data = await fetchFromJotoba(char);
                if (data) {
                    return {
                        literal: data.literal,
                        meanings: data.meanings || [],
                        grade: data.grade || null,
                        stroke_count: data.stroke_count || null,
                        frequency: data.frequency || null,
                        jlpt: data.jlpt || null,
                        onyomi: data.onyomi || [],
                        kunyomi: data.kunyomi || [],
                        parts: data.parts || [],
                        radical: data.radical || null,
                        level: level,
                    };
                } else {
                    errors++;
                    return {
                        literal: char,
                        meanings: [],
                        grade: null,
                        stroke_count: null,
                        frequency: null,
                        jlpt: null,
                        onyomi: [],
                        kunyomi: [],
                        parts: [],
                        radical: null,
                        level: level,
                    };
                }
            })
        );

        for (const r of results) {
            progress[r.literal] = r;
        }
        done += toFetch.length;

        // Progress bar
        const pct = Math.round((done / totalKanji) * 100);
        const bar = '█'.repeat(Math.floor(pct / 2)) + '░'.repeat(50 - Math.floor(pct / 2));
        process.stdout.write(`\r  [${bar}] ${pct}% (${done}/${totalKanji}) errors:${errors}`);

        // Save progress every 50 kanji
        if (done % 50 < BATCH_SIZE) {
            saveProgress(progress);
        }

        await sleep(DELAY_MS);
    }

    // Final save
    saveProgress(progress);
    console.log('\n\n✅ Step 2 complete!\n');

    // Step 3: Generate output file
    console.log('📝 Step 3: Generating output file...\n');
    generateOutputFile(progress);

    // Stats
    const byLevel = {};
    for (const k of Object.values(progress)) {
        const lvl = k.level || 'Unknown';
        byLevel[lvl] = (byLevel[lvl] || 0) + 1;
    }
    console.log(`✅ Generated: ${OUTPUT_FILE}`);
    console.log(`   Total: ${Object.keys(progress).length} kanji`);
    console.log('   By level:', JSON.stringify(byLevel));
    console.log(`   Errors: ${errors}`);
}

function generateOutputFile(data) {
    const entries = Object.values(data);
    // Sort by JLPT level (N5 first) then by frequency
    entries.sort((a, b) => {
        const la = parseInt((a.level || 'N9').replace('N', ''));
        const lb = parseInt((b.level || 'N9').replace('N', ''));
        if (lb !== la) return lb - la; // N5(5) > N4(4) > ...
        return (a.frequency || 9999) - (b.frequency || 9999);
    });

    const esc = (s) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");

    const lines = [
        '// Auto-generated from Jotoba API + kanjiapi.dev',
        `// Generated: ${new Date().toISOString()}`,
        `// Total: ${entries.length} kanji (N5:${entries.filter(e => e.level === 'N5').length} N4:${entries.filter(e => e.level === 'N4').length} N3:${entries.filter(e => e.level === 'N3').length} N2:${entries.filter(e => e.level === 'N2').length} N1:${entries.filter(e => e.level === 'N1').length})`,
        '',
        'export const JOTOBA_KANJI_DATA = {',
    ];

    for (const k of entries) {
        lines.push(`  '${k.literal}': { literal: '${k.literal}', meanings: [${k.meanings.map(m => `'${esc(m)}'`).join(',')}], grade: ${k.grade ?? 'null'}, stroke_count: ${k.stroke_count ?? 'null'}, frequency: ${k.frequency ?? 'null'}, jlpt: ${k.jlpt ?? 'null'}, onyomi: [${k.onyomi.map(o => `'${esc(o)}'`).join(',')}], kunyomi: [${k.kunyomi.map(o => `'${esc(o)}'`).join(',')}], parts: [${k.parts.map(p => `'${esc(p)}'`).join(',')}], radical: ${k.radical ? `'${esc(k.radical)}'` : 'null'}, level: '${k.level}' },`);
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
}

main().catch(console.error);
