import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const OPENJLPT_PATH = path.resolve(__dirname, '../data/openjlpt/openjlpt_kanji_by_level.json');
const KANJI_DATA_PATH = path.resolve(__dirname, '../public/data/kanji_data.json');
const JOTOBA_DATA_PATH = path.resolve(__dirname, '../src/data/jotobaKanjiData.js');
const METADATA_PATH = path.resolve(__dirname, '../public/data/metadata.json');

async function main() {
    console.log('🚀 Starting Full Sync: Overwriting Kanji Meanings & On/Kun Readings from OpenJLPT...');

    // 1. Load OpenJLPT dataset
    const openJlpt = JSON.parse(fs.readFileSync(OPENJLPT_PATH, 'utf-8'));
    const openJlptMap = new Map();

    for (const [lvlKey, list] of Object.entries(openJlpt)) {
        const levelUpper = lvlKey.toUpperCase(); // 'N5', 'N4', 'N3', 'N2', 'N1'
        list.forEach((item, idx) => {
            const char = (item.char || '').trim();
            if (!char) return;
            openJlptMap.set(char, {
                char,
                level: levelUpper,
                jlptNum: parseInt(levelUpper.replace('N', '')) || 1,
                order: idx + 1,
                onyomi: (item.onyomi || '').trim(),
                kunyomi: (item.kunyomi || '').trim(),
                hanviet: (item.hanviet || '').trim().toUpperCase(),
                meaning: (item.meaning || '').trim()
            });
        });
    }

    console.log(`📊 OpenJLPT Database Loaded: ${openJlptMap.size} unique kanji entries.`);

    // 2. Load and update public/data/kanji_data.json
    let kanjiList = [];
    if (fs.existsSync(KANJI_DATA_PATH)) {
        kanjiList = JSON.parse(fs.readFileSync(KANJI_DATA_PATH, 'utf-8'));
    }

    const kanjiMap = new Map();
    kanjiList.forEach(k => {
        const char = (k.character || k.literal || k.char || '').trim();
        if (char) kanjiMap.set(char, k);
    });

    let overwrittenCount = 0;
    let addedCount = 0;

    // Load Jotoba for supplementary data (stroke count, parts) if adding new
    const jotobaModule = await import('../src/data/jotobaKanjiData.js');
    const existingJotobaData = { ...jotobaModule.JOTOBA_KANJI_DATA };

    const levelOrder = ['N5', 'N4', 'N3', 'N2', 'N1'];
    const updatedKanjiList = [];

    // Step A: Process OpenJLPT kanji in order
    for (const lvl of levelOrder) {
        const list = openJlpt[lvl.toLowerCase()] || [];
        list.forEach((oItem, idx) => {
            const char = oItem.char.trim();
            const existing = kanjiMap.get(char);
            const jData = existingJotobaData[char] || {};

            const hanviet = (oItem.hanviet || '').trim().toUpperCase();
            const meaning = (oItem.meaning || '').trim();
            const onyomi = (oItem.onyomi || '').trim();
            const kunyomi = (oItem.kunyomi || '').trim();

            if (existing) {
                overwrittenCount++;
            } else {
                addedCount++;
            }

            const partsStr = existing?.parts || (Array.isArray(jData.parts) ? jData.parts.join('、') : char);
            const strokeStr = String(existing?.strokeCount || jData.stroke_count || '');

            const record = {
                id: existing?.id || `kanji_${lvl.toLowerCase()}_${idx + 1}_${char}`,
                character: char,
                level: lvl,
                jlpt: lvl,
                openJlptOrder: idx + 1,
                // Overwrite with OpenJLPT authoritative data:
                sinoViet: hanviet || existing?.sinoViet || '',
                meaning: meaning || existing?.meaning || '',
                meaningVi: meaning || existing?.meaningVi || existing?.meaning || '',
                onyomi: onyomi || existing?.onyomi || '',
                kunyomi: kunyomi || existing?.kunyomi || '',
                parts: partsStr,
                strokeCount: strokeStr,
                mnemonic: existing?.mnemonic || '',
                updatedAt: Date.now()
            };

            updatedKanjiList.push(record);
            kanjiMap.delete(char);
        });
    }

    // Step B: Retain extra Kanji (e.g. Radicals, Jinmeiyo)
    for (const [char, existing] of kanjiMap.entries()) {
        const lvl = existing.level === 'Bộ thủ' ? 'Bộ thủ' : 'N1';
        updatedKanjiList.push({
            ...existing,
            character: char,
            level: lvl,
            jlpt: lvl,
            updatedAt: existing.updatedAt || Date.now()
        });
    }

    fs.writeFileSync(KANJI_DATA_PATH, JSON.stringify(updatedKanjiList, null, 2), 'utf-8');
    console.log(`✅ [kanji_data.json] Overwritten: ${overwrittenCount}, Added: ${addedCount}, Total: ${updatedKanjiList.length}`);

    // 3. Update src/data/jotobaKanjiData.js
    const updatedJotobaData = {};
    const jotobaCounts = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, Other: 0 };

    for (const [char, oData] of openJlptMap.entries()) {
        const existing = existingJotobaData[char] || {};

        // Parse On/Kun into arrays cleanly
        const onArray = oData.onyomi ? oData.onyomi.split(/[,、\s]+/).filter(Boolean) : [];
        const kunArray = oData.kunyomi ? oData.kunyomi.split(/[,、\s]+/).filter(Boolean) : [];

        updatedJotobaData[char] = {
            literal: char,
            // Overwritten by OpenJLPT:
            meaningVi: oData.meaning,
            sinoViet: oData.hanviet,
            meanings: oData.meaning ? [oData.meaning] : (existing.meanings || []),
            stroke_count: existing.stroke_count || null,
            frequency: existing.frequency || null,
            jlpt: oData.jlptNum,
            onyomi: onArray,
            kunyomi: kunArray,
            parts: existing.parts || [char],
            level: oData.level,
            openJlptOrder: oData.order
        };

        jotobaCounts[oData.level] = (jotobaCounts[oData.level] || 0) + 1;
    }

    // Keep non-OpenJLPT extra entries
    for (const [char, jData] of Object.entries(existingJotobaData)) {
        if (!updatedJotobaData[char]) {
            updatedJotobaData[char] = {
                ...jData,
                level: jData.level === 'Bộ thủ' ? 'Bộ thủ' : 'N1',
                jlpt: jData.jlpt || 1
            };
            jotobaCounts['Other'] = (jotobaCounts['Other'] || 0) + 1;
        }
    }

    const jotobaEntriesStr = Object.entries(updatedJotobaData).map(([char, k]) => {
        return `  '${char}': ${JSON.stringify(k)},`;
    }).join('\n');

    const totalJotobaCount = Object.keys(updatedJotobaData).length;
    const fileHeader = `// Auto-generated & realigned with OpenJLPT standard
// Updated: ${new Date().toISOString()}
// Total: ${totalJotobaCount} kanji (N5:${jotobaCounts.N5} N4:${jotobaCounts.N4} N3:${jotobaCounts.N3} N2:${jotobaCounts.N2} N1:${jotobaCounts.N1})
// Meanings, Sino-Vietnamese & On/Kun readings synchronized from OpenJLPT

import kanjiComponents from './kanjiComponents.json' with { type: 'json' };

export const JOTOBA_KANJI_DATA = {
${jotobaEntriesStr}
};

// Get all kanji for a specific JLPT level
export const getJotobaKanjiByLevel = (level) => Object.values(JOTOBA_KANJI_DATA).filter(k => k.level === level);

// Get kanji data for a specific character
export const getJotobaKanjiData = (char) => {
  const data = JOTOBA_KANJI_DATA[char];
  if (!data) return null;
  const customParts = kanjiComponents[char];
  if (customParts) {
    return { ...data, parts: customParts };
  }
  return data;
};

// Get all kanji characters for a level (just the characters)
export const getJotobaKanjiChars = (level) => Object.values(JOTOBA_KANJI_DATA).filter(k => k.level === level).map(k => k.literal);
`;

    fs.writeFileSync(JOTOBA_DATA_PATH, fileHeader, 'utf-8');
    console.log(`✅ [jotobaKanjiData.js] Updated ${totalJotobaCount} kanji.`);

    // 4. Update metadata.json
    const metadata = {
        exportedAt: Date.now(),
        kanjiCount: updatedKanjiList.length,
        n5Count: jotobaCounts.N5,
        n4Count: jotobaCounts.N4,
        n3Count: jotobaCounts.N3,
        n2Count: jotobaCounts.N2,
        n1Count: jotobaCounts.N1,
        source: 'OpenJLPT synchronized (meanings, on/kun readings, Sino-Vietnamese)',
        updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`✅ [metadata.json] Updated timestamp: ${metadata.exportedAt}`);

    console.log('\n🎉 ALL KANJI MEANINGS & ON/KUN READINGS SUCCESSFULLY SYNCHRONIZED FROM OPENJLPT!');
}

main().catch(e => {
    console.error('Fatal error:', e);
});
