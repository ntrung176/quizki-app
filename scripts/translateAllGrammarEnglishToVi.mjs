import fs from 'fs';
import path from 'path';

// Read .env
const envContent = fs.readFileSync('.env', 'utf-8');
function getEnv(key) {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
}

const OPENROUTER_API_KEY = getEnv('VITE_OPENROUTER_API_KEY');
const GRAMMAR_FILE = path.join(process.cwd(), 'public/data/grammar_data.json');

if (!OPENROUTER_API_KEY) {
    console.error('Missing VITE_OPENROUTER_API_KEY in .env');
    process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isEnglish(text) {
    if (!text || typeof text !== 'string') return false;
    const str = text.trim();
    if (!str) return false;
    
    // Check if contains significant English words
    const englishWordMatches = str.match(/\b(is|the|to|in|of|and|used|when|express|that|indicates|with|for|means|pattern|verb|noun|clause|describes|action|situation|typically|usually|refers|expressing|used to|such as|form of|sentence|should|must|have to|because|about|from|can be|cannot|equivalent|also|meaning|addition|spoken|written|formal|casual|affirmative|negative|honorific|humble)\b/gi);
    
    if (englishWordMatches && englishWordMatches.length >= 2) return true;
    
    // Pure ASCII sentences
    const isPureAscii = /^[a-zA-Z0-9\s,\.'\?!\":;—\(\)\/\$%\&`´’\-\–\—\=\+\[\]]+$/.test(str) && /[a-zA-Z]{3,}/.test(str);
    const hasVietnameseAccent = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(str);
    
    return isPureAscii && !hasVietnameseAccent;
}

// Translate with Gemini 2.5 Flash via OpenRouter
async function translateWithAI(items, systemPrompt, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                        {
                            role: 'system',
                            content: systemPrompt
                        },
                        {
                            role: 'user',
                            content: JSON.stringify(items, null, 2)
                        }
                    ],
                    temperature: 0.2
                })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter error ${response.status}: ${errText}`);
            }

            const resData = await response.json();
            const content = resData.choices?.[0]?.message?.content?.trim() || '';
            const jsonMatch = content.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
                return JSON.parse(jsonMatch[0]);
            }
            throw new Error('No valid JSON array found in AI response');
        } catch (e) {
            console.warn(`[AI Retry ${attempt}/${retries}] Error: ${e.message}`);
            if (attempt < retries) {
                await sleep(1500 * attempt);
            }
        }
    }
    return null;
}

// Google Translate fallback
async function translateWithGoogle(text) {
    try {
        const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(text);
        const res = await fetch(url);
        if (!res.ok) return text;
        const json = await res.json();
        return json[0].map(item => item[0]).join('').trim();
    } catch {
        return text;
    }
}

async function main() {
    console.log('📖 Đang đọc file grammar_data.json...');
    const rawData = fs.readFileSync(GRAMMAR_FILE, 'utf-8');
    const data = JSON.parse(rawData);

    const tipsQueue = [];
    const meaningFullQueue = [];
    const meaningQueue = [];
    const examplesQueue = [];

    for (const tb of data) {
        for (const ls of tb.lessons || []) {
            for (const pt of (ls.points || ls.grammarPoints || [])) {
                // 1. Tips
                if (pt.tips && Array.isArray(pt.tips)) {
                    pt.tips.forEach((tip, idx) => {
                        const t = typeof tip === 'string' ? tip : (tip.text || '');
                        if (isEnglish(t)) {
                            tipsQueue.push({ pt, tipObj: tip, idx, original: t, pattern: pt.pattern });
                        }
                    });
                }
                // 2. MeaningFull
                if (isEnglish(pt.meaningFull)) {
                    meaningFullQueue.push({ pt, original: pt.meaningFull, pattern: pt.pattern });
                }
                // 3. Meaning / MeaningShort
                if (isEnglish(pt.meaning)) {
                    meaningQueue.push({ pt, original: pt.meaning, pattern: pt.pattern });
                }
                // 4. Examples
                if (pt.examples && Array.isArray(pt.examples)) {
                    pt.examples.forEach((ex, idx) => {
                        if (typeof ex === 'object' && ex.vi && isEnglish(ex.vi)) {
                            examplesQueue.push({ pt, ex, idx, ja: ex.ja, original: ex.vi, pattern: pt.pattern });
                        }
                    });
                }
            }
        }
    }

    console.log(`\n📊 Thống kê các mục tiếng Anh cần dịch sang tiếng Việt:`);
    console.log(`- Chú ý & Mẹo học (Tips): ${tipsQueue.length}`);
    console.log(`- Giải thích chi tiết (MeaningFull): ${meaningFullQueue.length}`);
    console.log(`- Ý nghĩa ngắn (Meaning): ${meaningQueue.length}`);
    console.log(`- Câu ví dụ (Examples): ${examplesQueue.length}`);

    // Dịch Tips
    if (tipsQueue.length > 0) {
        console.log(`\n🔄 Đang dịch ${tipsQueue.length} Chú ý (Tips)...`);
        const BATCH_SIZE = 15;
        for (let i = 0; i < tipsQueue.length; i += BATCH_SIZE) {
            const chunk = tipsQueue.slice(i, i + BATCH_SIZE);
            const promptItems = chunk.map((item, cIdx) => ({
                id: cIdx,
                pattern: item.pattern,
                englishTip: item.original
            }));

            const sysPrompt = `Bạn là chuyên gia biên soạn giáo trình tiếng Nhật JLPT.
Hãy dịch các Chú ý / Mẹo học ngữ pháp từ tiếng Anh sang tiếng Việt:
1. Dịch tự nhiên, sư phạm, chính xác thuật ngữ ngữ pháp tiếng Nhật (ví dụ: trợ từ, thể sai khiến, kính ngữ, thể ない, v.v.).
2. Giữ nguyên các biểu tượng (như ☞, 💡, dấu ngoặc 「」, câu tiếng Nhật).
Trả về JSON array: [{"id": 0, "vietnameseTip": "..."}]`;

            const results = await translateWithAI(promptItems, sysPrompt);
            if (results && Array.isArray(results)) {
                for (const res of results) {
                    const item = chunk[res.id];
                    if (item && res.vietnameseTip) {
                        if (typeof item.tipObj === 'string') {
                            item.pt.tips[item.idx] = res.vietnameseTip;
                        } else if (item.tipObj && typeof item.tipObj === 'object') {
                            item.tipObj.text = res.vietnameseTip;
                        }
                    }
                }
            } else {
                // Fallback Google
                for (const item of chunk) {
                    const trans = await translateWithGoogle(item.original);
                    if (typeof item.tipObj === 'string') {
                        item.pt.tips[item.idx] = trans;
                    } else if (item.tipObj && typeof item.tipObj === 'object') {
                        item.tipObj.text = trans;
                    }
                }
            }
            console.log(`  ✓ Đã dịch ${Math.min(i + BATCH_SIZE, tipsQueue.length)}/${tipsQueue.length} tips`);
            await sleep(500);
        }
    }

    // Dịch MeaningFull
    if (meaningFullQueue.length > 0) {
        console.log(`\n🔄 Đang dịch ${meaningFullQueue.length} Giải thích chi tiết (MeaningFull)...`);
        const BATCH_SIZE = 15;
        for (let i = 0; i < meaningFullQueue.length; i += BATCH_SIZE) {
            const chunk = meaningFullQueue.slice(i, i + BATCH_SIZE);
            const promptItems = chunk.map((item, cIdx) => ({
                id: cIdx,
                pattern: item.pattern,
                meaningShortVi: item.pt.meaning || item.pt.meaningShort,
                explanationEn: item.original
            }));

            const sysPrompt = `Bạn là chuyên gia biên soạn giáo trình ngữ pháp tiếng Nhật JLPT.
Hãy dịch phần giải thích ngữ pháp từ tiếng Anh sang tiếng Việt:
1. Tự nhiên, rõ ràng, sư phạm, chuẩn mực.
2. Giữ nguyên các ký hiệu ngoặc vuông 「」, trợ từ, liên kết thể, v.v.
Trả về JSON array: [{"id": 0, "explanationVi": "..."}]`;

            const results = await translateWithAI(promptItems, sysPrompt);
            if (results && Array.isArray(results)) {
                for (const res of results) {
                    const item = chunk[res.id];
                    if (item && res.explanationVi) {
                        item.pt.meaningFull = res.explanationVi;
                    }
                }
            } else {
                for (const item of chunk) {
                    const trans = await translateWithGoogle(item.original);
                    item.pt.meaningFull = trans;
                }
            }
            console.log(`  ✓ Đã dịch ${Math.min(i + BATCH_SIZE, meaningFullQueue.length)}/${meaningFullQueue.length} meaningFull`);
            await sleep(500);
        }
    }

    // Dịch Meaning
    if (meaningQueue.length > 0) {
        console.log(`\n🔄 Đang dịch ${meaningQueue.length} Ý nghĩa ngắn (Meaning)...`);
        for (const item of meaningQueue) {
            const trans = await translateWithGoogle(item.original);
            item.pt.meaning = trans;
            if (!item.pt.meaningShort || isEnglish(item.pt.meaningShort)) {
                item.pt.meaningShort = trans;
            }
        }
    }

    // Dịch Examples
    if (examplesQueue.length > 0) {
        console.log(`\n🔄 Đang dịch ${examplesQueue.length} Câu ví dụ...`);
        const BATCH_SIZE = 25;
        for (let i = 0; i < examplesQueue.length; i += BATCH_SIZE) {
            const chunk = examplesQueue.slice(i, i + BATCH_SIZE);
            const promptItems = chunk.map((item, cIdx) => ({
                id: cIdx,
                pattern: item.pattern,
                ja: item.ja,
                en: item.original
            }));

            const sysPrompt = `Bạn là chuyên gia dịch thuật Nhật - Việt.
Dịch các câu ví dụ tiếng Nhật và câu tiếng Anh tương ứng sang câu tiếng Việt chuẩn xác, tự nhiên:
Trả về JSON array: [{"id": 0, "vi": "..."}]`;

            const results = await translateWithAI(promptItems, sysPrompt);
            if (results && Array.isArray(results)) {
                for (const res of results) {
                    const item = chunk[res.id];
                    if (item && res.vi) {
                        item.ex.vi = res.vi;
                    }
                }
            } else {
                for (const item of chunk) {
                    const trans = await translateWithGoogle(item.original);
                    item.ex.vi = trans;
                }
            }
            console.log(`  ✓ Đã dịch ${Math.min(i + BATCH_SIZE, examplesQueue.length)}/${examplesQueue.length} câu ví dụ`);
            await sleep(500);
        }
    }

    // Ghi lại vào public/data/grammar_data.json
    fs.writeFileSync(GRAMMAR_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n🎉 HOÀN THÀNH! Đã lưu toàn bộ bản dịch tiếng Việt vào ${GRAMMAR_FILE}`);
}

main().catch(err => {
    console.error('Lỗi thực thi:', err);
    process.exit(1);
});
