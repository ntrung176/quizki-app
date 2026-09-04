import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env', 'utf-8');
function getEnv(key) {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
}
const apiKey = getEnv('VITE_OPENROUTER_API_KEY');
const GRAMMAR_FILE = path.join(process.cwd(), 'public/data/grammar_data.json');
const data = JSON.parse(fs.readFileSync(GRAMMAR_FILE, 'utf-8'));
const master = data.find(t => t.id === 'master_bank');

function containsEnglish(text) {
    if (!text) return false;
    return /\b(are particles|indicating|destination|direction|which an action|noun before|shows movement|abstract concept|for example|qualifies a noun|refers to|used when|indicates that|structure used|equivalent to|used to describe|expresses the speaker)\b/i.test(text);
}

const remaining = [];
for (const lesson of master.lessons) {
    for (const pt of lesson.points) {
        if (containsEnglish(pt.meaningFull)) {
            remaining.push({ id: pt.id, pattern: pt.pattern, textEn: pt.meaningFull });
        }
    }
}

console.log('Remaining points with English paragraphs:', remaining.length);

if (remaining.length > 0) {
    // Process in batches of 10
    for (let i = 0; i < remaining.length; i += 10) {
        const chunk = remaining.slice(i, i + 10);
        console.log(`Processing remaining batch ${i / 10 + 1}...`);
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                        {
                            role: 'system',
                            content: 'Bạn là chuyên gia giảng dạy tiếng Nhật JLPT. Hãy dịch các đoạn giải thích ngữ pháp tiếng Anh sang tiếng Việt một cách tự nhiên, sư phạm, chuẩn xác, giữ nguyên các ký hiệu ngoặc 「」. Trả về định dạng JSON mảng các object: [{"id": "...", "textVi": "..."}].'
                        },
                        {
                            role: 'user',
                            content: JSON.stringify(chunk, null, 2)
                        }
                    ],
                    temperature: 0.2
                })
            });

            if (res.ok) {
                const resJson = await res.json();
                const content = resJson.choices?.[0]?.message?.content?.trim() || '';
                const match = content.match(/\[[\s\S]*\]/);
                if (match) {
                    const results = JSON.parse(match[0]);
                    const map = {};
                    results.forEach(r => { map[r.id] = r.textVi; });
                    for (const tb of data) {
                        for (const ls of tb.lessons || []) {
                            for (const pt of ls.points || []) {
                                if (map[pt.id]) {
                                    pt.meaningFull = map[pt.id];
                                }
                            }
                        }
                    }
                }
            }
        } catch (e) {
            console.warn('Batch error:', e.message);
        }
    }

    fs.writeFileSync(GRAMMAR_FILE, JSON.stringify(data, null, 2), 'utf-8');
    console.log('Successfully completed full translation pass!');
}
