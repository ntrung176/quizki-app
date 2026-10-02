import fs from 'fs';
import path from 'path';

async function extractKanjiData() {
    const raw = fs.readFileSync('data/openjlpt/kanjiData_openjlpt.js', 'utf-8');
    
    const startIdx = raw.indexOf('{n5:[');
    if (startIdx === -1) {
        console.error('Could not find {n5:[');
        return;
    }

    const endIdx = raw.indexOf(']});function h(n)', startIdx);
    if (endIdx === -1) {
        console.error('Could not find end of object');
        return;
    }

    const objStr = raw.slice(startIdx, endIdx + 2);
    
    let kanjiData = null;
    try {
        kanjiData = new Function(`return ${objStr};`)();
    } catch (e) {
        console.error('Eval error:', e);
        return;
    }

    if (kanjiData) {
        console.log('🎉 Successfully extracted KANJI_DATA from OpenJLPT!');
        let total = 0;
        for (const [lvl, list] of Object.entries(kanjiData)) {
            console.log(`Level ${lvl.toUpperCase()}: ${list.length} kanji`);
            total += list.length;
        }
        console.log(`📊 Total Kanji in OpenJLPT: ${total}`);

        // Save cleanly to JSON
        fs.writeFileSync('data/openjlpt/openjlpt_kanji_by_level.json', JSON.stringify(kanjiData, null, 2), 'utf-8');
        console.log('Saved to data/openjlpt/openjlpt_kanji_by_level.json');
    }
}

extractKanjiData();
