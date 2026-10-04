import fs from 'fs';
import path from 'path';

const NUANCES_FILE = 'public/data/grammar_nuances.json';
const CACHE_FILE = 'scripts/nuance_translation_cache.json';

// Load cache if exists
let cache = {};
if (fs.existsSync(CACHE_FILE)) {
    try {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (e) {
        console.warn('Cache file parse failed, resetting cache');
        cache = {};
    }
}

// Standard branch translations
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

// Sleep helper
const sleep = ms => new Promise(r => setTimeout(r, ms));

// Translation helper with retry
async function translateBatch(texts, retries = 3) {
    if (texts.length === 0) return [];
    
    // Filter texts needing translation
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

    const joined = missingTexts.map((t, idx) => '⟦' + idx + '⟧ ' + t).join('\n');
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=vi&dt=t&q=' + encodeURIComponent(joined);

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const res = await fetch(url);
            if (!res.ok) {
                if (res.status === 429) {
                    console.warn(`[429] Rate limit hit. Backing off for ${attempt * 2}s...`);
                    await sleep(attempt * 2000);
                    continue;
                }
                throw new Error(`HTTP ${res.status}`);
            }
            const data = await res.json();
            const full = data[0].map(item => item[0]).join('');

            for (let i = 0; i < missingTexts.length; i++) {
                const orig = missingTexts[i];
                const regex = new RegExp('⟦' + i + '⟧\\s*([\\s\\S]*?)(?=⟦\\d+⟧|$)', 'i');
                const match = full.match(regex);
                const translated = match ? match[1].trim() : orig;
                cache[orig] = translated;
                results[missingIndices[i]] = translated;
            }
            return results;
        } catch (err) {
            if (attempt === retries) {
                console.error('Batch translation failed after retries:', err.message);
                for (let i = 0; i < missingTexts.length; i++) {
                    results[missingIndices[i]] = missingTexts[i];
                }
                return results;
            }
            await sleep(1000 * attempt);
        }
    }
    return results;
}

async function main() {
    console.log('Loading', NUANCES_FILE, '...');
    const data = JSON.parse(fs.readFileSync(NUANCES_FILE, 'utf8'));
    const patterns = Object.keys(data);
    console.log(`Found ${patterns.length} patterns to process.`);

    let totalNodes = 0;
    for (const p of patterns) totalNodes += data[p].length;
    console.log(`Total nodes: ${totalNodes}`);

    // Process pattern by pattern
    let processed = 0;
    let cacheSaves = 0;

    for (const pattern of patterns) {
        const nodes = data[pattern];
        const textsToTranslate = [];
        const textPointers = []; // { nodeIdx, field, subField }

        for (let i = 0; i < nodes.length; i++) {
            const n = nodes[i];
            
            // Parent branch quick translate
            n.parentBranch = translateParentBranch(n.parentBranch);

            // Collect text fields
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

        // Translate in sub-batches of 25 strings
        const BATCH_SIZE = 25;
        const translatedTexts = [];
        for (let b = 0; b < textsToTranslate.length; b += BATCH_SIZE) {
            const chunk = textsToTranslate.slice(b, b + BATCH_SIZE);
            const chunkTranslated = await translateBatch(chunk);
            translatedTexts.push(...chunkTranslated);
            await sleep(100);
        }

        // Apply translations back to nodes
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

        processed++;
        if (processed % 10 === 0 || processed === patterns.length) {
            console.log(`Progress: ${processed}/${patterns.length} patterns (${Math.round((processed/patterns.length)*100)}%)`);
            // Save cache periodically
            fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
            // Save nuances file periodically
            fs.writeFileSync(NUANCES_FILE, JSON.stringify(data, null, 2));
        }
    }

    // Final save
    fs.writeFileSync(NUANCES_FILE, JSON.stringify(data, null, 2));
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    console.log('✅ ALL Grammar Nuances translated into Vietnamese successfully!');
}

main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
