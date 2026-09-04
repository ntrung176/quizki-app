import fs from 'fs';
import path from 'path';

const envContent = fs.readFileSync('.env', 'utf-8');
function getEnv(key) {
    const match = envContent.match(new RegExp(`${key}=(.+)`));
    return match ? match[1].trim() : '';
}

const OPENROUTER_API_KEY = getEnv('VITE_OPENROUTER_API_KEY');
const DATA_PATH = path.join(process.cwd(), 'public/data/grammar_data.json');
const CACHE_FILE = path.join(process.cwd(), 'scripts/.grammar_translations.json');

if (!OPENROUTER_API_KEY) {
    console.error('Missing VITE_OPENROUTER_API_KEY in .env');
    process.exit(1);
}

// Load existing translation cache if any
let transCache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        transCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
    } catch (e) {}
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isEnglish(text) {
    if (!text) return false;
    return /[a-zA-Z]{3,}/.test(text) && !/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(text);
}

async function translateBatchWithGemini(items) {
    const promptLines = items.map((it, idx) => `${idx + 1}. Japanese: "${it.ja}" | English: "${it.en}"`).join('\n');
    const prompt = `Hãy dịch các câu ví dụ tiếng Nhật sau sang tiếng Việt chuẩn xác, tự nhiên, sát nghĩa cho việc học ngữ pháp JLPT.
Trả về DUY NHẤT một JSON array chứa các câu dịch tiếng Việt tương ứng theo đúng thứ tự (độ dài mảng đúng bằng ${items.length}):
["Dịch nghĩa câu 1", "Dịch nghĩa câu 2", ...]

Dữ liệu nguồn:
${promptLines}`;

    for (let retry = 0; retry < 3; retry++) {
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${OPENROUTER_API_KEY}`
                },
                body: JSON.stringify({
                    model: 'google/gemini-2.5-flash',
                    messages: [
                        { role: 'system', content: 'You are an expert Japanese-to-Vietnamese translator. Output ONLY a valid JSON string array of Vietnamese translations.' },
                        { role: 'user', content: prompt }
                    ],
                    temperature: 0.1
                })
            });

            if (!res.ok) {
                await sleep(2000);
                continue;
            }

            const data = await res.json();
            const text = data.choices?.[0]?.message?.content?.trim() || '';
            const match = text.match(/\[[\s\S]*\]/);
            if (match) {
                const arr = JSON.parse(match[0]);
                if (Array.isArray(arr) && arr.length === items.length) {
                    return arr;
                }
            }
        } catch (e) {
            await sleep(2000);
        }
    }
    return null;
}

async function main() {
    console.log('🌐 Bắt đầu tự động dịch các câu ví dụ tiếng Nhật sang tiếng Việt chuẩn bằng Gemini 2.5 Flash (đa luồng siêu tốc)...');
    const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf-8'));

    const itemsToTranslate = [];
    data[0].lessons.forEach(l => {
        l.points.forEach(p => {
            p.examples.forEach(ex => {
                const cacheKey = `${ex.ja}_||_${ex.vi}`;
                if (transCache[cacheKey]) {
                    ex.vi = transCache[cacheKey];
                } else if (isEnglish(ex.vi)) {
                    itemsToTranslate.push({ ex, ja: ex.ja, en: ex.vi, cacheKey });
                }
            });
        });
    });

    console.log(`📊 Tổng số câu cần dịch còn lại: ${itemsToTranslate.length} câu.`);

    const BATCH_SIZE = 40;
    const CONCURRENCY = 6;
    const allBatches = [];

    for (let i = 0; i < itemsToTranslate.length; i += BATCH_SIZE) {
        allBatches.push(itemsToTranslate.slice(i, i + BATCH_SIZE));
    }

    let completedBatches = 0;

    for (let i = 0; i < allBatches.length; i += CONCURRENCY) {
        const chunk = allBatches.slice(i, i + CONCURRENCY);
        
        await Promise.all(chunk.map(async (batch, idx) => {
            const batchNum = i + idx + 1;
            const translations = await translateBatchWithGemini(batch);
            if (translations) {
                batch.forEach((item, itemIdx) => {
                    const translatedVi = translations[itemIdx];
                    if (translatedVi && typeof translatedVi === 'string') {
                        item.ex.vi = translatedVi.trim();
                        transCache[item.cacheKey] = translatedVi.trim();
                    }
                });
            } else {
                console.warn(`⚠️ Batch ${batchNum} gặp lỗi sau retry.`);
            }
            completedBatches++;
        }));

        const totalDone = Math.min((i + CONCURRENCY) * BATCH_SIZE, itemsToTranslate.length);
        console.log(`[Tiến độ dịch] Đã hoàn thành ${totalDone} / ${itemsToTranslate.length} câu (${Math.round(totalDone / itemsToTranslate.length * 100)}%)...`);

        // Save progress
        fs.writeFileSync(CACHE_FILE, JSON.stringify(transCache, null, 2), 'utf-8');
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');

        await sleep(300);
    }

    // Final save
    fs.writeFileSync(CACHE_FILE, JSON.stringify(transCache, null, 2), 'utf-8');
    fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`\n🎉 HOÀN THÀNH DỊCH 100% CÂU VÍ DỤ NGỮ PHÁP SANG TIẾNG VIỆT!`);
    console.log(`📁 Dữ liệu hoàn thiện đã lưu tại: ${DATA_PATH}`);
}

main().catch(err => {
    console.error('Error in translation script:', err);
    process.exit(1);
});
