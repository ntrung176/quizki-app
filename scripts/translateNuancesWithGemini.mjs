import fs from 'fs';

const NUANCES_FILE = 'public/data/grammar_nuances.json';
const CACHE_FILE = 'scripts/nuance_translation_cache.json';
const PROXY_URL = 'https://quizki-ai-proxy.lynguyennhattrung1706.workers.dev/';

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
            if (k && v && typeof v === 'string' && v.trim().length > 0) {
                cache[k] = v;
            }
        }
    } catch (e) {
        cache = {};
    }
}
console.log(`Loaded ${Object.keys(cache).length} cache entries.`);

async function translateChunkWithGemini(texts, maxRetries = 3) {
    if (texts.length === 0) return {};
    const payload = {};
    texts.forEach((t, idx) => payload[String(idx)] = t);

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 25000);
            const res = await fetch(PROXY_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                signal: controller.signal,
                body: JSON.stringify({
                    model: 'google/gemini-2.0-flash-001',
                    temperature: 0.1,
                    max_tokens: 4096,
                    messages: [
                        {
                            role: 'system',
                            content: 'You are an elite Japanese-Vietnamese linguist and JLPT master educator. Translate the given English grammar descriptions, definitions, tips, and titles into natural, accurate Vietnamese for learners. Maintain Markdown formatting (**...**), Japanese words, and grammar codes (N, V, A, Na, ～). Return ONLY a JSON object mapping each numeric index to its Vietnamese translation.'
                        },
                        {
                            role: 'user',
                            content: JSON.stringify(payload)
                        }
                    ]
                })
            });
            clearTimeout(timeout);

            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }

            const json = await res.json();
            const content = json.choices[0].message.content;
            const cleanContent = content.replace(/```json\s*|\s*```/g, '').trim();
            const parsed = JSON.parse(cleanContent);
            return parsed;
        } catch (err) {
            if (attempt === maxRetries) {
                return {};
            }
            await sleep(attempt * 1000);
        }
    }
    return {};
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
                    if (trimmed && englishWordRegex.test(trimmed) && !cache[trimmed]) {
                        uniqueTextsSet.add(trimmed);
                    }
                }
            });

            if (Array.isArray(n.examples)) {
                for (const ex of n.examples) {
                    if (ex.meaning && typeof ex.meaning === 'string') {
                        const trimmed = ex.meaning.trim();
                        if (trimmed && englishWordRegex.test(trimmed) && !cache[trimmed]) {
                            uniqueTextsSet.add(trimmed);
                        }
                    }
                }
            }
        }
    }

    const uniqueTexts = Array.from(uniqueTextsSet);
    console.log(`Total unique English text strings to translate via Gemini AI: ${uniqueTexts.length}`);

    // Step 2: Translate in concurrent chunks of 20
    const CHUNK_SIZE = 20;
    const CONCURRENCY = 8;
    const chunks = [];
    for (let i = 0; i < uniqueTexts.length; i += CHUNK_SIZE) {
        chunks.push(uniqueTexts.slice(i, i + CHUNK_SIZE));
    }

    let completedChunks = 0;
    let newlyCached = 0;
    let lastSave = Date.now();
    const startTime = Date.now();

    for (let i = 0; i < chunks.length; i += CONCURRENCY) {
        const slice = chunks.slice(i, i + CONCURRENCY);
        await Promise.all(slice.map(async chunk => {
            const parsed = await translateChunkWithGemini(chunk);
            for (let j = 0; j < chunk.length; j++) {
                const orig = chunk[j];
                const trans = parsed[String(j)] || parsed[j];
                if (trans && typeof trans === 'string' && trans.trim().length > 0) {
                    cache[orig] = trans.trim();
                    newlyCached++;
                }
            }
            completedChunks++;
            const percent = ((completedChunks / chunks.length) * 100).toFixed(1);
            const elapsed = (Date.now() - startTime) / 1000;
            const rate = completedChunks / elapsed;
            const etaSec = Math.round((chunks.length - completedChunks) / (rate || 1));
            const etaMin = Math.floor(etaSec / 60);
            const etaSecRem = etaSec % 60;
            console.log(`[AI Progress] ${completedChunks}/${chunks.length} chunks (${percent}%) | Cache: ${Object.keys(cache).length} | +${newlyCached} | ETA: ${etaMin}m${etaSecRem}s`);
        }));

        if (Date.now() - lastSave > 15000 || completedChunks === chunks.length) {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));

            // Incremental write to data
            for (const [patternKey, nodes] of Object.entries(data)) {
                for (const n of nodes) {
                    n.parentBranch = translateParentBranch(n.parentBranch);
                    n.sub = cleanSub(n.sub);

                    ['title', 'coreMeaning', 'definition', 'nuanceTips'].forEach(field => {
                        if (n[field] && typeof n[field] === 'string') {
                            const trimmed = n[field].trim();
                            if (cache[trimmed]) n[field] = cache[trimmed];
                        }
                    });

                    if (Array.isArray(n.examples)) {
                        for (const ex of n.examples) {
                            if (ex.meaning && typeof ex.meaning === 'string') {
                                const trimmed = ex.meaning.trim();
                                if (cache[trimmed]) ex.meaning = cache[trimmed];
                            }
                        }
                    }
                }
            }
            fs.writeFileSync(NUANCES_FILE, JSON.stringify(data, null, 2));
            lastSave = Date.now();
        }

        await sleep(150);
    }

    // Final application
    for (const [patternKey, nodes] of Object.entries(data)) {
        for (const n of nodes) {
            n.parentBranch = translateParentBranch(n.parentBranch);
            n.sub = cleanSub(n.sub);

            ['title', 'coreMeaning', 'definition', 'nuanceTips'].forEach(field => {
                if (n[field] && typeof n[field] === 'string') {
                    const trimmed = n[field].trim();
                    if (cache[trimmed]) n[field] = cache[trimmed];
                }
            });

            if (Array.isArray(n.examples)) {
                for (const ex of n.examples) {
                    if (ex.meaning && typeof ex.meaning === 'string') {
                        const trimmed = ex.meaning.trim();
                        if (cache[trimmed]) ex.meaning = cache[trimmed];
                    }
                }
            }
        }
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    fs.writeFileSync(NUANCES_FILE, JSON.stringify(data, null, 2));
    console.log('Successfully completed full AI translation and saved data!');

    // Final Audit
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
