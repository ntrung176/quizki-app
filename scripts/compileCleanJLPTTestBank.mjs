import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data/openjlpt');
const PUBLIC_DATA_DIR = path.resolve(__dirname, '../public/data');
const JLPT_OUT_DIR = path.resolve(PUBLIC_DATA_DIR, 'jlpt');
const MASTER_TEST_FILE = path.resolve(PUBLIC_DATA_DIR, 'jlpt_data.json');

if (!fs.existsSync(JLPT_OUT_DIR)) fs.mkdirSync(JLPT_OUT_DIR, { recursive: true });

function isValidChoice(c) {
    if (!c || typeof c !== 'string') return false;
    const s = c.trim();
    if (!s) return false;
    if (/^Đáp án [ABCD1234]$/i.test(s)) return false;
    if (s.includes('Tác giả phản đối và phủ định')) return false;
    if (s.includes('Đoạn văn chỉ tập trung phê bình')) return false;
    if (s.includes('Nội dung chỉ là trải nghiệm cá nhân')) return false;
    return true;
}

// Deterministic seed-based shuffle
function seededShuffle(array, seedStr) {
    const arr = [...array];
    let hash = 0;
    for (let i = 0; i < seedStr.length; i++) {
        hash = ((hash << 5) - hash) + seedStr.charCodeAt(i);
        hash |= 0;
    }
    
    let currentSeed = Math.abs(hash) + 1;
    const rng = () => {
        const x = Math.sin(currentSeed++) * 10000;
        return x - Math.floor(x);
    };
    
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function resolveAndShuffleChoices(rawChoices, rawAns, seedKey) {
    const stringChoices = rawChoices.map(c => typeof c === 'object' ? (c.ansText || c.text || '') : String(c)).map(s => s.trim()).filter(Boolean);
    if (stringChoices.length < 2) return null;

    const ansStr = (rawAns ?? '').toString().trim();
    let correctChoiceText = '';

    const exactIdx = stringChoices.findIndex(c => c === ansStr);
    if (exactIdx !== -1) {
        correctChoiceText = stringChoices[exactIdx];
    } else {
        const num = parseInt(ansStr, 10);
        if (!isNaN(num) && num >= 1 && num <= stringChoices.length && String(num) === ansStr) {
            correctChoiceText = stringChoices[num - 1];
        } else if (typeof rawAns === 'number' && rawAns >= 0 && rawAns < stringChoices.length) {
            correctChoiceText = stringChoices[rawAns];
        } else {
            const noSpaceAns = ansStr.replace(/\s+/g, '');
            const fuzzyIdx = stringChoices.findIndex(c => c.replace(/\s+/g, '') === noSpaceAns);
            if (fuzzyIdx !== -1) {
                correctChoiceText = stringChoices[fuzzyIdx];
            } else {
                correctChoiceText = stringChoices[0];
            }
        }
    }

    const shuffled = seededShuffle(stringChoices, seedKey);
    const newCorrectIdx = shuffled.findIndex(c => c === correctChoiceText);

    return {
        options: shuffled,
        correctAnswer: newCorrectIdx >= 0 ? newCorrectIdx : 0
    };
}

function getAnalysisForQuestion(qMap, slug, tIdx, qIdx) {
    if (!qMap) return null;
    const tNum = tIdx + 1;
    const qNum = qIdx + 1;

    const candidates = [
        `${slug}-t${tNum}-q${qNum}`,
        `test-${tNum}-q${qNum}`,
        `test-${tNum}-q${qNum}-${qNum}`,
        `t${tNum}-q${qNum}`,
        `t-${tNum}-q-${qNum}`,
        `dethi-${tNum}-q${qNum}`,
        `q-${slug}-b${tNum}-${qNum}`,
        `q${qNum}`
    ];

    for (const k of candidates) {
        if (qMap[k]) return qMap[k];
    }
    return null;
}

const bookFriendlyTitles = {
    '1000_bunpou_n2': 'Quizki 1000 Câu Ngữ Pháp N2',
    '181_np_n2': 'Quizki 181 Điểm Ngữ Pháp Thực Chiến N2',
    '181_np_n3': 'Quizki 181 Điểm Ngữ Pháp Thực Chiến N3',
    '115dokkai_tanbun_n3': 'Quizki Đọc Hiểu Đoản Văn N3 (115 Bài)',
    '115dokkai_choubun_n3': 'Quizki Đọc Hiểu Trường Văn N3 (115 Bài)',
    '1740_moji_n2': 'Quizki 1740 Từ Vựng & Chữ Hán N2',
    '1200_moji_n3': 'Quizki 1200 Từ Vựng & Chữ Hán N3',
    '700_moji_n3': 'Quizki 700 Chữ Hán Cốt Lõi N3',
    '900_bunpou_n3': 'Quizki 900 Câu Ngữ Pháp Trọng Tâm N3',
    'pointmoji_n4': 'Quizki Chữ Hán Trọng Tâm N4',
    'pointvp_n4': 'Quizki Ngữ Pháp Trọng Tâm N4',
    '2026_bunpou_n4': 'Quizki Ngữ Pháp Thực Chiến N4',
    '2026_mojigoi_n4': 'Quizki Từ Vựng & Chữ Hán N4',
    'speed_goi_n1': 'Quizki Luyện Phản Xạ Speed Goi N1',
    'speed_goi_n2': 'Quizki Luyện Phản Xạ Speed Goi N2',
    'speed_goi_n3': 'Quizki Luyện Phản Xạ Speed Goi N3',
    'speedgoi_n4': 'Quizki Luyện Phản Xạ Speed Goi N4',
    'speed_kanji_n1': 'Quizki Luyện Chữ Hán Speed Kanji N1',
    'speed_kanji_n2': 'Quizki Luyện Chữ Hán Speed Kanji N2',
    'speed_kanji_n3': 'Quizki Luyện Chữ Hán Speed Kanji N3',
    'speed_bunpou_n1': 'Quizki Luyện Ngữ Pháp Cấp Tốc Speed N1',
    'speed_bunpou_n2': 'Quizki Luyện Ngữ Pháp Cấp Tốc Speed N2',
    'speed_bunpou_n3': 'Quizki Luyện Ngữ Pháp Cấp Tốc Speed N3',
    'speedvp_n4': 'Quizki Luyện Ngữ Pháp Cấp Tốc Speed N4',
    'speed_dokkai_n2': 'Quizki Luyện Đọc Hiểu Tốc Độ N2',
    'speed_dokkai_n3': 'Quizki Luyện Đọc Hiểu Tốc Độ N3',
    'speeddoc_n4': 'Quizki Luyện Đọc Hiểu Tốc Độ N4',
    'chokuzen_n1': 'Quizki Ôn Thi Cấp Tốc Sát Đề N1',
    'chokuzen_n2': 'Quizki Ôn Thi Cấp Tốc Sát Đề N2',
    'chokuzen_n3': 'Quizki Ôn Thi Cấp Tốc Sát Đề N3',
    'chokuzen_n4': 'Quizki Ôn Thi Cấp Tốc Sát Đề N4',
    'goukaku_n5': 'Quizki Bộ Đề Đỗ Ngay N5',
    'goukaku2_n4': 'Quizki Bộ Đề Đỗ Ngay N4',
    'goukakumoshi1_n4': 'Quizki Đề Thi Thử Mô Phỏng #1 N4',
    'goukakumoshi2_n4': 'Quizki Đề Thi Thử Mô Phỏng #2 N4',
    'goukakumoshi3_n4': 'Quizki Đề Thi Thử Mô Phỏng #3 N4',
    '15day_n1': 'Quizki Lộ Trình 15 Ngày Chinh Phục N1',
    '15day_n2': 'Quizki Lộ Trình 15 Ngày Chinh Phục N2',
    '15day_n3': 'Quizki Lộ Trình 15 Ngày Chinh Phục N3',
    '20day_n1': 'Quizki 20 Ngày Về Đích N1',
    '20day_n2': 'Quizki 20 Ngày Về Đích N2',
    '20day_n3': 'Quizki 20 Ngày Về Đích N3',
    'mimikara_n1': 'Quizki Mimikara Oboeru N1',
    'mimikara_n2': 'Quizki Mimikara Oboeru N2',
    'pata_goi_n1': 'Quizki Phân Dạng Từ Vựng Patan Goi N1',
    'power_bunpou_n1': 'Quizki Power Bunpou N1',
    'power_goi_n1': 'Quizki Power Goi N1',
    'power_kanji_n1': 'Quizki Power Kanji N1',
    'power_bunpou_n2': 'Quizki Power Bunpou N2',
    'power_moji_n2': 'Quizki Power Moji N2',
    'power_bunpou_n3': 'Quizki Power Bunpou N3',
    'power_mojigoi_n3': 'Quizki Power Moji-Goi N3',
    'tettei_moji_n1': 'Quizki Luyện Thi Triệt Để Tettei Moji N1',
    'toribunpou_n1': 'Quizki Toriaezu Bunpou N1',
    'torimoji_n1': 'Quizki Toriaezu Moji N1',
    'toriaezu_goi_n3': 'Quizki Từ Vựng Cấp Tốc Toriaezu N3',
    '1kaibunpou_n2': 'Quizki Tuyển Tập Ngữ Pháp 1-Kai N2',
    '1kaidokkai_n2': 'Quizki Đọc Hiểu Chuyên Sâu 1-Kai N2',
    '1kaigoi_n2': 'Quizki Từ Vựng Trọng Điểm 1-Kai N2',
    '1kaikanji_n2': 'Quizki Chữ Hán Trọng Điểm 1-Kai N2',
    '2nd_dokkai_n2': 'Quizki Luyện Đọc Hiểu 2nd Dokkai N2',
    '4nd_dokkai_n2': 'Quizki Luyện Đọc Hiểu 4nd Dokkai N2',
    '6nd_dokkai_n2': 'Quizki Luyện Đọc Hiểu 6nd Dokkai N2',
    '2nd_dokkai_n3': 'Quizki Luyện Đọc Hiểu 2nd Dokkai N3',
    '4nd_dokkai_n3': 'Quizki Luyện Đọc Hiểu 4nd Dokkai N3',
    '6nd_dokkai_n3': 'Quizki Luyện Đọc Hiểu 6nd Dokkai N3',
    '8nd_dokkai_n3': 'Quizki Luyện Đọc Hiểu 8nd Dokkai N3',
    '55new_n3': 'Quizki 55 Bài Đọc Hiểu Tuyển Chọn N3',
    '55cong_n4': 'Quizki 55 Bài Luyện Thi Tổng Hợp N4',
    'drilldrill_dokkai_n2': 'Quizki Drill & Drill Đọc Hiểu N2',
    'drilldrill_dokkai_n3': 'Quizki Drill & Drill Đọc Hiểu N3',
    'luyenthi_dochieu_n4': 'Quizki Luyện Thi Đọc Hiểu N4',
    'tw6kai_dokkai_n3': 'Quizki Đọc Hiểu TW 6-Kai N3'
};

const levelTests = {
    N1: [],
    N2: [],
    N3: [],
    N4: [],
    N5: []
};

// =========================================================================
// 1. PROCESS 148 OFFICIAL YOMIMONO LESSONS (N5 - N1)
// =========================================================================
console.log('📖 [1/3] Processing 148 Official Yomimono Reading Lessons (N5 - N1)...');
const yomimonoDir = path.join(DATA_DIR, 'yomimono');
let yomimonoTestsCount = 0;
let yomimonoQuestionsCount = 0;

if (fs.existsSync(yomimonoDir)) {
    const yFiles = fs.readdirSync(yomimonoDir).filter(f => /^\d+\.json$/.test(f));
    yFiles.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    for (const f of yFiles) {
        try {
            const data = JSON.parse(fs.readFileSync(path.join(yomimonoDir, f), 'utf8'));
            const baiNum = data.bai || parseInt(f.replace('.json', ''), 10);
            const level = (data.level || 'N5').toUpperCase();
            if (!levelTests[level]) continue;

            const passages = data.passages || [];
            if (passages.length === 0) continue;

            const sections = [];
            let totalQInBai = 0;

            passages.forEach((p, pIdx) => {
                const qs = p.questions || [];
                if (qs.length === 0) return;

                const normPassageSentences = (p.sentences || []).map(s => ({
                    jp: s.jp || '',
                    rawJp: s.jp || '',
                    vi: s.vi || '',
                    reading: s.reading || '',
                    vocab: (s.vocab || []).map(v => ({ w: v.w || '', read: v.read || '', vi: v.vi || '' })),
                    grammar: (s.grammar || []).map(g => ({ point: g.point || '', vi: g.vi || '' }))
                }));

                const passageDataObj = {
                    title: p.title || `Bài đọc ${pIdx + 1}`,
                    titleVi: p.titleVi || '',
                    japanese: p.japanese || '',
                    rawJapanese: p.japanese || '',
                    vietnamese: p.vietnamese || '',
                    sentences: normPassageSentences,
                    grammarPoints: normPassageSentences.flatMap(s => s.grammar || []),
                    vocabList: normPassageSentences.flatMap(s => s.vocab || [])
                };

                const secQuestions = [];

                qs.forEach((q, qIdx) => {
                    const rawOptions = (q.options || []).filter(isValidChoice);
                    if (rawOptions.length < 2) return;

                    const seedKey = `yomimono-b${baiNum}-p${pIdx + 1}-q${qIdx + 1}`;
                    const resolved = resolveAndShuffleChoices(rawOptions, q.answer, seedKey);
                    if (!resolved) return;

                    let expText = q.explainVi || '';
                    if (q.tip) expText += `\n\n💡 Mẹo làm bài:\n${q.tip}`;

                    secQuestions.push({
                        id: `q-yomimono-b${baiNum}-p${pIdx + 1}-q${qIdx + 1}`,
                        question: q.q || '文章の内容に合っているものはどれか。',
                        questionVi: q.qt?.q || '',
                        options: resolved.options,
                        optionsVi: q.qt?.o || [],
                        correctAnswer: resolved.correctAnswer,
                        explanation: expText.trim(),
                        tip: q.tip || '',
                        evidenceSentenceIndices: q.evi || [],
                        passage: p.japanese || '',
                        passageData: passageDataObj,
                        subQuestions: []
                    });
                });

                if (secQuestions.length > 0) {
                    sections.push({
                        id: `sec-yomimono-b${baiNum}-${pIdx + 1}`,
                        title: `${p.title || `Bài đọc ${pIdx + 1}`} ${p.titleVi ? `· ${p.titleVi}` : ''}`.trim(),
                        passages: [
                            {
                                passage: p.japanese || '',
                                passageData: passageDataObj
                            }
                        ],
                        questions: secQuestions
                    });
                    totalQInBai += secQuestions.length;
                }
            });

            if (sections.length > 0 && totalQInBai > 0) {
                const firstP = passages[0];
                const testTitle = `Bài đọc giáo trình ${level} · Bài ${baiNum}: ${firstP?.title || ''}${firstP?.titleVi ? ` (${firstP.titleVi})` : ''}`.trim();
                const testId = `quizki-jlpt-roadmap-${level.toLowerCase()}-b${baiNum}`;

                const testDoc = {
                    id: testId,
                    title: testTitle,
                    baiNumber: baiNum,
                    level: level,
                    timeLimit: Math.max(12, Math.ceil(totalQInBai * 2)),
                    isSkillTest: true,
                    skillType: 'reading',
                    isRoadmapTest: true,
                    isPremium: false,
                    strategy: data.strategy?.intro || `Bài đọc theo giáo trình chuẩn ${level} giúp rèn luyện khả năng đọc hiểu chuyên sâu kèm phân tích từng câu.`,
                    strategyData: data.strategy || null,
                    description: `Bài học gồm ${passages.length} bài đọc ngữ cảnh, ${totalQInBai} câu hỏi trắc nghiệm kèm phân tích câu, từ vựng và ngữ pháp.`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    sections: sections
                };

                levelTests[level].push(testDoc);
                yomimonoTestsCount++;
                yomimonoQuestionsCount += totalQInBai;
            }
        } catch (e) {
            console.warn(`Error reading yomimono file ${f}:`, e.message);
        }
    }
}
console.log(`✅ Accepted ${yomimonoTestsCount} Yomimono lessons (${yomimonoQuestionsCount} total questions with full sentence breakdown).`);

// =========================================================================
// 2. PROCESS AUTHENTIC SCRAPED BOOKS & MERGE ANALYSIS
// =========================================================================
console.log('\n📚 [2/3] Processing Scraped Books (Merging Clean Analysis)...');
const scrapedDir = path.join(DATA_DIR, 'books_scraped');

if (fs.existsSync(scrapedDir)) {
    const files = fs.readdirSync(scrapedDir).filter(f => f.endsWith('.json') && !f.includes('__raw') && !f.includes('__q') && !f.includes('analysis__') && !f.includes('grammarTags__'));

    let totalBooksAccepted = 0;
    let totalTestsAccepted = 0;
    let totalQuestionsAccepted = 0;

    for (const f of files) {
        const lvlMatch = f.match(/n[1-5]/i);
        if (!lvlMatch) continue;
        const level = lvlMatch[0].toUpperCase();

        try {
            const rawData = JSON.parse(fs.readFileSync(path.join(scrapedDir, f), 'utf-8'));
            const bookData = rawData.default || rawData;
            const tests = bookData.tests || [];
            if (tests.length === 0) continue;

            const rawSlug = bookData.bookSlug || f.replace(/^scraped_n[1-5]_books__/, '').replace(/\.json$/, '');
            const cleanSlug = rawSlug.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
            const bookTitle = bookFriendlyTitles[cleanSlug] || `Quizki Luyện Thi ${level} (${cleanSlug.replace(/_/g, ' ').toUpperCase()})`;

            // Load analysis file if exists
            let analysisQMap = null;
            const analysisFile = path.join(scrapedDir, `scraped_${level.toLowerCase()}_books__analysis__${cleanSlug}.json`);
            if (fs.existsSync(analysisFile)) {
                try {
                    const aData = JSON.parse(fs.readFileSync(analysisFile, 'utf8'));
                    analysisQMap = aData.default?.q || aData.q || null;
                } catch (e) {}
            }

            let skillType = 'vocabulary';
            if (cleanSlug.includes('bunpou') || cleanSlug.includes('np') || cleanSlug.includes('vp')) skillType = 'grammar';
            else if (cleanSlug.includes('dokkai') || cleanSlug.includes('doc')) skillType = 'reading';
            else if (cleanSlug.includes('kanji') || cleanSlug.includes('moji')) skillType = 'kanji';
            else if (cleanSlug.includes('moshi') || cleanSlug.includes('chokuzen') || cleanSlug.includes('goukaku')) skillType = 'full';

            const skillNames = {
                vocabulary: 'Từ vựng (文字・語彙)',
                grammar: 'Ngữ pháp (文法)',
                reading: 'Đọc hiểu (読解)',
                kanji: 'Chữ Hán (漢字)',
                full: 'Tổng hợp (綜合)'
            };

            // Load clean AI-verified book cache if available
            const cleanAiDir = path.join(process.cwd(), 'data/clean_ai_books');
            const cleanAiFile = path.join(cleanAiDir, `clean_${level.toLowerCase()}_${cleanSlug}.json`);
            let cleanAiMap = new Map();
            if (fs.existsSync(cleanAiFile)) {
                try {
                    const cleanAiList = JSON.parse(fs.readFileSync(cleanAiFile, 'utf8'));
                    cleanAiList.forEach(item => {
                        cleanAiMap.set(item.testIndex, item);
                    });
                } catch (e) {}
            }

            let bookAcceptedCount = 0;

            tests.forEach((testItem, tIdx) => {
                // If AI-cleaned test is available, prioritize it
                if (cleanAiMap.has(tIdx)) {
                    const aiItem = cleanAiMap.get(tIdx);
                    const aiQs = aiItem.questions || [];
                    if (aiQs.length > 0) {
                        const passageDataObj = {
                            title: `Bài đọc ${tIdx + 1}`,
                            titleVi: '',
                            japanese: aiItem.passage || '',
                            rawJapanese: aiItem.passage || '',
                            vietnamese: aiItem.passageVi || '',
                            sentences: aiItem.sentences || [],
                            grammarPoints: (aiItem.sentences || []).flatMap(s => s.grammar || []),
                            vocabList: (aiItem.sentences || []).flatMap(s => s.vocab || [])
                        };

                        let compiledQuestions = [];

                        if (aiQs.length > 1) {
                            // Multiple questions under 1 shared reading passage -> 1 Parent question with subQuestions
                            const subQuestions = aiQs.map((q, qIdx) => {
                                const expParts = [];
                                if (q.explanationData?.correctReason) expParts.push(`✅ Lựa chọn chính xác:\n${q.explanationData.correctReason}`);
                                if (q.explanationData?.quote) expParts.push(`📖 Trích dẫn: 「${q.explanationData.quote}」`);
                                if (Array.isArray(q.explanationData?.wrongReasons) && q.explanationData.wrongReasons.length > 0) {
                                    const whyText = q.explanationData.wrongReasons.map(w => {
                                        const optLetter = String.fromCharCode(65 + w.optionIndex);
                                        return `✗ (${optLetter.toLowerCase()}) ${w.reason}`;
                                    }).join('\n');
                                    expParts.push(`📌 Phân tích các phương án:\n${whyText}`);
                                }
                                if (q.explanationData?.deepAnalysis) expParts.push(`📖 Căn cứ & Giải thích chi tiết:\n${q.explanationData.deepAnalysis}`);
                                if (q.explanationData?.tips) expParts.push(`💡 Mẹo làm bài:\n${q.explanationData.tips}`);

                                return {
                                    id: `sq-${cleanSlug}-b${tIdx + 1}-${qIdx + 1}`,
                                    question: q.question,
                                    questionVi: q.questionVi || '',
                                    options: q.options || [],
                                    optionsVi: q.optionsVi || [],
                                    correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
                                    explanation: expParts.join('\n\n')
                                };
                            });

                            compiledQuestions = [
                                {
                                    id: `q-${cleanSlug}-b${tIdx + 1}-main`,
                                    question: aiItem.rawTitle || '文章の内容を読んで、以下の問いに答えなさい。(Đọc bài văn sau và trả lời các câu hỏi bên dưới)',
                                    questionVi: '',
                                    options: [],
                                    correctAnswer: -1,
                                    explanation: '',
                                    passage: aiItem.passage || '',
                                    passageData: passageDataObj,
                                    evidenceSentenceIndices: [],
                                    subQuestions: subQuestions
                                }
                            ];
                        } else {
                            // Single question test
                            const q = aiQs[0];
                            const expParts = [];
                            if (q.explanationData?.correctReason) expParts.push(`✅ Lựa chọn chính xác:\n${q.explanationData.correctReason}`);
                            if (q.explanationData?.quote) expParts.push(`📖 Trích dẫn: 「${q.explanationData.quote}」`);
                            if (Array.isArray(q.explanationData?.wrongReasons) && q.explanationData.wrongReasons.length > 0) {
                                const whyText = q.explanationData.wrongReasons.map(w => {
                                    const optLetter = String.fromCharCode(65 + w.optionIndex);
                                    return `✗ (${optLetter.toLowerCase()}) ${w.reason}`;
                                }).join('\n');
                                expParts.push(`📌 Phân tích các phương án:\n${whyText}`);
                            }
                            if (q.explanationData?.deepAnalysis) expParts.push(`📖 Căn cứ & Giải thích chi tiết:\n${q.explanationData.deepAnalysis}`);
                            if (q.explanationData?.tips) expParts.push(`💡 Mẹo làm bài:\n${q.explanationData.tips}`);

                            compiledQuestions = [
                                {
                                    id: `q-${cleanSlug}-b${tIdx + 1}-1`,
                                    question: q.question,
                                    questionVi: q.questionVi || '',
                                    options: q.options || [],
                                    optionsVi: q.optionsVi || [],
                                    correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 0,
                                    explanation: expParts.join('\n\n'),
                                    passage: aiItem.passage || '',
                                    passageData: passageDataObj,
                                    evidenceSentenceIndices: [],
                                    subQuestions: []
                                }
                            ];
                        }

                        const testNum = tIdx + 1;
                        const testId = `quizki-jlpt-${level.toLowerCase()}-${cleanSlug}-b${testNum}`;
                        const testTitle = `${bookTitle} · Bài ${testNum}`;
                        const totalSubQCount = aiQs.length;
                        const timeLimit = Math.max(10, Math.ceil(totalSubQCount * 1.5));

                        const testDoc = {
                            id: testId,
                            title: testTitle,
                            bookSlug: cleanSlug,
                            bookTitle: bookTitle,
                            level: level,
                            timeLimit: timeLimit,
                            isSkillTest: true,
                            skillType: skillType,
                            isPremium: false,
                            strategy: `Luyện tập chuyên sâu bài đọc hiểu ${level} thuộc bộ ${bookTitle} đã được AI thẩm định 100% chuẩn xác.`,
                            description: `Bộ câu hỏi gồm ${totalSubQCount} câu kèm phân tích câu, dịch nghĩa, từ vựng và ngữ pháp chi tiết.`,
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            sections: [
                                {
                                    id: `sec-${testId}-1`,
                                    title: skillNames[skillType] || 'Phần thi',
                                    passages: [
                                        {
                                            passage: aiItem.passage || '',
                                            passageData: passageDataObj
                                        }
                                    ],
                                    questions: compiledQuestions
                                }
                            ]
                        };

                        levelTests[level].push(testDoc);
                        totalTestsAccepted++;
                        totalQuestionsAccepted += totalSubQCount;
                        bookAcceptedCount++;
                        return;
                    }
                }

                const qs = testItem.questions || [];
                if (qs.length === 0) return;

                let testPassageStr = '';
                if (typeof testItem.passage === 'string') {
                    testPassageStr = testItem.passage.trim();
                } else if (testItem.passage && typeof testItem.passage === 'object') {
                    const body = testItem.passage.body || testItem.passage.text || testItem.passage.content || '';
                    const notes = Array.isArray(testItem.passage.notes) && testItem.passage.notes.length > 0
                        ? '\n\n📝 Chú thích từ vựng:\n' + testItem.passage.notes.map(n => `• ${n.label || ''} ${n.term || ''}: ${n.vi || n.jp || ''}`).join('\n')
                        : '';
                    testPassageStr = (body + notes).trim();
                }

                const normalizedQuestions = [];
                let testHasInvalidQ = false;

                for (let qIdx = 0; qIdx < qs.length; qIdx++) {
                    const q = qs[qIdx];
                    let rawChoices = [];
                    if (Array.isArray(q.choices)) {
                        rawChoices = q.choices.map(c => typeof c === 'object' ? (c.ansText || c.text || '') : String(c)).filter(Boolean);
                    }

                    if (rawChoices.length < 2 || !rawChoices.every(isValidChoice)) {
                        testHasInvalidQ = true;
                        break;
                    }

                    let qStem = (q.question || '').replace(/^\d+[\.\s、]+/, '').trim();
                    let qPassage = '';
                    if (typeof q.passage === 'string' && q.passage.trim()) {
                        qPassage = q.passage.trim();
                    } else if (q.passage && typeof q.passage === 'object') {
                        const b = q.passage.body || q.passage.text || '';
                        qPassage = b.trim();
                    } else if (testPassageStr) {
                        qPassage = testPassageStr;
                    }

                    if (!qStem && !qPassage && !q.audio && !q.audioUrl) {
                        testHasInvalidQ = true;
                        break;
                    }

                    if (!qStem && qPassage) {
                        qStem = '文章の内容に合っているものはどれか。(Chọn phương án phù hợp nhất với nội dung bài đọc)';
                    }

                    const qUniqueKey = `${cleanSlug}-t${tIdx + 1}-q${qIdx + 1}-${qStem.slice(0, 20)}`;
                    const resolved = resolveAndShuffleChoices(rawChoices, q.correctAnswer ?? q.answer, qUniqueKey);

                    if (!resolved) {
                        testHasInvalidQ = true;
                        break;
                    }

                    // Check analysis entry
                    const analysis = getAnalysisForQuestion(analysisQMap, cleanSlug, tIdx, qIdx);
                    let finalExplanation = '';

                    if (analysis) {
                        if (analysis.verdict) finalExplanation += `${analysis.verdict}\n\n`;
                        if (analysis.why && Array.isArray(analysis.why) && analysis.why.length > 0) {
                            finalExplanation += `📌 Phân tích các phương án:\n${analysis.why.join('\n')}\n\n`;
                        }
                        if (analysis.explanation) {
                            finalExplanation += `📖 Căn cứ & Giải thích chi tiết:\n${analysis.explanation}`;
                        }
                    } else {
                        finalExplanation = q.explanationText || q.explanation || '';
                    }

                    normalizedQuestions.push({
                        id: `q-${cleanSlug}-b${tIdx + 1}-${qIdx + 1}`,
                        question: qStem,
                        options: resolved.options,
                        correctAnswer: resolved.correctAnswer,
                        explanation: finalExplanation.trim(),
                        passage: qPassage,
                        evidenceSentenceIndices: analysis?.evi || [],
                        imageUrl: q.image || '',
                        audioUrl: q.audio || q.audioUrl || '',
                        subQuestions: []
                    });
                }

                if (testHasInvalidQ || normalizedQuestions.length === 0) {
                    return;
                }

                let finalQuestions = normalizedQuestions;
                if (normalizedQuestions.length > 1) {
                    const firstPassage = testPassageStr || normalizedQuestions[0].passage;
                    const allSharePassage = firstPassage && (
                        Boolean(testPassageStr) || 
                        normalizedQuestions.every(q => q.passage === firstPassage || !q.passage)
                    );

                    if (allSharePassage && firstPassage.trim().length > 30) {
                        finalQuestions = [
                            {
                                id: `q-${cleanSlug}-b${tIdx + 1}-main`,
                                question: testItem.title || '文章の内容を読んで、以下の問いに答えなさい。(Đọc bài văn sau và trả lời các câu hỏi bên dưới)',
                                questionVi: '',
                                options: [],
                                correctAnswer: -1,
                                explanation: '',
                                passage: firstPassage,
                                evidenceSentenceIndices: [],
                                subQuestions: normalizedQuestions.map((nq, nqi) => ({
                                    id: `sq-${cleanSlug}-b${tIdx + 1}-${nqi + 1}`,
                                    question: nq.question,
                                    questionVi: nq.questionVi || '',
                                    options: nq.options,
                                    optionsVi: nq.optionsVi || [],
                                    correctAnswer: nq.correctAnswer,
                                    explanation: nq.explanation,
                                    imageUrl: nq.imageUrl || '',
                                    audioUrl: nq.audioUrl || ''
                                }))
                            }
                        ];
                    }
                }

                const actualQCount = finalQuestions.reduce((s, q) => s + (q.subQuestions?.length || 1), 0);
                const testNum = tIdx + 1;
                const testId = `quizki-jlpt-${level.toLowerCase()}-${cleanSlug}-b${testNum}`;
                const testTitle = `${bookTitle} · Bài ${testNum}${testItem.title && !testItem.title.includes('Bài') ? ` - ${testItem.title}` : ''}`;
                const timeLimit = Math.max(10, Math.ceil(actualQCount * 1.5));

                const testDoc = {
                    id: testId,
                    title: testTitle,
                    bookSlug: cleanSlug,
                    bookTitle: bookTitle,
                    level: level,
                    timeLimit: timeLimit,
                    isSkillTest: true,
                    skillType: skillType,
                    isPremium: false,
                    strategy: `Luyện tập chuyên sâu các dạng câu hỏi thi thật JLPT ${level} thuộc bộ ${bookTitle}.`,
                    description: `Bộ câu hỏi luyện thi trích từ giáo trình ${bookTitle} gồm ${actualQCount} câu hỏi có giải thích chi tiết.`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    sections: [
                        {
                            id: `sec-${testId}-1`,
                            title: skillNames[skillType] || 'Phần thi',
                            questions: finalQuestions
                        }
                    ]
                };

                levelTests[level].push(testDoc);
                bookAcceptedCount++;
                totalTestsAccepted++;
                totalQuestionsAccepted += actualQCount;
            });

            if (bookAcceptedCount > 0) {
                totalBooksAccepted++;
            }
        } catch (e) {
            console.warn(`Error reading book ${f}:`, e.message);
        }
    }

    console.log(`✅ Accepted ${totalBooksAccepted} books, ${totalTestsAccepted} tests (${totalQuestionsAccepted} questions from books_scraped).`);
}

// =========================================================================
// 3. PROCESS 149 OFFICIAL JLPT WORKSHEETS
// =========================================================================
console.log('\n📝 [3/3] Processing Official JLPT Worksheets...');
const worksheetsDir = path.join(DATA_DIR, 'jlpt_worksheets');

if (fs.existsSync(worksheetsDir)) {
    const wsFiles = fs.readdirSync(worksheetsDir).filter(f => f.endsWith('.json'));

    let wsTestsCount = 0;
    let wsQuestionsCount = 0;

    for (const f of wsFiles) {
        try {
            const wsData = JSON.parse(fs.readFileSync(path.join(worksheetsDir, f), 'utf-8'));
            const level = (wsData.level || 'N5').toUpperCase();
            if (!levelTests[level]) continue;

            const baiNum = wsData.bai || parseInt(f.replace('.json', ''), 10) || 1;
            const testId = `quizki-jlpt-worksheet-${level.toLowerCase()}-b${baiNum}`;
            const testTitle = `Quizki Đề Thi Tổng Hợp ${level} · Đề số ${baiNum}${wsData.intro ? ` (${wsData.intro.slice(0, 45)}...)` : ''}`;

            const sections = [];
            let totalQInTest = 0;

            (wsData.groups || []).forEach((group, gIdx) => {
                const secTitle = `${group.vi || 'Phần thi'} (${group.jp || ''})`.trim();
                const secQuestions = [];

                (group.sections || []).forEach((subSec, sIdx) => {
                    const subInstr = subSec.instr || '';
                    (subSec.items || []).forEach((item, itemIdx) => {
                        const rawChoices = (item.choices || []).filter(isValidChoice);
                        if (rawChoices.length < 2) return;

                        let prompt = item.prompt || '';
                        if (item.ul && prompt.includes(item.ul)) {
                            prompt = prompt.replace(item.ul, `【${item.ul}】`);
                        }

                        let exp = item.explain || '';
                        if (Array.isArray(item.glosses) && item.glosses.length > 0) {
                            exp += '\n\n📖 Từ vựng trong câu:\n' + item.glosses.map(g => `• ${g.t}: ${g.vi}`).join('\n');
                        }

                        const qKey = `ws-${level.toLowerCase()}-b${baiNum}-g${gIdx + 1}-s${sIdx + 1}-i${itemIdx + 1}`;
                        const resolved = resolveAndShuffleChoices(rawChoices, item.answer, qKey);
                        if (!resolved) return;

                        secQuestions.push({
                            id: `q-${qKey}`,
                            question: prompt || subInstr,
                            options: resolved.options,
                            correctAnswer: resolved.correctAnswer,
                            explanation: exp.trim(),
                            passage: item.passage || '',
                            imageUrl: item.image || '',
                            audioUrl: item.audio || '',
                            subQuestions: []
                        });
                    });
                });

                if (secQuestions.length > 0) {
                    sections.push({
                        id: `sec-${testId}-${gIdx + 1}`,
                        title: secTitle,
                        questions: secQuestions
                    });
                    totalQInTest += secQuestions.length;
                }
            });

            if (sections.length > 0 && totalQInTest > 0) {
                const timeLimit = Math.max(15, Math.ceil(totalQInTest * 1.5));
                const wsTestDoc = {
                    id: testId,
                    title: testTitle,
                    level: level,
                    timeLimit: timeLimit,
                    isSkillTest: true,
                    skillType: 'full',
                    isMockExam: true,
                    isPremium: false,
                    strategy: wsData.intro || `Đề luyện thi tổng hợp kiến thức trọng tâm chuẩn JLPT ${level}.`,
                    description: `Đề thi tổng hợp gồm ${totalQInTest} câu hỏi đa dạng có giải thích chi tiết từng câu.`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    sections: sections
                };

                levelTests[level].push(wsTestDoc);
                wsTestsCount++;
                wsQuestionsCount += totalQInTest;
            }
        } catch (e) {
            console.warn(`Error processing worksheet ${f}:`, e.message);
        }
    }

    console.log(`✅ Accepted ${wsTestsCount} worksheet tests (${wsQuestionsCount} questions).`);
}

// =========================================================================
// 4. WRITE CLEAN LEVEL JSON FILES AND MASTER jlpt_data.json
// =========================================================================
console.log('\n💾 Writing clean level JSON files...');
const allMasterTests = [];

for (const [lvl, tests] of Object.entries(levelTests)) {
    const lvlPath = path.join(JLPT_OUT_DIR, `${lvl.toLowerCase()}.json`);
    fs.writeFileSync(lvlPath, JSON.stringify(tests, null, 2), 'utf-8');
    allMasterTests.push(...tests);
    console.log(`✨ ${lvl}: ${tests.length} tests written to ${lvl.toLowerCase()}.json`);
}

fs.writeFileSync(MASTER_TEST_FILE, JSON.stringify(allMasterTests), 'utf-8');
console.log(`\n🎉 100% COMPLETE! Master jlpt_data.json created with ${allMasterTests.length} tests total!`);
