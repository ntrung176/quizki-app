import fs from 'fs';
import path from 'path';

async function compileCurriculum() {
    console.log('=== COMPILING GRAMMAR HUB CURRICULUM DATASET ===');

    // 1. Minna Curriculum (N5 & N4: Lessons 1 -> 50)
    const minnaText = fs.readFileSync('scripts/minna-curriculum-BD-rv0kL.js', 'utf8');
    const minnaStart = minnaText.indexOf('[{bai:1');
    const minnaEnd = minnaText.lastIndexOf('}]');
    const minnaObjStr = minnaText.slice(minnaStart, minnaEnd + 2);
    const minnaLessons = (new Function(`return (${minnaObjStr});`))();

    console.log(`Loaded ${minnaLessons.length} Minna lessons (N5 & N4)`);

    // 2. SKM Curriculum (N3, N2, N1: Lessons 51 -> 150)
    const skmText = fs.readFileSync('scripts/skm-curriculum-patterns-BGvCT5Cm.js', 'utf8');
    const skmStart = skmText.indexOf('{51:[');
    const skmEnd = skmText.lastIndexOf(']}');
    const skmObjStr = skmText.slice(skmStart, skmEnd + 2);
    const skmPatterns = (new Function(`return (${skmObjStr});`))();

    console.log(`Loaded ${Object.keys(skmPatterns).length} SKM pattern groups (N3, N2, N1)`);

    // Kanji Roman numerals array
    const KANJI_NUMERALS = ['一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五', '十六', '十七', '十八', '十九', '二十', '二十一', '二十二', '二十三', '二十四', '二十五', '二十六', '二十七', '二十八', '二十九', '三十'];

    // Map Minna Lessons to standard format
    const allTopics = [];

    minnaLessons.forEach((l) => {
        const level = l.level || (l.bai <= 25 ? 'N5' : 'N4');
        const numInLevel = l.bai <= 25 ? l.bai : l.bai - 25;
        const numeral = KANJI_NUMERALS[numInLevel - 1] || `${numInLevel}`;

        allTopics.push({
            id: `minna_lesson_${l.bai}`,
            bai: l.bai,
            level: level,
            levelLabel: level === 'N5' ? 'N5 初級 I' : 'N4 初級 II',
            kanji: l.kanji || '文',
            numeral: numeral,
            reading: l.reading || '',
            romaji: l.romaji || '',
            titleVi: l.titleVi || `Bài ${l.bai}`,
            titleJp: l.titleJp || '',
            descVi: l.descVi || '',
            patternsCount: (l.patterns || []).length,
            selfCheckGoals: l.selfCheckGoals || [],
            readingPassage: l.readingPassage || null,
            patterns: (l.patterns || []).filter(Boolean)
        });
    });

    const N3_KANJI_THEMES = ['時', '理', '条', '限', '比', '関', '態', '意', '受', '使', '感', '変', '推', '伝', '確', '目', '連', '評', '結', '逆', '強', '話', '願', '修', '総'];
    const N2_KANJI_THEMES = ['際', '契', '伴', '限', '対', '基', '関', '視', '比', '無', '過', '極', '強', '逆', '結', '様', '推', '情', '願', '敬', '書', '論', '報', '応', '統'];
    const N1_KANJI_THEMES = ['極', '至', '限', '厳', '決', '断', '契', '然', '即', '鑑', '顧', '排', '絶', '頂', '余', '念', '意', '気', '観', '格', '律', '脈', '終', '始', '総'];

    Object.entries(skmPatterns).forEach(([keyStr, rawPatterns]) => {
        const patterns = Array.isArray(rawPatterns) ? rawPatterns.filter(p => p && p.pattern) : [];
        if (patterns.length === 0) return;

        const keyNum = parseInt(keyStr, 10);
        let level = 'N3';
        let levelLabel = 'N3 中級';
        let kanjiList = N3_KANJI_THEMES;
        let numInLevel = keyNum - 50;

        if (keyNum > 105) {
            level = 'N1';
            levelLabel = 'N1 最上級';
            kanjiList = N1_KANJI_THEMES;
            numInLevel = keyNum - 105;
        } else if (keyNum > 75) {
            level = 'N2';
            levelLabel = 'N2 上級';
            kanjiList = N2_KANJI_THEMES;
            numInLevel = keyNum - 75;
        }

        const numeral = KANJI_NUMERALS[numInLevel - 1] || `${numInLevel}`;
        const firstP = patterns[0] || {};
        const kanji = kanjiList[(numInLevel - 1) % kanjiList.length] || '語';

        allTopics.push({
            id: `skm_lesson_${keyNum}`,
            bai: keyNum,
            level: level,
            levelLabel: levelLabel,
            kanji: kanji,
            numeral: numeral,
            reading: firstP.pattern?.replace(/[〜～]/g, '') || '',
            romaji: `Chủ đề ${numInLevel}`,
            titleVi: `Chuyên đề: ${patterns.map(p => p.pattern).slice(0, 3).join(' · ')}`,
            titleJp: patterns.map(p => p.pattern).slice(0, 3).join(' / '),
            descVi: firstP.meaning || firstP.explanation?.slice(0, 100) || '',
            patternsCount: patterns.length,
            selfCheckGoals: [
                `Nắm vững quy tắc kết hợp của ${patterns.map(p => p.pattern).join(', ')}`,
                'Phân biệt sắc thái với các mẫu câu tương đương',
                'Tránh các bẫy phổ biến trong đề thi JLPT'
            ],
            patterns: patterns
        });
    });

    console.log(`-> Total Compiled Topics across N5-N1: ${allTopics.length}`);

    const outPath = path.resolve('public/data/grammar_hub_curriculum.json');
    fs.writeFileSync(outPath, JSON.stringify(allTopics, null, 2), 'utf8');
    console.log(`-> Successfully saved to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

compileCurriculum().catch(console.error);
