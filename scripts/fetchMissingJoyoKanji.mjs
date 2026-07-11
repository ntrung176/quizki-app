/**
 * Fetch and translate all missing Jōyō Kanji (including 2010 additions like 呪)
 * 
 * Step 1: Get list of Jōyō kanji from kanjiapi.dev
 * Step 2: Compare with local jotobaKanjiData.js and find missing ones
 * Step 3: Fetch details from Jotoba API
 * Step 4: Translate meanings to Vietnamese (Google Translate)
 * Step 5: Get Sino-Vietnamese (Hán Việt) from Mazii API
 * Step 6: Write back to jotobaKanjiData.js, sorted by JLPT and frequency.
 * 
 * Usage: node scripts/fetchMissingJoyoKanji.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JOTOBA_URL = 'https://jotoba.de/api/search/kanji';
const DATA_FILE = path.resolve(__dirname, '..', 'src', 'data', 'jotobaKanjiData.js');

const BATCH_SIZE = 5;       // concurrent requests
const DELAY_MS = 500;        // delay between batches
const RETRY_DELAY = 2000;    // retry delay on error

async function sleep(ms) {
    return new Promise(r => setTimeout(r, ms));
}

// Clean reading: remove dots (ひと.つ → ひとつ)
function cleanReading(reading) {
    return (reading || '').replace(/\./g, '');
}

// Translate English to Vietnamese using Google Translate
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
                if (attempt < retries) { await sleep(RETRY_DELAY); continue; }
                return null;
            }
            const data = await r.json();
            if (data && data[0]) {
                return data[0].map(segment => segment[0]).join('');
            }
            return null;
        } catch (e) {
            if (attempt < retries) { await sleep(RETRY_DELAY); continue; }
            return null;
        }
    }
    return null;
}

// Fetch Sino-Vietnamese (Hán Việt) from Mazii API
async function fetchHanViet(kanji, retries = 2) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            const r = await fetch('https://mazii.net/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ dict: 'javi', type: 'kanji', query: kanji, page: 1 })
            });
            if (!r.ok) {
                if (attempt < retries) { await sleep(RETRY_DELAY); continue; }
                return '';
            }
            const d = await r.json();
            const result = d.results?.[0];
            if (result && result.mean) {
                return result.mean.trim();
            }
            return '';
        } catch (e) {
            if (attempt < retries) { await sleep(RETRY_DELAY); continue; }
            return '';
        }
    }
    return '';
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

async function main() {
    console.log('📖 Loading current kanji data...');
    const module = await import(`file://${DATA_FILE}`);
    const localData = { ...module.JOTOBA_KANJI_DATA };
    const localKeys = new Set(Object.keys(localData));
    console.log(`  Local data has ${localKeys.size} kanji.`);

    console.log('\n🔍 Fetching Jōyō kanji list from kanjiapi.dev...');
    const joyoResponse = await fetch('https://kanjiapi.dev/v1/kanji/joyo');
    if (!joyoResponse.ok) {
        throw new Error('Failed to fetch Jōyō kanji list from kanjiapi.dev');
    }
    const joyoList = await joyoResponse.json();
    console.log(`  Jōyō list has ${joyoList.length} kanji.`);

    const missing = joyoList.filter(k => !localKeys.has(k));
    console.log(`  Found ${missing.length} missing kanji.`);

    if (missing.length === 0) {
        console.log('✅ No missing Jōyō kanji found!');
        return;
    }

    console.log('\n🚀 Starting to fetch detailed data for missing kanji...');
    const newEntries = {};

    for (let i = 0; i < missing.length; i += BATCH_SIZE) {
        const batch = missing.slice(i, i + BATCH_SIZE);
        console.log(`\n📦 Processing batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(missing.length / BATCH_SIZE)}: ${batch.join(', ')}`);

        const results = await Promise.all(batch.map(async (char) => {
            console.log(`  Fetching ${char}...`);
            const jData = await fetchFromJotoba(char);
            if (!jData) {
                console.error(`  ✗ Error fetching ${char} from Jotoba`);
                return null;
            }

            // Translate meanings to Vietnamese
            const englishMeanings = jData.meanings || [];
            const englishText = englishMeanings.join(', ');
            let meaningVi = '';
            if (englishText) {
                meaningVi = await translateToVietnamese(englishText);
            }
            if (!meaningVi) {
                meaningVi = englishText; // fallback to English
            }

            // Fetch Sino-Vietnamese reading
            const sinoViet = await fetchHanViet(char);

            // Determine level (default to N1 if not classified by Jotoba/KanjiAPI)
            let level = 'N1';
            if (jData.jlpt) {
                level = `N${jData.jlpt}`;
            }

            return {
                literal: char,
                meaningVi: meaningVi,
                sinoViet: sinoViet,
                meanings: englishMeanings,
                stroke_count: jData.stroke_count || null,
                frequency: jData.frequency || null,
                jlpt: jData.jlpt || null,
                onyomi: (jData.onyomi || []).map(cleanReading),
                kunyomi: (jData.kunyomi || []).map(cleanReading),
                parts: jData.parts || [],
                level: level
            };
        }));

        for (const r of results) {
            if (r) {
                newEntries[r.literal] = r;
            }
        }

        await sleep(DELAY_MS);
    }

    console.log(`\n✅ Finished fetching. Successfully processed ${Object.keys(newEntries).length}/${missing.length} missing kanji.`);

    // Merge old and new
    const mergedData = { ...localData, ...newEntries };
    const mergedEntries = Object.values(mergedData);

    // Sort by level N5 -> N1, then by frequency
    mergedEntries.sort((a, b) => {
        const la = parseInt((a.level || 'N9').replace('N', ''));
        const lb = parseInt((b.level || 'N9').replace('N', ''));
        if (lb !== la) return lb - la; // N5 (5) > N4 (4) ...
        return (a.frequency || 9999) - (b.frequency || 9999);
    });

    // Write back to file
    const esc = (s) => (s || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    const lines = [
        '// Auto-generated from Jotoba API + kanjiapi.dev',
        `// Generated: ${new Date().toISOString()}`,
        `// Total: ${mergedEntries.length} kanji (N5:${mergedEntries.filter(e => e.level === 'N5').length} N4:${mergedEntries.filter(e => e.level === 'N4').length} N3:${mergedEntries.filter(e => e.level === 'N3').length} N2:${mergedEntries.filter(e => e.level === 'N2').length} N1:${mergedEntries.filter(e => e.level === 'N1').length})`,
        '// Meanings translated to Vietnamese',
        '',
        'export const JOTOBA_KANJI_DATA = {',
    ];

    for (const k of mergedEntries) {
        lines.push(`  '${k.literal}': { literal: '${k.literal}', meaningVi: '${esc(k.meaningVi)}', sinoViet: '${esc(k.sinoViet)}', meanings: [${(k.meanings || []).map(m => `'${esc(m)}'`).join(',')}], stroke_count: ${k.stroke_count ?? 'null'}, frequency: ${k.frequency ?? 'null'}, jlpt: ${k.jlpt ?? 'null'}, onyomi: [${(k.onyomi || []).map(o => `'${esc(o)}'`).join(',')}], kunyomi: [${(k.kunyomi || []).map(o => `'${esc(o)}'`).join(',')}], parts: [${(k.parts || []).map(p => `'${esc(p)}'`).join(',')}], level: '${k.level}' },`);
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

    fs.writeFileSync(DATA_FILE, lines.join('\n'), 'utf-8');
    console.log(`\n🎉 Successfully updated ${DATA_FILE}!`);
    console.log(`  New Total: ${mergedEntries.length} kanji (added ${Object.keys(newEntries).length} new entries).`);
}

main().catch(console.error);
