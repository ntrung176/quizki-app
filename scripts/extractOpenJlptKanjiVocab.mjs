import fs from 'fs';

async function extractVocab() {
    const raw = fs.readFileSync('data/openjlpt/kanjiVocabulary_openjlpt.js', 'utf-8');
    const startIdx = raw.indexOf('{"私":[');
    if (startIdx === -1) {
        console.error('Could not find start of KANJI_VOCABULARY');
        return;
    }

    const endIdx = raw.indexOf(']});function i(e)', startIdx);
    const objStr = raw.slice(startIdx, endIdx + 2);

    let vocabData = null;
    try {
        vocabData = new Function(`return ${objStr};`)();
    } catch (e) {
        console.error('Eval error:', e);
        return;
    }

    if (vocabData) {
        console.log('🎉 Successfully extracted KANJI_VOCABULARY from OpenJLPT!');
        const kanjiCount = Object.keys(vocabData).length;
        let totalWords = 0;
        for (const [char, words] of Object.entries(vocabData)) {
            totalWords += words.length;
        }
        console.log(`📊 Kanji with mapped vocabulary: ${kanjiCount}`);
        console.log(`📊 Total Kanji Vocabulary Words: ${totalWords}`);

        fs.writeFileSync('data/openjlpt/openjlpt_kanji_vocabulary.json', JSON.stringify(vocabData, null, 2), 'utf-8');
        console.log('Saved data/openjlpt/openjlpt_kanji_vocabulary.json');
    }
}

extractVocab();
