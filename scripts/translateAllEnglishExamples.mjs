import fs from 'fs';
import path from 'path';

const dataPath = path.join(process.cwd(), 'public/data/grammar_data.json');
const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

const isEnglish = (str) => {
    if (!str) return false;
    const s = str.trim();
    return /^[a-zA-Z0-9\s,\.'\?!\":;—\(\)\/\$%\&`´’\-\–\—\=\+]+$/.test(s) && /[a-zA-Z]{3,}/.test(s);
};

// Collect all items that need translation
const itemsToTranslate = [];

for (const tb of data) {
    for (const ls of tb.lessons || []) {
        for (const pt of ls.points || []) {
            for (const ex of pt.examples || []) {
                if (ex.vi && isEnglish(ex.vi)) {
                    itemsToTranslate.push(ex);
                }
            }
        }
    }
}

console.log(`Tìm thấy ${itemsToTranslate.length} câu ví dụ tiếng Anh cần dịch sang tiếng Việt...`);

async function translateBatch(texts) {
    const joined = texts.map((t, i) => `[${i}] ${t.replace(/\n+/g, ' ')}`).join('\n');
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(joined);
    
    try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const json = await res.json();
        const fullTranslated = json[0].map(item => item[0]).join('');
        
        const results = new Array(texts.length).fill('');
        const lines = fullTranslated.split('\n');
        for (const line of lines) {
            const m = line.match(/^\[(\d+)\]\s*(.*)$/);
            if (m) {
                const idx = parseInt(m[1], 10);
                if (idx >= 0 && idx < texts.length) {
                    results[idx] = m[2].trim();
                }
            }
        }
        
        // Fallback for any missing items in batch
        for (let i = 0; i < texts.length; i++) {
            if (!results[i]) {
                const singleUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(texts[i]);
                const sRes = await fetch(singleUrl);
                const sJson = await sRes.json();
                results[i] = sJson[0].map(item => item[0]).join('').trim();
            }
        }
        return results;
    } catch (err) {
        console.warn(`Lỗi dịch batch: ${err.message}. Thử dịch từng câu...`);
        const results = [];
        for (const t of texts) {
            try {
                const singleUrl = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=vi&dt=t&q=' + encodeURIComponent(t);
                const sRes = await fetch(singleUrl);
                const sJson = await sRes.json();
                results.push(sJson[0].map(item => item[0]).join('').trim());
            } catch {
                results.push(t);
            }
        }
        return results;
    }
}

async function run() {
    const BATCH_SIZE = 40;
    let translatedCount = 0;

    for (let i = 0; i < itemsToTranslate.length; i += BATCH_SIZE) {
        const batch = itemsToTranslate.slice(i, i + BATCH_SIZE);
        const englishTexts = batch.map(b => b.vi.trim());
        const viTranslations = await translateBatch(englishTexts);

        for (let j = 0; j < batch.length; j++) {
            if (viTranslations[j]) {
                batch[j].vi = viTranslations[j];
                translatedCount++;
            }
        }

        console.log(`Đã dịch: ${translatedCount} / ${itemsToTranslate.length} (${Math.round((translatedCount / itemsToTranslate.length) * 100)}%)`);
        // Small delay to be polite to the API
        await new Promise(r => setTimeout(r, 200));
    }

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
    console.log(`✅ Hoàn thành! Đã lưu toàn bộ ${translatedCount} câu ví dụ tiếng Việt vào public/data/grammar_data.json`);
}

run();
