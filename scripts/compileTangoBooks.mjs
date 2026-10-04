import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SETS_DIR = path.resolve(__dirname, '../data/openjlpt/vocabulary/sets');
const BOOKS_DATA_PATH = path.resolve(__dirname, '../public/data/books_data.json');
const VOCAB_DATA_PATH = path.resolve(__dirname, '../public/data/vocab_data.json');
const KANJI_DATA_PATH = path.resolve(__dirname, '../public/data/kanji_data.json');
const HV_LOOKUP_PATH = path.resolve(__dirname, '../src/utils/kanjiHVLookup.js');

// 1. Build Sino-Vietnamese (Hán Việt) Map
let kanjiHvMap = new Map();

if (fs.existsSync(KANJI_DATA_PATH)) {
    try {
        const kanjiList = JSON.parse(fs.readFileSync(KANJI_DATA_PATH, 'utf-8'));
        kanjiList.forEach(k => {
            if (k.character && k.sinoViet) {
                kanjiHvMap.set(k.character.trim(), k.sinoViet.trim());
            }
        });
    } catch (e) {
        console.warn('Could not load kanji data for HV map:', e.message);
    }
}

if (fs.existsSync(HV_LOOKUP_PATH)) {
    try {
        const hvCode = fs.readFileSync(HV_LOOKUP_PATH, 'utf-8');
        const matchRegex = /'([^']+)':\s*'([^']+)'/g;
        let m;
        while ((m = matchRegex.exec(hvCode)) !== null) {
            if (!kanjiHvMap.has(m[1])) {
                kanjiHvMap.set(m[1], m[2]);
            }
        }
    } catch (e) {
        console.warn('Could not load kanjiHVLookup for HV map:', e.message);
    }
}

console.log(`Loaded ${kanjiHvMap.size} Sino-Vietnamese (Hán Việt) Kanji entries.`);

function getSinoViet(word) {
    if (!word) return '';
    const clean = word.replace(/\s*\([^)]*\)/g, '').replace(/（[^）]*）/g, '').trim();
    const kanjiChars = clean.match(/[\u4e00-\u9faf]/g);
    if (!kanjiChars) return '';
    const hvList = kanjiChars.map(c => kanjiHvMap.get(c) || '').filter(Boolean);
    return hvList.length > 0 ? hvList.join(' ') : '';
}

function formatWordWithFurigana(term, reading) {
    if (!term) return '';
    const trimmed = term.trim();
    if (trimmed.includes('(') || trimmed.includes('（')) {
        return trimmed;
    }
    if (reading && reading.trim() && reading.trim() !== trimmed) {
        return `${trimmed}（${reading.trim()}）`;
    }
    return trimmed;
}

function normalizeCard(raw, defaultId, level = 'N5') {
    const term = raw.term || raw.word || raw.front || '';
    const reading = (raw.reading || '').trim();
    const formattedWord = formatWordWithFurigana(term, reading);
    const meaning = (raw.definition || raw.meaning || raw.back || '').trim();
    const ex = (raw.example || raw.exampleSentence || '').trim();
    const exMeaning = (raw.exampleMeaning || raw.exampleTranslation || '').trim();
    const sino = (raw.sinoVietnamese || raw.sinoViet || getSinoViet(term) || '').trim();
    const romaji = (raw.romaji || '').trim();

    return {
        id: raw.id ? `openjlpt-card-${raw.id}` : defaultId,
        word: formattedWord,
        reading: reading,
        meaning: meaning,
        example: ex,
        exampleMeaning: exMeaning,
        exampleSentence: ex,
        exampleTranslation: exMeaning,
        sinoViet: sino,
        sinoVietnamese: sino,
        romaji: romaji,
        level: level,
        specialReading: Boolean(raw.specialReading),
        ...(raw.pos ? { pos: raw.pos } : {}),
        ...(raw.accent !== undefined ? { accent: raw.accent } : {}),
        ...(raw.synonym ? { synonym: raw.synonym } : {}),
        ...(raw.nuance ? { nuance: raw.nuance } : {})
    };
}

function processTangoSets() {
    console.log('🚀 Compiling Tango Books (N5 - N1)...');

    const files = fs.readdirSync(SETS_DIR).filter(f => f.endsWith('.json'));
    const tangoByLevel = { N5: [], N4: [], N3: [], N2: [], N1: [] };

    for (const f of files) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(SETS_DIR, f), 'utf-8'));
            const title = data.title || '';
            if (title.toLowerCase().includes('tango')) {
                const lvlMatch = title.match(/N[1-5]/i);
                if (lvlMatch) {
                    const lvl = lvlMatch[0].toUpperCase();
                    tangoByLevel[lvl].push(data);
                }
            }
        } catch (e) {}
    }

    const books = [];
    const bookMeta = {
        N5: {
            id: 'openjlpt-tango-n5',
            name: 'Tango 1000 N5',
            subtitle: '1000 Từ vựng N5 Cơ bản',
            description: 'Giáo trình 1000 từ vựng N5 cốt lõi phân theo 10 chủ đề cuộc sống thường ngày kèm câu ví dụ',
            color: '#10B981',
            order: 0
        },
        N4: {
            id: 'openjlpt-tango-n4',
            name: 'Tango 1500 N4',
            subtitle: '1500 Từ vựng N4 Sơ cấp',
            description: 'Giáo trình 1500 từ vựng N4 phân theo 7 chủ đề sinh hoạt, học tập và giao tiếp',
            color: '#3B82F6',
            order: 1
        },
        N3: {
            id: 'openjlpt-tango-n3',
            name: 'Tango 2000 N3',
            subtitle: '2000 Từ vựng N3 Trung cấp',
            description: 'Giáo trình 2000 từ vựng N3 phân theo 12 chủ đề toàn diện cho kỳ thi JLPT N3',
            color: '#8B5CF6',
            order: 2
        },
        N2: {
            id: 'openjlpt-tango-n2',
            name: 'Tango 2500 N2',
            subtitle: '2500 Từ vựng N2 Thượng cấp',
            description: 'Giáo trình 2500 từ vựng N2 chuyên sâu cho công việc, xã hội và kỳ thi JLPT N2',
            color: '#F59E0B',
            order: 3
        },
        N1: {
            id: 'openjlpt-tango-n1',
            name: 'Tango 3000 N1',
            subtitle: '3000 Từ vựng N1 Cao cấp',
            description: 'Giáo trình 3000 từ vựng N1 đỉnh cao về học thuật, thời sự, triết học và xã hội',
            color: '#EF4444',
            order: 4
        }
    };

    for (const lvl of ['N5', 'N4', 'N3', 'N2', 'N1']) {
        const rawSets = tangoByLevel[lvl];
        
        // Sort sets by chapter and lesson index
        rawSets.sort((a, b) => {
            const aMatch = a.title.match(/(\d+)\.(\d+)/);
            const bMatch = b.title.match(/(\d+)\.(\d+)/);
            if (aMatch && bMatch) {
                const chDiff = parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
                if (chDiff !== 0) return chDiff;
                return parseInt(aMatch[2], 10) - parseInt(bMatch[2], 10);
            }
            return a.title.localeCompare(b.title);
        });

        // Group into chapters
        const chaptersMap = new Map();

        for (const s of rawSets) {
            const match = s.title.match(/N[1-5]\s+Tango\s+(\d+)\.(\d+)\s*[-–]\s*([^·]+)\s*·\s*(.+)/i);
            let chNum = 1;
            let lessonNum = 1;
            let chName = 'Tổng hợp';
            let lessonName = s.title;

            if (match) {
                chNum = parseInt(match[1], 10);
                lessonNum = parseInt(match[2], 10);
                chName = match[3].trim();
                lessonName = match[4].trim();
            } else {
                const simpleMatch = /(\d+)\.(\d+)/.exec(s.title);
                if (simpleMatch) {
                    chNum = parseInt(simpleMatch[1], 10);
                    lessonNum = parseInt(simpleMatch[2], 10);
                }
            }

            if (!chaptersMap.has(chNum)) {
                const padCh = chNum < 10 ? `0${chNum}` : `${chNum}`;
                chaptersMap.set(chNum, {
                    id: `tango-${lvl.toLowerCase()}-ch${chNum}`,
                    name: `Chương ${padCh} - ${chName}`,
                    order: chNum,
                    createdAt: Date.now(),
                    lessons: []
                });
            }

            const vocab = (s.cards || []).map((c, cIdx) => 
                normalizeCard(c, `tango-${lvl.toLowerCase()}-c${chNum}l${lessonNum}-w${cIdx + 1}`, lvl)
            );

            const padCh = chNum < 10 ? `0${chNum}` : `${chNum}`;
            chaptersMap.get(chNum).lessons.push({
                id: `tango-${lvl.toLowerCase()}-c${chNum}-l${lessonNum}`,
                title: `Bài ${chNum}.${lessonNum} - ${lessonName}`,
                name: `Bài ${chNum}.${lessonNum} - ${lessonName}`,
                order: lessonNum,
                vocab: vocab
            });
        }

        const chapters = Array.from(chaptersMap.values()).sort((a, b) => a.order - b.order);
        const totalVocab = chapters.reduce((sum, ch) => sum + ch.lessons.reduce((lSum, l) => lSum + l.vocab.length, 0), 0);

        const meta = bookMeta[lvl];
        books.push({
            id: meta.id,
            name: meta.name,
            subtitle: meta.subtitle,
            description: meta.description,
            wordCount: totalVocab.toString(),
            color: meta.color,
            order: meta.order,
            createdAt: Date.now(),
            chapters: chapters
        });

        console.log(`✅ [${lvl}] ${meta.name}: ${chapters.length} chapters, ${rawSets.length} lessons, ${totalVocab} vocabulary items`);
    }

    const tangoGroup = {
        id: 'openjlpt-tango-group',
        name: '2000 Từ Vựng Tango (N5 - N1)',
        subtitle: 'Trọn bộ giáo trình từ vựng Tango 1000 ~ 3000 đầy đủ từ N5 đến N1',
        order: 3,
        imageUrl: 'https://d1yuzhlfxjxgbk.cloudfront.net/openjlpt-assets/mascot/fox_pose_2.webp',
        createdAt: Date.now(),
        books: books
    };

    // Update books_data.json
    let existingBooksData = fs.existsSync(BOOKS_DATA_PATH) ? JSON.parse(fs.readFileSync(BOOKS_DATA_PATH, 'utf-8')) : [];
    
    // Remove old tango group if exists
    existingBooksData = existingBooksData.filter(g => g.id !== 'openjlpt-tango-group');

    // Find position after Soumatome (order 3)
    const soumatomeIdx = existingBooksData.findIndex(g => g.id === 'openjlpt-soumatome-group');
    if (soumatomeIdx !== -1) {
        existingBooksData.splice(soumatomeIdx + 1, 0, tangoGroup);
    } else {
        existingBooksData.push(tangoGroup);
    }

    // Re-index group orders
    existingBooksData.forEach((g, idx) => {
        g.order = idx;
    });

    fs.writeFileSync(BOOKS_DATA_PATH, JSON.stringify(existingBooksData), 'utf-8');
    console.log(`\n🎉 Saved updated books_data.json with Tango Series (${(fs.statSync(BOOKS_DATA_PATH).size / (1024 * 1024)).toFixed(2)} MB)`);

    // 3. Merge into vocab_data.json
    console.log('\n🔄 Merging Tango vocabulary into master vocab_data.json...');
    const existingVocab = fs.existsSync(VOCAB_DATA_PATH) ? JSON.parse(fs.readFileSync(VOCAB_DATA_PATH, 'utf-8')) : [];
    const vocabMap = new Map();

    existingVocab.forEach(v => {
        const norm = (v.word || '').trim();
        if (norm) {
            vocabMap.set(norm, v);
        }
    });

    let addedVocab = 0;
    let updatedVocab = 0;

    for (const book of books) {
        for (const ch of book.chapters) {
            for (const lesson of ch.lessons) {
                for (const v of lesson.vocab) {
                    const norm = (v.word || '').trim();
                    if (!norm) continue;

                    if (vocabMap.has(norm)) {
                        const ex = vocabMap.get(norm);
                        if (!ex.example && v.example) {
                            ex.example = v.example;
                            ex.exampleMeaning = v.exampleMeaning;
                            ex.exampleSentence = v.example;
                            ex.exampleTranslation = v.exampleMeaning;
                            updatedVocab++;
                        }
                        if (!ex.sinoVietnamese && v.sinoVietnamese) {
                            ex.sinoVietnamese = v.sinoVietnamese;
                            ex.sinoViet = v.sinoVietnamese;
                        }
                    } else {
                        vocabMap.set(norm, v);
                        addedVocab++;
                    }
                }
            }
        }
    }

    const finalVocabList = Array.from(vocabMap.values());
    fs.writeFileSync(VOCAB_DATA_PATH, JSON.stringify(finalVocabList), 'utf-8');
    console.log(`🎉 Master dictionary updated: ${addedVocab} new unique words added, ${updatedVocab} enriched. Total words: ${finalVocabList.length} (${(fs.statSync(VOCAB_DATA_PATH).size / (1024 * 1024)).toFixed(2)} MB)`);
}

processTangoSets();
