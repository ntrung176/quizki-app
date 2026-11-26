import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const OUT_DIR = path.join(DATA_DIR, 'roadmap');

const readJson = (relPath, fallback = []) => {
    const p = path.join(DATA_DIR, relPath);
    if (!fs.existsSync(p)) return fallback;
    return JSON.parse(fs.readFileSync(p, 'utf8'));
};

const stripFuri = (str = '') => String(str).replace(/\[[^\]]*\]/g, '').trim();

const cleanWordText = (w = '') => String(w).split('（')[0].split('(')[0].trim();

const cleanHtml = (str = '') => {
    return String(str)
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<u[^>]*>(.*?)<\/u>/gi, '【$1】')
        .replace(/<b[^>]*>(.*?)<\/b>/gi, '$1')
        .replace(/<strong[^>]*>(.*?)<\/strong>/gi, '$1')
        .replace(/<span[^>]*>(.*?)<\/span>/gi, '$1')
        .replace(/<ruby>(.*?)<rt>(.*?)<\/rt>.*?<\/ruby>/gi, '$1[$2]')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
};

const extractKanjiChars = (text = '') => {
    const matches = String(text).match(/[\u4E00-\u9FAF\u3400-\u4DBF]/g) || [];
    return [...new Set(matches)];
};

const seededPick = (arr, startIdx, count) => {
    if (!Array.isArray(arr) || arr.length === 0) return [];
    const res = [];
    for (let i = 0; i < count && i < arr.length; i++) {
        res.push(arr[(startIdx + i) % arr.length]);
    }
    return res;
};

const makeDistractors = (correctVal, pool, count = 3) => {
    const chosen = new Set([correctVal]);
    const list = [];
    for (const cand of pool) {
        if (list.length >= count) break;
        if (!cand || chosen.has(cand)) continue;
        chosen.add(cand);
        list.push(cand);
    }
    return list;
};

const shuffleWithSeed = (items, seed) => {
    const arr = [...items];
    let s = Math.abs(seed || 1) + 1337;
    for (let i = arr.length - 1; i > 0; i--) {
        s = (s * 16807) % 2147483647;
        const j = s % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

const buildOptionSet = (correctVal, distractors, seed) => {
    const all = [correctVal, ...distractors.slice(0, 3)];
    const shuffled = shuffleWithSeed(all, seed);
    return {
        options: shuffled,
        correctIndex: shuffled.indexOf(correctVal)
    };
};

const stripInlineParens = (str = '') => String(str)
    .replace(/\[[^\]]*\]/g, '')
    .replace(/[（(][ぁ-んァ-ヶー・]+[）)]/g, '')
    .trim();

// Segment a Japanese sentence into Word-Bank chips (~3 to 6 tokens)
const tokenizeForWordBank = (sentence = '') => {
    const firstLine = stripInlineParens(sentence).split('\n')[0].trim();
    const firstSentence = firstLine.includes('。') ? (firstLine.split('。')[0] + '。') : firstLine;
    const cleaned = firstSentence.replace(/[\s　]+/g, '');
    if (cleaned.length < 4 || cleaned.length > 34) return null;

    // Split naturally around particles & punctuation while keeping meaningful chunks
    const rawTokens = cleaned
        .split(/(?<=は|が|を|に|へ|で|と|も|から|まで|より|ので|のに|けど|、|。)|(?=は|が|を|に|で|から|まで|。)/g)
        .filter(Boolean);

    // Merge overly tiny 1-char segments until we get 3..6 readable chips
    const merged = [];
    for (const tok of rawTokens) {
        if (merged.length > 0 && (tok === '。' || tok === '、' || (tok.length === 1 && !'はがをにへでとも'.includes(tok)))) {
            merged[merged.length - 1] += tok;
        } else {
            merged.push(tok);
        }
    }
    while (merged.length > 6) {
        let minIdx = 0;
        let minLen = 999;
        for (let i = 0; i < merged.length - 1; i++) {
            const sumLen = merged[i].length + merged[i + 1].length;
            if (sumLen < minLen) {
                minLen = sumLen;
                minIdx = i;
            }
        }
        merged.splice(minIdx, 2, merged[minIdx] + merged[minIdx + 1]);
    }
    if (merged.length < 3) {
        const mid = Math.ceil(cleaned.length / 3);
        const alt = [cleaned.slice(0, mid), cleaned.slice(mid, mid * 2), cleaned.slice(mid * 2)].filter(Boolean);
        return alt.length >= 3 ? alt : null;
    }
    return merged;
};

async function main() {
    console.log('🚀 Building comprehensive 10-stage Interactive Roadmap from real QuizKi datasets...');

    // 1. Load source corpora
    const kanjiData = readJson('kanji_data.json', []);
    const grammarData = readJson('grammar_data.json', []);
    const grammarHub = readJson('grammar_hub_curriculum.json', []);
    const booksData = readJson('books_data.json', []);
    const drillsData = readJson('drills_data.json', []);
    const yomimonoData = readJson('yomimono_data.json', []);

    // Index Kanji by character & level
    const kanjiByChar = new Map();
    const kanjiByLevel = { N5: [], N4: [], N3: [], N2: [], N1: [] };
    for (const k of kanjiData) {
        if (!k || !k.character) continue;
        const lvl = (k.level || k.jlpt || 'N5').toUpperCase();
        const item = {
            id: k.id,
            character: k.character,
            sinoViet: k.sinoViet || '',
            meaning: k.meaningVi || k.meaning || '',
            onyomi: k.onyomi || '',
            kunyomi: k.kunyomi || '',
            mnemonic: k.mnemonic || '',
            level: lvl,
            order: Number(k.openJlptOrder || 9999)
        };
        if (!kanjiByChar.has(k.character)) kanjiByChar.set(k.character, item);
        if (kanjiByLevel[lvl]) kanjiByLevel[lvl].push(item);
    }
    Object.values(kanjiByLevel).forEach(arr => arr.sort((a, b) => a.order - b.order));

    // Index Grammar master bank by id, pattern & level
    const grammarById = new Map();
    const grammarByPattern = new Map();
    const grammarByLevel = { N5: [], N4: [], N3: [], N2: [], N1: [] };
    const masterCategory = grammarData.find(g => g.id === 'master_bank') || grammarData[0];
    for (const lesson of (masterCategory?.lessons || [])) {
        for (const pt of (lesson.points || lesson.grammarPoints || [])) {
            if (!pt || !pt.id) continue;
            const lvl = (pt.level || 'N5').toUpperCase();
            const cleanPat = String(pt.pattern || '').replace(/<[^>]+>/g, '').trim();
            const entry = {
                id: pt.id,
                pattern: cleanPat,
                meaning: pt.meaning || pt.meaningShort || '',
                meaningShort: pt.meaningShort || pt.meaning || '',
                meaningFull: pt.meaningFull || '',
                level: lvl,
                examples: (pt.examples || []).map(ex => ({
                    ja: stripFuri(ex.ja || ''),
                    furigana: ex.furigana || '',
                    vi: ex.vi || ''
                })).filter(ex => ex.ja && ex.vi)
            };
            grammarById.set(pt.id, entry);
            const normKey = cleanPat.replace(/[~～〜\s・]/g, '');
            if (normKey && !grammarByPattern.has(normKey)) grammarByPattern.set(normKey, entry);
            if (grammarByLevel[lvl]) grammarByLevel[lvl].push(entry);
        }
    }

    const resolveCanonicalGrammar = (rawPattern, fallbackId, lvl, fallbackMeaning = '') => {
        const cleanPat = String(rawPattern || '').replace(/[~～〜\s・\(\)（）]/g, '');
        if (grammarById.has(fallbackId)) return grammarById.get(fallbackId);
        if (cleanPat && grammarByPattern.has(cleanPat)) return grammarByPattern.get(cleanPat);
        for (const candidate of (grammarByLevel[lvl] || [])) {
            const candClean = candidate.pattern.replace(/[~～〜\s・\(\)（）]/g, '');
            if (candClean && cleanPat && (cleanPat.includes(candClean) || candClean.includes(cleanPat))) {
                return candidate;
            }
        }
        return {
            id: fallbackId || `roadmap_g_${lvl}_${cleanPat.slice(0, 12)}`,
            pattern: rawPattern,
            meaning: fallbackMeaning,
            meaningShort: fallbackMeaning
        };
    };

    // Index Books -> normalized chapters
    const booksIndex = new Map();
    for (const group of booksData) {
        for (const book of (group.books || [])) {
            const key = `${group.name}::${book.name}`;
            const flatChapters = [];
            for (const ch of (book.chapters || [])) {
                const vocab = [];
                for (const ls of (ch.lessons || [])) {
                    for (const v of (ls.vocab || ls.cards || ls.words || [])) {
                        const word = cleanWordText(v.word || v.front);
                        const reading = v.reading || '';
                        const meaning = v.meaning || v.back || '';
                        if (!word || !meaning) continue;
                        vocab.push({
                            word,
                            reading: reading || word,
                            meaning,
                            sinoViet: v.sinoViet || v.sinoVietnamese || '',
                            example: cleanHtml((v.exampleSentence || v.example || '').replace(/_{2,}/g, word)),
                            exampleMeaning: v.exampleTranslation || v.exampleMeaning || '',
                            level: (v.level || '').toUpperCase()
                        });
                    }
                }
                if (vocab.length > 0) {
                    flatChapters.push({ title: ch.name || 'Chương học', vocab });
                }
            }
            booksIndex.set(key, flatChapters);
        }
    }

    // Index Drills & Yomimono & Grammar Hub
    const drillsByBai = new Map();
    for (const d of drillsData) {
        if (d.bai) drillsByBai.set(Number(d.bai), d);
    }
    const yomiByLevel = { N5: [], N4: [], N3: [], N2: [], N1: [] };
    for (const y of yomimonoData) {
        const lvl = (y.level || 'N5').toUpperCase();
        if (yomiByLevel[lvl]) yomiByLevel[lvl].push(y);
    }
    const gHubByLevel = { N5: [], N4: [], N3: [], N2: [], N1: [] };
    for (const gh of grammarHub) {
        const lvl = (gh.level || 'N5').toUpperCase();
        if (gHubByLevel[lvl]) gHubByLevel[lvl].push(gh);
    }

    // Load JLPT standalone questions per level & category
    const jlptPoolByLevel = {};
    for (const lvl of ['N5', 'N4', 'N3', 'N2', 'N1']) {
        const tests = readJson(`jlpt/${lvl.toLowerCase()}.json`, []);
        const pool = { kanji: [], vocabulary: [], grammar: [], reading: [], all: [] };
        for (const t of tests) {
            const skill = t.skillType || 'full';
            for (const sec of (t.sections || [])) {
                const secLow = (sec.title || '').toLowerCase();
                for (const q of (sec.questions || [])) {
                    if (q.imageUrl || q.audioUrl || (Array.isArray(q.subQuestions) && q.subQuestions.length > 0)) continue;
                    const prompt = cleanHtml(q.question || '');
                    const opts = (q.options || []).map(o => cleanHtml(o)).filter(Boolean);
                    if (!prompt || prompt.length > 260 || opts.length < 2 || opts.length > 4) continue;
                    if (typeof q.correctAnswer !== 'number' || q.correctAnswer < 0 || q.correctAnswer >= opts.length) continue;

                    const passage = cleanHtml(q.passage || sec.passage || '');
                    if (passage.length > 520) continue; // Keep concise for interactive cards

                    const item = {
                        id: q.id || `${t.id}_${prompt.slice(0, 12)}`,
                        testTitle: t.title || '',
                        prompt: passage ? `${q.questionVi ? q.questionVi + ' — ' : ''}${prompt}` : prompt,
                        passage: passage || undefined,
                        options: opts,
                        correctIndex: q.correctAnswer,
                        explanation: cleanHtml(q.explanation || (q.questionVi ? `Câu hỏi: ${q.questionVi}` : '') || `Đáp án đúng là "${opts[q.correctAnswer]}".`)
                    };

                    if (secLow.includes('kanji') || skill === 'kanji') pool.kanji.push(item);
                    else if (secLow.includes('ngữ pháp') || secLow.includes('grammar') || skill === 'grammar') pool.grammar.push(item);
                    else if (secLow.includes('đọc') || skill === 'reading' || passage) pool.reading.push(item);
                    else pool.vocabulary.push(item);
                    pool.all.push(item);
                }
            }
        }
        // Prefer questions that have Vietnamese explanations first
        for (const k of Object.keys(pool)) {
            pool[k].sort((a, b) => (b.explanation.length > 35 ? 1 : 0) - (a.explanation.length > 35 ? 1 : 0));
        }
        jlptPoolByLevel[lvl] = pool;
        console.log(`  JLPT ${lvl} pool -> kanji:${pool.kanji.length}, vocab:${pool.vocabulary.length}, grammar:${pool.grammar.length}, reading:${pool.reading.length}`);
    }

    // Track cursors per level so different lessons pull distinct items!
    const kanjiCursor = { N5: 0, N4: 0, N3: 0, N2: 0, N1: 0 };
    const jlptCursor = {
        N5: { k: 0, v: 0, g: 0, r: 0, a: 0 },
        N4: { k: 0, v: 0, g: 0, r: 0, a: 0 },
        N3: { k: 0, v: 0, g: 0, r: 0, a: 0 },
        N2: { k: 0, v: 0, g: 0, r: 0, a: 0 },
        N1: { k: 0, v: 0, g: 0, r: 0, a: 0 }
    };

    const nextJlptQuestions = (lvl, kind, count) => {
        const pool = jlptPoolByLevel[lvl]?.[kind]?.length > 0 ? jlptPoolByLevel[lvl][kind] : jlptPoolByLevel[lvl].all;
        const cKey = kind[0];
        const start = jlptCursor[lvl][cKey] || 0;
        const picked = seededPick(pool, start, count);
        jlptCursor[lvl][cKey] = (start + count) % Math.max(1, pool.length);
        return picked.map(q => ({
            type: q.passage ? 'reading' : 'choice',
            prompt: q.passage ? q.prompt : `[JLPT ${lvl}] ${q.prompt}`,
            passage: q.passage,
            badge: `Đề JLPT ${lvl}`,
            options: q.options,
            correctIndex: q.correctIndex,
            explanation: q.explanation
        }));
    };

    const linkKanjiFromWords = (vocabItems, lvl, limit = 4) => {
        const linked = [];
        const seen = new Set();
        for (const v of vocabItems) {
            for (const ch of extractKanjiChars(v.word)) {
                if (seen.has(ch)) continue;
                const kObj = kanjiByChar.get(ch);
                if (kObj) {
                    seen.add(ch);
                    linked.push({
                        id: kObj.id,
                        character: kObj.character,
                        sinoViet: kObj.sinoViet,
                        meaning: kObj.meaning,
                        onyomi: kObj.onyomi,
                        kunyomi: kObj.kunyomi
                    });
                    if (linked.length >= limit) return linked;
                }
            }
        }
        return linked;
    };

    // Build Vocab Lesson
    const buildVocabLesson = ({ id, unitId, title, shortTitle, desc, bookLabel, vocabItems, level, xp, seed }) => {
        const items = vocabItems.slice(0, 7);
        const linkedKanji = linkKanjiFromWords(items, level, 4);
        const meaningPool = items.map(v => v.meaning).concat(['Thư viện sách', 'Trường học', 'Công việc hàng ngày', 'Thể thao', 'Giao thông']);
        const questions = [];

        // Q1: Choice with audio
        if (items[0]) {
            const { options, correctIndex } = buildOptionSet(items[0].meaning, makeDistractors(items[0].meaning, meaningPool), seed + 1);
            questions.push({
                type: 'choice',
                prompt: `Từ "${items[0].word}" mang ý nghĩa nào sau đây?`,
                character: items[0].word,
                reading: items[0].reading,
                audio: items[0].reading || items[0].word,
                options,
                correctIndex,
                explanation: `${items[0].word} (${items[0].reading})${items[0].sinoViet ? ` [Hán Việt: ${items[0].sinoViet}]` : ''}: ${items[0].meaning}.${items[0].example ? ` Ví dụ: ${items[0].example}` : ''}`
            });
        }
        // Q2: Audio comprehension
        if (items[1]) {
            const wordPool = items.map(v => v.word);
            const { options, correctIndex } = buildOptionSet(items[1].word, makeDistractors(items[1].word, wordPool), seed + 2);
            questions.push({
                type: 'audio_choice',
                prompt: `Nghe phát âm và chọn từ đúng (${items[1].meaning}):`,
                audio: items[1].reading || items[1].word,
                reading: items[1].meaning,
                options,
                correctIndex,
                explanation: `${items[1].word} đọc là "${items[1].reading}", nghĩa là "${items[1].meaning}".`
            });
        }
        // Q3: Matching 4 pairs
        if (items.length >= 4) {
            questions.push({
                type: 'matching',
                prompt: `Nối nhanh từ vựng sách ${bookLabel} với nghĩa tiếng Việt:`,
                pairs: items.slice(0, 4).map(v => ({
                    left: v.reading && v.reading !== v.word ? `${v.word} (${v.reading})` : v.word,
                    right: v.meaning.split(';')[0].trim()
                }))
            });
        }
        // Q4: Word Bank or Typing from example sentence
        const exItem = items.find(v => v.example && v.example.length >= 5 && v.exampleMeaning);
        if (exItem) {
            const firstExMeaning = String(exItem.exampleMeaning).split('\n')[0].trim();
            const chips = tokenizeForWordBank(exItem.example);
            if (chips) {
                const traps = shuffleWithSeed(['ません', 'でした', 'は', 'を', 'から'].filter(t => !chips.includes(t)), seed + 9).slice(0, 2);
                questions.push({
                    type: 'word_bank',
                    prompt: `Sắp xếp các mảnh từ thành câu đúng: "${firstExMeaning}"`,
                    audio: stripInlineParens(exItem.example.split('\n')[0]),
                    chips,
                    traps,
                    target: chips.join(''),
                    explanation: `Câu hoàn chỉnh: ${stripInlineParens(exItem.example.split('\n')[0])} (${firstExMeaning})`
                });
            }
        } else if (items[2]) {
            questions.push({
                type: 'typing',
                prompt: `Gõ cách đọc (Hiragana/Kanji) cho từ có nghĩa "${items[2].meaning}":`,
                character: items[2].word,
                audio: items[2].reading || items[2].word,
                accept: [items[2].reading, items[2].word].filter(Boolean),
                hint: items[2].reading,
                explanation: `${items[2].word} đọc là ${items[2].reading}.`
            });
        }
        // Q5: Real JLPT Vocabulary question
        questions.push(...nextJlptQuestions(level, 'vocabulary', 1));

        return {
            id,
            unitId,
            lessonType: 'vocab',
            sourceBadge: bookLabel,
            title,
            shortTitle,
            desc,
            icon: '📖',
            xp,
            items: {
                vocab: items.map(v => ({
                    word: v.word,
                    reading: v.reading,
                    meaning: v.meaning,
                    sinoViet: v.sinoViet,
                    example: v.example,
                    exampleMeaning: v.exampleMeaning,
                    level
                })),
                kanji: linkedKanji,
                grammar: []
            },
            questions
        };
    };

    // Build Kanji Lesson
    const buildKanjiLesson = ({ id, unitId, title, shortTitle, desc, level, count = 5, xp, seed }) => {
        const list = kanjiByLevel[level] || [];
        const start = kanjiCursor[level] || 0;
        const picked = seededPick(list, start, count);
        kanjiCursor[level] = (start + count) % Math.max(1, list.length);

        const meaningPool = list.slice(0, 40).map(k => `${k.sinoViet} (${k.meaning})`).filter(Boolean);
        const questions = [];

        if (picked[0]) {
            const ans = `${picked[0].sinoViet ? picked[0].sinoViet + ' — ' : ''}${picked[0].meaning}`;
            const { options, correctIndex } = buildOptionSet(ans, makeDistractors(ans, meaningPool), seed + 3);
            questions.push({
                type: 'choice',
                prompt: `Chữ Hán「${picked[0].character}」có âm Hán Việt và nghĩa là gì?`,
                character: picked[0].character,
                audio: picked[0].kunyomi?.split(',')[0]?.replace(/\./g, '') || picked[0].onyomi?.split(',')[0] || picked[0].character,
                options,
                correctIndex,
                explanation: `${picked[0].character} (${picked[0].sinoViet}): ${picked[0].meaning}.${picked[0].mnemonic ? ` Mẹo nhớ: ${picked[0].mnemonic}` : ''}`
            });
        }
        if (picked[1]) {
            const readingSample = (picked[1].kunyomi || picked[1].onyomi || '').split(/[,、\s]+/).find(Boolean)?.replace(/\./g, '') || picked[1].character;
            const charPool = picked.map(k => `${k.character} (${k.sinoViet})`);
            const ans = `${picked[1].character} (${picked[1].sinoViet})`;
            const { options, correctIndex } = buildOptionSet(ans, makeDistractors(ans, charPool), seed + 4);
            questions.push({
                type: 'audio_choice',
                prompt: `Nghe âm đọc "${readingSample}" (nghĩa: ${picked[1].meaning}) và chọn Kanji đúng:`,
                audio: readingSample,
                options,
                correctIndex,
                explanation: `${picked[1].character} [${picked[1].sinoViet}] đọc On: ${picked[1].onyomi || '—'} / Kun: ${picked[1].kunyomi || '—'}.`
            });
        }
        if (picked.length >= 4) {
            questions.push({
                type: 'matching',
                prompt: `Ghép cặp ${picked.length >= 4 ? 4 : picked.length} chữ Kanji ${level} với âm Hán Việt & ý nghĩa:`,
                pairs: picked.slice(0, 4).map(k => ({
                    left: k.character,
                    right: `${k.sinoViet ? k.sinoViet + ' · ' : ''}${k.meaning.split(',')[0].trim()}`
                }))
            });
        }
        if (picked[2]) {
            const sinoNorm = (picked[2].sinoViet || '').trim();
            if (sinoNorm) {
                questions.push({
                    type: 'typing',
                    prompt: `Nhập âm Hán Việt của chữ「${picked[2].character}」(nghĩa: ${picked[2].meaning}):`,
                    character: picked[2].character,
                    accept: [sinoNorm, sinoNorm.toLowerCase()],
                    hint: sinoNorm,
                    explanation: `${picked[2].character} có âm Hán Việt là ${sinoNorm}.${picked[2].mnemonic ? ` (${picked[2].mnemonic})` : ''}`
                });
            }
        }
        questions.push(...nextJlptQuestions(level, 'kanji', 2));

        return {
            id,
            unitId,
            lessonType: 'kanji',
            sourceBadge: `Kanji ${level}`,
            title,
            shortTitle,
            desc,
            icon: '漢',
            xp,
            items: {
                vocab: [],
                kanji: picked.map(k => ({
                    id: k.id,
                    character: k.character,
                    sinoViet: k.sinoViet,
                    meaning: k.meaning,
                    onyomi: k.onyomi,
                    kunyomi: k.kunyomi
                })),
                grammar: []
            },
            questions
        };
    };

    // Build Grammar + Word Bank / Drills Lesson
    const buildGrammarLesson = ({ id, unitId, title, shortTitle, desc, hubLesson, drillItem, level, xp, seed }) => {
        const patterns = (hubLesson?.patterns || []).slice(0, 3);
        const canonicalGrammar = patterns.map((p, i) => {
            const res = resolveCanonicalGrammar(p.pattern, p.id || `${id}_g${i}`, level, p.meaning);
            return {
                id: res.id,
                pattern: res.pattern || p.pattern,
                meaning: p.meaning || res.meaning,
                meaningShort: res.meaningShort || p.meaning,
                level
            };
        });

        const questions = [];
        // 1. Add drills t1 (choice) & t2 (word_bank) & t3 (typing) if drillItem exists!
        if (drillItem && Array.isArray(drillItem.cards)) {
            const c0 = drillItem.cards[0];
            if (c0?.t1) {
                questions.push({
                    type: 'choice',
                    prompt: `Điền phần còn thiếu để hoàn thành câu "${c0.vi}":`,
                    character: c0.t1.stem,
                    audio: stripFuri(c0.t3?.target || c0.t1.stem),
                    options: c0.t1.choices,
                    correctIndex: c0.t1.answer,
                    explanation: c0.why || c0.vi
                });
            }
            const c1 = drillItem.cards[1] || c0;
            if (c1?.t2) {
                if ((c1.t2.chips || []).length >= 2) {
                    questions.push({
                        type: 'word_bank',
                        prompt: `Ghép thẻ từ thành câu tiếng Nhật chuẩn: "${c1.vi}"`,
                        audio: stripFuri(c1.t3?.target || c1.t2.chips.join('')),
                        chips: c1.t2.chips,
                        traps: c1.t2.traps || [],
                        target: stripFuri(c1.t3?.target || c1.t2.chips.join('')),
                        explanation: c1.why || `Đáp án đúng: ${c1.t3?.target || c1.t2.chips.join('')}`
                    });
                } else if ((c1.t2.chips || []).length === 1 && (c1.t2.traps || []).length >= 1) {
                    const correctChip = c1.t2.chips[0];
                    const { options, correctIndex } = buildOptionSet(correctChip, c1.t2.traps.slice(0, 3), seed + 31);
                    questions.push({
                        type: 'choice',
                        prompt: `Chọn đáp án đúng cho "${c1.vi}":`,
                        audio: stripFuri(correctChip),
                        options,
                        correctIndex,
                        explanation: c1.why || `Đáp án đúng: ${correctChip}`
                    });
                }
            }
            const c2 = drillItem.cards[2] || c0;
            if (c2?.t3) {
                questions.push({
                    type: 'typing',
                    prompt: `Dịch & gõ câu tiếng Nhật tương ứng với: "${c2.vi}"`,
                    audio: stripFuri(c2.t3.target),
                    accept: [c2.t3.target, stripFuri(c2.t3.target), ...(c2.t3.accept || [])],
                    hint: stripFuri(c2.t3.target),
                    explanation: c2.why || `Đáp án chuẩn: ${c2.t3.target}`
                });
            }
        }

        // Supplement with grammarHub patterns -> Word Bank & Choice
        if (questions.length < 3 && patterns.length > 0) {
            const patPool = (gHubByLevel[level] || []).flatMap(x => (x.patterns || []).map(p => p.meaning)).filter(Boolean);
            for (const p of patterns) {
                const { options, correctIndex } = buildOptionSet(p.meaning, makeDistractors(p.meaning, patPool), seed + 7);
                questions.push({
                    type: 'choice',
                    prompt: `Mẫu ngữ pháp「${p.pattern}」diễn đạt ý nghĩa gì?`,
                    character: p.pattern,
                    audio: p.examples?.[0]?.sentence ? stripFuri(p.examples[0].sentence) : '',
                    options,
                    correctIndex,
                    explanation: p.explanation || `${p.pattern}: ${p.meaning}`
                });
                const ex = p.examples?.[0];
                if (ex?.sentence && ex?.translation) {
                    const firstTr = String(ex.translation).split('\n')[0].trim();
                    const chips = tokenizeForWordBank(ex.sentence);
                    if (chips) {
                        questions.push({
                            type: 'word_bank',
                            prompt: `Sắp xếp các mảnh từ theo nghĩa: "${firstTr}"`,
                            audio: stripInlineParens(ex.sentence.split('\n')[0]),
                            chips,
                            traps: shuffleWithSeed(['こと', 'もの', 'たり', 'けれど'].filter(t => !chips.includes(t)), seed + 11).slice(0, 2),
                            target: chips.join(''),
                            explanation: `${stripInlineParens(ex.sentence)} (${firstTr})`
                        });
                    }
                }
            }
        }

        // Always include 2 authentic JLPT grammar questions!
        questions.push(...nextJlptQuestions(level, 'grammar', 2));

        // Pull any vocab words from readingPassage / drill examples if available
        const kanjiFound = linkKanjiFromWords(patterns.map(p => ({ word: p.pattern + (p.examples?.[0]?.sentence || '') })), level, 3);

        return {
            id,
            unitId,
            lessonType: 'grammar',
            sourceBadge: `Ngữ pháp ${level}`,
            title,
            shortTitle,
            desc,
            icon: '🧩',
            xp,
            items: {
                vocab: [],
                kanji: kanjiFound,
                grammar: canonicalGrammar
            },
            questions: questions.slice(0, 6)
        };
    };

    // Build Listening & Conversation Lesson
    const buildListeningLesson = ({ id, unitId, title, shortTitle, desc, drillItem, vocabSample, level, xp, seed }) => {
        const questions = [];
        const extractVocab = [];

        if (drillItem && Array.isArray(drillItem.listen)) {
            for (const ls of drillItem.listen.slice(0, 3)) {
                questions.push({
                    type: 'audio_choice',
                    prompt: `Nghe hội thoại và trả lời: ${ls.ask}`,
                    audio: ls.tts || stripFuri(ls.script || ''),
                    scriptHint: ls.script,
                    options: ls.choices,
                    correctIndex: ls.answer,
                    explanation: `${ls.script ? `Nội dung: ${ls.script} — ` : ''}${ls.why || ''}`
                });
            }
        }

        const audioSamples = (vocabSample || []).filter(v => v.example && v.exampleMeaning).slice(0, 3);
        const allMeanings = (vocabSample || []).map(v => v.exampleMeaning || v.meaning).filter(Boolean);
        for (const s of audioSamples) {
            extractVocab.push({ word: s.word, reading: s.reading, meaning: s.meaning, level });
            if (questions.length < 5) {
                const { options, correctIndex } = buildOptionSet(s.exampleMeaning, makeDistractors(s.exampleMeaning, allMeanings), seed + questions.length + 5);
                questions.push({
                    type: 'audio_choice',
                    prompt: `Nghe câu ví dụ với từ「${s.word}」và chọn nghĩa đúng:`,
                    character: s.word,
                    reading: s.reading,
                    audio: stripFuri(s.example),
                    options,
                    correctIndex,
                    explanation: `${s.example} — ${s.exampleMeaning}`
                });
            }
        }

        while (questions.length < 4 && (vocabSample || [])[questions.length]) {
            const v = vocabSample[questions.length];
            extractVocab.push({ word: v.word, reading: v.reading, meaning: v.meaning, level });
            const { options, correctIndex } = buildOptionSet(v.meaning, makeDistractors(v.meaning, vocabSample.map(x => x.meaning)), seed + questions.length);
            questions.push({
                type: 'audio_choice',
                prompt: `Nghe phát âm và chọn ý nghĩa chính xác:`,
                audio: v.reading || v.word,
                options,
                correctIndex,
                explanation: `${v.word} (${v.reading}): ${v.meaning}`
            });
        }

        return {
            id,
            unitId,
            lessonType: 'listening',
            sourceBadge: `Nghe hiểu ${level}`,
            title,
            shortTitle,
            desc,
            icon: '🎧',
            xp,
            items: {
                vocab: extractVocab.slice(0, 5),
                kanji: linkKanjiFromWords(extractVocab, level, 3),
                grammar: []
            },
            questions
        };
    };

    // Build JLPT + Reading Practice Lesson (or Milestone)
    const buildJlptLesson = ({ id, unitId, title, shortTitle, desc, level, yomiItem, hubLesson, vocabSample, kanjiCount = 3, isMilestone = false, xp, seed }) => {
        const questions = [];
        if (yomiItem?.passages?.[0]) {
            const p0 = yomiItem.passages[0];
            const textBody = cleanHtml(p0.japanese || p0.text || '').slice(0, 440);
            const q0 = p0.questions?.[0];
            if (q0 && Array.isArray(q0.options) && q0.options.length >= 2 && typeof q0.correctAnswer === 'number') {
                questions.push({
                    type: 'reading',
                    prompt: cleanHtml(q0.question || 'Đọc đoạn văn và chọn đáp án đúng:'),
                    passage: textBody,
                    badge: `Đọc hiểu ${level}`,
                    options: q0.options.map(cleanHtml),
                    correctIndex: q0.correctAnswer,
                    explanation: cleanHtml(q0.explanation || p0.vietnamese || '')
                });
            }
        }

        if (questions.length === 0 && hubLesson?.readingPassage?.japanese && hubLesson?.readingPassage?.vietnamese) {
            const rp = hubLesson.readingPassage;
            const chips = tokenizeForWordBank(rp.japanese.split('。')[0] + '。');
            if (chips) {
                questions.push({
                    type: 'word_bank',
                    prompt: `Đọc hiểu & ghép câu mở đầu đoạn văn "${rp.titleVi || level}":`,
                    passage: rp.japanese.slice(0, 320),
                    audio: rp.japanese.split('。')[0],
                    chips,
                    traps: ['けれども', 'について'],
                    target: chips.join(''),
                    explanation: `Bản dịch: ${rp.vietnamese.slice(0, 220)}`
                });
            }
        }

        questions.push(
            ...nextJlptQuestions(level, 'reading', isMilestone ? 2 : 1),
            ...nextJlptQuestions(level, 'grammar', isMilestone ? 2 : 1),
            ...nextJlptQuestions(level, 'kanji', 1),
            ...nextJlptQuestions(level, 'vocabulary', 1)
        );

        const sVocab = (vocabSample || []).slice(0, 5).map(v => ({
            word: v.word, reading: v.reading, meaning: v.meaning, level
        }));
        const sGrammar = (hubLesson?.patterns || []).slice(0, 2).map((p, i) => {
            const r = resolveCanonicalGrammar(p.pattern, p.id || `${id}_mg${i}`, level, p.meaning);
            return { id: r.id, pattern: r.pattern || p.pattern, meaning: p.meaning || r.meaning, meaningShort: r.meaningShort || p.meaning, level };
        });

        const listK = kanjiByLevel[level] || [];
        const startK = kanjiCursor[level] || 0;
        const pickedK = seededPick(listK, startK, kanjiCount).map(k => ({
            id: k.id, character: k.character, sinoViet: k.sinoViet, meaning: k.meaning, onyomi: k.onyomi, kunyomi: k.kunyomi
        }));

        return {
            id,
            unitId,
            lessonType: isMilestone ? 'milestone' : 'jlpt',
            sourceBadge: isMilestone ? `Vượt ải ${level} 👑` : `Thực chiến JLPT ${level}`,
            title,
            shortTitle,
            desc,
            icon: isMilestone ? '👑' : '📝',
            xp,
            isMilestone,
            items: {
                vocab: sVocab,
                kanji: pickedK,
                grammar: sGrammar
            },
            questions: questions.slice(0, isMilestone ? 7 : 5)
        };
    };

    // Helper: enrich legacy Stage 1-5 files so existing completed lesson IDs keep exact backward compatibility + canonical SRS IDs
    const loadLegacyStage = async (fileName) => {
        const fileUrl = pathToFileURL(path.join(process.cwd(), 'src', 'data', 'roadmap', 'jaStages', fileName)).href;
        const mod = await import(fileUrl);
        return Object.values(mod)[0];
    };

    const enrichLegacyLessons = (lessons, lvl, unitId) => {
        return lessons.map(ls => ({
            ...ls,
            unitId,
            lessonType: ls.isMilestone ? 'milestone' : (ls.items?.kanji?.length > 0 && ls.items?.grammar?.length > 0 ? 'grammar' : 'vocab'),
            sourceBadge: ls.isMilestone ? `Tổng kết ${lvl}` : (ls.shortTitle?.includes('あ') || ls.shortTitle?.includes('Dakuon') ? 'Kana Nền Tảng' : `Minna ${lvl}`),
            items: {
                vocab: (ls.items?.vocab || []).map(v => ({ ...v, level: lvl })),
                kanji: (ls.items?.kanji || []).map(k => {
                    const canon = kanjiByChar.get(k.character);
                    return canon ? { ...k, id: canon.id, level: canon.level } : k;
                }),
                grammar: (ls.items?.grammar || []).map(g => {
                    const canon = resolveCanonicalGrammar(g.pattern, g.id, lvl, g.meaning);
                    return { ...g, id: canon.id, level: canon.level || lvl };
                })
            }
        }));
    };

    // Helper: create a multi-lesson Unit from a textbook chapter + grammar + kanji + drills + JLPT
    const buildUnitBlock = ({ stageNum, unitIdx, unitTitle, unitSubtitle, bookLabel, vocabChapter, level, hubStartIdx, baiList, yomiIdx }) => {
        const unitId = `ja_s${stageNum}_u${unitIdx}`;
        const vList = vocabChapter?.vocab || [];
        const half = Math.ceil(vList.length / 2);
        const hubA = (gHubByLevel[level] || [])[hubStartIdx % Math.max(1, (gHubByLevel[level] || []).length)];
        const hubB = (gHubByLevel[level] || [])[(hubStartIdx + 1) % Math.max(1, (gHubByLevel[level] || []).length)];
        const drillA = drillsByBai.get(baiList?.[0]);
        const drillB = drillsByBai.get(baiList?.[1] || baiList?.[0]);
        const yomi = (yomiByLevel[level] || [])[yomiIdx % Math.max(1, (yomiByLevel[level] || []).length)];

        const lessons = [
            buildVocabLesson({
                id: `${unitId}_vocab1`,
                unitId,
                title: `${bookLabel}: ${vocabChapter?.title || 'Từ vựng trọng tâm'} (P1)`,
                shortTitle: `${vocabChapter?.title?.replace(/^Chương \d+\s*[-:]\s*/i, '').slice(0, 20) || 'Từ vựng P1'}`,
                desc: `Học từ vựng cốt lõi kèm phát âm, câu ví dụ từ ${bookLabel} và tự động lưu vào SRS.`,
                bookLabel,
                vocabItems: vList.slice(0, Math.min(7, half)),
                level,
                xp: 25 + stageNum * 2,
                seed: stageNum * 100 + unitIdx * 10 + 1
            }),
            buildKanjiLesson({
                id: `${unitId}_kanji`,
                unitId,
                title: `Hán tự ${level} • Chuyên đề ${unitIdx}: Âm Hán Việt & Cách đọc`,
                shortTitle: `Kanji ${level} #${unitIdx}`,
                desc: `Luyện ghi nhớ chữ Hán ${level} với mẹo nhớ, âm On/Kun và câu hỏi Kanji chuẩn JLPT.`,
                level,
                count: 5,
                xp: 30 + stageNum * 2,
                seed: stageNum * 100 + unitIdx * 10 + 2
            }),
            buildGrammarLesson({
                id: `${unitId}_grammar`,
                unitId,
                title: `Ngữ pháp & Ghép câu: ${hubA?.titleVi || `Cấu trúc ${level}`}`,
                shortTitle: `${hubA?.titleJp?.slice(0, 20) || `Ngữ pháp #${unitIdx}`}`,
                desc: hubA?.descVi || `Thực hành ghép thẻ từ kiểu Duolingo, luyện gõ và câu hỏi ngữ pháp JLPT ${level}.`,
                hubLesson: hubA,
                drillItem: drillA,
                level,
                xp: 30 + stageNum * 2,
                seed: stageNum * 100 + unitIdx * 10 + 3
            }),
            buildListeningLesson({
                id: `${unitId}_listen`,
                unitId,
                title: `Nghe hiểu & Phản xạ: ${vocabChapter?.title?.slice(0, 24) || unitTitle}`,
                shortTitle: `Nghe phản xạ #${unitIdx}`,
                desc: `Nghe câu bản xứ từ giáo trình & bài tập nghe hiểu giúp phản xạ âm thanh tức thì.`,
                drillItem: drillB,
                vocabSample: vList.slice(half, half + 7),
                level,
                xp: 25 + stageNum * 2,
                seed: stageNum * 100 + unitIdx * 10 + 4
            }),
            buildJlptLesson({
                id: `${unitId}_jlpt`,
                unitId,
                title: `Đọc hiểu & Thực chiến Đề JLPT ${level} (#${unitIdx})`,
                shortTitle: `Đọc & Đề JLPT #${unitIdx}`,
                desc: `Rèn kỹ năng đọc hiểu & giải đề thi thật JLPT ${level} có giải thích chi tiết từng đáp án.`,
                level,
                yomiItem: yomi,
                hubLesson: hubB || hubA,
                vocabSample: vList.slice(Math.max(0, vList.length - 5)),
                isMilestone: false,
                xp: 35 + stageNum * 2,
                seed: stageNum * 100 + unitIdx * 10 + 5
            })
        ];

        return {
            id: unitId,
            title: unitTitle,
            subtitle: unitSubtitle,
            bookLabel,
            lessons
        };
    };

    // Load textbook chapters cleanly
    const irodori = booksIndex.get('Irodori::Nhập môn') || [];
    const minnaN5 = booksIndex.get('Minna no Nihongo::Minna no Nihongo N5') || [];
    const tangoN5 = booksIndex.get('2000 Từ Vựng Tango (N5 - N1)::Tango 1000 N5') || [];
    const daichiN5 = booksIndex.get('Daichi::N5') || [];
    const minnaN4 = booksIndex.get('Minna no Nihongo::Minna no Nihongo N4') || [];
    const tangoN4 = booksIndex.get('2000 Từ Vựng Tango (N5 - N1)::Tango 1500 N4') || [];
    const daichiN4 = booksIndex.get('Daichi::N4') || [];
    const mimikaraN3 = booksIndex.get('Mimikara Oboeru::Mimikara Oboeru N3') || [];
    const soumatomeN3 = booksIndex.get('Nihongo Soumatome N3::Nihongo Soumatome N3 Từ Vựng') || [];
    const tangoN3 = booksIndex.get('2000 Từ Vựng Tango (N5 - N1)::Tango 2000 N3') || [];
    const mimikaraN2 = booksIndex.get('Mimikara Oboeru::Mimikara Oboeru N2') || [];
    const tangoN2 = booksIndex.get('2000 Từ Vựng Tango (N5 - N1)::Tango 2500 N2') || [];
    const mimikaraN1 = booksIndex.get('Mimikara Oboeru::Mimikara Oboeru N1') || [];
    const tangoN1 = booksIndex.get('2000 Từ Vựng Tango (N5 - N1)::Tango 3000 N1') || [];

    const leg1 = await loadLegacyStage('stage1Kana.js');
    const leg2 = await loadLegacyStage('stage2Minna1_12.js');
    const leg3 = await loadLegacyStage('stage3Minna13_25.js');
    const leg4 = await loadLegacyStage('stage4Minna26_38.js');
    const leg5 = await loadLegacyStage('stage5Minna39_50.js');

    // Construct ALL 10 Comprehensive Stages
    const stageDefinitions = [
        {
            stage: 1,
            id: 'ja_stage_1',
            jlptLevel: 'Kana',
            title: 'Chặng 1: Bảng Chữ Cái Kana & Giao Tiếp Đầu Đời',
            sub: 'Làm chủ Hiragana, Katakana, biến âm & các bài thực hành Irodori Nhập môn.',
            icon: '🌸',
            color: 'rose',
            units: [
                {
                    id: 'ja_s1_u1',
                    title: 'Chương 1: 46 Âm Kana & Phát Âm Chuẩn',
                    subtitle: 'Bảng chữ cái nền tảng và các cụm từ chào hỏi sinh tồn',
                    bookLabel: 'Kana Cơ Bản',
                    lessons: enrichLegacyLessons(leg1.lessons, 'N5', 'ja_s1_u1')
                },
                buildUnitBlock({
                    stageNum: 1, unitIdx: 2,
                    unitTitle: 'Chương 2: Giao Tiếp Đời Sống (Giáo trình Irodori)',
                    subtitle: 'Làm quen hội thoại thực tế tại Nhật Bản qua bộ sách Irodori Nhập môn',
                    bookLabel: 'Irodori Nhập môn',
                    vocabChapter: irodori[0] || tangoN5[0],
                    level: 'N5', hubStartIdx: 0, baiList: [1, 2], yomiIdx: 0
                })
            ]
        },
        {
            stage: 2,
            id: 'ja_stage_2',
            jlptLevel: 'N5',
            title: 'Chặng 2: N5 Sơ Cấp — Minna 1-12 & Tango 1000',
            sub: 'Đại từ, thời gian, phương hướng, tính từ N5 & từ vựng Tango 1000 phần 1.',
            icon: '🌱',
            color: 'sky',
            units: [
                {
                    id: 'ja_s2_u1',
                    title: 'Chương 1: Minna no Nihongo Nền Tảng (Bài 1 - 12)',
                    subtitle: '100 từ vựng & Kanji cốt lõi Minna sơ cấp phần 1',
                    bookLabel: 'Minna no Nihongo N5',
                    lessons: enrichLegacyLessons(leg2.lessons.slice(0, 6), 'N5', 'ja_s2_u1')
                },
                buildUnitBlock({
                    stageNum: 2, unitIdx: 2,
                    unitTitle: 'Chương 2: Mở Rộng Từ Vựng Tango 1000 & Ngữ Cảnh Thực Tế',
                    subtitle: 'Tự giới thiệu, gia đình, sở thích & bài luyện nghe Minna',
                    bookLabel: 'Tango 1000 N5',
                    vocabChapter: tangoN5[0] || minnaN5[0],
                    level: 'N5', hubStartIdx: 2, baiList: [5, 7], yomiIdx: 2
                }),
                buildUnitBlock({
                    stageNum: 2, unitIdx: 3,
                    unitTitle: 'Chương 3: Đời Sống Hàng Ngày (Tango 1000 Chương 2)',
                    subtitle: 'Thời gian biểu, ăn uống, mua sắm & đề thi thật JLPT N5',
                    bookLabel: 'Tango 1000 N5',
                    vocabChapter: tangoN5[2] || minnaN5[1],
                    level: 'N5', hubStartIdx: 5, baiList: [9, 11], yomiIdx: 5
                })
            ],
            milestoneLesson: enrichLegacyLessons([leg2.lessons[6]], 'N5', 'ja_s2_u3')[0]
        },
        {
            stage: 3,
            id: 'ja_stage_3',
            jlptLevel: 'N5',
            title: 'Chặng 3: N5 Hoàn Thiện & Thực Chiến JLPT N5',
            sub: 'Thể Te, Nai, Ta, thể Thông thường, Daichi N5 & chinh phục trọn vẹn JLPT N5.',
            icon: '🌿',
            color: 'emerald',
            units: [
                {
                    id: 'ja_s3_u1',
                    title: 'Chương 1: Làm Chủ Các Thể Động Từ N5 (Minna 13 - 25)',
                    subtitle: 'Thể Te, thể Nai, thể Ta & mệnh đề định ngữ',
                    bookLabel: 'Minna no Nihongo N5',
                    lessons: enrichLegacyLessons(leg3.lessons.slice(0, 6), 'N5', 'ja_s3_u1')
                },
                buildUnitBlock({
                    stageNum: 3, unitIdx: 2,
                    unitTitle: 'Chương 2: Từ Vựng Giao Tiếp Daichi N5 & Trải Nghiệm',
                    subtitle: 'Du lịch, thời tiết, phương hướng & luyện nghe phản xạ N5',
                    bookLabel: 'Daichi N5',
                    vocabChapter: daichiN5[4] || minnaN5[3],
                    level: 'N5', hubStartIdx: 13, baiList: [14, 17], yomiIdx: 12
                }),
                buildUnitBlock({
                    stageNum: 3, unitIdx: 3,
                    unitTitle: 'Chương 3: Tổng Ôn & Luyện Đề Thi Thử JLPT N5',
                    subtitle: 'Củng cố toàn bộ Kanji N5, Tango 1000 & đọc hiểu N5',
                    bookLabel: 'Tango 1000 N5',
                    vocabChapter: tangoN5[5] || minnaN5[4],
                    level: 'N5', hubStartIdx: 19, baiList: [21, 24], yomiIdx: 19
                })
            ],
            milestoneLesson: enrichLegacyLessons([leg3.lessons[6]], 'N5', 'ja_s3_u3')[0]
        },
        {
            stage: 4,
            id: 'ja_stage_4',
            jlptLevel: 'N4',
            title: 'Chặng 4: N4 Sơ Trung Cấp — Minna 26-38 & Tango 1500',
            sub: 'Thể khả năng, tự/tha động từ, thể ý chí, bị động & từ vựng N4 theo chủ đề.',
            icon: '⚡',
            color: 'amber',
            units: [
                {
                    id: 'ja_s4_u1',
                    title: 'Chương 1: Biến Hóa Động Từ N4 (Minna 26 - 38)',
                    subtitle: 'Thể khả năng, sai khiến nhận, tự động từ & mệnh lệnh',
                    bookLabel: 'Minna no Nihongo N4',
                    lessons: enrichLegacyLessons(leg4.lessons.slice(0, 5), 'N4', 'ja_s4_u1')
                },
                buildUnitBlock({
                    stageNum: 4, unitIdx: 2,
                    unitTitle: 'Chương 2: Từ Vựng Sinh Hoạt Tango 1500 N4',
                    subtitle: 'Mở rộng vốn từ gia đình, công ty & văn hóa Nhật N4',
                    bookLabel: 'Tango 1500 N4',
                    vocabChapter: tangoN4[0] || minnaN4[0],
                    level: 'N4', hubStartIdx: 0, baiList: [27, 30], yomiIdx: 0
                }),
                buildUnitBlock({
                    stageNum: 4, unitIdx: 3,
                    unitTitle: 'Chương 3: Ngữ Pháp Suy Đoán & Thực Chiến JLPT N4',
                    subtitle: 'Daichi N4 & câu hỏi trích xuất từ đề thi thật JLPT N4',
                    bookLabel: 'Daichi N4',
                    vocabChapter: daichiN4[2] || minnaN4[2],
                    level: 'N4', hubStartIdx: 6, baiList: [33, 36], yomiIdx: 6
                })
            ],
            milestoneLesson: enrichLegacyLessons([leg4.lessons[5]], 'N4', 'ja_s4_u3')[0]
        },
        {
            stage: 5,
            id: 'ja_stage_5',
            jlptLevel: 'N4',
            title: 'Chặng 5: N4 Nâng Cao & Kính Ngữ (Minna 39-50)',
            sub: 'Nguyên nhân khách quan, sai khiến, kính ngữ giao tiếp công sở & đề thi thử N4.',
            icon: '🌊',
            color: 'cyan',
            units: [
                {
                    id: 'ja_s5_u1',
                    title: 'Chương 1: Kính Ngữ & Giao Tiếp Nâng Cao (Minna 39 - 50)',
                    subtitle: 'Thể sai khiến, tôn kính ngữ, khiêm nhường ngữ chuẩn công sở',
                    bookLabel: 'Minna no Nihongo N4',
                    lessons: enrichLegacyLessons(leg5.lessons.slice(0, 4), 'N4', 'ja_s5_u1')
                },
                buildUnitBlock({
                    stageNum: 5, unitIdx: 2,
                    unitTitle: 'Chương 2: Từ Vựng Công Việc & Xã Hội (Tango 1500)',
                    subtitle: 'Tổng lực Kanji N4, đọc hiểu tốc độ & phản xạ nghe nói',
                    bookLabel: 'Tango 1500 N4',
                    vocabChapter: tangoN4[3] || minnaN4[3],
                    level: 'N4', hubStartIdx: 12, baiList: [40, 44], yomiIdx: 12
                }),
                buildUnitBlock({
                    stageNum: 5, unitIdx: 3,
                    unitTitle: 'Chương 3: Tốt Nghiệp N4 & Chuẩn Bị Bước Lên N3',
                    subtitle: 'Luyện câu khó Minna 45-50 & câu hỏi tuyển chọn JLPT N4',
                    bookLabel: 'Minna no Nihongo N4',
                    vocabChapter: minnaN4[4] || tangoN4[5],
                    level: 'N4', hubStartIdx: 18, baiList: [46, 49], yomiIdx: 18
                })
            ],
            milestoneLesson: enrichLegacyLessons([leg5.lessons[4]], 'N4', 'ja_s5_u3')[0]
        },
        {
            stage: 6,
            id: 'ja_stage_6',
            jlptLevel: 'N3',
            title: 'Chặng 6: N3 Trung Cấp Cốt Lõi (Mimikara Oboeru & SKM N3)',
            sub: 'Chuyển tiếp sang tiếng Nhật trung cấp với sách Mimikara N3, Kanji N3 & ngữ pháp SKM N3.',
            icon: '🔥',
            color: 'amber',
            units: [
                buildUnitBlock({
                    stageNum: 6, unitIdx: 1,
                    unitTitle: 'Chương 1: Danh Từ & Khái Niệm Xã Hội (Mimikara N3)',
                    subtitle: 'Mở rộng vốn từ Hán-Nhật trung cấp & Kanji N3 đầu tiên',
                    bookLabel: 'Mimikara Oboeru N3',
                    vocabChapter: mimikaraN3[0],
                    level: 'N3', hubStartIdx: 0, baiList: [51, 52], yomiIdx: 0
                }),
                buildUnitBlock({
                    stageNum: 6, unitIdx: 2,
                    unitTitle: 'Chương 2: Động Từ Đa Nghĩa & Biểu Hiện SKM N3',
                    subtitle: 'Luyện ghép câu ngữ pháp trung cấp & phân biệt sắc thái từ',
                    bookLabel: 'Mimikara Oboeru N3',
                    vocabChapter: mimikaraN3[2] || mimikaraN3[1],
                    level: 'N3', hubStartIdx: 4, baiList: [53, 55], yomiIdx: 4
                }),
                buildUnitBlock({
                    stageNum: 6, unitIdx: 3,
                    unitTitle: 'Chương 3: Tính Từ & Phó Từ Miêu Tả Trung Cấp',
                    subtitle: 'Làm chủ từ láy tượng thanh/tượng hình & đọc hiểu ngắn N3',
                    bookLabel: 'Mimikara Oboeru N3',
                    vocabChapter: mimikaraN3[5] || mimikaraN3[4],
                    level: 'N3', hubStartIdx: 8, baiList: [56, 58], yomiIdx: 8
                })
            ]
        },
        {
            stage: 7,
            id: 'ja_stage_7',
            jlptLevel: 'N3',
            title: 'Chặng 7: N3 Vững Vàng & Tổng Lực Luyện Đề N3',
            sub: 'Hoàn thiện Mimikara N3, Soumatome N3, Tango 2000 & đọc hiểu phân tích câu dài.',
            icon: '📚',
            color: 'sky',
            units: [
                buildUnitBlock({
                    stageNum: 7, unitIdx: 1,
                    unitTitle: 'Chương 1: Đời Sống & Quan Hệ Xã Hội (Tango 2000 N3)',
                    subtitle: 'Từ vựng giao tiếp tự nhiên nơi công sở & đời thường tại Nhật',
                    bookLabel: 'Tango 2000 N3',
                    vocabChapter: tangoN3[0] || mimikaraN3[8],
                    level: 'N3', hubStartIdx: 12, baiList: [59, 60], yomiIdx: 12
                }),
                buildUnitBlock({
                    stageNum: 7, unitIdx: 2,
                    unitTitle: 'Chương 2: Tinh Hoa Ngữ Pháp & Từ Vựng Soumatome N3',
                    subtitle: 'Các cặp từ hay nhầm lẫn & cấu trúc câu nối nguyên nhân, điều kiện',
                    bookLabel: 'Nihongo Soumatome N3',
                    vocabChapter: soumatomeN3[0] || tangoN3[3],
                    level: 'N3', hubStartIdx: 16, baiList: [54, 57], yomiIdx: 18
                }),
                buildUnitBlock({
                    stageNum: 7, unitIdx: 3,
                    unitTitle: 'Chương 3: Thực Chiến Đọc Hiểu & Chinh Phục JLPT N3',
                    subtitle: 'Đọc văn bản báo chí đơn giản & giải bộ câu hỏi thật JLPT N3',
                    bookLabel: 'Mimikara Oboeru N3',
                    vocabChapter: mimikaraN3[10] || tangoN3[6],
                    level: 'N3', hubStartIdx: 20, baiList: [58, 60], yomiIdx: 24
                })
            ]
        },
        {
            stage: 8,
            id: 'ja_stage_8',
            jlptLevel: 'N2',
            title: 'Chặng 8: N2 Trung Thượng Cấp (Mimikara N2 & SKM N2)',
            sub: 'Từ vựng học thuật, kinh tế - truyền thông, Kanji N2 & cấu trúc ngữ pháp chuyên sâu.',
            icon: '🎯',
            color: 'teal',
            units: [
                buildUnitBlock({
                    stageNum: 8, unitIdx: 1,
                    unitTitle: 'Chương 1: Danh Từ Chuyên Sâu (Mimikara Oboeru N2)',
                    subtitle: 'Hệ thống từ ghép Hán-Nhật 2 chữ & cấu trúc báo chí N2',
                    bookLabel: 'Mimikara Oboeru N2',
                    vocabChapter: mimikaraN2[0],
                    level: 'N2', hubStartIdx: 0, baiList: [], yomiIdx: 0
                }),
                buildUnitBlock({
                    stageNum: 8, unitIdx: 2,
                    unitTitle: 'Chương 2: Động Từ Ghép & Biểu Hiện Văn Viết N2',
                    subtitle: 'Cách kết hợp động từ phức (〜出す, 〜切る, 〜抜く...) & ngữ pháp SKM N2',
                    bookLabel: 'Mimikara Oboeru N2',
                    vocabChapter: mimikaraN2[3] || mimikaraN2[1],
                    level: 'N2', hubStartIdx: 6, baiList: [], yomiIdx: 6
                }),
                buildUnitBlock({
                    stageNum: 8, unitIdx: 3,
                    unitTitle: 'Chương 3: Sắc Thái Tính Từ & Diễn Đạt Trang Trọng N2',
                    subtitle: 'Phân biệt từ đồng nghĩa, kính ngữ thương mại & bài thi thật N2',
                    bookLabel: 'Mimikara Oboeru N2',
                    vocabChapter: mimikaraN2[6] || mimikaraN2[4],
                    level: 'N2', hubStartIdx: 12, baiList: [], yomiIdx: 12
                })
            ]
        },
        {
            stage: 9,
            id: 'ja_stage_9',
            jlptLevel: 'N2',
            title: 'Chặng 9: N2 Thực Chiến & Đọc Hiểu Chuyên Sâu',
            sub: 'Bứt phá với Tango 2500 N2, Kanji nâng cao, phó từ N2 & chiến lược đọc hiểu JLPT N2.',
            icon: '🚀',
            color: 'emerald',
            units: [
                buildUnitBlock({
                    stageNum: 9, unitIdx: 1,
                    unitTitle: 'Chương 1: Từ Vựng Giao Tiếp Doanh Nghiệp (Tango 2500 N2)',
                    subtitle: 'Từ vựng dùng trong công việc, thảo luận, đàm phán & viết email Nhật',
                    bookLabel: 'Tango 2500 N2',
                    vocabChapter: tangoN2[0] || mimikaraN2[8],
                    level: 'N2', hubStartIdx: 18, baiList: [], yomiIdx: 18
                }),
                buildUnitBlock({
                    stageNum: 9, unitIdx: 2,
                    unitTitle: 'Chương 2: Phó Từ, Liên Từ & Mạch Văn Học Thuật',
                    subtitle: 'Bắt nhịp logic lập luận trong bài đọc trung bình & dài N2',
                    bookLabel: 'Mimikara Oboeru N2',
                    vocabChapter: mimikaraN2[10] || tangoN2[4],
                    level: 'N2', hubStartIdx: 22, baiList: [], yomiIdx: 24
                }),
                buildUnitBlock({
                    stageNum: 9, unitIdx: 3,
                    unitTitle: 'Chương 3: Tổng Duyệt Kiến Thức JLPT N2',
                    subtitle: 'Ghép câu phức tạp, phân tích Kanji âm hiếm & đề thi N2 thực tế',
                    bookLabel: 'Tango 2500 N2',
                    vocabChapter: tangoN2[8] || mimikaraN2[12],
                    level: 'N2', hubStartIdx: 26, baiList: [], yomiIdx: 30
                })
            ]
        },
        {
            stage: 10,
            id: 'ja_stage_10',
            jlptLevel: 'N1',
            title: 'Chặng 10: N1 Thượng Cấp & Tinh Hoa JLPT Master',
            sub: 'Chinh phục đỉnh cao tiếng Nhật với Mimikara N1, Tango 3000, SKM N1 & đề JLPT N1.',
            icon: '🏆',
            color: 'amber',
            units: [
                buildUnitBlock({
                    stageNum: 10, unitIdx: 1,
                    unitTitle: 'Chương 1: Hán Tự & Danh Từ Học Thuật (Mimikara N1)',
                    subtitle: 'Làm chủ hệ thống từ vựng văn học, triết lý, luật pháp & khoa học N1',
                    bookLabel: 'Mimikara Oboeru N1',
                    vocabChapter: mimikaraN1[0],
                    level: 'N1', hubStartIdx: 0, baiList: [], yomiIdx: 0
                }),
                buildUnitBlock({
                    stageNum: 10, unitIdx: 2,
                    unitTitle: 'Chương 2: Ngữ Pháp Cổ Điển & Văn Phong Trang Trọng SKM N1',
                    subtitle: 'Các mẫu câu văn viết cổ điển (〜べからず, 〜んがため, 〜といえども...)',
                    bookLabel: 'Mimikara Oboeru N1',
                    vocabChapter: mimikaraN1[4] || tangoN1[0],
                    level: 'N1', hubStartIdx: 12, baiList: [], yomiIdx: 8
                }),
                buildUnitBlock({
                    stageNum: 10, unitIdx: 3,
                    unitTitle: 'Chương 3: Từ Vựng Tinh Hoa (Tango 3000 N1) & Phân Tích Chuyên Sâu',
                    subtitle: 'Sắc thái tinh tế, thành ngữ quán dụng & kỹ năng đọc báo bản xứ',
                    bookLabel: 'Tango 3000 N1',
                    vocabChapter: tangoN1[3] || mimikaraN1[9],
                    level: 'N1', hubStartIdx: 24, baiList: [], yomiIdx: 15
                }),
                buildUnitBlock({
                    stageNum: 10, unitIdx: 4,
                    unitTitle: 'Chương 4: Đại Chung Kết JLPT N1 Master',
                    subtitle: 'Thử thách tổng lực từ vựng - Kanji - Ngữ pháp - Đọc hiểu đỉnh cao N1',
                    bookLabel: 'Tango 3000 N1',
                    vocabChapter: tangoN1[8] || mimikaraN1[13],
                    level: 'N1', hubStartIdx: 35, baiList: [], yomiIdx: 20
                })
            ]
        }
    ];

    // Append a Milestone Lesson at the end of Stage 6..10 & ensure Stage 1..5 have clean milestone endings
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const manifestStages = [];
    let grandTotalLessons = 0;
    let grandTotalVocab = 0;
    let grandTotalKanji = 0;
    let grandTotalGrammar = 0;

    for (const def of stageDefinitions) {
        const units = [...def.units];
        if (def.stage === 1) {
            // Ensure Stage 1 finishes with an overall Chặng 1 milestone if not already ending on one
            const lastUnit = units[units.length - 1];
            if (!lastUnit.lessons[lastUnit.lessons.length - 1]?.isMilestone) {
                lastUnit.lessons.push(buildJlptLesson({
                    id: `ja_s1_master`,
                    unitId: lastUnit.id,
                    title: 'Thử Thách Tổng Kết Chặng 1: Kana & Irodori Nhập Môn',
                    shortTitle: 'Vượt ải Chặng 1+',
                    desc: 'Đọc hiểu nhập môn & câu hỏi tổng hợp chuẩn bị bước vào Chặng N5 Sơ Cấp!',
                    level: 'N5',
                    yomiItem: yomiByLevel.N5[1],
                    hubLesson: gHubByLevel.N5[1],
                    vocabSample: (irodori[0]?.vocab || []).slice(0, 5),
                    kanjiCount: 4,
                    isMilestone: true,
                    xp: 45,
                    seed: 199
                }));
            }
        } else if (def.milestoneLesson) {
            units[units.length - 1].lessons.push(def.milestoneLesson);
        } else {
            const lastUnit = units[units.length - 1];
            const lvl = def.jlptLevel;
            lastUnit.lessons.push(buildJlptLesson({
                id: `ja_s${def.stage}_milestone`,
                unitId: lastUnit.id,
                title: `Thử Thách Tổng Kết Chặng ${def.stage}: Chinh Phục ${lvl}`,
                shortTitle: `Vượt ải Chặng ${def.stage} 👑`,
                desc: `Bài thi vượt ải tổng hợp toàn bộ kiến thức Chặng ${def.stage} (${lvl}) để mở khóa chặng tiếp theo!`,
                level: lvl,
                yomiItem: (yomiByLevel[lvl] || [])[def.stage],
                hubLesson: (gHubByLevel[lvl] || [])[def.stage * 2 % Math.max(1, (gHubByLevel[lvl] || []).length)],
                vocabSample: lastUnit.lessons[0]?.items?.vocab || [],
                kanjiCount: 5,
                isMilestone: true,
                xp: 50 + def.stage * 5,
                seed: def.stage * 999
            }));
        }

        const allLessonsFlat = units.flatMap(u => u.lessons);
        grandTotalLessons += allLessonsFlat.length;

        const vocabSet = new Set();
        const kanjiSet = new Set();
        const grammarSet = new Set();
        allLessonsFlat.forEach(l => {
            (l.items?.vocab || []).forEach(v => vocabSet.add(v.word));
            (l.items?.kanji || []).forEach(k => kanjiSet.add(k.character));
            (l.items?.grammar || []).forEach(g => grammarSet.add(g.id || g.pattern));
        });
        grandTotalVocab += vocabSet.size;
        grandTotalKanji += kanjiSet.size;
        grandTotalGrammar += grammarSet.size;

        const stageChunkPayload = {
            stage: def.stage,
            id: def.id,
            jlptLevel: def.jlptLevel,
            title: def.title,
            sub: def.sub,
            icon: def.icon,
            color: def.color,
            stats: {
                totalLessons: allLessonsFlat.length,
                vocabCount: vocabSet.size,
                kanjiCount: kanjiSet.size,
                grammarCount: grammarSet.size
            },
            units,
            lessons: allLessonsFlat
        };

        const stageFileName = `ja_stage_${def.stage}.json`;
        fs.writeFileSync(path.join(OUT_DIR, stageFileName), JSON.stringify(stageChunkPayload), 'utf8');

        // Lightweight manifest entry (NO question bodies — fast < 40KB manifest!)
        manifestStages.push({
            stage: def.stage,
            id: def.id,
            jlptLevel: def.jlptLevel,
            title: def.title,
            sub: def.sub,
            icon: def.icon,
            color: def.color,
            chunkFile: stageFileName,
            stats: stageChunkPayload.stats,
            units: units.map(u => ({
                id: u.id,
                title: u.title,
                subtitle: u.subtitle,
                bookLabel: u.bookLabel,
                lessonIds: u.lessons.map(l => l.id)
            })),
            lessons: allLessonsFlat.map(l => ({
                id: l.id,
                unitId: l.unitId,
                lessonType: l.lessonType || 'vocab',
                sourceBadge: l.sourceBadge || '',
                title: l.title,
                shortTitle: l.shortTitle,
                desc: l.desc,
                icon: l.icon,
                xp: l.xp,
                isMilestone: !!l.isMilestone,
                itemCounts: {
                    vocab: (l.items?.vocab || []).length,
                    kanji: (l.items?.kanji || []).length,
                    grammar: (l.items?.grammar || []).length,
                    questions: (l.questions || []).length
                }
            }))
        });

        const stat = fs.statSync(path.join(OUT_DIR, stageFileName));
        console.log(`  ✅ Stage ${def.stage} (${def.jlptLevel}): ${units.length} units, ${allLessonsFlat.length} lessons | SRS items: ${vocabSet.size}V / ${kanjiSet.size}K / ${grammarSet.size}G | ${(stat.size / 1024).toFixed(1)} KB`);
    }

    const manifestPayload = {
        version: Date.now(),
        totalStages: manifestStages.length,
        totalLessons: grandTotalLessons,
        totals: {
            vocab: grandTotalVocab,
            kanji: grandTotalKanji,
            grammar: grandTotalGrammar
        },
        stages: manifestStages
    };

    const manifestPath = path.join(OUT_DIR, 'ja_manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifestPayload), 'utf8');
    const mStat = fs.statSync(manifestPath);
    console.log(`\n🎉 Generated ja_manifest.json (${(mStat.size / 1024).toFixed(1)} KB) -> ${grandTotalLessons} lessons across ${manifestStages.length} stages (${grandTotalVocab} Vocab, ${grandTotalKanji} Kanji, ${grandTotalGrammar} Grammar)!`);
}

main().catch((err) => {
    console.error('❌ Failed to build interactive roadmap:', err);
    process.exit(1);
});
