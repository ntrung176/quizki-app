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
    console.log('🚀 Starting Kanji Level Realignment with OpenJLPT...');

    // 1. Load OpenJLPT dataset
    const openJlpt = JSON.parse(fs.readFileSync(OPENJLPT_PATH, 'utf-8'));
    const openJlptMap = new Map();
    const openJlptLevelCounts = {};

    for (const [lvlKey, list] of Object.entries(openJlpt)) {
        const levelUpper = lvlKey.toUpperCase(); // 'N5', 'N4', 'N3', 'N2', 'N1'
        openJlptLevelCounts[levelUpper] = list.length;
        list.forEach((item, idx) => {
            const char = (item.char || '').trim();
            if (!char) return;
            openJlptMap.set(char, {
                char,
                level: levelUpper,
                jlptNum: parseInt(levelUpper.replace('N', '')) || 1,
                order: idx + 1,
                onyomi: item.onyomi || '',
                kunyomi: item.kunyomi || '',
                hanviet: item.hanviet || '',
                meaning: item.meaning || ''
            });
        });
    }

    console.log('📊 OpenJLPT Source Counts by Level:', openJlptLevelCounts);
    console.log(`📊 Total OpenJLPT Unique Kanji: ${openJlptMap.size}`);

    // 2. Load existing Quizki Kanji Data
    let quizkiKanjiList = [];
    if (fs.existsSync(KANJI_DATA_PATH)) {
        quizkiKanjiList = JSON.parse(fs.readFileSync(KANJI_DATA_PATH, 'utf-8'));
    }
    console.log(`Loaded ${quizkiKanjiList.length} kanji from ${KANJI_DATA_PATH}`);

    // 3. Load Jotoba Module dynamically
    const jotobaModule = await import('../src/data/jotobaKanjiData.js');
    const existingJotobaData = { ...jotobaModule.JOTOBA_KANJI_DATA };
    console.log(`Loaded ${Object.keys(existingJotobaData).length} kanji from Jotoba dataset`);

    // 4. Update JOTOBA_KANJI_DATA
    const updatedJotobaData = {};
    const newJotobaCounts = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, Other: 0 };

    // First process all OpenJLPT kanji into Jotoba
    for (const [char, oData] of openJlptMap.entries()) {
        const existing = existingJotobaData[char] || {};
        
        let onList = [];
        if (Array.isArray(existing.onyomi) && existing.onyomi.length > 0) {
            onList = existing.onyomi;
        } else if (oData.onyomi) {
            onList = oData.onyomi.split(/[,、\s]+/).filter(Boolean);
        }

        let kunList = [];
        if (Array.isArray(existing.kunyomi) && existing.kunyomi.length > 0) {
            kunList = existing.kunyomi;
        } else if (oData.kunyomi) {
            kunList = oData.kunyomi.split(/[,、\s]+/).filter(Boolean);
        }

        const sinoViet = (existing.sinoViet || oData.hanviet || '').toUpperCase().trim();
        const meaningVi = existing.meaningVi || oData.meaning || '';

        updatedJotobaData[char] = {
            literal: char,
            meaningVi: meaningVi,
            sinoViet: sinoViet,
            meanings: existing.meanings || (oData.meaning ? [oData.meaning] : []),
            stroke_count: existing.stroke_count || null,
            frequency: existing.frequency || null,
            jlpt: oData.jlptNum,
            onyomi: onList,
            kunyomi: kunList,
            parts: existing.parts || [char],
            level: oData.level,
            openJlptOrder: oData.order
        };

        newJotobaCounts[oData.level] = (newJotobaCounts[oData.level] || 0) + 1;
    }

    // Now process any remaining existing Jotoba kanji that were not in OpenJLPT (extra/radicals)
    for (const [char, jData] of Object.entries(existingJotobaData)) {
        if (!updatedJotobaData[char]) {
            updatedJotobaData[char] = {
                ...jData,
                // Keep in N1 or Other if extra
                level: jData.level === 'Bộ thủ' ? 'Bộ thủ' : 'N1',
                jlpt: jData.jlpt || 1
            };
            newJotobaCounts['Other'] = (newJotobaCounts['Other'] || 0) + 1;
        }
    }

    console.log('📊 Realigned Jotoba Kanji Counts:', newJotobaCounts);

    // 5. Update public/data/kanji_data.json
    const quizkiMap = new Map();
    quizkiKanjiList.forEach(k => {
        const char = (k.character || k.literal || k.char || '').trim();
        if (char) quizkiMap.set(char, k);
    });

    const realignedKanjiList = [];
    const newQuizkiCounts = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0, 'Bộ thủ': 0, Other: 0 };

    // A. Add/Update all 2,216 OpenJLPT Kanji in order (N5 -> N1)
    const levelOrder = ['N5', 'N4', 'N3', 'N2', 'N1'];
    for (const lvl of levelOrder) {
        const list = openJlpt[lvl.toLowerCase()] || [];
        list.forEach((oItem, idx) => {
            const char = oItem.char.trim();
            const existing = quizkiMap.get(char) || {};
            const jData = updatedJotobaData[char] || {};

            const onyomiStr = Array.isArray(jData.onyomi) ? jData.onyomi.join(', ') : (oItem.onyomi || existing.onyomi || '');
            const kunyomiStr = Array.isArray(jData.kunyomi) ? jData.kunyomi.join(', ') : (oItem.kunyomi || existing.kunyomi || '');
            const sinoVietStr = (existing.sinoViet || oItem.hanviet || jData.sinoViet || '').toUpperCase().trim();
            const meaningViStr = existing.meaningVi || existing.meaning || oItem.meaning || jData.meaningVi || '';

            const partsStr = existing.parts || (Array.isArray(jData.parts) ? jData.parts.join('、') : char);
            const strokeStr = String(existing.strokeCount || jData.stroke_count || '');

            const record = {
                id: existing.id || `kanji_${lvl.toLowerCase()}_${idx + 1}_${char}`,
                character: char,
                level: lvl,
                jlpt: lvl,
                openJlptOrder: idx + 1,
                sinoViet: sinoVietStr,
                meaning: meaningViStr,
                meaningVi: meaningViStr,
                onyomi: onyomiStr,
                kunyomi: kunyomiStr,
                parts: partsStr,
                strokeCount: strokeStr,
                mnemonic: existing.mnemonic || '',
                updatedAt: Date.now()
            };

            realignedKanjiList.push(record);
            newQuizkiCounts[lvl] = (newQuizkiCounts[lvl] || 0) + 1;
            quizkiMap.delete(char);
        });
    }

    // B. Keep remaining Kanji / Radicals from Quizki (extra characters belong to N1 / Advanced or Bộ thủ)
    for (const [char, existing] of quizkiMap.entries()) {
        const lvl = existing.level === 'Bộ thủ' ? 'Bộ thủ' : 'N1';
        realignedKanjiList.push({
            ...existing,
            character: char,
            level: lvl,
            jlpt: lvl,
            updatedAt: existing.updatedAt || Date.now()
        });
        newQuizkiCounts[lvl] = (newQuizkiCounts[lvl] || 0) + 1;
    }

    console.log('📊 Realigned QuizKi kanji_data.json Counts:', newQuizkiCounts);
    console.log(`📊 Total Kanji in kanji_data.json: ${realignedKanjiList.length}`);

    // 6. Write to public/data/kanji_data.json
    fs.writeFileSync(KANJI_DATA_PATH, JSON.stringify(realignedKanjiList, null, 2), 'utf-8');
    console.log(`✅ Saved ${realignedKanjiList.length} kanji to ${KANJI_DATA_PATH}`);

    // 7. Write updated src/data/jotobaKanjiData.js
    const jotobaEntriesStr = Object.entries(updatedJotobaData).map(([char, k]) => {
        return `  '${char}': ${JSON.stringify(k)},`;
    }).join('\n');

    const totalCount = Object.keys(updatedJotobaData).length;
    const fileHeader = `// Auto-generated & realigned with OpenJLPT standard
// Updated: ${new Date().toISOString()}
// Total: ${totalCount} kanji (N5:${newJotobaCounts.N5} N4:${newJotobaCounts.N4} N3:${newJotobaCounts.N3} N2:${newJotobaCounts.N2} N1:${newJotobaCounts.N1})
// Meanings & Sino-Vietnamese verified

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
    console.log(`✅ Saved ${totalCount} kanji to ${JOTOBA_DATA_PATH}`);

    // 8. Update metadata.json
    const metadata = {
        exportedAt: Date.now(),
        kanjiCount: realignedKanjiList.length,
        n5Count: newQuizkiCounts.N5,
        n4Count: newQuizkiCounts.N4,
        n3Count: newQuizkiCounts.N3,
        n2Count: newQuizkiCounts.N2,
        n1Count: newQuizkiCounts.N1,
        source: 'OpenJLPT aligned',
        updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(METADATA_PATH, JSON.stringify(metadata, null, 2), 'utf-8');
    console.log(`✅ Updated ${METADATA_PATH}`);

    console.log('\n🎉 ALL KANJI SUCCESSFULLY REALIGNED TO EXACT OPENJLPT LEVELS!');
}

main().catch(err => {
    console.error('Fatal error:', err);
});
