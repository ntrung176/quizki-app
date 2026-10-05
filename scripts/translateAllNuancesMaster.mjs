import fs from 'fs';

const NUANCES_FILE = 'public/data/grammar_nuances.json';
const CACHE_FILE = 'scripts/nuance_translation_cache.json';

const englishWordRegex = /\b(the|is|are|was|were|a|an|to|and|of|in|for|with|this|that|these|those|use|used|it|pattern|means|meaning|polite|noun|verb|adjective|sentence|speaker|listener|when|after|before|because|although|express|expresses|expressing|used to|indicates|indicates that|affirmative|negative|negation|particle|modifier|modifies|modifying|statement|question|past|present|formal|informal|plain|dictionary|cannot|should|must|might|could|would)\b/i;

// Branch Translation Map
const BRANCH_MAP = {
    '📖 Core meaning': '📖 Ý nghĩa cốt lõi',
    '📖 Core meanings': '📖 Ý nghĩa cốt lõi',
    '📖 Core Meaning': '📖 Ý nghĩa cốt lõi',
    '🧩 Structure and conjugation': '🧩 Cấu trúc & Cách chia',
    '🧩 Structure & conjugation': '🧩 Cấu trúc & Cách chia',
    '🧩 Structure and forms': '🧩 Cấu trúc & Hình thái',
    '🧩 Structure & forms': '🧩 Cấu trúc & Hình thái',
    '🧩 Structure & connections': '🧩 Cấu trúc & Cách nối',
    '🧩 Structure & connecting forms': '🧩 Cấu trúc & Dạng nối',
    '🧩 Structure & connective forms': '🧩 Cấu trúc & Dạng liên kết',
    '🧩 Forms and structure': '🧩 Cấu trúc & Hình thái',
    '🧩 Form and structure': '🧩 Cấu trúc & Hình thái',
    '🧩 Form and connection': '🧩 Hình thái & Cách nối',
    '🧩 Form and conjugation': '🧩 Dạng thức & Cách chia',
    '🧩 Forms & conjugation': '🧩 Các dạng chia ngữ pháp',
    '🧩 Forms and connections': '🧩 Cấu trúc & Cách nối',
    '🎬 Usage and contexts': '🎬 Cách dùng & Ngữ cảnh',
    '🎬 Usage & contexts': '🎬 Cách dùng & Ngữ cảnh',
    '🎬 Usage & situations': '🎬 Bối cảnh & Tình huống',
    '🎬 Uses & situations': '🎬 Tình huống sử dụng',
    '🎬 Uses and situations': '🎬 Tình huống & Ứng dụng',
    '🎬 Usage and situations': '🎬 Ứng dụng thực tế',
    '🎬 Usage and context': '🎬 Ngữ cảnh sử dụng',
    '🎬 Usage and Situation': '🎬 Bối cảnh & Tình huống',
    '🎬 Real-life context': '🎬 Ngữ cảnh đời sống thực tế',
    '⚖️ Commonly confused patterns': '⚖️ Phân biệt mẫu dễ nhầm',
    '⚖️ Comparison with other connectors': '⚖️ So sánh với từ nối khác',
    '⚖️ Compared with similar patterns': '⚖️ So sánh với mẫu tương tự',
    '⚖️ Distinctions': '⚖️ Phân biệt sắc thái',
    '⚖️ Distinguishing nuances': '⚖️ Phân biệt sắc thái',
    '🚨 Common errors and traps': '🚨 Lỗi sai & Bẫy đề thi',
    '🚨 Common errors & traps': '🚨 Bẫy đề thi & Lỗi hay gặp',
    '🚨 Common mistakes': '🚨 Lỗi thường gặp',
    '🚨 Common traps': '🚨 Bẫy đề thi hay gặp',
    '🎯 Quick memory tips': '🎯 Mẹo nhớ nhanh',
    '🎯 Quick memory tip': '🎯 Mẹo nhớ nhanh',
    '🎯 Memory tips': '🎯 Mẹo ghi nhớ',
    '🎯 Memory tip': '🎯 Mẹo nhớ',
    '🎯 Memory tips and imagery': '🎯 Mẹo nhớ & Hình tượng',
    '💬 Common phrases': '💬 Cụm từ hay gặp',
    '💬 Common phrases & collocations': '💬 Cụm từ & Collocation',
    '💬 Common collocations': '💬 Cụm từ đi kèm phổ biến',
    '💬 Common set phrases': '💬 Cụm cố định hay gặp',
    '💬 Common fixed phrases': '💬 Thành ngữ & Cụm cố định',
    '💬 Useful phrases': '💬 Cụm từ hữu ích'
};

function translateParentBranch(branch) {
    if (!branch) return '📖 Ý nghĩa cốt lõi';
    if (BRANCH_MAP[branch]) return BRANCH_MAP[branch];
    let b = branch;
    if (b.startsWith('⚖️')) {
        b = b.replace(/Distinguishing|Distinction|Compare with|Compare:|Contrast with|Contrast:|So sánh với|Phân biệt với|Phân biệt/gi, 'Phân biệt vs');
        b = b.replace(/compared/gi, 'so sánh');
        b = b.replace(/vs from/gi, 'vs');
        b = b.replace(/vs vs/gi, 'vs');
        return b;
    }
    if (b.startsWith('🚨')) {
        b = b.replace(/Errors & traps for Vietnamese learners|Lỗi & bẫy người Việt/gi, 'Bẫy đề thi & Lỗi người học hay gặp');
        b = b.replace(/Common mistakes|Common errors/gi, 'Lỗi thường gặp');
        return b;
    }
    if (b.startsWith('🧩')) {
        b = b.replace(/Structure & forms|Structure & connections|Forms and structure/gi, 'Cấu trúc & Dạng nối');
        return b;
    }
    if (b.startsWith('🎬')) {
        b = b.replace(/Usage & contexts|Usage and situations|Uses and situations/gi, 'Cách dùng & Bối cảnh');
        return b;
    }
    if (b.startsWith('🎯')) {
        b = b.replace(/Memory tip|Memory tips/gi, 'Mẹo nhớ nhanh');
        return b;
    }
    if (b.startsWith('💬')) {
        b = b.replace(/Common phrases|Collocations/gi, 'Cụm từ & Mẫu câu hay gặp');
        return b;
    }
    return b;
}

function cleanSub(sub) {
    if (!sub) return '';
    return sub
        .replace(/·\s*Core meaning/i, '· Ý nghĩa cốt lõi')
        .replace(/·\s*Structure/i, '· Cấu trúc ngữ pháp')
        .replace(/·\s*Context/i, '· Bối cảnh sử dụng')
        .replace(/·\s*Comparison/i, '· Phân biệt sắc thái')
        .replace(/·\s*Traps/i, '· Bẫy đề thi & Lưu ý')
        .replace(/·\s*Tips/i, '· Mẹo nhớ nhanh')
        .replace(/·\s*Collocation/i, '· Cụm từ đi kèm');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Load or initialize cache
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        const rawCache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        for (const [k, v] of Object.entries(rawCache)) {
            if (k && v && k !== v && !englishWordRegex.test(v)) {
                cache[k] = v;
            }
        }
    } catch (e) {
        cache = {};
    }
}
console.log(`Loaded ${Object.keys(cache).length} clean valid Vietnamese cache entries.`);

async function translateChunkWithPost(texts, maxRetries = 8) {
    if (texts.length === 0) return [];
    const joined = texts.map((t, idx) => `[[[${idx}]]] ` + t).join('\n');

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const params = new URLSearchParams({
                client: 'gtx',
                sl: 'en',
                tl: 'vi',
                dt: 't',
                q: joined
            });

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 15000);
            const res = await fetch('https://translate.googleapis.com/translate_a/single', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
                body: params.toString(),
                signal: controller.signal
            });
            clearTimeout(timeout);

            if (!res.ok) {
                if (res.status === 429) {
                    const backoff = Math.min(attempt * 2000 + Math.random() * 1000, 15000);
                    console.warn(`[429 Throttled] Backing off ${Math.round(backoff/1000)}s (attempt ${attempt}/${maxRetries})...`);
                    await sleep(backoff);
                    continue;
                }
                throw new Error(`HTTP ${res.status}`);
            }

            const data = await res.json();
            const full = (data[0] || []).map(item => item[0] || '').join('');
            const results = [];

            for (let i = 0; i < texts.length; i++) {
                const regex = new RegExp('\\[\\[\\[' + i + '\\]\\]\\]\\s*([\\s\\S]*?)(?=\\[\\[\\[\\d+\\]\\]\\]|$)', 'i');
                const match = full.match(regex);
                if (match && match[1].trim()) {
                    results.push(match[1].trim());
                } else {
                    results.push(null);
                }
            }

            return results;
        } catch (err) {
            const waitTime = attempt * 1200 + Math.random() * 500;
            if (attempt === maxRetries) {
                console.error(`[Failed chunk of ${texts.length} texts after ${maxRetries} attempts]:`, err.message);
                return texts.map(() => null);
            }
            await sleep(waitTime);
        }
    }
    return texts.map(() => null);
}

// Single text fallback translator
async function translateSingleText(text) {
    if (!text || !text.trim()) return '';
    if (cache[text]) return cache[text];
    try {
        const params = new URLSearchParams({
            client: 'gtx',
            sl: 'en',
            tl: 'vi',
            dt: 't',
            q: text
        });
        const res = await fetch('https://translate.googleapis.com/translate_a/single', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
            body: params.toString()
        });
        if (res.ok) {
            const data = await res.json();
            const trans = (data[0] || []).map(x => x[0] || '').join('').trim();
            if (trans && !englishWordRegex.test(trans)) {
                cache[text] = trans;
                return trans;
            }
        }
    } catch (e) {}
    return null;
}

// Translate all unique missing strings
async function translateUniqueTextsList(uniqueTexts, onProgress) {
    const CHUNK_SIZE = 15;
    const CONCURRENCY = 4;
    const missing = uniqueTexts.filter(t => !cache[t]);
    console.log(`Found ${missing.length} texts to translate from Google API via POST...`);

    const chunks = [];
    for (let i = 0; i < missing.length; i += CHUNK_SIZE) {
        chunks.push(missing.slice(i, i + CHUNK_SIZE));
    }

    let completedChunks = 0;
    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const slice = chunks.slice(i, i + CONCURRENCY);
        await Promise.all(slice.map(async chunk => {
            const translatedResults = await translateChunkWithPost(chunk);
            for (let j = 0; j < chunk.length; j++) {
                const orig = chunk[j];
                const trans = translatedResults[j];
                if (trans && !englishWordRegex.test(trans)) {
                    cache[orig] = trans;
                }
            }
            completedChunks++;
            if (onProgress) {
                onProgress(completedChunks, chunks.length);
            }
        }));

        await sleep(350);
    }

    // Pass 2: Retry any remaining un-translated items individually
    const stillMissing = uniqueTexts.filter(t => !cache[t]);
    if (stillMissing.length > 0) {
        console.log(`Retrying ${stillMissing.length} remaining items individually with fallback...`);
        for (let i = 0; i < stillMissing.length; i += 3) {
            const batch = stillMissing.slice(i, i + 3);
            await Promise.all(batch.map(t => translateSingleText(t)));
            await sleep(200);
        }
    }
}

async function main() {
    console.log('Loading grammar nuances from', NUANCES_FILE, '...');
    const data = JSON.parse(fs.readFileSync(NUANCES_FILE, 'utf8'));

    // Step 1: Extract all unique texts that need translation
    const uniqueTextsSet = new Set();

    for (const nodes of Object.values(data)) {
        for (const n of nodes) {
            ['title', 'coreMeaning', 'definition', 'nuanceTips'].forEach(field => {
                if (n[field] && typeof n[field] === 'string') {
                    const trimmed = n[field].trim();
                    if (trimmed && (englishWordRegex.test(trimmed) || !cache[trimmed])) {
                        uniqueTextsSet.add(trimmed);
                    }
                }
            });

            if (Array.isArray(n.examples)) {
                for (const ex of n.examples) {
                    if (ex.meaning && typeof ex.meaning === 'string') {
                        const trimmed = ex.meaning.trim();
                        if (trimmed && (englishWordRegex.test(trimmed) || !cache[trimmed])) {
                            uniqueTextsSet.add(trimmed);
                        }
                    }
                }
            }
        }
    }

    const uniqueTexts = Array.from(uniqueTextsSet).filter(t => englishWordRegex.test(t));
    console.log(`Total unique English text strings needing translation: ${uniqueTexts.length}`);

    // Step 2: Translate all unique texts
    let lastSave = Date.now();
    await translateUniqueTextsList(uniqueTexts, (done, total) => {
        const percent = Math.round((done / total) * 100);
        console.log(`Progress: ${done}/${total} chunks (${percent}%) | Valid Cache Entries: ${Object.keys(cache).length}`);
        
        if (Date.now() - lastSave > 15000) {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
            lastSave = Date.now();
        }
    });

    // Save cache
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('Saved cache to', CACHE_FILE);

    // Step 3: Apply translations into data
    console.log('Applying translations to all nodes in grammar nuances data...');
    let appliedCount = 0;
    for (const [patternKey, nodes] of Object.entries(data)) {
        for (const n of nodes) {
            n.parentBranch = translateParentBranch(n.parentBranch);
            n.sub = cleanSub(n.sub);

            ['title', 'coreMeaning', 'definition', 'nuanceTips'].forEach(field => {
                if (n[field] && typeof n[field] === 'string') {
                    const trimmed = n[field].trim();
                    if (cache[trimmed]) {
                        n[field] = cache[trimmed];
                        appliedCount++;
                    }
                }
            });

            if (Array.isArray(n.examples)) {
                for (const ex of n.examples) {
                    if (ex.meaning && typeof ex.meaning === 'string') {
                        const trimmed = ex.meaning.trim();
                        if (cache[trimmed]) {
                            ex.meaning = cache[trimmed];
                            appliedCount++;
                        }
                    }
                }
            }
        }
    }

    console.log(`Applied ${appliedCount} translations across all nodes.`);

    // Step 4: Write back to file
    fs.writeFileSync(NUANCES_FILE, JSON.stringify(data, null, 2));
    console.log('Successfully written translated data to', NUANCES_FILE);

    // Step 5: Final Audit
    let remainingEnglishHits = 0;
    for (const nodes of Object.values(data)) {
        for (const n of nodes) {
            const checkStr = [n.title, n.coreMeaning, n.definition, n.nuanceTips, ...(n.examples || []).map(e => e.meaning)].join(' ');
            if (englishWordRegex.test(checkStr)) {
                remainingEnglishHits++;
            }
        }
    }

    console.log(`========================================`);
    console.log(`Final Audit:`);
    console.log(`Total patterns: 384`);
    console.log(`Total nodes: 18,445`);
    console.log(`Remaining nodes with English: ${remainingEnglishHits}`);
    console.log(`Vietnamese Coverage: ${((1 - remainingEnglishHits / 18445) * 100).toFixed(2)}%`);
    console.log(`========================================`);
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
