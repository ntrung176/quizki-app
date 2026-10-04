import fs from 'fs';
import path from 'path';
import { jsonrepair } from 'jsonrepair';

const AI_PROXY_URL = 'https://quizki-ai-proxy.lynguyennhattrung1706.workers.dev/';
const DATA_DIR = path.join(process.cwd(), 'data/openjlpt/books_scraped');
const CLEAN_CACHE_DIR = path.join(process.cwd(), 'data/clean_ai_books');

if (!fs.existsSync(CLEAN_CACHE_DIR)) {
    fs.mkdirSync(CLEAN_CACHE_DIR, { recursive: true });
}

function safeParseJson(rawStr) {
    if (!rawStr || typeof rawStr !== 'string') throw new Error('Empty AI response');
    let s = rawStr.trim();
    // Strip markdown code fences if any
    s = s.replace(/^```(?:json|javascript|js)?\s*/i, '').replace(/```\s*$/i, '').trim();
    
    const firstBrace = s.indexOf('{');
    const lastBrace = s.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1) {
        s = s.slice(firstBrace, lastBrace + 1);
    }
    
    // 1. Standard JSON parse
    try {
        return JSON.parse(s);
    } catch (e1) {
        // 2. High-precision jsonrepair (handles unescaped inner quotes, trailing commas, missing quotes)
        try {
            const repaired = jsonrepair(s);
            return JSON.parse(repaired);
        } catch (e2) {
            // 3. Parse as JavaScript Object Literal
            try {
                const parseFn = new Function(`return (${s})`);
                const res = parseFn();
                if (res && typeof res === 'object') return res;
            } catch (e3) {
                // 4. Sanitization & fallback repair
                try {
                    const sanitized = s
                        .replace(/(?<="[^"]*)\n(?=[^"]*")/g, '\\n')
                        .replace(/,\s*([}\]])/g, '$1')
                        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
                    return JSON.parse(jsonrepair(sanitized));
                } catch (e4) {
                    throw e1;
                }
            }
        }
    }
}

function formatTime(seconds) {
    const totalSec = Math.max(0, Math.floor(seconds));
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`;
}

function renderProgressBar(current, total, startTime) {
    const percent = Math.min(100, Math.round((current / total) * 1000) / 10);
    const barWidth = 20;
    const filled = Math.min(barWidth, Math.round((percent / 100) * barWidth));
    const empty = Math.max(0, barWidth - filled);
    const bar = '█'.repeat(filled) + '░'.repeat(empty);

    const elapsedSec = (Date.now() - startTime) / 1000;
    const speed = current > 0 ? (elapsedSec / current) : 0;
    const remainingSec = (total - current) * speed;

    return `[${bar}] ${percent.toFixed(1)}% (${current}/${total}) | ⏱ Đã chạy: ${formatTime(elapsedSec)} | ⏳ Còn lại: ~${formatTime(remainingSec)} (⚡ ${speed.toFixed(1)}s/bài)`;
}

/**
 * Calls Gemini 2.5 Flash via Cloudflare AI Proxy
 */
async function callGemini(prompt, systemInstruction = '', retries = 3) {
    const payload = {
        model: 'google/gemini-2.5-flash',
        messages: [
            ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
            { role: 'user', content: prompt }
        ],
        response_format: { type: 'json_object' },
        max_tokens: 8192,
        temperature: 0.1
    };

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(AI_PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`AI Proxy error ${res.status}: ${errText}`);
            }

            const data = await res.json();
            const content = data.choices?.[0]?.message?.content || '';
            return safeParseJson(content);
        } catch (err) {
            if (attempt === retries) throw err;
            console.warn(`⚠️ Attempt ${attempt} failed, retrying in 2s... (${err.message})`);
            await new Promise(r => setTimeout(r, 2000));
        }
    }
}

/**
 * Strict System Instruction for JLPT Reading & Question verification
 */
const SYSTEM_INSTRUCTION = `Bạn là chuyên gia thẩm định và biên soạn đề thi JLPT N5 - N1 cao cấp.
Nhiệm vụ: Phân tích bài đọc JLPT và câu hỏi, xác thực 100% đáp án đúng, dịch nghĩa chuẩn xác từng câu, bóc tách từ vựng, ngữ pháp và viết giải thích chi tiết cho từng phương án.

LƯU Ý QUAN TRỌNG:
- Không dùng dấu ngoặc kép thường "" bên trong giá trị chuỗi, hãy dùng dấu ngoặc đơn '' hoặc ngoặc tiếng Nhật 「」.
- Đảm bảo JSON hợp lệ 100%.

Trả về kết quả ở định dạng JSON thuần túy (JSON object) theo đúng cấu trúc sau:
{
  "passage": "Văn bản bài đọc gốc tiếng Nhật sạch 100% (không chứa câu hỏi, số thứ tự hay text rác)",
  "passageVi": "Bản dịch toàn bộ bài đọc sang tiếng Việt tự nhiên",
  "sentences": [
    {
      "jp": "Câu tiếng Nhật",
      "vi": "Dịch nghĩa câu sang tiếng Việt",
      "reading": "Cách đọc furigana/hiragana nếu có từ khó",
      "vocab": [
        { "w": "Từ vựng", "read": "Cách đọc", "vi": "Nghĩa" }
      ],
      "grammar": [
        { "point": "Mẫu ngữ pháp", "vi": "Ý nghĩa/cách dùng" }
      ]
    }
  ],
  "questions": [
    {
      "question": "Câu hỏi tiếng Nhật",
      "questionVi": "Dịch câu hỏi sang tiếng Việt",
      "options": ["Phương án A", "Phương án B", "Phương án C", "Phương án D"],
      "optionsVi": ["Dịch phương án A", "Dịch phương án B", "Dịch phương án C", "Dịch phương án D"],
      "correctAnswer": 0, // Index 0, 1, 2, hoặc 3 của phương án ĐÚNG NHẤT
      "explanationData": {
        "correctReason": "Lý do vì sao phương án này đúng (ngắn gọn, chuẩn xác)",
        "quote": "Câu hoặc đoạn trích dẫn nguyên văn trong bài đọc làm bằng chứng",
        "wrongReasons": [
          { "optionIndex": 1, "reason": "Vì sao phương án B sai (phản ánh đúng nội dung phương án B)" },
          { "optionIndex": 2, "reason": "Vì sao phương án C sai (phản ánh đúng nội dung phương án C)" },
          { "optionIndex": 3, "reason": "Vì sao phương án D sai (phản ánh đúng nội dung phương án D)" }
        ],
        "deepAnalysis": "Phân tích ngữ cảnh, cấu trúc ngữ pháp trọng tâm hoặc căn cứ logic",
        "tips": "Mẹo làm bài hoặc lưu ý tránh bẫy câu này"
      }
    }
  ]
}`;

/**
 * Cleans a single test item with AI
 */
export async function cleanTestWithAI(rawTestItem, bookSlug = '', testIndex = 0) {
    const prompt = `Hãy thẩm định, làm sạch và chuẩn hóa bài đọc JLPT sau:
Tên bộ sách: ${bookSlug} (Bài ${testIndex + 1})

--- DỮ LIỆU BÀI ĐỌC THÔ ---
${typeof rawTestItem.passage === 'object' ? JSON.stringify(rawTestItem.passage) : rawTestItem.passage || ''}

--- DỮ LIỆU CÂU HỎI THÔ ---
${JSON.stringify(rawTestItem.questions || [], null, 2)}

Yêu cầu:
1. Xác định chính xác 100% đáp án đúng cho từng câu hỏi dựa trên nội dung bài đọc.
2. Viết lý do đúng ngắn gọn, trích dẫn chứng cứ trong bài đọc.
3. Viết giải thích riêng cho từng phương án sai (giải thích đúng theo nội dung của phương án đó, không bị nhầm lẫn).
4. Phân tích chi tiết từng câu trong bài đọc (dịch nghĩa, từ vựng, ngữ pháp).`;

    return await callGemini(prompt, SYSTEM_INSTRUCTION);
}

/**
 * Batch cleans an entire book with incremental caching
 */
export async function cleanBook(bookSlug, level = 'N3', limit = null) {
    const fileName = `scraped_${level.toLowerCase()}_books__${bookSlug}.json`;
    const fullPath = path.join(DATA_DIR, fileName);

    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Không tìm thấy file: ${fullPath}`);
        return;
    }

    const rawData = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    const book = rawData.default || rawData;
    const tests = book.tests || [];

    console.log(`\n📚 [BẮT ĐẦU CLEAN] Sách: ${bookSlug} (${level}) - Tổng ${tests.length} bài`);

    const cacheFile = path.join(CLEAN_CACHE_DIR, `clean_${level.toLowerCase()}_${bookSlug}.json`);
    let cleanedTests = [];

    if (fs.existsSync(cacheFile)) {
        try {
            cleanedTests = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
            console.log(`⏩ Đã khôi phục cache: ${cleanedTests.length}/${tests.length} bài đã làm sạch trước đó.`);
        } catch (e) {}
    }

    const maxToProcess = limit ? Math.min(tests.length, limit) : tests.length;
    const batchStartTime = Date.now();
    let processedInThisRun = 0;

    console.log(`\n📊 TIẾN ĐỘ BẮT ĐẦU: ${renderProgressBar(cleanedTests.length, maxToProcess, batchStartTime)}\n`);

    for (let i = cleanedTests.length; i < maxToProcess; i++) {
        const testItem = tests[i];
        console.log(`⏳ Đang xử lý [Bài ${i + 1}/${maxToProcess}]...`);

        try {
            const cleaned = await cleanTestWithAI(testItem, bookSlug, i);
            cleanedTests.push({
                testIndex: i,
                rawTitle: testItem.title || `Bài ${i + 1}`,
                ...cleaned
            });
            processedInThisRun++;

            // Save cache incrementally after every test
            fs.writeFileSync(cacheFile, JSON.stringify(cleanedTests, null, 2), 'utf8');
            console.log(`✅ [Bài ${i + 1}/${maxToProcess}] Thành công!`);
            console.log(`   ${renderProgressBar(cleanedTests.length, maxToProcess, batchStartTime)}\n`);
        } catch (err) {
            console.error(`❌ [Bài ${i + 1}] Thất bại:`, err.message);
            break;
        }

        // Small delay to prevent rate limit
        await new Promise(r => setTimeout(r, 600));
    }

    console.log(`\n🎉 Hoàn thành làm sạch cho ${bookSlug}: ${cleanedTests.length}/${maxToProcess} bài!`);
    
    // Auto-recompile test database to public/data/
    try {
        console.log('🔄 Đang đồng bộ và biên dịch lại ngân hàng đề thi vào public/data/jlpt/...');
        const { execSync } = await import('child_process');
        execSync('node scripts/compileCleanJLPTTestBank.mjs', { stdio: 'inherit' });
        console.log('✨ Đồng bộ thành công!');
    } catch (e) {
        console.warn('⚠️ Lỗi khi tự động biên dịch đề thi:', e.message);
    }
}

// Command-line execution
const args = process.argv.slice(2);
const bookArg = args.find(a => a.startsWith('--book='));
const levelArg = args.find(a => a.startsWith('--level='));
const limitArg = args.find(a => a.startsWith('--limit='));

const targetBook = bookArg ? bookArg.replace('--book=', '') : '6nd_dokkai_n3';
const targetLevel = levelArg ? levelArg.replace('--level=', '').toUpperCase() : 'N3';
const targetLimit = limitArg ? parseInt(limitArg.replace('--limit=', ''), 10) : null;

console.log(`🎯 Chạy batch cleaning: Book=${targetBook}, Level=${targetLevel}, Limit=${targetLimit || 'Toàn bộ'}`);
cleanBook(targetBook, targetLevel, targetLimit).catch(err => {
    console.error('Fatal batch error:', err);
});
