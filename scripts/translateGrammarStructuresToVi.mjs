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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isEnglish(text) {
    if (!text || typeof text !== 'string') return false;
    const str = text.trim();
    if (!str) return false;
    
    // Check if contains significant English words
    return /\b(are|is|all|positional|pronoun|pronouns|the|noun|verb|adjective|modifies|used|express|meaning|when|sentence|indicates|following|preceding|clause|greetings|emphasize|thanks|apology|particle|conjunction|adverb|spoken|written|formal|informal|casual|stem)\b/i.test(str);
}

// Translate with Gemini 2.5 Flash via OpenRouter
async function translateWithAI(items, retries = 3) {
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
                            content: `Bạn là chuyên gia ngữ pháp tiếng Nhật JLPT.
Hãy dịch các câu mô tả/công thức cấu trúc ngữ pháp (structures/connection) từ tiếng Anh sang tiếng Việt:
1. Dịch chuẩn xác, sư phạm, giữ nguyên cấu trúc ngữ pháp, ký hiệu V, N, A, A-い, A-な, trợ từ, mũi tên ->, dấu cộng +, dấu gạch chéo /, dấu gạch ngang <s>...</s> và các từ tiếng Nhật.
2. Ví dụ: "ここ／そこ／あそこ／こちら／そちら／あちら are all positional pronouns." -> "ここ / そこ / あそこ / こちら / そちら / あちら đều là các đại từ chỉ vị trí, phương hướng."
3. Ví dụ: "すぐ is a conjunction" -> "すぐ là một liên từ"
4. Ví dụ: "が is used as a particle in a sentence." -> "が được dùng làm trợ từ trong câu."
Trả về JSON array: [{"id": 0, "vi": "..."}]`
                        },
                        {
                            role: 'user',
                            content: JSON.stringify(items, null, 2)
                        }
                    ],
                    temperature: 0.1
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

    const queue = [];

    for (const tb of data) {
        for (const ls of tb.lessons || []) {
            for (const pt of (ls.points || ls.grammarPoints || [])) {
                // Check structureRaw
                if (pt.structureRaw && isEnglish(pt.structureRaw)) {
                    queue.push({ pt, field: 'structureRaw', text: pt.structureRaw, pattern: pt.pattern });
                }
                // Check connection
                if (Array.isArray(pt.connection)) {
                    pt.connection.forEach((c, idx) => {
                        if (typeof c === 'string' && isEnglish(c)) {
                            queue.push({ pt, field: 'connection', idx, text: c, pattern: pt.pattern });
                        }
                    });
                }
                // Check structure
                if (Array.isArray(pt.structure)) {
                    pt.structure.forEach((st, idx) => {
                        const t = typeof st === 'string' ? st : (st.text || '');
                        if (isEnglish(t)) {
                            queue.push({ pt, field: 'structure', idx, obj: st, text: t, pattern: pt.pattern });
                        }
                    });
                }
            }
        }
    }

    console.log(`\n📊 Tìm thấy ${queue.length} chuỗi cấu trúc chứa tiếng Anh.`);

    if (queue.length > 0) {
        const BATCH_SIZE = 20;
        for (let i = 0; i < queue.length; i += BATCH_SIZE) {
            const chunk = queue.slice(i, i + BATCH_SIZE);
            const promptItems = chunk.map((item, cIdx) => ({
                id: cIdx,
                pattern: item.pattern,
                englishStructure: item.text
            }));

            const results = await translateWithAI(promptItems);
            if (results && Array.isArray(results)) {
                for (const res of results) {
                    const item = chunk[res.id];
                    if (item && res.vi) {
                        if (item.field === 'structureRaw') {
                            item.pt.structureRaw = res.vi;
                        } else if (item.field === 'connection') {
                            item.pt.connection[item.idx] = res.vi;
                        } else if (item.field === 'structure') {
                            if (typeof item.obj === 'string') {
                                item.pt.structure[item.idx] = res.vi;
                            } else if (item.obj && typeof item.obj === 'object') {
                                item.obj.text = res.vi;
                            }
                        }
                    }
                }
            } else {
                for (const item of chunk) {
                    const trans = await translateWithGoogle(item.text);
                    if (item.field === 'structureRaw') {
                        item.pt.structureRaw = trans;
                    } else if (item.field === 'connection') {
                        item.pt.connection[item.idx] = trans;
                    } else if (item.field === 'structure') {
                        if (typeof item.obj === 'string') {
                            item.pt.structure[item.idx] = trans;
                        } else if (item.obj && typeof item.obj === 'object') {
                            item.obj.text = trans;
                        }
                    }
                }
            }
            console.log(`  ✓ Đã dịch ${Math.min(i + BATCH_SIZE, queue.length)}/${queue.length} cấu trúc`);
            await sleep(500);
        }
    }

    // Save back to grammar_data.json
    fs.writeFileSync(GRAMMAR_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`\n🎉 HOÀN THÀNH! Đã lưu toàn bộ cấu trúc tiếng Việt vào ${GRAMMAR_FILE}`);
}

main().catch(err => {
    console.error('Lỗi thực thi:', err);
    process.exit(1);
});
