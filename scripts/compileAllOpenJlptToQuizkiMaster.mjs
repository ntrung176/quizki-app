import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data/openjlpt');
const PUBLIC_DATA_DIR = path.resolve(__dirname, '../public/data');

if (!fs.existsSync(PUBLIC_DATA_DIR)) fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

// =========================================================================
// 1. COMPILE JLPT EXAM BOOKS (61,000+ Questions) -> jlpt_data.json
// =========================================================================
function compileJLPTTests() {
    console.log('\n======================================================');
    console.log('📝 [1/3] Compiling JLPT Exam Books -> jlpt_data.json...');
    console.log('======================================================');

    const scrapedDir = path.join(DATA_DIR, 'books_scraped');
    const existingTestsPath = path.join(PUBLIC_DATA_DIR, 'jlpt_data.json');
    let existingTests = fs.existsSync(existingTestsPath) ? JSON.parse(fs.readFileSync(existingTestsPath, 'utf-8')) : [];

    const testMap = new Map();
    existingTests.forEach(t => {
        if (t && t.id) testMap.set(t.id, t);
    });

    console.log(`Loaded ${testMap.size} existing tests from jlpt_data.json.`);

    if (!fs.existsSync(scrapedDir)) {
        console.warn('books_scraped directory not found:', scrapedDir);
        return;
    }

    const files = fs.readdirSync(scrapedDir).filter(f => f.endsWith('.json'));
    let newTestsCount = 0;
    let newQuestionsCount = 0;

    const bookFriendlyTitles = {
        '1000_bunpou_n2': 'Quizki 1000 Câu Ngữ Pháp N2',
        '181_np_n2': 'Quizki 181 Điểm Ngữ Pháp Thực Chiến N2',
        '181_np_n3': 'Quizki 181 Điểm Ngữ Pháp Thực Chiến N3',
        '115dokkai_tanbun_n3': 'Quizki Đọc Hiểu Đoản Văn N3 (115 Bài)',
        '115dokkai_choubun_n3': 'Quizki Đọc Hiểu Trường Văn N3 (115 Bài)',
        '1740_moji_n2': 'Quizki 1740 Từ Vựng & Chữ Hán N2',
        '1200_moji_n3': 'Quizki 1200 Từ Vựng & Chữ Hán N3',
        '700_moji_n3': 'Quizki 700 Chữ Hán Cốt Lõi N3',
        'pointmoji_n4': 'Quizki Chữ Hán Trọng Tâm N4',
        'pointvp_n4': 'Quizki Ngữ Pháp Trọng Tâm N4',
        '2026_bunpou_n4': 'Quizki Ngữ Pháp Thực Chiến N4',
        '2026_mojigoi_n4': 'Quizki Từ Vựng & Chữ Hán N4',
        'speed_goi_n1': 'Quizki Luyện Phản Xạ Từ Vựng Speed Goi N1',
        'speed_goi_n2': 'Quizki Luyện Phản Xạ Từ Vựng Speed Goi N2',
        'speed_goi_n3': 'Quizki Luyện Phản Xạ Từ Vựng Speed Goi N3',
        'speedgoi_n4': 'Quizki Luyện Phản Xạ Từ Vựng Speed Goi N4',
        'speed_kanji_n1': 'Quizki Luyện Chữ Hán Speed Kanji N1',
        'speed_kanji_n2': 'Quizki Luyện Chữ Hán Speed Kanji N2',
        'speed_kanji_n3': 'Quizki Luyện Chữ Hán Speed Kanji N3',
        'speed_bunpou_n1': 'Quizki Luyện Ngữ Pháp Cấp Tốc Speed N1',
        'speed_bunpou_n2': 'Quizki Luyện Ngữ Pháp Cấp Tốc Speed N2',
        'speed_bunpou_n3': 'Quizki Luyện Ngữ Pháp Cấp Tốc Speed N3',
        'speedvp_n4': 'Quizki Luyện Ngữ Pháp Cấp Tốc Speed N4',
        'speed_dokkai_n1': 'Quizki Luyện Đọc Hiểu Tốc Độ N1',
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
        'drilldrill_dokkai_n1': 'Quizki Drill & Drill Đọc Hiểu N1',
        'drilldrill_dokkai_n2': 'Quizki Drill & Drill Đọc Hiểu N2',
        'drilldrill_dokkai_n3': 'Quizki Drill & Drill Đọc Hiểu N3',
        'toriaezu_goi_n3': 'Quizki Từ Vựng Cấp Tốc Toriaezu N3',
        'patan_goi_n1': 'Quizki Phân Dạng Từ Vựng Patan Goi N1'
    };

    for (const f of files) {
        // Skip analysis raw/q files to avoid duplicates
        if (f.includes('__raw') || f.includes('__q') || f.includes('analysis__')) continue;

        try {
            const rawData = JSON.parse(fs.readFileSync(path.join(scrapedDir, f), 'utf-8'));
            const bookData = rawData.default || rawData;

            if (!bookData.tests || !Array.isArray(bookData.tests) || bookData.tests.length === 0) continue;

            const lvlMatch = f.match(/n[1-5]/i);
            const level = lvlMatch ? lvlMatch[0].toUpperCase() : 'N3';

            const rawSlug = bookData.bookSlug || f.replace(/^scraped_n[1-5]_books__/, '').replace(/\.json$/, '');
            const cleanSlug = rawSlug.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
            const bookTitle = bookFriendlyTitles[cleanSlug] || `Quizki Luyện Thi ${level} (${cleanSlug.replace(/_/g, ' ').toUpperCase()})`;

            // Determine skillType
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

            bookData.tests.forEach((testItem, tIdx) => {
                const testNum = tIdx + 1;
                const testId = `quizki-jlpt-${level.toLowerCase()}-${cleanSlug}-b${testNum}`;
                const testTitle = `${bookTitle} · Bài ${testNum}${testItem.title && !testItem.title.includes('Bài') ? ` - ${testItem.title}` : ''}`;

                const normalizedQuestions = (testItem.questions || []).map((q, qIdx) => {
                    let choicesList = [];
                    if (Array.isArray(q.choices)) {
                        choicesList = q.choices.map(c => typeof c === 'object' ? (c.ansText || c.text || '') : String(c));
                    }

                    // Normalize correct answer index
                    let correctIdx = 0;
                    if (typeof q.correctAnswer === 'number') {
                        correctIdx = q.correctAnswer;
                    } else if (typeof q.correctAnswer === 'string') {
                        const parsed = parseInt(q.correctAnswer, 10);
                        if (!isNaN(parsed) && parsed >= 1 && parsed <= choicesList.length) {
                            correctIdx = parsed - 1; // Convert 1-based to 0-based
                        } else if (!isNaN(parsed) && parsed >= 0) {
                            correctIdx = parsed;
                        }
                    }

                    let passageStr = '';
                    if (typeof q.passage === 'string') {
                        passageStr = q.passage.trim();
                    } else if (q.passage && typeof q.passage === 'object') {
                        const body = q.passage.body || q.passage.text || q.passage.content || '';
                        const notes = Array.isArray(q.passage.notes) && q.passage.notes.length > 0
                            ? '\n\n📝 Chú thích từ vựng:\n' + q.passage.notes.map(n => `• ${n.label || ''} ${n.term || ''}: ${n.vi || n.jp || ''}`).join('\n')
                            : '';
                        passageStr = (body + notes).trim();
                    }

                    return {
                        id: `q-${testId}-${qIdx + 1}`,
                        question: (q.question || '').replace(/^\d+[\.\s、]+/, '').trim(),
                        options: choicesList.length > 0 ? choicesList : ['Đáp án A', 'Đáp án B', 'Đáp án C', 'Đáp án D'],
                        correctAnswer: correctIdx,
                        explanation: (q.explanationText || q.explanation || '').trim(),
                        passage: passageStr,
                        imageUrl: q.image || '',
                        audioUrl: q.audio || '',
                        subQuestions: []
                    };
                });

                if (normalizedQuestions.length === 0) return;

                const timeLimit = Math.max(10, Math.ceil(normalizedQuestions.length * 1.5));

                const testDoc = {
                    id: testId,
                    title: testTitle,
                    level: level,
                    timeLimit: timeLimit,
                    isSkillTest: true,
                    skillType: skillType,
                    isPremium: false,
                    strategy: `Luyện tập chuyên sâu các dạng câu hỏi thi thật JLPT ${level} thuộc bộ ${bookTitle}.`,
                    description: `Bộ câu hỏi luyện thi trích từ giáo trình ${bookTitle} gồm ${normalizedQuestions.length} câu hỏi có giải thích chi tiết.`,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    sections: [
                        {
                            id: `sec-${testId}-1`,
                            title: skillNames[skillType] || 'Phần thi',
                            questions: normalizedQuestions
                        }
                    ]
                };

                testMap.set(testId, testDoc);
                newTestsCount++;
                newQuestionsCount += normalizedQuestions.length;
            });
        } catch (e) {
            console.warn(`Error processing ${f}:`, e.message);
        }
    }

    const finalTestsList = Array.from(testMap.values());
    fs.writeFileSync(existingTestsPath, JSON.stringify(finalTestsList), 'utf-8');
    console.log(`🎉 Master JLPT Test Bank updated: ${newTestsCount} new tests added (${newQuestionsCount.toLocaleString('vi-VN')} questions)!`);
    console.log(`📊 Total JLPT Tests in ${existingTestsPath}: ${finalTestsList.length} tests (${(fs.statSync(existingTestsPath).size / (1024 * 1024)).toFixed(2)} MB)`);
}

// =========================================================================
// 2. COMPILE MINDMAPS & NUANCES -> grammar_nuances.json
// =========================================================================
function compileGrammarNuances() {
    console.log('\n======================================================');
    console.log('🧠 [2/3] Compiling Grammar Mindmaps & Nuances -> grammar_nuances.json...');
    console.log('======================================================');

    const mindmapDir = path.join(DATA_DIR, 'mindmaps');
    const outPath = path.join(PUBLIC_DATA_DIR, 'grammar_nuances.json');

    if (!fs.existsSync(mindmapDir)) {
        console.warn('mindmaps directory not found:', mindmapDir);
        return;
    }

    const files = fs.readdirSync(mindmapDir).filter(f => f.endsWith('.js') || f.endsWith('.json'));
    const nuanceMap = new Map();

    for (const f of files) {
        try {
            const content = JSON.parse(fs.readFileSync(path.join(mindmapDir, f), 'utf-8'));
            const data = content.default || content;

            for (const [nodeKey, nodeVal] of Object.entries(data)) {
                if (!nodeVal || typeof nodeVal !== 'object') continue;
                const v2 = nodeVal.v2 || nodeVal;
                const pattern = v2.pattern || nodeVal.title || '';
                if (!pattern) continue;

                const cleanPattern = pattern.replace(/^～/, '').trim();
                const nodeItem = {
                    key: nodeKey,
                    title: nodeVal.title || '',
                    sub: nodeVal.sub || '',
                    pattern: v2.pattern || pattern,
                    reading: v2.patternReading || '',
                    coreMeaning: v2.coreMeaning || '',
                    definition: v2.definition || '',
                    nuanceTips: v2.notes || v2.nuanceTips || '',
                    parentBranch: v2.parentBranch || '',
                    examples: (v2.examples || []).map(ex => ({
                        japanese: ex.tokens ? ex.tokens.map(t => t.t || '').join('') : (ex.text || ex.japanese || ''),
                        reading: ex.tokens ? ex.tokens.map(t => t.r || t.t || '').join('') : '',
                        meaning: ex.meaning || ex.translation || ex.vi || ''
                    }))
                };

                if (!nuanceMap.has(cleanPattern)) {
                    nuanceMap.set(cleanPattern, []);
                }
                nuanceMap.get(cleanPattern).push(nodeItem);
            }
        } catch (e) {}
    }

    const finalNuances = Object.fromEntries(nuanceMap);
    fs.writeFileSync(outPath, JSON.stringify(finalNuances, null, 2), 'utf-8');
    console.log(`🎉 Compiled ${Object.keys(finalNuances).length} unique grammar patterns with ${files.length} mindmaps into ${outPath} (${(fs.statSync(outPath).size / (1024 * 1024)).toFixed(2)} MB)`);
}

// =========================================================================
// 3. COMPILE NIKKI COACH & WRITING PROMPTS -> kaiwa_coach_data.json
// =========================================================================
function compileNikkiCoach() {
    console.log('\n======================================================');
    console.log('💬 [3/3] Compiling Nikki Coach -> kaiwa_coach_data.json...');
    console.log('======================================================');

    const nikkiDir = path.join(DATA_DIR, 'nikki_coach');
    const outPath = path.join(PUBLIC_DATA_DIR, 'kaiwa_coach_data.json');

    if (!fs.existsSync(nikkiDir)) {
        console.warn('nikki_coach directory not found:', nikkiDir);
        return;
    }

    const files = fs.readdirSync(nikkiDir).filter(f => f.endsWith('.js') || f.endsWith('.json'));
    const lessons = [];

    files.sort((a, b) => {
        const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
        const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
        return numA - numB;
    });

    files.forEach((f, idx) => {
        try {
            const content = JSON.parse(fs.readFileSync(path.join(nikkiDir, f), 'utf-8'));
            const data = content.default || content;

            const lessonNum = idx + 1;
            const items = [];

            for (const [stepKey, stepVal] of Object.entries(data)) {
                if (!stepVal || typeof stepVal !== 'object') continue;
                items.push({
                    stepKey,
                    strategy: stepVal.strategy || [],
                    personas: (stepVal.personas || []).map(p => ({
                        label: p.label || '',
                        wordRef: p.wordRef || '',
                        triggers: p.trigger || []
                    }))
                });
            }

            lessons.push({
                id: `quizki-coach-bai-${lessonNum}`,
                title: `Bài ${lessonNum} - Luyện Giao Tiếp & Viết Nhật Ký Thực Tế`,
                lessonNum,
                steps: items
            });
        } catch (e) {}
    });

    fs.writeFileSync(outPath, JSON.stringify(lessons, null, 2), 'utf-8');
    console.log(`🎉 Compiled ${lessons.length} Kaiwa & Writing Coach lessons into ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(2)} KB)`);
}

async function main() {
    console.log('🚀 Starting Master Quizki Integration & Rebranding Pipeline...');
    compileJLPTTests();
    compileGrammarNuances();
    compileNikkiCoach();
    console.log('\n✨ ALL OPENJLPT DATASETS SUCCESSFULLY INTEGRATED & REBRANDED FOR QUIZKI!');
}

main().catch(console.error);
