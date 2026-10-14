import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BOOKS_DATA_PATH = path.resolve(__dirname, '../public/data/books_data.json');
const CHECKPOINT_PATH = path.resolve(__dirname, '../scratch/fill_blanks_checkpoint.json');
const AI_PROXY_URL = 'https://quizki-ai-proxy.lynguyennhattrung1706.workers.dev/';

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name) => {
    const prefix = `--${name}=`;
    const arg = args.find(a => a.startsWith(prefix));
    return arg ? arg.slice(prefix.length) : null;
};
const hasFlag = (name) => args.includes(`--${name}`);

const bookFilter = (getArg('book') || '').toLowerCase();
const groupFilter = (getArg('group') || '').toLowerCase();
const limit = getArg('limit') ? parseInt(getArg('limit'), 10) : Infinity;
const batchSize = getArg('batch-size') ? parseInt(getArg('batch-size'), 10) : 6;
const delayMs = getArg('delay') ? parseInt(getArg('delay'), 10) : 600;
const isDryRun = hasFlag('dry-run');

console.log('====================================================');
console.log('🤖 QUIZKI - AI FILL EXAMPLE BLANKS TOOL');
console.log('====================================================');
console.log(`- Target file: ${BOOKS_DATA_PATH}`);
console.log(`- Book filter: ${bookFilter || 'ALL'}`);
console.log(`- Group filter: ${groupFilter || 'ALL'}`);
console.log(`- Limit: ${limit === Infinity ? 'No limit' : limit}`);
console.log(`- Batch size: ${batchSize}`);
console.log(`- Dry run: ${isDryRun ? 'YES (No file modification)' : 'NO (Will save changes)'}`);
console.log('====================================================\n');

if (!fs.existsSync(BOOKS_DATA_PATH)) {
    console.error(`❌ File not found: ${BOOKS_DATA_PATH}`);
    process.exit(1);
}

// Load Checkpoint
let checkpoint = {};
if (fs.existsSync(CHECKPOINT_PATH)) {
    try {
        checkpoint = JSON.parse(fs.readFileSync(CHECKPOINT_PATH, 'utf-8'));
        console.log(`📦 Loaded checkpoint with ${Object.keys(checkpoint).length} previously processed entries.\n`);
    } catch (e) {
        console.warn('⚠️ Could not load checkpoint file, starting fresh.');
    }
}

const saveCheckpoint = () => {
    try {
        const scratchDir = path.dirname(CHECKPOINT_PATH);
        if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });
        fs.writeFileSync(CHECKPOINT_PATH, JSON.stringify(checkpoint, null, 2), 'utf-8');
    } catch (e) {
        console.warn('⚠️ Could not save checkpoint:', e.message);
    }
};

const hasBlankInExample = (v) => {
    if (!v) return false;
    const ex = (v.example || v.exampleSentence || '').trim();
    return /_{2,}|（\s*）|\(\s*\)|\[\s*\]/.test(ex);
};

// AI Call Function
async function callAiFillBlanks(items) {
    const prompt = `Bạn là chuyên gia ngôn ngữ tiếng Nhật. Nhiệm vụ của bạn là điền từ vựng mục tiêu vào chỗ trống (ký hiệu bởi ______ hoặc ____ hoặc tương tự) trong các câu ví dụ tiếng Nhật sau.
YÊU CẦU QUAN TRỌNG:
1. Lắp từ vựng vào chỗ trống và CHIA ĐÚNG THỂ ngữ pháp (thể Te, thể Ta, thể Nai, thể Masu, thể khả năng, thể bị động, thể sai khiến, thể quá khứ, v.v. tùy theo ngữ cảnh của câu ví dụ).
2. Giữ nguyên cấu trúc câu và các furigana đã có dạng 漢字（かんじ）.
3. Khi điền từ vào chỗ trống, nếu từ có Kanji hãy kèm furigana dạng 漢字（かんじ） theo chuẩn Quizki.
4. Giữ nguyên số dòng của câu ví dụ và câu dịch nghĩa tiếng Việt tương ứng (ngăn cách bởi dấu xuống dòng \\n).
5. Trả về đúng định dạng JSON array duy nhất, không markdown:
[
  {
    "index": 0,
    "example": "câu ví dụ sau khi đã điền và chia thể đúng",
    "exampleMeaning": "nghĩa tiếng Việt tương ứng"
  }
]

Dưới đây là danh sách từ và câu ví dụ cần điền:
${JSON.stringify(items.map((it, idx) => ({
    index: idx,
    word: it.word || it.front || '',
    reading: it.reading || '',
    meaning: it.meaning || it.back || '',
    example: it.example || it.exampleSentence || '',
    exampleMeaning: it.exampleMeaning || it.exampleTranslation || ''
})), null, 2)}
`;

    const res = await fetch(AI_PROXY_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://quizki.app',
            'X-Title': 'Quizki Fill Blanks CLI'
        },
        body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
                { role: 'system', content: 'You are a Japanese linguist assistant. Return only valid JSON array, no markdown.' },
                { role: 'user', content: prompt }
            ]
        })
    });

    if (!res.ok) {
        const text = await res.text();
        throw new Error(`AI API error ${res.status}: ${text}`);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON
    let clean = rawContent.trim();
    if (clean.startsWith('```json')) clean = clean.slice(7);
    if (clean.startsWith('```')) clean = clean.slice(3);
    if (clean.endsWith('```')) clean = clean.slice(0, -3);
    clean = clean.trim();

    return JSON.parse(clean);
}

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    const rawData = fs.readFileSync(BOOKS_DATA_PATH, 'utf-8');
    const bookGroups = JSON.parse(rawData);

    // Collect all candidate items with blanks
    const candidateTasks = [];

    bookGroups.forEach((group, gIdx) => {
        const gName = (group.name || '').toLowerCase();
        const gId = (group.id || '').toLowerCase();
        if (groupFilter && !gName.includes(groupFilter) && !gId.includes(groupFilter)) return;

        (group.books || []).forEach((book, bIdx) => {
            const bName = (book.name || '').toLowerCase();
            const bId = (book.id || '').toLowerCase();
            if (bookFilter && !bName.includes(bookFilter) && !bId.includes(bookFilter)) return;

            (book.chapters || []).forEach((chapter, cIdx) => {
                (chapter.lessons || []).forEach((lesson, lIdx) => {
                    (lesson.vocab || []).forEach((vocab, vIdx) => {
                        if (hasBlankInExample(vocab)) {
                            candidateTasks.push({
                                gIdx, bIdx, cIdx, lIdx, vIdx,
                                groupName: group.name,
                                bookName: book.name,
                                lessonName: lesson.name,
                                vocab
                            });
                        }
                    });
                });
            });
        });
    });

    console.log(`🔍 Total items with blank examples matching filters: ${candidateTasks.length}`);
    const itemsToProcess = candidateTasks.slice(0, limit);
    console.log(`🎯 Processing ${itemsToProcess.length} items...\n`);

    let successCount = 0;
    let cachedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < itemsToProcess.length; i += batchSize) {
        const batchTasks = itemsToProcess.slice(i, i + batchSize);
        const uncompletedBatch = [];

        // Check checkpoint first
        batchTasks.forEach(task => {
            const v = task.vocab;
            const key = `${v.word || v.front}:::${(v.example || v.exampleSentence || '').trim()}`;
            if (checkpoint[key]) {
                const cached = checkpoint[key];
                v.example = cached.example;
                v.exampleSentence = cached.example;
                if (cached.exampleMeaning) {
                    v.exampleMeaning = cached.exampleMeaning;
                    v.exampleTranslation = cached.exampleMeaning;
                }
                cachedCount++;
            } else {
                uncompletedBatch.push({ ...task, key });
            }
        });

        if (uncompletedBatch.length > 0) {
            process.stdout.write(`⏳ [${Math.min(i + batchSize, itemsToProcess.length)}/${itemsToProcess.length}] Processing batch of ${uncompletedBatch.length} items via AI... `);
            try {
                const aiResults = await callAiFillBlanks(uncompletedBatch.map(t => t.vocab));
                if (Array.isArray(aiResults)) {
                    aiResults.forEach(res => {
                        const taskObj = uncompletedBatch[res.index];
                        if (taskObj && res.example) {
                            const v = taskObj.vocab;
                            v.example = res.example;
                            v.exampleSentence = res.example;
                            if (res.exampleMeaning) {
                                v.exampleMeaning = res.exampleMeaning;
                                v.exampleTranslation = res.exampleMeaning;
                            }
                            checkpoint[taskObj.key] = {
                                example: res.example,
                                exampleMeaning: res.exampleMeaning || v.exampleMeaning
                            };
                            successCount++;
                        }
                    });
                    console.log('✅ Done.');
                    if (isDryRun) {
                        console.log('Sample result:', JSON.stringify(aiResults[0], null, 2));
                    }
                } else {
                    console.log('⚠️ Unexpected AI response format.');
                    failedCount += uncompletedBatch.length;
                }
            } catch (err) {
                console.log(`❌ Error: ${err.message}`);
                failedCount += uncompletedBatch.length;
            }

            if (!isDryRun) {
                saveCheckpoint();
            }
            await sleep(delayMs);
        } else {
            console.log(`⏩ [${Math.min(i + batchSize, itemsToProcess.length)}/${itemsToProcess.length}] All items in batch already in checkpoint cache.`);
        }
    }

    console.log('\n====================================================');
    console.log('📊 EXECUTION SUMMARY');
    console.log('====================================================');
    console.log(`- Newly filled by AI: ${successCount}`);
    console.log(`- Loaded from checkpoint: ${cachedCount}`);
    console.log(`- Failed: ${failedCount}`);

    if (!isDryRun && (successCount > 0 || cachedCount > 0)) {
        fs.writeFileSync(BOOKS_DATA_PATH, JSON.stringify(bookGroups, null, 2), 'utf-8');
        console.log(`\n🎉 Successfully saved updated books to: ${BOOKS_DATA_PATH}`);
    } else if (isDryRun) {
        console.log('\n🔍 Dry run completed. No files were modified.');
    }
}

main().catch(e => {
    console.error('Fatal execution error:', e);
    process.exit(1);
});
