import fs from 'fs';
import path from 'path';

async function compareKanji() {
    const openJlpt = JSON.parse(fs.readFileSync('data/openjlpt/openjlpt_kanji_by_level.json', 'utf-8'));
    
    // Build map char -> { level, order, onyomi, kunyomi, hanviet, meaning }
    const openJlptMap = new Map();
    for (const [lvl, list] of Object.entries(openJlpt)) {
        const standardLevel = lvl.toUpperCase();
        list.forEach((item, idx) => {
            const char = item.char.trim();
            openJlptMap.set(char, {
                char,
                level: standardLevel,
                order: idx + 1,
                onyomi: item.onyomi || '',
                kunyomi: item.kunyomi || '',
                hanviet: item.hanviet || '',
                meaning: item.meaning || ''
            });
        });
    }

    console.log(`OpenJLPT unique Kanji count: ${openJlptMap.size}`);

    // Quizki current kanji
    const quizkiKanji = JSON.parse(fs.readFileSync('public/data/kanji_data.json', 'utf-8'));
    console.log(`Quizki current Kanji count: ${quizkiKanji.length}`);

    // Count Quizki levels before
    const quizkiLevelsBefore = {};
    quizkiKanji.forEach(k => {
        quizkiLevelsBefore[k.jlpt || k.level || 'Unknown'] = (quizkiLevelsBefore[k.jlpt || k.level || 'Unknown'] || 0) + 1;
    });
    console.log('Quizki levels before realignment:', quizkiLevelsBefore);

    let changedCount = 0;
    let notInOpenJlpt = [];
    let notInQuizki = [];

    // Check which Quizki Kanji have different levels
    quizkiKanji.forEach(k => {
        const char = (k.character || k.char || '').trim();
        const openItem = openJlptMap.get(char);
        if (openItem) {
            const currentLevel = (k.jlpt || k.level || '').toUpperCase();
            if (currentLevel !== openItem.level) {
                changedCount++;
                if (changedCount <= 10) {
                    console.log(`  Diff: ${char} current: ${currentLevel} -> openjlpt: ${openItem.level}`);
                }
            }
        } else {
            notInOpenJlpt.push(char);
        }
    });

    console.log(`Kanji needing level realignment: ${changedCount}`);
    console.log(`Quizki Kanji not in OpenJLPT (${notInOpenJlpt.length}):`, notInOpenJlpt.slice(0, 15));

    // Check OpenJLPT kanji not in Quizki
    const quizkiChars = new Set(quizkiKanji.map(k => (k.character || k.char || '').trim()));
    openJlptMap.forEach((val, char) => {
        if (!quizkiChars.has(char)) {
            notInQuizki.push(val);
        }
    });
    console.log(`OpenJLPT Kanji not in Quizki (${notInQuizki.length}):`, notInQuizki.slice(0, 15));
}

compareKanji();
