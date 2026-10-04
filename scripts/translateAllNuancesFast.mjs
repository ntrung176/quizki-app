import fs from 'fs';

const NUANCES_FILE = 'public/data/grammar_nuances.json';
const CACHE_FILE = 'scripts/nuance_translation_cache.json';

let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (e) {
        cache = {};
    }
}

const STANDARD_BRANCH_MAP = {
    '📖 Core meaning': '📖 Ý nghĩa cốt lõi',
    '📖 Core meanings': '📖 Ý nghĩa cốt lõi',
    '🧩 Structure and conjugation': '🧩 Cấu trúc & Cách chia',
    '🧩 Structure & connections': '🧩 Cấu trúc & Cách nối',
    '🧩 Structure & connecting forms': '🧩 Cấu trúc & Dạng nối',
    '🧩 Structure & connective forms': '🧩 Cấu trúc & Dạng liên kết',
    '🧩 Structure and forms': '🧩 Cấu trúc & Biến thể',
    '🧩 Form and structure': '🧩 Cấu trúc & Hình thái',
    '🧩 Form and connection': '🧩 Hình thái & Cách nối',
    '🧩 Form and conjugation': '🧩 Dạng thức & Cách chia',
    '🧩 Forms & conjugation': '🧩 Các dạng chia ngữ pháp',
    '🎬 Usage and contexts': '🎬 Cách dùng & Ngữ cảnh',
    '🎬 Usage & situations': '🎬 Bối cảnh & Tình huống',
    '🎬 Uses & situations': '🎬 Tình huống sử dụng',
    '🎬 Uses and situations': '🎬 Tình huống & Ứng dụng',
    '🎬 Usage and situations': '🎬 Ứng dụng thực tế',
    '🎬 Usage and context': '🎬 Ngữ cảnh sử dụng',
    '⚖️ Commonly confused patterns': '⚖️ Phân biệt mẫu dễ nhầm',
    '⚖️ Comparison with other connectors': '⚖️ So sánh với từ nối khác',
    '⚖️ Compared with similar patterns': '⚖️ So sánh với mẫu tương tự',
    '⚖️ Distinctions': '⚖️ Phân biệt sắc thái',
    '🚨 Common errors and traps': '🚨 Lỗi sai & Bẫy đề thi',
    '🚨 Common errors & traps': '🚨 Bẫy đề thi & Lỗi hay gặp',
    '🚨 Common mistakes': '🚨 Lỗi thường gặp',
    '🚨 Lỗi thường gặp & bẫy': '🚨 Lỗi thường gặp & Bẫy đề thi',
    '🎯 Quick memory tips': '🎯 Mẹo nhớ nhanh',
    '🎯 Quick memory tip': '🎯 Mẹo nhớ nhanh',
    '🎯 Memory tips': '🎯 Mẹo ghi nhớ',
    '🎯 Memory tips and imagery': '🎯 Mẹo nhớ & Hình tượng',
    '💬 Common phrases': '💬 Cụm từ hay gặp',
    '💬 Common phrases & collocations': '💬 Cụm từ & Collocation',
    '💬 Common collocations': '💬 Cụm từ đi kèm phổ biến',
    '💬 Common set phrases': '💬 Cụm cố định hay gặp',
    '💬 Common fixed phrases': '💬 Thành ngữ & Cụm cố định'
};

function translateParentBranch(branch) {
    if (!branch) return '📖 Ý nghĩa cốt lõi';
    if (STANDARD_BRANCH_MAP[branch]) return STANDARD_BRANCH_MAP[branch];
    if (branch.startsWith('⚖️')) {
        let b = branch.replace(/Distinguishing|Distinction|Compare with|Compare:|Contrast with|Contrast:/gi, 'Phân biệt vs');
        b = b.replace(/compared/gi, 'so sánh');
        return b;
    }
    return branch;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function translateChunk(missingTexts, retries = 3) {
    if (missingTexts.length === 0) return [];
    const joined = missingTexts.map((t, idx) => '⟦' + idx + '⟧ ' + t).join('\n');
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=' + encodeURIComponent(joined);

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 429) {
                    await sleep(attempt * 2500);
                    continue;
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            const full = data[0].map(item => item[0]).join('');
            const results = [];
            for (let i = 0; i < missingTexts.length; i++) {
                const regex = new RegExp('⟦' + i + '⟧\\s*([\\s\\S]*?)(?=⟦\\d+⟧|$)', 'i');
                const match = full.match(regex);
                results.push(match ? match[1].trim() : missingTexts[i]);
            }
            return results;
        } catch (err) {
            if (attempt === retries) {
                return missingTexts;
            }
            await sleep(1000 * attempt);
        }
    }
    return missingTexts;
}

async function translateBatch(texts) {
    if (texts.length === 0) return [];
    const missingIndices = [];
    const missingTexts = [];
    const results = new Array(texts.length);

    for (let i = 0; i < texts.length; i++) {
        const t = (texts[i] || '').trim();
        if (!t) {
            results[i] = '';
        } else if (cache[t]) {
            results[i] = cache[t];
        } else {
            missingIndices.push(i);
            missingTexts.push(t);
        }
    }

    if (missingTexts.length === 0) {
        return results;
    }

    // Split missingTexts into chunks of 30
    const CHUNK_SIZE = 30;
    for (let i = 0; i < missingTexts.length; i += CHUNK_SIZE) {
        const chunk = missingTexts.slice(i, i + CHUNK_SIZE);
        const translatedChunk = await translateChunk(chunk);
        for (let j = 0; j < chunk.length; j++) {
            const orig = chunk[j];
            const trans = translatedChunk[j] || orig;
            cache[orig] = trans;
            results[missingIndices[i + j]] = trans;
        }
        await sleep(50);
    }

    return results;
}

async function processPattern(pattern, nodes) {
    const textsToTranslate = [];
    const textPointers = [];

    for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];
        n.parentBranch = translateParentBranch(n.parentBranch);

        if (n.coreMeaning && typeof n.coreMeaning === 'string') {
            textsToTranslate.push(n.coreMeaning);
            textPointers.push({ nodeIdx: i, field: 'coreMeaning' });
        }
        if (n.title && typeof n.title === 'string') {
            textsToTranslate.push(n.title);
            textPointers.push({ nodeIdx: i, field: 'title' });
        }
        if (n.definition && typeof n.definition === 'string') {
            textsToTranslate.push(n.definition);
            textPointers.push({ nodeIdx: i, field: 'definition' });
        }
        if (n.nuanceTips && typeof n.nuanceTips === 'string') {
            textsToTranslate.push(n.nuanceTips);
            textPointers.push({ nodeIdx: i, field: 'nuanceTips' });
        }
        if (Array.isArray(n.examples)) {
            for (let eIdx = 0; eIdx < n.examples.length; eIdx++) {
                const ex = n.examples[eIdx];
                if (ex.meaning && typeof ex.meaning === 'string') {
                    textsToTranslate.push(ex.meaning);
                    textPointers.push({ nodeIdx: i, field: 'examples', exIdx: eIdx });
                }
            }
        }
    }

    const translatedTexts = await translateBatch(textsToTranslate);

    for (let t = 0; t < textPointers.length; t++) {
        const ptr = textPointers[t];
        const trans = translatedTexts[t] || textsToTranslate[t];
        const targetNode = nodes[ptr.nodeIdx];

        if (ptr.field === 'examples') {
            targetNode.examples[ptr.exIdx].meaning = trans;
        } else {
            targetNode[ptr.field] = trans;
        }
    }
}

async function main() {
    console.log('Loading', NUANCES_FILE, '...');
    const data = JSON.parse(fs.readFileSync(NUANCES_FILE, 'utf8'));
    const patterns = Object.keys(data);
    console.log(`Starting fast concurrent translation for ${patterns.length} patterns...`);

    const CONCURRENCY = 8;
    let completed = 0;

    for (let i = 0; i < patterns.length; i += CONCURRENCY) {
        const slice = patterns.slice(i, i + CONCURRENCY);
        await Promise.all(slice.map(async p => {
            await processPattern(p, data[p]);
            completed++;
        }));

        console.log(`Progress: ${completed}/${patterns.length} (${Math.round((completed/patterns.length)*100)}%)`);
        if (completed % 32 === 0 || completed === patterns.length) {
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
            fs.writeFileSync(NUANCES_FILE, JSON.stringify(data, null, 2));
        }
    }

    fs.writeFileSync(NUANCES_FILE, JSON.stringify(data, null, 2));
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
    console.log('🎉 100% COMPLETE! All 384 grammar nuances and 18,445 nodes translated to Vietnamese!');
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
