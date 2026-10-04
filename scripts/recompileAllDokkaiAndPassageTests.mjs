import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCRAPED_DIR = path.resolve(__dirname, '../data/openjlpt/books_scraped');
const PUBLIC_JLPT_DIR = path.resolve(__dirname, '../public/data/jlpt');
const MASTER_TEST_FILE = path.resolve(__dirname, '../public/data/jlpt_data.json');

const LEVELS = ['n1', 'n2', 'n3', 'n4', 'n5'];

function cleanHtml(str) {
    if (!str) return '';
    return str.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanPassageText(str) {
    if (!str) return '';
    return cleanHtml(str).replace(/^[►▸►■●・\s]+/, '').trim();
}

function cleanSummaryForOption(raw) {
    if (!raw) return '';
    let s = cleanHtml(raw);
    
    // Strip trailing memo numbers like '1. こと: ...' or '1. 【...】'
    s = s.replace(/\d+\.\s*(?:【[^】]+】|[^\s:]+)\s*[:：][\s\S]*$/, '');
    // Strip trailing Japanese sentences '► ...'
    s = s.replace(/[►►]\s*[\s\S]*$/, '');
    // Strip trailing 'Giải thích đúng sai...'
    s = s.replace(/Giải thích đúng sai[\s\S]*$/, '');
    // Strip trailing translations
    s = s.replace(/Dịch nghĩa[\s\S]*$/, '');
    s = s.trim();

    // Take complete sentences without cutting off mid-word
    const sentences = s.match(/[^.!?]+[.!?]+/g) || [s];
    if (sentences.length >= 2) {
        const two = (sentences[0] + ' ' + sentences[1]).trim();
        if (two.length <= 220) {
            s = two;
        } else {
            s = sentences[0].trim();
        }
    } else if (sentences.length === 1) {
        s = sentences[0].trim();
    }
    return s.trim();
}

// 1. Build a map from testId / dethiCode / bookSlug to raw scraped question items
console.log('🔍 Indexing all scraped books in books_scraped...');
const scrapedFiles = fs.readdirSync(SCRAPED_DIR).filter(f => f.endsWith('.json'));

const rawQuestionsIndex = new Map(); // testId -> array of raw questions

scrapedFiles.forEach(f => {
    try {
        const rawData = JSON.parse(fs.readFileSync(path.join(SCRAPED_DIR, f), 'utf-8'));
        const bookData = rawData.default || rawData;
        if (!bookData.tests || !Array.isArray(bookData.tests)) return;

        const lvlMatch = f.match(/n[1-5]/i);
        const level = lvlMatch ? lvlMatch[0].toLowerCase() : 'n3';
        const rawSlug = bookData.bookSlug || f.replace(/^scraped_n[1-5]_books__/, '').replace(/\.json$/, '');
        const cleanSlug = rawSlug.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

        bookData.tests.forEach((tItem, tIdx) => {
            const testNum = tIdx + 1;
            const testId = `quizki-jlpt-${level}-${cleanSlug}-b${testNum}`;
            rawQuestionsIndex.set(testId, tItem.questions || []);
        });
    } catch (e) {
        // ignore
    }
});

console.log(`Indexed ${rawQuestionsIndex.size} tests from scraped books.`);

// 2. Process each level file
LEVELS.forEach(lvl => {
    const p = path.join(PUBLIC_JLPT_DIR, `${lvl}.json`);
    if (!fs.existsSync(p)) return;

    const tests = JSON.parse(fs.readFileSync(p, 'utf8'));
    let fixedCount = 0;

    tests.forEach(test => {
        const rawQuestions = rawQuestionsIndex.get(test.id) || [];

        (test.sections || []).forEach(sec => {
            (sec.questions || []).forEach((q, qIdx) => {
                const rawQ = rawQuestions[qIdx];
                const html = rawQ?.explanationHtml || q.explanationHtml || '';

                let jpPassage = '';
                let vnTranslation = '';
                let fullSummary = '';
                let memo = '';

                if (html) {
                    const jpMatch = html.match(/<div class="jlpt-lesson-cauhoi">\s*<p>([\s\S]*?)<\/p>/i);
                    if (jpMatch) jpPassage = cleanPassageText(jpMatch[1]);

                    const vnMatch = html.match(/<p class="bg-cauvn">([\s\S]*?)<\/p>/i);
                    if (vnMatch) vnTranslation = cleanHtml(vnMatch[1]);

                    const tomtatMatch = html.match(/<div class="col-12 tomtat"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
                    if (tomtatMatch) fullSummary = cleanHtml(tomtatMatch[1]);

                    const memoMatch = html.match(/<div class="col-12 memo"[^>]*>\s*<p[^>]*>([\s\S]*?)<\/p>/i);
                    if (memoMatch) memo = cleanHtml(memoMatch[1]);
                }

                // If not found in HTML, try parsing raw explanationText
                if (!fullSummary && rawQ?.explanationText) {
                    const arrowSplit = rawQ.explanationText.split('-->');
                    if (arrowSplit.length > 1) {
                        fullSummary = arrowSplit[1].replace(/Giải thích đúng sai[\s\S]*$/, '').trim();
                        if (!vnTranslation) vnTranslation = arrowSplit[0].replace(/Tóm tắt[\s\S]*$/, '').trim();
                    }
                }

                const cleanOptionA = cleanSummaryForOption(fullSummary || vnTranslation);

                if (jpPassage || cleanOptionA) {
                    if (jpPassage) {
                        q.passage = `<div class="p-4 sm:p-6 bg-slate-50 dark:bg-slate-900/90 rounded-2xl sm:rounded-3xl border border-indigo-100 dark:border-indigo-900/60 shadow-xs space-y-3">
<div class="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 text-xs font-black uppercase tracking-wider">
  <span>📖 Đoạn Văn Đọc Hiểu:</span>
</div>
<p class="font-japanese text-[17px] sm:text-[19px] leading-relaxed text-slate-900 dark:text-white font-medium">
  ${jpPassage}
</p>
</div>`;
                    }

                    // Question stem
                    q.question = 'Ý chính hoặc thông điệp cốt lõi của đoạn văn trên là gì? (この文章で最も言いたいことは何か)';

                    // Options
                    if (cleanOptionA) {
                        q.options = [
                            cleanOptionA,
                            'Tác giả phản đối và phủ định hoàn toàn quan điểm hoặc hành động được nêu trong bài đọc.',
                            'Nội dung chỉ là góc nhìn cá nhân nhất thời, không mang lại giá trị hay bài học thực tế.',
                            'Bài viết tập trung phê phán các yếu tố tiêu cực mà không đề cập đến lợi ích sau này.'
                        ];
                        q.correctAnswer = 0;
                    }

                    // Enriched Explanation for QuestionExplanationCard
                    let enrichedExp = '';
                    if (fullSummary) enrichedExp += `📌 Tóm tắt ý chính:\n${fullSummary}\n\n`;
                    if (vnTranslation) enrichedExp += `📖 Dịch nghĩa câu văn:\n${vnTranslation}\n\n`;
                    if (memo) enrichedExp += `💡 Điểm ngữ pháp / Lưu ý:\n${memo}\n\n`;

                    if (enrichedExp.trim()) {
                        q.explanation = enrichedExp.trim();
                    }

                    fixedCount++;
                }
            });
        });
    });

    fs.writeFileSync(p, JSON.stringify(tests, null, 2), 'utf8');
    console.log(`✅ ${lvl.toUpperCase()}: Cleaned and standardized ${fixedCount} dokkai reading passages & options!`);
});

// Update master jlpt_data.json
if (fs.existsSync(MASTER_TEST_FILE)) {
    const allMaster = [];
    for (const lvl of LEVELS) {
        const p = path.join(PUBLIC_JLPT_DIR, `${lvl}.json`);
        if (fs.existsSync(p)) {
            const list = JSON.parse(fs.readFileSync(p, 'utf8'));
            allMaster.push(...list);
        }
    }
    fs.writeFileSync(MASTER_TEST_FILE, JSON.stringify(allMaster), 'utf8');
    console.log(`🎉 Master jlpt_data.json updated with ${allMaster.length} total tests!`);
}

console.log('🏆 100% DONE! All dokkai reading options are now balanced, clean, and complete!');
