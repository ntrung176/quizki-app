import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../data/openjlpt');
const PUBLIC_DATA_DIR = path.resolve(__dirname, '../public/data');
if (!fs.existsSync(PUBLIC_DATA_DIR)) fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });

function formatFuriganaRuby(text) {
    if (!text) return '';
    // Replace text[furigana] -> <ruby>text<rt>furigana</rt></ruby> or keep clean text
    // E.g. 私[わたし] -> <ruby>私<rt>わたし</rt></ruby>
    return text.replace(/([^\s\[\]]+)\[([^\s\[\]]+)\]/g, '<ruby>$1<rt>$2</rt></ruby>');
}

function cleanFuriganaText(text) {
    if (!text) return '';
    return text.replace(/\[([^\s\[\]]+)\]/g, '（$1）');
}

function convertJlptWorksheets() {
    console.log('🔄 Converting JLPT Worksheets...');
    const jlptDir = path.join(DATA_DIR, 'jlpt_worksheets');
    const files = fs.readdirSync(jlptDir).filter(f => f.endsWith('.json') && !f.startsWith('all_'));

    // Sort by worksheet number
    files.sort((a, b) => parseInt(a) - parseInt(b));

    const fullTests = [];
    const skillTests = [];

    const TIME_LIMITS = {
        N5: 60,
        N4: 70,
        N3: 95,
        N2: 105,
        N1: 110
    };

    const SKILL_TIME_LIMITS = {
        vocabulary: 25,
        grammar: 25,
        reading: 30
    };

    files.forEach(file => {
        const filePath = path.join(jlptDir, file);
        let data;
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
            console.error(`Error reading ${file}:`, e.message);
            return;
        }

        const level = data.level || 'N5';
        const bai = data.bai || parseInt(file);
        const intro = data.intro || '';

        const vocabQuestions = [];
        const grammarQuestions = [];

        (data.groups || []).forEach(group => {
            const isVocab = group.key === 'goi' || group.vi?.toLowerCase().includes('từ vựng');
            const isGrammar = group.key === 'bunpou' || group.vi?.toLowerCase().includes('ngữ pháp');

            (group.sections || []).forEach(sec => {
                if (sec.type === 'locked') return; // Skip locked/placeholder

                const secCode = sec.code || '';
                const secInstr = sec.instr || '';

                (sec.items || []).forEach((item, itemIdx) => {
                    let qText = '';
                    let choices = [];
                    let ans = 0;
                    let exp = item.explain || '';
                    let subQs = [];
                    let passage = '';

                    if (item.glosses && item.glosses.length > 0) {
                        const glossStr = item.glosses.map(g => `• ${g.t}${g.read ? ` (${g.read})` : ''}: ${g.vi}`).join('\n');
                        exp += `\n\n📖 Từ vựng trong câu:\n${glossStr}`;
                    }

                    if (sec.type === 'mcq') {
                        let stem = item.prompt || item.stem || '';
                        if (item.ul && stem.includes(item.ul)) {
                            stem = stem.replace(item.ul, `<u>${item.ul}</u>`);
                        }
                        qText = formatFuriganaRuby(stem);
                        if (secInstr && !qText.includes('【')) {
                            // Optionally prepend instruction if helpful
                        }
                        choices = (item.choices || []).map(c => formatFuriganaRuby(c));
                        ans = typeof item.answer === 'number' ? item.answer : 0;
                    } else if (sec.type === 'star') {
                        // Star question
                        const prefix = item.frame?.[0] || '';
                        const suffix = item.frame?.[1] || '';
                        qText = formatFuriganaRuby(`${prefix} ＿＿＿　＿＿＿　<u>★</u>　＿＿＿ ${suffix}`.trim());
                        choices = (item.pieces || []).map(p => formatFuriganaRuby(p));
                        const starSlot = item.starSlot ?? 2;
                        ans = item.order ? item.order[starSlot] : 0;
                    } else if (sec.type === 'passage') {
                        qText = 'Đọc đoạn văn sau và chọn đáp án thích hợp nhất cho các vị trí trống:';
                        passage = (item.parts || []).map((p, pIdx) => {
                            return formatFuriganaRuby(p) + (pIdx < (item.blanks || []).length ? ` <b style="color:#4f46e5;">[ ${pIdx + 1} ]</b> ` : '');
                        }).join('');

                        subQs = (item.blanks || []).map((b, bIdx) => ({
                            question: `Chọn đáp án đúng điền vào vị trí [ ${bIdx + 1} ]`,
                            options: (b.choices || []).map(c => formatFuriganaRuby(c)),
                            correctAnswer: typeof b.answer === 'number' ? b.answer : 0,
                            explanation: b.explain || ''
                        }));

                        choices = subQs[0]?.options || ['', '', '', ''];
                        ans = subQs[0]?.correctAnswer || 0;
                        exp = subQs[0]?.explanation || exp;
                    } else if (sec.type === 'input') {
                        // Translation or short answer
                        qText = `Dịch câu sau sang tiếng Nhật: <b>${item.vi || ''}</b>`;
                        choices = [
                            item.target || item.model || '',
                            'Phương án B',
                            'Phương án C',
                            'Phương án D'
                        ];
                        ans = 0;
                        exp = `Đáp án mẫu: ${item.model || item.target || ''}\n\n${item.explain || ''}`;
                    }

                    if (!qText || choices.length < 2) return;

                    const questionObj = {
                        question: qText,
                        options: choices.length === 4 ? choices : [...choices, ...Array(Math.max(0, 4 - choices.length)).fill('')],
                        correctAnswer: ans,
                        explanation: exp,
                        audioUrl: '',
                        passage: passage,
                        imageUrl: '',
                        subQuestions: subQs.length > 1 ? subQs : []
                    };

                    if (isVocab) {
                        vocabQuestions.push(questionObj);
                    } else {
                        grammarQuestions.push(questionObj);
                    }
                });
            });
        });

        // 1. Create Full Practice Test
        const sections = [];
        if (vocabQuestions.length > 0) {
            sections.push({
                type: 'vocabulary',
                title: 'Từ vựng (文字・語彙)',
                questions: vocabQuestions
            });
        }
        if (grammarQuestions.length > 0) {
            sections.push({
                type: 'grammar',
                title: 'Ngữ pháp (文法)',
                questions: grammarQuestions
            });
        }

        if (sections.length > 0) {
            const totalQ = sections.reduce((acc, s) => acc + s.questions.length, 0);
            const fullTest = {
                id: `openjlpt-full-${level.toLowerCase()}-b${bai}`,
                title: `JLPT ${level} - Đề Luyện Tập #${bai}`,
                level: level,
                timeLimit: TIME_LIMITS[level] || 60,
                isSkillTest: false,
                skillType: 'vocabulary',
                isPremium: false,
                sections: sections,
                description: intro ? cleanFuriganaText(intro) : `Đề luyện thi chuẩn JLPT ${level} bài số ${bai} gồm ${totalQ} câu hỏi có giải thích chi tiết.`,
                createdAt: Date.now() - (150 - bai) * 3600000,
                updatedAt: Date.now()
            };
            fullTests.push(fullTest);
        }

        // 2. Create Skill Test - Vocabulary
        if (vocabQuestions.length > 0) {
            skillTests.push({
                id: `openjlpt-skill-vocab-${level.toLowerCase()}-b${bai}`,
                title: `Luyện Chuyên Sâu Từ Vựng ${level} - Bài ${bai}`,
                level: level,
                timeLimit: SKILL_TIME_LIMITS.vocabulary,
                isSkillTest: true,
                skillType: 'vocabulary',
                isPremium: false,
                sections: [{
                    type: 'vocabulary',
                    title: 'Từ vựng & Chữ Hán (文字・語彙)',
                    questions: vocabQuestions
                }],
                description: `Luyện chuyên sâu từ vựng & chữ Hán JLPT ${level} Bài ${bai} (${vocabQuestions.length} câu).`,
                createdAt: Date.now() - (150 - bai) * 3600000,
                updatedAt: Date.now()
            });
        }

        // 3. Create Skill Test - Grammar
        if (grammarQuestions.length > 0) {
            skillTests.push({
                id: `openjlpt-skill-grammar-${level.toLowerCase()}-b${bai}`,
                title: `Luyện Chuyên Sâu Ngữ Pháp ${level} - Bài ${bai}`,
                level: level,
                timeLimit: SKILL_TIME_LIMITS.grammar,
                isSkillTest: true,
                skillType: 'grammar',
                isPremium: false,
                sections: [{
                    type: 'grammar',
                    title: 'Ngữ pháp (文法)',
                    questions: grammarQuestions
                }],
                description: `Luyện chuyên sâu ngữ pháp & câu sao JLPT ${level} Bài ${bai} (${grammarQuestions.length} câu).`,
                createdAt: Date.now() - (150 - bai) * 3600000,
                updatedAt: Date.now()
            });
        }
    });

    console.log(`✅ Converted ${fullTests.length} Full JLPT Tests and ${skillTests.length} Skill Tests.`);
    return { fullTests, skillTests };
}

function convertYomimonoReading() {
    console.log('🔄 Converting Yomimono Reading Articles...');
    const yomimonoDir = path.join(DATA_DIR, 'yomimono');
    const files = fs.readdirSync(yomimonoDir).filter(f => f.endsWith('.json') && !f.startsWith('_') && !f.startsWith('all_'));

    files.sort((a, b) => parseInt(a) - parseInt(b));

    const readingTests = [];
    const allReadingArticles = [];

    files.forEach(file => {
        const filePath = path.join(yomimonoDir, file);
        let data;
        try {
            data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        } catch (e) {
            console.error(`Error reading ${file}:`, e.message);
            return;
        }

        const level = data.level || 'N5';
        const bai = data.bai || parseInt(file);
        const strategy = data.strategy || {};
        const passages = data.passages || [];

        const readingQuestions = [];

        passages.forEach((p, pIdx) => {
            const titleVi = p.titleVi || '';
            const titleJp = p.title || `Đoạn văn ${pIdx + 1}`;
            const header = `【${titleJp}${titleVi ? ` - ${titleVi}` : ''}】<br/>`;
            const passageHtml = `<b>${header}</b>` + (p.japanese || '').replace(/\n/g, '<br/>');

            (p.questions || []).forEach(q => {
                let exp = q.explainVi || '';
                if (q.tip) exp += `\n\n💡 Mẹo làm bài: ${q.tip}`;
                if (q.qt?.q) exp += `\n\n📖 Dịch câu hỏi: ${q.qt.q}`;
                if (p.vietnamese) exp += `\n\n📖 Bản dịch bài đọc:\n${p.vietnamese}`;

                readingQuestions.push({
                    question: q.q,
                    passage: passageHtml,
                    options: (q.options || []).map(opt => formatFuriganaRuby(opt)),
                    correctAnswer: typeof q.answer === 'number' ? q.answer : 0,
                    explanation: exp,
                    audioUrl: '',
                    imageUrl: '',
                    subQuestions: []
                });
            });
        });

        if (readingQuestions.length > 0) {
            const mainTitle = passages[0]?.titleVi || passages[0]?.title || `Bài ${bai}`;
            readingTests.push({
                id: `openjlpt-reading-${level.toLowerCase()}-b${bai}`,
                title: `Luyện Đọc Hiểu ${level} - Bài ${bai}: ${mainTitle}`,
                level: level,
                timeLimit: 25,
                isSkillTest: true,
                skillType: 'reading',
                isPremium: false,
                sections: [{
                    type: 'reading',
                    title: 'Đọc hiểu (読解)',
                    questions: readingQuestions
                }],
                description: strategy.intro || `Luyện đọc hiểu trình độ ${level} bài số ${bai} kèm bản dịch song ngữ và giải thích chi tiết.`,
                createdAt: Date.now() - (150 - bai) * 3600000,
                updatedAt: Date.now()
            });
        }

        allReadingArticles.push({
            id: `yomimono-${bai}`,
            bai: bai,
            level: level,
            strategy: strategy,
            passages: passages
        });
    });

    console.log(`✅ Converted ${readingTests.length} Reading Tests and ${allReadingArticles.length} full reading articles.`);
    return { readingTests, allReadingArticles };
}

function main() {
    console.log('🚀 Converting all OpenJLPT data to Quizki format...');

    const { fullTests, skillTests } = convertJlptWorksheets();
    const { readingTests, allReadingArticles } = convertYomimonoReading();

    // Combined JLPT tests dataset for Quizki
    const allQuizkiJlptTests = [
        ...fullTests,
        ...skillTests,
        ...readingTests
    ];

    const jlptOutputPath = path.join(PUBLIC_DATA_DIR, 'jlpt_data.json');
    fs.writeFileSync(jlptOutputPath, JSON.stringify(allQuizkiJlptTests, null, 2), 'utf-8');
    console.log(`\n🎉 Saved ${allQuizkiJlptTests.length} tests to ${jlptOutputPath} (${(fs.statSync(jlptOutputPath).size / (1024 * 1024)).toFixed(2)} MB)`);

    // Yomimono dedicated reading dataset
    const yomimonoOutputPath = path.join(PUBLIC_DATA_DIR, 'yomimono_data.json');
    fs.writeFileSync(yomimonoOutputPath, JSON.stringify(allReadingArticles, null, 2), 'utf-8');
    console.log(`🎉 Saved ${allReadingArticles.length} Yomimono reading articles to ${yomimonoOutputPath} (${(fs.statSync(yomimonoOutputPath).size / (1024 * 1024)).toFixed(2)} MB)`);

    // Summary by level
    const countByLevel = {};
    allQuizkiJlptTests.forEach(t => {
        countByLevel[t.level] = (countByLevel[t.level] || 0) + 1;
    });
    console.log('\n📊 Tests Count by Level:', countByLevel);

    const totalQuestions = allQuizkiJlptTests.reduce((sum, t) => {
        return sum + (t.sections || []).reduce((sSum, s) => sSum + (s.questions || []).length, 0);
    }, 0);
    console.log(`📊 Total questions across all tests: ${totalQuestions}`);
}

main();
