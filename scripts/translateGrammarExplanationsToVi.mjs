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
const CACHE_FILE = path.join(process.cwd(), 'scripts/.grammar_explanation_translations.json');

if (!OPENROUTER_API_KEY) {
    console.error('Missing VITE_OPENROUTER_API_KEY in .env');
    process.exit(1);
}

// Load cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf-8'));
        console.log(`Loaded ${Object.keys(cache).length} cached translations.`);
    } catch (e) {
        console.warn('Failed to parse cache:', e.message);
    }
}

function saveCache() {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isEnglish(text) {
    if (!text || typeof text !== 'string') return false;
    return /\b(is|the|to|in|of|and|used|when|express|that|indicates|with|for|means|pattern|verb|noun|clause|describes|action|situation|typically|usually|refers|expressing|used to|such as|form of)\b/i.test(text);
}

// Translate a batch with Gemini 2.5 Flash
async function translateBatch(items, retries = 3) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const promptItems = items.map(item => ({
                id: item.id,
                pattern: item.pattern,
                meaningVi: item.meaning || item.meaningShort,
                explanationEn: item.meaningFull
            }));

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
                            content: `Bạn là chuyên gia biên soạn giáo trình tiếng Nhật JLPT chất lượng cao.
Hãy dịch phần giải thích ngữ pháp tiếng Anh (explanationEn) sang tiếng Việt (explanationVi) một cách:
1. Tự nhiên, ngắn gọn, xúc tích, sư phạm, chuẩn ngữ pháp tiếng Việt.
2. Giữ nguyên các ký hiệu ngoặc vuông 「」, trợ từ, liên kết thể, v.v.
3. Không thêm các từ thừa thãi.
Trả về định dạng JSON thuần mảng các object: [{"id": "...", "explanationVi": "..."}].`
                        },
                        {
                            role: 'user',
                            content: JSON.stringify(promptItems, null, 2)
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
                const results = JSON.parse(jsonMatch[0]);
                return results;
            }
            throw new Error('No valid JSON array found in AI response');
        } catch (e) {
            console.warn(`[Batch retry ${attempt}/${retries}] Error: ${e.message}`);
            if (attempt < retries) {
                await sleep(1500 * attempt);
            }
        }
    }
    return null;
}

async function main() {
    const rawData = JSON.parse(fs.readFileSync(GRAMMAR_FILE, 'utf-8'));
    const master = rawData.find(t => t.id === 'master_bank');
    if (!master) {
        console.error('master_bank not found');
        return;
    }

    // Collect all points across master lessons
    const allPointsMap = new Map();
    for (const lesson of master.lessons) {
        for (const pt of lesson.points) {
            if (!allPointsMap.has(pt.id)) {
                allPointsMap.set(pt.id, pt);
            }
        }
    }

    const allPoints = Array.from(allPointsMap.values());
    console.log(`Total unique grammar points: ${allPoints.length}`);

    // Filter points needing translation
    const needed = allPoints.filter(pt => {
        if (!pt.meaningFull) return false;
        if (cache[pt.id]) return false;
        return isEnglish(pt.meaningFull);
    });

    console.log(`Points needing explanation translation: ${needed.length}`);

    // Chunk into batches of 20
    const BATCH_SIZE = 20;
    const batches = [];
    for (let i = 0; i < needed.length; i += BATCH_SIZE) {
        batches.push(needed.slice(i, i + BATCH_SIZE));
    }

    console.log(`Total batches to process: ${batches.length}`);

    // Worker pool
    const CONCURRENCY = 8;
    let completedBatches = 0;
    let totalTranslated = 0;

    async function worker(workerId, batchQueue) {
        while (batchQueue.length > 0) {
            const batch = batchQueue.shift();
            if (!batch) break;

            const res = await translateBatch(batch);
            if (res && Array.isArray(res)) {
                for (const item of res) {
                    if (item.id && item.explanationVi) {
                        cache[item.id] = item.explanationVi;
                        totalTranslated++;
                    }
                }
                saveCache();
            } else {
                console.error(`Worker ${workerId}: Batch failed completely, remaining items will be retried later.`);
            }

            completedBatches++;
            console.log(`[Worker ${workerId}] Batch ${completedBatches}/${batches.length} done (${totalTranslated} explanations translated).`);
            await sleep(300);
        }
    }

    const queue = [...batches];
    const workers = [];
    for (let i = 1; i <= CONCURRENCY; i++) {
        workers.push(worker(i, queue));
    }

    await Promise.all(workers);

    console.log('--- Translation Phase Completed ---');
    console.log(`Cached explanations: ${Object.keys(cache).length}`);

    // Apply translations back to grammar_data.json across all textbooks
    let appliedCount = 0;
    for (const textbook of rawData) {
        for (const lesson of textbook.lessons || []) {
            for (const pt of lesson.points || []) {
                if (cache[pt.id]) {
                    pt.meaningFull = cache[pt.id];
                    appliedCount++;
                }
            }
        }
    }

    fs.writeFileSync(GRAMMAR_FILE, JSON.stringify(rawData, null, 2), 'utf-8');
    console.log(`Successfully updated ${appliedCount} grammar points across all textbooks with Vietnamese explanations!`);
}

main().catch(console.error);
