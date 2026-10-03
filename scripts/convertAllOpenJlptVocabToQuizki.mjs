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

// Load Kanji Data & HV Lookup for Hán Việt
let kanjiHvMap = new Map();

// 1. From kanji_data.json
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

// 2. From kanjiHVLookup.js
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
        ...(raw.nuance ? { nuance: raw.nuance } : {}),
        ...(raw.imageUrl ? { imageUrl: raw.imageUrl } : {})
    };
}

function main() {
    console.log('🚀 Processing OpenJLPT Vocabulary into Quizki datasets...');

    if (!fs.existsSync(SETS_DIR)) {
        console.error('Sets directory not found:', SETS_DIR);
        return;
    }

    const setFiles = fs.readdirSync(SETS_DIR).filter(f => f.endsWith('.json'));
    console.log(`Found ${setFiles.length} set files.`);

    const allSets = [];
    for (const f of setFiles) {
        try {
            const s = JSON.parse(fs.readFileSync(path.join(SETS_DIR, f), 'utf-8'));
            const title = s.title || '';
            // Ensure no Mimikara
            if (title.toLowerCase().includes('mimikara') || /N[1-3]\s+Unit/i.test(title)) {
                continue;
            }
            if (s.cards && s.cards.length > 0) {
                allSets.push(s);
            }
        } catch (e) {}
    }

    console.log(`Valid OpenJLPT sets with cards (excluding Mimikara): ${allSets.length}`);

    // Sort sets into Minna, Soumatome, and Topics
    const minnaN5Sets = [];
    const minnaN4Sets = [];
    const soumatomeN3Sets = [];
    const topicSets = [];

    for (const s of allSets) {
        const title = s.title || '';
        const minnaMatch = /^Bài\s+(\d+)\s*[-–]/i.exec(title);
        const soumatomeMatch = /^Tuần\s+(\d+)\s*·\s*Ngày\s+(\d+)/i.exec(title);

        if (minnaMatch) {
            const lessonNum = parseInt(minnaMatch[1], 10);
            if (lessonNum <= 25) {
                minnaN5Sets.push({ lessonNum, set: s });
            } else {
                minnaN4Sets.push({ lessonNum, set: s });
            }
        } else if (soumatomeMatch) {
            const week = parseInt(soumatomeMatch[1], 10);
            const day = parseInt(soumatomeMatch[2], 10);
            const lessonNum = (week - 1) * 7 + day;
            soumatomeN3Sets.push({ week, day, lessonNum, set: s });
        } else {
            topicSets.push(s);
        }
    }

    minnaN5Sets.sort((a, b) => a.lessonNum - b.lessonNum);
    minnaN4Sets.sort((a, b) => a.lessonNum - b.lessonNum);
    soumatomeN3Sets.sort((a, b) => a.lessonNum - b.lessonNum);

    console.log(`\n📚 Breakdown:`);
    console.log(`- Minna no Nihongo N5: ${minnaN5Sets.length} lessons`);
    console.log(`- Minna no Nihongo N4: ${minnaN4Sets.length} lessons`);
    console.log(`- Soumatome N3: ${soumatomeN3Sets.length} lessons`);
    console.log(`- Themed Topic Sets: ${topicSets.length} sets`);

    // 1. Build Quizki Book Groups for books_data.json
    let existingBooksData = fs.existsSync(BOOKS_DATA_PATH) ? JSON.parse(fs.readFileSync(BOOKS_DATA_PATH, 'utf-8')) : [];

    // Clean up old OpenJLPT groups if already present to ensure clean rebuild
    existingBooksData = existingBooksData.filter(g => !g.id.startsWith('openjlpt-') && g.name !== 'Minna no Nihongo' && g.name !== 'Nihongo Soumatome N3' && g.name !== 'Từ Vựng Theo Chủ Đề');

    // Minna N5 Lessons
    const minnaN5Lessons = minnaN5Sets.map(({ lessonNum, set }) => {
        const vocab = (set.cards || []).map((c, cIdx) => normalizeCard(c, `minna-n5-b${lessonNum}-w${cIdx + 1}`, 'N5'));

        return {
            id: `minna-n5-bai-${lessonNum}`,
            title: set.title,
            name: set.title,
            order: lessonNum,
            vocab: vocab
        };
    });

    // Minna N4 Lessons
    const minnaN4Lessons = minnaN4Sets.map(({ lessonNum, set }) => {
        const vocab = (set.cards || []).map((c, cIdx) => normalizeCard(c, `minna-n4-b${lessonNum}-w${cIdx + 1}`, 'N4'));

        return {
            id: `minna-n4-bai-${lessonNum}`,
            title: set.title,
            name: set.title,
            order: lessonNum,
            vocab: vocab
        };
    });

    const minnaGroup = {
        id: 'openjlpt-minna-group',
        name: 'Minna no Nihongo',
        subtitle: 'Giáo trình chuẩn Minna no Nihongo Sơ cấp N5 & N4 (50 bài)',
        order: 1,
        imageUrl: 'https://d1yuzhlfxjxgbk.cloudfront.net/openjlpt-assets/mascot/fox_pose_2.webp',
        createdAt: Date.now(),
        books: [
            {
                id: 'openjlpt-minna-n5',
                name: 'Minna no Nihongo N5',
                subtitle: 'Sơ cấp I (Bài 1 - 25)',
                description: 'Từ vựng đầy đủ 25 bài đầu kèm câu ví dụ thực tế và giải thích chi tiết',
                wordCount: minnaN5Lessons.reduce((sum, l) => sum + l.vocab.length, 0).toString(),
                color: '#10B981',
                order: 0,
                createdAt: Date.now(),
                chapters: [{
                    id: 'minna-n5-ch1',
                    name: 'Minna no Nihongo Sơ cấp I',
                    order: 0,
                    createdAt: Date.now(),
                    lessons: minnaN5Lessons
                }]
            },
            {
                id: 'openjlpt-minna-n4',
                name: 'Minna no Nihongo N4',
                subtitle: 'Sơ cấp II (Bài 26 - 50)',
                description: 'Từ vựng 25 bài tiếp theo trình độ N4 kèm câu ví dụ sinh động',
                wordCount: minnaN4Lessons.reduce((sum, l) => sum + l.vocab.length, 0).toString(),
                color: '#3B82F6',
                order: 1,
                createdAt: Date.now(),
                chapters: [{
                    id: 'minna-n4-ch1',
                    name: 'Minna no Nihongo Sơ cấp II',
                    order: 0,
                    createdAt: Date.now(),
                    lessons: minnaN4Lessons
                }]
            }
        ]
    };

    // Soumatome N3 Lessons
    const soumatomeN3Lessons = soumatomeN3Sets.map(({ week, day, lessonNum, set }) => {
        const vocab = (set.cards || []).map((c, cIdx) => normalizeCard(c, `soumatome-n3-w${week}d${day}-w${cIdx + 1}`, 'N3'));

        return {
            id: `soumatome-n3-w${week}-d${day}`,
            title: set.title,
            name: set.title,
            order: lessonNum,
            vocab: vocab
        };
    });

    const soumatomeGroup = {
        id: 'openjlpt-soumatome-group',
        name: 'Nihongo Soumatome N3',
        subtitle: 'Giáo trình ôn thi JLPT N3 toàn diện trong 6 tuần (36 bài)',
        order: 2,
        imageUrl: 'https://d1yuzhlfxjxgbk.cloudfront.net/openjlpt-assets/mascot/fox_pose_2.webp',
        createdAt: Date.now(),
        books: [
            {
                id: 'openjlpt-soumatome-n3',
                name: 'Nihongo Soumatome N3 Từ Vựng',
                subtitle: '6 Tuần Chinh Phục N3 (36 bài học)',
                description: 'Lộ trình 6 tuần học từ vựng N3 phân theo chủ đề chuyên sâu kèm câu ví dụ mẫu',
                wordCount: soumatomeN3Lessons.reduce((sum, l) => sum + l.vocab.length, 0).toString(),
                color: '#8B5CF6',
                order: 0,
                createdAt: Date.now(),
                chapters: [{
                    id: 'soumatome-n3-ch1',
                    name: 'Tổng hợp 6 Tuần Soumatome N3',
                    order: 0,
                    createdAt: Date.now(),
                    lessons: soumatomeN3Lessons
                }]
            }
        ]
    };

    // Themed Topics Group
    const topicsByLevel = { N5: [], N4: [], N3: [], N2: [], N1: [], Other: [] };
    for (const set of topicSets) {
        const lvl = set.jlptLevel || 'Other';
        if (topicsByLevel[lvl]) topicsByLevel[lvl].push(set);
        else topicsByLevel.Other.push(set);
    }

    const topicBooks = Object.keys(topicsByLevel).filter(lvl => topicsByLevel[lvl].length > 0).map((lvl, bIdx) => {
        const sets = topicsByLevel[lvl];
        const lessons = sets.map((s, idx) => {
            const vocab = (s.cards || []).map((c, cIdx) => normalizeCard(c, `topic-${lvl.toLowerCase()}-${s.id}-w${cIdx + 1}`, lvl));

            return {
                id: `topic-set-${s.id}`,
                title: s.title,
                name: s.title,
                order: idx + 1,
                vocab: vocab
            };
        });

        const colors = { N5: '#10B981', N4: '#3B82F6', N3: '#0EA5E9', N2: '#F59E0B', N1: '#EF4444', Other: '#8B5CF6' };

        return {
            id: `openjlpt-topics-${lvl.toLowerCase()}`,
            name: `Chủ đề ${lvl}`,
            subtitle: `${lessons.length} bộ chủ đề thực tế`,
            description: `Tổng hợp từ vựng ${lvl} phân loại theo từng chủ đề đời sống và công việc kèm câu ví dụ`,
            wordCount: lessons.reduce((sum, l) => sum + l.vocab.length, 0).toString(),
            color: colors[lvl] || '#6366F1',
            order: bIdx,
            createdAt: Date.now(),
            chapters: [{
                id: `topics-${lvl.toLowerCase()}-ch1`,
                name: `Chủ đề từ vựng ${lvl}`,
                order: 0,
                createdAt: Date.now(),
                lessons: lessons
            }]
        };
    });

    const topicsGroup = {
        id: 'openjlpt-topics-group',
        name: 'Từ Vựng Theo Chủ Đề',
        subtitle: 'Tuyển tập từ vựng tiếng Nhật theo các chủ đề chuyên biệt từ N5 đến N1 (OpenJLPT)',
        order: 3,
        imageUrl: 'https://d1yuzhlfxjxgbk.cloudfront.net/openjlpt-assets/mascot/fox_pose_2.webp',
        createdAt: Date.now(),
        books: topicBooks
    };

    // Normalize existing books to also ensure example & exampleMeaning & sinoVietnamese exist
    for (const g of existingBooksData) {
        for (const b of (g.books || [])) {
            for (const ch of (b.chapters || [])) {
                for (const l of (ch.lessons || [])) {
                    if (Array.isArray(l.vocab)) {
                        l.vocab = l.vocab.map((v, idx) => normalizeCard(v, `${l.id}-w${idx + 1}`, b.name || 'N5'));
                    }
                }
            }
        }
    }

    // Insert new groups
    existingBooksData.splice(1, 0, minnaGroup);
    existingBooksData.splice(2, 0, soumatomeGroup);
    existingBooksData.push(topicsGroup);

    // Save updated books_data.json
    fs.writeFileSync(BOOKS_DATA_PATH, JSON.stringify(existingBooksData), 'utf-8');
    console.log(`\n🎉 Saved updated books to ${BOOKS_DATA_PATH} (${(fs.statSync(BOOKS_DATA_PATH).size / (1024 * 1024)).toFixed(2)} MB)`);

    // 2. Merge all newly crawled words into vocab_data.json
    console.log('\n🔄 Merging new vocabulary into vocab_data.json...');
    const existingVocab = fs.existsSync(VOCAB_DATA_PATH) ? JSON.parse(fs.readFileSync(VOCAB_DATA_PATH, 'utf-8')) : [];
    const vocabMap = new Map();

    // Index existing
    existingVocab.forEach(v => {
        const norm = (v.word || '').trim();
        if (norm) {
            const normalized = normalizeCard(v, v.id || `v-${Math.random().toString(36).slice(2)}`, v.level || 'N5');
            vocabMap.set(norm, normalized);
        }
    });

    let addedCount = 0;
    let updatedCount = 0;

    // Merge all crawled cards
    for (const s of allSets) {
        const lvl = s.jlptLevel || 'N5';
        for (const c of s.cards || []) {
            const term = c.term || '';
            const reading = c.reading || '';
            const formatted = formatWordWithFurigana(term, reading);
            if (!formatted) continue;

            const normalizedCard = normalizeCard(c, `openjlpt-vocab-${c.id || Math.random().toString(36).slice(2)}`, lvl);

            if (vocabMap.has(formatted)) {
                const existing = vocabMap.get(formatted);
                // Enhance existing with example if missing
                if (!existing.example && normalizedCard.example) {
                    existing.example = normalizedCard.example;
                    existing.exampleMeaning = normalizedCard.exampleMeaning;
                    existing.exampleSentence = normalizedCard.example;
                    existing.exampleTranslation = normalizedCard.exampleMeaning;
                    updatedCount++;
                }
                if (!existing.sinoVietnamese && normalizedCard.sinoVietnamese) {
                    existing.sinoVietnamese = normalizedCard.sinoVietnamese;
                    existing.sinoViet = normalizedCard.sinoVietnamese;
                }
            } else {
                vocabMap.set(formatted, normalizedCard);
                addedCount++;
            }
        }
    }

    const finalVocabList = Array.from(vocabMap.values());
    fs.writeFileSync(VOCAB_DATA_PATH, JSON.stringify(finalVocabList), 'utf-8');
    console.log(`🎉 Merged ${addedCount} new unique words and updated ${updatedCount} words in ${VOCAB_DATA_PATH}. Total words in vocab_data: ${finalVocabList.length} (${(fs.statSync(VOCAB_DATA_PATH).size / (1024 * 1024)).toFixed(2)} MB)`);

    // 3. Save dedicated openjlpt_vocab_sets.json
    const setsOutputPath = path.resolve(__dirname, '../public/data/openjlpt_vocab_sets.json');
    fs.writeFileSync(setsOutputPath, JSON.stringify(allSets), 'utf-8');
    console.log(`🎉 Saved dedicated ${allSets.length} OpenJLPT sets to ${setsOutputPath} (${(fs.statSync(setsOutputPath).size / (1024 * 1024)).toFixed(2)} MB)`);
}

main();
